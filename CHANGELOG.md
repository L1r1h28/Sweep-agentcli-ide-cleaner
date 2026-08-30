# Changelog

> **Note**: This changelog must always be written and maintained in English.

All notable changes to Sweep (CLI, VS Code Extension, and Core Engine) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-08-31

### 🚀 CI / CD & Release Automation
- **Store Publishing Pipeline in GitHub Actions**:
  - Expanded `.github/workflows/release.yml` with automated publishing to **Visual Studio Marketplace** (`@vscode/vsce`), **Open VSX Registry** (`ovsx`), and **npm Registry** (`@aicleaner/core` & `@aicleaner/cli`).
  - Added `publish_stores` workflow dispatch input with automatic safety skip on draft mode.
  - Implemented safe token validation checks (`VSCE_PAT`, `OVSX_PAT`, `NPM_TOKEN`) with non-fatal warning alerts (`::warning::`) to ensure smooth builds even when individual tokens are not configured.
  - Standardized extension publisher configuration (`L1r1h28`) for Marketplace verification.
- **Packaging Integrity**:
  - Maintained zero-dependency VSIX bundling with strict `.vscodeignore` exclusions protecting source files, credentials, and local configuration.

---

## [1.1.2] - 2026-08-31

### ✨ Features & Enhancements

#### Custom Settings & Whitelist Protection (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Shared Configuration Engine (`~/.sweep/config.json`)**:
  - Implemented centralized configuration management (`loadConfig()`, `saveConfig()`) supporting `~/.sweep/config.json` with backward-compatible `~/.sweeprc` fallback.
  - Added support for custom tool storage paths (`customPaths`) across non-standard drive letters, portable directories, and custom environments.
  - Environment variable resolution in `expandPath()` supporting arbitrary `%VAR%` (Windows) and `$VAR` / `${VAR}` (POSIX) expansion.
- **Whitelist Protection & Filter Engine**:
  - Implemented multi-tier whitelist filtering (`isPathWhitelisted()`, `isProjectWhitelisted()`, `isSessionIdWhitelisted()`, `isSessionWhitelisted()`).
  - Supports Glob patterns (`**/keep-*/**`, `**/*.keep.jsonl`), project/workspace names, and explicit session IDs.
  - Integrated into `scanDisk()`, `scanSessions()`, `planClean()`, and `cleanSessions()` ensuring whitelisted items are permanently immune from deletion across batch clean, time-based clean, and single-item cleanup.
- **CLI Commands**:
  - `sweep config [path | list | get <key> | set <key> <value>]`: Inspect and manage configuration values directly from the terminal.
  - `sweep whitelist [list | add <item> | remove <item>]`: Manage protected projects, patterns, and session IDs.
  - Tabular outputs and clean reports now display `[🛡️ Whitelisted]` indicators and skip summaries.
- **VS Code Extension Integration**:
  - Contributed configuration settings: `sweep.customPaths`, `sweep.excludePatterns`, `sweep.whitelistProjects`, and `sweep.backupBeforeClean`.
  - Visual shield indicators (`$(shield)`) with green badge for protected items in the Activity Bar Tree View.
  - Right-click context actions: `Sweep: Add to Whitelist (Protect)` and `Sweep: Remove from Whitelist`.
  - `Sweep: Open config file` (`sweep.openConfigFile`) for quick JSON configuration editing.
  - Synchronized full 18-command documentation and settings guide in extension READMEs.

---

## [1.1.1] - 2026-08-30

### ✨ Features & Enhancements

#### Backup Management & One-Click Restore (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Backup Manifest Engine (`manifest.json`)**:
  - Implemented atomic `manifest.json` generation tracking tool IDs, target identifiers, original absolute paths, backup relative paths, timestamps, and platform metadata.
  - Path traversal and security protections on restore destinations.
- **Backup & Restore Operations**:
  - `listBackups()`: Sorted backup archives with total sizes, timestamps, and tool breakdown.
  - `pruneBackups()`: Expired archive cleanup supporting `--older-than <dur>` (e.g. `14d`) and `--keep-latest <n>`.
  - `restoreBackup()`: One-click full or selective (`--tool <id>`) restore to original system paths.
- **CLI Commands**:
  - `sweep backups list`: Tabular list of local backup archives.
  - `sweep backups prune`: Prune expired or excessive backup archives.
  - `sweep restore [<id>|latest]`: One-click restore previous backup archives.
- **VS Code Extension Integration**:
  - `Sweep: View backup history` (`sweep.listBackups`).
  - `Sweep: Restore from backup...` (`sweep.restoreBackup`) with safety confirmation modals.
  - `Sweep: Open backup folder` (`sweep.openBackupFolder`) and `Sweep: Prune expired backups...` (`sweep.pruneBackups`).

---

## [1.1.0] - 2026-08-30

### ✨ Features & Enhancements

#### Granular Conversation Cleaning (`@aicleaner/core` & `@aicleaner/cli`)
- **Granular Session Scanner & Model**:
  - Implemented `scanSessions()`, detecting individual conversation sessions, extracting first prompt titles, associated project names, last activity timestamp, age in days, and disk footprints across Antigravity, Codex, Claude Code, Windsurf, Kiro, and Trae.
- **Granular Filtering Engine**:
  - Filter by age/time: `--older-than <dur>` (e.g. `7d`, `30d`, `2w`, `1m`, `90d`) and `--newer-than <dur>`.
  - Filter by size: `--min-size <size>` (e.g. `50mb`, `100kb`, `1gb`) and `--max-size <size>`.
  - Filter by project / workspace query: `--project <name>`.
- **Session Export & Archival**:
  - Implemented `exportSessionToMarkdown()` and `exportSessionToJson()`, allowing one-click export of transcripts into human-readable Markdown or structured JSON before cleaning.
- **CLI Commands**:
  - `sweep sessions list`: Tabular session list with tool, project, age, size, and prompt title.
  - `sweep sessions clean`: Targeted session cleanup with automatic backup.
  - `sweep sessions export <sessionId>`: Export chat transcripts.
  - `sweep clean --kind conversations --older-than 30d`: Granular session cleaning integration.

#### VS Code Extension (`sweep-aicleaner`)
- **Individual Session Explorer**: TreeView now expands conversation targets into individual session items showing title, project, age, and size.
- **QuickPick Workflows**:
  - `Sweep: Clean conversations older than...` (7d, 14d, 30d, 90d presets).
  - `Sweep: Clean large conversations (>50MB)...`.
  - `Sweep: Pick conversations to delete...` (interactive multi-select checklist).
  - `Sweep: Export conversation (Markdown / JSON)`.

---

## [1.0.1] - 2026-08-30

### 🐛 Bug Fixes & Enhancements

#### VS Code Extension (`sweep-aicleaner`)
- **Fix Activity Bar Storage View**: Implemented and registered `SweepTreeDataProvider` for the `sweep.tools` view container, resolving the *"There are no registered data providers to provide view data"* error upon extension launch.
- **Tree View Hierarchy**:
  - **Tool nodes**: Displays per-tool storage breakdown (e.g. `484 MB (💾 82 MB · 💬 402 MB)`).
  - **Target categories**: Categorizes into safe cache (💾 🟡) vs. high-risk conversations (💬 🔴) with file counters.
  - **Path items**: Shows resolved paths with real-time detection indicators (✓ found / ✗ missing).
- **Interactive Commands**: Fully wired up commands for scanning storage, cleaning safe cache, cleaning conversations (with destructive modal warning & automated backup), per-tool cleaning, and dry-run preview.
- **Standalone Bundle**: Self-contained CommonJS packaging with `@aicleaner/core` bundled via `esbuild`.

#### CLI (`@aicleaner/cli`)
- **Module Resolution**: Fixed binary/script runner in `cli.mjs` to properly resolve `dist/run.cjs`.
- **Version Reporting**: Corrected `--version` output to accurately reflect package versions.

---

## [1.0.0] - 2026-08-30

### 🚀 Initial Release — Standalone CLI & Core Engine

This is the **first official release** of Sweep, featuring high-performance cross-platform standalone binaries (built with Node.js Single Executable Applications) and a shared safety-first clean engine.

#### ✨ Key Features

- 🖥️ **Cross-Platform Standalone Binaries**:
  - Windows x64 (`sweep-windows-x64.exe`)
  - macOS Apple Silicon (`sweep-darwin-arm64`)
  - macOS Intel (`sweep-darwin-x64`)
  - Linux x64 (`sweep-linux-x64`)
- 🤖 **6 AI Coding Tools Supported**:
  - Google Antigravity IDE
  - OpenAI Codex (CLI + Desktop App)
  - Anthropic Claude Code
  - Codeium Windsurf (Cascade)
  - AWS Kiro IDE
  - ByteDance Trae IDE
- 🛡️ **Three-Tier Safety Cleaning Model**:
  - `--kind cache`: Safely deletes Electron, GPU, and IndexedDB caches without touching chats.
  - `--kind conversations`: Destructive cleanup for session histories and chat databases (requires explicit `--force`).
  - `--kind all`: Cleans both caches and conversations.
- 📦 **Automated Backup System**:
  - Automatically archives conversation files to `~/AI-Cleaner-Backups/<timestamp>/` prior to deletion.
- 🔒 **Never-Delete Guard**:
  - Built-in permanent exclusion layer protecting `.sandbox-bin/`, `.kiro/extensions/`, `settings.json`, `auth.json`, `config.toml`, and `mcp_config.json`.
- 🧪 **Cross-Platform CI & Smoke Testing**:
  - Automated multi-OS verification across Windows, Linux, and macOS.
