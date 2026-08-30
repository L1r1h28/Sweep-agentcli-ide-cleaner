# Sweep — AI 工具清理專家 (VS Code 擴充套件) 🧹

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> 專為 Visual Studio Code 與 Cursor 設計的儲存空間檢視與清理擴充套件，輕鬆管理主流 AI 輔助編程工具的快取與對話紀錄。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` 將 Sweep 的強大清理能力直接帶入您的 IDE。無需離開編輯器，即可快速發現背景中被 AI 快取、IndexedDB 資料庫與 Agent 工作階段佔用的數 GB 儲存空間。

---

## 🌟 核心特色

- 📊 **活動列整合（Activity Bar）**：在活動列提供專屬 **Sweep** 圖示，一鍵檢視儲存空間佔用狀態。
- ⚡ **安全清理快取**：一鍵安全清理 Electron 快取、GPU 快取與知識庫索引，完整保留對話紀錄。
- 💬 **對話紀錄與 Agent 記憶管理**：精細化管理對話歷史紀錄，具備高風險確認防護機制。
- 🛡️ **模擬預檢（Dry-Run）與自動備份**：預先估算可釋放空間，並支援在清理對話前自動備份至 `~/.sweep/backups/`。
- 🤖 **廣泛支援主流工具**：支援 Antigravity、OpenAI Codex、Claude Code、Windsurf、Kiro 與 Trae IDE。

![Sweep 擴充套件面板總覽](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/fullscreen.png)

*安全操作確認與模擬預檢視窗：*

![快取清理確認彈窗](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/notify.png)

---

## 🛠️ 提供的指令

| 指令 | 標題 | 說明 |
| :--- | :--- | :--- |
| `sweep.scan` | **Sweep: 掃描儲存空間** | 掃描並計算各 AI 工具的磁碟佔用狀況。 |
| `sweep.cleanCache` | **Sweep: 清理所有快取 (安全)** | 安全清除 Electron、GPU 與 IndexedDB 等快取檔案。 |
| `sweep.cleanConversations` | **Sweep: 清理所有對話紀錄 (破壞性)** | 清理對話日誌與 Agent 會話資料庫（具備確認視窗）。 |
| `sweep.cleanCacheForTool` | **Sweep: 清理此工具的快取** | 清理所選 AI 工具的快取檔案。 |
| `sweep.cleanConversationsForTool` | **Sweep: 清理此工具的對話紀錄** | 清理所選 AI 工具的對話紀錄。 |
| `sweep.dryRun` | **Sweep: 模擬預檢全部 (Dry-run)** | 執行非破壞性模擬以估算可回收空間。 |

---

## 📦 安裝方式
 
### 方式 1：直接下載安裝 (.vsix)

從 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下載最新版 `sweep-aicleaner-x.x.x.vsix`，並透過指令列或 IDE 介面安裝：

```bash
# 在 VS Code 中安裝:
code --install-extension sweep-aicleaner-1.1.0.vsix

# 在 Cursor 中安裝:
cursor --install-extension sweep-aicleaner-1.1.0.vsix
```

或開啟編輯器，切換至 **Extensions** 擴充套件面板 (`Ctrl+Shift+X` / `Cmd+Shift+X`)，點擊右上角 `...` 選單並選擇 **Install from VSIX...**。

---

### 方式 2：從原始碼建置與打包 (.vsix)

```bash
# 1. 在專案根目錄安裝依賴
npm install

# 2. 建置與打包擴充套件
cd packages/vscode-extension
npm run build
npm run pack
```

---

## 🏗️ 架構設計

本擴充套件使用 `esbuild` 打包為單一獨立 CommonJS 檔案（`dist/extension.js`），引入 `@aicleaner/core` 並保持 Node.js 原生模組外部化，以確保在各版本 VS Code 中的最佳相容性與執行效能。

---

## 📄 授權條款

- MIT © [L1r1h28](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
- 圖示設計參考 [Lucide](https://lucide.dev)，採用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
