# ps-command-bench · demo（DSH Next 桌面端）

一个最小的 DSH Next 桌面端插件：把「PowerShell 命令工作台」以悬浮按钮 + 面板的形式
**注入进桌面端界面**，无需打开浏览器页面。

- 输入带 `{path}` / `{name}` 占位符的命令模板
- 自动检测占位符（徽章提示“未填文件夹 / 未定义”）
- 图形化浏览 + 手动编辑目标文件夹
- 实时预览最终命令
- 一键复制，并保留最近 20 条复制记录（localStorage）

宿主半侧只读目录，不写文件、不执行命令；agent 完全不参与。

## 目录

```
ps-command-bench/
├─ package.json          # 插件清单 + bundle patch 声明
├─ cordis.patch.yml      # 插入 Loader 条目（id/name = 包名）
├─ install.ps1           # 一键安装到 desktop profile
├─ uninstall.ps1
└─ lib/
   ├─ index.js           # 宿主半侧：目录 API + 把 widget 注入桌面端界面
   └─ page/
      └─ widget.js       # 注入的悬浮命令台（纯 DOM，无依赖）
```

## 安装

1. 运行 `install.ps1`（右键“使用 PowerShell 运行”，或在 PowerShell 里 `.\install.ps1`）。
   它会复制插件到 `~/.dsh/profiles/desktop/node_modules/ps-command-bench`，并把
   `ps-command-bench` 加进该 profile 的 `dsh.profile.bundles`。
2. **完全退出并重新打开 DSH Next**（宿主插件在启动时加载）。
3. 桌面端界面右下角会出现一个 **⚡ 按钮**，点它打开命令台。

> 注入走两条通道并自动去重：桌面端 `webserver/index-inject`（结构化行）+ web 表面 `tapIndex`，
> 与已装的鲸鱼挂件同一套机制。

## 使用

1. 顶部填命令模板，例如默认的 `cd '{path}'`，或 `git clone https://… '{path}'`。
2. 点“浏览…”选文件夹，或直接在“目标文件夹”输入框粘贴路径。
3. 预览区实时显示替换 `{path}` 后的最终命令。
4. 点“复制命令”，粘贴到 PowerShell 运行。

支持占位符：`{path}`（所选文件夹完整路径）、`{name}`（文件夹名）；其余显示“未定义”。

## 改代码

改完 `lib/` 后重新运行 `install.ps1`（重新复制）再重启 DSH Next。

## 卸载

运行 `uninstall.ps1`，重启 DSH Next。

## 注意

- 本 demo 用 `localStorage` 存历史，按来源（`127.0.0.1:<端口>`）隔离；端口变化会“清空”。
- 不要在 desktop profile 里运行 `pnpm install`（会把手工复制进 node_modules 的包当作多余项清掉）；若发生，重新运行 `install.ps1` 即可。
- 目录列举只读，且仅允许本机（回环）访问。
- 注入脚本在宿主 shell 的 DOM 里运行；按钮位于右下角，若与其它挂件重叠，可改 `widget.js` 里 `#pscb-btn` 的 `right/bottom`。
