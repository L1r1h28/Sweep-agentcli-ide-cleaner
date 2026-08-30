# Sweep — Cleaner Roadmap

核心產品：

- **CLI** (`@aicleaner/cli`)：掃描並清理 AI coding tool 快取與對話紀錄
- **VS Code Extension** (`sweep-aicleaner`)：GUI 掃描、分開清理快取與對話紀錄
- **Core** (`@aicleaner/core`)：共用核心函式庫（非獨立產品）

---

## ✅ Commit 1 — Monorepo 基礎建置

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

## ✅ Commit 2 — Core 單元測試 `[Push]`

- [x] 為路徑解析加入 Windows / macOS / Linux 測試
- [x] 為六個工具的 catalog 與真實路徑分類加入測試
- [x] 為掃描加入：目錄、檔案、符號連結、路結、路徑不存在、權限錯誤測試
- [x] 為 `cache` / `conversations` / `all` 三種清理模式加入測試
- [x] 測試 dry-run 不刪除檔案
- [x] 測試備份後才清理
- [x] 測試 Codex sandbox、Kiro extensions 等保護規則永遠不會被刪除
- [x] `npm test` 全部通過
- [x] Push 到 GitHub

## ✅ Commit 3 — CLI 獨立 Binary `[Push]`

- [x] 選定 CLI binary 打包工具：Node.js SEA (Single Executable Application)
- [x] 產生 Windows x64 `.exe` (驗證通過)
- [x] 產生 macOS Apple Silicon / Intel binary (CI 矩陣覆蓋)
- [x] 產生 Linux x64 binary (CI 矩陣覆蓋)
- [x] binary 仍使用原版的 `cache / conversations / all` 清理模型
- [x] 加入版本資訊與 `--help` 驗證 (`--version` / `-V`)
- [x] 加入 SHA-256 checksums (`SHA256SUMS.txt`)
- [x] Push 到 GitHub

## ✅ Commit 4 — CLI Release `[Push]` `[Release]`

- [x] 在乾淨 Windows / macOS / Linux 環境執行 scan dry-run
- [x] 確認不會掃描或刪除 repository 外未列入 catalog 的資料
- [x] 確認 conversation 清理必須明確指定 `--kind conversations`，不能預設刪除
- [x] 確認 `--backup` 可以還原清理前資料
- [x] 修正 release workflow 的 package 名稱與 workspace 路徑
- [x] 補齊各套件與專案之完整 README 文件與 CHANGELOG.md
- [x] 版本統一至 v1.0.0 正式版本
- [x] 觸發 GitHub Actions Release 工作流產出發布物
- [x] 上傳 CLI binaries、VSIX、checksums 與自動擷取之 Release notes

## ✅ Commit 5 — VS Code Extension 實作與 v1.0.1 修復 `[Push]`

- [x] Extension 整合 `@aicleaner/core` 引擎（取代舊版 demo stub）
- [x] 實作 `SweepTreeDataProvider` 樹狀資料提供者，解決 `sweep.tools` 側邊欄空白與資料提供者未註冊錯誤
- [x] 驗證只清理快取的指令不會刪除對話紀錄
- [x] 驗證清理對話紀錄前有明確警告與 backup 選項
- [x] 驗證 Codex sandbox 與 Kiro extensions 保護規則
- [x] 重新打包 VSIX 並完成 v1.0.1 發布

## 📌 待修復與後續改進項目 (Next Iterations)

### 1. VS Code Extension UI 按鈕優化與行為修復
- [ ] **移除重複的摺疊按鈕**：
  - 診斷：`package.json` 中的 `view/title` 註冊了自訂 `sweep.collapseAll`，同時 `createTreeView` 啟用了 `showCollapseAll: true`，導致標題列出現兩個摺疊圖示。
  - 改善方案：移除多餘的自訂 collapse 按鈕，保留 VS Code 原生 `showCollapseAll` 機制。
- [ ] **修復「展開所有節點 (Expand All)」功能**：
  - 診斷：單純觸發 `refresh()` 無法讓 VS Code TreeView 主動展開子項目。
  - 改善方案：使用 `treeView.reveal()` 配合 `{ expand: 3 }` 或在 `SweepTreeDataProvider` 中加入全域展開狀態控制，確保一鍵展開所有工具與目標項目。
- [ ] **簡化標題列按鈕配置**：
  - 標題列僅保留核心功能：🔍 掃描、🗑️ 清理快取、⚠️ 清理對話紀錄、與原生 ➖ 摺疊。

### 2. VS Code Extension 多語系 i18n 支援（繁中 / 英文 / 簡中）
- [ ] **選單與指令本地化 (`package.nls.json`)**：
  - `package.nls.json`（預設英文 English）
  - `package.nls.zh-tw.json`（繁體中文）
  - `package.nls.zh-cn.json`（簡體中文）
- [ ] **程式碼內部字串本地化 (`vscode.l10n`)**：
  - 使用 `vscode.l10n.t()` 封裝延伸模組之通知訊息、確認視窗（Modal）、進度提示與 Tooltip 說明。
- [ ] **Extension 專屬多語系文件**：
  - `packages/vscode-extension/README.md`（英文）
  - `packages/vscode-extension/README.zh-TW.md`（繁體中文）
  - `packages/vscode-extension/README.zh-CN.md`（簡體中文）

### 3. 細緻化對話清理機制 (Granular Conversation Cleaning & Management)
- [ ] **依時間/年齡篩選清理 (Time-based Cleanup)**：
  - 支援清理超過指定天數的歷史對話（例如 `--older-than 30d` / 7 天前 / 90 天前），保留近期活躍的 session。
- [ ] **依專案/工作區篩選 (Project/Workspace-scoped Cleanup)**：
  - 支援針對特定工作區目錄（如 Claude Code `projects/<encoded-cwd>`、Kiro sessions、Antigravity brain）清理對話，保留核心專案歷史。
- [ ] **個別 Session 瀏覽與挑選刪除 (Individual Session Inspection & Selective Cleaning)**：
  - 在 VS Code 側邊欄樹狀結構或 QuickPick 中列出獨立 session（顯示建立日期、標題/首句摘要、佔用容量），支援單選或多選刪除特定對話。
- [ ] **大型 Session 篩選與清理 (Size-based / Heavy Session Filtering)**：
  - 找出佔用過大空間的異常 session（例如包含大型 tool results、截圖、錄影或超過 50 MB 的 session）。
- [ ] **對話封存與匯出 (Export & Archive to Markdown/JSON)**：
  - 在執行清理前提供將對話匯出成一般 Markdown 或 JSON 格式歸檔的功能，兼顧釋放空間與知識留存。

### 4. 使用者自訂設定與排除名單 (Custom Settings & Whitelist/Ignore List)
- [ ] **自訂工具儲存路徑記憶 (Custom Tool Paths Override & Persistence)**：
  - 支援使用者自訂非標準路徑（例如便攜版 IDE、自訂磁碟代號 `D:\...`、自訂 `CLAUDE_CONFIG_DIR` 或自訂 AppData 路徑），自動記憶並納入掃描。
- [ ] **白名單與永久排除規則 (User Whitelist / Ignore Patterns)**：
  - 允許使用者指定「絕不刪除」的特定專案、對話 Session 或指定子資料夾（例如特定專案的 brain 或重要 session）。
  - 在執行「一鍵清理」或批次清理時，自動比對並完全保護白名單路徑。
- [ ] **VS Code 設定整合 (`sweep.*`)**：
  - 於 `settings.json` 提供 `sweep.customPaths`、`sweep.excludePatterns` 等設定項。
  - 在側邊欄樹狀項目的右鍵選單提供快捷動作：「加入排除名單 (Add to Whitelist/Ignore)」與「移除排除」。
- [ ] **CLI 設定檔共用 (`~/.sweeprc` / `config.json`)**：
  - 建立共用設定檔格式，使 CLI 工具（`sweep scan` / `sweep clean`）與 VS Code 延伸模組共享同一份自訂路徑與排除規則。

## Commit 7 — CI / Release 收尾 `[Push]`

- [ ] CI 在 Windows / macOS / Linux 執行 build 與 test
- [x] 升級 CI / Release workflows 之 Node.js 版本至 Node.js 24 (與本機環境統一)
- [ ] Release workflow 使用 `--no-git-tag-version`
- [ ] Release workflow 使用 `--no-dependencies` 打包 VSIX
- [ ] 確認 workflow 不會上傳私人設定、skills、`node_modules` 或本機掃描報告
- [ ] 確認 GitHub repository 的 description、license、README 與版本號一致
- [ ] Push 到 GitHub

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