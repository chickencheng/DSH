/**
 * dsh-powershell-console — 浏览器半区的「壳」。
 *
 * 这里只做三件事，任何页面逻辑都不放在这个文件里：
 *   1. 注册侧栏入口（sidebar.panellist）与主页面（main）；
 *   2. 组件挂载时动态 import 宿主下发的 /ps-command-bench/page.js；
 *   3. 页面脚本出错时只显示一行错误，绝不连累 DSH 启动。
 *
 * 关于 id：插件已改名为 dsh-powershell-console，但 profile 里这条 bundle 仍按
 * 目录名 ps-command-bench 解析；不同宿主版本对"注册 id 该等于包名还是等于清单名"
 * 的判定不完全一致，所以两个 id 都登记一次，谁检查都能对上，未使用的那个无副作用。
 */
;(function () {
	function factory(require) {
		var module = { exports: {} }
		var exports = module.exports
		var React = require('react')
		var h = React.createElement
		var PANEL_ID = 'dsh-powershell-console'

		function Bench() {
			var hostRef = React.useRef(null)
			var messageState = React.useState('')
			var message = messageState[0]
			var setMessage = messageState[1]

			React.useEffect(function () {
				var alive = true
				var dispose = null
				import('/ps-command-bench/page.js').then(function (mod) {
					if (!alive || !hostRef.current) return
					dispose = mod.mount(hostRef.current)
				}).catch(function (e) {
					if (alive) setMessage('页面脚本加载失败：' + ((e && e.message) || e))
				})
				return function () {
					alive = false
					if (typeof dispose === 'function') {
						try { dispose() } catch (e) { /* ignore */ }
					}
				}
			}, [])

			return h('div', { ref: hostRef, style: { height: '100%', minHeight: 0, overflow: 'hidden' } },
				message ? h('pre', { style: { margin: 0, padding: '24px', color: '#c94f4f', whiteSpace: 'pre-wrap', font: '12px/1.7 monospace' } }, message) : null)
		}

		function Bolt(props) {
			var size = (props && props.size) || 16
			return h('svg', {
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.8,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				focusable: false
			}, h('path', { d: 'M13 2.5 5 13.5h5l-1 8 8-11h-5z' }))
		}

		function apply(ctx) {
			var disposers = []
			disposers.push(ctx.slots.inject('main', function () {
				return ctx.slots.register({ name: 'main', key: PANEL_ID, inject: function () { return { workbench: true } } }, Bench)
			}))
			disposers.push(ctx.slots.inject('sidebar.panellist', function () {
				return ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 60, label: function () { return '命令台' } }, Bolt)
			}))
			ctx.effect(function () {
				return function () {
					for (var i = 0; i < disposers.length; i++) {
						if (typeof disposers[i] === 'function') {
							try { disposers[i]() } catch (e) { /* ignore */ }
						}
					}
				}
			})
		}

		exports.name = 'dsh-powershell-console'
		exports.inject = ['slots']
		exports.apply = apply
		return module.exports
	}

	window.__ModuleLoader__.load({ id: 'dsh-powershell-console', factory: factory })
	window.__ModuleLoader__.load({ id: 'ps-command-bench', factory: factory })
})()
