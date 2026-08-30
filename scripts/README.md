# 🛠️ Sweep Monorepo Scripts & Developer Tools

本目錄包含專案維護、版本發布、CI 監控與專案導出輔助工具。**所有工具均已就緒，請直接使用指令調用，無需重新解析或修改腳本源代碼。**

---

## 📋 腳本清單總覽

| 腳本檔案 | 對應 npm 指令 | 主要功能 | 適用情境 |
| :--- | :--- | :--- | :--- |
| [`bump-version.mjs`](./bump-version.mjs) | `npm run bump [type]` | 同步升級 Monorepo 全套件版本號 | 發布前版本號遞增 (patch / minor / major) |
| [`extract-release-notes.mjs`](./extract-release-notes.mjs) | `node scripts/extract-release-notes.mjs [ver]` | 從 `CHANGELOG.md` 擷取該版本釋出紀錄 | GitHub Actions 產生 Release Notes Body |
| [`fetch-ci-results.mjs`](./fetch-ci-results.mjs) | `npm run ci:watch` / `npm run ci:fetch` | 即時監控 GitHub Actions 並下載 Artifacts/Logs | 本機等待 CI 完成並自動取得 VSIX 與二進位檔 |
| [`project-to-md.js`](./project-to-md.js) | `node scripts/project-to-md.js [output.md]` | 聚合專案結構與代碼至單一 Markdown | 提供 AI 大型 Prompt 代碼上下文分析 |

---

## 📖 腳本詳細說明與用法

### 1. `bump-version.mjs` — Monorepo 版本號同步工具

自動跨套件同步版本號，並安全更新鎖定檔與相關說明文件中的 VSIX 連結。

* **更新目標**：
  * `package.json`（根目錄）
  * `packages/core/package.json`
  * `packages/cli/package.json`
  * `packages/vscode-extension/package.json`
  * `package-lock.json`（僅更新 monorepo workspace 本地套件版本，不改動第三方相依）
  * `packages/vscode-extension/README*.md` 中的 VSIX 下載檔名連結
  * `CHANGELOG.md`（若尚無該版本區塊，自動插入日期與發布標題模板）
* **使用方式**：
  ```bash
  npm run bump patch          # 遞增 Patch 版本 (1.1.0 -> 1.1.1)
  npm run bump minor          # 遞增 Minor 版本 (1.1.0 -> 1.2.0)
  npm run bump major          # 遞增 Major 版本 (1.1.0 -> 2.0.0)
  npm run bump 1.1.0          # 指定特定版本號
  node scripts/bump-version.mjs minor --dry-run   # 試執行 (不修改任何檔案)
  node scripts/bump-version.mjs minor --git-tag   # 更新並自動執行 git commit 與 git tag
  ```

---

### 2. `extract-release-notes.mjs` — Release 紀錄擷取工具

解析 `CHANGELOG.md`，自動擷取指定版本號（如 `## [1.1.0]`）區塊內的 Markdown 內容，輸出為 `RELEASE_NOTES_BODY.md`。

* **使用方式**：
  ```bash
  node scripts/extract-release-notes.mjs 1.1.0
  ```
* **輸出結果**：在根目錄產生 `RELEASE_NOTES_BODY.md` 供 GitHub Release / CI workflow 使用。

---

### 3. `fetch-ci-results.mjs` — CI / Release 監控與產物下載器

使用 GitHub CLI (`gh`) 即時輪詢本機分支或特定 Run ID 的 GitHub Actions 狀態，完成後自動下載編譯產物（VSIX、CLI Executables）至 `dist/`，並匯出多平台測試日誌。

* **使用方式**：
  ```bash
  npm run ci:watch                             # 自動追蹤當前分支最新的 CI / Release Run
  npm run ci:watch -- 13589234857              # 監控指定 GitHub Run ID
  npm run ci:watch -- --workflow release.yml   # 監控指定工作流
  npm run ci:watch -- --out-dir dist           # 指定產物下載路徑 (預設為 dist/)
  npm run ci:watch -- --no-logs                # 只下載產物，不下載 test logs
  ```
* **輸出產物**：
  * `dist/sweep-aicleaner-<version>.vsix`
  * `dist/logs/<job_name>.log`

---

### 4. `project-to-md.js` — 專案代碼聚合轉 Markdown

將專案目錄結構與所有原始碼檔案打包為單一 Markdown 文件，自動過濾 `.gitignore`、`node_modules`、二進位檔案與 lockfiles。

* **使用方式**：
  ```bash
  node scripts/project-to-md.js project.md                     # 匯出整個專案至 project.md
  node scripts/project-to-md.js --root=./packages/core core.md # 僅匯出 packages/core
  ```

---
