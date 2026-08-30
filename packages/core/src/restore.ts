import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  cpSync,
} from "node:fs";
import { basename, isAbsolute, join, normalize, resolve } from "node:path";
import { homedir } from "node:os";
import type {
  BackupItemManifest,
  BackupManifest,
  BackupSummary,
  PruneOptions,
  PruneResult,
  RestoreOptions,
  RestoreResult,
  RestoredItem,
  ToolId,
} from "./types.ts";

/**
 * Calculates directory size and total file count recursively.
 */
function getDirectoryStats(dirPath: string): { totalBytes: number; fileCount: number } {
  let totalBytes = 0;
  let fileCount = 0;

  function scan(current: string) {
    try {
      const entries = readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(current, entry.name);
        try {
          if (entry.isDirectory()) {
            scan(full);
          } else {
            const st = statSync(full);
            totalBytes += st.size;
            fileCount++;
          }
        } catch {
          // ignore unreadable files
        }
      }
    } catch {
      // ignore unreadable directory
    }
  }

  scan(dirPath);
  return { totalBytes, fileCount };
}

/**
 * Reads and parses `manifest.json` from a backup directory if present.
 */
export function readManifest(backupDir: string): BackupManifest | null {
  const manifestPath = join(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) return null;

  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      return parsed as BackupManifest;
    }
  } catch {
    // Malformed JSON
  }
  return null;
}

/**
 * Lists all backups located in `~/.sweep/backups`, sorted by creation date (newest first).
 */
export function listBackups(home: string = homedir()): BackupSummary[] {
  const backupsRoot = join(home, ".sweep", "backups");
  if (!existsSync(backupsRoot)) return [];

  let dirEntries: string[] = [];
  try {
    dirEntries = readdirSync(backupsRoot);
  } catch {
    return [];
  }

  const summaries: BackupSummary[] = [];

  for (const name of dirEntries) {
    const backupDir = join(backupsRoot, name);
    try {
      const st = statSync(backupDir);
      if (!st.isDirectory()) continue;

      const manifest = readManifest(backupDir);
      if (manifest) {
        summaries.push({
          backupId: manifest.backupId || name,
          backupDir,
          timestamp: manifest.timestamp || st.mtimeMs,
          isoDate: manifest.isoDate || st.mtime.toISOString(),
          totalBytes: manifest.totalBytes || 0,
          toolIds: manifest.toolIds || [],
          itemCount: manifest.items ? manifest.items.length : 0,
          hasManifest: true,
        });
      } else {
        const stats = getDirectoryStats(backupDir);
        summaries.push({
          backupId: name,
          backupDir,
          timestamp: st.mtimeMs,
          isoDate: st.mtime.toISOString(),
          totalBytes: stats.totalBytes,
          toolIds: [],
          itemCount: stats.fileCount,
          hasManifest: false,
        });
      }
    } catch {
      // skip invalid entry
    }
  }

  // Sort descending: newest backups first
  summaries.sort((a, b) => b.timestamp - a.timestamp || b.backupId.localeCompare(a.backupId));

  return summaries;
}

/**
 * Gets the most recent backup summary.
 */
export function getLatestBackup(home: string = homedir()): BackupSummary | undefined {
  const all = listBackups(home);
  return all[0];
}

/**
 * Prunes backups older than a given number of days or exceeding a max count limit.
 */
export function pruneBackups(
  home: string = homedir(),
  options: PruneOptions = {}
): PruneResult {
  const backups = listBackups(home);
  const now = Date.now();
  const dryRun = Boolean(options.dryRun);

  const toPrune: BackupSummary[] = [];
  let keptCount = 0;

  for (const b of backups) {
    let shouldPrune = false;

    // Check age
    if (options.olderThanDays !== undefined && options.olderThanDays > 0) {
      const ageDays = (now - b.timestamp) / (1000 * 60 * 60 * 24);
      if (ageDays >= options.olderThanDays) {
        shouldPrune = true;
      }
    }

    // Check keep count
    if (!shouldPrune && options.keepLatest !== undefined && options.keepLatest >= 0) {
      if (keptCount >= options.keepLatest) {
        shouldPrune = true;
      }
    }

    if (shouldPrune) {
      toPrune.push(b);
    } else {
      keptCount++;
    }
  }

  const prunedBackups: string[] = [];
  let freedBytes = 0;

  for (const b of toPrune) {
    if (!dryRun) {
      try {
        rmSync(b.backupDir, { recursive: true, force: true });
        prunedBackups.push(b.backupId);
        freedBytes += b.totalBytes;
      } catch {
        // failed to remove this backup dir
      }
    } else {
      prunedBackups.push(b.backupId);
      freedBytes += b.totalBytes;
    }
  }

  return {
    dryRun,
    prunedBackups,
    freedBytes,
  };
}

/**
 * Validates path for security (prevents path traversal / relative escape vulnerabilities).
 */
function isSafeRestorePath(targetPath: string): boolean {
  if (!isAbsolute(targetPath)) return false;
  const normalized = normalize(targetPath);
  if (normalized.includes("..")) return false;
  return true;
}

/**
 * Restores files and directories from a backup.
 */
export function restoreBackup(
  backupDirOrId: string,
  options: RestoreOptions & { home?: string } = {}
): RestoreResult {
  const home = options.home || homedir();
  const dryRun = Boolean(options.dryRun);
  const overwrite = options.overwrite ?? true;

  // Resolve directory
  let targetDir = backupDirOrId;
  if (backupDirOrId === "latest") {
    const latest = getLatestBackup(home);
    if (!latest) {
      throw new Error(`No backups found in ${join(home, ".sweep", "backups")}`);
    }
    targetDir = latest.backupDir;
  } else if (!isAbsolute(backupDirOrId)) {
    targetDir = join(home, ".sweep", "backups", backupDirOrId);
  }

  if (!existsSync(targetDir)) {
    throw new Error(`Backup directory not found: ${targetDir}`);
  }

  const backupId = basename(targetDir);
  const manifest = readManifest(targetDir);

  const filterToolIds = options.toolIds ? new Set(options.toolIds) : null;
  const filterTargetIds = options.targetIds ? new Set(options.targetIds) : null;

  const restoredItems: RestoredItem[] = [];
  let restoredBytes = 0;
  let restoredCount = 0;

  if (manifest && Array.isArray(manifest.items) && manifest.items.length > 0) {
    for (const item of manifest.items) {
      if (filterToolIds && !filterToolIds.has(item.toolId)) {
        continue;
      }
      if (filterTargetIds && !filterTargetIds.has(item.targetId)) {
        continue;
      }

      if (!isSafeRestorePath(item.originalPath)) {
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: join(targetDir, item.backupRelativePath),
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "failed",
          error: `Unsafe target restore path: ${item.originalPath}`,
        });
        continue;
      }

      const backupSource = resolve(targetDir, item.backupRelativePath);
      if (!existsSync(backupSource)) {
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: backupSource,
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "failed",
          error: `Backup source file missing in backup: ${item.backupRelativePath}`,
        });
        continue;
      }

      if (existsSync(item.originalPath) && !overwrite) {
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: backupSource,
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "skipped",
        });
        continue;
      }

      if (dryRun) {
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: backupSource,
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "would-restore",
        });
        restoredBytes += item.bytes;
        restoredCount++;
        continue;
      }

      try {
        mkdirSync(join(item.originalPath, ".."), { recursive: true });
        cpSync(backupSource, item.originalPath, { recursive: true, force: true });
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: backupSource,
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "restored",
        });
        restoredBytes += item.bytes;
        restoredCount++;
      } catch (err) {
        restoredItems.push({
          originalPath: item.originalPath,
          backupPath: backupSource,
          toolId: item.toolId,
          targetId: item.targetId,
          bytes: item.bytes,
          status: "failed",
          error: String(err),
        });
      }
    }
  } else {
    // Fallback if no manifest exists: list direct files in targetDir (excluding manifest.json)
    try {
      const files = readdirSync(targetDir);
      for (const file of files) {
        if (file === "manifest.json") continue;
        const backupSource = join(targetDir, file);
        // Without manifest, originalPath cannot be reliably inferred, mark as un-restorable without original target
        restoredItems.push({
          originalPath: `[unknown]/${file}`,
          backupPath: backupSource,
          toolId: "claude-code", // fallback
          targetId: "legacy",
          bytes: 0,
          status: "failed",
          error: "No manifest.json found in backup. Automatic target resolution unavailable.",
        });
      }
    } catch (err) {
      throw new Error(`Failed to read backup directory: ${err}`);
    }
  }

  return {
    backupId,
    dryRun,
    items: restoredItems,
    restoredBytes,
    restoredCount,
  };
}
