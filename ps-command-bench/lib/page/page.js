/**
 * ps-command-bench — 页面脚本（普通 ESM，由宿主 /ps-command-bench/page.js 下发）。
 *
 * 用原生 DOM 构建界面：结构简单、不依赖 JSX，出问题也只影响这一页。
 * 由 lib/client.js 动态 import 后调用 mount(root)。
 */

const API_INFO = '/ps-command-bench/api/info'
const API_LIST = '/ps-command-bench/api/list'
const API_RUN = '/ps-command-bench/api/run'
const API_RECORDS = '/ps-command-bench/api/records'
const API_FAVS = '/ps-command-bench/api/favorites'

const CLAMP_LINES = 18

const CSS = `
.pcb{--bg:var(--dsw-alias-bg-layer-1,#fff);--soft:var(--dsw-alias-bg-layer-2,#f7f8fa);--text:var(--dsw-alias-label-primary,#18202c);--muted:var(--dsw-alias-label-secondary,#667085);--border:var(--dsw-alias-border-l3,#e7e9ef);--accent:var(--dsh-plugin-workbench-accent,#4f6bdb);--ok:#2f9e56;--bad:#c94f4f;--warn:#b26a00;
  height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--text);
  padding:22px 24px 14px;box-sizing:border-box;
  font:14px/1.6 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);
  --mono:"Cascadia Mono",Consolas,ui-monospace,SFMono-Regular,monospace}
.pcb *{box-sizing:border-box}
.pcb .head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;flex:0 0 auto;padding-bottom:10px}
.pcb .title{font-size:20px;font-weight:650;letter-spacing:-.01em;line-height:1.3}
.pcb .tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.pcb .field{display:flex;align-items:center;gap:5px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:8px;background:var(--bg)}
.pcb .field:focus-within{border-color:var(--accent)}
.pcb .field input{width:212px;border:0;outline:none;background:transparent;color:var(--text);font:12.5px/1.4 var(--mono)}
.pcb .btn{appearance:none;cursor:pointer;white-space:nowrap;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:8px;padding:6px 11px;font:12.5px/1.4 inherit;display:inline-flex;align-items:center;gap:6px}
.pcb .btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}
.pcb .btn:disabled{opacity:.45;cursor:not-allowed}
.pcb .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;padding:7px 16px}
.pcb .btn.primary:hover:not(:disabled){filter:brightness(1.07);color:#fff}
.pcb .btn.danger{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 40%,var(--border))}
.pcb .btn.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--bg))}
.pcb .inline{appearance:none;border:0;background:transparent;color:var(--accent);cursor:pointer;font:11.5px/1.4 inherit;padding:2px 5px;border-radius:5px}
.pcb .inline:hover{background:color-mix(in srgb,var(--accent) 12%,transparent)}
.pcb .banner{margin:0 0 8px;padding:7px 11px;border-radius:8px;border:1px solid var(--border);font-size:12.5px;color:var(--muted)}
.pcb .banner.err{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,transparent);background:color-mix(in srgb,var(--bad) 7%,transparent)}
.pcb .body{display:flex;flex:1 1 auto;min-height:0;gap:14px}
.pcb .log{flex:1 1 auto;min-width:0;overflow:auto;display:flex;flex-direction:column;gap:0;padding:4px 2px 12px}
.pcb .block{flex:0 0 auto;padding:2px 0 8px}
.pcb .block.bad .ps{color:var(--bad)}
.pcb .cmdline{display:flex;align-items:flex-start;gap:6px;min-width:0}
.pcb .ps{flex:0 0 auto;font:12px/1.85 var(--mono);color:var(--accent);user-select:none}
.pcb .pwd{flex:0 0 auto;font:12px/1.85 var(--mono);color:var(--muted);max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.pcb .cmd{flex:1 1 auto;min-width:0;margin:0;font:12.5px/1.85 var(--mono);white-space:pre-wrap;word-break:break-word;color:var(--text);user-select:text}
.pcb .acts{display:flex;gap:2px;flex:0 0 auto;opacity:0;transition:opacity .12s}
.pcb .block:hover .acts,.pcb .block:focus-within .acts{opacity:1}
.pcb .mini{appearance:none;cursor:pointer;background:transparent;border:0;color:var(--muted);font:11.5px/1.4 inherit;padding:2px 6px;border-radius:6px}
.pcb .mini:hover:not(:disabled){background:var(--soft);color:var(--accent)}
.pcb .mini.del:hover{color:var(--bad)}
.pcb .out{margin:0;padding:0 0 0 26px;border:0;background:transparent;font:12px/1.72 var(--mono);white-space:pre-wrap;word-break:break-word;overflow:visible;max-height:none;color:var(--text);user-select:text}
.pcb .out.err{color:#d16060}
.pcb .status{display:flex;align-items:center;gap:6px;padding:3px 0 0 26px;font:11px/1.6 var(--mono);color:var(--muted)}
.pcb .code-ok{color:var(--ok)}
.pcb .code-bad{color:var(--bad)}
.pcb .more{padding:3px 0 0 26px}
.pcb .more button{appearance:none;border:0;background:transparent;color:var(--accent);cursor:pointer;font:11.5px/1.6 inherit;padding:2px 4px}
.pcb .empty{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted);text-align:center;padding:26px 18px}
.pcb .empty b{font-size:14px;color:var(--text)}
.pcb .empty p{margin:0;font-size:12.5px;max-width:420px;line-height:1.7}
.pcb .fav{width:282px;flex:0 0 auto;display:flex;flex-direction:column;gap:8px;border-left:1px solid var(--border);padding-left:14px;min-height:0}
.pcb .fav[hidden]{display:none}
.pcb .favHead{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:650}
.pcb .favList{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:6px}
.pcb .favItem{border:1px solid var(--border);border-radius:9px;background:var(--soft);padding:7px 9px 5px}
.pcb .favItem:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--border))}
.pcb .favText{margin:0;font:11.5px/1.55 var(--mono);cursor:pointer;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.pcb .favRow{display:flex;align-items:center;gap:4px;margin-top:3px}
.pcb .muted{color:var(--muted);font-size:12px}
.pcb .compose{flex:0 0 auto;border:1px solid var(--border);border-radius:12px;background:var(--soft);padding:7px 7px 5px;margin-top:10px}
.pcb .compose:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
.pcb .compose.busy{border-color:color-mix(in srgb,var(--accent) 55%,var(--border))}
.pcb .input{display:block;width:100%;border:0;outline:none;resize:none;background:transparent;color:var(--text);font:13px/1.65 var(--mono);padding:6px 8px;min-height:44px;max-height:170px;overflow:auto}
.pcb .bar{display:flex;align-items:center;gap:8px;padding:0 4px 1px 8px}
.pcb .sp{flex:1 1 auto}
.pcb .mask{position:fixed;inset:0;z-index:2147483000;background:rgba(8,12,20,.45);display:flex;align-items:center;justify-content:center;padding:26px}
.pcb .mask[hidden]{display:none}
.pcb .dialog{width:min(640px,100%);max-height:min(600px,86vh);display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border);border-radius:14px;box-shadow:0 26px 70px rgba(0,0,0,.4);overflow:hidden}
.pcb .dlgHead{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid var(--border);font-size:13.5px;font-weight:650}
.pcb .dlgBar{display:flex;align-items:center;gap:7px;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--soft);min-width:0}
.pcb .dlgPath{flex:1 1 auto;min-width:0;font:11.5px/1.6 var(--mono);color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.pcb .dlgList{flex:1 1 auto;min-height:0;overflow:auto;padding:6px}
.pcb .dirRow{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:transparent;color:inherit;font:13px/1.5 inherit;padding:7px 9px;border-radius:7px;cursor:pointer;min-width:0}
.pcb .dirRow:hover{background:color-mix(in srgb,var(--accent) 10%,transparent)}
.pcb .dirRow span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcb .dlgFoot{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--border)}
.pcb textarea::placeholder{color:transparent}
`

const SKELETON = [
  '<div class="head">',
  '  <div class="title">PowerShell 命令台</div>',
  '  <div class="tools">',
  '    <div class="field"><input data-id="cwd" spellcheck="false"><button class="inline" data-id="pickCwd">浏览</button></div>',
  '    <button class="btn" data-id="favToggle">常用命令 <b data-id="favCount">0</b></button>',
  '    <button class="btn" data-id="exportBtn">导出</button>',
  '    <button class="btn" data-id="clearBtn">清空</button>',
  '  </div>',
  '</div>',
  '<div class="banner" data-id="banner" hidden></div>',
  '<div class="body">',
  '  <div class="log" data-id="log"></div>',
  '  <aside class="fav" data-id="favPanel">',
  '    <div class="favHead"><span>常用命令</span><button class="mini" data-id="favHide">✕</button></div>',
  '    <div class="favList" data-id="favList"></div>',
  '  </aside>',
  '</div>',
  '<div class="compose" data-id="compose">',
  '  <textarea class="input" data-id="input" spellcheck="false" rows="1"></textarea>',
  '  <div class="bar">',
  '    <button class="mini" data-id="insertPath">插入路径…</button>',
  '    <button class="mini" data-id="starBtn">收藏当前</button>',
  '    <span class="sp"></span>',
  '    <button class="btn" data-id="clearInput">清空</button>',
  '    <button class="btn primary" data-id="runBtn">运行</button>',
  '  </div>',
  '</div>',
  '<div class="mask" data-id="mask" hidden>',
  '  <div class="dialog">',
  '    <div class="dlgHead"><span data-id="dlgTitle">选择文件夹</span><button class="mini" data-id="dlgX">✕</button></div>',
  '    <div class="dlgBar">',
  '      <button class="btn" data-id="dlgUp">← 上一级</button>',
  '      <select class="btn" data-id="dlgDrives"></select>',
  '      <div class="dlgPath" data-id="dlgPath"></div>',
  '    </div>',
  '    <div class="dlgList" data-id="dlgList"></div>',
  '    <div class="dlgFoot">',
  '      <span class="muted" data-id="dlgHint"></span>',
  '      <span class="sp"></span>',
  '      <button class="btn" data-id="dlgCancel">取消</button>',
  '      <button class="btn primary" data-id="dlgPick">用此目录</button>',
  '    </div>',
  '  </div>',
  '</div>'
].join('')

/* ---------------- 小工具 ---------------- */

function el(tag, cls, text) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text !== undefined && text !== null) node.textContent = String(text)
  return node
}

function headLines(text, max) {
  const lines = String(text).split('\n')
  if (lines.length <= max) return text
  return lines.slice(0, max).join('\n') + '\n…'
}

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function stamp(at) {
  const d = new Date(Number(at) || Date.now())
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function ago(at) {
  const diff = Date.now() - Number(at || 0)
  if (!(diff >= 0)) return ''
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return Math.floor(diff / 86400000) + ' 天前'
}

function duration(ms) {
  const n = Number(ms) || 0
  if (n < 1000) return n + ' ms'
  if (n < 60000) return (n / 1000).toFixed(n < 10000 ? 2 : 1) + ' s'
  return Math.floor(n / 60000) + ' min ' + Math.round((n % 60000) / 1000) + ' s'
}

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) { /* 落到下面 */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    return true
  } catch (e) {
    return false
  }
}

/* ---------------- 页面 ---------------- */

export function mount(root) {
  if (!root) return function () {}
  root.innerHTML = ''

  const style = document.createElement('style')
  style.textContent = CSS
  root.appendChild(style)

  const box = document.createElement('div')
  box.className = 'pcb'
  box.innerHTML = SKELETON
  root.appendChild(box)

  const els = {}
  box.querySelectorAll('[data-id]').forEach(function (node) {
    els[node.getAttribute('data-id')] = node
  })

  const ui = {
    alive: true,
    runs: [],
    favs: [],
    running: null,
    cwd: '',
    drives: [],
    showFav: true,
    dialog: { open: false, mode: 'cwd', path: '', parent: null, entries: [], busy: false },
    flashTimer: 0,
    confirmTimer: 0,
    confirmClear: false,
  }

  /* ---- 提示 ---- */

  function banner(text, isError) {
    if (!text) {
      els.banner.hidden = true
      els.banner.textContent = ''
      return
    }
    els.banner.hidden = false
    els.banner.className = 'banner' + (isError ? ' err' : '')
    els.banner.textContent = text
  }

  function flash(text, isError) {
    banner(text, isError)
    clearTimeout(ui.flashTimer)
    ui.flashTimer = setTimeout(function () {
      if (ui.alive) banner('', false)
    }, 1800)
  }

  /* ---- 存储 ---- */

  function save(key, list) {
    const url = key === 'records' ? API_RECORDS : API_FAVS
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [key]: list })
    }).then(function (r) {
      return r.json()
    }).then(function (data) {
      if (!data || data.ok !== true) flash('保存失败：' + ((data && data.error) || '未知错误'), true)
    }).catch(function (e) {
      flash('保存失败：' + ((e && e.message) || e), true)
    })
  }

  /* ---- 执行记录 ---- */

  function stateOf(rec) {
    if (rec.running) return 'running'
    if (rec.error) return 'error'
    if (rec.timedOut) return 'timeout'
    if (rec.code === 0) return 'ok'
    if (typeof rec.code === 'number') return 'fail'
    return 'ok'
  }

  function miniButton(label, handler, cls) {
    const b = el('button', 'mini' + (cls ? ' ' + cls : ''), label)
    b.type = 'button'
    b.addEventListener('click', handler)
    return b
  }

  function card(rec) {
    const kind = stateOf(rec)
    const bad = kind === 'fail' || kind === 'error' || kind === 'timeout'
    const node = el('div', 'block' + (bad ? ' bad' : ''))

    const line = el('div', 'cmdline')
    line.appendChild(el('span', 'ps', 'PS'))
    if (rec.cwd) {
      const pwd = el('span', 'pwd', rec.cwd)
      pwd.title = rec.cwd
      line.appendChild(pwd)
    }
    line.appendChild(el('span', 'ps', '>'))
    line.appendChild(el('pre', 'cmd', rec.text))

    const acts = el('div', 'acts')
    acts.appendChild(miniButton('复制', function () {
      flash(copyText(rec.text) ? '已复制命令' : '复制失败', false)
    }))
    if (kind !== 'running') {
      acts.appendChild(miniButton('输出', function () {
        const text = String(rec.stdout || '') + String(rec.stderr || '')
        flash(copyText(text || '（无输出）') ? '已复制输出' : '复制失败', false)
      }))
      acts.appendChild(miniButton('重跑', function () {
        startRun(rec.text, rec.cwd)
      }))
      acts.appendChild(miniButton('收藏', function () {
        addFav(rec.text, rec.cwd)
      }))
    }
    acts.appendChild(miniButton('删除', function () {
      removeRun(rec.id)
    }, 'del'))
    line.appendChild(acts)
    node.appendChild(line)

    if (kind === 'running') {
      node.appendChild(el('pre', 'out', '正在执行…'))
      return node
    }

    const stdout = String(rec.stdout || '')
    const stderr = String(rec.stderr || '')
    const lines = (stdout + stderr).replace(/\s+$/, '').split('\n').length
    const clampable = lines > CLAMP_LINES
    const holder = el('div')

    function paint(expanded) {
      holder.innerHTML = ''
      if (stdout.trim()) holder.appendChild(el('pre', 'out', expanded || !clampable ? stdout : headLines(stdout, CLAMP_LINES)))
      if (stderr.trim()) holder.appendChild(el('pre', 'out err', expanded || !clampable ? stderr : headLines(stderr, CLAMP_LINES)))
      if (!stdout.trim() && !stderr.trim()) holder.appendChild(el('pre', 'out', '（无输出）'))
      if (clampable) {
        const more = el('div', 'more')
        const btn = el('button', null, expanded ? '收起输出' : '展开全部（' + lines + ' 行）')
        btn.type = 'button'
        btn.addEventListener('click', function () {
          paint(!expanded)
        })
        more.appendChild(btn)
        holder.appendChild(more)
      }
    }
    paint(false)
    node.appendChild(holder)

    const status = el('div', 'status')
    status.appendChild(el('span', kind === 'ok' ? 'code-ok' : 'code-bad',
      kind === 'timeout' ? '超时终止' : kind === 'error' ? '执行失败' : 'exit ' + rec.code))
    if (rec.durationMs) status.appendChild(el('span', null, duration(rec.durationMs)))
    const timeNode = el('span', null, ago(rec.at))
    timeNode.title = stamp(rec.at)
    status.appendChild(timeNode)
    node.appendChild(status)

    return node
  }

  function emptyState() {
    const box2 = el('div', 'empty')
    box2.appendChild(el('b', null, '还没有执行过命令'))
    box2.appendChild(el('p', null, '在下面的输入框里写一条 PowerShell 命令，回车即执行；输出、退出码和耗时会记在这里，并保存到本机文件。'))
    return box2
  }

  function renderLog() {
    els.log.innerHTML = ''
    if (ui.runs.length === 0 && !ui.running) {
      els.log.appendChild(emptyState())
      return
    }
    ui.runs.forEach(function (rec) {
      els.log.appendChild(card(rec))
    })
    if (ui.running) els.log.appendChild(card(ui.running))
    els.log.scrollTop = els.log.scrollHeight
  }

  function removeRun(id) {
    ui.runs = ui.runs.filter(function (r) {
      return r.id !== id
    })
    renderLog()
    save('records', ui.runs)
  }

  /* ---- 常用命令 ---- */

  function renderFavs() {
    els.favCount.textContent = String(ui.favs.length)
    els.favPanel.hidden = !ui.showFav
    els.favToggle.className = 'btn' + (ui.showFav ? ' on' : '')
    els.favList.innerHTML = ''
    if (ui.favs.length === 0) {
      const empty = el('p', 'muted', '还没有收藏。执行一条命令后点卡片上的「收藏」，或在输入框下方点「收藏当前」。')
      els.favList.appendChild(empty)
      return
    }
    ui.favs.forEach(function (fav) {
      const item = el('div', 'favItem')
      const text = el('pre', 'favText', fav.text)
      text.title = fav.text
      text.addEventListener('click', function () {
        els.input.value = fav.text
        if (fav.cwd) els.cwd.value = fav.cwd
        els.input.focus()
        flash('已回填', false)
      })
      item.appendChild(text)
      const row = el('div', 'favRow')
      row.appendChild(miniButton('运行', function () {
        startRun(fav.text, fav.cwd)
      }))
      row.appendChild(miniButton('回填', function () {
        els.input.value = fav.text
        if (fav.cwd) els.cwd.value = fav.cwd
        els.input.focus()
      }))
      row.appendChild(el('span', 'sp'))
      row.appendChild(miniButton('删除', function () {
        ui.favs = ui.favs.filter(function (f) {
          return f.id !== fav.id
        })
        renderFavs()
        save('favorites', ui.favs)
      }, 'del'))
      item.appendChild(row)
      els.favList.appendChild(item)
    })
  }

  function addFav(text, dir) {
    const value = String(text || '').trim()
    if (!value) return
    const exists = ui.favs.some(function (f) {
      return f.text === value
    })
    if (exists) {
      flash('这条已经在常用命令里了', false)
      return
    }
    ui.favs.unshift({ id: uid(), text: value, at: Date.now(), cwd: dir || '' })
    renderFavs()
    save('favorites', ui.favs)
    flash('已收藏', false)
  }

  /* ---- 执行 ---- */

  function setBusy(busy) {
    els.runBtn.disabled = busy || !els.input.value.trim()
    els.clearInput.disabled = busy || !els.input.value.trim()
    els.starBtn.disabled = busy || !els.input.value.trim()
    els.input.disabled = busy
    els.compose.className = 'compose' + (busy ? ' busy' : '')
    els.runBtn.textContent = busy ? '运行中…' : '运行'
  }

  function startRun(text, dir) {
    if (ui.running) return
    const command = String(text === undefined || text === null ? els.input.value : text)
    if (!command.trim()) return
    const id = uid()
    const cwd = String(dir || els.cwd.value || '').trim()
    ui.running = { id: id, text: command, cwd: cwd, at: Date.now(), running: true }
    if (text === undefined || text === null) els.input.value = ''
    renderLog()
    setBusy(true)
    banner('', false)

    fetch(API_RUN, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: command, cwd: cwd })
    }).then(function (r) {
      return r.json()
    }).then(function (data) {
      const rec = {
        id: id,
        text: command,
        at: Date.now(),
        cwd: (data && data.cwd) || cwd,
        code: data && typeof data.code === 'number' ? data.code : null,
        durationMs: data && typeof data.durationMs === 'number' ? data.durationMs : 0,
        timedOut: !!(data && data.timedOut),
        truncated: !!(data && data.truncated),
        stdout: (data && data.stdout) || '',
        stderr: (data && data.stderr) || '',
        error: data && data.ok === false ? String(data.error || '执行失败') : null,
      }
      // 连续执行：这条命令跑过 cd 的话，下一条就从新目录开始
      if (rec.cwd && rec.cwd !== cwd) els.cwd.value = rec.cwd
      ui.running = null
      ui.runs.push(rec)
      renderLog()
      setBusy(false)
      save('records', ui.runs)
    }).catch(function (e) {
      const message = '执行失败：' + ((e && e.message) || e)
      ui.running = null
      ui.runs.push({
        id: id, text: command, at: Date.now(), cwd: cwd,
        code: null, durationMs: 0, stdout: '', stderr: message, error: message,
      })
      renderLog()
      setBusy(false)
      save('records', ui.runs)
      flash(message, true)
    })
  }

  /* ---- 图形化选路径 ---- */

  function renderDrives() {
    els.dlgDrives.innerHTML = ''
    const head = el('option', null, '盘符…')
    head.value = ''
    els.dlgDrives.appendChild(head)
    ui.drives.forEach(function (d) {
      const opt = el('option', null, d)
      opt.value = d
      els.dlgDrives.appendChild(opt)
    })
    els.dlgDrives.value = ''
  }

  function renderDialog() {
    const d = ui.dialog
    els.dlgPath.textContent = d.busy ? '读取中…' : (d.path || '（未选择）')
    els.dlgPath.title = d.path || ''
    els.dlgUp.disabled = (!d.parent || d.busy)
    els.dlgPick.disabled = (d.busy || !d.path)
    els.dlgPick.textContent = d.mode === 'cwd' ? '用此目录' : '插入此路径'
    els.dlgHint.textContent = d.error || ''
    els.dlgList.innerHTML = ''
    if (d.error) {
      els.dlgList.appendChild(el('p', 'muted', d.error))
      return
    }
    if (!d.entries.length) {
      els.dlgList.appendChild(el('p', 'muted', d.busy ? '读取中…' : '（这个目录下没有子文件夹）'))
      return
    }
    d.entries.forEach(function (entry) {
      const row = el('button', 'dirRow')
      row.type = 'button'
      row.appendChild(el('span', null, '📁 ' + entry.name))
      row.addEventListener('click', function () {
        loadDir(joinPath(d.path, entry.name))
      })
      els.dlgList.appendChild(row)
    })
  }

  function joinPath(base, name) {
    if (!base) return name
    return /[\\/]$/.test(base) ? base + name : base + '\\' + name
  }

  function loadDir(target) {
    const d = ui.dialog
    d.busy = true
    d.error = ''
    renderDialog()
    const url = API_LIST + (target ? '?path=' + encodeURIComponent(target) : '')
    fetch(url, { headers: { accept: 'application/json' } }).then(function (r) {
      return r.json()
    }).then(function (data) {
      d.busy = false
      if (!data || data.ok !== true) {
        d.error = (data && data.error) || '读取目录失败'
        renderDialog()
        return
      }
      d.path = data.path || ''
      d.parent = data.parent || null
      d.entries = data.entries || []
      ui.drives = data.drives || ui.drives
      renderDrives()
      renderDialog()
    }).catch(function (e) {
      d.busy = false
      d.error = '请求失败：' + ((e && e.message) || e)
      renderDialog()
    })
  }

  function openDialog(mode) {
    ui.dialog.open = true
    ui.dialog.mode = mode
    ui.dialog.path = ''
    ui.dialog.entries = []
    ui.dialog.parent = null
    ui.dialog.error = ''
    els.dlgTitle.textContent = mode === 'cwd' ? '选择工作目录' : '选择要插入的路径'
    els.mask.hidden = false
    renderDrives()
    loadDir(els.cwd.value.trim() || null)
  }

  function closeDialog() {
    ui.dialog.open = false
    els.mask.hidden = true
  }

  function applyPick() {
    const picked = ui.dialog.path
    if (!picked) return
    if (ui.dialog.mode === 'cwd') {
      els.cwd.value = picked
      flash('工作目录已设为 ' + picked, false)
    } else {
      insertPath(picked)
    }
    closeDialog()
  }

  function insertPath(picked) {
    const ta = els.input
    const value = ta.value
    const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : value.length
    const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const lead = before && !/\s$/.test(before) ? ' ' : ''
    const trail = after && !/^\s/.test(after) ? ' ' : ''
    const body = /\s/.test(picked) ? "'" + picked + "'" : picked
    ta.value = before + lead + body + trail + after
    ta.focus()
    const pos = (before + lead + body).length
    try { ta.setSelectionRange(pos, pos) } catch (e) { /* ignore */ }
    grow()
    setBusy(false)
    flash('已插入路径', false)
  }

  /* ---- 输入框 ---- */

  function grow() {
    const ta = els.input
    ta.style.height = 'auto'
    ta.style.height = Math.min(170, Math.max(44, ta.scrollHeight)) + 'px'
  }

  function syncButtons() {
    const empty = !els.input.value.trim()
    els.runBtn.disabled = !!ui.running || empty
    els.clearInput.disabled = !!ui.running || empty
    els.starBtn.disabled = !!ui.running || empty
  }

  /* ---- 事件 ---- */

  els.input.addEventListener('input', function () {
    grow()
    syncButtons()
  })

  els.input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return
    if (e.shiftKey) return
    if (e.nativeEvent && e.nativeEvent.isComposing) return
    e.preventDefault()
    startRun()
  })

  els.runBtn.addEventListener('click', function () {
    startRun()
  })

  els.clearInput.addEventListener('click', function () {
    els.input.value = ''
    grow()
    syncButtons()
    els.input.focus()
  })

  els.starBtn.addEventListener('click', function () {
    addFav(els.input.value, els.cwd.value)
  })

  els.insertPath.addEventListener('click', function () {
    openDialog('insert')
  })

  els.pickCwd.addEventListener('click', function () {
    openDialog('cwd')
  })

  els.favToggle.addEventListener('click', function () {
    ui.showFav = !ui.showFav
    renderFavs()
  })

  els.favHide.addEventListener('click', function () {
    ui.showFav = false
    renderFavs()
  })

  els.exportBtn.addEventListener('click', function () {
    if (!ui.runs.length) return
    const text = ui.runs.map(function (rec, index) {
      const head = '# ' + (index + 1) + ' · ' + stamp(rec.at) + ' · ' + (rec.cwd || '') + '\n' + rec.text + '\n'
      const status = '[退出码 ' + (rec.code === null || rec.code === undefined ? '-' : rec.code) + ' · ' + duration(rec.durationMs) + ']\n'
      const out = String(rec.stdout || '') + String(rec.stderr || '')
      return head + status + out
    }).join('\n\n')
    try {
      const blob = new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'powershell-runs.txt'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(function () {
        URL.revokeObjectURL(a.href)
      }, 4000)
      flash('已导出', false)
    } catch (e) {
      flash('导出失败：' + ((e && e.message) || e), true)
    }
  })

  els.clearBtn.addEventListener('click', function () {
    if (!ui.runs.length) return
    if (!ui.confirmClear) {
      ui.confirmClear = true
      els.clearBtn.className = 'btn danger'
      els.clearBtn.textContent = '确认清空？'
      clearTimeout(ui.confirmTimer)
      ui.confirmTimer = setTimeout(function () {
        ui.confirmClear = false
        els.clearBtn.className = 'btn'
        els.clearBtn.textContent = '清空'
      }, 4000)
      return
    }
    clearTimeout(ui.confirmTimer)
    ui.confirmClear = false
    els.clearBtn.className = 'btn'
    els.clearBtn.textContent = '清空'
    ui.runs = []
    renderLog()
    save('records', ui.runs)
    flash('已清空', false)
  })

  els.dlgUp.addEventListener('click', function () {
    if (ui.dialog.parent) loadDir(ui.dialog.parent)
  })

  els.dlgDrives.addEventListener('change', function (e) {
    const value = e.target.value
    if (value) loadDir(value)
  })

  els.dlgCancel.addEventListener('click', closeDialog)
  els.dlgX.addEventListener('click', closeDialog)
  els.dlgPick.addEventListener('click', applyPick)

  els.mask.addEventListener('mousedown', function (e) {
    if (e.target === els.mask) closeDialog()
  })

  function onKeydown(e) {
    if (e.key === 'Escape' && ui.dialog.open) {
      e.preventDefault()
      closeDialog()
    }
  }
  document.addEventListener('keydown', onKeydown, true)

  /* ---- 初始化 ---- */

  els.favPanel.hidden = false
  setBusy(false)
  renderFavs()
  renderLog()
  grow()
  syncButtons()

  fetch(API_INFO, { headers: { accept: 'application/json' } }).then(function (r) {
    return r.json()
  }).then(function (data) {
    if (!ui.alive) return
    if (data && data.ok) {
      els.cwd.value = data.cwd || ''
      ui.drives = data.drives || []
      renderDrives()
    }
  }).catch(function () { /* 目录接口会兜底 */ })

  fetch(API_RECORDS, { headers: { accept: 'application/json' } }).then(function (r) {
    return r.json()
  }).then(function (data) {
    if (!ui.alive) return
    if (data && data.ok === true && Array.isArray(data.records)) {
      ui.runs = data.records
      renderLog()
    }
  }).catch(function () { /* 忽略 */ })

  fetch(API_FAVS, { headers: { accept: 'application/json' } }).then(function (r) {
    return r.json()
  }).then(function (data) {
    if (!ui.alive) return
    if (data && data.ok === true && Array.isArray(data.favorites)) {
      ui.favs = data.favorites
      renderFavs()
    }
  }).catch(function () { /* 忽略 */ })

  return function dispose() {
    ui.alive = false
    clearTimeout(ui.flashTimer)
    clearTimeout(ui.confirmTimer)
    document.removeEventListener('keydown', onKeydown, true)
    root.innerHTML = ''
  }
}
