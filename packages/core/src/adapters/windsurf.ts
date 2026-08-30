import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
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
 * Helper to compute stats for a directory
 */
function getDirStats(dirPath: string): { bytes: number; files: number; latestMtimeMs: number } {
  let bytes = 0;
  let files = 0;
  let latestMtimeMs = 0;
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop()!;
    let st;
    try {
      st = lstatSync(current);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;

    if (st.mtimeMs > latestMtimeMs) {
      latestMtimeMs = st.mtimeMs;
    }

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

  return { bytes, files, latestMtimeMs };
}

/**
 * Extracts metadata from a Windsurf / Cascade session file or directory.
 * Supports:
 * - JSON / JSONL transcripts (steps, user turns, event payloads)
 * - Metadata files (session.json, metadata.json, info.json)
 * - Raw string / text buffers
 */
export function extractWindsurfSessionMeta(
  filePathOrDir: string,
  maxVisualWidth = 26
): {
  id?: string;
  title?: string;
  projectName?: string;
  createdAt?: string;
} {
  if (!existsSync(filePathOrDir)) return {};

  try {
    let targetFiles: string[] = [];
    const st = statSync(filePathOrDir);

    if (st.isDirectory()) {
      const candidates = [
        join(filePathOrDir, "session.json"),
        join(filePathOrDir, "metadata.json"),
        join(filePathOrDir, "transcript.jsonl"),
        join(filePathOrDir, "chat.json"),
        join(filePathOrDir, "info.json"),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          targetFiles.push(cand);
        }
      }
      if (targetFiles.length === 0) {
        // Look for any .json or .jsonl in the root of session directory
        try {
          const entries = readdirSync(filePathOrDir);
          for (const e of entries) {
            if (e.endsWith(".json") || e.endsWith(".jsonl")) {
              targetFiles.push(join(filePathOrDir, e));
            }
          }
        } catch {}
      }
    } else {
      targetFiles = [filePathOrDir];
    }

    let id: string | undefined;
    let title: string | undefined;
    let projectName: string | undefined;
    let createdAt: string | undefined;

    for (const targetFile of targetFiles) {
      if (!existsSync(targetFile)) continue;
      try {
        const raw = readFileSync(targetFile, "utf-8");

        // 1. Try single JSON object
        if (raw.trimStart().startsWith("{")) {
          try {
            const obj = JSON.parse(raw);
            if (!id && (obj.id || obj.sessionId || obj.session_id || obj.uuid)) {
              id = String(obj.id || obj.sessionId || obj.session_id || obj.uuid).trim();
            }
            if (!createdAt && (obj.createdAt || obj.created_at || obj.timestamp)) {
              createdAt = String(obj.createdAt || obj.created_at || obj.timestamp);
            }
            if (!projectName && (obj.workspaceUri || obj.workspacePath || obj.cwd || obj.project || obj.repoPath)) {
              const p = obj.workspaceUri || obj.workspacePath || obj.cwd || obj.project || obj.repoPath;
              projectName = extractCleanProjectName(String(p));
            }
            if (!title && (obj.title || obj.summary || obj.conversation_name || obj.name)) {
              title = String(obj.title || obj.summary || obj.conversation_name || obj.name);
            }
            // Check messages array in JSON
            if (!title && Array.isArray(obj.messages)) {
              for (const m of obj.messages) {
                if (m.role === "user" || m.type === "user") {
                  const content = m.content || m.text || m.message;
                  if (typeof content === "string" && content.trim()) {
                    title = content.trim();
                    break;
                  } else if (Array.isArray(content)) {
                    const textItem = content.find((c: any) => c.text || typeof c === "string");
                    if (textItem) {
                      title = String(textItem.text || textItem).trim();
                      break;
                    }
                  }
                }
              }
            }
          } catch {}
        }

        // 2. Line-by-line JSONL streaming parse
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines.slice(0, 40)) {
          try {
            const obj = JSON.parse(line);

            if (!id && (obj.sessionId || obj.session_id || obj.uuid || obj.id)) {
              id = String(obj.sessionId || obj.session_id || obj.uuid || obj.id).trim();
            }
            if (!createdAt && (obj.timestamp || obj.createdAt || obj.created_at)) {
              createdAt = String(obj.timestamp || obj.createdAt || obj.created_at);
            }
            if (!projectName && (obj.cwd || obj.workspaceUri || obj.workspacePath || obj.project || obj.repoPath)) {
              const p = obj.cwd || obj.workspaceUri || obj.workspacePath || obj.project || obj.repoPath;
              projectName = extractCleanProjectName(String(p));
            }

            if (!title) {
              if (obj.title || obj.summary || obj.name) {
                title = String(obj.title || obj.summary || obj.name);
              } else if (obj.role === "user" || obj.type === "user" || obj.type === "user_message") {
                const content = obj.content || obj.message || obj.text || (obj.payload && (obj.payload.message || obj.payload.text));
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
            }
          } catch {}
          if (title && projectName && id) break;
        }
      } catch {}
      if (title && projectName) break;
    }

    if (title) {
      // Remove system prompt prefixes or environmental noise
      title = title.replace(/^<[^>]+>/g, "").replace(/[\r\n\t]+/g, " ").trim();
      title = truncateByDisplayWidth(title, maxVisualWidth);
    }

    return { id, title, projectName, createdAt };
  } catch {
    return {};
  }
}

/**
 * Scans Windsurf Cascade sessions from ~/.codeium/windsurf/cascade and related paths.
 */
export function scanWindsurfSessions(options: {
  cascadeDirs: string[];
  toolId?: ToolId;
  toolName?: string;
  defaultTargetId?: string;
  nowMs?: number;
}): ConversationSession[] {
  const {
    cascadeDirs,
    toolId = "windsurf",
    toolName = "Windsurf",
    defaultTargetId = "ws-cascade",
    nowMs = Date.now(),
  } = options;

  const results: ConversationSession[] = [];
  const sessionMap = new Map<string, ConversationSession>();

  for (const cascadeDir of cascadeDirs) {
    if (!existsSync(cascadeDir)) continue;

    let entries: string[] = [];
    try {
      entries = readdirSync(cascadeDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(cascadeDir, entry);
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        continue;
      }

      // Case 1: Directory session (e.g. ~/.codeium/windsurf/cascade/<session-uuid>/)
      if (st.isDirectory()) {
        const sessionId = entry;
        const dirStats = getDirStats(fullPath);
        const meta = extractWindsurfSessionMeta(fullPath);

        const ageDays = Math.max(0, Math.round(((nowMs - dirStats.latestMtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
        const d = new Date(dirStats.latestMtimeMs || st.mtimeMs);
        const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

        sessionMap.set(sessionId, {
          id: sessionId,
          toolId,
          toolName,
          targetId: defaultTargetId,
          path: fullPath,
          associatedPaths: [fullPath],
          projectName: meta.projectName,
          title: meta.title || fallbackTitle,
          updatedAt: new Date(dirStats.latestMtimeMs || st.mtimeMs).toISOString(),
          ageDays,
          bytes: dirStats.bytes,
          fileCount: dirStats.files,
          isDirectory: true,
        });
        continue;
      }

      // Case 2: SQLite database WAL trio (<sessionId>.db, <sessionId>.db-wal, <sessionId>.db-shm)
      const sqliteMatch = entry.match(/^(.+?)\.db(-wal|-shm)?$/i);
      if (sqliteMatch) {
        const baseId = sqliteMatch[1]!;
        const existing = sessionMap.get(baseId);
        if (existing) {
          existing.bytes += st.size;
          existing.fileCount += 1;
          if (!existing.associatedPaths) existing.associatedPaths = [existing.path];
          if (!existing.associatedPaths.includes(fullPath)) {
            existing.associatedPaths.push(fullPath);
          }
        } else {
          const ageDays = Math.max(0, Math.round(((nowMs - st.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
          const d = new Date(st.mtimeMs);
          const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

          sessionMap.set(baseId, {
            id: baseId,
            toolId,
            toolName,
            targetId: defaultTargetId,
            path: fullPath,
            associatedPaths: [fullPath],
            title: fallbackTitle,
            updatedAt: new Date(st.mtimeMs).toISOString(),
            ageDays,
            bytes: st.size,
            fileCount: 1,
            isDirectory: false,
          });
        }
        continue;
      }

      // Case 3: JSON / JSONL / PB single file sessions
      if (entry.endsWith(".jsonl") || entry.endsWith(".json") || entry.endsWith(".pb")) {
        const sessionId = basename(entry).replace(/\.(jsonl|json|pb)$/i, "");
        const meta = extractWindsurfSessionMeta(fullPath);
        const ageDays = Math.max(0, Math.round(((nowMs - st.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
        const d = new Date(st.mtimeMs);
        const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

        sessionMap.set(sessionId, {
          id: sessionId,
          toolId,
          toolName,
          targetId: defaultTargetId,
          path: fullPath,
          associatedPaths: [fullPath],
          projectName: meta.projectName,
          title: meta.title || fallbackTitle,
          updatedAt: new Date(st.mtimeMs).toISOString(),
          ageDays,
          bytes: st.size,
          fileCount: 1,
          isDirectory: false,
        });
      }
    }
  }

  for (const session of sessionMap.values()) {
    results.push(session);
  }

  return results;
}
