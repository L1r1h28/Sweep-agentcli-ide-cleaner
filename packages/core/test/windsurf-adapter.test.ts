import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractWindsurfSessionMeta,
  scanWindsurfSessions,
} from "../src/adapters/windsurf.ts";
import { scanSessions } from "../src/session.ts";
import { scanDisk } from "../src/scan.ts";
import { planClean, runClean } from "../src/clean.ts";
import { TOOLS } from "../src/catalog.ts";
import { truncateByDisplayWidth, getDisplayWidth } from "../src/adapters/antigravity.ts";

describe("Windsurf & Cascade Adapter Tests", () => {
  let mockHome: string;
  let mockCascadeDir: string;
  let mockTrackerDir: string;
  let mockMemoriesDir: string;
  let mockSkillsDir: string;
  let mockWorkflowsDir: string;

  beforeEach(() => {
    mockHome = join(tmpdir(), `sweep-ws-test-${Math.random().toString(36).slice(2, 8)}`);
    mockCascadeDir = join(mockHome, ".codeium", "windsurf", "cascade");
    mockTrackerDir = join(mockHome, ".codeium", "windsurf", "code_tracker");
    mockMemoriesDir = join(mockHome, ".codeium", "windsurf", "memories");
    mockSkillsDir = join(mockHome, ".codeium", "windsurf", "skills");
    mockWorkflowsDir = join(mockHome, ".codeium", "windsurf", "global_workflows");

    mkdirSync(mockCascadeDir, { recursive: true });
    mkdirSync(join(mockTrackerDir, "history"), { recursive: true });
    mkdirSync(join(mockTrackerDir, "active"), { recursive: true });
    mkdirSync(mockMemoriesDir, { recursive: true });
    mkdirSync(join(mockSkillsDir, "debug"), { recursive: true });
    mkdirSync(mockWorkflowsDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(mockHome)) {
      rmSync(mockHome, { recursive: true, force: true });
    }
  });

  describe("Metadata Extraction & CJK Display Width", () => {
    it("correctly extracts session info from single JSON schema", () => {
      const sessFile = join(mockCascadeDir, "session1.json");
      writeFileSync(
        sessFile,
        JSON.stringify({
          id: "ws-sess-001",
          workspaceUri: "file:///Users/testuser/Projects/ai-dashboard",
          createdAt: "2026-08-30T10:00:00Z",
          messages: [
            { role: "system", content: "You are Cascade" },
            { role: "user", content: "請幫我重構 React Router 6 路由結構" },
          ],
        })
      );

      const meta = extractWindsurfSessionMeta(sessFile, 26);
      expect(meta.id).toBe("ws-sess-001");
      expect(meta.projectName).toBe("ai-dashboard");
      expect(meta.createdAt).toBe("2026-08-30T10:00:00Z");
      expect(meta.title).toBeDefined();
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
      expect(meta.title).toContain("請幫我重構");
    });

    it("correctly extracts session info from streaming JSONL logs", () => {
      const sessFile = join(mockCascadeDir, "stream-sess.jsonl");
      const lines = [
        JSON.stringify({ sessionId: "ws-sess-stream", cwd: "C:\\Users\\testuser\\Projects\\super-tool", timestamp: "2026-08-30T12:00:00Z" }),
        JSON.stringify({ type: "user_message", message: "Fix memory leak in background worker loop" }),
        JSON.stringify({ type: "assistant_message", message: "Sure, let's look at worker.ts" }),
      ];
      writeFileSync(sessFile, lines.join("\n"));

      const meta = extractWindsurfSessionMeta(sessFile, 26);
      expect(meta.id).toBe("ws-sess-stream");
      expect(meta.projectName).toBe("super-tool");
      expect(meta.title).toContain("Fix memory leak in backg");
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
    });

    it("correctly extracts session info from directory session structure", () => {
      const sessDir = join(mockCascadeDir, "ws-dir-session-123");
      mkdirSync(sessDir, { recursive: true });
      writeFileSync(
        join(sessDir, "metadata.json"),
        JSON.stringify({
          id: "ws-dir-session-123",
          title: "Implement CJK alignment",
          project: "Sweep-core",
        })
      );

      const meta = extractWindsurfSessionMeta(sessDir, 26);
      expect(meta.id).toBe("ws-dir-session-123");
      expect(meta.projectName).toBe("Sweep-core");
      expect(meta.title).toBe("Implement CJK alignment");
    });

    it("accurately calculates CJK visual width and truncates gracefully", () => {
      const cjkTitle = "全面優化 Windsurf 與 Cascade 對話快取清理演算法";
      const truncated = truncateByDisplayWidth(cjkTitle, 20);
      expect(getDisplayWidth(truncated)).toBeLessThanOrEqual(20);
      expect(truncated.endsWith("…")).toBe(true);
    });
  });

  describe("Cascade Session Scanning & SQLite WAL Aggregation", () => {
    it("scans and aggregates multi-file SQLite WAL trios as a single session", () => {
      const dbFile = join(mockCascadeDir, "session-sql-99.db");
      const walFile = join(mockCascadeDir, "session-sql-99.db-wal");
      const shmFile = join(mockCascadeDir, "session-sql-99.db-shm");

      writeFileSync(dbFile, "SQLite format 3\0 1234567890");
      writeFileSync(walFile, "WAL data chunk 12345");
      writeFileSync(shmFile, "SHM index data");

      const expectedTotalBytes = statSync(dbFile).size + statSync(walFile).size + statSync(shmFile).size;

      const sessions = scanWindsurfSessions({
        cascadeDirs: [mockCascadeDir],
        nowMs: Date.now(),
      });

      const sqlSession = sessions.find((s) => s.id === "session-sql-99");
      expect(sqlSession).toBeDefined();
      expect(sqlSession?.fileCount).toBe(3);
      expect(sqlSession?.associatedPaths).toHaveLength(3);
      expect(sqlSession?.bytes).toBe(expectedTotalBytes);
      expect(sqlSession?.title).toMatch(/^Session \(\d{2}-\d{2} \d{2}:\d{2}\)$/);
    });

    it("scans mixed directory sessions and single jsonl files seamlessly", () => {
      // 1. Directory session
      const dir1 = join(mockCascadeDir, "dir-sess-1");
      mkdirSync(dir1, { recursive: true });
      writeFileSync(join(dir1, "transcript.jsonl"), JSON.stringify({ type: "user", text: "Create vitest test" }));

      // 2. JSONL session
      const jsonl1 = join(mockCascadeDir, "file-sess-2.jsonl");
      writeFileSync(jsonl1, JSON.stringify({ role: "user", content: "Optimize database indexes" }));

      const sessions = scanWindsurfSessions({
        cascadeDirs: [mockCascadeDir],
        nowMs: Date.now(),
      });

      expect(sessions.length).toBe(2);
      const dirSess = sessions.find((s) => s.id === "dir-sess-1");
      const fileSess = sessions.find((s) => s.id === "file-sess-2");

      expect(dirSess).toBeDefined();
      expect(dirSess?.isDirectory).toBe(true);
      expect(dirSess?.title).toBe("Create vitest test");

      expect(fileSess).toBeDefined();
      expect(fileSess?.isDirectory).toBe(false);
      expect(fileSess?.title).toBe("Optimize database indexes");
    });
  });

  describe("Integration with scanSessions & Clean Planning", () => {
    it("scanSessions discovers Windsurf Cascade conversations via global config", () => {
      const sessFile = join(mockCascadeDir, "integration-sess.json");
      writeFileSync(
        sessFile,
        JSON.stringify({
          id: "ws-integration-test",
          cwd: "/home/testuser/my-app",
          title: "Integration Test Session",
        })
      );

      const sessions = scanSessions({
        home: mockHome,
        toolIds: ["windsurf"],
        env: { USERPROFILE: mockHome, HOME: mockHome },
      });

      expect(sessions.length).toBeGreaterThanOrEqual(1);
      const target = sessions.find((s) => s.id === "integration-sess");
      expect(target).toBeDefined();
      expect(target?.toolId).toBe("windsurf");
      expect(target?.projectName).toBe("my-app");
    });

    it("strictly preserves protected memories, workflows, skills, and mcp_config.json while planning clean", () => {
      // Setup protected files
      const mcpFile = join(mockHome, ".codeium", "windsurf", "mcp_config.json");
      const rulesFile = join(mockMemoriesDir, "global_rules.md");
      const memPb = join(mockMemoriesDir, "memory-1.pb");
      const skillFile = join(mockSkillsDir, "debug", "SKILL.md");
      const workflowFile = join(mockWorkflowsDir, "gitpush.md");
      const settingsPb = join(mockHome, ".codeium", "windsurf", "user_settings.pb");
      const installId = join(mockHome, ".codeium", "windsurf", "installation_id");

      writeFileSync(mcpFile, JSON.stringify({ mcpServers: {} }));
      writeFileSync(rulesFile, "# Global Rules");
      writeFileSync(memPb, "protobuf binary data");
      writeFileSync(skillFile, "---\nname: debug\n---\n");
      writeFileSync(workflowFile, "git push instructions");
      writeFileSync(settingsPb, "user settings pb");
      writeFileSync(installId, "uuid-1234");

      // Setup cleanable snapshot in code_tracker/history
      const historyFile = join(mockTrackerDir, "history", "snapshot_123.py");
      writeFileSync(historyFile, "print('old snapshot')");

      // Setup cleanable cache
      const appDataDir = join(mockHome, "AppData", "Roaming", "Windsurf", "Cache");
      mkdirSync(appDataDir, { recursive: true });
      const cacheFile = join(appDataDir, "data_0");
      writeFileSync(cacheFile, "cache binary bytes");

      const scanRes = scanDisk({
        platform: "win",
        home: mockHome,
        env: {
          APPDATA: join(mockHome, "AppData", "Roaming"),
          LOCALAPPDATA: join(mockHome, "AppData", "Local"),
          USERPROFILE: mockHome,
        },
        toolIds: ["windsurf"],
        tools: TOOLS,
      });

      expect(scanRes.entries.some((e) => e.toolId === "windsurf" && e.exists)).toBe(true);

      const plan = planClean(scanRes, {
        kinds: ["cache", "conversations"],
        dryRun: true,
        backup: false,
      });

      const deletePaths = plan.map((i) => i.path.toLowerCase());

      // Should plan cache and snapshot
      expect(deletePaths.some((p) => p.includes("cache"))).toBe(true);
      expect(deletePaths.some((p) => p.includes("code_tracker\\history") || p.includes("code_tracker/history"))).toBe(true);

      // Should NEVER plan protected paths
      for (const item of plan) {
        expect(item.path).not.toContain("mcp_config.json");
        expect(item.path).not.toContain("memories");
        expect(item.path).not.toContain("skills");
        expect(item.path).not.toContain("global_workflows");
        expect(item.path).not.toContain("user_settings.pb");
        expect(item.path).not.toContain("installation_id");
      }

      // Dry-run clean
      const result = runClean(scanRes, {
        kinds: ["cache", "conversations"],
        dryRun: true,
        backup: false,
      });
      expect(result.dryRun).toBe(true);
      expect(existsSync(mcpFile)).toBe(true);
      expect(existsSync(rulesFile)).toBe(true);
      expect(existsSync(memPb)).toBe(true);
      expect(existsSync(skillFile)).toBe(true);
      expect(existsSync(workflowFile)).toBe(true);
    });
  });
});
