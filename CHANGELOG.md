# Changelog

> **Note**: This changelog must always be written and maintained in English.

All notable changes to Sweep (CLI, VS Code Extension, and Core Engine) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-31

### ✨ Official Store Release & Namespace Migration (`@l1r1h28/sweep-core`, `@l1r1h28/sweep-cli`, `sweep-aicleaner`)

- **npm Scope Migration to `@l1r1h28/`**:
  - Core engine officially migrated to `@l1r1h28/sweep-core`.
  - CLI companion migrated to `@l1r1h28/sweep-cli`, providing global binary aliases `sweep` and `aicleaner` (invocable via `npx @l1r1h28/sweep-cli`).
  - Extension maintained as `sweep-aicleaner` under publisher `L1r1h28`.
  - Updated all workspace references, internal module imports, esbuild/packaging scripts, and CI/Release automation workflows.
- **Store & Registry Publishing Pipeline**:
  - Configured automated publishing pipeline to Visual Studio Marketplace, Open VSX Registry, and npm Registry.
  - Automated release artifact distribution including SHA-256 checksums, VSIX package (`sweep-aicleaner-1.2.0.vsix`), and standalone executables for Linux x64, macOS Apple Silicon / Intel, and Windows x64.
- **Documentation & README Comprehensive Refresh**:
  - Synchronized documentation across English, Traditional Chinese (`zh-TW`), and Simplified Chinese (`zh-CN`).
  - Added complete 15 AI coding tool product line matrix with directory paths and strict safety protection rules.
  - Updated all CLI command references including output folding (`--limit`, `--all`), single-tool scoping (`--tool <id>`), granular filters (`--older-than`, `--min-size`, `--project`), backup/restore (`sweep restore`, `sweep backups`), and configuration management (`sweep config`, `sweep whitelist`).
  - Documented new extension GUI features: `sweep.toggleHideUninstalled` and `sweep.addCustomPath`.
- **Full Test Suite & Quality Assurance**:
  - 100% test pass rate across all 16 test files (122 tests), verifying zero-PII compliance, multi-platform path expansion, backup/restore fidelity, and whitelist enforcement.

---

## [1.1.10] - 2026-08-31

### ✨ Features & Enhancements

#### UI / UX Comprehensive Polish & Interactive Enhancements (`@aicleaner/cli`, `sweep-aicleaner`, `@aicleaner/core`)
- **CLI Output Folding & Compression (`sweep sessions list` & `sweep scan`)**:
  - Implemented automatic output folding for `sweep sessions list` (defaulting to Top 20 sessions) with clear pagination notices:
    `... and X more session(s) (Total: Y across Z sessions). Use --all or --limit <n> to view all.`
  - Added `--limit <n>` / `-n <n>` and `--all` / `-a` flags to control session pagination without terminal flooding.
  - Streamlined `sweep scan` and `sweep clean` output formatting for clean visual hierarchy.
- **Single-Tool Dedicated Scoping (`--tool <id>`)**:
  - Unified `--tool <id>` filtering across all CLI subcommands (`scan`, `clean`, `sessions list`, `sessions clean`, `targets`, `restore`).
  - Added strict tool ID validation with actionable error feedback and supported tool suggestions.
  - Implemented tool-scoped visual banners (`Sweep scan  [tool: <Tool Name>]  [<platform>]  <home>`).
- **VS Code Extension: Uninstalled Tools Toggle (`sweep.toggleHideUninstalled`)**:
  - Added title bar command and view action (`$(eye)`) to toggle `sweep.hideUninstalledTools` between hiding and displaying uninstalled / empty tools.
  - Immediate dynamic TreeView refresh with informative status notifications.
- **VS Code Extension: Custom Paths GUI Picker (`sweep.addCustomPath`)**:
  - Added interactive folder picker command (`$(folder-library)`) to configure custom AI tool storage directories directly via GUI.
  - Synchronously updates both VS Code workspace settings and `~/.sweep/config.json`.
- **Dynamic Capacity Calculation & Feedback**:
  - Enhanced all clean operations with immediate post-clean capacity updates and detailed freed disk space notifications.
- **Full Test Suite & Quality Assurance (122 Tests Passed)**:
  - Added automated end-to-end tests for output folding, single-tool scoping, and tool validation. All 122 tests pass with 100% success rate.

---

## [1.1.9] - 2026-08-31

### ✨ Features & Enhancements

#### AWS Kiro & ByteDance Trae Deep Optimization (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Full Product Line Separation for AWS Kiro & ByteDance Trae**:
  - Implemented separated product lines matching Antigravity and Codex architectures:
    - **AWS Kiro**: `kiro` (Unified), `kiro-ide` (Kiro IDE Chat Store & Electron Cache), and `kiro-cli` (Kiro CLI Sessions, Knowledge Bases, & Logs).
    - **ByteDance Trae**: `trae` (Unified), `trae-ide` (Trae / Trae CN IDE SQLite DB, CKG, & Cache), and `trae-cli` (Trae CLI / SOLO Autonomous Agent Project Memory & Worktrees).
- **AWS Kiro .chat & CLI Session Parsing Engine (`kiro.ts`)**:
  - Implemented dedicated `kiro.ts` adapter supporting `.chat` files and Hash directory sessions under `%APPDATA%\Kiro\User\globalStorage\kiro.kiroagent` and `~/.kiro/sessions/`.
  - Robust JSON / JSONL parser extracting user prompts, project names (`workspacePath`, `workspaceUri`, `cwd`), and timestamps with CJK 26-column display width truncation.
  - Strict protection for `~/.kiro/extensions/` (CLI extension install directory, never deleted), `steering/`, `skills/`, and `settings/`.
- **ByteDance Trae SQLite WAL Trio Aggregation & SOLO Memory (`trae.ts`)**:
  - Implemented SQLite WAL trio aggregation for `ModularData\ai-agent\database.db`, linking `database.db-wal` and `database.db-shm` into a single consolidated session with aggregated file sizes and unified deletion/backup handling.
  - Added SOLO agent project memory parser for `~/.trae/memory/` and task worktree state `~/.trae/worktrees/`.
  - Precision cache targeting for `.ckg` (Code Knowledge Graph), `ckg_server`, `WebStorage`, `monitor`, `Partitions`, `Code Cache`, and `aha`/`ahanet`.
  - Permanent security protection for `~/.trae/rules/**`, `skills/**`, `builtin_skills/**`, `permission/**`, `settings/**`, `trae-jwt-token`, `argv.json`, and `skill-config.json`.
- **Zero-PII Sanitation & Full Test Suite (111 Tests, 15 Test Files)**:
  - 100% test coverage across 15 test files with 111 unit & E2E tests, verifying complete platform independence and zero PII leaks.

---

## [1.1.8] - 2026-08-31

### ✨ Features & Enhancements

#### Codeium Windsurf & Cascade Deep Optimization (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Cascade Multi-Format Session & SQLite WAL Parsing Engine**:
  - Implemented dedicated `windsurf.ts` adapter module supporting both directory-based sessions (`~/.codeium/windsurf/cascade/<session-uuid>/`) and single-file sessions (`.json`, `.jsonl`, `.pb`).
  - Added robust SQLite WAL trio aggregation: automatically links `<session-id>.db`, `<session-id>.db-wal`, and `<session-id>.db-shm` into a single consolidated conversation session with summed byte sizes and associated file paths.
  - Implemented defensive JSON/JSONL stream parser (inspecting up to first 40 records) extracting user prompts, project names (`workspaceUri`, `workspacePath`, `cwd`, `repoPath`), and timestamps.
  - Applied East Asian CJK display width truncation (26 visual columns) with friendly fallback timestamps (`Session (MM-DD HH:mm)`).
- **Code Tracker History & Snapshot Separation**:
  - Added `ws-snapshots` target mapping `~/.codeium/windsurf/code_tracker/history` (historical rewind snapshots) under low-risk cache targets, enabling significant disk space reclamation while preserving active tracking state (`active/`).
- **Comprehensive Cross-Platform IDE Cache Topology**:
  - Expanded Windsurf cache definitions across Windows (`%APPDATA%\Windsurf`, `%LOCALAPPDATA%\Windsurf`, `Windsurf - Next`, `Windsurf - Nightly`, and `%APPDATA%\devin` historical/variant folders), macOS (`~/Library/Application Support/Windsurf`, `~/Library/Caches/Windsurf`, `com.exafunction.windsurf`), and Linux (`~/.config/Windsurf`, `~/.cache/Windsurf`).
  - Precise targeting of `Cache`, `CachedData`, `GPUCache`, `Code Cache`, `DawnWebGPUCache`, `DawnGraphiteCache`, `CachedExtensionVSIXs`, `blob_storage`, `Crashpad`, `logs`, `WebStorage`, and `User\workspaceStorage`.
- **Permanent Memory & MCP Configuration Protection**:
  - Enforced permanent `NEVER_DELETE_GLOBS` protection for `~/.codeium/windsurf/mcp_config.json` (MCP server definitions), `~/.codeium/windsurf/memories/**` (`*.pb` memories and `global_rules.md`), `~/.codeium/windsurf/skills/**`, `global_workflows/`, `workflows/`, `user_settings.pb`, `installation_id`, `~/.windsurf/plans/**`, and `.devin-shared/**`.

---

## [1.1.7] - 2026-08-31

### ✨ Features & Enhancements

#### Anthropic Claude Code & Claude Desktop Deep Optimization (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Project & Session Association Engine (`decodeClaudeProjectSlug`)**:
  - Implemented bidirectional project slug decoder supporting Windows format (`C__Users_name_Projects_my-app`), POSIX format (`-Users-name-Projects-my-app`), and URL-encoded paths to cleanly restore readable project names.
  - Implemented defensive JSONL parser supporting 2026 schema (`type: "user"`, `message.content` text/array, `cwd`, `timestamp`, `sessionId`), extracting human user prompts as session titles with East Asian CJK display width alignment.
  - Recursively associated project session JSONL files with their corresponding subagent/tool-result artifact directories (`~/.claude/projects/<slug>/<session-id>/`).
- **File History Cache Separation & Disk Reclaim**:
  - Distinctly separated `~/.claude/file-history/` (large edit rollback snapshots) and `paste-cache/` / `uploads/` from permanent configurations, enabling safe disk space reclamation.
  - Classified `~/.claude/stats-cache.json`, `usage-data/`, `cache/` (changelog), and `downloads/` under low-risk fast cache clean targets.
- **Claude Desktop Electron Runtime Integration**:
  - Added support for Claude Desktop application cache and log targets on Windows (`%LOCALAPPDATA%\Claude-Data`, `%LOCALAPPDATA%\Claude\logs`, `%APPDATA%\Claude`), macOS (`~/Library/Application Support/Claude`, `~/Library/Caches/Claude`), and Linux (`~/.config/Claude`, `~/.cache/Claude`).
- **Strict Permanent Whitelist & MCP Protection**:
  - Added permanent `NEVER_DELETE_GLOBS` protection for `claude_desktop_config.json` (MCP server definitions), `~/.claude/memory/**` (`MEMORY.md` long-term project memory), `settings.json`, `.claude.json`, `CLAUDE.md`, `skills/`, and `plugins/`.


---

## [1.1.6] - 2026-08-31

### ✨ Features & Enhancements

#### OpenAI Codex Deep Optimization & Session Engine (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Deep Hierarchical Session Discovery**:
  - Implemented recursive scanner supporting Codex nested date session structures (`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`) and archived sessions.
  - Linked `~/.codex/session_index.jsonl` to map session UUIDs with `thread_name` topics (e.g. "修正 TUI 錯誤訊息遺失", "新增三個 llama.cpp 模型") for instant semantic identification.
  - Extracted real workspace project roots from `turn_context` (`cwd` / `workspace_roots`).
  - Implemented human prompt extraction from `response_item` (`input_text`) and `event_msg` (`user_message` / `UserMessage`), automatically skipping injected system `<environment_context>` blocks.
  - Applied East Asian CJK display width truncation (26 visual columns) with elegant ellipsis fallback.
- **Product Line Separation (Codex Desktop vs Codex CLI)**:
  - Added `codex-desktop` tool definition with verified Windows MSIX package storage paths (`%LOCALAPPDATA%\Packages\OpenAI.Codex_*\LocalCache\Roaming\Codex\` including `web/`, `Cache/`, `GPUCache/`, `Logs/`, and `AC/INetCache`), plus macOS and Linux Electron paths.
  - Added `codex-cli` tool definition focusing on `.tmp/` (downloads & marketplaces), `plugins/cache/`, `visualizations/`, `models_cache.json`, and CLI execution traces.
  - Preserved `codex` umbrella tool entry for full backward compatibility.
- **Security & Core Agent Memory Protection**:
  - Protected `.sandbox-bin/` (`codex.exe`, `codex-command-runner-*.exe`), `.sandbox/`, `.sandbox-secrets/`, `auth.json`, `rules/`, `skills/`, and `pets/` (Desktop companion sprites & configs) via strict `NEVER_DELETE_GLOBS`.
  - Classified `memories_1.sqlite` and `goals_1.sqlite` under high-risk agent long-term memory targets to prevent unintended deletion.

#### VS Code Extension UI & QuickPick Enhancements (`sweep-aicleaner`)
- **Marketplace PNG Icon**:
  - Added 128x128 high-resolution `media/icon.png` and configured `"icon": "media/icon.png"` in `package.json`, resolving the blank icon issue in the VS Code Extensions manager view.
- **Session Picker Software Source Tagging**:
  - Added distinct `[ToolName]` prefixes in QuickPick items for `sweep.pickSessionsToClean` and `sweep.exportSession` (e.g., `[Codex] 修正 TUI 錯誤訊息遺失`, `[Antigravity IDE] Refactor auth`), allowing effortless tool filtering and multi-tool session management.

---

## [1.1.5] - 2026-08-31

### ✨ Features & Enhancements

#### Google Antigravity Deep Optimization & Semantic Session Unification (`@aicleaner/core`, `@aicleaner/cli`, `sweep-aicleaner`)
- **Semantic Session & Brain Unification**:
  - Unified `brain/<UUID>` directories and `conversations/<UUID>.db` SQLite databases into single logical `ConversationSession` entities with matching UUIDs.
  - Eliminated random UUID clutter, orphan `.db-wal` / `.db-shm` display fragments, and double-counting in storage statistics.
  - Dual-path deletion and backup: cleaning an Antigravity session now safely and atomically removes both the Brain memory directory and SQLite database files simultaneously.
- **East Asian Display Width Aware Title Sanitization & Truncation**:
  - Implemented East Asian Character Width (`getDisplayWidth`, `truncateByDisplayWidth`) ensuring uniform terminal/treeview alignment (CJK characters = 2 columns, ASCII = 1 column, target: 26 columns).
  - Sanitization pipeline strips IDE injected XML tags (`<USER_REQUEST>`, `<ADDITIONAL_METADATA>`), file mention long paths (`@[c:\...\file.md:L1-L20]`), and markdown artifacts to prioritize real human prompts.
  - Automatic timestamp fallback (`Session (MM-DD HH:mm)`) when no text prompt exists.
  - Early-break stream reader parses `transcript.jsonl` in < 2.5ms per session without memory overhead.
- **Safety Protection Boundaries for Memory & Checkpoints**:
  - Added strict `NEVER_DELETE_GLOBS` protection for `~/.gemini/history/**` (Shadow Git checkpoints / rewind repos), `~/.gemini/**/knowledge/**` (Agent long-term memory & knowledge graph), `builtin/**` (skills), and engine binaries (`bin/`).
  - Added `google_accounts.json`, `oauth_creds.json`, and `GEMINI.md` to permanent protection rules.
- **Real Electron Cache Path Resolution**:
  - Corrected Windows Electron cache path to `%APPDATA%\Antigravity IDE` (accounting for space in directory name), successfully discovering Chrome and V8 cache data.
  - Categorized `daemon/` Language Server logs and `crashes/` (0-byte logs) under safe-to-delete cache targets.
- **VS Code Tree View & UI Improvements**:
  - Added `sweep.hideUninstalledTools` setting to dynamically hide AI tools not installed on the local machine or occupying 0 B.
  - Enriched Session Tree Item tooltips with detailed storage breakdowns across linked brain directories and SQLite databases.

---

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
