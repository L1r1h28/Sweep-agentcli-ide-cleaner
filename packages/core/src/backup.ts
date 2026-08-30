import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { BackupManifest } from "./types.ts";

export function backupRoot(home: string, when = new Date()): string {
  const stamp = when.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(home, ".sweep", "backups", stamp);
}

export function copyToBackup(src: string, backupDir: string, relativeDest?: string): string {
  const dest = relativeDest ? join(backupDir, relativeDest) : join(backupDir, basename(src));
  mkdirSync(join(dest, ".."), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
  return dest;
}

export function writeBackupManifest(
  backupDir: string,
  manifest: Omit<BackupManifest, "version">
): BackupManifest {
  const fullManifest: BackupManifest = {
    version: "1.0.0",
    ...manifest,
  };
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(
    join(backupDir, "manifest.json"),
    JSON.stringify(fullManifest, null, 2),
    "utf-8"
  );
  return fullManifest;
}

