import type { Platform, ResolvedTarget, ToolDef, ToolId } from "./types.ts";
import { TOOLS } from "./catalog.ts";

export type EnvMap = Record<string, string | undefined>;

export function detectPlatform(
  nodePlatform?: string,
  userAgent?: string,
): Platform {
  const p = nodePlatform ?? (typeof process !== "undefined" ? process.platform : "");
  if (p === "win32") return "win";
  if (p === "darwin") return "mac";
  if (p === "linux" || p === "freebsd") return "linux";
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (/Windows/i.test(ua)) return "win";
  if (/Mac OS|Macintosh/i.test(ua)) return "mac";
  return "linux";
}

export function defaultHome(platform: Platform, env: EnvMap = {}): string {
  if (env.HOME) return env.HOME;
  if (env.USERPROFILE) return env.USERPROFILE;
  return platform === "win" ? "C:\\Users\\you" : "/home/you";
}

function joinHome(home: string, platform: Platform, ...parts: string[]): string {
  const sep = platform === "win" ? "\\" : "/";
  return [home.replace(/[\\/]+$/, ""), ...parts].join(sep);
}

export function expandPath(
  template: string,
  platform: Platform,
  home: string,
  env: EnvMap = {},
): string {
  const processEnv: EnvMap = typeof process !== "undefined" ? process.env : {};

  const appData =
    env.APPDATA ??
    (platform === "win" ? joinHome(home, platform, "AppData", "Roaming") : home);
  const localAppData =
    env.LOCALAPPDATA ??
    (platform === "win" ? joinHome(home, platform, "AppData", "Local") : home);
  const temp =
    env.TEMP ??
    env.TMP ??
    (platform === "win" ? joinHome(home, platform, "AppData", "Local", "Temp") : "/tmp");

  let out = template;
  out = out.replaceAll("%USERPROFILE%", home);
  out = out.replaceAll("%APPDATA%", appData);
  out = out.replaceAll("%LOCALAPPDATA%", localAppData);
  out = out.replaceAll("%TEMP%", temp);
  out = out.replaceAll("%TMP%", temp);

  // Replace other Windows %VAR% patterns
  out = out.replace(/%([a-zA-Z0-9_]+)%/g, (match, varName) => {
    if (varName === "USERPROFILE" || varName === "APPDATA" || varName === "LOCALAPPDATA") return match;
    const val = env[varName] ?? processEnv[varName];
    return val !== undefined ? val : match;
  });

  // Replace POSIX ${VAR} and $VAR patterns
  out = out.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, varName) => {
    if (varName === "HOME") return home;
    const val = env[varName] ?? processEnv[varName];
    return val !== undefined ? val : match;
  });
  out = out.replace(/\$([a-zA-Z0-9_]+)/g, (match, varName) => {
    if (varName === "HOME") return home;
    const val = env[varName] ?? processEnv[varName];
    return val !== undefined ? val : match;
  });

  if (out.startsWith("~/") || out === "~") {
    out = home + out.slice(1);
  }
  if (platform === "win") out = out.replaceAll("/", "\\");
  return out;
}

export function resolveTargets(
  platform: Platform,
  home: string,
  env: EnvMap = {},
  tools: ToolDef[] = TOOLS,
  customPaths?: Partial<Record<ToolId, string[]>>,
): ResolvedTarget[] {
  const list: ResolvedTarget[] = [];
  for (const tool of tools) {
    for (const target of tool.targets) {
      list.push({
        toolId: tool.id,
        toolName: tool.name,
        target,
        resolvedPaths: target.paths[platform].map((p) =>
          expandPath(p, platform, home, env),
        ),
      });
    }

    // If custom paths configured for this tool, inject them as additional targets
    if (customPaths && customPaths[tool.id] && customPaths[tool.id]!.length > 0) {
      for (const [idx, customP] of customPaths[tool.id]!.entries()) {
        const resolved = expandPath(customP, platform, home, env);
        list.push({
          toolId: tool.id,
          toolName: tool.name,
          target: {
            id: `custom-path-${idx + 1}`,
            label: `Custom Path (${customP})`,
            kind: "conversations",
            risk: "high",
            description: `User-defined custom storage path: ${customP}`,
            paths: { win: [customP], mac: [customP], linux: [customP] },
          },
          resolvedPaths: [resolved],
        });
      }
    }
  }
  return list;
}

