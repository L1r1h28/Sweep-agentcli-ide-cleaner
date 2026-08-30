import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  backupRoot,
  copyToBackup,
  writeBackupManifest,
  listBackups,
  pruneBackups,
  restoreBackup,
  getLatestBackup,
  readManifest,
  runClean,
  type ScanReport,
} from "../src/index.ts";

describe("restore and backup management", () => {
  let tmp: string;
  let homeDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "sweep-restore-test-"));
    homeDir = join(tmp, "userhome");
    mkdirSync(homeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("writes and reads backup manifest", () => {
    const backupDir = join(homeDir, ".sweep", "backups", "2026-08-30T10-00-00");
    mkdirSync(backupDir, { recursive: true });

    const manifest = writeBackupManifest(backupDir, {
      backupId: "2026-08-30T10-00-00",
      timestamp: 1788091200000,
      isoDate: "2026-08-30T10:00:00.000Z",
      home: homeDir,
      platform: "win",
      totalBytes: 1024,
      toolIds: ["claude-code"],
      items: [
        {
          id: "item-1",
          toolId: "claude-code",
          targetId: "history",
          kind: "conversations",
          originalPath: join(homeDir, ".claude", "history.jsonl"),
          backupRelativePath: "files/claude-code/history/history.jsonl",
          bytes: 1024,
        },
      ],
    });

    expect(manifest.version).toBe("1.0.0");
    expect(existsSync(join(backupDir, "manifest.json"))).toBe(true);

    const read = readManifest(backupDir);
    expect(read).not.toBeNull();
    expect(read?.backupId).toBe("2026-08-30T10-00-00");
    expect(read?.items.length).toBe(1);
  });

  it("lists backups sorted by timestamp (newest first)", () => {
    const b1 = join(homeDir, ".sweep", "backups", "2026-08-20T10-00-00");
    const b2 = join(homeDir, ".sweep", "backups", "2026-08-30T10-00-00");
    mkdirSync(b1, { recursive: true });
    mkdirSync(b2, { recursive: true });

    writeBackupManifest(b1, {
      backupId: "2026-08-20T10-00-00",
      timestamp: 1000,
      isoDate: "2026-08-20T10:00:00.000Z",
      home: homeDir,
      platform: "win",
      totalBytes: 500,
      toolIds: ["claude-code"],
      items: [],
    });

    writeBackupManifest(b2, {
      backupId: "2026-08-30T10-00-00",
      timestamp: 2000,
      isoDate: "2026-08-30T10:00:00.000Z",
      home: homeDir,
      platform: "win",
      totalBytes: 800,
      toolIds: ["trae", "kiro"],
      items: [],
    });

    const list = listBackups(homeDir);
    expect(list.length).toBe(2);
    expect(list[0].backupId).toBe("2026-08-30T10-00-00");
    expect(list[1].backupId).toBe("2026-08-20T10-00-00");

    const latest = getLatestBackup(homeDir);
    expect(latest?.backupId).toBe("2026-08-30T10-00-00");
  });

  it("prunes backups by olderThanDays and keepLatest", () => {
    const bOld = join(homeDir, ".sweep", "backups", "2026-08-01T10-00-00");
    const bMid = join(homeDir, ".sweep", "backups", "2026-08-20T10-00-00");
    const bNew = join(homeDir, ".sweep", "backups", "2026-08-30T10-00-00");

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    writeBackupManifest(bOld, {
      backupId: "2026-08-01T10-00-00",
      timestamp: now - 30 * dayMs,
      isoDate: new Date(now - 30 * dayMs).toISOString(),
      home: homeDir,
      platform: "win",
      totalBytes: 100,
      toolIds: ["claude-code"],
      items: [],
    });

    writeBackupManifest(bMid, {
      backupId: "2026-08-20T10-00-00",
      timestamp: now - 10 * dayMs,
      isoDate: new Date(now - 10 * dayMs).toISOString(),
      home: homeDir,
      platform: "win",
      totalBytes: 200,
      toolIds: ["trae"],
      items: [],
    });

    writeBackupManifest(bNew, {
      backupId: "2026-08-30T10-00-00",
      timestamp: now - 1 * dayMs,
      isoDate: new Date(now - 1 * dayMs).toISOString(),
      home: homeDir,
      platform: "win",
      totalBytes: 300,
      toolIds: ["kiro"],
      items: [],
    });

    // Dry run prune older than 14 days -> should prune bOld
    const dryResult = pruneBackups(homeDir, { olderThanDays: 14, dryRun: true });
    expect(dryResult.prunedBackups).toEqual(["2026-08-01T10-00-00"]);
    expect(dryResult.freedBytes).toBe(100);
    expect(existsSync(bOld)).toBe(true);

    // Live prune keep latest 2
    const pruneResult = pruneBackups(homeDir, { keepLatest: 2, dryRun: false });
    expect(pruneResult.prunedBackups).toContain("2026-08-01T10-00-00");
    expect(existsSync(bOld)).toBe(false);
    expect(existsSync(bMid)).toBe(true);
    expect(existsSync(bNew)).toBe(true);
  });

  it("restores files and directories atomically and accurately", () => {
    // 1. Setup real source files
    const claudeDir = join(homeDir, ".claude");
    const traeDir = join(homeDir, ".trae", "memory");
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(traeDir, { recursive: true });

    const claudeFile = join(claudeDir, "history.jsonl");
    const traeFile = join(traeDir, "agent.json");
    writeFileSync(claudeFile, '{"session":"test1"}\n', "utf-8");
    writeFileSync(traeFile, '{"memory":"trae_data"}\n', "utf-8");

    // 2. Perform runClean with backup
    const scanReport: ScanReport = {
      scannedAt: new Date().toISOString(),
      platform: "win",
      home: homeDir,
      totalBytes: 50,
      cacheBytes: 0,
      conversationBytes: 50,
      entries: [
        {
          toolId: "claude-code",
          toolName: "Claude Code",
          targetId: "history",
          label: "History",
          kind: "conversations",
          risk: "high",
          path: claudeFile,
          exists: true,
          bytes: 20,
          fileCount: 1,
        },
        {
          toolId: "trae",
          toolName: "Trae",
          targetId: "memory",
          label: "Memory",
          kind: "cache",
          risk: "low",
          path: traeFile,
          exists: true,
          bytes: 30,
          fileCount: 1,
        },
      ],
    };

    const cleanRes = runClean(scanReport, {
      dryRun: false,
      backup: true,
      kinds: ["conversations", "cache"],
    });

    expect(cleanRes.backupDir).toBeDefined();
    expect(existsSync(claudeFile)).toBe(false);
    expect(existsSync(traeFile)).toBe(false);

    const backupDir = cleanRes.backupDir!;
    expect(existsSync(join(backupDir, "manifest.json"))).toBe(true);

    // 3. Test selective restore: only restore Claude Code
    const partialRestore = restoreBackup(backupDir, {
      home: homeDir,
      toolIds: ["claude-code"],
      dryRun: false,
    });

    expect(partialRestore.restoredCount).toBe(1);
    expect(existsSync(claudeFile)).toBe(true);
    expect(readFileSync(claudeFile, "utf-8")).toBe('{"session":"test1"}\n');
    expect(existsSync(traeFile)).toBe(false);

    // 4. Test full restore using "latest" keyword
    const fullRestore = restoreBackup("latest", {
      home: homeDir,
      dryRun: false,
    });

    expect(fullRestore.restoredCount).toBe(2);
    expect(existsSync(traeFile)).toBe(true);
    expect(readFileSync(traeFile, "utf-8")).toBe('{"memory":"trae_data"}\n');
  });

  it("handles dry-run restore and overwrite flag properly", () => {
    const backupDir = join(homeDir, ".sweep", "backups", "2026-08-30T12-00-00");
    const targetFile = join(homeDir, "target.txt");
    const backupFileRel = "files/test/target.txt";
    const backupFileAbs = join(backupDir, backupFileRel);

    mkdirSync(join(backupFileAbs, ".."), { recursive: true });
    writeFileSync(backupFileAbs, "backup-content", "utf-8");

    writeBackupManifest(backupDir, {
      backupId: "2026-08-30T12-00-00",
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
      home: homeDir,
      platform: "win",
      totalBytes: 14,
      toolIds: ["claude-code"],
      items: [
        {
          id: "item-test",
          toolId: "claude-code",
          targetId: "test",
          kind: "conversations",
          originalPath: targetFile,
          backupRelativePath: backupFileRel,
          bytes: 14,
        },
      ],
    });

    // Test dryRun restore
    const dryRes = restoreBackup(backupDir, { dryRun: true, home: homeDir });
    expect(dryRes.dryRun).toBe(true);
    expect(dryRes.items[0].status).toBe("would-restore");
    expect(existsSync(targetFile)).toBe(false);

    // Write existing target file to test overwrite=false
    writeFileSync(targetFile, "existing-content", "utf-8");
    const skipRes = restoreBackup(backupDir, {
      dryRun: false,
      overwrite: false,
      home: homeDir,
    });
    expect(skipRes.items[0].status).toBe("skipped");
    expect(readFileSync(targetFile, "utf-8")).toBe("existing-content");

    // Test overwrite=true
    const overwriteRes = restoreBackup(backupDir, {
      dryRun: false,
      overwrite: true,
      home: homeDir,
    });
    expect(overwriteRes.items[0].status).toBe("restored");
    expect(readFileSync(targetFile, "utf-8")).toBe("backup-content");
  });
});
