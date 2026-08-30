import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseDurationToDays,
  parseSizeToBytes,
  scanSessions,
  filterSessions,
  exportSessionToMarkdown,
  exportSessionToJson,
  cleanSessions,
  type ConversationSession,
} from "../src/session.ts";

describe("Session Unit Tests", () => {
  describe("Duration & Size Parsers", () => {
    it("parses duration strings into days correctly", () => {
      expect(parseDurationToDays("7d")).toBe(7);
      expect(parseDurationToDays("30days")).toBe(30);
      expect(parseDurationToDays("2w")).toBe(14);
      expect(parseDurationToDays("1m")).toBe(30);
      expect(parseDurationToDays("2y")).toBe(730);
      expect(parseDurationToDays(15)).toBe(15);
      expect(parseDurationToDays("10")).toBe(10);
      expect(() => parseDurationToDays("invalid")).toThrow(/Invalid duration/);
    });

    it("parses size strings into bytes correctly", () => {
      expect(parseSizeToBytes("100b")).toBe(100);
      expect(parseSizeToBytes("10kb")).toBe(10 * 1024);
      expect(parseSizeToBytes("50mb")).toBe(50 * 1024 * 1024);
      expect(parseSizeToBytes("1.5gb")).toBe(Math.round(1.5 * 1024 * 1024 * 1024));
      expect(parseSizeToBytes(2048)).toBe(2048);
      expect(parseSizeToBytes("500")).toBe(500);
      expect(() => parseSizeToBytes("invalid-size")).toThrow(/Invalid size/);
    });
  });

  describe("Session Scanning & Filtering with Mock Home", () => {
    let mockHome: string;

    beforeEach(() => {
      mockHome = join(
        tmpdir(),
        `sweep-session-test-${Math.random().toString(36).slice(2, 8)}`
      );
      mkdirSync(mockHome, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(mockHome)) {
        rmSync(mockHome, { recursive: true, force: true });
      }
    });

    it("scans and extracts metadata from Antigravity, Codex, and Claude Code sessions", () => {
      // 1. Antigravity Brain session
      const agBrainDir = join(
        mockHome,
        ".gemini",
        "antigravity-ide",
        "brain",
        "session-uuid-1234"
      );
      mkdirSync(agBrainDir, { recursive: true });
      const agTranscript = [
        JSON.stringify({
          type: "USER_INPUT",
          source: "USER_EXPLICIT",
          content: "Refactor authentication module in @/src/auth",
          user_information: { CorpusName: "MyAuthProject" },
        }),
        JSON.stringify({
          type: "PLANNER_RESPONSE",
          source: "MODEL",
          content: "I will refactor auth module now.",
        }),
      ].join("\n");
      writeFileSync(join(agBrainDir, "transcript.jsonl"), agTranscript, "utf-8");

      // 2. Codex session
      const codexSessionsDir = join(mockHome, ".codex", "sessions");
      mkdirSync(codexSessionsDir, { recursive: true });
      const codexFile = join(codexSessionsDir, "rollout-2026-08-15-abc.jsonl");
      const codexTranscript = JSON.stringify({
        payload: {
          messages: [{ role: "user", content: "Implement dark mode theme" }],
        },
      });
      writeFileSync(codexFile, codexTranscript, "utf-8");

      // 3. Claude Code project session
      const claudeProjDir = join(
        mockHome,
        ".claude",
        "projects",
        "sweep-cleaner"
      );
      mkdirSync(claudeProjDir, { recursive: true });
      const claudeSessionFile = join(claudeProjDir, "sess-9876.jsonl");
      writeFileSync(
        claudeSessionFile,
        JSON.stringify({
          type: "USER_INPUT",
          content: "Optimize memory scanner",
        }),
        "utf-8"
      );

      const sessions = scanSessions({
        home: mockHome,
        platform: "linux", // test standard Linux/Mac layout paths
      });

      expect(sessions.length).toBeGreaterThanOrEqual(3);

      const agSession = sessions.find((s) => s.id === "session-uuid-1234");
      expect(agSession).toBeDefined();
      expect(agSession?.toolId).toBe("antigravity");
      expect(agSession?.projectName).toBe("MyAuthProject");
      expect(agSession?.title).toContain("Refactor authentication");

      const codexSession = sessions.find((s) => s.id.includes("rollout-2026-08-15"));
      expect(codexSession).toBeDefined();
      expect(codexSession?.toolId).toBe("codex");
      expect(codexSession?.title).toContain("Implement dark mode");

      const claudeSession = sessions.find((s) => s.id === "sess-9876");
      expect(claudeSession).toBeDefined();
      expect(claudeSession?.toolId).toBe("claude-code");
      expect(claudeSession?.projectName).toBe("sweep-cleaner");
    });

    it("filters sessions by age, size, project name, and tool ID", () => {
      const now = Date.now();
      const mockSessions: ConversationSession[] = [
        {
          id: "s1",
          toolId: "antigravity",
          toolName: "Antigravity",
          targetId: "ag-brain",
          path: "/dummy/s1",
          projectName: "Backend-API",
          title: "API design",
          updatedAt: new Date(now - 40 * 86400000).toISOString(),
          ageDays: 40,
          bytes: 60 * 1024 * 1024, // 60MB
          fileCount: 10,
          isDirectory: true,
        },
        {
          id: "s2",
          toolId: "codex",
          toolName: "Codex",
          targetId: "codex-sessions",
          path: "/dummy/s2",
          projectName: "Frontend-UI",
          title: "Fix button alignment",
          updatedAt: new Date(now - 5 * 86400000).toISOString(),
          ageDays: 5,
          bytes: 2 * 1024 * 1024, // 2MB
          fileCount: 1,
          isDirectory: false,
        },
        {
          id: "s3",
          toolId: "claude-code",
          toolName: "Claude Code",
          targetId: "claude-projects",
          path: "/dummy/s3",
          projectName: "Backend-API",
          title: "Database migration",
          updatedAt: new Date(now - 15 * 86400000).toISOString(),
          ageDays: 15,
          bytes: 80 * 1024 * 1024, // 80MB
          fileCount: 1,
          isDirectory: false,
        },
      ];

      // Filter older than 30d
      const olderThan30 = filterSessions(mockSessions, { olderThanDays: 30 });
      expect(olderThan30.map((s) => s.id)).toEqual(["s1"]);

      // Filter newer than 10d
      const newerThan10 = filterSessions(mockSessions, { newerThanDays: 10 });
      expect(newerThan10.map((s) => s.id)).toEqual(["s2"]);

      // Filter minBytes >= 50MB
      const largeSessions = filterSessions(mockSessions, {
        minBytes: 50 * 1024 * 1024,
      });
      expect(largeSessions.map((s) => s.id)).toEqual(["s1", "s3"]);

      // Filter by project query
      const backendSessions = filterSessions(mockSessions, {
        projectQuery: "backend",
      });
      expect(backendSessions.map((s) => s.id)).toEqual(["s1", "s3"]);

      // Filter by tool ID
      const codexOnly = filterSessions(mockSessions, {
        toolIds: ["codex"],
      });
      expect(codexOnly.map((s) => s.id)).toEqual(["s2"]);

      // Filter by searchQuery
      const searchRes = filterSessions(mockSessions, {
        searchQuery: "migration",
      });
      expect(searchRes.map((s) => s.id)).toEqual(["s3"]);
    });

    it("exports session to readable Markdown and JSON", () => {
      const sessionDir = join(mockHome, "export-test-session");
      mkdirSync(sessionDir, { recursive: true });
      const transcript = [
        JSON.stringify({
          type: "USER_INPUT",
          source: "USER_EXPLICIT",
          content: "Explain the architecture of Sweep.",
        }),
        JSON.stringify({
          type: "PLANNER_RESPONSE",
          source: "MODEL",
          content: "Sweep has core, cli, and vscode-extension packages.",
        }),
      ].join("\n");
      writeFileSync(join(sessionDir, "transcript.jsonl"), transcript, "utf-8");

      const session: ConversationSession = {
        id: "export-test",
        toolId: "antigravity",
        toolName: "Antigravity",
        targetId: "ag-brain",
        path: sessionDir,
        projectName: "Sweep",
        title: "Explain the architecture of Sweep",
        updatedAt: new Date().toISOString(),
        ageDays: 0,
        bytes: 2048,
        fileCount: 2,
        isDirectory: true,
      };

      const md = exportSessionToMarkdown(session);
      expect(md).toContain("# Session: Explain the architecture of Sweep");
      expect(md).toContain("### 👤 User (Turn 1)");
      expect(md).toContain("Explain the architecture of Sweep.");
      expect(md).toContain("### 🤖 Assistant");
      expect(md).toContain("Sweep has core, cli, and vscode-extension");

      const jsonStr = exportSessionToJson(session);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.session.id).toBe("export-test");
      expect(parsed.transcript.length).toBe(2);
      expect(parsed.transcript[0].type).toBe("USER_INPUT");
    });

    it("cleans sessions with dry-run and backup support", () => {
      const sessionDir = join(mockHome, "session-to-clean");
      mkdirSync(sessionDir, { recursive: true });
      writeFileSync(join(sessionDir, "dummy.txt"), "some chat data", "utf-8");

      const session: ConversationSession = {
        id: "session-to-clean",
        toolId: "antigravity",
        toolName: "Antigravity",
        targetId: "ag-brain",
        path: sessionDir,
        updatedAt: new Date().toISOString(),
        ageDays: 1,
        bytes: 14,
        fileCount: 1,
        isDirectory: true,
      };

      // 1. Dry run
      const dryResult = cleanSessions([session], {
        dryRun: true,
        home: mockHome,
      });
      expect(dryResult.dryRun).toBe(true);
      expect(dryResult.items[0]?.action).toBe("would-delete");
      expect(existsSync(sessionDir)).toBe(true);

      // 2. Real clean with backup
      const cleanResult = cleanSessions([session], {
        dryRun: false,
        backup: true,
        home: mockHome,
      });
      expect(cleanResult.dryRun).toBe(false);
      expect(cleanResult.items[0]?.action).toBe("backed-up");
      expect(existsSync(sessionDir)).toBe(false);
      expect(existsSync(cleanResult.backupDir!)).toBe(true);
    });
  });
});
