# Sweep (AI 编程工具清理管家) 🧹

> 一键扫描、精准分离、安全清理主流 AI 编程助手与 AI IDE 的临时缓存及对话历史记录。

<p align="left">
  <a href="README.md">English</a> |
  <strong>简体中文</strong> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

随着 AI 辅助开发工具（如 Antigravity、Codex、Claude Code、Windsurf 等）的高频使用，本地磁盘往往迅速积累数 GB 的 Electron 缓存、GPU 暂存、IndexedDB，以及庞大的对话历史与 Agent 记忆库。

**Sweep** 提供统一的跨平台核心引擎、CLI 终端工具与 VS Code / Cursor 插件，帮助开发者精准管理 AI 存储占用，防止误删沙盒运行环境与扩展插件。

---

## ✨ 核心特性

- 🎯 **精准分类（Cache vs Conversations）**：
  - 💾 **Cache（低风险）**：Electron 缓存、GPU 暂存、IndexedDB、知识图谱缓存，可随时安全释放。
  - 💬 **Conversations（高风险）**：Agent 记忆库（Brain）、对话数据库（SQLite）、Session 会话记录，清理时具备强制安全保护。
- 🛡️ **白名单保护机制（Never-Delete Guard）**：
  - 严格保护配置文件（`settings.json`、`config.toml`、`mcp_config.json`、`auth.json` 等）。
  - 严格避开运行环境与插件目录（如 Codex 的 `.sandbox-bin` 沙箱二进制文件、Kiro 的 `~/.kiro/extensions` 插件库）。
- 🗄️ **自动备份防护**：破坏性清除对话记录前，默认自动归档至 `~/.sweep/backups/`。
- 🔍 **支持 Dry-Run 模拟**：在未实际改动磁盘前，预览可释放空间与文件清单。
- 🌐 **跨平台支持**：完整支持 Windows、macOS 与 Linux。
- 📦 **Monorepo 多包架构**：提供核心共享模块、独立 CLI 可执行文件与 VS Code 插件。

---

## 🛠️ 支持的 AI 工具矩阵

| 工具 | 涵盖产品 | 磁盘占用重点 | 保护项目（绝对不删） |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | IDE, Desktop 2.0, CLI (`agy`) | `brain/`、`conversations/` (.pb/.db)、`WebStorage` | `bin/`、`config/`、`builtin/` |
| **OpenAI Codex** | CLI, Desktop App | `sessions/` (JSONL)、`memories/`、`thread_history` | `.sandbox-bin/` (沙箱环境)、`auth.json` |
| **Anthropic Claude Code** | CLI, VS Code/JetBrains, Desktop | `projects/` (Session JSONL)、`file-history/` | `settings.json`、`CLAUDE.md` |
| **Codeium Windsurf** | IDE, Cascade | `cascade/` (对话与记忆)、`CachedData` | `mcp_config.json` |
| **AWS Kiro** | IDE, CLI | `kiro.kiroagent` (.chat)、`sessions/` | `~/.kiro/extensions/` (插件)、`steering/` |
| **ByteDance Trae** | IDE, SOLO | `database.db` (SQLite WAL 组)、`CachedData` | 项目内 `.trae/` 配置 |

> 详细目录结构与容量分析请参阅 [AI IDE 存储路径参考文档](docs/storage-paths.md)。

---

## 📥 下载与安装 (Download)

您可以直接前往 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下载预构建的独立可执行文件（无需 Node.js 环境）或 VS Code 插件包（`.vsix`）：

### 方式 1：直接下载预编译二进制与 VSIX (推荐)

| 平台 / 编辑器 | 下载文件 | 安装与使用方式 |
| :--- | :--- | :--- |
| **Windows x64** | `sweep-windows-x64.exe` | 下载后直接在 PowerShell / CMD 中运行（例如 `.\sweep-windows-x64.exe scan`） |
| **macOS (Apple Silicon)** | `sweep-darwin-arm64` | `chmod +x sweep-darwin-arm64 && ./sweep-darwin-arm64 scan` |
| **macOS (Intel)** | `sweep-darwin-x64` | `chmod +x sweep-darwin-x64 && ./sweep-darwin-x64 scan` |
| **Linux x64** | `sweep-linux-x64` | `chmod +x sweep-linux-x64 && ./sweep-linux-x64 scan` |
| **VS Code / Cursor / Trae** | `sweep-aicleaner-1.0.0.vsix` | 在编辑器扩展菜单选择“从 VSIX 安装...”或运行 `code --install-extension <文件名>.vsix` |

### 方式 2：使用 Node.js / npm

```bash
# 从源码直接运行
node packages/cli/src/cli.mjs scan

# 或打包并全局安装
cd packages/cli && npm pack
npm install -g aicleaner-cli-1.0.0.tgz
```

---

## 🚀 快速上手

### 1. 使用 CLI 终端工具

![Sweep CLI 终端操作展示](assets/cli.png)

Sweep CLI 同时注册了 `sweep` 与 `aicleaner` 命令：

```bash
# 扫描全部 AI 工具的磁盘占用情况
sweep scan

# 详细显示每个目标路径与文件数
sweep scan --verbose

# 仅扫描指定工具（可输出 JSON）
sweep scan --tool antigravity --json

# 模拟清理（Dry-run 预览，不删除任何文件）
sweep clean --kind cache --dry-run
sweep clean --kind conversations --dry-run

# 一键安全清理所有工具缓存
sweep clean --kind cache --force

# 细致化对话清理：清理 30 天前的旧对话（保留近期活跃 Session）
sweep clean --kind conversations --older-than 30d --force

# 细致化对话清理：清理膨胀的大型 Session (>50MB)
sweep clean --kind conversations --min-size 50mb --force

# 查看个别 Session 列表（显示所属工具、项目、创建天数与大小）
sweep sessions list
sweep sessions list --older-than 30d --min-size 10mb --project my-project

# 对话归档与导出：将指定 Session 导出为易读的 Markdown 或结构化 JSON
sweep sessions export <sessionId> --format md --out ./exports

# 删除特定筛选条件之对话 Session（默认自动创建备份）
sweep sessions clean --older-than 30d --force

# 查看所有本地备份存档
sweep backups list

# 清理 14 天前的过期备份以节省空间
sweep backups prune --older-than 14d --force

# 从最新备份一键还原
sweep restore latest --force

# 从指定备份时间戳还原指定工具 (例如仅还原 Claude Code)
sweep restore 2026-08-30T10-00-00 --tool claude-code --force
```

#### CLI 命令参数表

| 命令 / 参数 | 说明 |
| --- | --- |
| `scan` | 扫描并统计全体存储占用（缓存与对话历史） |
| `clean` | 执行清理流程（需指定 `--kind` 或细部过滤参数） |
| `sessions [list\|clean\|export]` | 细致化对话 Session 查看、筛选、清理与导出归档 |
| `backups [list\|prune]` | 查看本地备份存档与过期清理 |
| `restore [<id>\|latest]` | 从备份文件一键还原对话历史或缓存 |
| `tools` | 列出支持的 AI 工具、简介与清理注意事项 |
| `targets` | 列出所有受纳管的目录路径与风险等级 |
| `--kind <k>` | 目标类别：`cache` (缓存)、`conversations` (对话历史)、`all` (全部) |
| `--tool <id>` | 限定单一工具：`antigravity`、`codex`、`claude-code`、`windsurf`、`kiro`、`trae` |
| `--older-than <dur>` | 筛选超过指定时间之 Session 或过期备份（例如 `7d`, `14d`, `30d`, `90d`） |
| `--newer-than <dur>` | 筛选小于指定时间之 Session |
| `--min-size <size>` | 筛选大于指定容量之 Session（例如 `50mb`, `100kb`, `1gb`） |
| `--max-size <size>` | 筛选小于指定容量之 Session |
| `--keep-latest <n>` | 保留最新 N 个备份，其余清理 |
| `--project <name>` | 依项目或工作区关键字筛选 Session |
| `--format <md\|json>` | 指定 Session 导出格式（Markdown 或 JSON） |
| `--out <dir>` | 指定 Session 导出保存目标目录 |
| `--dry-run` | 仅列出待清理或还原文件清单与容量，不实际写入 |
| `--force` | 确认执行删除或还原覆盖（防止误触之安全防护） |
| `--no-backup` | 删除对话时跳过自动归档备份 |
| `--json` | 以标准 JSON 格式输出（适用于 `scan` 与 `sessions list`） |

---

### 2. VS Code 插件

在 VS Code 或兼容 IDE（如 Cursor / Trae / Windsurf）中安装 `sweep-aicleaner`：

1. 点击侧边栏 **Sweep** 图标打开面板。
2. 点击顶部 **Scan storage** 扫描本地存储占用。
3. 可针对单独工具执行 **Clean cache** 或 **Clean conversations**。
4. 支持快速查看并打开自动备份目录。

![VS Code 插件面板总览](assets/fullscreen.png)

*安全操作确认与模拟预检弹窗：*

![缓存清理确认弹窗](assets/notify.png)

---

## 📂 项目架构 (Monorepo)

本项目采用 npm workspaces 进行多包管理：

```text
Sweep-agentcli-ide-cleaner/
├── packages/
│   ├── core/               # 共享核心模块 (Catalog、Path Resolver、Scanner、Cleaner)
│   ├── cli/                # 跨平台 CLI 工具 (npm bin: sweep / aicleaner)
│   └── vscode-extension/   # VS Code 插件 (Activity Bar UI & Commands)
├── docs/
│   └── storage-paths.md    # 完整磁盘目录扫描与路径分析文档
├── .github/workflows/      # CI 测试与 GitHub Releases 自动打包工作流
├── package.json            # Monorepo 根目录配置
└── LICENSE                 # MIT 许可证

```

---

## 💻 本地开发与构建

### 环境需求

* **Node.js**: `>= 18.0.0`
* **npm**: `>= 8.0.0`
* *(可选)* **Bun**: 用于编译独立单文件可执行程序 (Standalone Binaries)

### 安装依赖与构建

```bash
# 安装所有 Workspace 依赖
npm install

# 执行全项目构建 (Core + CLI + Extension)
npm run build

# 执行单元测试 (Vitest)
npm run test

```

### 打包与发布

```bash
# 打包 CLI 包
cd packages/cli && npm pack

# 打包 VS Code 插件 (.vsix)
cd packages/vscode-extension
npx @vscode/vsce package --no-dependencies --allow-missing-repository

```

---

## ⚠️ 安全性与免责声明

* **对话删除不可逆**：AI Agent 的 Memory、Transcripts 与 SQLite 对话库一旦删除，将无法在 IDE 内还原会话上下文（除非从 `~/.sweep/backups/` 手动还原）。
* **共享目录警告**：OpenAI Codex CLI 与 Desktop App 共享 `~/.codex/sessions`，删除对话将同时影响终端与桌面客户端。
* **关闭 IDE 后清理**：清理 Trae 等使用 SQLite WAL 模式（`database.db`, `database.db-wal`, `database.db-shm`）的工具时，建议先完全关闭 IDE。

---

## 📄 许可证与致谢

- 本项目基于 [MIT License](LICENSE) 协议开源发布。
- 图标基于 [Lucide](https://lucide.dev)（[ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)）。