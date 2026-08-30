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
import { scanDisk } from "@l1r1h28/sweep-core";

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

  it("7. backups list and prune work via CLI", async () => {
    // 1. Trigger a clean with backup to generate a backup entry
    await runCli(["clean", "--kind", "conversations", "--force", "--backup"]);

    // 2. Test backups list
    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      const code = await runCli(["backups", "list"]);
      expect(code).toBe(0);
      expect(logs.some((l) => l.includes("Found") && l.includes("backup"))).toBe(true);
    } finally {
      console.log = origLog;
    }

    // 3. Test backups prune with --keep-latest 0 --force
    const pruneCode = await runCli(["backups", "prune", "--keep-latest", "0", "--force"]);
    expect(pruneCode).toBe(0);
  });

  it("8. restore command recovers deleted files seamlessly", async () => {
    const claudeProjectDir = join(fakeHome, ".claude", "projects");
    const testFile = join(claudeProjectDir, "project1.json");
    mkdirSync(claudeProjectDir, { recursive: true });
    writeFileSync(testFile, '{"project":"sweep-cli-test"}', "utf-8");

    // Clean with backup
    await runCli(["clean", "--kind", "conversations", "--tool", "claude-code", "--force", "--backup"]);
    expect(existsSync(testFile)).toBe(false);

    // Restore latest
    const restoreCode = await runCli(["restore", "latest", "--force"]);
    expect(restoreCode).toBe(0);
    expect(existsSync(testFile)).toBe(true);
    expect(readFileSync(testFile, "utf-8")).toBe('{"project":"sweep-cli-test"}');
  });

  it("9. windsurf scan, session listing, and safe clean work seamlessly via CLI", async () => {
    // 1. Setup mock Windsurf structure
    const wsCascade = join(fakeHome, ".codeium", "windsurf", "cascade");
    const wsTrackerHistory = join(fakeHome, ".codeium", "windsurf", "code_tracker", "history");
    const wsMemories = join(fakeHome, ".codeium", "windsurf", "memories");
    const wsSkills = join(fakeHome, ".codeium", "windsurf", "skills", "my-skill");
    const wsMcp = join(fakeHome, ".codeium", "windsurf", "mcp_config.json");
    const wsCache = join(fakeHome, "AppData", "Roaming", "Windsurf", "Cache");

    mkdirSync(wsCascade, { recursive: true });
    mkdirSync(wsTrackerHistory, { recursive: true });
    mkdirSync(wsMemories, { recursive: true });
    mkdirSync(wsSkills, { recursive: true });
    mkdirSync(wsCache, { recursive: true });

    // Conversations & Cache
    writeFileSync(join(wsCascade, "session-ws-1.json"), JSON.stringify({ id: "ws-1", title: "CLI Windsurf Test", cwd: "/test/app" }));
    writeFileSync(join(wsTrackerHistory, "snapshot.py"), "print('snapshot')");
    writeFileSync(join(wsCache, "cache_0"), "cache data");

    // Protected
    writeFileSync(wsMcp, '{"mcpServers":{}}');
    writeFileSync(join(wsMemories, "global_rules.md"), "# Protected Rules");
    writeFileSync(join(wsSkills, "SKILL.md"), "skill docs");

    // 2. Test CLI scan --tool windsurf
    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      const scanCode = await runCli(["scan", "--tool", "windsurf"]);
      expect(scanCode).toBe(0);
      expect(logs.some((l) => l.includes("Windsurf"))).toBe(true);

      // 3. Test CLI sessions list --tool windsurf
      logs = [];
      const sessCode = await runCli(["sessions", "list", "--tool", "windsurf"]);
      expect(sessCode).toBe(0);
      expect(logs.some((l) => l.includes("CLI Windsurf Test") || l.includes("session-ws-1"))).toBe(true);
    } finally {
      console.log = origLog;
    }

    // 4. Test CLI clean cache only
    const cleanCacheCode = await runCli(["clean", "--tool", "windsurf", "--kind", "cache", "--force"]);
    expect(cleanCacheCode).toBe(0);
    expect(existsSync(join(wsTrackerHistory, "snapshot.py"))).toBe(false);
    expect(existsSync(join(wsCache, "cache_0"))).toBe(false);

    // Protected files & conversations must remain
    expect(existsSync(wsMcp)).toBe(true);
    expect(existsSync(join(wsMemories, "global_rules.md"))).toBe(true);
    expect(existsSync(join(wsSkills, "SKILL.md"))).toBe(true);
    expect(existsSync(join(wsCascade, "session-ws-1.json"))).toBe(true);
  });

  it("10. output folding: --limit and --all flags correctly truncate and fold output with remainder notice", async () => {
    // Generate 25 mock sessions for Codex
    const codexSessionsDir = join(fakeHome, ".codex", "sessions");
    mkdirSync(codexSessionsDir, { recursive: true });
    for (let i = 1; i <= 25; i++) {
      writeFileSync(
        join(codexSessionsDir, `chat_${String(i).padStart(2, "0")}.jsonl`),
        JSON.stringify({ msg: `session ${i}` })
      );
    }

    let logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));

    try {
      // Default folding (limit = 20)
      const code1 = await runCli(["sessions", "list", "--tool", "codex"]);
      expect(code1).toBe(0);
      expect(logs.some((l) => l.includes("more session(s)") && l.includes("Use --all or --limit"))).toBe(true);

      // Custom limit (--limit 5)
      logs = [];
      const code2 = await runCli(["sessions", "list", "--tool", "codex", "--limit", "5"]);
      expect(code2).toBe(0);
      expect(logs.some((l) => l.includes("more session(s)") && l.includes("Use --all or --limit"))).toBe(true);

      // Explicit --all
      logs = [];
      const code3 = await runCli(["sessions", "list", "--tool", "codex", "--all"]);
      expect(code3).toBe(0);
      expect(logs.some((l) => l.includes("Use --all or --limit"))).toBe(false);
    } finally {
      console.log = origLog;
    }
  });

  it("11. single-tool scoping and validation: validates tool id and applies tool-scoped header", async () => {
    let errLogs: string[] = [];
    let logs: string[] = [];
    const origErr = console.error;
    const origLog = console.log;
    console.error = (...args) => errLogs.push(args.join(" "));
    console.log = (...args) => logs.push(args.join(" "));

    try {
      // Invalid tool id rejected
      const invalidCode = await runCli(["scan", "--tool", "non-existent-tool"]);
      expect(invalidCode).toBe(1);
      expect(errLogs.some((l) => l.includes('Unknown tool "non-existent-tool"'))).toBe(true);

      // Valid tool id includes tool banner
      const validCode = await runCli(["scan", "--tool", "antigravity"]);
      expect(validCode).toBe(0);
      expect(logs.some((l) => l.includes("[tool: Antigravity IDE]"))).toBe(true);
    } finally {
      console.error = origErr;
      console.log = origLog;
    }
  });
});

