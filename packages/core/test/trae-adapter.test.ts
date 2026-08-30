import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractTraeSessionMeta,
  scanTraeSessions,
} from "../src/adapters/trae.ts";
import { scanSessions } from "../src/session.ts";
import { scanDisk } from "../src/scan.ts";
import { planClean, runClean } from "../src/clean.ts";
import { getTool, TOOLS } from "../src/catalog.ts";
import { truncateByDisplayWidth, getDisplayWidth } from "../src/adapters/antigravity.ts";

describe("ByteDance Trae & SOLO Agent Adapter Tests", () => {
  let mockHome: string;
  let mockAppData: string;
  let mockTraeAiAgentDir: string;
  let mockTraeCnAiAgentDir: string;
  let mockTraeMemoryDir: string;
  let mockTraeWorktreesDir: string;
  let mockTraeRulesDir: string;
  let mockTraeSkillsDir: string;
  let mockTraePermissionDir: string;
  let mockTraeCkgDir: string;
  let mockTraeCkgServerDir: string;
  let mockTraeWebStorageDir: string;

  beforeEach(() => {
    mockHome = join(tmpdir(), `sweep-tr-test-${Math.random().toString(36).slice(2, 8)}`);
    mockAppData = join(mockHome, "AppData", "Roaming");
    mockTraeAiAgentDir = join(mockAppData, "Trae", "ModularData", "ai-agent");
    mockTraeCnAiAgentDir = join(mockAppData, "Trae CN", "ModularData", "ai-agent");
    mockTraeMemoryDir = join(mockHome, ".trae", "memory");
    mockTraeWorktreesDir = join(mockHome, ".trae", "worktrees");
    mockTraeRulesDir = join(mockHome, ".trae", "rules");
    mockTraeSkillsDir = join(mockHome, ".trae", "skills");
    mockTraePermissionDir = join(mockHome, ".trae", "permission");
    mockTraeCkgDir = join(mockAppData, "Trae", "User", "globalStorage", ".ckg");
    mockTraeCkgServerDir = join(mockAppData, "Trae", "ModularData", "ckg_server");
    mockTraeWebStorageDir = join(mockAppData, "Trae", "WebStorage");

    mkdirSync(mockTraeAiAgentDir, { recursive: true });
    mkdirSync(mockTraeCnAiAgentDir, { recursive: true });
    mkdirSync(mockTraeMemoryDir, { recursive: true });
    mkdirSync(mockTraeWorktreesDir, { recursive: true });
    mkdirSync(mockTraeRulesDir, { recursive: true });
    mkdirSync(mockTraeSkillsDir, { recursive: true });
    mkdirSync(mockTraePermissionDir, { recursive: true });
    mkdirSync(mockTraeCkgDir, { recursive: true });
    mkdirSync(mockTraeCkgServerDir, { recursive: true });
    mkdirSync(mockTraeWebStorageDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(mockHome)) {
      rmSync(mockHome, { recursive: true, force: true });
    }
  });

  describe("Metadata Extraction & CJK Display Width", () => {
    it("correctly extracts session info from Trae SOLO memory JSON", () => {
      const memDir = join(mockTraeMemoryDir, "solo-project-001");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(
        join(memDir, "memory.json"),
        JSON.stringify({
          sessionId: "solo-sess-001",
          projectName: "doubao-workflow-app",
          createdAt: "2026-08-30T15:00:00Z",
          task: "重構 ByteDance Doubao SDK 呼叫鏈路",
        })
      );

      const meta = extractTraeSessionMeta(memDir, 26);
      expect(meta.id).toBe("solo-sess-001");
      expect(meta.projectName).toBe("doubao-workflow-app");
      expect(meta.createdAt).toBe("2026-08-30T15:00:00Z");
      expect(meta.title).toBeDefined();
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
      expect(meta.title).toContain("重構 ByteDance Doubao");
    });

    it("correctly extracts session info from Markdown summary in memory directory", () => {
      const memDir = join(mockTraeMemoryDir, "solo-doc-002");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(
        join(memDir, "summary.md"),
        "# Fix CKG server indexing deadlock in background worker\nDetailed log of actions..."
      );

      const meta = extractTraeSessionMeta(memDir, 26);
      expect(meta.title).toContain("Fix CKG server indexing");
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
    });
  });

  describe("SQLite WAL Trio Aggregation", () => {
    it("aggregates database.db, database.db-wal, and database.db-shm into a single session item", () => {
      const dbPath = join(mockTraeAiAgentDir, "database.db");
      const walPath = join(mockTraeAiAgentDir, "database.db-wal");
      const shmPath = join(mockTraeAiAgentDir, "database.db-shm");

      writeFileSync(dbPath, Buffer.alloc(1000, 1));
      writeFileSync(walPath, Buffer.alloc(500, 2));
      writeFileSync(shmPath, Buffer.alloc(200, 3));

      const sessions = scanSessions({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae-ide"],
      });

      expect(sessions.length).toBe(1);
      const s = sessions[0]!;
      expect(s.id).toBe("database");
      expect(s.bytes).toBe(1700);
      expect(s.fileCount).toBe(3);
      expect(s.associatedPaths).toBeDefined();
      expect(s.associatedPaths!.length).toBe(3);
      expect(s.associatedPaths).toContain(dbPath);
      expect(s.associatedPaths).toContain(walPath);
      expect(s.associatedPaths).toContain(shmPath);
    });
  });

  describe("Session Scanning & Product Separation", () => {
    it("scans both IDE database and SOLO memory for unified trae tool", () => {
      // IDE SQLite DB
      writeFileSync(join(mockTraeAiAgentDir, "database.db"), "db payload");

      // SOLO CLI memory
      const memDir = join(mockTraeMemoryDir, "solo-task-abc");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(
        join(memDir, "session.json"),
        JSON.stringify({ sessionId: "solo-task-abc", title: "SOLO Task ABC" })
      );

      const sessions = scanSessions({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae"],
      });

      expect(sessions.length).toBe(2);
      const ids = sessions.map((s) => s.id);
      expect(ids).toContain("database");
      expect(ids).toContain("solo-task-abc");
    });

    it("scans only IDE DB when toolId is trae-ide", () => {
      writeFileSync(join(mockTraeAiAgentDir, "database.db"), "db payload");
      const memDir = join(mockTraeMemoryDir, "solo-task-abc");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(
        join(memDir, "session.json"),
        JSON.stringify({ sessionId: "solo-task-abc", title: "SOLO Task ABC" })
      );

      const sessions = scanSessions({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae-ide"],
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0]?.id).toBe("database");
      expect(sessions[0]?.toolId).toBe("trae-ide");
    });

    it("scans only SOLO agent memory when toolId is trae-cli", () => {
      writeFileSync(join(mockTraeAiAgentDir, "database.db"), "db payload");
      const memDir = join(mockTraeMemoryDir, "solo-task-abc");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(
        join(memDir, "session.json"),
        JSON.stringify({ sessionId: "solo-task-abc", title: "SOLO Task ABC" })
      );

      const sessions = scanSessions({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae-cli"],
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0]?.id).toBe("solo-task-abc");
      expect(sessions[0]?.toolId).toBe("trae-cli");
    });
  });

  describe("Cache Precision Targeting & Safety Protection", () => {
    it("targets .ckg, ckg_server, and WebStorage as safe-to-delete cache", () => {
      writeFileSync(join(mockTraeCkgDir, "graph.idx"), "graph index data");
      writeFileSync(join(mockTraeCkgServerDir, "server.log"), "ckg server log");
      writeFileSync(join(mockTraeWebStorageDir, "storage.dat"), "webstorage data");

      const report = scanDisk({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae"],
      });

      const cleanPlan = planClean(report, {
        kinds: ["cache"],
        toolIds: ["trae"],
        dryRun: false,
        backup: false,
      });

      const paths = cleanPlan.map((i) => i.path);
      expect(paths.some((p) => p.includes(".ckg"))).toBe(true);
      expect(paths.some((p) => p.includes("ckg_server"))).toBe(true);
      expect(paths.some((p) => p.includes("WebStorage"))).toBe(true);
    });

    it("never deletes ~/.trae/rules/, skills/, permission/, or trae-jwt-token", () => {
      const ruleFile = join(mockTraeRulesDir, "code-style.md");
      const skillFile = join(mockTraeSkillsDir, "agent-skill.json");
      const permFile = join(mockTraePermissionDir, "allowlist.json");
      const tokenFile = join(mockHome, ".trae", "trae-jwt-token");
      const ckgFile = join(mockTraeCkgDir, "graph.idx");

      writeFileSync(ruleFile, "# Trae Rules");
      writeFileSync(skillFile, '{"skill": true}');
      writeFileSync(permFile, '{"permission": "all"}');
      writeFileSync(tokenFile, "secret-jwt-token");
      writeFileSync(ckgFile, "ckg index");

      const report = scanDisk({
        platform: "win",
        home: mockHome,
        env: { APPDATA: mockAppData },
        toolIds: ["trae"],
      });

      const cleanPlan = planClean(report, {
        kinds: ["cache", "conversations"],
        toolIds: ["trae"],
        dryRun: false,
        backup: false,
      });

      for (const item of cleanPlan) {
        expect(item.path).not.toContain(".trae\\rules");
        expect(item.path).not.toContain(".trae\\skills");
        expect(item.path).not.toContain(".trae\\permission");
        expect(item.path).not.toContain("trae-jwt-token");
      }

      runClean(report, {
        kinds: ["cache"],
        toolIds: ["trae"],
        dryRun: false,
        backup: false,
      });

      expect(existsSync(ruleFile)).toBe(true);
      expect(existsSync(skillFile)).toBe(true);
      expect(existsSync(permFile)).toBe(true);
      expect(existsSync(tokenFile)).toBe(true);
    });
  });
});
