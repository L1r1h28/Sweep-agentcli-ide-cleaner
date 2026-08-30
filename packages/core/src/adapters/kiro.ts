import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { ConversationSession } from "../session.ts";
import type { ToolId } from "../types.ts";
import {
  extractCleanProjectName,
  extractProjectFromContent,
  getDisplayWidth,
  isEastAsianFullWidth,
  truncateByDisplayWidth,
} from "./antigravity.ts";

export { isEastAsianFullWidth, getDisplayWidth, truncateByDisplayWidth };

/**
 * Recursively computes directory statistics
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
 * Extracts metadata from a Kiro session file (.chat / JSON / JSONL) or session folder.
 * Supports:
 * 1. Kiro IDE .chat files and hash folders in kiro.kiroagent
 * 2. Kiro CLI sessions in ~/.kiro/sessions/
 */
export function extractKiroSessionMeta(
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
    const st = statSync(filePathOrDir);
    let targetFiles: string[] = [];

    if (st.isDirectory()) {
      // Look for preferred session files inside directory
      const candidates = [
        join(filePathOrDir, "session.json"),
        join(filePathOrDir, "metadata.json"),
        join(filePathOrDir, "chat.json"),
        join(filePathOrDir, "transcript.jsonl"),
        join(filePathOrDir, "events.jsonl"),
        join(filePathOrDir, "conversation.json"),
      ];

      for (const cand of candidates) {
        if (existsSync(cand)) targetFiles.push(cand);
      }

      // Also check any .chat or .json / .jsonl files in the folder
      try {
        const entries = readdirSync(filePathOrDir);
        for (const e of entries) {
          if (e.endsWith(".chat") || e.endsWith(".json") || e.endsWith(".jsonl")) {
            const p = join(filePathOrDir, e);
            if (!targetFiles.includes(p)) targetFiles.push(p);
          }
        }
      } catch {}
    } else {
      targetFiles = [filePathOrDir];
    }

    let id: string | undefined;
    let title: string | undefined;
    let projectName: string | undefined;
    let createdAt: string | undefined;

    for (const file of targetFiles) {
      try {
        const raw = readFileSync(file, "utf-8");
        const trimmed = raw.trim();
        if (!trimmed) continue;

        let singleObj: any = null;
        try {
          singleObj = JSON.parse(trimmed);
        } catch {}

        // Try single JSON object (.chat / .json)
        if (singleObj && typeof singleObj === "object" && !Array.isArray(singleObj)) {
          const data = singleObj;

          if (!id) id = data.sessionId || data.session_id || data.id || data.chatId;
          if (!createdAt) createdAt = data.createdAt || data.created_at || data.timestamp || data.updatedAt;

          // Project name detection
          if (!projectName) {
            let projCand =
              data.projectName ||
              data.project ||
              data.workspace ||
              data.workspacePath ||
              data.workspaceUri ||
              data.cwd;

            if (!projCand && Array.isArray(data.workspacePaths) && data.workspacePaths[0]) {
              projCand = data.workspacePaths[0];
            }
            if (!projCand && Array.isArray(data.rootPaths) && data.rootPaths[0]) {
              projCand = data.rootPaths[0];
            }
            if (projCand) projectName = extractCleanProjectName(String(projCand));
          }

          if (!createdAt && data.lastModifiedAt) {
            createdAt = typeof data.lastModifiedAt === "number" ? new Date(data.lastModifiedAt).toISOString() : String(data.lastModifiedAt);
          }

          // Title extraction
          if (!title) {
            if (data.title && typeof data.title === "string") {
              title = truncateByDisplayWidth(data.title.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.summary && typeof data.summary === "string") {
              title = truncateByDisplayWidth(data.summary.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.topic && typeof data.topic === "string") {
              title = truncateByDisplayWidth(data.topic.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            }
          }

          // User turn extraction from messages / turns
          if (!title && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (msg.role === "user" || msg.role === "human" || msg.type === "user_message") {
                const text = typeof msg.content === "string" ? msg.content : msg.content?.text || msg.message;
                if (text && typeof text === "string" && !text.startsWith("<environment_context>")) {
                  title = truncateByDisplayWidth(text.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
                  break;
                }
              }
            }
          }

          if (!title && Array.isArray(data.turns)) {
            for (const turn of data.turns) {
              if (turn.role === "user" || turn.type === "user") {
                const text = typeof turn.content === "string" ? turn.content : turn.content?.text || turn.prompt;
                if (text && typeof text === "string" && !text.startsWith("<environment_context>")) {
                  title = truncateByDisplayWidth(text.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
                  break;
                }
              }
            }
          }
        } else {
          // JSONL / stream format
          const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
          for (const line of lines.slice(0, 50)) {
            try {
              const obj = JSON.parse(line);
              if (!id) id = obj.sessionId || obj.session_id || obj.id || obj.chatId;
              if (!createdAt) createdAt = obj.createdAt || obj.timestamp || obj.time;

              if (!projectName) {
                const projCand = obj.cwd || obj.workspace || obj.project || obj.workspacePath;
                if (projCand) projectName = extractCleanProjectName(String(projCand));
              }

              if (!title && (obj.role === "user" || obj.type === "user_message" || obj.source === "USER_EXPLICIT")) {
                const text = typeof obj.content === "string" ? obj.content : obj.message || obj.payload?.message;
                if (text && typeof text === "string" && !text.startsWith("<environment_context>")) {
                  title = truncateByDisplayWidth(text.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
                }
              }
            } catch {}
            if (id && title && projectName) break;
          }
        }
      } catch {}

      if (title && projectName) break;
    }

    // Infer fallback project from path if still missing
    if (!projectName) {
      const base = basename(filePathOrDir);
      if (base.includes("_") || base.includes("-")) {
        const cleaned = extractCleanProjectName(base);
        if (cleaned && cleaned.length > 2 && !/^[0-9a-fA-F-]+$/.test(cleaned)) {
          projectName = cleaned;
        }
      }
    }

    return { id, title, projectName, createdAt };
  } catch {
    return {};
  }
}

/**
 * Scans Kiro IDE and CLI session folders and files.
 */
export function scanKiroSessions(options: {
  kiroRootDirs: string[];
  toolId?: ToolId;
  toolName?: string;
  defaultTargetId?: string;
  nowMs?: number;
}): ConversationSession[] {
  const toolId = options.toolId || "kiro";
  const toolName = options.toolName || "Kiro";
  const defaultTargetId = options.defaultTargetId || "kiro-ide-chats";
  const nowMs = options.nowMs || Date.now();
  const sessions: ConversationSession[] = [];
  const visitedIds = new Set<string>();

  for (const rootDir of options.kiroRootDirs) {
    if (!existsSync(rootDir)) continue;

    let entries: string[] = [];
    try {
      entries = readdirSync(rootDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      // Skip non-session files like extension manifests or socket locks
      if (entry === "extensions" || entry === "steering" || entry === "skills" || entry === "settings") {
        continue;
      }

      const fullPath = join(rootDir, entry);
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        continue;
      }

      const isDir = st.isDirectory();

      // Check if this directory is a workspace folder containing individual sess_* subdirectories
      if (isDir) {
        let subEntries: string[] = [];
        try {
          subEntries = readdirSync(fullPath);
        } catch {}

        const sessSubDirs = subEntries.filter((s) => s.startsWith("sess_") || s.startsWith("session_"));
        if (sessSubDirs.length > 0) {
          for (const sub of sessSubDirs) {
            const subFullPath = join(fullPath, sub);
            let subSt;
            try {
              subSt = statSync(subFullPath);
            } catch {
              continue;
            }

            const subIsDir = subSt.isDirectory();
            let subBytes = subSt.size;
            let subFileCount = 1;
            let subMtimeMs = subSt.mtimeMs;

            if (subIsDir) {
              const stats = getDirStats(subFullPath);
              subBytes = stats.bytes;
              subFileCount = stats.files;
              if (stats.latestMtimeMs > 0) subMtimeMs = stats.latestMtimeMs;
            }

            const meta = extractKiroSessionMeta(subFullPath, 26);
            const sessionId = meta.id || sub;

            if (visitedIds.has(sessionId)) continue;
            visitedIds.add(sessionId);

            const ageDays = Math.max(0, Math.round(((nowMs - subMtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
            const d = new Date(subMtimeMs);
            const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

            sessions.push({
              id: sessionId,
              toolId,
              toolName,
              targetId: defaultTargetId,
              path: subFullPath,
              associatedPaths: [subFullPath],
              projectName: meta.projectName,
              title: meta.title || fallbackTitle,
              updatedAt: new Date(subMtimeMs).toISOString(),
              ageDays,
              bytes: subBytes,
              fileCount: subFileCount,
              isDirectory: subIsDir,
            });
          }
          continue;
        }
      }

      let bytes = st.size;
      let fileCount = 1;
      let mtimeMs = st.mtimeMs;

      if (isDir) {
        const stats = getDirStats(fullPath);
        bytes = stats.bytes;
        fileCount = stats.files;
        if (stats.latestMtimeMs > 0) mtimeMs = stats.latestMtimeMs;
      } else {
        // If it's a file, only process .chat, .json, .jsonl, .pb
        if (!/\.(chat|json|jsonl|pb)$/i.test(entry)) {
          continue;
        }
      }

      const meta = extractKiroSessionMeta(fullPath, 26);
      const fallbackId = isDir ? entry : basename(entry).replace(/\.(chat|json|jsonl|pb)$/i, "");
      const sessionId = meta.id || fallbackId;

      if (visitedIds.has(sessionId)) continue;
      visitedIds.add(sessionId);

      const ageDays = Math.max(0, Math.round(((nowMs - mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
      const d = new Date(mtimeMs);
      const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

      sessions.push({
        id: sessionId,
        toolId,
        toolName,
        targetId: defaultTargetId,
        path: fullPath,
        associatedPaths: [fullPath],
        projectName: meta.projectName,
        title: meta.title || fallbackTitle,
        updatedAt: new Date(mtimeMs).toISOString(),
        ageDays,
        bytes,
        fileCount,
        isDirectory: isDir,
      });
    }
  }

  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
