# Sweep (AI Coding Tools Cleaner) 🧹

> One-click scan, precise isolation, and safe cleanup for caches and conversation histories across major AI coding assistants and AI IDEs.

<p align="left">
  <strong>English</strong> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@l1r1h28/sweep-cli.svg)](https://www.npmjs.com/package/@l1r1h28/sweep-cli)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

With the heavy use of AI-assisted development tools (such as Antigravity, Codex, Claude Code, Windsurf, AWS Kiro, ByteDance Trae, etc.), local disks quickly accumulate gigabytes of Electron caches, GPU caches, IndexedDB, and massive conversation logs with Agent memories.

**Sweep** provides a unified cross-platform core engine, CLI tool, and VS Code / Cursor extension to help developers precisely reclaim storage space while preventing accidental deletion of configuration files, sandbox runtimes, and essential extensions.

---

## ✨ Core Features

- 🎯 **Precise Classification (Cache vs. Conversations)**:
  - 💾 **Cache (Low Risk)**: Electron cache, GPU cache, IndexedDB, and knowledge graph caches—safe to reclaim at any time.
  - 💬 **Conversations (High Risk)**: Agent memory (Brain), SQLite databases, and session transcripts—protected with strict safety guards and confirmation.
- 🛡️ **Never-Delete Guard (Whitelist Protection)**:
  - Strictly protects configuration files (`settings.json`, `config.toml`, `mcp_config.json`, `auth.json`, `CLAUDE.md`, etc.).
  - Bypasses runtime and plugin directories (e.g., Codex's `.sandbox-bin` binaries, Kiro's `~/.kiro/extensions` store, Trae's `skills/`).
- 🗄️ **Automatic Backup Protection**: Automatically archives conversation logs to `~/.sweep/backups/` before performing destructive deletions, with one-click restore.
- 🔍 **Dry-Run Simulation**: Preview reclaimable disk space and target file lists without touching the disk.
- 📋 **Output Folding & Scoped Scans**: Clean terminal summaries with `--limit` pagination, `--tool <id>` dedicated scans, and granular filters.
- 🌐 **Cross-Platform Support**: Fully supports Windows, macOS (Apple Silicon & Intel), and Linux.
- 📦 **Monorepo Architecture**: Shared core library (`@l1r1h28/sweep-core`), standalone CLI (`@l1r1h28/sweep-cli`), and VS Code Extension (`sweep-aicleaner`).

---

## 🛠️ Supported AI Tools Matrix (15 Product Lines)

| Tool Line | Product ID / Scopes | Disk Usage Hotspots | Protected Items (Never Deleted) |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | `antigravity` (All)<br>`antigravity-ide` (IDE)<br>`antigravity-desktop` (2.0)<br>`antigravity-cli` (`agy`) | `brain/`, `conversations/` (.pb/.db), `WebStorage`, `logs/` | `bin/`, `config/`, `builtin/`, `mcp_config.json` |
| **OpenAI Codex** | `codex` (All)<br>`codex-cli` (CLI)<br>`codex-desktop` (Desktop App) | `sessions/` (JSONL), `memories/`, `thread_history`, `Cache` | `.sandbox-bin/` (sandbox env), `auth.json`, `config.toml` |
| **Anthropic Claude** | `claude` (All)<br>`claude-code` (CLI)<br>`claude-desktop` (Desktop App) | `projects/` (Session JSONL), `file-history/`, `Electron Cache` | `settings.json`, `CLAUDE.md`, `claude_desktop_config.json` |
| **Codeium Windsurf** | `windsurf` (IDE & Cascade) | `cascade/` (chats & memory), `CachedData`, `code_tracker/history` | `mcp_config.json`, `memories/*.pb`, `skills/`, `workflows/` |
| **AWS Kiro** | `kiro` (All)<br>`kiro-ide` (IDE)<br>`kiro-cli` (CLI) | `kiro.kiroagent` (.chat), `sessions/`, `logs/` | `~/.kiro/extensions/` (plugins), `steering/`, `skills/`, `settings/` |
| **ByteDance Trae** | `trae` (All)<br>`trae-ide` (IDE)<br>`trae-cli` (SOLO CLI) | `ModularData` (`database.db` SQLite WAL trio), `.ckg`, `memory/` | `~/.trae/rules/**`, `skills/**`, `settings/**`, `trae-jwt-token` |

> For detailed directory structures and capacity analysis, refer to [AI IDE Storage Paths Reference](docs/storage-paths.md).

---

## 📥 Download & Installation

You can run Sweep via **npm / npx**, download **pre-built standalone binaries** (no Node.js required), or install the **VS Code Extension**:

### Option 1: Run via npx / npm (Instant & Always Up-to-Date)

```bash
# Run directly without global install:
npx @l1r1h28/sweep-cli scan

# Or install globally:
npm install -g @l1r1h28/sweep-cli
sweep scan
```

### Option 2: Direct Download Standalone Binaries (GitHub Releases)

Download pre-built standalone binaries and VSIX extensions directly from **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)**:

| Platform / Environment | Asset Name | Usage & Installation |
| :--- | :--- | :--- |
| **Windows x64** | `sweep-windows-x64.exe` | Run directly in PowerShell / CMD (`.\sweep-windows-x64.exe scan`) |
| **macOS (Apple Silicon)** | `sweep-darwin-arm64` | `chmod +x sweep-darwin-arm64 && ./sweep-darwin-arm64 scan` |
| **macOS (Intel)** | `sweep-darwin-x64` | `chmod +x sweep-darwin-x64 && ./sweep-darwin-x64 scan` |
| **Linux x64** | `sweep-linux-x64` | `chmod +x sweep-linux-x64 && ./sweep-linux-x64 scan` |
| **VS Code / Cursor / Windsurf** | `sweep-aicleaner-1.2.0.vsix` | Install via editor menu (*Extensions: Install from VSIX...*) or `code --install-extension sweep-aicleaner-1.2.0.vsix` |

---

## 🚀 Quick Start

### 1. Using the CLI Tool

![Sweep CLI Demo](assets/cli.png)

Sweep CLI registers both `sweep` and `aicleaner` commands:

```bash
# 1. Storage Scan & Diagnostics
sweep scan                                     # Scan all AI tools
sweep scan --verbose                           # Show detailed path breakdown
sweep scan --tool antigravity                  # Scan single tool product line
sweep scan --json                              # Machine-readable JSON output

# 2. Safe Cache Cleanup (Low Risk)
sweep clean --kind cache --dry-run             # Preview cache files to be deleted
sweep clean --kind cache --force               # Reclaim Electron/GPU/index caches
sweep clean --kind cache --tool windsurf --force # Clean cache for specific tool

# 3. Conversation & Session Cleanup (High Risk, Auto-Backed-Up)
sweep clean --kind conversations --dry-run     # Preview conversation cleanup
sweep clean --kind conversations --older-than 30d --force # Clean sessions older than 30 days
sweep clean --kind conversations --min-size 50mb --force  # Clean large bloated sessions (>50MB)
sweep clean --kind conversations --project my-project --force # Clean sessions for specific project

# 4. Granular Session Inspection & Export
sweep sessions list                            # List top 20 sessions (with output folding)
sweep sessions list --all                      # List all sessions without folding
sweep sessions list --limit 50 --tool claude-code # Filter sessions by limit and tool
sweep sessions export <sessionId> --format md --out ./exports # Export chat history to Markdown
sweep sessions clean --older-than 30d --force  # Clean filtered sessions

# 5. Backup Management & One-Click Restore
sweep backups list                             # List all local backup archives in ~/.sweep/backups/
sweep backups prune --older-than 14d --keep-latest 5 --force # Prune expired backups
sweep restore latest --force                   # One-click rollback from latest backup
sweep restore 2026-08-31T06-00-00 --tool codex --force # Targeted restore for specific tool

# 6. Configuration & Whitelist Protection
sweep config list                              # View shared config (~/.sweep/config.json)
sweep config set hideUninstalledTools true     # Toggle uninstalled tools visibility
sweep whitelist list                           # View protected projects and paths
sweep whitelist add my-secret-project          # Add project name to permanent whitelist
sweep whitelist remove my-secret-project       # Remove project from whitelist
```

#### CLI Command & Option Reference

| Command / Option | Description |
| :--- | :--- |
| `scan` | Measure disk usage across all (or a specific) tool's storage paths |
| `clean` | Delete cache and/or conversations (dry-run by default; requires `--force`) |
| `sessions [list\|clean\|export]` | Granular inspection, filtering, cleaning, and export of chat sessions |
| `backups [list\|prune]` | List and prune local sweep backup archives |
| `restore [<id>\|latest]` | One-click restore previous cache or conversation history from backups |
| `config [list\|path\|get\|set]` | Inspect and update persistent configuration settings |
| `whitelist [list\|add\|remove]` | Manage permanent protection rules (projects, regex patterns, session IDs) |
| `tools` | List all supported AI tools with notes and caveats |
| `targets` | List all managed directory paths, kinds, and safety levels |
| `--kind <cache\|conversations\|all>` | Target cleanup kind |
| `--tool <id>` | Limit operation to specific product line (e.g., `antigravity-ide`, `claude-code`, `trae`) |
| `--limit <n>` / `-n <n>` | Paginate session list to top N items (prevents terminal flooding) |
| `--all` / `-a` | Display all items without output folding |
| `--older-than <dur>` | Filter items older than duration (e.g. `7d`, `14d`, `30d`, `90d`) |
| `--newer-than <dur>` | Filter items newer than duration |
| `--min-size <size>` | Filter items larger than size (e.g. `50mb`, `100kb`, `1gb`) |
| `--max-size <size>` | Filter items smaller than size |
| `--keep-latest <n>` | Retain the most recent N backups during prune |
| `--project <name>` | Filter sessions matching project or workspace name |
| `--format <md\|json>` | Export format for conversation sessions |
| `--out <dir>` | Destination directory for exported sessions |
| `--dry-run` | Preview actions and disk sizes without modifying any files |
| `--force` | Confirm deletion or restore overwrite |
| `--no-backup` | Skip automatic backup creation before deletion |
| `--json` | Output structured JSON data |

---

### 2. Using the VS Code / Cursor Extension

Install `sweep-aicleaner` in VS Code, Cursor, Windsurf, or Trae IDE:

1. Click the **Sweep** broom icon in the Activity Bar to open the panel.
2. Click **Scan storage** (`$(refresh)`) to inspect all AI tools on your machine.
3. Toggle **Hide/Show Uninstalled Tools** (`$(eye)`) to focus only on installed software.
4. Use **Add Custom Path** (`$(folder-library)`) to add non-standard AI cache directories.
5. Click inline actions on specific tools or sessions to Clean, Export, or Protect with Whitelist (`$(shield)`).
6. Restore or prune archives directly via the **Backups** view actions.

![VS Code Extension Overview](assets/fullscreen.png)

*Interactive Confirmation & Dry-run Modal:*

![Clean Cache Confirmation Dialog](assets/notify.png)

---

## 📂 Project Architecture (Monorepo)

Managed via npm workspaces:

```text
Sweep-agentcli-ide-cleaner/
├── packages/
│   ├── core/               # Shared engine (@l1r1h28/sweep-core) - Catalog, Scanner, Cleaner, Adapters
│   ├── cli/                # Cross-platform CLI (@l1r1h28/sweep-cli) - Binaries: sweep & aicleaner
│   └── vscode-extension/   # VS Code Extension (sweep-aicleaner) - Activity Bar UI & Commands
├── docs/
│   ├── ROADMAP.md          # Release roadmap & milestone tracker
│   └── storage-paths.md    # AI tools storage directory breakdown & analysis
├── scripts/                # CI watcher, release bundler, and version bump automation
├── .github/workflows/      # CI testing & automated release workflows
├── package.json            # Monorepo root configuration
└── LICENSE                 # MIT License
```

---

## 💻 Development & Build

### Prerequisites

* **Node.js**: `>= 18.0.0` (Node 24 recommended for SEA binary packaging)
* **npm**: `>= 8.0.0`

### Build & Test

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build all packages (Core + CLI + Extension)
npm run build

# 3. Run full unit & integration test suite (Vitest)
npm test
```

### Packaging

```bash
# Package CLI npm distribution
npm run pack --workspace=@l1r1h28/sweep-cli

# Package VS Code Extension (.vsix)
npm run pack --workspace=sweep-aicleaner
```

---

## ⚠️ Safety & Disclaimers

* **Conversation Deletion is Irreversible**: Once AI Agent Memory, Transcripts, and SQLite databases are deleted, conversation context cannot be restored inside your IDE (unless restored from `~/.sweep/backups/`).
* **Shared Directory Warning**: OpenAI Codex CLI and Desktop App share `~/.codex/sessions`. Deleting conversation sessions will affect both terminal and GUI clients.
* **Close IDEs Before Cleaning**: When cleaning tools that use SQLite WAL mode (such as Trae's `database.db`, `database.db-wal`, `database.db-shm`), it is recommended to close the IDE first to release file locks.

---

## 📄 License & Acknowledgments

- This project is licensed under the [MIT License](LICENSE).
- Publisher: [L1r1h28](https://github.com/L1r1h28)
- Icons based on [Lucide](https://lucide.dev), [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).