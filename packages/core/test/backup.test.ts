import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupRoot, copyToBackup } from "../src/backup.ts";

describe("backupRoot", () => {
  it("creates a path under home with ISO timestamp", () => {
    const home = "/home/you";
    const now = new Date("2026-01-15T08:30:00.000Z");
    const root = backupRoot(home, now);
    expect(root.replace(/\\/g, '/')).toMatch(/\/home\/you\/\.sweep\/backups\/2026-01-15T08-30-00$/);
  });
});

describe("copyToBackup", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "sweep-backup-test-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("copies a file into backup dir", () => {
    const src = join(tmp, "a.txt");
    writeFileSync(src, "hello", "utf8");
    const backupDir = join(tmp, "backup");
    const dest = copyToBackup(src, backupDir);
    expect(dest).toBe(join(backupDir, "a.txt"));
    expect(readFileSync(dest, "utf8")).toBe("hello");
  });

  it("copies a directory recursively", () => {
    const src = join(tmp, "folder");
    mkdirSync(join(src, "sub"), { recursive: true });
    writeFileSync(join(src, "sub", "b.txt"), "world", "utf8");
    const backupDir = join(tmp, "backup");
    const dest = copyToBackup(src, backupDir);
    expect(existsSync(join(dest, "sub", "b.txt"))).toBe(true);
    expect(readFileSync(join(dest, "sub", "b.txt"), "utf8")).toBe("world");
  });

  it("creates backupDir if it does not exist", () => {
    const src = join(tmp, "x.txt");
    writeFileSync(src, "x", "utf8");
    const backupDir = join(tmp, "nested", "backup");
    expect(existsSync(backupDir)).toBe(false);
    copyToBackup(src, backupDir);
    expect(existsSync(backupDir)).toBe(true);
  });
});
