import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getDefaultConfig,
  getConfigPath,
  loadConfig,
  saveConfig,
  addToWhitelist,
  removeFromWhitelist,
  setCustomPath,
} from "../src/config.ts";
import { expandPath, resolveTargets } from "../src/paths.ts";

describe("SweepConfig & Paths Management", () => {
  const testDir = join(tmpdir(), `sweep-config-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("provides valid default configuration", () => {
    const def = getDefaultConfig();
    expect(def.version).toBe("1.1.0");
    expect(def.whitelist).toEqual({
      projects: [],
      patterns: [],
      sessionIds: [],
    });
    expect(def.defaults?.backupBeforeClean).toBe(true);
  });

  it("resolves config path correctly", () => {
    const cfgPath = getConfigPath(testDir);
    expect(cfgPath).toBe(join(testDir, ".sweep", "config.json"));

    // Falls back to ~/.sweeprc if it exists and config.json does not
    const rcPath = join(testDir, ".sweeprc");
    writeFileSync(rcPath, "{}", "utf-8");
    expect(getConfigPath(testDir)).toBe(rcPath);
  });

  it("saves and loads configuration faithfully", () => {
    const cfgFile = join(testDir, "custom-config.json");
    const sampleConfig = {
      version: "1.1.0",
      customPaths: {
        "claude-code": ["D:\\custom\\.claude"],
      },
      whitelist: {
        projects: ["my-secret-app"],
        patterns: ["**/keep-*/**"],
        sessionIds: ["sess-1234"],
      },
      defaults: {
        backupBeforeClean: false,
        olderThanDays: 14,
      },
    };

    saveConfig(sampleConfig, cfgFile);
    expect(existsSync(cfgFile)).toBe(true);

    const loaded = loadConfig(cfgFile);
    expect(loaded.version).toBe("1.1.0");
    expect(loaded.customPaths?.["claude-code"]).toEqual(["D:\\custom\\.claude"]);
    expect(loaded.whitelist.projects).toContain("my-secret-app");
    expect(loaded.whitelist.patterns).toContain("**/keep-*/**");
    expect(loaded.whitelist.sessionIds).toContain("sess-1234");
    expect(loaded.defaults?.backupBeforeClean).toBe(false);
    expect(loaded.defaults?.olderThanDays).toBe(14);
  });

  it("adds and removes whitelist entries safely", () => {
    const cfgFile = join(testDir, "whitelist-test.json");

    addToWhitelist({ type: "project", value: "AlphaProject" }, cfgFile);
    addToWhitelist({ type: "pattern", value: "**/*.keep" }, cfgFile);
    addToWhitelist({ type: "session", value: "sess-999" }, cfgFile);

    let loaded = loadConfig(cfgFile);
    expect(loaded.whitelist.projects).toEqual(["AlphaProject"]);
    expect(loaded.whitelist.patterns).toEqual(["**/*.keep"]);
    expect(loaded.whitelist.sessionIds).toEqual(["sess-999"]);

    // Deduplication check
    addToWhitelist({ type: "project", value: "AlphaProject" }, cfgFile);
    loaded = loadConfig(cfgFile);
    expect(loaded.whitelist.projects).toEqual(["AlphaProject"]);

    // Remove entry
    removeFromWhitelist({ type: "pattern", value: "**/*.keep" }, cfgFile);
    loaded = loadConfig(cfgFile);
    expect(loaded.whitelist.patterns).toEqual([]);
    expect(loaded.whitelist.projects).toEqual(["AlphaProject"]);
  });

  it("sets custom paths for tools", () => {
    const cfgFile = join(testDir, "paths-test.json");
    setCustomPath("claude-code", ["D:\\portable\\.claude", "E:\\backup\\.claude"], cfgFile);

    const loaded = loadConfig(cfgFile);
    expect(loaded.customPaths?.["claude-code"]).toEqual([
      "D:\\portable\\.claude",
      "E:\\backup\\.claude",
    ]);
  });

  it("expands custom environment variables and custom tool paths in resolveTargets", () => {
    const expanded = expandPath(
      "%CUSTOM_VAR%\\storage",
      "win",
      "C:\\Users\\test",
      { CUSTOM_VAR: "E:\\AppData\\MyTools" }
    );
    expect(expanded).toBe("E:\\AppData\\MyTools\\storage");

    const targets = resolveTargets("win", "C:\\Users\\test", {}, undefined, {
      "claude-code": ["D:\\custom\\.claude"],
    });

    const claudeTargets = targets.filter((t) => t.toolId === "claude-code");
    const hasCustomTarget = claudeTargets.some(
      (t) => t.resolvedPaths.includes("D:\\custom\\.claude")
    );
    expect(hasCustomTarget).toBe(true);
  });
});
