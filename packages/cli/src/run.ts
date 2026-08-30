import { homedir } from "node:os";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  TOOLS,
  formatBytes,
  formatCount,
  detectPlatform,
  expandPath,
  scanDisk,
  planClean,
  runClean,
  scanSessions,
  filterSessions,
  cleanSessions,
  exportSessionToMarkdown,
  exportSessionToJson,
  parseDurationToDays,
  parseSizeToBytes,
  listBackups,
  pruneBackups,
  restoreBackup,
  getLatestBackup,
  loadConfig,
  saveConfig,
  getConfigPath,
  addToWhitelist,
  removeFromWhitelist,
  setCustomPath,
  isPathWhitelisted,
  isSessionWhitelisted,
  type CleanKind,
  type ToolId,
  type ConversationSession,
  type BackupSummary,
  type SweepConfig,
} from "@aicleaner/core";

// ─────────────────────────────────────────────────────────────────────────────
// Version
// ─────────────────────────────────────────────────────────────────────────────

// `__CLI_VERSION__` is substituted at bundle time by esbuild's `define` option
// (see packages/cli/build.mjs). It keeps the version correct inside a SEA
// binary where `import.meta.url` points at the executable, not a file.
declare const __CLI_VERSION__: string;
const VERSION: string = typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "0.0.0";

// ─────────────────────────────────────────────────────────────────────────────
// Arg parser
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args: Record<string, unknown> = { _: [] as string[] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--json") args.json = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--verbose" || a === "-v") args.verbose = true;
    else if (a === "--no-backup") args.backup = false;
    else if (a === "--backup") args.backup = true;
    else if (a === "--version" || a === "-V") args.version = true;
    else if (a.startsWith("--kind=")) args.kind = a.slice(7);
    else if (a === "--kind") args.kind = argv[++i];
    else if (a.startsWith("--tool=")) args.tool = a.slice(7);
    else if (a === "--tool") args.tool = argv[++i];
    else if (a.startsWith("--older-than=")) args.olderThan = a.slice(13);
    else if (a === "--older-than") args.olderThan = argv[++i];
    else if (a.startsWith("--newer-than=")) args.newerThan = a.slice(13);
    else if (a === "--newer-than") args.newerThan = argv[++i];
    else if (a.startsWith("--min-size=")) args.minSize = a.slice(11);
    else if (a === "--min-size") args.minSize = argv[++i];
    else if (a.startsWith("--max-size=")) args.maxSize = a.slice(11);
    else if (a === "--max-size") args.maxSize = argv[++i];
    else if (a.startsWith("--project=")) args.project = a.slice(10);
    else if (a === "--project") args.project = argv[++i];
    else if (a.startsWith("--format=")) args.format = a.slice(9);
    else if (a === "--format") args.format = argv[++i];
    else if (a.startsWith("--out=")) args.out = a.slice(6);
    else if (a === "--out" || a === "--archive-to") args.out = argv[++i];
    else if (a.startsWith("--archive-to=")) args.out = a.slice(13);
    else if (a.startsWith("--search=")) args.search = a.slice(9);
    else if (a === "--search") args.search = argv[++i];
    else if (a.startsWith("--")) args[a.slice(2)] = true;
    else (args._ as string[]).push(a);
  }
  if (args.backup === undefined) args.backup = true;
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`Sweep — AI coding tools cleaner  v${VERSION}

Usage:
  sweep [--version] | <command> [flags]
  sweep scan      [--tool <id>] [--json] [--verbose]
  sweep clean     --kind cache|conversations|all [--tool <id>] [--dry-run] [--force] [--no-backup]
                  [--older-than <dur>] [--min-size <size>] [--project <name>]
  sweep sessions  [list|clean|export] [flags]
  sweep backups   [list|prune] [flags]
  sweep restore   [<id>|latest] [--tool <id>] [--force] [--dry-run]
  sweep config    [path|list|get|set] [args]
  sweep whitelist [list|add|remove] <value>
  sweep tools     [--verbose]
  sweep targets   [--tool <id>]
  sweep help

Commands:
  scan        Measure disk usage for all (or a specific) tool's storage paths.
  clean       Delete cache and/or conversations (dry-run by default; add --force to delete).
  sessions    Granular inspection, filtering, cleaning, and export of chat sessions.
  backups     List and prune local sweep backup archives.
  restore     Restore previously backed up cache or conversation history.
  config      Inspect and modify shared configuration (~/.sweep/config.json).
  whitelist   Manage protection whitelist rules (projects, patterns, session IDs).
  tools       List supported AI tools with blurb and notes.
  targets     List every cleanable target with its kind, risk, and resolved paths.

Sessions Subcommands:
  sweep sessions list   [--tool <id>] [--older-than 30d] [--min-size 50mb] [--project <name>] [--json]
  sweep sessions clean  [--older-than 30d] [--min-size 50mb] [--project <name>] [--dry-run] [--force]
  sweep sessions export <sessionId> [--format md|json] [--out <dir>]

Backups Subcommands:
  sweep backups list    [--json]
  sweep backups prune   [--older-than 14d] [--keep-latest 5] [--dry-run] [--force]

Config Subcommands:
  sweep config list
  sweep config path
  sweep config get <key>
  sweep config set <key> <value>

Whitelist Subcommands:
  sweep whitelist list
  sweep whitelist add <pattern|project|sessionId>
  sweep whitelist remove <item>

Kinds:
  cache           Electron/GPU/index caches — safe, history is kept.
  conversations   Sessions, brain, cascade, chat DBs — DESTRUCTIVE.
  all             Both of the above.

Tools:
  antigravity     Google Antigravity IDE
  codex           OpenAI Codex CLI + Desktop App
  claude-code     Anthropic Claude Code
  windsurf        Codeium Windsurf (Cascade)
  kiro            Kiro IDE (AWS)
  trae            ByteDance Trae IDE

Granular Filters & Options:
  --older-than <dur>   Filter sessions older than duration (e.g. 7d, 30d, 2w, 1m, 90d).
  --newer-than <dur>   Filter sessions newer than duration.
  --min-size <size>    Filter sessions larger than size (e.g. 50mb, 100kb, 1gb).
  --max-size <size>    Filter sessions smaller than size.
  --project <name>     Filter sessions matching project/workspace name.
  --format <md|json>   Export format for sessions (default: md).
  --out <dir>          Target directory for exported sessions.
  --search <query>     Search sessions by title, ID, or project keyword.

Flags:
  --version / -V  Print the version of this binary and exit.
  --tool <id>     Limit to one tool (can be used with scan, clean, sessions, targets).
  --kind <k>      Which data to clean (required for clean).
  --dry-run       Show what would be deleted without deleting (default for clean).
  --force         Actually delete (required to perform real deletes).
  --no-backup     Skip backup when deleting conversations.
  --json          Output machine-readable JSON.
  --verbose / -v  Show extra detail (tools, scan).

Examples:
  sweep scan --verbose
  sweep clean --kind cache --force
  sweep sessions list --older-than 30d
  sweep whitelist add "**/keep-*/**"
  sweep whitelist list
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers
// ─────────────────────────────────────────────────────────────────────────────

const RISK_ICON = { low: "🟡", high: "🔴" } as const;
const KIND_ICON = { cache: "💾", conversations: "💬" } as const;

function printScanTable(
  report: ReturnType<typeof scanDisk>,
  verbose: boolean
) {
  const { platform, home, entries } = report;
  console.log(`Sweep scan  [${platform}]  ${home}`);
  console.log(
    `Total ${formatBytes(report.totalBytes)}` +
      `  ·  💾 cache ${formatBytes(report.cacheBytes)}` +
      `  ·  💬 conversations ${formatBytes(report.conversationBytes)}`
  );
  console.log("");

  const byTool = new Map<string, typeof entries>();
  for (const e of entries) {
    const bucket = byTool.get(e.toolId) ?? [];
    bucket.push(e);
    byTool.set(e.toolId, bucket);
  }

  for (const [, toolEntries] of byTool) {
    const present = toolEntries.filter((e) => e.exists && e.bytes > 0);
    if (!verbose && present.length === 0) continue;

    const toolName = toolEntries[0]!.toolName;
    const toolTotal = present.reduce((s, e) => s + e.bytes, 0);
    const cacheTotal = present
      .filter((e) => e.kind === "cache")
      .reduce((s, e) => s + e.bytes, 0);
    const chatTotal = present
      .filter((e) => e.kind === "conversations")
      .reduce((s, e) => s + e.bytes, 0);

    console.log(
      `  ${toolName.padEnd(16)}  ${formatBytes(toolTotal).padStart(9)}` +
        `  💾 ${formatBytes(cacheTotal).padStart(8)}  💬 ${formatBytes(chatTotal).padStart(8)}`
    );

    if (verbose) {
      const byTarget = new Map<string, typeof toolEntries>();
      for (const e of toolEntries) {
        const bucket = byTarget.get(e.targetId) ?? [];
        bucket.push(e);
        byTarget.set(e.targetId, bucket);
      }
      for (const [, group] of byTarget) {
        const first = group[0]!;
        const kindIcon = KIND_ICON[first.kind];
        const totalBytes = group.filter((e) => e.exists).reduce((s, e) => s + e.bytes, 0);
        const totalFiles = group.filter((e) => e.exists).reduce((s, e) => s + e.fileCount, 0);
        const hasAny = group.some((e) => e.exists && e.bytes > 0);
        const sizeStr = hasAny
          ? `${formatBytes(totalBytes).padStart(9)}  ${formatCount(totalFiles)} files`
          : "  —";
        console.log(`    ${kindIcon} ${first.label.padEnd(30)} ${sizeStr}`);
        for (const e of group) {
          const marker = e.exists && e.bytes > 0 ? "✓" : e.exists ? "·" : "✗";
          const pathNote = e.exists ? "" : "  (not found)";
          const whitelistNote = e.isWhitelisted ? " [🛡️ Whitelisted]" : "";
          console.log(`       ${marker} ${e.path}${pathNote}${whitelistNote}`);
        }
      }
      console.log("");
    }
  }
}

function printSessionsTable(sessions: ConversationSession[]) {
  if (sessions.length === 0) {
    console.log("No matching conversation sessions found.");
    return;
  }

  const totalBytes = sessions.reduce((s, x) => s + x.bytes, 0);
  console.log(`Found ${sessions.length} sessions (Total: ${formatBytes(totalBytes)})\n`);

  console.log(
    `  ${"Tool".padEnd(14)} ${"Project".padEnd(18)} ${"Age".padStart(6)} ${"Size".padStart(9)}  ${"Session ID / Title"}`
  );
  console.log(
    `  ${"─".repeat(14)} ${"─".repeat(18)} ${"─".repeat(6)} ${"─".repeat(9)}  ${"─".repeat(35)}`
  );

  for (const s of sessions) {
    const tool = s.toolName.slice(0, 14).padEnd(14);
    const proj = (s.projectName || "—").slice(0, 18).padEnd(18);
    const age = `${s.ageDays}d`.padStart(6);
    const size = formatBytes(s.bytes).padStart(9);
    const title = s.title ? `${s.title} (${s.id.slice(0, 8)})` : s.id;
    const badge = s.isWhitelisted ? " 🛡️" : "";
    console.log(`  ${tool} ${proj} ${age} ${size}  ${title}${badge}`);
  }
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function printBackupsTable(backups: BackupSummary[]) {
  if (backups.length === 0) {
    console.log("No backups found in ~/.sweep/backups.");
    return;
  }

  const totalBytes = backups.reduce((s, x) => s + x.totalBytes, 0);
  console.log(`📦 Found ${backups.length} backup archive(s) (Total: ${formatBytes(totalBytes)})\n`);

  console.log(
    `  ${"Backup ID / Timestamp".padEnd(24)} ${"Age".padStart(8)} ${"Size".padStart(9)} ${"Items".padStart(7)}  ${"Tools"}`
  );
  console.log(
    `  ${"─".repeat(24)} ${"─".repeat(8)} ${"─".repeat(9)} ${"─".repeat(7)}  ${"─".repeat(25)}`
  );

  for (const b of backups) {
    const id = b.backupId.slice(0, 24).padEnd(24);
    const age = formatTimeAgo(b.timestamp).padStart(8);
    const size = formatBytes(b.totalBytes).padStart(9);
    const items = String(b.itemCount).padStart(7);
    const tools = b.toolIds.length > 0 ? b.toolIds.join(", ") : "(legacy/all)";
    console.log(`  ${id} ${age} ${size} ${items}  ${tools}`);
  }
}

function printToolsList(verbose: boolean) {
  for (const t of TOOLS) {
    console.log(`\n${t.name}  (${t.id})`);
    console.log(`  ${t.blurb}`);
    if (verbose) {
      for (const note of t.notes) {
        console.log(`  • ${note}`);
      }
      console.log(`  Products: ${t.products.join(", ")}`);
    }
  }
}

function printTargets(toolIds?: ToolId[]) {
  const platform = detectPlatform();
  const home = homedir();
  const env = process.env as Record<string, string | undefined>;

  const tools = toolIds ? TOOLS.filter((t) => toolIds.includes(t.id)) : TOOLS;

  for (const tool of tools) {
    console.log(`\n── ${tool.name} (${tool.id}) ──`);
    for (const tgt of tool.targets) {
      const riskIcon = RISK_ICON[tgt.risk];
      const kindIcon = KIND_ICON[tgt.kind];
      console.log(`  ${kindIcon} ${riskIcon}  ${tgt.label}`);
      console.log(`       ${tgt.description}`);
      for (const rawPath of tgt.paths[platform]) {
        const resolved = expandPath(rawPath, platform, home, env);
        console.log(`       ${resolved}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function runCli(argv: string[]) {
  const args = parseArgs(argv);

  // --version / -V
  if (args.version) {
    console.log(VERSION);
    return 0;
  }

  const cmd = (args._ as string[])[0] ?? "help";
  const isHelp = cmd === "help" || cmd === "-h" || cmd === "--help" || args.help;

  if (isHelp) {
    printHelp();
    return 0;
  }

  const platform = detectPlatform();
  const home = homedir();
  const verbose = Boolean(args.verbose);
  const toolIds = args.tool ? ([args.tool] as ToolId[]) : undefined;

  // ── tools ──────────────────────────────────────────────────────────────────
  if (cmd === "tools") {
    printToolsList(verbose);
    if (!verbose) {
      console.log("\nUse --verbose / -v for notes and product list.");
    }
    return 0;
  }

  // ── targets ────────────────────────────────────────────────────────────────
  if (cmd === "targets") {
    printTargets(toolIds);
    return 0;
  }

  // ── scan ───────────────────────────────────────────────────────────────────
  if (cmd === "scan") {
    const report = scanDisk({ platform, home, env: process.env, toolIds });
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
      return 0;
    }
    printScanTable(report, verbose);
    return 0;
  }

  // ── sessions ───────────────────────────────────────────────────────────────
  if (cmd === "sessions") {
    const subCmd = (args._ as string[])[1] ?? "list";

    const olderThanDays = args.olderThan ? parseDurationToDays(String(args.olderThan)) : undefined;
    const newerThanDays = args.newerThan ? parseDurationToDays(String(args.newerThan)) : undefined;
    const minBytes = args.minSize ? parseSizeToBytes(String(args.minSize)) : undefined;
    const maxBytes = args.maxSize ? parseSizeToBytes(String(args.maxSize)) : undefined;
    const projectQuery = args.project ? String(args.project) : undefined;
    const searchQuery = args.search ? String(args.search) : undefined;

    const allSessions = scanSessions({ platform, home, env: process.env, toolIds });
    const matched = filterSessions(allSessions, {
      olderThanDays,
      newerThanDays,
      minBytes,
      maxBytes,
      projectQuery,
      searchQuery,
      toolIds,
    });

    if (subCmd === "list") {
      if (args.json) {
        console.log(JSON.stringify(matched, null, 2));
        return 0;
      }
      printSessionsTable(matched);
      return 0;
    }

    if (subCmd === "export") {
      const sessionId = (args._ as string[])[2];
      const targetSession = sessionId
        ? allSessions.find((s) => s.id === sessionId || s.id.startsWith(sessionId))
        : matched[0];

      if (!targetSession) {
        console.error(`Error: Session not found${sessionId ? ` for "${sessionId}"` : ""}.`);
        return 1;
      }

      const format = String(args.format ?? "md").toLowerCase();
      const outputDir = args.out ? String(args.out) : process.cwd();
      mkdirSync(outputDir, { recursive: true });

      const fileName = `${targetSession.toolId}-${targetSession.id.slice(0, 16)}.${format === "json" ? "json" : "md"}`;
      const destPath = join(outputDir, fileName);

      const content =
        format === "json"
          ? exportSessionToJson(targetSession)
          : exportSessionToMarkdown(targetSession);

      writeFileSync(destPath, content, "utf-8");
      console.log(`Exported session to: ${destPath}`);
      return 0;
    }

    if (subCmd === "clean") {
      if (!args.force) {
        console.warn(
          "⚠  Cleaning sessions is DESTRUCTIVE and cannot be undone.\n" +
            "   Add --force to confirm deletion (--dry-run to preview first).\n"
        );
      }

      const dryRun = Boolean(args.dryRun) || !args.force;
      const result = cleanSessions(matched, {
        dryRun,
        backup: Boolean(args.backup),
        home,
      });

      if (dryRun && !args.dryRun && !args.force) {
        console.log("Dry-run (pass --force to actually delete). Would remove:\n");
      }

      for (const item of result.items) {
        console.log(
          `  ${item.action.padEnd(12)}  💬 ${item.session.toolName.padEnd(14)}  ` +
            `${formatBytes(item.bytes).padStart(9)}  ${item.session.id} (${item.session.path})`
        );
      }

      console.log(`\n${dryRun ? "Would free" : "Freed"} ${formatBytes(result.freedBytes)} (${result.items.length} sessions)`);

      if (result.backupDir) {
        console.log(`Backup: ${result.backupDir}`);
      }
      return 0;
    }

    console.error(`Unknown sessions subcommand: "${subCmd}". Available: list, clean, export.`);
    return 1;
  }

  // ── backups ────────────────────────────────────────────────────────────────
  if (cmd === "backups" || cmd === "backup") {
    const subCmd = (args._ as string[])[1] ?? "list";

    if (subCmd === "list") {
      const backups = listBackups(home);
      if (args.json) {
        console.log(JSON.stringify(backups, null, 2));
        return 0;
      }
      printBackupsTable(backups);
      return 0;
    }

    if (subCmd === "prune") {
      const olderThanDays = args.olderThan ? parseDurationToDays(String(args.olderThan)) : undefined;
      const keepLatest = args.keepLatest !== undefined ? Number(args.keepLatest) : undefined;
      const dryRun = Boolean(args.dryRun) || !args.force;

      if (!args.force && !args.dryRun) {
        console.warn(
          "⚠  Pruning backups is DESTRUCTIVE. Pass --force to confirm deletion (--dry-run to preview)."
        );
      }

      const res = pruneBackups(home, { olderThanDays, keepLatest, dryRun });

      if (res.prunedBackups.length === 0) {
        console.log("No backups matched prune criteria.");
        return 0;
      }

      console.log(
        `${dryRun ? "Would prune" : "Pruned"} ${res.prunedBackups.length} backup(s), freeing ${formatBytes(res.freedBytes)}:`
      );
      for (const id of res.prunedBackups) {
        console.log(`  ✓ ${id}`);
      }
      return 0;
    }

    console.error(`Unknown backups subcommand: "${subCmd}". Available: list, prune.`);
    return 1;
  }

  // ── restore ────────────────────────────────────────────────────────────────
  if (cmd === "restore") {
    const target = (args._ as string[])[1] ?? "latest";
    const dryRun = Boolean(args.dryRun) || !args.force;

    if (!args.force && !args.dryRun) {
      console.warn(
        "⚠  Restoring will overwrite existing tool session/cache files with backed-up versions.\n" +
          "   Pass --force to execute restore (--dry-run to preview first)."
      );
    }

    try {
      const res = restoreBackup(target, {
        home,
        toolIds,
        dryRun,
      });

      if (args.json) {
        console.log(JSON.stringify(res, null, 2));
        return 0;
      }

      console.log(`\n⏪ Restore summary for backup [${res.backupId}]:`);
      for (const item of res.items) {
        console.log(
          `  ${item.status.padEnd(14)}  💬 ${item.toolId.padEnd(14)}  ` +
            `${formatBytes(item.bytes).padStart(9)}  ${item.originalPath}`
        );
      }

      console.log(
        `\n${dryRun ? "Would restore" : "Successfully restored"} ${res.restoredCount} item(s) (${formatBytes(res.restoredBytes)})`
      );
      return 0;
    } catch (err) {
      console.error(`Restore error: ${(err as Error).message}`);
      return 1;
    }
  }

  // ── config ─────────────────────────────────────────────────────────────────
  if (cmd === "config") {
    const subCmd = (args._ as string[])[1] ?? "list";
    const cfgPath = getConfigPath(home);

    if (subCmd === "path") {
      console.log(`Config file path: ${cfgPath}`);
      return 0;
    }

    if (subCmd === "list" || subCmd === "show") {
      const cfg = loadConfig(undefined, home);
      if (args.json) {
        console.log(JSON.stringify(cfg, null, 2));
      } else {
        console.log(`\n⚙️  Sweep Configuration (${cfgPath}):\n`);
        console.log(JSON.stringify(cfg, null, 2));
      }
      return 0;
    }

    if (subCmd === "get") {
      const key = (args._ as string[])[2];
      if (!key) {
        console.error("Error: Key required. Example: sweep config get customPaths");
        return 1;
      }
      const cfg = loadConfig(undefined, home) as Record<string, any>;
      const keys = key.split(".");
      let val: any = cfg;
      for (const k of keys) {
        val = val?.[k];
      }
      if (val === undefined) {
        console.log(`(undefined)`);
      } else if (typeof val === "object") {
        console.log(JSON.stringify(val, null, 2));
      } else {
        console.log(String(val));
      }
      return 0;
    }

    if (subCmd === "set") {
      const key = (args._ as string[])[2];
      const valStr = (args._ as string[])[3];
      if (!key || valStr === undefined) {
        console.error("Error: Key and value required. Example: sweep config set defaults.olderThanDays 14");
        return 1;
      }
      const cfg = loadConfig(undefined, home) as Record<string, any>;
      let parsedVal: any = valStr;
      try {
        parsedVal = JSON.parse(valStr);
      } catch {
        parsedVal = valStr;
      }

      const keys = key.split(".");
      let cur: any = cfg;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]!;
        if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]!] = parsedVal;

      saveConfig(cfg as SweepConfig, undefined, home);
      console.log(`✓ Updated config "${key}" = ${JSON.stringify(parsedVal)} in ${cfgPath}`);
      return 0;
    }

    console.error(`Unknown config subcommand: "${subCmd}". Available: list, path, get, set.`);
    return 1;
  }

  // ── whitelist ──────────────────────────────────────────────────────────────
  if (cmd === "whitelist") {
    const subCmd = (args._ as string[])[1] ?? "list";

    if (subCmd === "list") {
      const cfg = loadConfig(undefined, home);
      if (args.json) {
        console.log(JSON.stringify(cfg.whitelist, null, 2));
        return 0;
      }
      console.log(`\n🛡️  Sweep Whitelist Rules:\n`);
      console.log(`  📁 Projects (${cfg.whitelist.projects?.length || 0}):`);
      if (!cfg.whitelist.projects || cfg.whitelist.projects.length === 0) {
        console.log(`     (none)`);
      } else {
        for (const p of cfg.whitelist.projects) console.log(`     • ${p}`);
      }

      console.log(`\n  🧩 Glob Patterns (${cfg.whitelist.patterns?.length || 0}):`);
      if (!cfg.whitelist.patterns || cfg.whitelist.patterns.length === 0) {
        console.log(`     (none)`);
      } else {
        for (const pat of cfg.whitelist.patterns) console.log(`     • ${pat}`);
      }

      console.log(`\n  💬 Session IDs (${cfg.whitelist.sessionIds?.length || 0}):`);
      if (!cfg.whitelist.sessionIds || cfg.whitelist.sessionIds.length === 0) {
        console.log(`     (none)`);
      } else {
        for (const sid of cfg.whitelist.sessionIds) console.log(`     • ${sid}`);
      }
      return 0;
    }

    if (subCmd === "add") {
      const val = (args._ as string[])[2];
      if (!val) {
        console.error("Error: Value required. Example: sweep whitelist add '**/keep-*/**'");
        return 1;
      }
      let type: "project" | "pattern" | "session" = "project";
      if (args.type === "pattern" || val.includes("*") || val.includes("/") || val.includes("\\")) {
        type = "pattern";
      } else if (args.type === "session" || /^[0-9a-f-]{16,}$/i.test(val)) {
        type = "session";
      }

      addToWhitelist({ type, value: val }, undefined, home);
      console.log(`🛡️  Added ${type} "${val}" to whitelist.`);
      return 0;
    }

    if (subCmd === "remove" || subCmd === "rm") {
      const val = (args._ as string[])[2];
      if (!val) {
        console.error("Error: Value required. Example: sweep whitelist remove '**/keep-*/**'");
        return 1;
      }
      removeFromWhitelist({ type: "project", value: val }, undefined, home);
      removeFromWhitelist({ type: "pattern", value: val }, undefined, home);
      removeFromWhitelist({ type: "session", value: val }, undefined, home);
      console.log(`✓ Removed "${val}" from whitelist.`);
      return 0;
    }

    console.error(`Unknown whitelist subcommand: "${subCmd}". Available: list, add, remove.`);
    return 1;
  }

  // ── clean ──────────────────────────────────────────────────────────────────
  if (cmd === "clean") {
    const kind = String(args.kind ?? "cache");
    if (!["cache", "conversations", "all"].includes(kind)) {
      console.error("Error: --kind must be one of: cache | conversations | all");
      return 1;
    }
    const kinds = (kind === "all" ? ["cache", "conversations"] : [kind]) as CleanKind[];

    // Check if granular conversation filters are supplied
    const hasGranularFilters = Boolean(
      args.olderThan || args.newerThan || args.minSize || args.maxSize || args.project || args.search
    );

    if (hasGranularFilters && kinds.includes("conversations") && !kinds.includes("cache")) {
      // Direct to granular session clean
      const olderThanDays = args.olderThan ? parseDurationToDays(String(args.olderThan)) : undefined;
      const newerThanDays = args.newerThan ? parseDurationToDays(String(args.newerThan)) : undefined;
      const minBytes = args.minSize ? parseSizeToBytes(String(args.minSize)) : undefined;
      const maxBytes = args.maxSize ? parseSizeToBytes(String(args.maxSize)) : undefined;
      const projectQuery = args.project ? String(args.project) : undefined;
      const searchQuery = args.search ? String(args.search) : undefined;

      if (!args.force) {
        console.warn(
          "⚠  Cleaning conversations is DESTRUCTIVE and cannot be undone.\n" +
            "   Add --force to confirm deletion (--dry-run to preview first)."
        );
      }

      const allSessions = scanSessions({ platform, home, env: process.env, toolIds });
      const matched = filterSessions(allSessions, {
        olderThanDays,
        newerThanDays,
        minBytes,
        maxBytes,
        projectQuery,
        searchQuery,
        toolIds,
      });

      const dryRun = Boolean(args.dryRun) || !args.force;
      const result = cleanSessions(matched, {
        dryRun,
        backup: Boolean(args.backup),
        home,
      });

      if (dryRun && !args.dryRun && !args.force) {
        console.log("Dry-run (pass --force to actually delete). Would remove:\n");
      }

      for (const item of result.items) {
        const whitelistedTag = item.action === "skipped" && item.error?.includes("Whitelisted") ? " [🛡️ Whitelisted]" : "";
        console.log(
          `  ${item.action.padEnd(12)}  💬 ${item.session.toolName.padEnd(14)}  ` +
            `${formatBytes(item.bytes).padStart(9)}  ${item.session.path}${whitelistedTag}`
        );
      }

      const skippedWhitelist = result.items.filter((i) => i.action === "skipped" && i.error?.includes("Whitelisted"));
      if (skippedWhitelist.length > 0) {
        console.log(`\n🛡️  ${skippedWhitelist.length} session(s) protected and skipped due to whitelist.`);
      }

      console.log(`\n${dryRun ? "Would free" : "Freed"} ${formatBytes(result.freedBytes)}`);
      if (result.backupDir) {
        console.log(`Backup: ${result.backupDir}`);
      }
      return 0;
    }

    // Safety gate: warn loudly when cleaning conversations
    if (kinds.includes("conversations") && !args.force) {
      console.warn(
        "⚠  Cleaning conversations is DESTRUCTIVE and cannot be undone.\n" +
          "   Add --force to confirm deletion (--dry-run to preview first)."
      );
    }

    const report = scanDisk({ platform, home, env: process.env, toolIds });
    const dryRun = Boolean(args.dryRun) || !args.force;

    const result = dryRun
      ? {
          dryRun: true,
          items: planClean(report, { dryRun: true, backup: false, kinds, toolIds }),
          freedBytes: 0,
        }
      : runClean(report, {
          dryRun: false,
          backup: Boolean(args.backup),
          kinds,
          toolIds,
        });

    if (dryRun && !args.dryRun && !args.force) {
      console.log("Dry-run (pass --force to actually delete). Would remove:\n");
    }

    for (const item of result.items) {
      const kindIcon = KIND_ICON[item.kind];
      console.log(
        `  ${item.action.padEnd(12)}  ${kindIcon} ${item.kind.padEnd(14)}  ` +
          `${formatBytes(item.bytes).padStart(9)}  ${item.path}`
      );
    }

    const total = result.items.reduce((s, i) => s + i.bytes, 0);
    const freed = result.freedBytes || total;
    console.log(`\n${dryRun ? "Would free" : "Freed"} ${formatBytes(freed)}`);

    if ("backupDir" in result && result.backupDir) {
      console.log(`Backup: ${result.backupDir}`);
    }
    return 0;
  }

  printHelp();
  return 1;
}

// ── Entry point ────────────────────────────────────────────────────────────
const isMain =
  process.argv[1]?.endsWith("run.ts") ||
  process.argv[1]?.endsWith("run.js") ||
  process.argv[1]?.endsWith("run.mjs") ||
  process.argv[1]?.endsWith("run.cjs") ||
  (process.argv[0] === process.execPath && process.argv[1] === process.execPath);

if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
