import { describe, it, expect } from "vitest";
import { TOOLS, getTool, NEVER_DELETE_GLOBS } from "../src/catalog.ts";
import type { CleanKind } from "../src/types.ts";

describe("catalog", () => {
  it("has exactly eleven tools with separated product lines", () => {
    expect(TOOLS.length).toBe(11);
    const ids = TOOLS.map((t) => t.id);
    expect(ids).toEqual([
      "antigravity",
      "antigravity-desktop",
      "antigravity-cli",
      "codex",
      "codex-desktop",
      "codex-cli",
      "claude-code",
      "claude-desktop",
      "windsurf",
      "kiro",
      "trae",
    ]);
  });

  it("every tool has at least one target", () => {
    for (const tool of TOOLS) {
      expect(tool.targets.length).toBeGreaterThan(0);
      for (const target of tool.targets) {
        expect(target.kind).toMatch(/^(cache|conversations)$/);
        expect(target.paths.win.length).toBeGreaterThan(0);
        expect(target.paths.mac.length).toBeGreaterThan(0);
        expect(target.paths.linux.length).toBeGreaterThan(0);
      }
    }
  });

  it("getTool returns correct tool or undefined", () => {
    expect(getTool("codex")?.name).toBe("Codex");
    expect(getTool("kiro")?.shortName).toBe("KR");
    expect(getTool("nonexistent")).toBeUndefined();
  });

  it("NEVER_DELETE_GLOBS is non-empty and contains known protections", () => {
    expect(NEVER_DELETE_GLOBS.length).toBeGreaterThan(0);
    const joined = NEVER_DELETE_GLOBS.join("|");
    expect(joined).toContain(".sandbox-bin");
    expect(joined).toContain("extensions/**");
    expect(joined).toContain("settings.json");
  });

  it("codex has a cache target and at least one conversations target", () => {
    const codex = getTool("codex")!;
    const kinds = new Set(codex.targets.map((t) => t.kind));
    expect(kinds.has("cache")).toBe(true);
    expect(kinds.has("conversations")).toBe(true);
  });

  it("kiro has a conversations target for IDE chats and CLI sessions", () => {
    const kiro = getTool("kiro")!;
    const targets = kiro.targets.map((t) => t.id);
    expect(targets).toContain("kiro-ide-chats");
    expect(targets).toContain("kiro-cli-sessions");
  });
});
