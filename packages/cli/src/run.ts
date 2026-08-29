import { homedir } from "node:os";
import { TOOLS } from "@aicleaner/core";
import { formatBytes, formatCount } from "@aicleaner/core";
import { detectPlatform, expandPath } from "@aicleaner/core";
import { scanDisk } from "@aicleaner/core";
import { planClean, runClean } from "@aicleaner/core";
import type { CleanKind, ToolId } from "@aicleaner/core";

// ─────────────────────────────────────────────────────────────────────────────
// Arg parser
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args: Record<string, unknown> = { _: [] as string[] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--json")        args.json    = true;
    else if (a === "--dry-run") args.dryRun  = true;
    else if (a === "--force")   args.force   = true;
    else if (a === "--verbose" || a === "-v") args.verbose = true;
    else if (a === "--no-backup") args.backup = false;
    else if (a === "--backup")    args.backup = true;
    else if (a.startsWith("--kind="))  args.kind = a.slice(7);
    else if (a === "--kind")           args.kind = argv[++i];
    else if (a.startsWith("--tool="))  args.tool = a.slice(7);
    else if (a === "--tool")           args.tool = argv[++i];
    else if (a.startsWith("--"))       args[a.slice(2)] = true;
    else (args._ as string[]).push(a);
  }
  if (args.backup === undefined) args.backup = true;
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`Sweep — AI coding tools cleaner

Usage:
  aicleaner scan    [--tool <id>] [--json] [--verbose]
  aicleaner clean   --kind cache|conversations|all [--tool <id>] [--dry-run] [--force] [--no-backup]
  aicleaner tools   [--verbose]
  aicleaner targets [--tool <id>]
  aicleaner help

Commands:
  scan        Measure disk usage for all (or a specific) tool's storage paths.
  clean       Delete cache and/or conversations (dry-run by default; add --force to delete).
  tools       List supported AI tools with blurb and notes.
  targets     List every cleanable target with its kind, risk, and resolved paths.

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

Flags:
  --tool <id>     Limit to one tool (can be used with scan, clean, targets).
  --kind <k>      Which data to clean (required for clean).
  --dry-run       Show what would be deleted without deleting (default for clean).
  --force         Actually delete (required to perform real deletes).
  --no-backup     Skip backup when deleting conversations.
  --json          Output machine-readable JSON (scan only).
  --verbose / -v  Show extra detail (tools, scan).

⚠ Codex WARNING
  ~/.codex/sessions is shared by the CLI and the Desktop App.
  Cleaning conversations removes history from every Codex client at once.
  ~/.codex/.sandbox-bin is the sandbox runtime — Sweep will NEVER touch it.

⚠ Kiro WARNING
  ~/.kiro/extensions is the extension install directory — NOT cache.
  Sweep will NEVER delete it even when cleaning all caches.
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers
// ─────────────────────────────────────────────────────────────────────────────

const RISK_ICON = { low: "🟡", high: "🔴" } as const;
const KIND_ICON = { cache: "💾", conversations: "💬" } as const;

function printScanTable(
  report: ReturnType<typeof scanDisk>,
  verbose: boolean,
) {
  const { platform, home, entries } = report;
  console.log(`Sweep scan  [${platform}]  ${home}`);
  console.log(
    `Total ${formatBytes(report.totalBytes)}` +
    `  ·  💾 cache ${formatBytes(report.cacheBytes)}` +
    `  ·  💬 conversations ${formatBytes(report.conversationBytes)}`,
  );
  console.log("");

  // Group by tool for a cleaner layout
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
    const cacheTotal = present.filter((e) => e.kind === "cache").reduce((s, e) => s + e.bytes, 0);
    const chatTotal  = present.filter((e) => e.kind === "conversations").reduce((s, e) => s + e.bytes, 0);

    console.log(
      `  ${toolName.padEnd(16)}  ${formatBytes(toolTotal).padStart(9)}` +
      `  💾 ${formatBytes(cacheTotal).padStart(8)}  💬 ${formatBytes(chatTotal).padStart(8)}`,
    );

    if (verbose) {
      // Group entries by targetId so paths for the same target are clustered
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
          console.log(`       ${marker} ${e.path}${pathNote}`);
        }
      }
      console.log("");
    }
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
  const args  = parseArgs(argv);
  const cmd   = (args._ as string[])[0] ?? "help";
  const isHelp = cmd === "help" || cmd === "-h" || cmd === "--help" || args.help;

  if (isHelp) {
    printHelp();
    return 0;
  }

  const platform = detectPlatform();
  const home     = homedir();
  const verbose  = Boolean(args.verbose);
  const toolIds  = args.tool ? ([args.tool] as ToolId[]) : undefined;

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

  // ── clean ──────────────────────────────────────────────────────────────────
  if (cmd === "clean") {
    const kind = String(args.kind ?? "cache");
    if (!["cache", "conversations", "all"].includes(kind)) {
      console.error('Error: --kind must be one of: cache | conversations | all');
      return 1;
    }
    const kinds = (kind === "all" ? ["cache", "conversations"] : [kind]) as CleanKind[];

    // Safety gate: warn loudly when cleaning conversations
    if (kinds.includes("conversations") && !args.force) {
      console.warn(
        "⚠  Cleaning conversations is DESTRUCTIVE and cannot be undone.\n" +
        "   Add --force to confirm deletion (--dry-run to preview first).",
      );
    }

    const report  = scanDisk({ platform, home, env: process.env, toolIds });
    const dryRun  = Boolean(args.dryRun) || !args.force;

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
        `${formatBytes(item.bytes).padStart(9)}  ${item.path}`,
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
  process.argv[1]?.endsWith("run.js");

if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
