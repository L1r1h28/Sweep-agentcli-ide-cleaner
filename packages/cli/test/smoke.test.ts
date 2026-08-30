import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runCli } from "../src/run.ts";
import { scanDisk } from "@aicleaner/core";

describe("CLI Smoke & End-to-End Tests", () => {
  let fakeHome: string;
  let originalEnvHome: string | undefined;
  let originalEnvUserProfile: string | undefined;
  let originalEnvAppData: string | undefined;
  let originalEnvLocalAppData: string | undefined;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "sweep-smoke-"));
    originalEnvHome = process.env.HOME;
    originalEnvUserProfile = process.env.USERPROFILE;
    originalEnvAppData = process.env.APPDATA;
    originalEnvLocalAppData = process.env.LOCALAPPDATA;

    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;
    process.env.APPDATA = join(fakeHome, "AppData", "Roaming");
    process.env.LOCALAPPDATA = join(fakeHome, "AppData", "Local");

    // Set up mock directory tree
    // 1. External / un-cataloged user files (MUST NEVER BE TOUCHED OR SCANNED)
    mkdirSync(join(fakeHome, "Desktop"), { recursive: true });
    writeFileSync(join(fakeHome, "Desktop", "important.txt"), "user data");

    mkdirSync(join(fakeHome, "Documents"), { recursive: true });
    writeFileSync(join(fakeHome, "Documents", "report.pdf"), "pdf content");

    // 2. Codex: sessions (conversations) + sandbox-bin (PROTECTED)
    mkdirSync(join(fakeHome, ".codex", "sessions"), { recursive: true });
    writeFileSync(join(fakeHome, ".codex", "sessions", "chat1.jsonl"), '{"msg":"hello"}');

    mkdirSync(join(fakeHome, ".codex", ".sandbox-bin"), { recursive: true });
    writeFileSync(join(fakeHome, ".codex", ".sandbox-bin", "python.exe"), "binary");

    // 3. Kiro: extensions (PROTECTED) + sessions (conversations)
    mkdirSync(join(fakeHome, ".kiro", "extensions", "my-plugin"), { recursive: true });
    writeFileSync(join(fakeHome, ".kiro", "extensions", "my-plugin", "index.js"), "console.log(1)");

    mkdirSync(join(fakeHome, ".kiro", "sessions"), { recursive: true });
    writeFileSync(join(fakeHome, ".kiro", "sessions", "s1.chat"), "kiro session");

    // 4. Claude Code: settings.json (PROTECTED) + projects (conversations)
    mkdirSync(join(fakeHome, ".claude", "projects"), { recursive: true });
    writeFileSync(join(fakeHome, ".claude", "projects", "proj1.json"), "claude project");
    writeFileSync(join(fakeHome, ".claude", "settings.json"), '{"key":"value"}');

    // 5. Antigravity: cache (cache)
    mkdirSync(join(fakeHome, ".antigravity", "Cache"), { recursive: true });
    writeFileSync(join(fakeHome, ".antigravity", "Cache", "data.bin"), "cache data");
  });

  afterEach(() => {
    if (originalEnvHome !== undefined) process.env.HOME = originalEnvHome;
    else delete process.env.HOME;

    if (originalEnvUserProfile !== undefined) process.env.USERPROFILE = originalEnvUserProfile;
    else delete process.env.USERPROFILE;

    if (originalEnvAppData !== undefined) process.env.APPDATA = originalEnvAppData;
    else delete process.env.APPDATA;

    if (originalEnvLocalAppData !== undefined) process.env.LOCALAPPDATA = originalEnvLocalAppData;
    else delete process.env.LOCALAPPDATA;

    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("1. scan only includes catalog targets and ignores outside user directories", () => {
    const report = scanDisk({ home: fakeHome });
    const scannedPaths = report.entries.map((e) => e.path);

    // Scanned paths must match catalog entries
    expect(scannedPaths.some((p) => p.includes("Desktop"))).toBe(false);
    expect(scannedPaths.some((p) => p.includes("Documents"))).toBe(false);

    // Uncataloged files exist
    expect(existsSync(join(fakeHome, "Desktop", "important.txt"))).toBe(true);
  });

  it("2. conversations cleaning requires explicit --kind and dry-runs without --force", async () => {
    // Calling clean without valid --kind fails
    const errCode = await runCli(["clean", "--kind=invalid"]);
    expect(errCode).toBe(1);

    // Calling clean --kind conversations without --force performs dry-run
    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      await runCli(["clean", "--kind", "conversations"]);
    } finally {
      console.log = origLog;
    }

    // Sessions files must NOT be deleted in dry-run mode
    expect(existsSync(join(fakeHome, ".codex", "sessions", "chat1.jsonl"))).toBe(true);
    expect(logs.some((l) => l.includes("Would free") || l.includes("Dry-run"))).toBe(true);
  });

  it("3. --backup creates restorable archives before destroying conversation files", async () => {
    const chatFile = join(fakeHome, ".codex", "sessions", "chat1.jsonl");
    const originalContent = readFileSync(chatFile, "utf-8");

    // Run actual clean with backup enabled
    await runCli(["clean", "--kind", "conversations", "--force", "--backup"]);

    // Original conversation file should be deleted
    expect(existsSync(chatFile)).toBe(false);

    // Backup directory should exist under ~/.sweep/backups/
    const backupBase = join(fakeHome, ".sweep", "backups");
    expect(existsSync(backupBase)).toBe(true);

    const backupSubdirs = readdirSync(backupBase);
    expect(backupSubdirs.length).toBeGreaterThan(0);

    const latestBackup = join(backupBase, backupSubdirs[0]!);
    const restoredFilePath = join(latestBackup, "sessions", "chat1.jsonl");

    // Verify backup file exists and content matches
    expect(existsSync(restoredFilePath)).toBe(true);
    expect(readFileSync(restoredFilePath, "utf-8")).toBe(originalContent);
  });

  it("4. protection rules NEVER delete protected paths (.sandbox-bin, kiro/extensions, settings.json)", async () => {
    // Attempt destructive clean --kind all --force
    await runCli(["clean", "--kind", "all", "--force", "--no-backup"]);

    // Protected paths MUST remain intact
    expect(existsSync(join(fakeHome, ".codex", ".sandbox-bin", "python.exe"))).toBe(true);
    expect(existsSync(join(fakeHome, ".kiro", "extensions", "my-plugin", "index.js"))).toBe(true);
    expect(existsSync(join(fakeHome, ".claude", "settings.json"))).toBe(true);
  });

  it("5. sessions list and export work seamlessly", async () => {
    // Test sessions list
    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      const code = await runCli(["sessions", "list"]);
      expect(code).toBe(0);
      expect(logs.some((l) => l.includes("Found") && l.includes("sessions"))).toBe(true);
    } finally {
      console.log = origLog;
    }

    // Test sessions export
    const exportDir = join(fakeHome, "my-exports");
    const exportCode = await runCli(["sessions", "export", "chat1", "--format", "md", "--out", exportDir]);
    expect(exportCode).toBe(0);
    expect(existsSync(join(exportDir, "codex-chat1.md"))).toBe(true);
    expect(readFileSync(join(exportDir, "codex-chat1.md"), "utf-8")).toContain("# Session");
  });

  it("6. granular session clean with --older-than or --project", async () => {
    const codexFile = join(fakeHome, ".codex", "sessions", "chat1.jsonl");
    expect(existsSync(codexFile)).toBe(true);

    // Filter sessions with olderThan 0d and force clean
    const code = await runCli(["sessions", "clean", "--older-than", "0d", "--force", "--no-backup"]);
    expect(code).toBe(0);

    // codex file was cleaned
    expect(existsSync(codexFile)).toBe(false);
  });
});
