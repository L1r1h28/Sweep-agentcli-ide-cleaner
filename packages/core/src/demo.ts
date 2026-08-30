import { TOOLS } from "./catalog.ts";
import { resolveTargets } from "./paths.ts";
import type { Platform, ScanEntry, ScanReport } from "./types.ts";

/** Realistic demo sizes so the console can be used without disk access. */
const DEMO: Record<string, { bytes: number; files: number }> = {
  "ag-conversations": { bytes: 1_240_000_000, files: 86 },
  "ag-brain": { bytes: 18_400_000_000, files: 41200 },
  "ag-session-extras": { bytes: 2_100_000_000, files: 340 },
  "ag-cache": { bytes: 890_000_000, files: 1200 },
  "codex-sessions": { bytes: 6_400_000_000, files: 210 },
  "codex-history": { bytes: 4_200_000, files: 1 },
  "codex-cache": { bytes: 120_000_000, files: 80 },
  "cc-sessions": { bytes: 540_000_000, files: 412 },
  "cc-history-extras": { bytes: 88_000_000, files: 90 },
  "cc-cache": { bytes: 2_400_000, files: 4 },
  "ws-cascade": { bytes: 310_000_000, files: 55 },
  "ws-cache": { bytes: 1_800_000_000, files: 6400 },
  "kiro-ide-chats": { bytes: 2_900_000_000, files: 1800 },
  "kiro-ide-cache": { bytes: 420_000_000, files: 220 },
  "kiro-cli-sessions": { bytes: 140_000_000, files: 40 },
  "kiro-cli-kb": { bytes: 65_000_000, files: 15 },
  "kiro-cli-cache": { bytes: 35_000_000, files: 8 },
  "kiro-cache": { bytes: 420_000_000, files: 220 },
  "trae-conversations": { bytes: 1_100_000_000, files: 12 },
  "trae-ide-conversations": { bytes: 850_000_000, files: 8 },
  "trae-ide-cache": { bytes: 3_100_000_000, files: 850 },
  "trae-cli-memory": { bytes: 250_000_000, files: 24 },
  "trae-cli-cache": { bytes: 120_000_000, files: 50 },
  "trae-cache": { bytes: 3_370_000_000, files: 900 },
};

export function buildDemoReport(platform: Platform, home: string): ScanReport {
  const resolved = resolveTargets(platform, home, {});
  const entries: ScanEntry[] = [];
  for (const r of resolved) {
    const demo = DEMO[r.target.id] ?? { bytes: 0, files: 0 };
    const share = r.resolvedPaths.length || 1;
    r.resolvedPaths.forEach((path, i) => {
      const exists = i === 0 || demo.bytes > 500_000_000;
      entries.push({
        toolId: r.toolId,
        toolName: r.toolName,
        targetId: r.target.id,
        label: r.target.label,
        kind: r.target.kind,
        risk: r.target.risk,
        path,
        exists,
        bytes: exists ? Math.round(demo.bytes / share) : 0,
        fileCount: exists ? Math.round(demo.files / share) : 0,
      });
    });
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

export function toolIds(): string[] {
  return TOOLS.map((t) => t.id);
}
