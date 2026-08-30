# Sweep — AI Tools Cleaner (VS Code Extension) 🧹

> Visual Studio Code & Cursor extension for inspecting storage footprint and cleaning caches vs. conversation history for modern AI coding tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` brings the power of Sweep directly into your IDE. Quickly discover how many gigabytes are consumed by background AI caches, IndexedDB stores, and agent session databases without leaving your editor.

---

## 🌟 Key Features

- 📊 **Activity Bar Integration**: Dedicated **Sweep** icon in the Activity Bar for quick storage inspection.
- ⚡ **Safe Cache Clearing**: One-click cleanup for Electron cache, GPU cache, and knowledge graph indexes without losing chats.
- 💬 **Conversation & Agent State Management**: Granular control over conversation records with high-risk warning confirmation.
- 🛡️ **Dry-Run & Backup Support**: Preview estimated space recovery and quickly open the local backup directory (`~/.sweep-cleaner/backups` / `~/AI-Cleaner-Backups`).
- 🤖 **Comprehensive Tool Support**: Works across Antigravity, OpenAI Codex, Claude Code, Windsurf, Kiro, and Trae IDE.

---

## 🛠️ Contributed Commands

| Command | Title | Description |
| :--- | :--- | :--- |
| `sweep.scanStorage` | **Sweep: Scan storage** | Scans and computes disk consumption across AI tools. |
| `sweep.cleanStorage` | **Sweep: Clean storage** | Prompts confirmation dialog for dry-run or real clean execution. |
| `sweep.cleanCache` | **Sweep: Clean all cache (safe)** | Purges Electron, GPU, and IndexedDB caches safely. |
| `sweep.cleanConversations` | **Sweep: Clean all conversations** | Cleans transcripts and session databases (with confirmation). |
| `sweep.openBackupFolder` | **Sweep: Open backup folder** | Opens the local backup directory in your system file manager. |
| `sweep.dryRun` | **Sweep: Dry-run all** | Runs a non-destructive simulation to estimate recoverable space. |

---

## 📦 Packaging & Local Installation

### Build & Package (.vsix)

```bash
# 1. Install dependencies from workspace root
npm install

# 2. Package the extension
cd packages/vscode-extension
npm run build
npm run pack
```

### Install in VS Code / Cursor

```bash
code --install-extension sweep-aicleaner-0.2.0.vsix
# or in Cursor:
cursor --install-extension sweep-aicleaner-0.2.0.vsix
```

---

## 🏗️ Architecture

The extension is bundled using `esbuild` into a single, self-contained CommonJS file (`dist/extension.js`), consuming `@aicleaner/core` while keeping Node.js built-ins external for maximum compatibility across VS Code versions.

---

## 📄 License

MIT © [L1r1h28](../../LICENSE)