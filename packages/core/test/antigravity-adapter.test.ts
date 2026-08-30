import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  isEastAsianFullWidth,
  getDisplayWidth,
  truncateByDisplayWidth,
  sanitizeAntigravityPrompt,
  extractTranscriptPrompt,
  scanAntigravitySessions,
  cleanAntigravitySession
} from "../src/adapters/antigravity.ts";
import { scanSessions, cleanSessions } from "../src/session.ts";
import { detectPlatform } from "../src/paths.ts";

describe("Antigravity Adapter & CJK Visual Width Tests", () => {
  describe("CJK & East Asian Display Width", () => {
    it("correctly identifies fullwidth and halfwidth characters", () => {
      expect(isEastAsianFullWidth("你".charCodeAt(0))).toBe(true);
      expect(isEastAsianFullWidth("字".charCodeAt(0))).toBe(true);
      expect(isEastAsianFullWidth("A".charCodeAt(0))).toBe(false);
      expect(isEastAsianFullWidth("1".charCodeAt(0))).toBe(false);
      expect(isEastAsianFullWidth("@".charCodeAt(0))).toBe(false);
    });

    it("computes accurate display column width", () => {
      expect(getDisplayWidth("Hello")).toBe(5);
      expect(getDisplayWidth("你好")).toBe(4);
      expect(getDisplayWidth("Hello 你好")).toBe(10); // 6 ASCII + 4 CJK
    });

    it("truncates strings by visual width instead of character count", () => {
      // 10 columns max
      const chinese = "這是一段非常長的中文提問內容";
      const english = "This is a very long English prompt text";
      const mixed = "Git commit 剛剛已經完成了";

      const trChinese = truncateByDisplayWidth(chinese, 10);
      const trEnglish = truncateByDisplayWidth(english, 10);
      const trMixed = truncateByDisplayWidth(mixed, 10);

      expect(getDisplayWidth(trChinese)).toBeLessThanOrEqual(10);
      expect(getDisplayWidth(trEnglish)).toBeLessThanOrEqual(10);
      expect(getDisplayWidth(trMixed)).toBeLessThanOrEqual(10);
      expect(trChinese.endsWith("…")).toBe(true);
      expect(trEnglish.endsWith("…")).toBe(true);
    });
  });

  describe("Antigravity Prompt Sanitization Pipeline", () => {
    it("strips IDE tags, file mentions, and metadata", () => {
      const rawPrompt = `<USER_REQUEST>\n@[c:\\Users\\testuser\\Projects\\app\\README.md:L1-L20] @[c:\\Users\\testuser\\Projects\\app\\ROADMAP.md] 請幫我修復這個嚴重的 bug\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nLocal time: 2026-08-31\n</ADDITIONAL_METADATA>`;
      const clean = sanitizeAntigravityPrompt(rawPrompt, 26);
      expect(clean).toBe("請幫我修復這個嚴重的 bug");
    });

    it("falls back to file mention if user submitted only files", () => {
      const rawPrompt = `<USER_REQUEST>\n@[c:\\Users\\testuser\\Projects\\app\\package.json]\n</USER_REQUEST>`;
      const clean = sanitizeAntigravityPrompt(rawPrompt, 26);
      expect(clean).toBe("@package.json");
    });
  });

  describe("Unified Session Scanning & Deletion", () => {
    let mockHome: string;

    beforeEach(() => {
      mockHome = join(tmpdir(), `sweep-ag-test-${Math.random().toString(36).slice(2, 8)}`);
      mkdirSync(mockHome, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(mockHome)) {
        rmSync(mockHome, { recursive: true, force: true });
      }
    });

    it("merges brain folder and conversations db with matching UUID into single session", async () => {
      const uuid = "024c574b-6237-4b62-b233-586c41684061";
      const brainDir = join(mockHome, ".gemini", "antigravity-ide", "brain", uuid);
      const brainLogsDir = join(brainDir, ".system_generated", "logs");
      const convDir = join(mockHome, ".gemini", "antigravity-ide", "conversations");

      mkdirSync(brainLogsDir, { recursive: true });
      mkdirSync(convDir, { recursive: true });

      // Write transcript.jsonl
      const transcriptLine = JSON.stringify({
        step_index: 1,
        type: "USER_INPUT",
        created_at: "2026-08-30T14:48:36Z",
        content: "<USER_REQUEST>\n@[c:\\app\\README.md] 測試合併與語意化標題演算法\n</USER_REQUEST>"
      });
      writeFileSync(join(brainLogsDir, "transcript.jsonl"), transcriptLine + "\n");
      writeFileSync(join(brainDir, "artifact.md"), "plan content");

      // Write conversation database files
      writeFileSync(join(convDir, `${uuid}.db`), "sqlite-db-mock-data-bytes");
      writeFileSync(join(convDir, `${uuid}.db-wal`), "wal-bytes");

      const platform = detectPlatform();
      const sessions = scanSessions({
        home: mockHome,
        toolIds: ["antigravity"],
        platform,
        env: { USERPROFILE: mockHome, HOME: mockHome, APPDATA: join(mockHome, "AppData", "Roaming") }
      });

      expect(sessions.length).toBe(1);
      const s = sessions[0]!;
      expect(s.id).toBe(uuid);
      expect(s.title).toBe("測試合併與語意化標題演算法");
      expect(s.associatedPaths).toBeDefined();
      expect(s.associatedPaths!.length).toBe(3); // brain dir, .db, .db-wal

      // Test cleanSessions deletes both brain folder and db files
      const cleanRes = cleanSessions(sessions, {
        dryRun: false,
        backup: false,
        home: mockHome
      });

      expect(cleanRes.freedBytes).toBeGreaterThan(0);
      expect(existsSync(brainDir)).toBe(false);
      expect(existsSync(join(convDir, `${uuid}.db`))).toBe(false);
      expect(existsSync(join(convDir, `${uuid}.db-wal`))).toBe(false);
    });
  });
});
