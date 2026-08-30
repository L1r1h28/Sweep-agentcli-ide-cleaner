# @l1r1h28/sweep-core ⚙️

> The headless engine for Sweep — providing AI tool catalogs, cross-platform path resolution, disk scanning, granular session parsing, backup creation, and safety-guarded cleaning routines.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)
[![npm version](https://img.shields.io/npm/v/@l1r1h28/sweep-core.svg)](https://www.npmjs.com/package/@l1r1h28/sweep-core)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

`@l1r1h28/sweep-core` is the core foundation used by both `@l1r1h28/sweep-cli` and `sweep-aicleaner` (VS Code Extension). It provides browser-safe metadata/catalog utilities as well as Node.js-based filesystem scanning, session extraction, and execution capabilities.

---

## 📦 Features

- 🗂️ **15 AI Tool Product Line Catalogs**: Dedicated definitions and adapters for Google Antigravity (IDE/2.0/CLI), OpenAI Codex (CLI/Desktop), Claude Code & Desktop, Codeium Windsurf & Cascade, AWS Kiro (IDE/CLI), and ByteDance Trae (IDE/SOLO).
- 🗺️ **Cross-Platform Path Resolution**: Automatically expands `~`, `%USERPROFILE%`, `%APPDATA%`, and `%LOCALAPPDATA%` across Windows, macOS, and Linux.
- 🛡️ **Never-Delete Guard & Whitelisting**: Regex-based protection layer safeguarding config files (`settings.json`, `auth.json`, `config.toml`, `mcp_config.json`, `CLAUDE.md`), extensions, and runtime environments (`.sandbox-bin/`, `~/.kiro/extensions`, `skills/`).
- 💾 **Safe vs. Destructive Separation**: Strict distinction between `cache` (low risk) and `conversations` (high risk).
- 📦 **Automatic Backup & Restore System**: Creates timestamped backup archives before removing conversation history (`~/.sweep/backups/<timestamp>`) with one-click restore.
- 💬 **Granular Session Parsing Engine**: Extracts chat titles, token counts, timestamps, and project scopes for JSONL, SQLite WAL, `.chat`, and `.pb` archives with CJK 26-column alignment.

---

## 🚀 Installation & Usage

```bash
npm install @l1r1h28/sweep-core
```

### TypeScript / JavaScript Example

```ts
import {
  TOOLS,
  formatBytes,
  scanDisk,
  planClean,
  runClean,
  scanSessions,
  cleanSessions,
} from "@l1r1h28/sweep-core";

// 1. Scan AI tool storage
const report = scanDisk({
  toolIds: ["codex", "antigravity", "windsurf"],
});

console.log(`Total found: ${formatBytes(report.totalBytes)}`);
console.log(`Cache: ${formatBytes(report.cacheBytes)}`);
console.log(`Conversations: ${formatBytes(report.conversationBytes)}`);

// 2. Scan granular conversation sessions
const sessions = scanSessions();
console.log(`Discovered ${sessions.length} conversation sessions across tools.`);

// 3. Plan a clean operation (Dry-run preview)
const plan = planClean(report, {
  dryRun: true,
  backup: false,
  kinds: ["cache"],
});

console.log(`Planned targets:`, plan);

// 4. Execute real cleaning with automated backup
const result = runClean(report, {
  dryRun: false,
  backup: true,
  kinds: ["conversations"],
});

console.log(`Freed ${formatBytes(result.freedBytes)} bytes.`);
if (result.backupDir) {
  console.log(`Backup saved to: ${result.backupDir}`);
}
```

---

## 🧩 Key API Reference

### Catalog & Path Resolver
- `TOOLS: ToolDef[]` — Full metadata list of supported AI IDEs and CLI agents (15 product lines).
- `getTool(id: string): ToolDef | undefined` — Retrieve a tool definition by ID.
- `detectPlatform(): 'win' | 'mac' | 'linux'` — Detect host OS platform.
- `expandPath(template, platform, home, env): string` — Resolve system path tokens.
- `resolveTargets(platform, home, env, tools?): ResolvedTarget[]` — Batch resolve targets to absolute paths.

### Disk Operations
- `scanDisk(options?): ScanReport` — Scan targets recursively and measure sizes/file counts.
- `planClean(report, options): CleanItem[]` — Filter valid clean targets while applying `NEVER_DELETE_GLOBS` and whitelist rules.
- `runClean(report, options): CleanResult` — Perform deletion and optional backup archive creation.

### Session Inspection & Cleaning
- `scanSessions(options?): ConversationSession[]` — Parse individual conversation sessions across tools.
- `filterSessions(sessions, filters): ConversationSession[]` — Filter sessions by duration, size, project, or keyword.
- `cleanSessions(sessions, options?): CleanResult` — Clean selected sessions with safety guards.
- `exportSessionToMarkdown(session): string` — Convert session transcript to readable Markdown.
- `exportSessionToJson(session): string` — Convert session transcript to structured JSON.

### Backups & Configuration
- `listBackups(): BackupSummary[]` — List local backups in `~/.sweep/backups/`.
- `restoreBackup(timestamp, options?): RestoreResult` — Restore previous snapshot.
- `pruneBackups(options): PruneResult` — Prune expired backups.
- `loadConfig()` / `saveConfig(config)` — Manage persistent user preferences and whitelist.

---

## 🛠️ Development

```bash
# Type check and build
npm run build

# Run unit tests (Vitest)
npm run test
```

---

## 📄 License

MIT © [L1r1h28](../../LICENSE)