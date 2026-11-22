<div align="center">

# DSH 插件集

面向 **DeepSeek Harness（DSH）** 的开箱即用插件，一个换外观，一个跑命令。

[插件一览](#插件一览) · [安装](#安装) · [仓库约定](#仓库约定git-规范) · [English](#english)

</div>

---

> 本仓库是**分发仓**：每个插件的构建产物（`lib/`）已入库，克隆或安装后即可使用，**无需构建**。
> 插件源码在上游仓库维护，本仓不跟踪其 `src/`，也不含 `node_modules`。

## 插件一览

| 插件 | 包名 | 版本 | 作用 | 平台 |
| --- | --- | --- | --- | --- |
| [`dsh-any-background`](dsh-any-background/README.md) | `dsh-any-background` | 0.4.2 | 外观插件：PS 风格取色轮、图片/视频/生成式壁纸、分面透明度与毛玻璃、外观预设、壁纸轮播、日夜自动切换 | DSH Web / 桌面端（跨平台） |
| [`ps-command-bench`](ps-command-bench/README.md) | `dsh-powershell-console` | 0.7.0 | 命令台：在 DSH 侧栏里直接执行 PowerShell 命令，图形化选目录、按块回显输出、历史与常用命令持久化 | 仅 Windows |

两个插件互不依赖，可单独安装；数据都写在 `~/.dsh/` 下，不落在仓库里。

| 插件 | 用户数据目录 |
| --- | --- |
| `dsh-any-background` | `~/.dsh/.dsh-any-background-data/`（配置、壁纸、轮播池、字体） |
| `ps-command-bench` | `~/.dsh/ps-command-bench/`（`records.json`、`favorites.json`） |

## 目录结构

```
ai_dsh/
├─ README.md                      # 本文件
├─ LICENSE                        # MIT
├─ .gitignore / .gitattributes    # 忽略规则、行尾与二进制约定
├─ .editorconfig                  # 编辑器编码/缩进/行尾
├─ dsh-any-background/            # 插件一：外观主题
│  ├─ package.json                #   清单（engines.dsh / peerDependencies / dsh.bundle）
│  ├─ cordis.patch.yml            #   Loader 插入层
│  ├─ lib/index.js                #   宿主半侧（Node）：存储、静态资源、RPC
│  ├─ lib/client.js + .map        #   浏览器半侧：界面与样式注入（构建产物）
│  ├─ LICENSE
│  └─ README.md / README.zh.md    #   上游文档（英文 / 中文）
└─ ps-command-bench/              # 插件二：命令台
   ├─ package.json                #   包名 dsh-powershell-console，目录名沿用 ps-command-bench
   ├─ cordis.patch.yml            #   Loader 插入层（id/name 用目录名）
   ├─ install.ps1 / uninstall.ps1 #   一键装/卸到 desktop profile
   └─ lib/
      ├─ index.js                 #   宿主半侧：/ps-command-bench/* 路由 + 执行命令
      ├─ client.js                #   浏览器半侧：注册侧栏入口与主区页面
      └─ page/{page.js,widget.js} #   页面脚本（原生 DOM）
```

## 安装

### 通用前提

DSH 的插件按 profile 装配，装完**必须重启 DSH**（宿主在启动时加载插件），之后升级也要重启。

### dsh-any-background

npm 上已发布，推荐直接按包名安装：

```sh
dsh plugin --profile web add dsh-any-background
dsh web
```

装好后在 **设置 → 主题** 里配置；若装的是 `dsh-better-sidebar`，页面会改为注册到它的侧栏，官方侧栏的入口自动撤回，两者不会重复。

也可以从本仓库的目录装（本地已 `git clone` 的前提下）：

```sh
dsh plugin --profile web add "dsh-any-background"
```

### ps-command-bench

```powershell
.\ps-command-bench\install.ps1
```

脚本做两件事：把插件复制到 `~/.dsh/profiles/desktop/node_modules/ps-command-bench`，并把 `ps-command-bench` 追加进该 profile 的 `dsh.profile.bundles`（覆盖写前自动备份 `package.json`）。然后**完全退出并重开 DSH**，左侧会多出「命令台」入口。

卸载运行 `uninstall.ps1`（同样备份 profile 清单），数据目录 `~/.dsh/ps-command-bench/` 需手动删。

> 不要在 desktop profile 里运行 `pnpm install`：它会把手工复制进 `node_modules` 的包当作多余项清掉。真发生了，重跑 `install.ps1` 即可。

## 兼容性

| 插件 | 宿主版本要求 |
| --- | --- |
| `dsh-any-background` | `dsh` 0.2.0-rc.1 起的各版本，并在 `engines.dsh` / `peerDependencies` / `dsh.compatibility` 中逐个登记；对未登记的更高版本走最近适配 + 日志提示，不会整包禁用 |
| `ps-command-bench` | 需要宿主提供 `webServer`（注册 HTTP 路由）与 `slots`（侧栏/主区插槽）；仅在 Windows 上可用，命令由系统自带的 `powershell.exe` 执行 |

`dsh-any-background` 的样式依赖宿主稳定的 DOM 标记与 CSS 变量名；宿主改版可能让某个滑杆对某块表面暂时失效（只影响观感，不报错）。细节见该插件自己的 README。

## 仓库约定（Git 规范）

- **分支**：`main` 为唯一长期分支；功能改动走短分支后合并，不直接改历史。
- **远程**：`origin` 指向 `https://github.com/chickencheng/DSH.git`。
- **提交信息**：Conventional Commits，`type(scope): 中文描述`，一行不超过 72 字符。

  | type | 用途 |
  | --- | --- |
  | `feat` | 新增能力 |
  | `fix` | 修 bug |
  | `docs` | 只改文档 |
  | `chore` | 卫生、配置、依赖 |
  | `refactor` | 不改行为的重构 |
  | `build` | 构建流程或产物 |

  例：`fix(ps-command-bench): 超时后残留的 powershell 子进程`。
- **行尾与编码**：`.gitattributes` 统一文本归一化为 LF，`.ps1/.bat` 保持 CRLF；`.editorconfig` 规定 UTF-8（无 BOM）、缩进与末尾换行。JSON 文件不要带 BOM——宿主加载 profile 时用 `JSON.parse`，BOM 会直接报错。
- **产物策略**：`lib/` 是随包分发的构建产物，**必须入库**（安装时零构建）；`node_modules/`、`dist/`、日志、`.env` 一律忽略。
- **版本联动**：改插件行为时同步 bump 该插件的 `package.json` 版本，并更新它自己的 README/CHANGELOG；只改仓库文档不需要 bump。

## 说明与边界

- **只收产物**：`dsh-any-background` 的 `package.json` 里保留了 `tsdown`/`tsc` 脚本，但本仓库不带 `src/`、`tsconfig.json` 与 `scripts/`，所以上游 README 里的「本地构建」步骤在这里跑不通——开发请到上游仓库。
- **上游归属**：`dsh-any-background` 作者 Tkingxiao（[上游仓库](https://github.com/Tkingxiao/dsh-any-background)），本仓同步的是发布产物与文档。
- **截图缺失**：上游 README 引用了 `example_img/*.png`，本仓未收录这些图片，浏览时会显示为坏链；需要看图请到上游仓库。
- **安全**：两个插件都只服务本机回环请求。`ps-command-bench` 会以当前用户权限执行你输入的任意 PowerShell 命令，等同于本机终端——不要把它转发到局域网或公网。

## 常见问题

**装完看不到效果？**
先重启 DSH。两个插件都在宿主启动时装配，改过 `lib/` 或升级版本后都要重启宿主才会生效。

**改了 `lib/` 里的代码为什么没变化？**
要重新覆盖到 profile 的 `node_modules` 再重启：`ps-command-bench` 重跑 `install.ps1`；`dsh-any-background` 重新 `dsh plugin add` 一次。

**想彻底重置某个插件？**
删掉对应的 `~/.dsh` 数据目录即可（见[插件一览](#插件一览)的表），插件本身不受影响。

**为什么 `master` 分支还在远端？**
仓库早期用 `master`，后来改名为 `main`，远端旧分支尚未删除；新提交一律进 `main`。

## 许可

[MIT](LICENSE)。各插件目录内另有自己的 LICENSE / 作者信息，以其为准。

---

## English

A small collection of ready-to-use **DeepSeek Harness (DSH)** plugins. Built artifacts (`lib/`) are committed, so no build step is needed.

| Plugin | Package | Version | What it does |
| --- | --- | --- | --- |
| [`dsh-any-background`](dsh-any-background/README.md) | `dsh-any-background` | 0.4.2 | Appearance plugin: PS-style color wheel, image/video/generated wallpapers, per-surface opacity & frosted blur, presets, day/night switch |
| [`ps-command-bench`](ps-command-bench/README.md) | `dsh-powershell-console` | 0.7.0 | PowerShell console inside DSH: run commands from the sidebar, pick folders graphically, keep history and favourites (Windows only) |

```sh
# appearance plugin
dsh plugin --profile web add dsh-any-background && dsh web

# console plugin (Windows)
powershell -File .\ps-command-bench\install.ps1   # then fully restart DSH
```

Both plugins persist data under `~/.dsh/` and only answer loopback requests. `ps-command-bench` executes arbitrary PowerShell as your user — keep it local.

Repository conventions: `main` branch, `origin` remote, Conventional Commits, normalized LF line endings via `.gitattributes`, MIT licensed.
