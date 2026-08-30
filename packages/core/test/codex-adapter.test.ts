import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadCodexSessionIndex,
  findCodexSessionFiles,
  extractCodexPromptAndMeta,
  scanCodexSessions,
  cleanCodexSession,
} from "../src/adapters/codex.ts";
import { scanSessions, cleanSessions } from "../src/session.ts";
import { scanDisk } from "../src/scan.ts";
import { planClean, runClean } from "../src/clean.ts";
import { detectPlatform } from "../src/paths.ts";
import { TOOLS } from "../src/catalog.ts";

describe("Codex Adapter & Deep Session Tests", () => {
  let mockHome: string;

  beforeEach(() => {
    mockHome = join(tmpdir(), `sweep-codex-test-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(mockHome, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(mockHome)) {
      rmSync(mockHome, { recursive: true, force: true });
    }
  });

  describe("Session Index Parsing", () => {
    it("parses session_index.jsonl into a lookup map", () => {
      const indexPath = join(mockHome, "session_index.jsonl");
      const content = [
        JSON.stringify({ id: "019ed46a-440c", thread_name: "回應問候", updated_at: "2026-06-17T07:10:10Z" }),
        JSON.stringify({ id: "01a04854-aa6b", thread_name: "修正 TUI 錯誤訊息遺失", updated_at: "2026-08-28T12:25:08Z" }),
      ].join("\n");

      writeFileSync(indexPath, content, "utf-8");
      const indexMap = loadCodexSessionIndex(indexPath);

      expect(indexMap.size).toBe(2);
      expect(indexMap.get("019ed46a-440c")).toBe("回應問候");
      expect(indexMap.get("01a04854-aa6b")).toBe("修正 TUI 錯誤訊息遺失");
    });
  });

  describe("Deep Recursive Session Discovery", () => {
    it("discovers rollout files in nested YYYY/MM/DD directory structures", () => {
      const nestedDir = join(mockHome, ".codex", "sessions", "2026", "08", "28");
      mkdirSync(nestedDir, { recursive: true });

      const file1 = join(nestedDir, "rollout-2026-08-28T20-25-03-01a04854-aa6b.jsonl");
      const file2 = join(nestedDir, "rollout-2026-08-28T21-00-00-01a04854-bbbb.jsonl");
      writeFileSync(file1, "{}\n");
      writeFileSync(file2, "{}\n");

      const found = findCodexSessionFiles(join(mockHome, ".codex", "sessions"));
      expect(found.length).toBe(2);
      expect(found.map((f) => f.path)).toContain(file1);
      expect(found.map((f) => f.path)).toContain(file2);
    });
  });

  describe("Rollout Content & Prompt Parsing", () => {
    it("extracts workspace from turn_context and skips environment_context to find human prompt", () => {
      const rolloutPath = join(mockHome, "test-rollout.jsonl");
      const lines = [
        JSON.stringify({
          type: "turn_context",
          payload: {
            turn_id: "t1",
            cwd: "C:\\Users\\testuser\\Projects\\agent_code",
            workspace_roots: ["C:\\Users\\testuser\\Projects\\agent_code"],
          },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "<environment_context>\n  <cwd>C:\\Users\\testuser\\Projects\\agent_code</cwd>\n</environment_context>" }],
          },
        }),
        JSON.stringify({
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "幫我看看最後的幾個 logs，為什麼寫入錯誤？\n" }],
          },
        }),
      ];

      writeFileSync(rolloutPath, lines.join("\n"), "utf-8");
      const meta = extractCodexPromptAndMeta(rolloutPath, 26);

      expect(meta.projectName).toBe("agent_code");
      expect(meta.title).toBe("幫我看看最後的幾個 logs…");
    });

    it("extracts prompt from event_msg format", () => {
      const rolloutPath = join(mockHome, "test-event.jsonl");
      const lines = [
        JSON.stringify({
          type: "event_msg",
          payload: {
            type: "user_message",
            message: "請更新 sandbox 測試 patch 目標",
          },
        }),
      ];

      writeFileSync(rolloutPath, lines.join("\n"), "utf-8");
      const meta = extractCodexPromptAndMeta(rolloutPath, 26);

      expect(meta.title).toBe("請更新 sandbox 測試 patc…");
    });
  });

  describe("Integration in scanSessions", () => {
    it("scans nested Codex sessions and prioritizes session_index thread_name", () => {
      const codexDir = join(mockHome, ".codex");
      const sessionsDir = join(codexDir, "sessions", "2026", "08", "28");
      mkdirSync(sessionsDir, { recursive: true });

      const uuid = "01a04854-aa6b-7530-8e16-da94f9f95614";
      const rolloutFile = join(sessionsDir, `rollout-2026-08-28T20-25-03-${uuid}.jsonl`);
      const rolloutLines = [
        JSON.stringify({
          type: "turn_context",
          payload: { cwd: "C:\\Projects\\Sweep", thread_id: uuid },
        }),
        JSON.stringify({
          type: "response_item",
          payload: { type: "message", role: "user", content: [{ type: "input_text", text: "原始人類提問" }] },
        }),
      ];
      writeFileSync(rolloutFile, rolloutLines.join("\n"), "utf-8");

      // Write session_index.jsonl
      const indexFile = join(codexDir, "session_index.jsonl");
      writeFileSync(
        indexFile,
        JSON.stringify({ id: uuid, thread_name: "修正 TUI 錯誤訊息遺失", updated_at: "2026-08-28T12:25:08Z" }) + "\n",
        "utf-8"
      );

      const platform = detectPlatform();
      const sessions = scanSessions({
        home: mockHome,
        platform,
        toolIds: ["codex"],
      });

      expect(sessions.length).toBe(1);
      const s = sessions[0]!;
      expect(s.id).toBe(uuid);
      expect(s.toolId).toBe("codex");
      expect(s.title).toBe("修正 TUI 錯誤訊息遺失");
      expect(s.projectName).toBe("Sweep");
    });
  });

  describe("Security and Whitelist Protection", () => {
    it("protects .sandbox-bin and auth.json from deletion", () => {
      const codexDir = join(mockHome, ".codex");
      const sandboxBinDir = join(codexDir, ".sandbox-bin");
      const cacheDir = join(codexDir, "cache");
      mkdirSync(sandboxBinDir, { recursive: true });
      mkdirSync(cacheDir, { recursive: true });

      writeFileSync(join(sandboxBinDir, "codex.exe"), "executable-binary");
      writeFileSync(join(codexDir, "auth.json"), '{"token":"secret"}');
      writeFileSync(join(cacheDir, "temp.log"), "temporary-log-bytes");

      const platform = detectPlatform();
      const report = scanDisk({
        home: mockHome,
        platform,
        toolIds: ["codex", "codex-cli"],
      });

      const plan = planClean(report, {
        dryRun: true,
        backup: false,
        kinds: ["cache", "conversations"],
      });

      const plannedPaths = plan.map((p) => p.path);
      expect(plannedPaths.some((p) => p.includes(".sandbox-bin"))).toBe(false);
      expect(plannedPaths.some((p) => p.includes("auth.json"))).toBe(false);
    });
  });
});
