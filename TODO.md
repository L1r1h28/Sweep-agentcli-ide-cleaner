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

## Commit 2 — Core 單元測試 `[Push]`

- [ ] 為路徑解析加入 Windows / macOS / Linux 測試
- [ ] 為六個工具的 catalog 與真實路徑分類加入測試
- [ ] 為掃描加入：目錄、檔案、符號連結、路結、路徑不存在、權限錯誤測試
- [ ] 為 `cache` / `conversations` / `all` 三種清理模式加入測試
- [ ] 測試 dry-run 不刪除檔案
- [ ] 測試備份後才清理
- [ ] 測試 Codex sandbox、Kiro extensions 等保護規則永遠不會被刪除
- [ ] `npm test` 全部通過
- [ ] Push 到 GitHub

## ✅ Commit 3 — CLI 獨立 Binary `[Push]`

- [x] 選定 CLI binary 打包工具：Node.js SEA (Single Executable Application)
- [x] 產生 Windows x64 `.exe` (驗證通過)
- [x] 產生 macOS Apple Silicon / Intel binary (CI 矩陣覆蓋)
- [x] 產生 Linux x64 binary (CI 矩陣覆蓋)
- [x] binary 仍使用原版的 `cache / conversations / all` 清理模型
- [x] 加入版本資訊與 `--help` 驗證 (`--version` / `-V`)
- [x] 加入 SHA-256 checksums (`SHA256SUMS.txt`)
- [x] Push 到 GitHub

## Commit 4 — CLI Release `[Push]` `[Release]`

- [ ] 在乾淨 Windows / macOS / Linux 環境執行 scan dry-run
- [ ] 確認不會掃描或刪除 repository 外未列入 catalog 的資料
- [ ] 確認 conversation 清理必須明確指定 `--kind conversations`，不能預設刪除
- [ ] 確認 `--backup` 可以還原清理前資料
- [ ] 修正 release workflow 的 package 名稱與 workspace 路徑
- [ ] 版本升級至下一個正式版本
- [ ] 建立 GitHub Release
- [ ] 上傳 CLI binaries、checksums 與 release notes

## Commit 5 — VS Code Extension 實作驗證 `[Push]`

- [ ] Extension 真正使用 `@aicleaner/core` 引擎（目前 `extension.js` 為 demo stub）
- [ ] 在 VS Code Extension Development Host 驗證掃描指令
- [ ] 驗證只清理快取的指令不會刪除對話紀錄
- [ ] 驗證清理對話紀錄前有明確警告與 backup 選項
- [ ] 驗證 Codex sandbox 與 Kiro extensions 保護規則
- [ ] 重新打包 VSIX 並以乾淨 VS Code 安裝測試
- [ ] Push 到 GitHub

## Commit 6 — VS Code Extension Release `[Push]` `[Release]`

- [ ] 修正 release workflow 的 extension 名稱與版本
- [ ] 版本升級至下一個正式版本
- [ ] 建立 GitHub Release
- [ ] 上傳 VSIX

## Commit 7 — CI / Release 收尾 `[Push]`

- [ ] CI 在 Windows / macOS / Linux 執行 build 與 test
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