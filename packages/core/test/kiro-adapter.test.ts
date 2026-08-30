import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractKiroSessionMeta,
  scanKiroSessions,
} from "../src/adapters/kiro.ts";
import { scanSessions } from "../src/session.ts";
import { scanDisk } from "../src/scan.ts";
import { detectPlatform } from "../src/paths.ts";
import { planClean, runClean } from "../src/clean.ts";
import { getTool, TOOLS } from "../src/catalog.ts";
import { truncateByDisplayWidth, getDisplayWidth } from "../src/adapters/antigravity.ts";

describe("AWS Kiro & Kiro CLI Adapter Tests", () => {
  let mockHome: string;
  let mockAppData: string;
  let mockKiroAgentDir: string;
  let mockKiroCliSessions: string;
  let mockKiroExtensions: string;
  let mockKiroSteering: string;
  let mockKiroSkills: string;
  let mockKiroSettings: string;
  let mockKiroCacheDir: string;

  beforeEach(() => {
    const platform = detectPlatform();
    const isWin = platform === "win";
    const isMac = platform === "mac";
    mockHome = join(tmpdir(), `sweep-kr-test-${Math.random().toString(36).slice(2, 8)}`);
    mockAppData = isWin
      ? join(mockHome, "AppData", "Roaming")
      : isMac
      ? join(mockHome, "Library", "Application Support")
      : join(mockHome, ".config");
    mockKiroAgentDir = join(mockAppData, "Kiro", "User", "globalStorage", "kiro.kiroagent");
    mockKiroCliSessions = join(mockHome, ".kiro", "sessions");
    mockKiroExtensions = join(mockHome, ".kiro", "extensions");
    mockKiroSteering = join(mockHome, ".kiro", "steering");
    mockKiroSkills = join(mockHome, ".kiro", "skills");
    mockKiroSettings = join(mockHome, ".kiro", "settings");
    mockKiroCacheDir = isWin
      ? join(mockAppData, "Kiro", "Cache")
      : isMac
      ? join(mockHome, "Library", "Caches", "Kiro")
      : join(mockAppData, "Kiro", "Cache");

    mkdirSync(mockKiroAgentDir, { recursive: true });
    mkdirSync(mockKiroCliSessions, { recursive: true });
    mkdirSync(join(mockKiroExtensions, "aws-q-core"), { recursive: true });
    mkdirSync(join(mockKiroSteering, "custom-rules"), { recursive: true });
    mkdirSync(join(mockKiroSkills, "deploy-skill"), { recursive: true });
    mkdirSync(mockKiroSettings, { recursive: true });
    mkdirSync(mockKiroCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(mockHome)) {
      rmSync(mockHome, { recursive: true, force: true });
    }
  });

  describe("Metadata Extraction & CJK Display Width", () => {
    it("correctly extracts session info from Kiro .chat file", () => {
      const chatFile = join(mockKiroAgentDir, "kr-session-1.chat");
      writeFileSync(
        chatFile,
        JSON.stringify({
          sessionId: "kr-session-1",
          workspacePath: "C:\\Users\\testuser\\Projects\\ecommerce-api",
          createdAt: "2026-08-30T14:00:00Z",
          messages: [
            { role: "system", content: "You are Kiro Agent" },
            { role: "user", content: "優化 AWS Lambda 與 DynamoDB 查詢效能" },
          ],
        })
      );

      const meta = extractKiroSessionMeta(chatFile, 26);
      expect(meta.id).toBe("kr-session-1");
      expect(meta.projectName).toBe("ecommerce-api");
      expect(meta.createdAt).toBe("2026-08-30T14:00:00Z");
      expect(meta.title).toBeDefined();
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
      expect(meta.title).toContain("優化 AWS Lambda");
    });

    it("correctly extracts session info from Kiro CLI streaming JSONL session", () => {
      const sessFile = join(mockKiroCliSessions, "sess-stream-002.jsonl");
      const lines = [
        JSON.stringify({ sessionId: "sess-stream-002", cwd: "/home/developer/repos/cloud-infra", timestamp: "2026-08-30T16:00:00Z" }),
        JSON.stringify({ role: "user", content: "Terraform CDK infrastructure migration plan" }),
        JSON.stringify({ role: "assistant", content: "Generating CDK stack..." }),
      ];
      writeFileSync(sessFile, lines.join("\n"));

      const meta = extractKiroSessionMeta(sessFile, 26);
      expect(meta.id).toBe("sess-stream-002");
      expect(meta.projectName).toBe("cloud-infra");
      expect(meta.title).toContain("Terraform CDK");
      expect(getDisplayWidth(meta.title!)).toBeLessThanOrEqual(26);
    });

    it("correctly extracts session info from Kiro Hash folder directory", () => {
      const hashDir = join(mockKiroAgentDir, "abc123hash");
      mkdirSync(hashDir, { recursive: true });
      writeFileSync(
        join(hashDir, "metadata.json"),
        JSON.stringify({
          id: "abc123hash",
          title: "Refactor S3 multi-part upload handler",
          projectName: "s3-uploader",
        })
      );

      const meta = extractKiroSessionMeta(hashDir, 26);
      expect(meta.id).toBe("abc123hash");
      expect(meta.projectName).toBe("s3-uploader");
      expect(meta.title).toContain("Refactor S3 multi-part");
    });
  });

  describe("Session Scanning & Product Separation", () => {
    it("scans both IDE chats and CLI sessions for unified kiro tool", () => {
      // IDE Chat
      writeFileSync(
        join(mockKiroAgentDir, "ide-chat.chat"),
        JSON.stringify({
          sessionId: "ide-chat",
          title: "IDE Chat Session",
          workspacePath: "C:\\projects\\my-app",
        })
      );

      // CLI Session
      const cliDir = join(mockKiroCliSessions, "cli-session-dir");
      mkdirSync(cliDir, { recursive: true });
      writeFileSync(
        join(cliDir, "session.json"),
        JSON.stringify({
          id: "cli-session-dir",
          title: "CLI Terminal Session",
          project: "my-cli-tool",
        })
      );

      const platform = detectPlatform();
      const sessions = scanSessions({
        platform,
        home: mockHome,
        env: { APPDATA: mockAppData, LOCALAPPDATA: join(mockHome, "AppData", "Local"), USERPROFILE: mockHome, HOME: mockHome },
        toolIds: ["kiro"],
      });

      expect(sessions.length).toBe(2);
      const ids = sessions.map((s) => s.id);
      expect(ids).toContain("ide-chat");
      expect(ids).toContain("cli-session-dir");
    });

    it("scans only IDE chats when toolId is kiro-ide", () => {
      writeFileSync(
        join(mockKiroAgentDir, "ide-only.chat"),
        JSON.stringify({ sessionId: "ide-only", title: "IDE Only Chat" })
      );
      writeFileSync(
        join(mockKiroCliSessions, "cli-only.json"),
        JSON.stringify({ sessionId: "cli-only", title: "CLI Only Chat" })
      );

      const platform = detectPlatform();
      const sessions = scanSessions({
        platform,
        home: mockHome,
        env: { APPDATA: mockAppData, LOCALAPPDATA: join(mockHome, "AppData", "Local"), USERPROFILE: mockHome, HOME: mockHome },
        toolIds: ["kiro-ide"],
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0]?.id).toBe("ide-only");
      expect(sessions[0]?.toolId).toBe("kiro-ide");
    });

    it("scans only CLI sessions when toolId is kiro-cli", () => {
      writeFileSync(
        join(mockKiroAgentDir, "ide-only.chat"),
        JSON.stringify({ sessionId: "ide-only", title: "IDE Only Chat" })
      );
      writeFileSync(
        join(mockKiroCliSessions, "cli-only.json"),
        JSON.stringify({ sessionId: "cli-only", title: "CLI Only Chat" })
      );

      const platform = detectPlatform();
      const sessions = scanSessions({
        platform,
        home: mockHome,
        env: { APPDATA: mockAppData, LOCALAPPDATA: join(mockHome, "AppData", "Local"), USERPROFILE: mockHome, HOME: mockHome },
        toolIds: ["kiro-cli"],
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0]?.id).toBe("cli-only");
      expect(sessions[0]?.toolId).toBe("kiro-cli");
    });
  });

  describe("Safety & Whitelist Protection", () => {
    it("never deletes ~/.kiro/extensions/, steering/, skills/, or settings/ during cleaning", () => {
      const extFile = join(mockKiroExtensions, "aws-q-core", "extension.vsix");
      const steeringFile = join(mockKiroSteering, "custom-rules", "rule.md");
      const skillFile = join(mockKiroSkills, "deploy-skill", "skill.yaml");
      const settingsFile = join(mockKiroSettings, "cli.json");
      const cacheFile = join(mockKiroCacheDir, "temp.cache");

      writeFileSync(extFile, "extension binary payload");
      writeFileSync(steeringFile, "# Steering rule");
      writeFileSync(skillFile, "name: deploy");
      writeFileSync(settingsFile, '{"key": "value"}');
      writeFileSync(cacheFile, "temp cache data");

      const platform = detectPlatform();
      const report = scanDisk({
        platform,
        home: mockHome,
        env: { APPDATA: mockAppData, LOCALAPPDATA: join(mockHome, "AppData", "Local"), USERPROFILE: mockHome, HOME: mockHome },
        toolIds: ["kiro"],
      });

      const cleanPlan = planClean(report, {
        kinds: ["cache", "conversations"],
        toolIds: ["kiro"],
        dryRun: false,
        backup: false,
      });

      // Verify protected files are not in the plan
      for (const item of cleanPlan) {
        expect(item.path).not.toContain(".kiro/extensions");
        expect(item.path).not.toContain(".kiro\\extensions");
        expect(item.path).not.toContain(".kiro/steering");
        expect(item.path).not.toContain(".kiro\\steering");
        expect(item.path).not.toContain(".kiro/skills");
        expect(item.path).not.toContain(".kiro\\skills");
        expect(item.path).not.toContain(".kiro/settings");
        expect(item.path).not.toContain(".kiro\\settings");
      }

      const result = runClean(report, {
        kinds: ["cache"],
        toolIds: ["kiro"],
        dryRun: false,
        backup: false,
      });

      // Assert that protected items still exist on disk
      expect(existsSync(extFile)).toBe(true);
      expect(existsSync(steeringFile)).toBe(true);
      expect(existsSync(skillFile)).toBe(true);
      expect(existsSync(settingsFile)).toBe(true);
    });
  });
});
