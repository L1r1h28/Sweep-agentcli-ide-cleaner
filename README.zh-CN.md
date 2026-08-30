# Sweep (AI 代码辅助工具清理器) 🧹

> 一键扫描、精准隔离、安全清理主流 AI 编程助手与 AI IDE 的缓存及对话历史记录。

<p align="left">
  <a href="README.md">English</a> |
  <strong>简体中文</strong> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@l1r1h28/sweep-cli.svg)](https://www.npmjs.com/package/@l1r1h28/sweep-cli)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

随着 AI 辅助开发工具（如 Antigravity、Codex、Claude Code、Windsurf、AWS Kiro、ByteDance Trae 等）的频繁使用，本地磁盘常迅速堆积数 GB 的 Electron 缓存、GPU 暂存、IndexedDB、以及极度庞大的对话历史与 Agent 记忆。

**Sweep** 提供统一的跨平台核心引擎、CLI 终端工具与 VS Code / Cursor 扩展，帮助开发者精准管理 AI 存储空间，防止误删配置文件、沙盒运行环境与扩展插件。

---

## ✨ 核心特色

- 🎯 **精准分类（Cache vs Conversations）**：
  - 💾 **Cache（低风险）**：Electron 缓存、GPU 暂存、IndexedDB、知识图谱缓存，可随时安全释放。
  - 💬 **Conversations（高风险）**：Agent 记忆（Brain）、对话数据库（SQLite）、Session 记录，清理时具备强制安全防范与确认机制。
- 🛡️ **白名单保护机制（Never-Delete Guard）**：
  - 严格保护配置文件（`settings.json`、`config.toml`、`mcp_config.json`、`auth.json`、`CLAUDE.md` 等）。
  - 严格避开执行环境与插件目录（如 Codex 的 `.sandbox-bin` 沙箱二进制文件、Kiro 的 `~/.kiro/extensions` 插件库、Trae 的 `skills/`）。
- 🗄️ **自动备份防护**：破坏性清除对话记录前，默认自动归档至 `~/.sweep/backups/`，支持一键秒级还原。
- 🔍 **支持 Dry-Run 模拟**：在未实际改动磁盘前预览可释放空间与文件清单。
- 📋 **输出折叠与独立工具扫描**：支持 `--limit` 分页摘要、`--tool <id>` 独立工具扫描与多维度粒度过滤。
- 🌐 **跨平台支持**：完整支持 Windows、macOS（Apple Silicon & Intel）与 Linux。
- 📦 **Monorepo 架构**：核心引擎（`@l1r1h28/sweep-core`）、独立 CLI（`@l1r1h28/sweep-cli`）与 VS Code 扩展（`sweep-aicleaner`）。

---

## 🛠️ 支持的 AI 工具矩阵 (15 个产品线)

| 工具系列 | 产品线标识符 / 范围 | 磁盘占用重点 | 保护项目（绝对不删） |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | `antigravity` (全系列)<br>`antigravity-ide` (IDE)<br>`antigravity-desktop` (2.0)<br>`antigravity-cli` (`agy`) | `brain/`、`conversations/` (.pb/.db)、`WebStorage`、`logs/` | `bin/`、`config/`、`builtin/`、`mcp_config.json` |
| **OpenAI Codex** | `codex` (全系列)<br>`codex-cli` (CLI)<br>`codex-desktop` (Desktop App) | `sessions/` (JSONL)、`memories/`、`thread_history`、`Cache` | `.sandbox-bin/` (沙箱环境)、`auth.json`、`config.toml` |
| **Anthropic Claude** | `claude` (全系列)<br>`claude-code` (CLI)<br>`claude-desktop` (Desktop App) | `projects/` (Session JSONL)、`file-history/`、`Electron Cache` | `settings.json`、`CLAUDE.md`、`claude_desktop_config.json` |
| **Codeium Windsurf** | `windsurf` (IDE 与 Cascade) | `cascade/` (对话与记忆)、`CachedData`、`code_tracker/history` | `mcp_config.json`、`memories/*.pb`、`skills/`、`workflows/` |
| **AWS Kiro** | `kiro` (全系列)<br>`kiro-ide` (IDE)<br>`kiro-cli` (CLI) | `kiro.kiroagent` (.chat)、`sessions/`、`logs/` | `~/.kiro/extensions/` (插件)、`steering/`、`skills/`、`settings/` |
| **ByteDance Trae** | `trae` (全系列)<br>`trae-ide` (IDE)<br>`trae-cli` (SOLO CLI) | `ModularData` (`database.db` SQLite WAL 三合一)、`.ckg`、`memory/` | `~/.trae/rules/**`、`skills/**`、`settings/**`、`trae-jwt-token` |

> 详细目录结构与容量分析请参阅 [AI IDE 存储路径参考文档](docs/storage-paths.md)。

---

## 📥 下载与安装 (Download)

您可直接使用 **npx / npm** 运行、下载 **免安装独立可执行文件**（无需 Node.js 环境），或安装 **VS Code 扩展**：

### 方法 1：使用 npx / npm (推荐，免手动下载)

```bash
# 无需全局安装，直接运行扫描：
npx @l1r1h28/sweep-cli scan

# 或全局安装 CLI：
npm install -g @l1r1h28/sweep-cli
sweep scan
```

### 方法 2：直接下载预编译可执行文件与 VSIX (GitHub Releases)

您可直接前往 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下载预编译免安装可执行文件：

| 平台 / 编辑器 | 下载文件 | 安装与使用方式 |
| :--- | :--- | :--- |
| **Windows x64** | `sweep-windows-x64.exe` | 下载后直接在 PowerShell / CMD 中运行（如 `.\sweep-windows-x64.exe scan`） |
| **macOS (Apple Silicon)** | `sweep-darwin-arm64` | `chmod +x sweep-darwin-arm64 && ./sweep-darwin-arm64 scan` |
| **macOS (Intel)** | `sweep-darwin-x64` | `chmod +x sweep-darwin-x64 && ./sweep-darwin-x64 scan` |
| **Linux x64** | `sweep-linux-x64` | `chmod +x sweep-linux-x64 && ./sweep-linux-x64 scan` |
| **VS Code / Cursor / Windsurf** | `sweep-aicleaner-1.2.0.vsix` | 编辑器菜单 (*Extensions: Install from VSIX...*) 或 `code --install-extension sweep-aicleaner-1.2.0.vsix` |

---

## 🚀 快速上手

### 1. 使用 CLI 终端工具

![Sweep CLI Demo](assets/cli.png)

Sweep CLI 注册了 `sweep` 与 `aicleaner` 两个命令：

```bash
# 1. 存储空间扫描与分析
sweep scan                                     # 扫描所有支持的 AI 工具占用
sweep scan --verbose                           # 显示详细路径与文件数量
sweep scan --tool antigravity                  # 仅扫描单一工具系列
sweep scan --json                              # 输出标准 JSON 格式

# 2. 安全缓存清理 (低风险)
sweep clean --kind cache --dry-run             # 预览将被删除的缓存清单
sweep clean --kind cache --force               # 安全清理缓存
sweep clean --kind cache --tool windsurf --force # 仅清理特定工具缓存

# 3. 对话与会话记录清理 (高风险，默认自动备份)
sweep clean --kind conversations --dry-run     # 预览会话清理
sweep clean --kind conversations --older-than 30d --force # 清理超过 30 天的旧会话
sweep clean --kind conversations --min-size 50mb --force  # 清理超过 50MB 的超大会话
sweep clean --kind conversations --project my-project --force # 清理特定项目会话

# 4. 会话查看、分页折叠与导出
sweep sessions list                            # 查看会话清单（默认折叠显示 Top 20）
sweep sessions list --all                      # 展开显示所有会话（不折叠）
sweep sessions list --limit 50 --tool claude-code # 筛选特定工具并指定显示条数
sweep sessions export <sessionId> --format md --out ./exports # 导出对话为 Markdown 文档
sweep sessions clean --older-than 30d --force  # 清理筛选出的会话

# 5. 备份管理与一键还原
sweep backups list                             # 查看 ~/.sweep/backups/ 内所有历史备份
sweep backups prune --older-than 14d --keep-latest 5 --force # 修剪过期备份
sweep restore latest --force                   # 从最新备份一键快速还原
sweep restore 2026-08-31T06-00-00 --tool codex --force # 还原指定时间点与指定工具

# 6. 配置管理与白名单保护
sweep config list                              # 查看共用配置文件 (~/.sweep/config.json)
sweep config set hideUninstalledTools true     # 设置是否隐藏未安装工具
sweep whitelist list                           # 查看永久保护项目与路径清单
sweep whitelist add my-secret-project          # 添加项目至保护白名单
sweep whitelist remove my-secret-project       # 从白名单移除项目
```

#### CLI 命令与选项速查表

| 命令 / 参数 | 说明 |
| :--- | :--- |
| `scan` | 扫描并统计所有（或指定）AI 工具的磁盘占用 |
| `clean` | 执行清理操作（默认为 Dry-Run，需加 `--force` 进行实际删除） |
| `sessions [list\|clean\|export]` | 查看、筛选、清理与导出各个对话会话 |
| `backups [list\|prune]` | 查看与修剪本地备份归档文件 |
| `restore [<id>\|latest]` | 一键从备份还原先前删除的缓存或对话历史 |
| `config [list\|path\|get\|set]` | 查看与修改共用配置 |
| `whitelist [list\|add\|remove]` | 管理永久保护白名单（项目名称、路径规则、Session ID） |
| `tools` | 列出所有支持的 AI 工具与清理注意事项 |
| `targets` | 列出所有受纳管的目录路径、类别与风险等级 |
| `--kind <cache\|conversations\|all>` | 指定清理类型 |
| `--tool <id>` | 指定单一产品线（如 `antigravity-ide`、`claude-code`、`trae`） |
| `--limit <n>` / `-n <n>` | 限制会话列表显示前 N 条（防止终端刷屏） |
| `--all` / `-a` | 展开完整会话清单，关闭分页折叠 |
| `--older-than <dur>` | 筛选超过指定时间的条目（如 `7d`、`14d`、`30d`、`90d`） |
| `--newer-than <dur>` | 筛选短于指定时间的条目 |
| `--min-size <size>` | 筛选大于指定容量的条目（如 `50mb`、`100kb`、`1gb`） |
| `--max-size <size>` | 筛选小于指定容量的条目 |
| `--keep-latest <n>` | 修剪备份时保留最新的 N 份备份 |
| `--project <name>` | 按项目名称或工作区关键字筛选会话 |
| `--format <md\|json>` | 会话导出格式（Markdown 或 JSON） |
| `--out <dir>` | 导出文件存放目录 |
| `--dry-run` | 仅预览拟删除文件与容量，不实际变动磁盘 |
| `--force` | 确认执行实质删除或还原覆盖 |
| `--no-backup` | 删除前跳过自动备份创建 |
| `--json` | 输出标准 JSON 结构化数据 |

---

### 2. 使用 VS Code / Cursor 扩展

在 VS Code、Cursor、Windsurf 或 Trae IDE 中安装 `sweep-aicleaner`：

1. 点击 Activity Bar 上的 **Sweep 扫帚图标** 打开专属面板。
2. 点击顶部的 **扫描存储空间** (`$(refresh)`) 获取本机所有 AI 工具占用。
3. 点击 **切换隐藏/显示未安装工具** (`$(eye)`)，专注管理本机已安装工具。
4. 使用 **新增自定义扫描路径** (`$(folder-library)`) 纳管非标准安装路径。
5. 点击特定工具或会话右侧按钮进行清理、导出或加入白名单保护 (`$(shield)`)。
6. 通过 **备份管理** 动作直接进行一键还原或过期备份清理。

![VS Code Extension Overview](assets/fullscreen.png)

*清理确认与 Dry-run 模拟提示弹窗：*

![Clean Cache Confirmation Dialog](assets/notify.png)

---

## 📂 项目架构 (Monorepo)

通过 npm workspaces 进行多包管理：

```text
Sweep-agentcli-ide-cleaner/
├── packages/
│   ├── core/               # 共享核心库 (@l1r1h28/sweep-core) - Catalog, Scanner, Cleaner, Adapters
│   ├── cli/                # 跨平台 CLI (@l1r1h28/sweep-cli) - 运行命令: sweep & aicleaner
│   └── vscode-extension/   # VS Code 扩展 (sweep-aicleaner) - Activity Bar UI & Commands
├── docs/
│   ├── ROADMAP.md          # 项目进度与里程碑追踪
│   └── storage-paths.md    # 各 AI 工具存储路径解析与防护架构
├── scripts/                # CI 监控、版本升级与发布自动化脚本
├── .github/workflows/      # CI 跨平台测试与自动发布工作流
├── package.json            # Monorepo 根目录配置
└── LICENSE                 # MIT License
```

---

## 💻 本地开发与构建

### 环境需求

* **Node.js**: `>= 18.0.0` (建议 Node 24 用于 SEA 单一可执行文件打包)
* **npm**: `>= 8.0.0`

### 构建与测试

```bash
# 1. 安装所有 workspace 依赖
npm install

# 2. 构建所有子包 (Core + CLI + Extension)
npm run build

# 3. 运行全套单元与集成测试 (Vitest)
npm test
```

### 打包

```bash
# 打包 CLI npm distribution
npm run pack --workspace=@l1r1h28/sweep-cli

# 打包 VS Code 扩展 (.vsix)
npm run pack --workspace=sweep-aicleaner
```

---

## ⚠️ 安全防护与重要提醒

* **对话记录删除为不可逆操作**：AI Agent 记忆、Transcripts 与 SQLite 数据库一旦删除，将无法在 IDE 内恢复上下文（除非从 `~/.sweep/backups/` 进行备份还原）。
* **共用目录特性提醒**：OpenAI Codex CLI 与 Desktop App 共用 `~/.codex/sessions`，删除将同时影响终端与图形客户端。
* **清理前请先关闭 IDE**：针对使用 SQLite WAL 模式的工具（如 Trae 的 `database.db`、`database.db-wal`、`database.db-shm`），建议清理前先完整关闭 IDE 以释放文件锁。

---

## 📄 授权与致谢

- 本项目采用 [MIT License](LICENSE) 开源协议。
- Publisher: [L1r1h28](https://github.com/L1r1h28)
- 图标设计基于 [Lucide](https://lucide.dev)，采用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。