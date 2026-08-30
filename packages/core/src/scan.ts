import { lstatSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "./catalog.ts";
import { loadConfig } from "./config.ts";
import { isPathWhitelisted } from "./filter.ts";
import { defaultHome, detectPlatform, resolveTargets, type EnvMap } from "./paths.ts";
import type { Platform, ScanEntry, ScanReport, SweepConfig, ToolDef, ToolId } from "./types.ts";

function dirSize(root: string): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop()!;
    let st;
    try {
      st = lstatSync(current);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isFile()) {
      bytes += st.size;
      files += 1;
      continue;
    }
    if (!st.isDirectory()) continue;
    let names: string[] = [];
    try {
      names = readdirSync(current);
    } catch {
      continue;
    }
    for (const name of names) stack.push(join(current, name));
  }
  return { bytes, files };
}

export function scanDisk(options?: {
  platform?: Platform;
  home?: string;
  env?: EnvMap;
  toolIds?: ToolId[];
  tools?: ToolDef[];
  config?: SweepConfig;
}): ScanReport {
  const platform = options?.platform ?? detectPlatform();
  const env = options?.env ?? (typeof process !== "undefined" ? process.env : {});
  const home = options?.home ?? defaultHome(platform, env);
  const config = options?.config ?? loadConfig(undefined, home, env);
  const tools = options?.tools ?? TOOLS;
  const filteredTools = options?.toolIds
    ? tools.filter((t) => options.toolIds!.includes(t.id))
    : tools;
  const resolved = resolveTargets(platform, home, env, filteredTools, config.customPaths);
  const entries: ScanEntry[] = [];

  for (const r of resolved) {
    for (const path of r.resolvedPaths) {
      const whitelisted = isPathWhitelisted(path, config.whitelist);
      try {
        const st = statSync(path);
        const size = st.isDirectory()
          ? dirSize(path)
          : { bytes: st.size, files: 1 };
        entries.push({
          toolId: r.toolId,
          toolName: r.toolName,
          targetId: r.target.id,
          label: r.target.label,
          kind: r.target.kind,
          risk: r.target.risk,
          path,
          exists: true,
          bytes: size.bytes,
          fileCount: size.files,
          isWhitelisted: whitelisted,
        });
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        entries.push({
          toolId: r.toolId,
          toolName: r.toolName,
          targetId: r.target.id,
          label: r.target.label,
          kind: r.target.kind,
          risk: r.target.risk,
          path,
          exists: false,
          bytes: 0,
          fileCount: 0,
          isWhitelisted: whitelisted,
          error: code === "ENOENT" ? undefined : String(err),
        });
      }
    }
  }

  const present = entries.filter((e) => e.exists);
  const totalBytes = present.reduce((s, e) => s + e.bytes, 0);
  const cacheBytes = present
    .filter((e) => e.kind === "cache")
    .reduce((s, e) => s + e.bytes, 0);

  return {
    scannedAt: new Date().toISOString(),
    platform,
    home,
    entries,
    totalBytes,
    cacheBytes,
    conversationBytes: totalBytes - cacheBytes,
  };
}
