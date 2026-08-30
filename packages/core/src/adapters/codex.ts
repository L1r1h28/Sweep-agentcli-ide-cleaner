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
 * Loads session index mapping (session ID / UUID -> thread_name) from session_index.jsonl.
 */
export function loadCodexSessionIndex(indexPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(indexPath)) return map;

  try {
    const raw = readFileSync(indexPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.id && item.thread_name) {
          map.set(item.id.trim(), String(item.thread_name).trim());
        }
      } catch {}
    }
  } catch {}

  return map;
}

/**
 * Recursively discovers all rollout JSONL files within a directory up to a max depth.
 */
export function findCodexSessionFiles(
  dirPath: string,
  maxDepth = 6
): Array<{ path: string; size: number; mtimeMs: number }> {
  const results: Array<{ path: string; size: number; mtimeMs: number }> = [];
  if (!existsSync(dirPath)) return results;

  function recurse(current: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(current, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        recurse(full, depth + 1);
      } else if (
        entry.endsWith(".jsonl") ||
        entry.endsWith(".json")
      ) {
        results.push({ path: full, size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  }

  recurse(dirPath, 1);
  return results;
}

/**
 * Parses a single Codex rollout JSONL file to extract:
 * 1. Project / Workspace name from turn_context or workspace fields.
 * 2. User prompt text (skipping system <environment_context> blocks).
 * 3. Thread ID and creation timestamp.
 */
export function extractCodexPromptAndMeta(
  filePath: string,
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

    for (const line of lines.slice(0, 40)) {
      try {
        const obj = JSON.parse(line);
        if (!createdAt && obj.timestamp) createdAt = obj.timestamp;

        // 1. Context & Workspace detection
        if (obj.type === "turn_context" && obj.payload) {
          if (!projectName && obj.payload.cwd) {
            projectName = extractCleanProjectName(obj.payload.cwd);
          }
          if (
            !projectName &&
            Array.isArray(obj.payload.workspace_roots) &&
            obj.payload.workspace_roots[0]
          ) {
            projectName = extractCleanProjectName(obj.payload.workspace_roots[0]);
          }
        }
        if (!projectName && obj.workspace) {
          projectName = extractCleanProjectName(obj.workspace);
        }

        // 2. Thread ID extraction
        if (!id && obj.payload?.thread_id) {
          id = String(obj.payload.thread_id).trim();
        }

        // 3. User prompt extraction
        if (!title) {
          // Format A: response_item with input_text array
          if (
            obj.type === "response_item" &&
            obj.payload?.type === "message" &&
            obj.payload.role === "user"
          ) {
            const content = obj.payload.content;
            if (Array.isArray(content)) {
              for (const c of content) {
                if (c.type === "input_text" && c.text) {
                  let txt = String(c.text).trim();
                  if (txt.startsWith("<environment_context>")) continue;
                  title = txt;
                  break;
                }
              }
            } else if (typeof content === "string") {
              let txt = content.trim();
              if (!txt.startsWith("<environment_context>")) title = txt;
            }
          }

          // Format B: event_msg with user_message or item_completed UserMessage
          if (!title && obj.type === "event_msg" && obj.payload) {
            if (obj.payload.type === "user_message" && obj.payload.message) {
              let txt = String(obj.payload.message).trim();
              if (!txt.startsWith("<environment_context>")) title = txt;
            } else if (
              obj.payload.type === "item_completed" &&
              obj.payload.item?.type === "UserMessage"
            ) {
              const content = obj.payload.item.content;
              if (Array.isArray(content)) {
                for (const c of content) {
                  if (c.text) {
                    let txt = String(c.text).trim();
                    if (!txt.startsWith("<environment_context>")) {
                      title = txt;
                      break;
                    }
                  }
                }
              }
            }
          }

          // Format C: Standard single JSON user object
          if (!title && (obj.role === "user" || obj.type === "USER_INPUT")) {
            const rawText =
              typeof obj.content === "string"
                ? obj.content
                : JSON.stringify(obj.content ?? "");
            let txt = rawText.trim();
            if (!txt.startsWith("<environment_context>")) title = txt;
          }

          // Format D: Legacy / payload.messages
          if (!title && obj.payload?.messages && Array.isArray(obj.payload.messages)) {
            const firstUser = obj.payload.messages.find((m: any) => m.role === "user");
            if (firstUser?.content) {
              const txt = String(firstUser.content).trim();
              if (!txt.startsWith("<environment_context>")) title = txt;
            }
          }
        }
      } catch {}
      if (projectName && title && id) break;
    }

    // Clean up title
    if (title) {
      // Remove inline tags and normalize whitespace
      title = title.replace(/<[^>]+>/g, " ");
      title = title.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
      title = truncateByDisplayWidth(title, maxVisualWidth);
    }

    return { id, title, projectName, createdAt };
  } catch {
    return {};
  }
}

/**
 * Scans all Codex sessions across given directories, matching against session_index.jsonl
 * and extracting semantic metadata and workspace references.
 */
export function scanCodexSessions(options: {
  sessionDirs: string[];
  sessionIndexPaths?: string[];
  toolId?: ToolId;
  toolName?: string;
  targetId?: string;
  nowMs?: number;
}): ConversationSession[] {
  const toolId = options.toolId || "codex";
  const toolName = options.toolName || "Codex";
  const targetId = options.targetId || "codex-sessions";
  const nowMs = options.nowMs ?? Date.now();

  // 1. Build session index lookup
  const indexMap = new Map<string, string>();
  const indexPaths = options.sessionIndexPaths || [];

  // Also auto-detect session_index.jsonl in parent directories of sessionDirs
  for (const sDir of options.sessionDirs) {
    const parentIndex = join(dirname(sDir), "session_index.jsonl");
    if (!indexPaths.includes(parentIndex)) {
      indexPaths.push(parentIndex);
    }
  }

  for (const idxPath of indexPaths) {
    const loaded = loadCodexSessionIndex(idxPath);
    for (const [id, tName] of loaded) {
      indexMap.set(id, tName);
    }
  }

  // 2. Discover all session files
  const sessionFiles: Array<{ path: string; size: number; mtimeMs: number }> = [];
  for (const sDir of options.sessionDirs) {
    const found = findCodexSessionFiles(sDir);
    sessionFiles.push(...found);
  }

  const results: ConversationSession[] = [];
  const seenIds = new Set<string>();

  for (const file of sessionFiles) {
    const fileName = basename(file.path);
    const meta = extractCodexPromptAndMeta(file.path, 26);

    // Derive session ID
    let sessionId = meta.id;
    if (!sessionId) {
      const baseName = fileName.replace(/\.(jsonl|json)$/i, "");
      const uuidMatch = baseName.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
      sessionId = uuidMatch ? uuidMatch[0] : baseName;
    }

    if (seenIds.has(file.path)) continue;
    seenIds.add(file.path);

    // Title selection: 1) thread_name from session_index.jsonl, 2) parsed prompt, 3) formatted date fallback
    const indexTitle = indexMap.get(sessionId);
    let displayTitle: string;
    if (indexTitle) {
      displayTitle = truncateByDisplayWidth(indexTitle.trim(), 26);
    } else if (meta.title) {
      displayTitle = meta.title;
    } else {
      const d = new Date(file.mtimeMs);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      displayTitle = `Session (${month}-${day} ${hour}:${min})`;
    }

    const mtime = meta.createdAt ? new Date(meta.createdAt).getTime() : file.mtimeMs;
    const ageDays = Math.max(
      0,
      Math.round(((nowMs - mtime) / (1000 * 60 * 60 * 24)) * 10) / 10
    );

    // Check associated visualization folders if any
    const associatedPaths = [file.path];
    const vizDirCandidate = join(dirname(file.path), "..", "..", "..", "visualizations");
    if (existsSync(vizDirCandidate)) {
      // e.g. .codex/visualizations/2026/08/28/<id>
      try {
        const dateParts = file.path.replace(/\\/g, "/").split("/");
        const idx = dateParts.indexOf("sessions");
        if (idx !== -1 && dateParts[idx + 1] && dateParts[idx + 2] && dateParts[idx + 3]) {
          const vizSpecific = join(
            dirname(file.path),
            "..",
            "..",
            "..",
            "visualizations",
            dateParts[idx + 1]!,
            dateParts[idx + 2]!,
            dateParts[idx + 3]!,
            sessionId
          );
          if (existsSync(vizSpecific)) {
            associatedPaths.push(vizSpecific);
          }
        }
      } catch {}
    }

    results.push({
      id: sessionId,
      toolId,
      toolName,
      targetId,
      path: file.path,
      associatedPaths,
      projectName: meta.projectName,
      title: displayTitle,
      updatedAt: new Date(mtime).toISOString(),
      ageDays,
      bytes: file.size,
      fileCount: 1,
      isDirectory: false,
    });
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return results;
}

/**
 * Safely cleans a Codex session file and its associated visualization output folders.
 */
export function cleanCodexSession(
  session: ConversationSession
): { freedBytes: number; deletedPaths: string[] } {
  let freedBytes = 0;
  const deletedPaths: string[] = [];

  const targets = session.associatedPaths && session.associatedPaths.length > 0
    ? session.associatedPaths
    : [session.path];

  for (const p of targets) {
    if (!existsSync(p)) continue;
    try {
      const st = statSync(p);
      if (st.isDirectory()) {
        rmSync(p, { recursive: true, force: true });
      } else {
        rmSync(p, { force: true });
      }
      freedBytes += st.size;
      deletedPaths.push(p);
    } catch {}
  }

  return { freedBytes, deletedPaths };
}
