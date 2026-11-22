// ps-command-bench —— 桌面端悬浮命令台（注入进 DSH Next 界面的 DOM）。
// 纯 DOM，无依赖：占位符检测 / 目录浏览 / 实时预览 / 复制 / 历史。
// 目录列举走宿主 /api/list；历史用 localStorage。
(function () {
  'use strict'
  if (window.__pscb_loaded) return
  window.__pscb_loaded = true
  try { fetch('/ps-command-bench/api/ping?m=source') } catch (e) {}

  var STYLE_TEXT =
    '#pscb-root,#pscb-root *{box-sizing:border-box}' +
    '#pscb-root{position:fixed;z-index:2147483000;font:13px/1.5 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:#e6edf3}' +
    '#pscb-btn{position:fixed;right:16px;bottom:16px;z-index:2147483001;width:44px;height:44px;border-radius:12px;border:1px solid #2a323d;background:#1a2130;color:#8ec2ff;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}' +
    '#pscb-btn:hover{border-color:#4c8dff}' +
    '#pscb-panel{position:fixed;right:16px;bottom:72px;width:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 96px);overflow:auto;background:#141923;border:1px solid #2a323d;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:16px}' +
    '#pscb-panel.hidden{display:none}' +
    '#pscb-panel h2{margin:0 0 4px;font-size:15px}' +
    '#pscb-panel .sub{margin:0 0 14px;color:#8b98a5;font-size:12px}' +
    '#pscb-panel label{display:block;margin:10px 0 4px;color:#8b98a5;font-size:12px}' +
    '#pscb-panel input,#pscb-panel button{font:13px/1.4 "Cascadia Mono",Consolas,monospace;color:#e6edf3;background:#181d25;border:1px solid #2a323d;border-radius:8px;padding:8px 10px;outline:none}' +
    '#pscb-panel input{width:100%}' +
    '#pscb-panel input:focus{border-color:#4c8dff}' +
    '#pscb-panel button{cursor:pointer}' +
    '#pscb-panel button:hover{border-color:#4c8dff}' +
    '#pscb-panel .primary{background:#4c8dff;border-color:#4c8dff;color:#fff}' +
    '#pscb-panel .row{display:flex;gap:8px}' +
    '#pscb-panel .row input{flex:1}' +
    '#pscb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '#pscb-chips .chip{font-family:"Cascadia Mono",Consolas,monospace;font-size:11px;padding:1px 7px;border-radius:999px;border:1px solid #2a323d;color:#8b98a5}' +
    '#pscb-chips .chip.ok{color:#3fb950;border-color:rgba(63,185,80,.5)}' +
    '#pscb-chips .chip.need{color:#d29922;border-color:rgba(210,153,34,.6)}' +
    '#pscb-browser{border:1px solid #2a323d;border-radius:10px;background:#181d25;margin-top:8px;overflow:hidden}' +
    '#pscb-browser.hidden{display:none}' +
    '#pscb-breadcrumb{display:flex;flex-wrap:wrap;gap:2px;padding:6px 8px;border-bottom:1px solid #2a323d;align-items:center}' +
    '#pscb-breadcrumb .seg{cursor:pointer;color:#4c8dff;font-family:"Cascadia Mono",Consolas,monospace;font-size:11px}' +
    '#pscb-breadcrumb .sep{color:#8b98a5;margin:0 2px}' +
    '#pscb-entries{list-style:none;margin:0;padding:4px;max-height:200px;overflow:auto}' +
    '#pscb-entries li{padding:5px 8px;border-radius:6px;cursor:pointer;display:flex;gap:8px}' +
    '#pscb-entries li:hover{background:rgba(76,141,255,.1)}' +
    '#pscb-entries li.dir{font-weight:600}' +
    '#pscb-entries li.file{color:#8b98a5;cursor:default}' +
    '#pscb-panel .bfoot{display:flex;gap:8px;padding:8px;border-top:1px solid #2a323d}' +
    '#pscb-preview{margin:0;padding:10px;border-radius:8px;background:#181d25;border:1px solid #2a323d;font-family:"Cascadia Mono",Consolas,monospace;font-size:13px;white-space:pre-wrap;word-break:break-all;min-height:20px}' +
    '#pscb-actions{display:flex;align-items:center;gap:10px;margin-top:14px}' +
    '#pscb-status{color:#8b98a5;font-size:12px}' +
    '#pscb-status.ok{color:#3fb950}' +
    '#pscb-status.err{color:#f85149}' +
    '#pscb-hist{margin-top:14px}' +
    '#pscb-hist h3{font-size:12px;color:#8b98a5;margin:0 0 6px}' +
    '#pscb-hist ul{list-style:none;margin:0;padding:0}' +
    '#pscb-hist li{font-family:"Cascadia Mono",Consolas,monospace;font-size:11px;background:#181d25;border:1px solid #2a323d;border-radius:8px;padding:6px 9px;margin-bottom:5px;cursor:pointer;word-break:break-all}' +
    '#pscb-hist li:hover{border-color:#4c8dff}'

  function ensureStyle() {
    var s = document.createElement('style')
    s.id = 'pscb-style'
    s.textContent = STYLE_TEXT
    ;(document.head || document.documentElement).appendChild(s)
  }

  var HISTORY_KEY = 'ps-command-bench.history'
  var MAX_HISTORY = 20
  var currentPath = null

  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function build() {
    var root = document.createElement('div')
    root.id = 'pscb-root'

    var btn = el('button')
    btn.id = 'pscb-btn'
    btn.textContent = '⚡'
    btn.title = 'PowerShell 命令工作台'

    var panel = el('div', 'hidden')
    panel.id = 'pscb-panel'
    panel.innerHTML =
      '<h2>PowerShell 命令工作台</h2>' +
      '<p class="sub">占位符 {path} / {name} · 选文件夹 · 预览 · 复制</p>' +
      '<label>命令模板</label>' +
      '<input id="pscb-tpl" value="cd \'{path}\'" />' +
      '<div id="pscb-chips"></div>' +
      '<label>目标文件夹</label>' +
      '<div class="row"><input id="pscb-folder" placeholder="手动输入，或点“浏览”选择" /><button id="pscb-browse" type="button">浏览…</button></div>' +
      '<div id="pscb-browser" class="hidden"><div id="pscb-breadcrumb"></div><ul id="pscb-entries"></ul>' +
      '<div class="bfoot"><button id="pscb-pick" class="primary" type="button">选择此文件夹</button><button id="pscb-close-browser" type="button">关闭</button></div></div>' +
      '<label>预览</label>' +
      '<pre id="pscb-preview"></pre>' +
      '<div id="pscb-actions"><button id="pscb-copy" class="primary" type="button">复制命令</button><span id="pscb-status"></span></div>' +
      '<div id="pscb-hist"><h3>最近复制</h3><ul id="pscb-history"></ul></div>'

    root.appendChild(btn)
    root.appendChild(panel)
    return { root: root, btn: btn, panel: panel }
  }

  function g(id) { return document.getElementById(id) }

  function detect(tpl) {
    var out = []
    var re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
    var m
    while ((m = re.exec(tpl))) { if (out.indexOf(m[1]) === -1) out.push(m[1]) }
    return out
  }

  function resolve(name, value) {
    if (name === 'path') return value || null
    if (name === 'name') {
      if (!value) return null
      var p = value.replace(/[\\/]+$/, '')
      var i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
      return i >= 0 ? p.slice(i + 1) : p
    }
    return null
  }

  function render() {
    var t = g('pscb-tpl').value
    var fv = g('pscb-folder').value.trim()
    var tokens = detect(t)
    var missing = []
    var rendered = t.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, function (all, name) {
      var v = resolve(name, fv)
      if (v === null || v === '') { missing.push(name); return all }
      return v
    })

    var chips = g('pscb-chips')
    chips.innerHTML = ''
    tokens.forEach(function (name) {
      var known = (name === 'path' || name === 'name')
      var need = known && !fv
      var c = el('span', 'chip' + (need ? ' need' : known ? ' ok' : ''))
      c.textContent = '{' + name + '}' + (need ? ' ← 未填文件夹' : known ? '' : ' ← 未定义')
      chips.appendChild(c)
    })

    g('pscb-preview').textContent = rendered
    return { rendered: rendered, missing: missing }
  }

  function flash(msg, ok) {
    var st = g('pscb-status')
    st.textContent = msg
    st.className = ok ? 'ok' : 'err'
    clearTimeout(flash._t)
    flash._t = setTimeout(function () { st.textContent = ''; st.className = '' }, 2600)
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch (e) {}
    document.body.removeChild(ta)
  }

  function copy() {
    var r = render()
    if (r.missing.length) {
      flash('未解析：' + r.missing.map(function (x) { return '{' + x + '}' }).join(', '), false)
      return
    }
    var done = function () { pushHistory(r.rendered); flash('已复制到剪贴板', true) }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(r.rendered).then(done, function () { fallbackCopy(r.rendered); done() })
    } else { fallbackCopy(r.rendered); done() }
  }

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch (e) { return [] }
  }
  function pushHistory(cmd) {
    var h = readHistory().filter(function (x) { return x.cmd !== cmd })
    h.unshift({ cmd: cmd, at: Date.now() })
    h = h.slice(0, MAX_HISTORY)
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch (e) {}
    renderHistory()
  }
  function renderHistory() {
    var ul = g('pscb-history')
    ul.innerHTML = ''
    readHistory().forEach(function (x) {
      var li = el('li', null, x.cmd)
      li.title = '点击回填'
      li.addEventListener('click', function () {
        g('pscb-tpl').value = x.cmd
        g('pscb-folder').value = ''
        render()
      })
      ul.appendChild(li)
    })
  }

  function loadDir(path) {
    var url = '/ps-command-bench/api/list' + (path ? '?path=' + encodeURIComponent(path) : '')
    fetch(url).then(function (r) { return r.json() }).then(function (data) {
      if (!data.ok) { flash('读取目录失败：' + (data.error || '未知错误'), false); return }
      currentPath = data.path
      renderBreadcrumb(data.path)
      renderEntries(data.entries)
    }).catch(function (e) { flash('请求失败：' + e.message, false) })
  }

  function splitPath(p) {
    p = String(p || '')
    if (!p) return []
    if (p.slice(0, 2) === '\\\\') {
      var rest = p.slice(2).split('\\').filter(Boolean)
      return ['\\\\' + rest[0] + '\\' + rest[1]].concat(rest.slice(2))
    }
    var drive = /^([a-zA-Z]:\\)/.exec(p)
    var parts = p.replace(/^[a-zA-Z]:\\/, '').split('\\').filter(Boolean)
    return drive ? [drive[1]].concat(parts) : parts
  }
  function joinPath(base, seg) {
    if (!base) return seg
    if (/[\\/]$/.test(base)) return base + seg
    return base + '\\' + seg
  }

  function renderBreadcrumb(path) {
    var bc = g('pscb-breadcrumb')
    bc.innerHTML = ''
    var acc = ''
    splitPath(path).forEach(function (seg, i) {
      acc = joinPath(acc, seg)
      if (i > 0) bc.appendChild(el('span', 'sep', '›'))
      var a = el('span', 'seg', seg)
      a.title = acc
      a.addEventListener('click', function () { loadDir(acc) })
      bc.appendChild(a)
    })
  }

  function renderEntries(list) {
    var ul = g('pscb-entries')
    ul.innerHTML = ''
    if (!list || !list.length) {
      ul.appendChild(el('li', 'file', '（空目录）'))
      return
    }
    list.forEach(function (e) {
      var li = el('li', e.isDir ? 'dir' : 'file', (e.isDir ? '📁 ' : '📄 ') + e.name)
      if (e.isDir) li.addEventListener('click', function () { loadDir(joinPath(currentPath, e.name)) })
      ul.appendChild(li)
    })
  }

  function pingStep(m) { try { fetch('/ps-command-bench/api/ping?m=' + encodeURIComponent(m)) } catch (e) {} }

  function init() {
    pingStep('step-enter')
    pingStep('global-css=' + (typeof window.CSS) + '|' + String(window.CSS).slice(0, 40))
    ensureStyle()
    pingStep('step-style')
    var ui = build()
    pingStep('step-build')
    document.body.appendChild(ui.root)
    pingStep('step-append')

    ui.btn.addEventListener('click', function () { ui.panel.classList.toggle('hidden') })
    g('pscb-tpl').addEventListener('input', render)
    g('pscb-folder').addEventListener('input', render)
    g('pscb-copy').addEventListener('click', copy)
    g('pscb-browse').addEventListener('click', function () {
      g('pscb-browser').classList.remove('hidden')
      loadDir(g('pscb-folder').value.trim() || null)
    })
    g('pscb-close-browser').addEventListener('click', function () { g('pscb-browser').classList.add('hidden') })
    g('pscb-pick').addEventListener('click', function () {
      g('pscb-folder').value = currentPath || ''
      g('pscb-browser').classList.add('hidden')
      render()
    })
    pingStep('step-bind')

    render()
    pingStep('step-render')
    renderHistory()
    pingStep('step-history')

    // 启动成功后移除宿主注入的诊断块
    var marker = document.getElementById('pscb-inject-marker')
    if (marker) marker.remove()
    var jsMarker = document.getElementById('pscb-js-marker')
    if (jsMarker) jsMarker.remove()
    pingStep('widget')
  }

  function start() {
    if (document.body) { init() }
    else { document.addEventListener('DOMContentLoaded', init) }
  }
  start()
})()
