import { describe, it, expect } from "vitest";
import {
  detectPlatform,
  defaultHome,
  expandPath,
  resolveTargets,
  type EnvMap,
} from "../src/paths.ts";
import { TOOLS } from "../src/catalog.ts";
import type { Platform } from "../src/types.ts";

describe("detectPlatform", () => {
  it("maps win32 → win", () => {
    expect(detectPlatform("win32")).toBe("win");
  });
  it("maps darwin → mac", () => {
    expect(detectPlatform("darwin")).toBe("mac");
  });
  it("maps linux → linux", () => {
    expect(detectPlatform("linux")).toBe("linux");
  });
  it("maps freebsd → linux", () => {
    expect(detectPlatform("freebsd")).toBe("linux");
  });
  it("falls back to user agent then linux", () => {
    expect(detectPlatform("sunos", "Mozilla/5.0 (Windows NT 10.0)")).toBe("win");
    expect(detectPlatform("sunos", "Mozilla/5.0 (Macintosh)")).toBe("mac");
    expect(detectPlatform("sunos", "Mozilla/5.0 (X11; Linux)")).toBe("linux");
    expect(detectPlatform("sunos", "")).toBe("linux");
  });
});

describe("defaultHome", () => {
  it("prefers env.HOME", () => {
    expect(defaultHome("mac", { HOME: "/Users/alice" })).toBe("/Users/alice");
  });
  it("prefers env.USERPROFILE on Windows", () => {
    expect(defaultHome("win", { USERPROFILE: "C:\\Users\\Bob" })).toBe(
      "C:\\Users\\Bob",
    );
  });
  it("falls back to platform defaults", () => {
    expect(defaultHome("win", {})).toBe("C:\\Users\\you");
    expect(defaultHome("mac", {})).toBe("/home/you");
    expect(defaultHome("linux", {})).toBe("/home/you");
  });
});

describe("expandPath", () => {
  it("expands ~ on all platforms", () => {
    expect(expandPath("~/foo", "linux", "/home/you")).toBe("/home/you/foo");
    expect(expandPath("~", "mac", "/Users/you")).toBe("/Users/you");
  });
  it("expands Windows tokens", () => {
    const env: EnvMap = {
      APPDATA: "C:\\Users\\you\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\you\\AppData\\Local",
    };
    expect(expandPath("%USERPROFILE%\\foo", "win", "C:\\Users\\you", env)).toBe(
      "C:\\Users\\you\\foo",
    );
    expect(expandPath("%APPDATA%\\bar", "win", "C:\\Users\\you", env)).toBe(
      "C:\\Users\\you\\AppData\\Roaming\\bar",
    );
    expect(
      expandPath("%LOCALAPPDATA%\\baz", "win", "C:\\Users\\you", env),
    ).toBe("C:\\Users\\you\\AppData\\Local\\baz");
  });
  it("normalises forward slashes to backslashes on Windows", () => {
    expect(expandPath("%APPDATA%/a/b", "win", "C:\\Users\\you")).toBe(
      "C:\\Users\\you\\AppData\\Roaming\\a\\b",
    );
  });
  it("does not touch mac/linux absolute paths", () => {
    expect(expandPath("/etc/foo", "linux", "/home/you")).toBe("/etc/foo");
  });
});

describe("resolveTargets", () => {
  it("resolves every tool on every platform", () => {
    const platforms: Platform[] = ["win", "mac", "linux"];
    for (const platform of platforms) {
      const home = platform === "win" ? "C:\\Users\\you" : "/home/you";
      const resolved = resolveTargets(platform, home, {}, TOOLS);
      for (const tool of TOOLS) {
        for (const target of tool.targets) {
          const found = resolved.find(
            (r) => r.toolId === tool.id && r.target.id === target.id,
          );
          expect(found, `${platform} missing ${tool.id}/${target.id}`).toBeDefined();
          expect(found!.resolvedPaths.length).toBeGreaterThan(0);
          for (const p of found!.resolvedPaths) {
            expect(p).not.toMatch(/%[A-Z]+%/); // no unresolved tokens
            if (platform === "win") {
              expect(p).not.toMatch(/\//); // no forward slashes left
            }
          }
        }
      }
    }
  });
  it("filters by provided tools list", () => {
    const resolved = resolveTargets("linux", "/home/you", {}, [
      TOOLS.find((t) => t.id === "codex")!,
    ]);
    expect(resolved.every((r) => r.toolId === "codex")).toBe(true);
  });
});
