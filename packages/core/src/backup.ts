import { cpSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";

export function backupRoot(home: string, when = new Date()): string {
  const stamp = when.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(home, ".sweep", "backups", stamp);
}

export function copyToBackup(src: string, backupDir: string): string {
  mkdirSync(backupDir, { recursive: true });
  const dest = join(backupDir, basename(src));
  cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
  return dest;
}
