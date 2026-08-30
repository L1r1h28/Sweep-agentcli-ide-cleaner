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
import { decodeClaudeProjectSlug } from "./claude.ts";

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
 * Extracts metadata from a Trae / SOLO session file, memory directory, or SQLite database info.
 */
export function extractTraeSessionMeta(
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
      const candidates = [
        join(filePathOrDir, "memory.json"),
        join(filePathOrDir, "session.json"),
        join(filePathOrDir, "context.json"),
        join(filePathOrDir, "metadata.json"),
        join(filePathOrDir, "summary.md"),
        join(filePathOrDir, "turns.jsonl"),
        join(filePathOrDir, "chat.json"),
      ];

      for (const cand of candidates) {
        if (existsSync(cand)) targetFiles.push(cand);
      }

      try {
        const entries = readdirSync(filePathOrDir);
        for (const e of entries) {
          if (e.endsWith(".json") || e.endsWith(".jsonl") || e.endsWith(".md")) {
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

        if (file.endsWith(".md")) {
          // Markdown summary file (e.g. topics.md or summary.md)
          const firstLine = trimmed.split(/\r?\n/)[0]?.replace(/^[#\s*_-]+/, "").trim();
          if (firstLine && !title) {
            // Handle Trae format: [session_id: ... | topic_summary_time: ...] Text
            const match = firstLine.match(/^\[session_id:\s*([a-f0-9]+)\s*\|\s*topic_summary_time:\s*([^\]]+)\]\s*(.+)$/i);
            if (match && match[3]) {
              if (!id) id = match[1];
              if (!createdAt) createdAt = match[2];
              title = truncateByDisplayWidth(match[3].trim(), maxVisualWidth);
            } else {
              title = truncateByDisplayWidth(firstLine, maxVisualWidth);
            }
          }
          continue;
        }

        let singleObj: any = null;
        try {
          singleObj = JSON.parse(trimmed);
        } catch {}

        if (singleObj && typeof singleObj === "object" && !Array.isArray(singleObj)) {
          const data = singleObj;

          if (!id) id = data.sessionId || data.session_id || data.id || data.projectId || data.message_id;
          if (!createdAt) createdAt = data.createdAt || data.created_at || data.timestamp || data.updatedAt || data.message_summary_time || data.topic_summary_time;

          if (!projectName) {
            const projCand =
              data.projectName ||
              data.project ||
              data.workspace ||
              data.workspacePath ||
              data.workspaceUri ||
              data.cwd ||
              data.repo;
            if (projCand) projectName = extractCleanProjectName(String(projCand));
          }

          if (!title) {
            if (data.title && typeof data.title === "string") {
              title = truncateByDisplayWidth(data.title.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.intent && typeof data.intent === "string") {
              title = truncateByDisplayWidth(data.intent.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.summary && typeof data.summary === "string") {
              title = truncateByDisplayWidth(data.summary.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.goal && typeof data.goal === "string") {
              title = truncateByDisplayWidth(data.goal.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            } else if (data.task && typeof data.task === "string") {
              title = truncateByDisplayWidth(data.task.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
            }
          }

          if (!title && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (msg.role === "user" || msg.type === "user_message") {
                const text = typeof msg.content === "string" ? msg.content : msg.content?.text || msg.message;
                if (text && typeof text === "string" && !text.startsWith("<environment_context>")) {
                  title = truncateByDisplayWidth(text.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
                  break;
                }
              }
            }
          }
        } else {
          // JSONL format
          const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
          for (const line of lines.slice(0, 30)) {
            try {
              const obj = JSON.parse(line);
              if (!id) id = obj.sessionId || obj.session_id || obj.id || obj.message_id;
              if (!createdAt) createdAt = obj.createdAt || obj.timestamp || obj.message_summary_time || obj.topic_summary_time;

              if (!projectName) {
                const projCand = obj.cwd || obj.workspace || obj.project;
                if (projCand) projectName = extractCleanProjectName(String(projCand));
              }

              if (!title && obj.intent && typeof obj.intent === "string") {
                title = truncateByDisplayWidth(obj.intent.replace(/[\r\n]+/g, " ").trim(), maxVisualWidth);
              }

              if (!title && (obj.role === "user" || obj.type === "user_message")) {
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

    if (!projectName) {
      const base = basename(filePathOrDir);
      if (
        !base.startsWith("session_memory") &&
        !base.startsWith("project_memory") &&
        !base.startsWith("topics") &&
        (base.includes("_") || base.includes("-"))
      ) {
        const cleaned = decodeClaudeProjectSlug(base);
        if (cleaned && cleaned.length > 2 && !/^[0-9a-fA-F-]+$/.test(cleaned) && cleaned !== "Unknown Project") {
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
 * Scans Trae / Trae CN conversations, SQLite database trio, and SOLO agent memories.
 */
export function scanTraeSessions(options: {
  traeRootDirs: string[];
  toolId?: ToolId;
  toolName?: string;
  defaultTargetId?: string;
  nowMs?: number;
}): ConversationSession[] {
  const toolId = options.toolId || "trae";
  const toolName = options.toolName || "Trae";
  const defaultTargetId = options.defaultTargetId || "trae-conversations";
  const nowMs = options.nowMs || Date.now();
  const sessions: ConversationSession[] = [];
  const visitedIds = new Set<string>();

  for (const rootDir of options.traeRootDirs) {
    if (!existsSync(rootDir)) continue;

    let entries: string[] = [];
    try {
      entries = readdirSync(rootDir);
    } catch {
      continue;
    }

    // Special handling for ModularData/ai-agent: SQLite trio (database.db, database.db-wal, database.db-shm)
    const sqliteTrioMap = new Map<string, { mainPath: string; associated: string[]; bytes: number; mtimeMs: number }>();

    for (const entry of entries) {
      if (
        entry === "rules" ||
        entry === "skills" ||
        entry === "builtin_skills" ||
        entry === "builtin" ||
        entry === "permission" ||
        entry === "settings" ||
        entry === "trae-jwt-token" ||
        entry === "argv.json" ||
        entry === "skill-config.json"
      ) {
        continue;
      }

      const fullPath = join(rootDir, entry);
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        continue;
      }

      // SQLite WAL trio check
      const dbMatch = entry.match(/^(.+?)\.db(-wal|-shm)?$/i);
      if (dbMatch) {
        const dbBaseName = dbMatch[1]!;
        const existing = sqliteTrioMap.get(dbBaseName);
        if (existing) {
          existing.bytes += st.size;
          existing.associated.push(fullPath);
          if (st.mtimeMs > existing.mtimeMs) existing.mtimeMs = st.mtimeMs;
          if (entry.toLowerCase() === `${dbBaseName.toLowerCase()}.db`) {
            existing.mainPath = fullPath;
          }
        } else {
          sqliteTrioMap.set(dbBaseName, {
            mainPath: fullPath,
            associated: [fullPath],
            bytes: st.size,
            mtimeMs: st.mtimeMs,
          });
        }
        continue;
      }

      const isDir = st.isDirectory();

      // Special handling for ~/.trae/memory/projects/<slug>/<date>/
      if (isDir && (entry === "projects" || fullPath.replace(/\\/g, "/").endsWith(".trae/memory/projects"))) {
        try {
          const projectSlugs = readdirSync(fullPath);
          for (const slug of projectSlugs) {
            const projDir = join(fullPath, slug);
            let projSt;
            try {
              projSt = statSync(projDir);
            } catch {
              continue;
            }
            if (!projSt.isDirectory()) continue;

            const projectName = decodeClaudeProjectSlug(slug) || extractCleanProjectName(slug) || slug;

            // Look for date folders or direct files inside project dir
            try {
              const subItems = readdirSync(projDir);
              for (const sub of subItems) {
                const subPath = join(projDir, sub);
                let subSt;
                try {
                  subSt = statSync(subPath);
                } catch {
                  continue;
                }

                if (subSt.isDirectory()) {
                  // e.g. 20260829 date folder containing session_memory_*.jsonl
                  try {
                    const sessionFiles = readdirSync(subPath);
                    for (const sf of sessionFiles) {
                      if (!sf.endsWith(".jsonl") && !sf.endsWith(".md") && !sf.endsWith(".json")) continue;
                      const sFile = join(subPath, sf);
                      let fSt;
                      try {
                        fSt = statSync(sFile);
                      } catch {
                        continue;
                      }

                      const meta = extractTraeSessionMeta(sFile, 26);
                      const sessionId = meta.id || sf.replace(/\.(jsonl|json|md)$/i, "");
                      if (visitedIds.has(sessionId)) continue;
                      visitedIds.add(sessionId);

                      const ageDays = Math.max(0, Math.round(((nowMs - fSt.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
                      const d = new Date(fSt.mtimeMs);
                      const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

                      sessions.push({
                        id: sessionId,
                        toolId,
                        toolName,
                        targetId: defaultTargetId,
                        path: sFile,
                        associatedPaths: [sFile],
                        projectName: projectName || meta.projectName,
                        title: meta.title || fallbackTitle,
                        updatedAt: new Date(fSt.mtimeMs).toISOString(),
                        ageDays,
                        bytes: fSt.size,
                        fileCount: 1,
                        isDirectory: false,
                      });
                    }
                  } catch {}
                } else if (sub.endsWith(".jsonl") || sub.endsWith(".md") || sub.endsWith(".json")) {
                  const meta = extractTraeSessionMeta(subPath, 26);
                  const sessionId = meta.id || sub.replace(/\.(jsonl|json|md)$/i, "");
                  if (visitedIds.has(sessionId)) continue;
                  visitedIds.add(sessionId);

                  const ageDays = Math.max(0, Math.round(((nowMs - subSt.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
                  const d = new Date(subSt.mtimeMs);
                  const fallbackTitle = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

                  sessions.push({
                    id: sessionId,
                    toolId,
                    toolName,
                    targetId: defaultTargetId,
                    path: subPath,
                    associatedPaths: [subPath],
                    projectName: projectName || meta.projectName,
                    title: meta.title || fallbackTitle,
                    updatedAt: new Date(subSt.mtimeMs).toISOString(),
                    ageDays,
                    bytes: subSt.size,
                    fileCount: 1,
                    isDirectory: false,
                  });
                }
              }
            } catch {}
          }
        } catch {}
        continue;
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
        if (!/\.(json|jsonl|pb|md)$/i.test(entry)) {
          continue;
        }
      }

      const meta = extractTraeSessionMeta(fullPath, 26);
      const fallbackId = isDir ? entry : basename(entry).replace(/\.(json|jsonl|pb|md)$/i, "");
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

    // Process SQLite trios
    for (const [dbBase, trio] of sqliteTrioMap.entries()) {
      if (visitedIds.has(dbBase)) continue;
      visitedIds.add(dbBase);

      const ageDays = Math.max(0, Math.round(((nowMs - trio.mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
      const d = new Date(trio.mtimeMs);
      const dbTitle = `AI Agent Database (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

      sessions.push({
        id: dbBase,
        toolId,
        toolName,
        targetId: defaultTargetId,
        path: trio.mainPath,
        associatedPaths: trio.associated,
        title: truncateByDisplayWidth(dbTitle, 26),
        updatedAt: new Date(trio.mtimeMs).toISOString(),
        ageDays,
        bytes: trio.bytes,
        fileCount: trio.associated.length,
        isDirectory: false,
      });
    }
  }

  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
