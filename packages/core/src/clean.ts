import { rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { backupRoot, copyToBackup, writeBackupManifest } from "./backup.ts";
import { NEVER_DELETE_GLOBS } from "./catalog.ts";
import type { BackupItemManifest, CleanItem, CleanOptions, CleanResult, ScanReport, ToolId } from "./types.ts";

/**
 * Convert a single glob pattern (only ** and * are supported) to a RegExp.
 * Used to enforce NEVER_DELETE_GLOBS at clean time.
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex meta except * and ?
    .replace(/\\\*\\\*/g, "\uFFFD")         // temporarily mark **
    .replace(/\*/g, "[^/\\\\]*")            // * → any char except sep
    .replace(/\uFFFD/g, ".*");              // ** → anything
  return new RegExp(escaped, "i");
}

const NEVER_DELETE_REGEXES = NEVER_DELETE_GLOBS.map(globToRegex);

/** Returns true when the path must never be deleted. */
function isProtected(p: string): boolean {
  const normalised = p.replace(/\\/g, "/");
  const withTrailing = normalised.endsWith("/") ? normalised : `${normalised}/`;
  return NEVER_DELETE_REGEXES.some((re) => re.test(normalised) || re.test(withTrailing));
}

export function planClean(report: ScanReport, options: CleanOptions): CleanItem[] {
  const kinds = new Set(options.kinds);
  const tools = options.toolIds ? new Set(options.toolIds) : null;
  const targets = options.targetIds ? new Set(options.targetIds) : null;

  return report.entries
    .filter((e) => e.exists && e.bytes > 0)
    .filter((e) => kinds.has(e.kind))
    .filter((e) => (tools ? tools.has(e.toolId) : true))
    .filter((e) => (targets ? targets.has(e.targetId) : true))
    .filter((e) => !isProtected(e.path))
    .map((e) => ({
      path: e.path,
      bytes: e.bytes,
      kind: e.kind,
      toolId: e.toolId,
      targetId: e.targetId,
      action: "would-delete" as const,
    }));
}

export function runClean(report: ScanReport, options: CleanOptions): CleanResult {
  const planned = planClean(report, options);
  if (options.dryRun) {
    return {
      dryRun: true,
      items: planned,
      freedBytes: planned.reduce((s, i) => s + i.bytes, 0),
    };
  }

  const backupDir = options.backup ? backupRoot(report.home) : undefined;
  const items: CleanItem[] = [];
  const manifestItems: BackupItemManifest[] = [];
  let freed = 0;

  for (const item of planned) {
    try {
      if (backupDir) {
        try {
          const st = statSync(item.path);
          const relBackupPath = basename(item.path);
          copyToBackup(item.path, backupDir, relBackupPath);
          manifestItems.push({
            id: `${item.toolId}-${item.targetId}-${manifestItems.length}`,
            toolId: item.toolId,
            targetId: item.targetId,
            kind: item.kind,
            originalPath: item.path,
            backupRelativePath: relBackupPath,
            bytes: item.bytes,
            isDirectory: st.isDirectory(),
          });
        } catch {
          /* skip missing */
        }
      }
      rmSync(item.path, { recursive: true, force: true });
      items.push({
        ...item,
        action: backupDir ? "backed-up" : "deleted",
      });
      freed += item.bytes;
    } catch (err) {
      items.push({ ...item, action: "failed", error: String(err) });
    }
  }

  if (backupDir && manifestItems.length > 0) {
    const uniqueToolIds = Array.from(new Set(manifestItems.map((m) => m.toolId))) as ToolId[];
    writeBackupManifest(backupDir, {
      backupId: basename(backupDir),
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
      home: report.home,
      platform: report.platform,
      totalBytes: manifestItems.reduce((s, i) => s + i.bytes, 0),
      toolIds: uniqueToolIds,
      items: manifestItems,
    });
  }

  return { dryRun: false, backupDir, items, freedBytes: freed };
}

