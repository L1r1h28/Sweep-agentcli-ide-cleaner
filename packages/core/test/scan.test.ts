import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanDisk } from "../src/scan.ts";
import type { ToolDef } from "../src/types.ts";

const isWin = process.platform === "win32";

describe("scanDisk", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "sweep-scan-test-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function makeTool(paths: string[]): ToolDef {
    return {
      id: "testtool" as any,
      name: "Test Tool",
      shortName: "TT",
      products: [],
      blurb: "",
      notes: [],
      targets: [
        {
          id: "test-cache",
          label: "Cache",
          kind: "cache",
          risk: "low",
          description: "",
          paths: {
            win: paths,
            mac: paths,
            linux: paths,
          },
        },
      ],
    };
  }

  it("reports a single file", () => {
    const file = "file.txt";
    writeFileSync(join(tmp, file), "hello", "utf8");
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [makeTool(["~/file.txt"])],
    });
    const entry = report.entries[0];
    expect(entry.exists).toBe(true);
    expect(entry.bytes).toBe(5);
    expect(entry.fileCount).toBe(1);
  });

  it("reports a directory size recursively", () => {
    mkdirSync(join(tmp, "cache", "sub"), { recursive: true });
    writeFileSync(join(tmp, "cache", "a.txt"), "aaa", "utf8");
    writeFileSync(join(tmp, "cache", "sub", "b.txt"), "bbbb", "utf8");
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [makeTool(["~/cache"])],
    });
    const entry = report.entries[0];
    expect(entry.exists).toBe(true);
    expect(entry.bytes).toBe(7); // "aaa" + "bbbb"
    expect(entry.fileCount).toBe(2);
  });

  it("skips symbolic links", () => {
    if (isWin) {
      // Windows requires Developer Mode / admin rights for directory symlinks;
      // skip this test on Windows.
      return;
    }
    const realDir = join(tmp, "real");
    const linkDir = join(tmp, "link");
    mkdirSync(realDir);
    writeFileSync(join(realDir, "x.txt"), "x", "utf8");
    symlinkSync(realDir, linkDir, "dir");
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [makeTool(["~/real", "~/link"])],
    });
    const realEntry = report.entries.find((e) => e.path === realDir)!;
    const linkEntry = report.entries.find((e) => e.path === linkDir)!;
    expect(realEntry.exists).toBe(true);
    expect(realEntry.bytes).toBe(1);
    expect(linkEntry.exists).toBe(true);
    expect(linkEntry.bytes).toBe(0); // symlink itself counted as 0
    // link target contents should NOT be added to link's bytes
    expect(linkEntry.fileCount).toBe(0);
  });

  it("reports non-existent path without error", () => {
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [makeTool(["~/missing"])],
    });
    const entry = report.entries[0];
    expect(entry.exists).toBe(false);
    expect(entry.bytes).toBe(0);
    expect(entry.error).toBeUndefined(); // ENOENT is not treated as error
  });

  it("filters by toolIds", () => {
    const t1 = makeTool(["~/a"]);
    const t2: ToolDef = {
      ...makeTool(["~/b"]),
      id: "other" as any,
      name: "Other",
    };
    writeFileSync(join(tmp, "a"), "a");
    writeFileSync(join(tmp, "b"), "bb");
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [t1, t2],
      toolIds: ["testtool" as any],
    });
    // t1's paths resolve to ~/a which is under tmp, t2's to ~/b
    expect(report.entries.map((e) => e.toolId)).toEqual(["testtool"]);
    const paths = report.entries.map((e) => e.path);
    const aPath = paths.find((p) => p.endsWith("a"));
    expect(aPath).toBeDefined();
    expect(paths.some((p) => p.endsWith("b"))).toBe(false);
  });

  it("aggregates totals correctly", () => {
    mkdirSync(join(tmp, "cache"));
    writeFileSync(join(tmp, "cache", "1.txt"), "1", "utf8");
    writeFileSync(join(tmp, "conv.jsonl"), "conversation", "utf8");
    const report = scanDisk({
      platform: "linux",
      home: tmp,
      tools: [
        {
          ...makeTool(["~/cache"]),
          targets: [
            { ...makeTool(["~/cache"]).targets[0], kind: "cache" },
          ],
        } as ToolDef,
        {
          ...makeTool(["~/conv.jsonl"]),
          id: "conv" as any,
          targets: [
            {
              ...makeTool(["~/conv.jsonl"]).targets[0],
              kind: "conversations" as any,
            },
          ],
        } as ToolDef,
      ],
    });
    expect(report.totalBytes).toBe(13); // "1" + "conversation"
    expect(report.cacheBytes).toBe(1);
    expect(report.conversationBytes).toBe(12);
  });
});
