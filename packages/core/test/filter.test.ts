import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  globToRegex,
  isPathWhitelisted,
  isProjectWhitelisted,
  isSessionIdWhitelisted,
  isSessionWhitelisted,
} from "../src/filter.ts";
import { scanDisk } from "../src/scan.ts";
import { planClean, runClean } from "../src/clean.ts";
import { cleanSessions, type ConversationSession } from "../src/session.ts";
import type { SweepConfig, WhitelistRules } from "../src/types.ts";

describe("Whitelist Filtering & Non-Deletion Protection", () => {
  const testDir = join(tmpdir(), `sweep-filter-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("globToRegex & isPathWhitelisted", () => {
    it("matches basic filename and wildcards", () => {
      const rules: WhitelistRules = {
        patterns: ["**/*.keep", "**/keep-*/**", "*/secret/*"],
      };

      expect(isPathWhitelisted("C:/projects/myapp/data.keep", rules)).toBe(true);
      expect(isPathWhitelisted("C:\\projects\\keep-archive\\session.jsonl", rules)).toBe(true);
      expect(isPathWhitelisted("/home/user/secret/chats.db", rules)).toBe(true);
      expect(isPathWhitelisted("C:/projects/myapp/trash.log", rules)).toBe(false);
    });
  });

  describe("isProjectWhitelisted & isSessionIdWhitelisted", () => {
    it("matches whitelisted projects and session IDs", () => {
      const rules: WhitelistRules = {
        projects: ["ProductionBackend", "ClientPortal"],
        sessionIds: ["uuid-1234-abcd", "sess_keep_999"],
      };

      expect(isProjectWhitelisted("ProductionBackend", rules)).toBe(true);
      expect(isProjectWhitelisted("productionbackend", rules)).toBe(true);
      expect(isProjectWhitelisted("OtherProject", rules)).toBe(false);

      expect(isSessionIdWhitelisted("uuid-1234-abcd", rules)).toBe(true);
      expect(isSessionIdWhitelisted("random-session-id", rules)).toBe(false);
    });

    it("evaluates session objects comprehensively", () => {
      const rules: WhitelistRules = {
        projects: ["CoreBanking"],
        patterns: ["**/pinned/**"],
        sessionIds: ["sess-vip-001"],
      };

      const session1: ConversationSession = {
        id: "sess-vip-001",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        path: "/home/user/.claude/sess1.jsonl",
        updatedAt: new Date().toISOString(),
        ageDays: 1,
        bytes: 500,
        fileCount: 1,
        isDirectory: false,
      };

      const session2: ConversationSession = {
        id: "sess-random-002",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        projectName: "CoreBanking",
        path: "/home/user/.claude/sess2.jsonl",
        updatedAt: new Date().toISOString(),
        ageDays: 1,
        bytes: 500,
        fileCount: 1,
        isDirectory: false,
      };

      const session3: ConversationSession = {
        id: "sess-random-003",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        path: "/home/user/pinned/sess3.jsonl",
        updatedAt: new Date().toISOString(),
        ageDays: 1,
        bytes: 500,
        fileCount: 1,
        isDirectory: false,
      };

      const session4: ConversationSession = {
        id: "sess-trash-004",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        projectName: "DisposableApp",
        path: "/home/user/.claude/sess4.jsonl",
        updatedAt: new Date().toISOString(),
        ageDays: 1,
        bytes: 500,
        fileCount: 1,
        isDirectory: false,
      };

      expect(isSessionWhitelisted(session1, rules)).toBe(true);
      expect(isSessionWhitelisted(session2, rules)).toBe(true);
      expect(isSessionWhitelisted(session3, rules)).toBe(true);
      expect(isSessionWhitelisted(session4, rules)).toBe(false);
    });
  });

  describe("Integration: cleanDisk & cleanSessions protection", () => {
    it("strictly prevents deletion of whitelisted sessions in cleanSessions", () => {
      const keepFile = join(testDir, "keep-session.jsonl");
      const delFile = join(testDir, "normal-session.jsonl");
      writeFileSync(keepFile, `{"msg":"important"}\n`, "utf-8");
      writeFileSync(delFile, `{"msg":"disposable"}\n`, "utf-8");

      const config: SweepConfig = {
        version: "1.1.0",
        whitelist: {
          patterns: ["**/keep-*/**", "*keep*"],
          projects: [],
          sessionIds: [],
        },
      };

      const sessionKeep: ConversationSession = {
        id: "keep-1",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        path: keepFile,
        updatedAt: new Date().toISOString(),
        ageDays: 10,
        bytes: 100,
        fileCount: 1,
        isDirectory: false,
        isWhitelisted: true,
      };

      const sessionDel: ConversationSession = {
        id: "del-1",
        toolId: "claude-code",
        toolName: "Claude Code",
        targetId: "claude-projects",
        path: delFile,
        updatedAt: new Date().toISOString(),
        ageDays: 10,
        bytes: 100,
        fileCount: 1,
        isDirectory: false,
      };

      const result = cleanSessions([sessionKeep, sessionDel], {
        dryRun: false,
        backup: false,
        config,
      });

      expect(result.items.find((i) => i.session.id === "keep-1")?.action).toBe("skipped");
      expect(result.items.find((i) => i.session.id === "del-1")?.action).toBe("deleted");

      // Verify filesystem state
      expect(existsSync(keepFile)).toBe(true);
      expect(existsSync(delFile)).toBe(false);
    });
  });
});
