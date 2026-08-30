# Sweep (AI 程式碼輔助工具清理器) 🧹

> 一鍵掃描、精準分離、安全清理各大 AI 程式碼輔助工具與 AI IDE 的暫存快取及對話歷史紀錄。

<p align="left">
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <strong>繁體中文</strong>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@l1r1h28/sweep-cli.svg)](https://www.npmjs.com/package/@l1r1h28/sweep-cli)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

隨著 AI 輔助開發工具（如 Antigravity、Codex、Claude Code、Windsurf、AWS Kiro、ByteDance Trae 等）的頻繁使用，本地磁碟常迅速累積數 GB 的 Electron 快取、GPU 暫存、IndexedDB、以及極度龐大的對話歷史與 Agent 記憶。

**Sweep** 提供統一的跨平台核心引擎、CLI 終端工具與 VS Code / Cursor 擴充套件，幫助開發者精準管理 AI 存儲空間，防止誤刪設定檔、沙盒運行環境與擴充插件。

---

## ✨ 核心特色

- 🎯 **精準分類（Cache vs Conversations）**：
  - 💾 **Cache（低風險）**：Electron 快取、GPU 暫存、IndexedDB、知識圖譜快取，可隨時安全釋放。
  - 💬 **Conversations（高風險）**：Agent 記憶（Brain）、對話資料庫（SQLite）、Session 紀錄，清理時具備強制安全防護與確認。
- 🛡️ **白名單保護機制（Never-Delete Guard）**：
  - 嚴格保護設定檔（`settings.json`、`config.toml`、`mcp_config.json`、`auth.json`、`CLAUDE.md` 等）。
  - 嚴格避開執行環境與擴充套件目錄（如 Codex 的 `.sandbox-bin` 沙箱二進位檔、Kiro 的 `~/.kiro/extensions` 插件庫、Trae 的 `skills/`）。
- 🗄️ **自動備份防護**：破壞性清除對話紀錄前，預設自動封存至 `~/.sweep/backups/`，支援一鍵秒級還原。
- 🔍 **支援 Dry-Run 模擬**：在未實際異動磁碟前預覽可釋放空間與檔案清單。
- 📋 **輸出摺疊與獨立工具掃描**：支援 `--limit` 分頁摘要、`--tool <id>` 獨立工具掃描與多維度粒度過濾。
- 🌐 **跨平台支援**：完整支援 Windows、macOS（Apple Silicon & Intel）與 Linux。
- 📦 **Monorepo 架構**：核心引擎（`@l1r1h28/sweep-core`）、獨立 CLI（`@l1r1h28/sweep-cli`）與 VS Code 擴充套件（`sweep-aicleaner`）。

---

## 🛠️ 支援的 AI 工具矩陣 (15 個產品線)

| 工具系列 | 產品線識別碼 / 範圍 | 磁碟佔用重點 | 保護項目（絕對不刪） |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | `antigravity` (全系列)<br>`antigravity-ide` (IDE)<br>`antigravity-desktop` (2.0)<br>`antigravity-cli` (`agy`) | `brain/`、`conversations/` (.pb/.db)、`WebStorage`、`logs/` | `bin/`、`config/`、`builtin/`、`mcp_config.json` |
| **OpenAI Codex** | `codex` (全系列)<br>`codex-cli` (CLI)<br>`codex-desktop` (Desktop App) | `sessions/` (JSONL)、`memories/`、`thread_history`、`Cache` | `.sandbox-bin/` (沙盒環境)、`auth.json`、`config.toml` |
| **Anthropic Claude** | `claude` (全系列)<br>`claude-code` (CLI)<br>`claude-desktop` (Desktop App) | `projects/` (Session JSONL)、`file-history/`、`Electron Cache` | `settings.json`、`CLAUDE.md`、`claude_desktop_config.json` |
| **Codeium Windsurf** | `windsurf` (IDE 與 Cascade) | `cascade/` (對話與記憶)、`CachedData`、`code_tracker/history` | `mcp_config.json`、`memories/*.pb`、`skills/`、`workflows/` |
| **AWS Kiro** | `kiro` (全系列)<br>`kiro-ide` (IDE)<br>`kiro-cli` (CLI) | `kiro.kiroagent` (.chat)、`sessions/`、`logs/` | `~/.kiro/extensions/` (插件)、`steering/`、`skills/`、`settings/` |
| **ByteDance Trae** | `trae` (全系列)<br>`trae-ide` (IDE)<br>`trae-cli` (SOLO CLI) | `ModularData` (`database.db` SQLite WAL 三合一)、`.ckg`、`memory/` | `~/.trae/rules/**`、`skills/**`、`settings/**`、`trae-jwt-token` |

> 詳細目錄結構與容量分析請參閱 [AI IDE 儲存路徑參考文件](docs/storage-paths.md)。

---

## 📥 下載與安裝 (Download)

您可直接使用 **npx / npm** 執行、下載 **免安裝獨立執行檔**（無需 Node.js 環境），或安裝 **VS Code 擴充套件**：

### 方法 1：使用 npx / npm (推薦，免手動下載)

```bash
# 無需全域安裝，直接執行掃描：
npx @l1r1h28/sweep-cli scan

# 或全域安裝 CLI：
npm install -g @l1r1h28/sweep-cli
sweep scan
```

### 方法 2：直接下載預編譯執行檔與 VSIX (GitHub Releases)

您可直接至 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下載預先編譯好的免安裝執行檔：

| 平台 / 編輯器 | 下載檔案 | 安裝與使用方式 |
| :--- | :--- | :--- |
| **Windows x64** | `sweep-windows-x64.exe` | 下載後直接在 PowerShell / CMD 中執行（如 `.\sweep-windows-x64.exe scan`） |
| **macOS (Apple Silicon)** | `sweep-darwin-arm64` | `chmod +x sweep-darwin-arm64 && ./sweep-darwin-arm64 scan` |
| **macOS (Intel)** | `sweep-darwin-x64` | `chmod +x sweep-darwin-x64 && ./sweep-darwin-x64 scan` |
| **Linux x64** | `sweep-linux-x64` | `chmod +x sweep-linux-x64 && ./sweep-linux-x64 scan` |
| **VS Code / Cursor / Windsurf** | `sweep-aicleaner-1.2.0.vsix` | 編輯器選單 (*Extensions: Install from VSIX...*) 或 `code --install-extension sweep-aicleaner-1.2.0.vsix` |

---

## 🚀 快速上手

### 1. 使用 CLI 終端工具

![Sweep CLI Demo](assets/cli.png)

Sweep CLI 註冊了 `sweep` 與 `aicleaner` 兩個指令：

```bash
# 1. 存儲空間掃描與分析
sweep scan                                     # 掃描所有支援的 AI 工具佔用
sweep scan --verbose                           # 顯示詳細路徑與檔案數量
sweep scan --tool antigravity                  # 僅掃描單一工具系列
sweep scan --json                              # 輸出標準 JSON 格式

# 2. 安全快取清理 (低風險)
sweep clean --kind cache --dry-run             # 預覽將被刪除的快取清單
sweep clean --kind cache --force               # 安全清理快取
sweep clean --kind cache --tool windsurf --force # 僅清理特定工具快取

# 3. 對話與會話紀錄清理 (高風險，預設自動備份)
sweep clean --kind conversations --dry-run     # 預覽會話清理
sweep clean --kind conversations --older-than 30d --force # 清理超過 30 天的舊會話
sweep clean --kind conversations --min-size 50mb --force  # 清理超過 50MB 的超大會話
sweep clean --kind conversations --project my-project --force # 清理特定專案會話

# 4. 會話檢視、分頁摺疊與匯出
sweep sessions list                            # 檢視會話清單（預設摺疊顯示 Top 20）
sweep sessions list --all                      # 展開顯示所有會話（不摺疊）
sweep sessions list --limit 50 --tool claude-code # 篩選特定工具並指定顯示筆數
sweep sessions export <sessionId> --format md --out ./exports # 匯出對話為 Markdown 文件
sweep sessions clean --older-than 30d --force  # 清理篩選出的會話

# 5. 備份管理與一鍵還原
sweep backups list                             # 檢視 ~/.sweep/backups/ 內所有歷史備份
sweep backups prune --older-than 14d --keep-latest 5 --force # 修剪過期備份
sweep restore latest --force                   # 從最新備份一鍵快速還原
sweep restore 2026-08-31T06-00-00 --tool codex --force # 還原指定時間點與指定工具

# 6. 設定管理與白名單保護
sweep config list                              # 檢視共用設定檔 (~/.sweep/config.json)
sweep config set hideUninstalledTools true     # 設定是否隱藏未安裝工具
sweep whitelist list                           # 檢視永久保護專案與路徑清單
sweep whitelist add my-secret-project          # 新增專案至保護白名單
sweep whitelist remove my-secret-project       # 自白名單移除專案
```

#### CLI 指令與選項速查表

| 指令 / 參數 | 說明 |
| :--- | :--- |
| `scan` | 掃描並統計所有（或指定）AI 工具的磁碟佔用 |
| `clean` | 執行清理作業（預設為 Dry-Run，需加 `--force` 進行實際刪除） |
| `sessions [list\|clean\|export]` | 檢視、篩選、清理與匯出各別對話會話 |
| `backups [list\|prune]` | 檢視與修剪本地備份封存檔 |
| `restore [<id>\|latest]` | 一鍵自備份還原先前刪除的快取或對話歷史 |
| `config [list\|path\|get\|set]` | 檢視與修改共用設定 |
| `whitelist [list\|add\|remove]` | 管理永久保護白名單（專案名稱、路徑規則、Session ID） |
| `tools` | 列出所有支援的 AI 工具與清理注意事項 |
| `targets` | 列出所有受納管的目錄路徑、類別與風險等級 |
| `--kind <cache\|conversations\|all>` | 指定清理類型 |
| `--tool <id>` | 指定單一產品線（如 `antigravity-ide`、`claude-code`、`trae`） |
| `--limit <n>` / `-n <n>` | 限制會話列表顯示前 N 筆（防止終端洗版） |
| `--all` / `-a` | 展開完整會話清單，關閉分頁摺疊 |
| `--older-than <dur>` | 篩選超過指定時間的項目（如 `7d`、`14d`、`30d`、`90d`） |
| `--newer-than <dur>` | 篩選短於指定時間的項目 |
| `--min-size <size>` | 篩選大於指定容量的項目（如 `50mb`、`100kb`、`1gb`） |
| `--max-size <size>` | 篩選小於指定容量的項目 |
| `--keep-latest <n>` | 修剪備份時保留最新的 N 份備份 |
| `--project <name>` | 依專案名稱或工作區關鍵字篩選會話 |
| `--format <md\|json>` | 會話匯出格式（Markdown 或 JSON） |
| `--out <dir>` | 匯出檔案存放目錄 |
| `--dry-run` | 僅預覽擬刪除檔案與容量，不實際異動磁碟 |
| `--force` | 確認執行實質刪除或還原覆寫 |
| `--no-backup` | 刪除前跳過自動備份建立 |
| `--json` | 輸出標準 JSON 結構化資料 |

---

### 2. 使用 VS Code / Cursor 擴充套件

在 VS Code、Cursor、Windsurf 或 Trae IDE 中安裝 `sweep-aicleaner`：

1. 點擊 Activity Bar 上的 **Sweep 掃帚圖示** 開啟專屬面板。
2. 點擊頂部的 **掃描存儲空間** (`$(refresh)`) 獲取本機所有 AI 工具佔用。
3. 點擊 **切換隱藏/顯示未安裝工具** (`$(eye)`)，專注管理本機已安裝工具。
4. 使用 **新增自訂掃描路徑** (`$(folder-library)`) 納管非標準安裝路徑。
5. 點擊特定工具或會話右側按鈕進行清理、匯出或加入白名單保護 (`$(shield)`)。
6. 透過 **備份管理** 動作直接進行一鍵還原或過期備份清理。

![VS Code Extension Overview](assets/fullscreen.png)

*清理確認與 Dry-run 模擬提示視窗：*

![Clean Cache Confirmation Dialog](assets/notify.png)

---

## 📂 專案架構 (Monorepo)

透過 npm workspaces 進行多套件管理：

```text
Sweep-agentcli-ide-cleaner/
├── packages/
│   ├── core/               # 共享核心庫 (@l1r1h28/sweep-core) - Catalog, Scanner, Cleaner, Adapters
│   ├── cli/                # 跨平台 CLI (@l1r1h28/sweep-cli) - 執行指令: sweep & aicleaner
│   └── vscode-extension/   # VS Code 擴充套件 (sweep-aicleaner) - Activity Bar UI & Commands
├── docs/
│   ├── ROADMAP.md          # 專案進度與里程碑追蹤
│   └── storage-paths.md    # 各 AI 工具儲存路徑解析與防護架構
├── scripts/                # CI 監控、版本升級與發布自動化腳本
├── .github/workflows/      # CI 跨平台測試與自動發布工作流
├── package.json            # Monorepo 根目錄設定
└── LICENSE                 # MIT License
```

---

## 💻 本地開發與建置

### 環境需求

* **Node.js**: `>= 18.0.0` (建議 Node 24 用於 SEA 單一執行檔打包)
* **npm**: `>= 8.0.0`

### 建置與測試

```bash
# 1. 安裝所有 workspace 依賴
npm install

# 2. 建置所有套件 (Core + CLI + Extension)
npm run build

# 3. 執行全套單元與整合測試 (Vitest)
npm test
```

### 封裝與打包

```bash
# 打包 CLI npm distribution
npm run pack --workspace=@l1r1h28/sweep-cli

# 打包 VS Code 擴充套件 (.vsix)
npm run pack --workspace=sweep-aicleaner
```

---

## ⚠️ 安全防護與重要提醒

* **對話紀錄刪除為不可逆操作**：AI Agent 記憶、Transcripts 與 SQLite 資料庫一旦刪除，將無法在 IDE 內恢復上下文（除非從 `~/.sweep/backups/` 進行備份還原）。
* **共用目錄特性提醒**：OpenAI Codex CLI 與 Desktop App 共用 `~/.codex/sessions`，刪除將同時影響終端與圖形客戶端。
* **清理前請先關閉 IDE**：針對使用 SQLite WAL 模式的工具（如 Trae 的 `database.db`、`database.db-wal`、`database.db-shm`），建議清理前先完整關閉 IDE 以釋放檔案鎖。

---

## 📄 授權與致謝

- 本專案採用 [MIT License](LICENSE) 開源授權。
- Publisher: [L1r1h28](https://github.com/L1r1h28)
- 圖示設計基於 [Lucide](https://lucide.dev)，採用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
