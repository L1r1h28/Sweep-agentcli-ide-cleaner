# Sweep (AI Coding Tools Cleaner) 🧹

> One-click scan, precise isolation, and safe cleanup for caches and conversation histories across major AI coding assistants and AI IDEs.

<p align="left">
  <strong>English</strong> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

With the heavy use of AI-assisted development tools (such as Antigravity, Codex, Claude Code, Windsurf, etc.), local disks quickly accumulate gigabytes of Electron caches, GPU cache, IndexedDB, and massive conversation logs with Agent memories.

**Sweep** provides a unified cross-platform core engine, CLI tool, and VS Code / Cursor extension to help developers precisely reclaim storage space while preventing the accidental deletion of sandbox runtimes and essential extensions.

---

## ✨ Core Features

- 🎯 **Precise Classification (Cache vs. Conversations)**:
  - 💾 **Cache (Low Risk)**: Electron cache, GPU cache, IndexedDB, and knowledge graph caches—safe to reclaim at any time.
  - 💬 **Conversations (High Risk)**: Agent memory (Brain), SQLite databases, and session transcripts—protected with strict safety guards.
- 🛡️ **Never-Delete Guard (Whitelist Protection)**:
  - Strictly protects configuration files (`settings.json`, `config.toml`, `mcp_config.json`, `auth.json`, etc.).
  - Bypasses runtime and plugin directories (e.g., Codex's `.sandbox-bin` binaries, Kiro's `~/.kiro/extensions` store).
- 🗄️ **Automatic Backup Protection**: Automatically archives conversation logs to `~/.sweep/backups/` before performing destructive deletions.
- 🔍 **Dry-Run Simulation**: Preview reclaimable disk space and target file lists without touching the disk.
- 🌐 **Cross-Platform Support**: Fully supports Windows, macOS, and Linux.
- 📦 **Monorepo Architecture**: Includes a shared core library, standalone CLI binary, and VS Code Extension.

---

## 🛠️ Supported AI Tools Matrix

| Tool | Covered Products | Disk Usage Hotspots | Protected Items (Never Deleted) |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | IDE, Desktop 2.0, CLI (`agy`) | `brain/`, `conversations/` (.pb/.db), `WebStorage` | `bin/`, `config/`, `builtin/` |
| **OpenAI Codex** | CLI, Desktop App | `sessions/` (JSONL), `memories/`, `thread_history` | `.sandbox-bin/` (sandbox env), `auth.json` |
| **Anthropic Claude Code** | CLI, VS Code/JetBrains, Desktop | `projects/` (Session JSONL), `file-history/` | `settings.json`, `CLAUDE.md` |
| **Codeium Windsurf** | IDE, Cascade | `cascade/` (chats & memory), `CachedData` | `mcp_config.json` |
| **AWS Kiro** | IDE, CLI | `kiro.kiroagent` (.chat), `sessions/` | `~/.kiro/extensions/` (plugins), `steering/` |
| **ByteDance Trae** | IDE, SOLO | `database.db` (SQLite WAL files), `CachedData` | Project-level `.trae/` settings |

> For detailed directory structures and capacity analysis, refer to [AI IDE Storage Paths Reference](docs/storage-paths.md).

---

## 📥 Download & Installation

You can get Sweep via **pre-built standalone binaries / VSIX** (no Node.js runtime required) or via **npm**:

### Option 1: Direct Download (GitHub Releases)

Download pre-built standalone binaries and extensions directly from **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)**:

| Platform / Environment | File / Asset | Usage & Installation |
| :--- | :--- | :--- |
| **Windows x64** | `sweep-windows-x64.exe` | Run directly in PowerShell / CMD (e.g. `.\sweep-windows-x64.exe scan`) |
| **macOS (Apple Silicon)** | `sweep-darwin-arm64` | `chmod +x sweep-darwin-arm64 && ./sweep-darwin-arm64 scan` |
| **macOS (Intel)** | `sweep-darwin-x64` | `chmod +x sweep-darwin-x64 && ./sweep-darwin-x64 scan` |
| **Linux x64** | `sweep-linux-x64` | `chmod +x sweep-linux-x64 && ./sweep-linux-x64 scan` |
| **VS Code / Cursor / Windsurf** | `sweep-aicleaner-1.0.0.vsix` | Install via editor menu (*Extensions: Install from VSIX...*) or `code --install-extension <file>.vsix` |

### Option 2: Run via Node.js / npm

```bash
# Run directly from source / workspace
node packages/cli/src/cli.mjs scan

# Or build & install CLI globally
cd packages/cli && npm pack
npm install -g aicleaner-cli-1.0.0.tgz
```

---

## 🚀 Quick Start

### 1. Using the CLI Tool

![Sweep CLI Demo](assets/cli.png)

Sweep CLI registers both `sweep` and `aicleaner` commands:

```bash
# Scan storage usage across all AI tools
sweep scan

# Show detailed breakdown of target paths and file counts
sweep scan --verbose

# Scan a specific tool (supports JSON output)
sweep scan --tool antigravity --json

# Dry-run cleanup (preview without deleting files)
sweep clean --kind cache --dry-run
sweep clean --kind conversations --dry-run

# Safely clean cache across all tools
sweep clean --kind cache --force

# Granular conversation cleaning: filter older than 30 days
sweep clean --kind conversations --older-than 30d --force

# Granular conversation cleaning: remove bloated sessions (>50MB)
sweep clean --kind conversations --min-size 50mb --force

# Inspect individual conversation sessions with age and size
sweep sessions list
sweep sessions list --older-than 30d --min-size 10mb --project my-project

# Export conversation session to readable Markdown or structured JSON
sweep sessions export <sessionId> --format md --out ./exports

# Clean specific filtered sessions
sweep sessions clean --older-than 30d --force

# Inspect all local backup archives
sweep backups list

# Prune expired backups older than 14 days
sweep backups prune --older-than 14d --force

# One-click restore from latest backup
sweep restore latest --force

# Restore specific tool from a targeted backup timestamp
sweep restore 2026-08-30T10-00-00 --tool claude-code --force
```

#### CLI Command Flags

| Command / Option | Description |
| --- | --- |
| `scan` | Scan and summarize total disk footprint (caches vs. conversations) |
| `clean` | Run cleanup process (requires `--kind` or granular filter flags) |
| `sessions [list\|clean\|export]` | Granular inspection, filtering, deletion, and export of chat sessions |
| `backups [list\|prune]` | List and prune local sweep backup archives |
| `restore [<id>\|latest]` | One-click restore previous cache or conversation archives |
| `tools` | List all supported AI tools and cleanup caveats |
| `targets` | List all managed directory paths and risk levels |
| `--kind <k>` | Target category: `cache`, `conversations`, `all` |
| `--tool <id>` | Limit to specific tool: `antigravity`, `codex`, `claude-code`, `windsurf`, `kiro`, `trae` |
| `--older-than <dur>` | Filter sessions or backups older than duration (e.g. `7d`, `14d`, `30d`, `90d`) |
| `--newer-than <dur>` | Filter sessions newer than duration |
| `--min-size <size>` | Filter sessions larger than size (e.g. `50mb`, `100kb`, `1gb`) |
| `--max-size <size>` | Filter sessions smaller than size |
| `--keep-latest <n>` | Retain the most recent N backups and prune the rest |
| `--project <name>` | Filter sessions by project or workspace keyword |
| `--format <md\|json>` | Export session format (Markdown or JSON) |
| `--out <dir>` | Destination directory for exported sessions |
| `--dry-run` | List candidate files and sizes without modifying anything |
| `--force` | Confirm actual deletion or restoration overwrite (failsafe protection) |
| `--no-backup` | Skip automatic backup archiving before deletion |
| `--json` | Output in standard JSON format (usable with `scan` and `sessions list`) |

---

### 2. VS Code Extension

Install `sweep-aicleaner` in VS Code or compatible IDEs (Cursor / Trae / Windsurf):

1. Click the **Sweep** icon in the Activity Bar to open the panel.
2. Click **Scan storage** at the top to check local usage.
3. Trigger **Clean cache** or **Clean conversations** for specific tools.
4. Quickly navigate and open the automatic backup directory.

![VS Code Extension Overview](assets/fullscreen.png)

*Interactive Confirmation & Dry-run Modal:*

![Clean Cache Confirmation Dialog](assets/notify.png)

---

## 📂 Project Architecture (Monorepo)

Managed via npm workspaces:

```text
Sweep-agentcli-ide-cleaner/
├── packages/
│   ├── core/               # Shared core library (Catalog, Path Resolver, Scanner, Cleaner)
│   ├── cli/                # Cross-platform CLI binary (npm bin: sweep / aicleaner)
│   └── vscode-extension/   # VS Code Extension (Activity Bar UI & Commands)
├── docs/
│   └── storage-paths.md    # Storage directory analysis & documentation
├── .github/workflows/      # CI testing & GitHub Releases automation workflows
├── package.json            # Monorepo root config
└── LICENSE                 # MIT License

```

---

## 💻 Development & Build

### Prerequisites

* **Node.js**: `>= 18.0.0`
* **npm**: `>= 8.0.0`
* *(Optional)* **Bun**: For building standalone single-file binaries

### Install & Build

```bash
# Install all workspace dependencies
npm install

# Build all packages (Core + CLI + Extension)
npm run build

# Run unit tests (Vitest)
npm run test

```

### Packaging

```bash
# Package CLI
cd packages/cli && npm pack

# Package VS Code Extension (.vsix)
cd packages/vscode-extension
npx @vscode/vsce package --no-dependencies --allow-missing-repository

```

---

## ⚠️ Safety & Disclaimers

* **Conversation Deletion is Irreversible**: Once AI Agent Memory, Transcripts, and SQLite databases are deleted, conversation context cannot be restored inside your IDE (unless restored manually from `~/.sweep/backups/`).
* **Shared Directory Warning**: OpenAI Codex CLI and Desktop App share `~/.codex/sessions`. Deleting conversation sessions will affect both terminal and GUI clients.
* **Close IDEs Before Cleaning**: When cleaning tools that use SQLite WAL mode (such as Trae's `database.db`, `database.db-wal`, `database.db-shm`), it is recommended to completely close the IDE first.

---

## 📄 License & Acknowledgments

- This project is licensed under the [MIT License](LICENSE).
- Icons based on [Lucide](https://lucide.dev), [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).