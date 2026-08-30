import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  decodeClaudeProjectSlug,
  extractClaudeSessionMeta,
  scanClaudeSessions,
} from "../src/adapters/claude.ts";
import { scanSessions } from "../src/session.ts";
import { scanDisk } from "../src/scan.ts";
import { planClean, runClean } from "../src/clean.ts";
import { detectPlatform } from "../src/paths.ts";
import { TOOLS } from "../src/catalog.ts";

describe("Claude Adapter & Session Tests", () => {
  let mockHome: string;

  beforeEach(() => {
    mockHome = join(tmpdir(), `sweep-claude-test-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(mockHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(mockHome)) {
      rmSync(mockHome, { recursive: true, force: true });
    }
  });

  describe("Project Slug Decoding", () => {
    it("decodes Windows path slug to project name", () => {
      const slug = "C__Users_testuser_Projects_Sweep-agentcli-ide-cleaner";
      expect(decodeClaudeProjectSlug(slug)).toBe("Sweep-agentcli-ide-cleaner");
    });

    it("decodes POSIX path slug to project name", () => {
      const slug = "-Users-testuser-Projects-my-web-app";
      expect(decodeClaudeProjectSlug(slug)).toBe("my-web-app");
    });

    it("decodes URL-encoded project slug", () => {
      const slug = "%2Fhome%2Fdeveloper%2Fworkspace%2Fawesome-api";
      expect(decodeClaudeProjectSlug(slug)).toBe("awesome-api");
    });

    it("handles plain project names gracefully", () => {
      expect(decodeClaudeProjectSlug("simple-repo")).toBe("simple-repo");
      expect(decodeClaudeProjectSlug("")).toBe("Unknown Project");
    });
  });

  describe("JSONL Session Meta & Prompt Parsing", () => {
    it("parses 2026 user event with message.content string and cwd", () => {
      const sessionFile = join(mockHome, "test-session.jsonl");
      const lines = [
        JSON.stringify({
          type: "user",
          sessionId: "cc-session-001",
          cwd: "/Users/developer/Projects/awesome-frontend",
          timestamp: "2026-08-30T10:00:00.000Z",
          message: {
            content: "請幫我重構現有的按鈕樣式與暗黑模式支援",
          },
        }),
        JSON.stringify({
          type: "assistant",
          sessionId: "cc-session-001",
          timestamp: "2026-08-30T10:00:05.000Z",
          message: { content: "沒問題，我現在開始重構..." },
        }),
      ];

      writeFileSync(sessionFile, lines.join("\n"), "utf-8");
      const meta = extractClaudeSessionMeta(sessionFile, undefined, 26);

      expect(meta.id).toBe("cc-session-001");
      expect(meta.projectName).toBe("awesome-frontend");
      expect(meta.title).toBe("請幫我重構現有的按鈕樣式…");
      expect(meta.createdAt).toBe("2026-08-30T10:00:00.000Z");
    });

    it("parses array message content and extracts text correctly", () => {
      const sessionFile = join(mockHome, "array-session.jsonl");
      const lines = [
        JSON.stringify({
          type: "user",
          sessionId: "cc-session-002",
          timestamp: "2026-08-30T11:00:00.000Z",
          message: {
            content: [
              { type: "text", text: "Fix database deadlock on concurrent writes" },
            ],
          },
        }),
      ];

      writeFileSync(sessionFile, lines.join("\n"), "utf-8");
      const meta = extractClaudeSessionMeta(sessionFile, "C__Users_testuser_Projects_backend-service", 26);

      expect(meta.id).toBe("cc-session-002");
      expect(meta.projectName).toBe("backend-service");
      expect(meta.title).toBe("Fix database deadlock on…");
    });
  });

  describe("Directory & Project Hierarchy Session Scanning", () => {
    it("scans ~/.claude/projects/<slug>/*.jsonl and links associated subagent folders", () => {
      const projectsDir = join(mockHome, ".claude", "projects");
      const projSlugDir = join(projectsDir, "C__Users_testuser_Projects_agent-tools");
      const sessionDir = join(projSlugDir, "session-123");
      mkdirSync(projSlugDir, { recursive: true });
      mkdirSync(sessionDir, { recursive: true });

      const sessionFile = join(projSlugDir, "session-123.jsonl");
      const lines = [
        JSON.stringify({
          type: "user",
          sessionId: "session-123",
          cwd: "C:\\Users\\testuser\\Projects\\agent-tools",
          message: { content: "掃描專案所有相依套件" },
        }),
      ];
      writeFileSync(sessionFile, lines.join("\n"), "utf-8");
      writeFileSync(join(sessionDir, "tool-result-1.txt"), "some tool output");
      writeFileSync(join(sessionDir, "tool-result-2.txt"), "more output data");

      const sessions = scanClaudeSessions({
        claudeRootDirs: [projectsDir],
        toolId: "claude-code",
        toolName: "Claude Code",
        defaultTargetId: "cc-sessions",
      });

      expect(sessions.length).toBe(1);
      const s = sessions[0]!;
      expect(s.id).toBe("session-123");
      expect(s.projectName).toBe("agent-tools");
      expect(s.title).toBe("掃描專案所有相依套件");
      expect(s.associatedPaths?.length).toBe(2);
      expect(s.fileCount).toBe(3); // 1 jsonl + 2 subfolder files
    });
  });

  describe("Disk Scan, File-History Separation & Whitelist Guards", () => {
    it("safely plans clean for file-history and caches while strictly preserving MEMORY.md and claude_desktop_config.json", () => {
      const claudeDir = join(mockHome, ".claude");
      const fileHistoryDir = join(claudeDir, "file-history");
      const cacheDir = join(claudeDir, "cache");
      const memoryDir = join(claudeDir, "memory");
      mkdirSync(fileHistoryDir, { recursive: true });
      mkdirSync(cacheDir, { recursive: true });
      mkdirSync(memoryDir, { recursive: true });

      // Caches & snapshots
      writeFileSync(join(fileHistoryDir, "snapshot-1.bak"), "snapshot data");
      writeFileSync(join(cacheDir, "changelog.md"), "changelog text");

      // Protected files
      const settingsPath = join(claudeDir, "settings.json");
      const memoryDocPath = join(memoryDir, "MEMORY.md");
      const claudeMdPath = join(mockHome, "CLAUDE.md");
      writeFileSync(settingsPath, '{"cleanupPeriodDays": 30}');
      writeFileSync(memoryDocPath, "# Project Long Term Memory");
      writeFileSync(claudeMdPath, "# Global Claude Guidelines");

      const platform = detectPlatform();
      const scanRes = scanDisk({
        platform,
        home: mockHome,
        tools: TOOLS,
      });

      const claudeEntries = scanRes.entries.filter((e) => e.toolId === "claude-code" && e.exists);
      expect(claudeEntries.length).toBeGreaterThan(0);

      const plan = planClean(scanRes, { kinds: ["cache", "conversations"], dryRun: true, backup: false });
      const deletePaths = plan.map((i) => i.path);

      // Verify file-history and cache are clean targets
      expect(deletePaths.some((p) => p.includes("file-history") || p.includes("cache"))).toBe(true);

      // Verify protected items are NEVER planned for deletion
      expect(deletePaths).not.toContain(settingsPath);
      expect(deletePaths).not.toContain(memoryDocPath);
      expect(deletePaths).not.toContain(claudeMdPath);

      // Run clean dry-run
      const report = runClean(scanRes, { kinds: ["cache", "conversations"], dryRun: true, backup: false });
      expect(report.dryRun).toBe(true);
      expect(existsSync(settingsPath)).toBe(true);
      expect(existsSync(memoryDocPath)).toBe(true);
    });

    it("scans standalone claude-desktop and claude-code tool products independently", () => {
      const platform = detectPlatform();
      const isWin = platform === "win";
      const isMac = platform === "mac";
      const claudeData = isWin
        ? join(mockHome, "AppData", "Local", "Claude-Data")
        : isMac
        ? join(mockHome, "Library", "Application Support", "Claude")
        : join(mockHome, ".config", "Claude");
      const claudeCodeProjects = join(mockHome, ".claude", "projects", "my-repo");
      mkdirSync(claudeData, { recursive: true });
      mkdirSync(claudeCodeProjects, { recursive: true });

      writeFileSync(join(claudeData, "test-cache.bin"), "cache-data-12345");
      writeFileSync(
        join(claudeCodeProjects, "session-cli-1.jsonl"),
        JSON.stringify({ type: "user", message: { content: "Claude Code prompt" } })
      );

      // 1. Scan claude-desktop standalone
      const desktopScan = scanDisk({
        platform,
        home: mockHome,
        env: { LOCALAPPDATA: join(mockHome, "AppData", "Local"), APPDATA: join(mockHome, "AppData", "Roaming") },
        toolIds: ["claude-desktop"],
        tools: TOOLS,
      });
      expect(desktopScan.entries.some((e) => e.toolId === "claude-desktop" && e.exists)).toBe(true);

      // 2. Scan claude-code standalone
      const codeSessions = scanSessions({
        platform,
        home: mockHome,
        toolIds: ["claude-code"],
        tools: TOOLS,
      });
      expect(codeSessions.some((s) => s.toolId === "claude-code")).toBe(true);
    });
  });
});
