import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planClean, runClean } from "../src/clean.ts";
import type { ScanEntry, ScanReport, ToolDef } from "../src/types.ts";

function fakeReport(entries: Partial<ScanEntry>[], home?: string): ScanReport {
  return {
    scannedAt: new Date().toISOString(),
    platform: "linux",
    home: home ?? tmpdir(),
    entries: entries.map((e, i) => ({
      toolId: (e.toolId ?? "codex") as any,
      toolName: e.toolName ?? "Codex",
      targetId: e.targetId ?? "codex-cache",
      label: e.label ?? "Cache",
      kind: e.kind ?? "cache",
      risk: e.risk ?? "low",
      path: e.path ?? `/tmp/fake-${i}`,
      exists: e.exists ?? true,
      bytes: e.bytes ?? 100,
      fileCount: e.fileCount ?? 1,
      error: e.error,
    })),
    totalBytes: entries.reduce((s, e) => s + (e.exists ? e.bytes ?? 100 : 0), 0),
    cacheBytes: entries
      .filter((e) => e.exists && e.kind === "cache")
      .reduce((s, e) => s + (e.bytes ?? 100), 0),
    conversationBytes: entries
      .filter((e) => e.exists && e.kind === "conversations")
      .reduce((s, e) => s + (e.bytes ?? 100), 0),
  };
}

describe("planClean", () => {
  it("filters by cache kind only", () => {
    const report = fakeReport([
      { path: "/a", kind: "cache", bytes: 10 },
      { path: "/b", kind: "conversations", bytes: 20 },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["cache"] });
    expect(items.map((i) => i.path)).toEqual(["/a"]);
  });

  it("filters by conversations kind only", () => {
    const report = fakeReport([
      { path: "/a", kind: "cache", bytes: 10 },
      { path: "/b", kind: "conversations", bytes: 20 },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["conversations"] });
    expect(items.map((i) => i.path)).toEqual(["/b"]);
  });

  it('"all" selects both cache and conversations', () => {
    const report = fakeReport([
      { path: "/a", kind: "cache", bytes: 10 },
      { path: "/b", kind: "conversations", bytes: 20 },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["cache", "conversations"] });
    expect(items.map((i) => i.path).sort()).toEqual(["/a", "/b"]);
  });

  it("filters by toolIds", () => {
    const report = fakeReport([
      { path: "/a", toolId: "codex" as any, kind: "cache" },
      { path: "/b", toolId: "trae" as any, kind: "cache" },
    ]);
    const items = planClean(report, {
      dryRun: true,
      backup: false,
      kinds: ["cache"],
      toolIds: ["codex" as any],
    });
    expect(items.map((i) => i.path)).toEqual(["/a"]);
  });

  it("filters by targetIds", () => {
    const report = fakeReport([
      { path: "/a", targetId: "codex-cache", kind: "cache" },
      { path: "/b", targetId: "codex-sessions", kind: "conversations" },
    ]);
    const items = planClean(report, {
      dryRun: true,
      backup: false,
      kinds: ["cache", "conversations"],
      targetIds: ["codex-sessions"],
    });
    expect(items.map((i) => i.path)).toEqual(["/b"]);
  });

  it("skips non-existent or zero-byte entries", () => {
    const report = fakeReport([
      { path: "/a", kind: "cache", bytes: 10, exists: true },
      { path: "/b", kind: "cache", bytes: 0, exists: true },
      { path: "/c", kind: "cache", bytes: 10, exists: false },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["cache"] });
    expect(items.map((i) => i.path)).toEqual(["/a"]);
  });

  it("protects NEVER_DELETE paths", () => {
    const report = fakeReport([
      { path: "/home/you/.codex/.sandbox-bin/runtime", kind: "cache", bytes: 10 },
      { path: "/home/you/.kiro/extensions/foo", kind: "cache", bytes: 20 },
      { path: "/home/you/.codex/cache", kind: "cache", bytes: 30 },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["cache"] });
    expect(items.map((i) => i.path)).toEqual(["/home/you/.codex/cache"]);
  });

  it("protects auth.json and mcp_config.json", () => {
    const report = fakeReport([
      { path: "/home/you/.windsurf/mcp_config.json", kind: "cache", bytes: 10 },
      { path: "/home/you/.claude/auth.json", kind: "cache", bytes: 20 },
      { path: "/home/you/.claude/cache", kind: "cache", bytes: 30 },
    ]);
    const items = planClean(report, { dryRun: true, backup: false, kinds: ["cache"] });
    expect(items.map((i) => i.path)).toEqual(["/home/you/.claude/cache"]);
  });
});

describe("runClean", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "sweep-clean-test-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function makeRealReport(paths: { path: string; kind: "cache" | "conversations"; bytes?: number }[]): ScanReport {
    for (const p of paths) {
      if (p.path.endsWith(".txt")) {
        writeFileSync(p.path, "x".repeat(p.bytes ?? 100), "utf8");
      } else {
        mkdirSync(p.path, { recursive: true });
        writeFileSync(join(p.path, "data.txt"), "x".repeat(p.bytes ?? 100), "utf8");
      }
    }
    return fakeReport(
      paths.map((p) => ({
        path: p.path,
        kind: p.kind,
        bytes: p.bytes ?? 100,
        exists: true,
      })),
      tmp,
    );
  }

  it("dry-run does not delete files", () => {
    const dir = join(tmp, "cache");
    const report = makeRealReport([{ path: dir, kind: "cache" }]);
    const result = runClean(report, { dryRun: true, backup: false, kinds: ["cache"] });
    expect(existsSync(join(dir, "data.txt"))).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.items.every((i) => i.action === "would-delete")).toBe(true);
    expect(result.freedBytes).toBe(100);
  });

  it("deletes files when dryRun is false", () => {
    const dir = join(tmp, "cache");
    const report = makeRealReport([{ path: dir, kind: "cache" }]);
    const result = runClean(report, { dryRun: false, backup: false, kinds: ["cache"] });
    expect(existsSync(dir)).toBe(false);
    expect(result.items.every((i) => i.action === "deleted")).toBe(true);
  });

  it("backs up before deleting when backup=true", () => {
    const dir = join(tmp, "cache");
    const report = makeRealReport([{ path: dir, kind: "cache" }]);
    const result = runClean(report, { dryRun: false, backup: true, kinds: ["cache"] });
    expect(result.backupDir).toBeDefined();
    expect(existsSync(result.backupDir!)).toBe(true);
    // backup contains the original
    expect(existsSync(join(result.backupDir!, "cache", "data.txt"))).toBe(true);
    // original is gone
    expect(existsSync(dir)).toBe(false);
    expect(result.items.every((i) => i.action === "backed-up")).toBe(true);
  });

  it("never deletes .sandbox-bin even when listed", () => {
    const sandbox = join(tmp, ".sandbox-bin");
    const cache = join(tmp, "cache");
    mkdirSync(sandbox, { recursive: true });
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(sandbox, "runtime"), "runtime", "utf8");
    writeFileSync(join(cache, "data.txt"), "data", "utf8");
    // The glob **/.sandbox-bin/** matches child paths; test a sub-path
    const report = fakeReport([
      { path: join(sandbox, "runtime"), kind: "cache", bytes: 7, exists: true },
      { path: cache, kind: "cache", bytes: 4, exists: true },
    ]);
    const result = runClean(report, { dryRun: false, backup: false, kinds: ["cache"] });
    expect(existsSync(sandbox)).toBe(true);
    expect(existsSync(cache)).toBe(false);
    const sandboxItem = result.items.find((i) => i.path === join(sandbox, "runtime"));
    expect(sandboxItem).toBeUndefined(); // not even in items because filtered by planClean
    expect(result.items.length).toBe(1);
  });

  it("never deletes .kiro/extensions", () => {
    const ext = join(tmp, ".kiro", "extensions", "foo");
    const cache = join(tmp, "kiro-cache");
    mkdirSync(ext, { recursive: true });
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(ext, "ext.txt"), "ext", "utf8");
    writeFileSync(join(cache, "data.txt"), "data", "utf8");
    const report = fakeReport([
      { path: ext, kind: "cache", bytes: 3, exists: true },
      { path: cache, kind: "cache", bytes: 4, exists: true },
    ]);
    const result = runClean(report, { dryRun: false, backup: false, kinds: ["cache"] });
    expect(existsSync(ext)).toBe(true);
    expect(existsSync(cache)).toBe(false);
  });

  it("never deletes .trae directories", () => {
    const traeDir = join(tmp, ".trae", "settings");
    const cache = join(tmp, "trae-cache");
    mkdirSync(traeDir, { recursive: true });
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(traeDir, "config.json"), "{}", "utf8");
    writeFileSync(join(cache, "data.txt"), "data", "utf8");
    const report = fakeReport([
      { path: traeDir, kind: "conversations", bytes: 2, exists: true },
      { path: cache, kind: "cache", bytes: 4, exists: true },
    ]);
    const result = runClean(report, { dryRun: false, backup: false, kinds: ["cache", "conversations"] });
    expect(existsSync(traeDir)).toBe(true);
    expect(existsSync(cache)).toBe(false);
  });

  it("handles missing items gracefully during backup", () => {
    const report = fakeReport([
      { path: "/does/not/exist", kind: "cache", bytes: 10, exists: true },
    ]);
    const result = runClean(report, { dryRun: false, backup: true, kinds: ["cache"] });
    // Should not throw; item skipped because statSync fails in backup phase
    expect(result.items[0].action).toBe("backed-up");
  });
});
