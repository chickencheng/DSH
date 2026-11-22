# ps-command-bench · DSH 命令台

DeepSeek Harness（DSH）插件 **`dsh-powershell-console`** 的载体目录。目录名沿用 `ps-command-bench`，
因为 profile 里那条 bundle 是按**目录名**解析的（详见文末「包名与目录名」）。

它把「PowerShell 命令台」做进 DSH 界面：左侧栏一个「命令台」入口，主区一页控制台，直接在本机执行命令并回显输出，不用切到外部终端。

## 功能

- **执行命令**：输入命令回车即运行，输出按「一次执行一块」记录，含 stdout、stderr、退出码、耗时、是否超时/截断
- **工作目录连续**：命令末尾会回写执行后的当前目录，`cd` 之后的下一条命令自动从新目录开始
- **图形化选目录**：盘符列表 + 逐级浏览，也可直接粘贴路径；工作目录不存在会明确报错而不是静默回落
- **历史与常用命令**：执行记录与收藏持久化到磁盘，支持复制命令 / 复制输出 / 重跑 / 收藏 / 删除
- **中文与编码**：执行前注入 `[Console]::OutputEncoding = UTF8`，中文输出不乱码；用 `StringDecoder` 处理跨块的多字节字符
- **仅本机可用**：宿主半侧所有路由都做回环 + 同源校验，跨站请求直接 403

> 仅 Windows：命令由 `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe` 执行
> （`-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass`）。

## 结构

```
ps-command-bench/
├─ package.json          # 包名 dsh-powershell-console；声明 dsh.bundle.patch 与 client.inject
├─ cordis.patch.yml      # 插入一条 Loader 条目（id/name = 目录名 ps-command-bench）
├─ install.ps1           # 一键装进 desktop profile
├─ uninstall.ps1         # 一键卸载
└─ lib/
   ├─ index.js           # 宿主半侧：/ps-command-bench/* 路由、执行命令、读写历史
   ├─ client.js          # 浏览器半侧：注册侧栏入口与主区页面
   └─ page/
      ├─ page.js         # 命令台页面（原生 DOM，ESM，由 client.js 动态 import）
      └─ widget.js       # 旧版右下角悬浮按钮实现，当前未挂载，仅保留
```

三层职责很清楚：**client.js 只做壳**（注册插槽、`import('/ps-command-bench/page.js')`、出错时只显示一行错误，绝不连累 DSH 启动）；**page.js 只做界面**；**index.js 只管路由与子进程**。

## 安装

```powershell
# 在仓库根目录执行；也可以右键 install.ps1 →“使用 PowerShell 运行”
.\ps-command-bench\install.ps1
```

脚本会：

1. 把 `lib/`、`package.json`、`cordis.patch.yml` 复制到 `~/.dsh/profiles/desktop/node_modules/ps-command-bench`
   （先删旧目录，避免残留文件）；
2. 把 `ps-command-bench` 追加进该 profile 的 `dsh.profile.bundles`（幂等；写之前备份 `package.json.bak-<时间戳>`；
   写入时为 **UTF-8 无 BOM**，因为宿主用 `JSON.parse` 读配置，BOM 会直接报错）。

然后**完全退出并重开 DSH**，左侧栏出现「命令台」。

> 历史版本是右下角悬浮的 ⚡ 按钮，v0.7.0 起改为侧栏面板 + 主区页面。

## 接口

宿主半侧通过 `webServer` 注册，前缀 `/ps-command-bench`，全部要求回环同源：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/ps-command-bench/page.js` | 下发页面脚本（浏览器端动态 `import`） |
| GET | `/ps-command-bench/api/info` | 默认工作目录、`powershell.exe` 路径、可用盘符 |
| GET | `/ps-command-bench/api/list?path=` | 列出某目录下的子目录（只读，用于选目录） |
| POST | `/ps-command-bench/api/run` | `{ command, cwd }` → `{ ok, code, stdout, stderr, durationMs, timedOut, truncated, cwd }` |
| GET / POST | `/ps-command-bench/api/records` | 读 / 覆盖写执行历史 |
| GET / POST | `/ps-command-bench/api/favorites` | 读 / 覆盖写常用命令 |

拦截规则：`Host` 必须是 `127.0.0.1` / `localhost` / `::1`；`Sec-Fetch-Site: cross-site` 拒绝；带了 `Origin` 且与 `Host` 不同源则拒绝。

## 数据与限制

数据目录 `~/.dsh/ps-command-bench/`（`DSH_HOME` 可覆盖 `~/.dsh`），均为原子写（临时文件 + `rename`）：

| 文件 | 内容 |
| --- | --- |
| `records.json` | 执行历史，保留最近 200 条，每条命令文本 ≤ 20000 字符、stdout/stderr 各存 ≤ 40000 字符 |
| `favorites.json` | 常用命令，上限 300 条 |

单次执行的上限：stdout / stderr 各 1 MiB（超出标记 `truncated`）、请求体 4 MiB、超时 120 秒（超时后用 `taskkill /PID <pid> /T /F` 结束整个进程树并标记 `timedOut`）。

已知限制：**运行中不能手动中断**，只能等命令结束或 120 秒超时；一次只跑一条命令（界面在运行期间锁定运行按钮）。

## 安全

- 插件能执行你输入的任意 PowerShell 命令，**权限等同于当前 Windows 用户**；只在本机使用，不要把它暴露到局域网或公网。
- 目录列举是只读的，且限制在回环地址。
- 没有第三方运行时依赖（只用 Node 内置模块），没有 `postinstall` 脚本。

## 卸载

```powershell
.\ps-command-bench\uninstall.ps1
```

它会从 `dsh.profile.bundles` 移除条目（先备份）并删除 `node_modules/ps-command-bench`，之后重启 DSH。
历史与收藏留在 `~/.dsh/ps-command-bench/`，需要彻底清理就手动删掉该目录。

## 改代码

`lib/` 是直接运行的产物，没有构建步骤：改完重新运行 `install.ps1` 覆盖到 profile，再重启 DSH。

## 包名与目录名

包名已改为 `dsh-powershell-console`，但目录名与 `cordis.patch.yml` 里的 `id`/`name` 仍是 `ps-command-bench`——
profile 的 bundle 条目按目录名解析，改目录名会让已装好的实例失联。浏览器半侧为了兼容两种判定方式，
把 `dsh-powershell-console` 与 `ps-command-bench` 两个模块 id 各注册了一次（未使用的那个没有副作用）。
