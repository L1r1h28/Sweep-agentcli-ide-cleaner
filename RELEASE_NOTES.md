# 🧹 Sweep v${{ inputs.version }} — First CLI Release

## Overview

Sweep is a one-stop CLI for scanning and cleaning AI coding tool caches (Electron, GPU, IndexedDB) and conversation histories (sessions, memory, SQLite DBs). This is the **first official CLI release** with cross-platform standalone binaries.

## Downloads

| Platform | Architecture | File |
| -------- | ------------ | ---- |
| Windows  | x64          | `sweep-windows-x64.exe` |
| macOS    | Apple Silicon (M1/M2/M3) | `sweep-darwin-arm64` |
| macOS    | Intel        | `sweep-darwin-x64` |
| Linux    | x64          | `sweep-linux-x64` |

SHA-256 checksums: see `SHA256SUMS.txt`.

## Quick Start

```bash
# Scan all AI tools' disk usage
sweep scan

# Preview cleanup without touching files
sweep clean --kind cache --dry-run

# Clean cache safely
sweep clean --kind cache --force

# Clean conversations (auto-backup to ~/AI-Cleaner-Backups/)
sweep clean --kind conversations --force
```

## What's New

- ✅ **Cross-platform SEA binaries** (Node.js Single Executable Application)
- ✅ **6 AI tools supported**: Antigravity, Codex, Claude Code, Windsurf, Kiro, Trae
- ✅ **Three-tier protection**: `--kind cache` (safe) / `--kind conversations` (destructive) / `--kind all` (both)
- ✅ **Never-Delete Guard**: `.sandbox-bin`, `kiro/extensions`, `settings.json`, `auth.json` are always protected
- ✅ **Auto-backup**: conversations are archived to `~/AI-Cleaner-Backups/<timestamp>/` before deletion
- ✅ **Dry-run by default**: conversations require explicit `--force`

## Supported AI Tools

| Tool         | Cache Cleanup | Conversation Cleanup | Protected Paths |
| ------------ | :-----------: | :------------------: | --------------- |
| Antigravity  | ✅            | ✅                   | `bin/`, `config/`, `builtin/` |
| Codex        | ✅            | ✅                   | `.sandbox-bin/`, `auth.json` |
| Claude Code  | ✅            | ✅                   | `settings.json`, `CLAUDE.md` |
| Windsurf     | ✅            | ✅                   | `mcp_config.json` |
| Kiro         | ✅            | ✅                   | `~/.kiro/extensions/` |
| Trae         | ✅            | ✅                   | project `.trae/` |

## ⚠️ Safety Notes

- **Conversations are destructive and irreversible** — always use `--dry-run` first
- **Close IDE before cleaning Trae** (uses SQLite WAL mode)
- **Codex CLI and Desktop share `~/.codex/sessions`** — cleaning affects both
- **Restoration**: `cp -r ~/AI-Cleaner-Backups/<latest>/* ~/.codex/sessions/`

## Verification

Verify your download:
```bash
sha256sum -c SHA256SUMS.txt
```

## License

MIT — see [LICENSE](LICENSE)
