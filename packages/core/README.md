# @aicleaner/core ⚙️

> The headless engine for Sweep — providing AI tool catalogs, cross-platform path resolution, disk scanning, backup creation, and safety-guarded cleaning routines.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

`@aicleaner/core` is the core foundation used by both `@aicleaner/cli` and `sweep-aicleaner` (VS Code Extension). It provides browser-safe metadata/catalog utilities as well as Node.js-based filesystem scanning and execution capabilities.

---

## 📦 Features

- 🗂️ **Canonical AI Storage Catalog**: Accurate target definitions for Google Antigravity, OpenAI Codex, Claude Code, Windsurf, AWS Kiro, and ByteDance Trae.
- 🗺️ **Cross-Platform Path Resolution**: Automatically expands `~`, `%USERPROFILE%`, `%APPDATA%`, and `%LOCALAPPDATA%` across Windows, macOS, and Linux.
- 🛡️ **Never-Delete Guard**: Regex-based protection layer safeguarding config files (`settings.json`, `auth.json`, `config.toml`, `mcp_config.json`), extensions, and runtime environments (`.sandbox-bin/`, `~/.kiro/extensions`).
- 💾 **Safe vs. Destructive Separation**: Built-in distinction between `cache` (low risk) and `conversations` (high risk).
- 📦 **Automatic Backup System**: Creates timestamped backup archives before removing conversation history (`~/.sweep/backups/<timestamp>`).
- 🧪 **Isomorphic Exports**:
  - `.` (Browser / Webview safe): Target definitions, demo data, formatters, and path resolver.
  - `./node` (Node.js runtime): File scanner (`scanDisk`), cleaner (`runClean`), and backup orchestrator (`copyToBackup`).

---

## 🚀 Installation & Usage

```bash
npm install @aicleaner/core
```

### TypeScript / JavaScript Example

```ts
import { TOOLS, formatBytes } from "@aicleaner/core";
import { scanDisk, planClean, runClean } from "@aicleaner/core/node";

// 1. Scan AI tool storage
const report = scanDisk({
  toolIds: ["codex", "antigravity"],
});

console.log(`Total found: ${formatBytes(report.totalBytes)}`);
console.log(`Cache: ${formatBytes(report.cacheBytes)}`);
console.log(`Conversations: ${formatBytes(report.conversationBytes)}`);

// 2. Plan a clean operation (Dry-run preview)
const plan = planClean(report, {
  dryRun: true,
  backup: false,
  kinds: ["cache"],
});

console.log(`Planned targets:`, plan);

// 3. Execute real cleaning with backup
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

## 🧩 API Reference

### Catalog & Path Resolver
- `TOOLS: ToolDef[]` — Full metadata list of supported AI IDEs and CLI agents.
- `getTool(id: string): ToolDef | undefined` — Retrieve a tool definition by ID.
- `detectPlatform(): 'win' | 'mac' | 'linux'` — Detect host OS platform.
- `expandPath(template, platform, home, env): string` — Resolve system path tokens.
- `resolveTargets(platform, home, env, tools?): ResolvedTarget[]` — Batch resolve targets to absolute paths.

### Disk Operations (Node.js only)
- `scanDisk(options?): ScanReport` — Scan targets recursively and measure sizes/file counts.
- `planClean(report, options): CleanItem[]` — Filter valid clean targets while applying `NEVER_DELETE_GLOBS`.
- `runClean(report, options): CleanResult` — Perform deletion and optional backup archive creation.
- `backupRoot(home, when?): string` — Generates formatted backup destination folder path.

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