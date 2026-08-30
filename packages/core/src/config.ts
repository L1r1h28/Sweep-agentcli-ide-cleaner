import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultHome, detectPlatform, type EnvMap } from "./paths.ts";
import type { SweepConfig, ToolId, WhitelistRules } from "./types.ts";

export const CONFIG_VERSION = "1.1.0";

export function getDefaultConfig(): SweepConfig {
  return {
    version: CONFIG_VERSION,
    customPaths: {},
    whitelist: {
      projects: [],
      patterns: [],
      sessionIds: [],
    },
    defaults: {
      backupBeforeClean: true,
      olderThanDays: 30,
    },
  };
}

/**
 * Returns the primary config path (~/.sweep/config.json).
 * If ~/.sweeprc exists and ~/.sweep/config.json does not, ~/.sweeprc is returned for backward compatibility.
 */
export function getConfigPath(home?: string, env: EnvMap = {}): string {
  const platform = detectPlatform();
  const userHome = home || defaultHome(platform, env);

  const primaryDir = join(userHome, ".sweep");
  const primaryPath = join(primaryDir, "config.json");
  const rcPath = join(userHome, ".sweeprc");

  if (!existsSync(primaryPath) && existsSync(rcPath)) {
    return rcPath;
  }

  return primaryPath;
}

/**
 * Loads Sweep configuration safely from disk, returning defaults on any error or missing file.
 */
export function loadConfig(explicitPath?: string, home?: string, env: EnvMap = {}): SweepConfig {
  const targetPath = explicitPath || getConfigPath(home, env);
  const defaults = getDefaultConfig();

  if (!existsSync(targetPath)) {
    return defaults;
  }

  try {
    const raw = readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || defaults.version,
      customPaths: parsed.customPaths || defaults.customPaths,
      whitelist: {
        projects: Array.isArray(parsed.whitelist?.projects) ? parsed.whitelist.projects : [],
        patterns: Array.isArray(parsed.whitelist?.patterns) ? parsed.whitelist.patterns : [],
        sessionIds: Array.isArray(parsed.whitelist?.sessionIds) ? parsed.whitelist.sessionIds : [],
      },
      defaults: {
        backupBeforeClean:
          typeof parsed.defaults?.backupBeforeClean === "boolean"
            ? parsed.defaults.backupBeforeClean
            : defaults.defaults?.backupBeforeClean,
        olderThanDays:
          typeof parsed.defaults?.olderThanDays === "number"
            ? parsed.defaults.olderThanDays
            : defaults.defaults?.olderThanDays,
      },
    };
  } catch {
    return defaults;
  }
}

/**
 * Saves Sweep configuration to disk, creating parent directories if needed.
 */
export function saveConfig(
  config: SweepConfig,
  explicitPath?: string,
  home?: string,
  env: EnvMap = {},
): string {
  const targetPath = explicitPath || getConfigPath(home, env);
  const targetDir = dirname(targetPath);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  return targetPath;
}

/**
 * Adds an item to whitelist rules and persists the updated configuration.
 */
export function addToWhitelist(
  item: { type: "project" | "pattern" | "session"; value: string },
  explicitPath?: string,
  home?: string,
  env: EnvMap = {},
): SweepConfig {
  const config = loadConfig(explicitPath, home, env);
  const val = item.value.trim();
  if (!val) return config;

  if (item.type === "project") {
    if (!config.whitelist.projects?.includes(val)) {
      config.whitelist.projects = [...(config.whitelist.projects || []), val];
    }
  } else if (item.type === "pattern") {
    if (!config.whitelist.patterns?.includes(val)) {
      config.whitelist.patterns = [...(config.whitelist.patterns || []), val];
    }
  } else if (item.type === "session") {
    if (!config.whitelist.sessionIds?.includes(val)) {
      config.whitelist.sessionIds = [...(config.whitelist.sessionIds || []), val];
    }
  }

  saveConfig(config, explicitPath, home, env);
  return config;
}

/**
 * Removes an item from whitelist rules and persists the updated configuration.
 */
export function removeFromWhitelist(
  item: { type: "project" | "pattern" | "session"; value: string },
  explicitPath?: string,
  home?: string,
  env: EnvMap = {},
): SweepConfig {
  const config = loadConfig(explicitPath, home, env);
  const val = item.value.trim();
  if (!val) return config;

  if (item.type === "project" && config.whitelist.projects) {
    config.whitelist.projects = config.whitelist.projects.filter((p) => p !== val);
  } else if (item.type === "pattern" && config.whitelist.patterns) {
    config.whitelist.patterns = config.whitelist.patterns.filter((p) => p !== val);
  } else if (item.type === "session" && config.whitelist.sessionIds) {
    config.whitelist.sessionIds = config.whitelist.sessionIds.filter((s) => s !== val);
  }

  saveConfig(config, explicitPath, home, env);
  return config;
}

/**
 * Sets or updates custom storage paths for a specific tool ID.
 */
export function setCustomPath(
  toolId: ToolId,
  paths: string[],
  explicitPath?: string,
  home?: string,
  env: EnvMap = {},
): SweepConfig {
  const config = loadConfig(explicitPath, home, env);
  if (!config.customPaths) config.customPaths = {};
  config.customPaths[toolId] = paths.map((p) => p.trim()).filter(Boolean);

  saveConfig(config, explicitPath, home, env);
  return config;
}
