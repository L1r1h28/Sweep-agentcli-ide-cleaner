# @aicleaner/cli 💻

> Cross-platform CLI companion for Sweep — scan, inspect, and safely clean AI IDE caches and conversation databases directly from your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

`@aicleaner/cli` provides the `sweep` and `aicleaner` commands. It leverages `@aicleaner/core` to give developers fast, scriptable access to storage inspection and cleanup operations.

---

## ⚡ Installation & Execution

### 1. Direct Download (Pre-built Single Executable Binaries)

No Node.js runtime required! Download zero-dependency binaries for your operating system directly from **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)**:
- **Windows x64**: `sweep-windows-x64.exe`
- **macOS (Apple Silicon)**: `sweep-darwin-arm64`
- **macOS (Intel)**: `sweep-darwin-x64`
- **Linux x64**: `sweep-linux-x64`

```bash
# Example (Linux/macOS):
chmod +x sweep-linux-x64
./sweep-linux-x64 scan
```

### 2. Run via Node.js / Local Execution

```bash
# Direct run from source / repository
node packages/cli/src/cli.mjs scan
```

### 3. Pack and Install Globally

```bash
cd packages/cli
npm run build
npm pack
npm install -g aicleaner-cli-1.0.0.tgz
```

---

## 📖 Command Guide

`@aicleaner/cli` registers two command aliases: `sweep` and `aicleaner`.

```text
Usage:
  sweep scan    [--tool <id>] [--json] [--verbose]
  sweep clean   --kind cache|conversations|all [--tool <id>] [--dry-run] [--force] [--no-backup]
  sweep tools   [--verbose]
  sweep targets [--tool <id>]
  sweep help
```

### 1. `sweep scan`
Measures and prints storage breakdown across all supported AI tools.

```bash
# Basic summary table
sweep scan

# Detailed tree with paths, size per target, and file counts
sweep scan --verbose

# Scan a single tool and output JSON format for scripts/CI
sweep scan --tool codex --json
```

### 2. `sweep clean`
Executes cleaning on caches, conversations, or both. **Dry-run mode is enabled by default unless `--force` is provided.**

```bash
# Preview what cache files would be removed (Dry-Run)
sweep clean --kind cache --dry-run

# Actually clean all safe caches (Electron/GPU/IndexedDB caches)
sweep clean --kind cache --force

# Clean conversation history with automatic backup to ~/AI-Cleaner-Backups/
sweep clean --kind conversations --force

# Clean conversations without creating a backup
sweep clean --kind conversations --force --no-backup

# Target only a specific tool
sweep clean --tool windsurf --kind cache --force
```

### 3. `sweep tools` & `sweep targets`
List supported tools and view active system path resolutions:

```bash
# List all supported tools and product notes
sweep tools -v

# Inspect resolved file paths and risk ratings for each target
sweep targets --tool antigravity
```

---

## 🛡️ Flags & Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--kind <type>` | `cache` \| `conversations` \| `all` | **(Required for `clean`)** Target data category. |
| `--tool <id>` | string | Limit operation to a single tool (`antigravity`, `codex`, `claude-code`, `windsurf`, `kiro`, `trae`). |
| `--dry-run` | boolean | Preview files that would be deleted without making disk changes. |
| `--force` | boolean | Confirms deletion. Required to perform actual removal. |
| `--no-backup` | boolean | Disables automated backup archive when cleaning conversations. |
| `--json` | boolean | Output scan results as formatted JSON. |
| `--verbose` / `-v` | boolean | Display detailed path, target, and product information. |

---

## ⚠️ Safety Defaults

- **Dry-run by Default**: `sweep clean` requires `--force` to prevent accidental deletion.
- **Protected Environment Guard**: Codex runtime (`.sandbox-bin/`), Kiro extensions (`.kiro/extensions`), and tool configuration files (`*.json`, `*.toml`) are permanently excluded and can never be cleaned.

---

## 📄 License

MIT © [L1r1h28](../../LICENSE)