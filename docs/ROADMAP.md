# Sweep — Cleaner Roadmap

核心產品：

- **CLI** (`@aicleaner/cli`)：掃描並清理 AI coding tool 快取與對話紀錄
- **VS Code Extension** (`sweep-aicleaner`)：GUI 掃描、分開清理快取與對話紀錄
- **Core** (`@aicleaner/core`)：共用核心函式庫（非獨立產品）

---

## ✅ Commit 1 [v0.1.0] — Monorepo 基礎建置

- [x] 建立 root `package.json` 與 `workspaces: ["packages/*"]`
- [x] `packages/core`：共用 catalog、scan、clean、backup、format、paths 引擎
- [x] `packages/cli`：命令列介面，`bin: { aicleaner, sweep }`
- [x] `packages/vscode-extension`：VS Code extension，esbuild bundle
- [x] LICENSE 移至 repo 根目錄，年份 2026，版權 L1r1h28
- [x] 各 `package.json` 補齊 `license: MIT`、`author: L1r1h28`
- [x] 修正 monorepo workspace 連結：`@aicleaner/core: "*"`
- [x] 修正 CLI import：全部改為 `@aicleaner/core`
- [x] 補齊 `core/src/index.ts` 所有 export（`scan.ts`、`clean.ts`、`backup.ts`）
- [x] 確認 `npm run build`（core typecheck → CLI bundle → Extension bundle）全部通過
- [x] 確認 `node packages/cli/src/cli.mjs help` 正常執行
- [x] 確認 `node --experimental-strip-types packages/cli/src/run.ts help` 正常執行
- [x] **Push 到 GitHub**

## ✅ Commit 2 [v0.1.1] — Core 單元測試 `[Push]`

- [x] 為路徑解析加入 Windows / macOS / Linux 測試
- [x] 為六個工具的 catalog 與真實路徑分類加入測試
- [x] 為掃描加入：目錄、檔案、符號連結、路結、路徑不存在、權限錯誤測試
- [x] 為 `cache` / `conversations` / `all` 三種清理模式加入測試
- [x] 測試 dry-run 不刪除檔案
- [x] 測試備份後才清理
- [x] 測試 Codex sandbox、Kiro extensions 等保護規則永遠不會被刪除
- [x] `npm test` 全部通過
- [x] Push 到 GitHub

## ✅ Commit 3 [v0.2.0] — CLI 獨立 Binary `[Push]`

- [x] 選定 CLI binary 打包工具：Node.js SEA (Single Executable Application)
- [x] 產生 Windows x64 `.exe` (驗證通過)
- [x] 產生 macOS Apple Silicon / Intel binary (CI 矩陣覆蓋)
- [x] 產生 Linux x64 binary (CI 矩陣覆蓋)
- [x] binary 仍使用原版的 `cache / conversations / all` 清理模型
- [x] 加入版本資訊與 `--help` 驗證 (`--version` / `-V`)
- [x] 加入 SHA-256 checksums (`SHA256SUMS.txt`)
- [x] Push 到 GitHub

## ✅ Commit 4 [v1.0.0] — CLI Release `[Push]` `[Release]`

- [x] 在乾淨 Windows / macOS / Linux 環境執行 scan dry-run
- [x] 確認不會掃描或刪除 repository 外未列入 catalog 的資料
- [x] 確認 conversation 清理必須明確指定 `--kind conversations`，不能預設刪除
- [x] 確認 `--backup` 可以還原清理前資料
- [x] 修正 release workflow 的 package 名稱與 workspace 路徑
- [x] 補齊各套件與專案之完整 README 文件與 CHANGELOG.md
- [x] 版本統一至 v1.0.0 正式版本
- [x] 觸發 GitHub Actions Release 工作流產出發布物
- [x] 上傳 CLI binaries、VSIX、checksums 與自動擷取之 Release notes

## ✅ Commit 5 [v1.0.1] — VS Code Extension 實作與 v1.0.1 修復 `[Push]` `[Release]`

- [x] Extension 整合 `@aicleaner/core` 引擎（取代舊版 demo stub）
- [x] 實作 `SweepTreeDataProvider` 樹狀資料提供者，解決 `sweep.tools` 側邊欄空白與資料提供者未註冊錯誤
- [x] 驗證只清理快取的指令不會刪除對話紀錄
- [x] 驗證清理對話紀錄前有明確警告與 backup 選項
- [x] 驗證 Codex sandbox 與 Kiro extensions 保護規則
- [x] 重新打包 VSIX 並完成 v1.0.1 發布

## ✅ Commit 6 [v1.0.2] — 預設備份路徑統一至 `~/.sweep/backups/` 與 UI 圖示更新 `[Push]`

- [x] **預設備份路徑規格統一 (`~/.sweep/backups/`)**：
  - [x] 核心備份路徑遷移：將 `~/AI-Cleaner-Backups/` 遷移為 `~/.sweep/backups/<timestamp>/`（`packages/core/src/backup.ts`）
  - [x] 測試案例同步更新：更新 `backup.test.ts` 與 `smoke.test.ts` 斷言
  - [x] 多語系文件同步：修正 `README.MD`、`README.zh-TW.md`、`README.zh-CN.md`、`packages/core/README.md`、`packages/cli/README.md`、`packages/vscode-extension/README.md`
  - [x] CHANGELOG 維護：更新版本紀錄並註明 CHANGELOG 一律使用英文維護
- [x] **UI 圖示更新與 Lucide 授權銘謝**：
  - [x] 更新 VS Code Extension 圖示為 Lucide `brush-cleaning` SVG（`packages/vscode-extension/media/icon.svg`）
  - [x] 各語言 README 補齊 Lucide ISC License 銘謝條款

## ✅ Commit 7 [v1.0.3] — VS Code Extension UI 按鈕優化與多語系 (i18n) `[Push]`

- [x] **VS Code Extension UI 按鈕優化與行為修復**：
  - [x] 移除重複且無效的自訂開合按鈕（移除 `package.json` 自訂 `expandAll` 與 `collapseAll`）
  - [x] 保留 VS Code 原生 `showCollapseAll: true`（採用官方原生高效摺疊機制）
  - [x] 標題列按鈕配置（依序保留 4 顆按鈕：🔄 掃描/重新整理、🗑️ 清理快取、⚠️ 清理對話、➖ 原生摺疊）
- [x] **VS Code Extension 多語系 i18n 支援（繁中 / 英文 / 簡中）**：
  - [x] 選單與指令本地化：`package.nls.json` (EN)、`package.nls.zh-tw.json` (繁中)、`package.nls.zh-cn.json` (簡中)
  - [x] 程式碼內部字串本地化：使用 `vscode.l10n.t()` 封裝通知訊息、確認視窗（Modal）、進度提示與 Tooltip
  - [x] Extension 專屬多語系文件：`README.md`、`README.zh-TW.md`、`README.zh-CN.md`
- [x] **專案視覺展示與截圖素材 (Visual Assets & Screenshots)**：
  - [x] 建立 `assets/` 目錄維護專案視覺圖片與展示檔案
  - [x] 錄製/截取 CLI 終端機展示圖（`sweep scan` 彩色輸出、`sweep clean --dry-run` 預覽與自動備份）
  - [x] 截取 VS Code Extension 側邊欄面板與操作截圖（樹狀視圖、清理快取/對話確認彈窗）
  - [x] 在根目錄多語系 README（`README.md`、`README.zh-TW.md`、`README.zh-CN.md`）與 Extension README 嵌入展示截圖
  - [x] 準備 VS Code Marketplace / Open VSX 預覽展示圖（供後續 Commit 11 / 12 上架使用）
- [x] 驗證多語系切換與 UI 操作正常
- [x] Push 到 GitHub

## ✅ Commit 8 [v1.1.0] — 細緻化對話清理機制 (Granular Conversation Cleaning) `[Push]`

- [x] **修復 ByteDance Trae 掃描與記憶路徑支援 (Trae Scan & SOLO Memory Fix)**：
  - [x] 補齊 Trae SOLO Agent 記憶路徑（`~/.trae/memory`、`~/.trae/worktrees`）與完整 Electron/IDE 快取路徑（`Code Cache`、`monitor`、`WebStorage`、`User/globalStorage/.ckg`、`aha`、`workspaceStorage` 等）
  - [x] 細緻化安全保護規則（將全域 `**/.trae/**` 限縮為精確保護 rules、skills、settings、permission、jwt-token 等核心設定）
  - [x] 修正保護路徑比對邏輯（`isProtected` 同步支援目錄路徑與尾隨斜線比對）
  - [x] 更新 `storage-paths.md` 跨平台目錄結構並通過全數單元測試
- [x] **細緻化對話清理機制 (Granular Conversation Cleaning)**：
  - [x] 依時間/年齡篩選清理（支援 `--older-than 30d` / 7 天前 / 90 天前，保留近期活躍 session）
  - [x] 依專案/工作區篩選（支援清理特定專案資料夾如 Claude Code `projects/`、Kiro sessions、Antigravity brain）
  - [x] 個別 Session 瀏覽與挑選刪除（側邊欄或 QuickPick 列出 session 標題、日期、容量並支援挑選刪除）
  - [x] 大型 Session 篩選與清理（篩選出 >50MB 或異常佔用的大型 session）
  - [x] 對話封存與匯出（清理前提供匯出為 Markdown/JSON 封存功能）
- [x] 撰寫單元測試覆蓋細緻化篩選與對話封存邏輯
- [x] Push 到 GitHub

## ✅ Commit 9 [v1.1.1] — 備份管理與一鍵還原機制 (Backup Management & Restore) `[Push]`

- [x] **備份管理與一鍵還原機制 (Backup Management & One-Click Restore)**：
  - [x] Core 還原引擎（`packages/core/src/restore.ts`）：建立 `manifest.json` 記錄原始路徑、時間與工具對應
  - [x] 支援指定還原（全量還原、指定工具如僅還原 Claude/Kiro、或指定時間點還原）
  - [x] CLI 還原指令：
    - `sweep restore`（指定備份 ID 或 latest 一鍵還原，支援 `--tool` 篩選）
    - `sweep backups list`（列出所有本機備份時間、容量與工具項目）
    - `sweep backups prune --older-than 14d`（過期備份清理，避免備份本身過度佔用硬碟）
  - [x] VS Code Extension 備份與還原 UI：
    - QuickPick 整合「📦 備份歷史 (`sweep.listBackups`)」檢視
    - 提供「⏪ 一鍵還原 (`sweep.restoreBackup`)」按鈕與安全性確認
    - 提供「📁 開啟備份資料夾 (`sweep.openBackupFolder`)」捷徑
    - 提供「🧹 清理過期備份 (`sweep.pruneBackups`)」操作
- [x] 撰寫單元測試覆蓋備份清單、過期清理與還原機制
- [x] Push 到 GitHub

## ✅ Commit 10 [v1.1.2] — 使用者自訂設定與排除名單 (Custom Settings & Whitelist) `[Push]`

- [x] **使用者自訂設定與排除名單 (Custom Settings & Whitelist)**：
  - [x] 自訂工具儲存路徑記憶（支援非標準路徑、便攜版、自訂磁碟代號、自訂環境變數路徑）
  - [x] 白名單與永久排除規則（支援指定絕不刪除之專案、Session 或路徑 pattern）
  - [x] VS Code 設定整合（`sweep.customPaths`、`sweep.excludePatterns` 與樹狀右鍵「加入/移除白名單」）
  - [x] CLI 與 Extension 共用設定檔（`~/.sweeprc` / `config.json` 同步共享規則）
  - [x] VS Code Extension README 完整指令列與白名單排除標記文件同步更新
- [x] 撰寫單元測試覆蓋自訂路徑與白名單過濾規則
- [x] Push 到 GitHub

## Commit 11 [v1.1.3] — CI / Release 工作流擴充與商店發布配置 `[Push]`

- [x] CI 在 Windows / macOS / Linux 執行完整 build 與 test
- [x] 升級 CI / Release workflows 之 Node.js 版本至 Node.js 24 (與本機環境統一)
- [x] Release workflow 使用 `--no-git-tag-version` 與 `--no-dependencies` 打包 VSIX
- [x] **擴充 `.github/workflows/release.yml` 商店自動化發布工作流 (Store Publishing Pipeline)**：
  - [x] 支援 workflow inputs 勾選 `publish_stores`（預設 true，草稿模式可跳過）
  - [x] **VS Code Marketplace 發布步驟**：
    - 使用 `npx @vscode/vsce publish --packagePath dist/*.vsix -p ${{ secrets.VSCE_PAT }}`
  - [x] **Open VSX Registry 發布步驟**（供 Cursor / VSCodium 安裝）：
    - 使用 `npx ovsx publish dist/*.vsix -p ${{ secrets.OVSX_PAT }}`
  - [x] **npm 官方套件庫發布步驟**（供 `npm i -g @aicleaner/cli`）：
    - 設定 `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
    - 依序發布 `@aicleaner/core` 與 `@aicleaner/cli`（`--access public`）
  - [x] 加入 Token 存在性檢查與發布失敗警告機制
- [x] 確認 workflow 不會上傳私人設定、skills、`node_modules` 或本機掃描報告
- [x] 確認 GitHub repository 的 description、license、README 與版本號一致
- [x] Push 到 GitHub

## Commit 12 [v1.2.0] — 官方商店發布 (Marketplace & npm) 與 v1.2.0 正式發行 `[Push]` `[Release]`

- [ ] **商店帳號與發行者身分設定 (Publishers & Tokens Setup)**：
  - [ ] 註冊微軟發行者（Publisher ID: `L1r1h28`）並在 Azure DevOps 產出 PAT（Marketplace Manage 權限）
  - [ ] 登入 Open VSX 建立 Namespace 並產出 Access Token
  - [ ] 登入 npmjs.com 建立 `@aicleaner` 組織並產出 Granular/Publish Access Token
  - [ ] 將三個 Token 寫入 GitHub Repo Secrets：
    - `VSCE_PAT`
    - `OVSX_PAT`
    - `NPM_TOKEN`
- [ ] **觸發 GitHub Actions 執行自動化發布**：
  - [ ] 觸發 Release workflow（版本號 `1.1.0`）
  - [ ] 自動完成全平台 CLI SEA binary 編譯、單元測試、SHA-256 計算、VSIX 打包
  - [ ] 自動發布至 Visual Studio Marketplace
  - [ ] 自動發布至 Open VSX Registry
  - [ ] 自動發布 `@aicleaner/cli` 與 `@aicleaner/core` 至 npm
  - [ ] 自動建立 GitHub Release v1.1.0 並掛載所有 release assets 與 Release Notes
- [ ] **驗證安裝與上架狀態**：
  - [ ] 驗證 VS Code / Cursor 擴充功能商店搜尋 `sweep-aicleaner` 並安裝成功
  - [ ] 驗證 `npx @aicleaner/cli scan` 與 `npm i -g @aicleaner/cli` 正確執行

---

## 🚫 永遠不要提交到 GitHub

- `.agents/`
- `.kilocode/`
- `.trae/`
- `.windsurf/`
- `node_modules/`
- `dist/`
- `*.vsix`（VSIX 應作為 GitHub Release asset）
- 真實使用者名稱、電腦名稱、絕對本機路徑
- `auth.json`、token、API key、sandbox secrets