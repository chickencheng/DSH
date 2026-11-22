// ps-command-bench —— 宿主半侧（Node）。
//
// 接口（都只接受本机回环同源请求）：
//   GET  /ps-command-bench/api/info        { cwd, shell }
//   GET  /ps-command-bench/api/list?path=  列子目录（图形化选路径）
//   POST /ps-command-bench/api/run         执行命令，返回输出
//   GET  /ps-command-bench/api/records     执行历史
//   POST /ps-command-bench/api/records     覆盖写执行历史
//   GET  /ps-command-bench/api/favorites   常用命令
//   POST /ps-command-bench/api/favorites   覆盖写常用命令
//   GET  /ps-command-bench/page.js         页面脚本（浏览器动态 import）
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { StringDecoder } from 'node:string_decoder'
import { fileURLToPath } from 'node:url'

const BASE = '/ps-command-bench'
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DIR = path.join(HOME, 'ps-command-bench')
const RECORDS_FILE = path.join(DIR, 'records.json')
const FAV_FILE = path.join(DIR, 'favorites.json')
const PAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'page', 'page.js')

const DEFAULT_CWD = process.env.USERPROFILE || os.homedir()
const SHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
const UTF8_PREFIX = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $OutputEncoding=[System.Text.Encoding]::UTF8; '

const MAX_BODY = 4 * 1024 * 1024
const MAX_ITEMS = 300
const MAX_TEXT = 20000
const OUT_CAP = 1024 * 1024
const TIMEOUT_MS = 120000

/* ---------------- 小工具 ---------------- */

function send(res, status, headers, body) {
  res.writeHead(status, headers)
  res.end(body)
}

function json(res, obj) {
  send(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, JSON.stringify(obj))
}

function isLoopback(hn) {
  const h = String(hn || '').toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1') return true
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (!m) return false
  return Number(m[1]) === 127 && [m[2], m[3], m[4]].every((x) => Number(x) <= 255)
}

function rejected(req) {
  try {
    const headers = (req && req.headers) || {}
    let hostUrl
    try { hostUrl = new URL('http://' + String(headers.host || '')) } catch { return true }
    if (!isLoopback(hostUrl.hostname)) return true
    if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return true
    const origin = headers.origin
    if (typeof origin === 'string' && origin && origin !== 'null') {
      const o = new URL(origin)
      if (o.host.toLowerCase() !== hostUrl.host.toLowerCase()) return true
    }
    return false
  } catch {
    return true
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let done = false
    req.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > limit) {
        done = true
        reject(new Error('请求体超出上限'))
        try { req.destroy() } catch {}
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (done) return
      done = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (e) => {
      if (done) return
      done = true
      reject(e)
    })
  })
}

function clip(v, max) {
  const s = typeof v === 'string' ? v : ''
  return s.length > max ? s.slice(0, max) : s
}

/* ---------------- 存储 ---------------- */

function loadList(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveList(file, list) {
  fs.mkdirSync(DIR, { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

function cleanRuns(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const text = clip(raw.text, MAX_TEXT)
    if (!text.trim()) continue
    const at = Number(raw.at)
    out.push({
      id: clip(raw.id, 64) || String(at || Date.now()),
      text,
      at: Number.isFinite(at) && at > 0 ? at : Date.now(),
      cwd: clip(raw.cwd, 500),
      shell: clip(raw.shell, 64),
      code: typeof raw.code === 'number' ? raw.code : null,
      durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : null,
      timedOut: raw.timedOut === true,
      truncated: raw.truncated === true,
      stdout: clip(raw.stdout, 40000),
      stderr: clip(raw.stderr, 40000),
      error: clip(raw.error, 2000) || null,
    })
    if (out.length >= MAX_ITEMS) break
  }
  return out
}

function cleanFavs(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const text = clip(raw.text, MAX_TEXT)
    if (!text.trim()) continue
    const at = Number(raw.at)
    out.push({
      id: clip(raw.id, 64) || String(at || Date.now()),
      text,
      at: Number.isFinite(at) && at > 0 ? at : Date.now(),
      cwd: clip(raw.cwd, 500),
    })
    if (out.length >= 200) break
  }
  return out
}

/* ---------------- 目录 / 执行 ---------------- */

function listDrives() {
  const out = []
  for (let i = 67; i <= 90; i += 1) {
    const root = String.fromCharCode(i) + ':\\'
    try {
      if (fs.statSync(root).isDirectory()) out.push(root)
    } catch { /* 跳过不存在的盘 */ }
  }
  return out
}

function killTree(pid) {
  if (!pid) return
  try {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {})
  } catch {}
}

function runCommand(options) {
  return new Promise((resolve) => {
    const cwd = String(options.cwd || '').trim() || DEFAULT_CWD
    let cwdOk = false
    try { cwdOk = fs.statSync(cwd).isDirectory() } catch { cwdOk = false }
    if (!cwdOk) return resolve({ ok: false, error: '工作目录不存在：' + cwd })
    if (!fs.existsSync(SHELL)) return resolve({ ok: false, error: '找不到 powershell.exe：' + SHELL })

    const startedAt = Date.now()
    const decOut = new StringDecoder('utf8')
    const decErr = new StringDecoder('utf8')
    let stdout = ''
    let stderr = ''
    let truncated = false
    let settled = false
    let timedOut = false

    let child
    try {
      // 命令结束后打印一次当前目录：下一条命令用它，`cd` 才能"连续"过去。
      const script = UTF8_PREFIX + String(options.command || '') +
        '\nWrite-Output (' + "'__PSCB_CWD__'" + ' + (Get-Location).Path + ' + "'__PSCB_END__'" + ')\n'
      child = spawn(SHELL, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      })
    } catch (e) {
      return resolve({ ok: false, error: '启动失败：' + ((e && e.message) || e) })
    }

    const timer = setTimeout(() => {
      timedOut = true
      killTree(child.pid)
    }, TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      if (stdout.length >= OUT_CAP) { truncated = true; return }
      stdout += decOut.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      if (stderr.length >= OUT_CAP) { truncated = true; return }
      stderr += decErr.write(chunk)
    })

    function finish(code, error) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stdout += decOut.end()
      stderr += decErr.end()

      // 解析命令跑完后的工作目录，并从输出里摘掉这行标记。
      let finalCwd = cwd
      const mark = /__PSCB_CWD__([\s\S]*?)__PSCB_END__/.exec(stdout)
      if (mark) {
        const next = mark[1].trim()
        stdout = stdout.replace(mark[0], '')
        if (next && !/[<>|]/.test(next)) finalCwd = next
      }
      stdout = stdout.replace(/\s+$/, '')

      resolve({
        ok: true,
        code: typeof code === 'number' ? code : null,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
        truncated,
        cwd: finalCwd,
        error: error || null,
      })
    }

    child.on('error', (e) => finish(null, '执行失败：' + ((e && e.message) || e)))
    child.on('close', (code, signal) => finish(code, signal ? '信号终止：' + signal : null))
  })
}

/* ---------------- 插件 ---------------- */

export default {
  name: 'dsh-powershell-console',
  apply(root) {
    root.inject(['webServer'], (ctx) => {
      const disposers = []

      const add = (routePath, handler) => {
        disposers.push(ctx.webServer.register({ kind: 'exact', path: routePath, handler }))
      }

      add(BASE + '/page.js', (req, res) => {
        if (rejected(req)) return send(res, 403, {}, 'forbidden')
        try {
          const code = fs.readFileSync(PAGE_FILE, 'utf8')
          send(res, 200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }, code)
        } catch (e) {
          send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'page.js not found: ' + String((e && e.message) || e))
        }
      })

      add(BASE + '/api/info', (req, res) => {
        if (rejected(req)) return send(res, 403, {}, 'forbidden')
        json(res, { ok: true, cwd: DEFAULT_CWD, shell: SHELL, drives: listDrives() })
      })

      add(BASE + '/api/list', (req, res) => {
        if (rejected(req)) return send(res, 403, {}, 'forbidden')
        try {
          const u = new URL(req.url || '/', 'http://localhost')
          const target = u.searchParams.get('path') || DEFAULT_CWD
          const abs = path.resolve(target)
          const entries = fs.readdirSync(abs, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => ({ name: d.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
          const parent = path.dirname(abs)
          json(res, { ok: true, path: abs, parent: parent === abs ? null : parent, entries, drives: listDrives() })
        } catch (e) {
          json(res, { ok: false, error: String((e && e.message) || e), drives: listDrives() })
        }
      })

      add(BASE + '/api/run', (req, res) => {
        if (rejected(req)) return send(res, 403, {}, 'forbidden')
        if (String(req.method || 'GET').toUpperCase() !== 'POST') {
          return send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8' }, 'method not allowed')
        }
        readBody(req, MAX_BODY).then((text) => {
          let body
          try { body = JSON.parse(text || '{}') } catch { return json(res, { ok: false, error: '请求体不是合法 JSON' }) }
          const command = String((body && body.command) || '')
          if (!command.trim()) return json(res, { ok: false, error: '命令为空' })
          runCommand({ command, cwd: body.cwd })
            .then((result) => json(res, result))
            .catch((e) => json(res, { ok: false, error: String((e && e.message) || e) }))
        }).catch((e) => {
          try { json(res, { ok: false, error: String((e && e.message) || e) }) } catch {}
        })
      })

      const store = (file, clean, key) => (req, res) => {
        if (rejected(req)) return send(res, 403, {}, 'forbidden')
        const method = String(req.method || 'GET').toUpperCase()
        if (method === 'GET' || method === 'HEAD') {
          return json(res, { ok: true, [key]: loadList(file), file })
        }
        if (method !== 'POST' && method !== 'PUT') {
          return send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8' }, 'method not allowed')
        }
        readBody(req, MAX_BODY).then((text) => {
          let body
          try { body = JSON.parse(text || '{}') } catch { return json(res, { ok: false, error: '请求体不是合法 JSON' }) }
          try {
            const list = clean(body && body[key])
            saveList(file, list)
            json(res, { ok: true, [key]: list, file })
          } catch (e) {
            json(res, { ok: false, error: String((e && e.message) || e) })
          }
        }).catch((e) => {
          try { json(res, { ok: false, error: String((e && e.message) || e) }) } catch {}
        })
      }

      add(BASE + '/api/records', store(RECORDS_FILE, cleanRuns, 'records'))
      add(BASE + '/api/favorites', store(FAV_FILE, cleanFavs, 'favorites'))

      ctx.effect(() => () => {
        for (const off of disposers) {
          try { off() } catch {}
        }
      })
    })
  },
}
