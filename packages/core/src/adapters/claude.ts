import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { ConversationSession } from "../session.ts";
import type { ToolId } from "../types.ts";
import {
  extractCleanProjectName,
  getDisplayWidth,
  isEastAsianFullWidth,
  truncateByDisplayWidth,
} from "./antigravity.ts";

export { isEastAsianFullWidth, getDisplayWidth, truncateByDisplayWidth };

/**
 * Decodes a Claude project slug into a clean project name.
 * Handles:
 * 1. POSIX format: "-Users-username-Projects-my-web-app" -> "my-web-app"
 * 2. Windows format: "C__Users_username_Projects_my-project" -> "my-project"
 * 3. URL encoded: "%2Fhome%2Fuser%2Fapp" -> "app"
 */
export function decodeClaudeProjectSlug(slug: string): string {
  if (!slug) return "Unknown Project";

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {}

  // 1. Windows format with drive letter: "C__Users_..." or "c__..."
  if (/^[a-zA-Z]__/i.test(decoded)) {
    // If it uses '__' or '_' as path separators
    const afterDrive = decoded.replace(/^[a-zA-Z]__/, "");
    // Check if there's a marker like _Projects_ or _workspace_ or similar
    const markerMatch = afterDrive.match(/_(?:Projects|workspace|code|repos|src|workspaces)_(.+)$/i);
    if (markerMatch && markerMatch[1]) {
      return extractCleanProjectName(markerMatch[1]) || markerMatch[1];
    }
    // Otherwise split by double underscore or single underscore
    const chunks = afterDrive.split("__");
    if (chunks.length > 1) {
      return extractCleanProjectName(chunks[chunks.length - 1]!) || chunks[chunks.length - 1]!;
    }
    const singleChunks = afterDrive.split("_");
    if (singleChunks.length > 0) {
      return extractCleanProjectName(singleChunks[singleChunks.length - 1]!) || singleChunks[singleChunks.length - 1]!;
    }
  }

  // 2. POSIX format starting with "-": "-Users-username-Projects-my-web-app"
  if (decoded.startsWith("-")) {
    const afterLeadingDash = decoded.slice(1);
    // Check for common parent directory markers in slug (e.g. -Projects-, -code-, -workspace-, -repos-)
    const markerMatch = afterLeadingDash.match(/-(?:Projects|workspace|code|repos|src|workspaces)-(.+)$/i);
    if (markerMatch && markerMatch[1]) {
      return extractCleanProjectName(markerMatch[1]) || markerMatch[1];
    }
    // Check for user folder marker (e.g. Users-username-app or home-username-app)
    const userMatch = afterLeadingDash.match(/^(?:Users|home)-[^-]+-(.+)$/i);
    if (userMatch && userMatch[1]) {
      return extractCleanProjectName(userMatch[1]) || userMatch[1];
    }
  }

  // Fallback to standard clean extraction
  return extractCleanProjectName(decoded) || decoded || "Unknown Project";
}

/**
 * Parses a Claude session JSONL file (typically in `~/.claude/projects/<project-slug>/<session-id>.jsonl`)
 * to extract:
 * 1. Project / Workspace name (from cwd, project, or decoded projectSlug).
 * 2. User prompt text (first user turn message content).
 * 3. Session ID and ISO timestamp.
 */
export function extractClaudeSessionMeta(
  filePath: string,
  projectSlug?: string,
  maxVisualWidth = 26
): {
  id?: string;
  title?: string;
  projectName?: string;
  createdAt?: string;
} {
  if (!existsSync(filePath)) return {};

  try {
    const raw = readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let id: string | undefined;
    let projectName: string | undefined;
    let title: string | undefined;
    let createdAt: string | undefined;

    // Fast parse first 40 records
    for (const line of lines.slice(0, 40)) {
      try {
        const obj = JSON.parse(line);

        if (!createdAt && obj.timestamp) {
          createdAt = obj.timestamp;
        }

        if (!id && (obj.sessionId || obj.session_id || obj.uuid)) {
          id = String(obj.sessionId || obj.session_id || obj.uuid).trim();
        }

        // Project / CWD discovery
        if (!projectName && obj.cwd) {
          projectName = extractCleanProjectName(obj.cwd);
        }
        if (!projectName && obj.project) {
          projectName = extractCleanProjectName(obj.project);
        }

        // User Prompt extraction (Supports 2026 schema & variants)
        if (!title) {
          // Schema 1: type === "user" with message.content
          if (obj.type === "user" && obj.message) {
            const content = obj.message.content;
            if (typeof content === "string" && content.trim()) {
              title = content.trim();
            } else if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === "text" && part.text) {
                  title = String(part.text).trim();
                  break;
                } else if (typeof part === "string" && part.trim()) {
                  title = part.trim();
                  break;
                }
              }
            }
          }

          // Schema 2: obj.role === "user"
          if (!title && obj.role === "user") {
            const content = obj.content || obj.text;
            if (typeof content === "string" && content.trim()) {
              title = content.trim();
            } else if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === "text" && part.text) {
                  title = String(part.text).trim();
                  break;
                }
              }
            }
          }

          // Schema 3: obj.text directly on user event
          if (!title && obj.type === "user" && typeof obj.text === "string" && obj.text.trim()) {
            title = obj.text.trim();
          }
        }
      } catch {}
    }

    // If projectName still not found from content, decode from slug
    if (!projectName && projectSlug) {
      projectName = decodeClaudeProjectSlug(projectSlug);
    }

    if (title) {
      // Clean up whitespace & formatting
      title = title.replace(/[\r\n\t]+/g, " ").trim();
      title = truncateByDisplayWidth(title, maxVisualWidth);
    }

    return { id, title, projectName, createdAt };
  } catch {
    return {};
  }
}

/**
 * Scans Claude Code project sessions and root sessions.
 */
export function scanClaudeSessions(options: {
  claudeRootDirs: string[];
  toolId?: ToolId;
  toolName?: string;
  defaultTargetId?: string;
  nowMs?: number;
}): ConversationSession[] {
  const {
    claudeRootDirs,
    toolId = "claude-code",
    toolName = "Claude Code",
    defaultTargetId = "cc-sessions",
    nowMs = Date.now(),
  } = options;

  const results: ConversationSession[] = [];
  const visitedSessionIds = new Set<string>();

  for (const rootDir of claudeRootDirs) {
    if (!existsSync(rootDir)) continue;

    // Case 1: Scanning projects directory (~/.claude/projects)
    const isProjectsDir = basename(rootDir).toLowerCase() === "projects" || rootDir.replace(/\\/g, "/").includes(".claude/projects");

    if (isProjectsDir) {
      let projectEntries: string[] = [];
      try {
        projectEntries = readdirSync(rootDir);
      } catch {
        continue;
      }

      for (const projSlug of projectEntries) {
        const projDir = join(rootDir, projSlug);
        let st;
        try {
          st = statSync(projDir);
        } catch {
          continue;
        }

        if (!st.isDirectory()) {
          // If it's a direct JSONL file in projects
          if (projSlug.endsWith(".jsonl")) {
            const meta = extractClaudeSessionMeta(projDir);
            const id = meta.id || basename(projSlug, ".jsonl");
            if (visitedSessionIds.has(id)) continue;
            visitedSessionIds.add(id);

            const ageDays = Math.max(0, Math.round(((nowMs - st.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
            const d = new Date(st.mtimeMs);
            const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

            results.push({
              id,
              toolId,
              toolName,
              targetId: defaultTargetId,
              path: projDir,
              associatedPaths: [projDir],
              projectName: meta.projectName || decodeClaudeProjectSlug(projSlug),
              title: meta.title || fallbackTitle,
              updatedAt: new Date(st.mtimeMs).toISOString(),
              ageDays,
              bytes: st.size,
              fileCount: 1,
              isDirectory: false,
            });
          }
          continue;
        }

        // Inside project directory: ~/.claude/projects/<slug>/*.jsonl and associated directories
        let sessionFiles: string[] = [];
        try {
          sessionFiles = readdirSync(projDir);
        } catch {
          continue;
        }

        for (const sf of sessionFiles) {
          const sPath = join(projDir, sf);
          let sSt;
          try {
            sSt = statSync(sPath);
          } catch {
            continue;
          }

          if (sSt.isDirectory()) {
            // Associated folder for session (e.g. subagent tool results)
            continue;
          }

          if (sf.endsWith(".jsonl") || sf.endsWith(".json")) {
            const meta = extractClaudeSessionMeta(sPath, projSlug);
            const id = meta.id || basename(sf).replace(/\.(jsonl|json)$/i, "");
            if (visitedSessionIds.has(id)) continue;
            visitedSessionIds.add(id);

            // Look for associated folder with the same ID
            const associatedFolder = join(projDir, id);
            const associatedPaths = [sPath];
            let totalBytes = sSt.size;
            let fileCount = 1;

            if (existsSync(associatedFolder)) {
              try {
                const subSt = statSync(associatedFolder);
                if (subSt.isDirectory()) {
                  associatedPaths.push(associatedFolder);
                  const subFiles = readdirSync(associatedFolder);
                  fileCount += subFiles.length;
                  for (const subF of subFiles) {
                    try {
                      totalBytes += statSync(join(associatedFolder, subF)).size;
                    } catch {}
                  }
                }
              } catch {}
            }

            const ageDays = Math.max(0, Math.round(((nowMs - sSt.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
            const d = new Date(sSt.mtimeMs);
            const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

            results.push({
              id,
              toolId,
              toolName,
              targetId: defaultTargetId,
              path: sPath,
              associatedPaths,
              projectName: meta.projectName || decodeClaudeProjectSlug(projSlug),
              title: meta.title || fallbackTitle,
              updatedAt: new Date(sSt.mtimeMs).toISOString(),
              ageDays,
              bytes: totalBytes,
              fileCount,
              isDirectory: false,
            });
          }
        }
      }
    } else {
      // Case 2: Direct session dir or single files (~/.claude/sessions)
      let entries: string[] = [];
      try {
        entries = readdirSync(rootDir);
      } catch {
        continue;
      }

      for (const e of entries) {
        const full = join(rootDir, e);
        let st;
        try {
          st = statSync(full);
        } catch {
          continue;
        }

        const id = basename(e).replace(/\.(jsonl|json|key)$/i, "");
        if (visitedSessionIds.has(id)) continue;
        visitedSessionIds.add(id);

        const ageDays = Math.max(0, Math.round(((nowMs - st.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
        const d = new Date(st.mtimeMs);
        const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

        results.push({
          id,
          toolId,
          toolName,
          targetId: defaultTargetId,
          path: full,
          associatedPaths: [full],
          projectName: "Claude Code",
          title: fallbackTitle,
          updatedAt: new Date(st.mtimeMs).toISOString(),
          ageDays,
          bytes: st.size,
          fileCount: 1,
          isDirectory: st.isDirectory(),
        });
      }
    }
  }

  return results;
}
