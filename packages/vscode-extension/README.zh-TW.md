# Sweep — AI 工具清理器 (VS Code 擴充套件) 🧹

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> 專為 Visual Studio Code 與 Cursor / Trae / Windsurf 設計的 AI 輔助工具快取分析與安全清理擴充套件。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` 將 Sweep 的強大功能直接帶入您的 IDE 開發環境。無需離開編輯器，即可快速診斷背景 AI 快取、IndexedDB 與 Agent 對話歷史資料庫所佔用的數 GB 空間。

---

## 🌟 核心特色

- 📊 **Activity Bar 整合**：側邊欄常駐 **Sweep 掃帚圖示**，隨時掌握儲存佔用狀態。
- ⚡ **安全快取釋放**：一鍵清除 Electron 快取、GPU 暫存與知識圖譜索引，絕不遺失對話上下文。
- 💬 **會話與 Agent 狀態管理**：提供細粒度會話管理、高風險防誤刪彈窗與自動備份機制。
- 👁️ **未安裝工具切換開關**：一鍵切換隱藏未安裝或 0-byte 的 AI 工具 (`$(eye)`)。
- 📁 **GUI 自訂路徑選擇器**：透過原生資料夾挑選器互動式設定自訂儲存目錄 (`$(folder-library)`)。
- 🛡️ **白名單安全保護**：在 Tree View 中直觀標示盾牌圖示 (`$(shield)`)，永久保護重要專案與路徑。
- 📦 **備份與一鍵還原**：清理前自動封存至 `~/.sweep/backups/`，隨時秒級快速還原。
- 🤖 **完整 15 個產品線支援**：支援 Antigravity 全家族、OpenAI Codex、Claude Code/Desktop、Windsurf & Cascade、AWS Kiro 與 ByteDance Trae。

![Sweep Extension Overview](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/fullscreen.png)

*清理確認與 Dry-run 模擬提示視窗：*

![Clean Cache Confirmation Dialog](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/notify.png)

---

## 🛠️ 擴充套件指令清單

| 指令 ID | 指令名稱 | 分類 | 說明 |
| :--- | :--- | :--- | :--- |
| `sweep.scan` | **Sweep: 掃描儲存空間** | 掃描 | 掃描並計算本機所有 AI 工具佔用容量。 |
| `sweep.dryRun` | **Sweep: 模擬預覽全部 (Dry-run)** | 檢視 | 執行非破壞性模擬，預估可釋放空間。 |
| `sweep.cleanCache` | **Sweep: 清理所有快取 (安全)** | 清理 | 安全清理 Electron、GPU 與 IndexedDB 快取。 |
| `sweep.cleanConversations` | **Sweep: 清理所有對話紀錄 (破壞性)** | 清理 | 清理對話歷史與會話資料庫（跳出確認視窗並備份）。 |
| `sweep.cleanCacheForTool` | **Sweep: 清理此工具快取** | 清理 | 僅清理選定 AI 工具的暫存快取。 |
| `sweep.cleanConversationsForTool` | **Sweep: 清理此工具對話紀錄** | 清理 | 僅清理選定 AI 工具的對話歷史。 |
| `sweep.cleanSessionsOlderThan` | **Sweep: 清理超過指定天數的對話...** | 篩選清理 | 清理超過指定時間（如 30d、2w）的歷史對話。 |
| `sweep.cleanLargeSessions` | **Sweep: 清理超大對話紀錄 (>50MB)...** | 篩選清理 | 清理容量超過指定門檻的龐大會話。 |
| `sweep.pickSessionsToClean` | **Sweep: 挑選欲刪除的對話紀錄...** | 互動式 | 透過 QuickPick 多選特定會話進行批次清理。 |
| `sweep.cleanSingleSession` | **Sweep: 刪除此對話紀錄** | 項目動作 | 從樹狀檢視中單獨刪除選定的會話紀錄。 |
| `sweep.exportSession` | **Sweep: 匯出對話紀錄 (Markdown / JSON)** | 匯出 | 將聊天歷史匯出為易讀的 Markdown 或 JSON 結構檔。 |
| `sweep.listBackups` | **Sweep: 檢視備份歷史** | 備份 | 檢視 `~/.sweep/backups/` 內的本地備份封存檔。 |
| `sweep.restoreBackup` | **Sweep: 從備份還原...** | 還原 | 從先前的備份快照還原對話或快取。 |
| `sweep.openBackupFolder` | **Sweep: 開啟備份資料夾** | 備份 | 在系統檔案總管中開啟 `~/.sweep/backups/`。 |
| `sweep.pruneBackups` | **Sweep: 修剪過期備份...** | 備份 | 清理超過 14 天的歷史備份以釋放空間。 |
| `sweep.addToWhitelist` | **Sweep: 加入白名單保護** | 白名單 | 保護選定的專案、路徑或會話不被任何清理作業刪除。 |
| `sweep.removeFromWhitelist` | **Sweep: 自白名單移除** | 白名單 | 解除保護，恢復正常清理。 |
| `sweep.openConfigFile` | **Sweep: 開啟設定檔** | 設定 | 開啟 `~/.sweep/config.json` 進行編輯。 |
| `sweep.toggleHideUninstalled` | **Sweep: 切換隱藏未安裝工具** | 檢視 | 切換是否在樹狀檢視中隱藏未安裝或空資料的工具。 |
| `sweep.addCustomPath` | **Sweep: 新增自訂路徑** | 設定 | 互動式挑選目錄並新增至特定 AI 工具的自訂儲存路徑。 |

---

## 🛡️ 白名單保護機制

標有 **盾牌 (`$(shield)`)** 的項目代表受白名單永久保護：

* **防誤刪保證**：白名單內的會話、專案與路徑將在批次清理、篩選清理與單項刪除中被自動跳過。
* **快捷右鍵選單**：在樹狀檢視中右鍵點擊任何會話或路徑即可執行 **加入白名單** 或 **自白名單移除**。
* **視覺化識別**：受保護項目顯示 `[🛡️ 已列入白名單]` 與綠色盾牌圖示，單項刪除按鈕自動禁用。

---

## ⚙️ 擴充套件設定項目

| 設定名稱 | 類型 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `sweep.customPaths` | `object` | `{}` | AI 工具的自訂儲存路徑（例如 `{ "claude-code": ["D:\\custom\\.claude"] }`）。 |
| `sweep.excludePatterns` | `array` | `[]` | 排除不刪除的會話檔案 Glob 規則（例如 `["**/keep-*/**"]`）。 |
| `sweep.whitelistProjects` | `array` | `[]` | 永久保護不被清理的專案/工作區名稱清單。 |
| `sweep.backupBeforeClean` | `boolean` | `true` | 清除對話前自動備份至 `~/.sweep/backups/`。 |
| `sweep.hideUninstalledTools` | `boolean` | `true` | 在樹狀檢視中隱藏本機未安裝或資料量為 0 的 AI 工具。 |

---

## 📦 安裝方式
 
### 方法 1：直接下載 (.vsix)

至 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下載 `sweep-aicleaner-1.2.0.vsix`，透過終端機或編輯器安裝：

```bash
# 在 VS Code 中安裝：
code --install-extension sweep-aicleaner-1.2.0.vsix

# 在 Cursor 中安裝：
cursor --install-extension sweep-aicleaner-1.2.0.vsix
```

或在編輯器中開啟 **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)，點擊右上角 `...` 選擇 **Install from VSIX...**。

---

### 方法 2：自原始碼建置與打包 (.vsix)

```bash
# 1. 於專案根目錄安裝依賴
npm install

# 2. 打包擴充套件
npm run pack --workspace=sweep-aicleaner
```

---

## 🏗️ 架構設計

本擴充套件透過 `esbuild` 打包為單一獨立 CommonJS 檔案 (`dist/extension.js`)，直接引入 `@l1r1h28/sweep-core`，並將 Node.js 內建模組保留為 external，確保在各 VS Code 版本中的最高相容性。

---

## 📄 授權條款

- MIT © [L1r1h28](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
- 圖示設計基於 [Lucide](https://lucide.dev)，採用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
