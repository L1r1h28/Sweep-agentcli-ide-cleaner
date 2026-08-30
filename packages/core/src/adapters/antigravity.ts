import { createReadStream, existsSync, lstatSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as readline from "node:readline";
import type { ConversationSession } from "../session.ts";
import type { ToolId } from "../types.ts";

/**
 * Checks whether a character code belongs to CJK or East Asian Fullwidth ranges.
 * Fullwidth characters occupy 2 visual columns, whereas ASCII/halfwidth occupy 1.
 */
export function isEastAsianFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) || // CJK Radicals, Kanji, Hangul
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe10 && code <= 0xfe19) || // Vertical forms
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6)    // Fullwidth Symbols
  );
}

/**
 * Computes the total visual display column width of a string in terminal/UI environments.
 */
export function getDisplayWidth(str: string): number {
  if (!str) return 0;
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    width += isEastAsianFullWidth(str.charCodeAt(i)) ? 2 : 1;
  }
  return width;
}

/**
 * Truncates a string to fit within a maximum visual column width, taking CJK character width into account.
 * Appends an ellipsis '…' if truncated.
 */
export function truncateByDisplayWidth(str: string, maxVisualWidth = 26): string {
  if (!str) return "";
  const totalWidth = getDisplayWidth(str);
  if (totalWidth <= maxVisualWidth) {
    return str;
  }

  let currentWidth = 0;
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;
    const charWidth = isEastAsianFullWidth(str.charCodeAt(i)) ? 2 : 1;

    // Reserve 2 column slots for '…'
    if (currentWidth + charWidth > maxVisualWidth - 2) {
      return result + "…";
    }

    currentWidth += charWidth;
    result += char;
  }

  return result;
}

/**
 * Sanitizes and extracts the core human intent from a raw prompt string.
 * Strips out IDE injected XML tags, file mention tags, markdown artifacts, and environment metadata.
 */
export function sanitizeAntigravityPrompt(rawContent: string, maxVisualWidth = 26): string | null {
  if (!rawContent || typeof rawContent !== "string") return null;

  let text = rawContent;

  // 1. Extract content inside <USER_REQUEST> if present
  const reqMatch = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  if (reqMatch) {
    text = reqMatch[1]!;
  } else {
    text = text.replace(/<USER_REQUEST>/gi, "");
  }

  // 2. Strip trailing metadata blocks injected by IDE
  text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*$/gi, "");
  text = text.replace(/<USER_SETTINGS_CHANGE>[\s\S]*$/gi, "");

  // 3. Collect and strip file mentions @[path/to/file:L1-L2] to make room for human intent
  const fileMentions: string[] = [];
  text = text.replace(/@\[([^\]]+)\]/g, (_, p) => {
    const base = p.split(/[\\\/]/).pop().replace(/:L\d+(-L\d+)?$/, "");
    fileMentions.push(base);
    return "";
  });

  // 4. Remove Markdown headers, bullet points, bold/italic/code formatting
  text = text.replace(/^[#\s\-*•\d\.]+/gm, " ");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

  // 5. If there is meaningful human text, prioritize it!
  let display = text;
  if (!display || display.length < 2) {
    display = fileMentions.length > 0 ? `@${fileMentions.join(", @")}` : "";
  }

  if (!display) return null;

  return truncateByDisplayWidth(display, maxVisualWidth);
}

const GENERIC_FOLDER_NAMES = new Set([
  "projects",
  "project",
  ".gemini",
  "gemini",
  "users",
  "user",
  "workspace",
  "repos",
  "home",
  "desktop",
  "documents",
  "downloads",
  "src",
  "appdata",
  "temp",
  "tmp",
  "code",
]);

export function extractCleanProjectName(raw?: string): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  let name = raw.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  if (!name) return undefined;
  name = name.trim();
  if (GENERIC_FOLDER_NAMES.has(name.toLowerCase())) return undefined;
  if (name.length < 2) return undefined;
  return name;
}

export function extractProjectFromContent(content: string): string | undefined {
  if (!content || typeof content !== "string") return undefined;
  const pMatch = content.match(/(?:Projects|workspace|repos|source|dev)[\\/]([a-zA-Z0-9_\-\.]+)/i);
  if (pMatch && pMatch[1]) {
    const candidate = extractCleanProjectName(pMatch[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

/**
 * Fast stream reader for transcript.jsonl.
 * Reads lines sequentially and aborts immediately upon encountering the first USER_INPUT prompt.
 */
export async function extractTranscriptPrompt(
  transcriptPath: string,
  maxVisualWidth = 26
): Promise<{ title?: string; createdAt?: string; projectName?: string }> {
  if (!existsSync(transcriptPath)) return {};

  return new Promise((resolve) => {
    let title: string | undefined;
    let createdAt: string | undefined;
    let projectName: string | undefined;

    const fileStream = createReadStream(transcriptPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const obj = JSON.parse(line);

        if (obj.created_at && !createdAt) {
          createdAt = obj.created_at;
        }

        if (!projectName && obj.user_information?.CorpusName) {
          projectName = extractCleanProjectName(obj.user_information.CorpusName);
        }

        if (obj.type === "USER_INPUT" && obj.content) {
          const raw = typeof obj.content === "string" ? obj.content : JSON.stringify(obj.content);
          const sanitized = sanitizeAntigravityPrompt(raw, maxVisualWidth);
          if (sanitized) {
            title = sanitized;
          }

          if (!projectName && typeof obj.content === "string") {
            projectName = extractProjectFromContent(obj.content);
          }

          rl.close();
          fileStream.destroy();
          resolve({ title, createdAt, projectName });
        }
      } catch {
        // Skip invalid JSON lines
      }
    });

    rl.on("close", () => {
      resolve({ title, createdAt, projectName });
    });

    fileStream.on("error", () => {
      resolve({ title, createdAt, projectName });
    });
  });
}

/**
 * Recursively calculates directory size and file count.
 */
export function getDirectoryStats(dirPath: string): { bytes: number; files: number; latestMtimeMs: number } {
  let bytes = 0;
  let files = 0;
  let latestMtimeMs = 0;
  const stack = [dirPath];

  while (stack.length > 0) {
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
    for (const name of names) {
      stack.push(join(current, name));
    }
  }

  return { bytes, files, latestMtimeMs };
}

/**
 * Unified Antigravity Session Scanner.
 * Combines `brain/<UUID>` directory and `conversations/<UUID>.db` (+ wal / shm) into a single logical session.
 */
export async function scanAntigravitySessions(options: {
  brainDirs: string[];
  convDirs: string[];
  toolId?: ToolId;
  toolName?: string;
  nowMs?: number;
}): Promise<ConversationSession[]> {
  const toolId = options.toolId || "antigravity";
  const toolName = options.toolName || "Antigravity";
  const nowMs = options.nowMs ?? Date.now();

  const sessionsMap = new Map<
    string,
    {
      id: string;
      brainPath?: string;
      convDbPath?: string;
      associatedPaths: string[];
      brainBytes: number;
      convBytes: number;
      fileCount: number;
      latestMtimeMs: number;
      title?: string;
      projectName?: string;
      createdAt?: string;
    }
  >();

  // 1. Scan brain directories
  for (const bDir of options.brainDirs) {
    if (!existsSync(bDir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(bDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry === "tempmediaStorage") continue;
      const fullBrainPath = join(bDir, entry);
      let st;
      try {
        st = statSync(fullBrainPath);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;

      const sessionId = entry;
      const stats = getDirectoryStats(fullBrainPath);

      let sess = sessionsMap.get(sessionId);
      if (!sess) {
        sess = {
          id: sessionId,
          brainPath: fullBrainPath,
          associatedPaths: [fullBrainPath],
          brainBytes: stats.bytes,
          convBytes: 0,
          fileCount: stats.files,
          latestMtimeMs: stats.latestMtimeMs || st.mtimeMs,
        };
        sessionsMap.set(sessionId, sess);
      } else {
        sess.brainPath = fullBrainPath;
        sess.associatedPaths.push(fullBrainPath);
        sess.brainBytes += stats.bytes;
        sess.fileCount += stats.files;
        if (stats.latestMtimeMs > sess.latestMtimeMs) sess.latestMtimeMs = stats.latestMtimeMs;
      }

      // Read transcript
      const transcriptPath = join(fullBrainPath, ".system_generated", "logs", "transcript.jsonl");
      if (existsSync(transcriptPath)) {
        const info = await extractTranscriptPrompt(transcriptPath, 26);
        if (info.title) sess.title = info.title;
        if (info.projectName) sess.projectName = info.projectName;
        if (info.createdAt) sess.createdAt = info.createdAt;
      }
    }
  }

  // 2. Scan conversations database directories and link by UUID
  for (const cDir of options.convDirs) {
    if (!existsSync(cDir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(cDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const ext = entry.endsWith(".db")
        ? ".db"
        : entry.endsWith(".db-wal")
        ? ".db-wal"
        : entry.endsWith(".db-shm")
        ? ".db-shm"
        : null;

      if (!ext) continue;

      const baseName = entry.replace(/\.db(-wal|-shm)?$/, "");
      const fullDbPath = join(cDir, entry);
      let st;
      try {
        st = statSync(fullDbPath);
      } catch {
        continue;
      }

      let sess = sessionsMap.get(baseName);
      if (!sess) {
        sess = {
          id: baseName,
          convDbPath: fullDbPath,
          associatedPaths: [fullDbPath],
          brainBytes: 0,
          convBytes: st.size,
          fileCount: 1,
          latestMtimeMs: st.mtimeMs,
        };
        sessionsMap.set(baseName, sess);
      } else {
        if (!sess.convDbPath && ext === ".db") sess.convDbPath = fullDbPath;
        if (!sess.associatedPaths.includes(fullDbPath)) sess.associatedPaths.push(fullDbPath);
        sess.convBytes += st.size;
        sess.fileCount += 1;
        if (st.mtimeMs > sess.latestMtimeMs) sess.latestMtimeMs = st.mtimeMs;
      }
    }
  }

  // 3. Build standardized ConversationSession list
  const results: ConversationSession[] = [];

  for (const item of sessionsMap.values()) {
    const totalBytes = item.brainBytes + item.convBytes;
    const mtime = item.createdAt ? new Date(item.createdAt).getTime() : item.latestMtimeMs;
    const d = new Date(mtime);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const formattedTime = `${month}-${day} ${hour}:${min}`;

    // Fallback title
    const displayTitle = item.title || `Session (${formattedTime})`;
    const ageDays = Math.max(0, Math.round(((nowMs - mtime) / (1000 * 60 * 60 * 24)) * 10) / 10);
    const primaryPath = item.brainPath || item.convDbPath || item.associatedPaths[0]!;

    results.push({
      id: item.id,
      toolId,
      toolName,
      targetId: "ag-conversations",
      path: primaryPath,
      projectName: item.projectName,
      title: displayTitle,
      updatedAt: d.toISOString(),
      ageDays,
      bytes: totalBytes,
      fileCount: item.fileCount,
      isDirectory: Boolean(item.brainPath),
    });
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return results;
}

/**
 * Safely cleans an Antigravity unified session by removing both brain folder and conversation databases.
 */
export function cleanAntigravitySession(
  session: ConversationSession,
  allBrainDirs: string[],
  allConvDirs: string[]
): { freedBytes: number; deletedPaths: string[] } {
  const uuid = session.id;
  let freedBytes = 0;
  const deletedPaths: string[] = [];

  // Remove brain/<UUID>
  for (const bDir of allBrainDirs) {
    const bPath = join(bDir, uuid);
    if (existsSync(bPath)) {
      try {
        const stats = getDirectoryStats(bPath);
        rmSync(bPath, { recursive: true, force: true });
        freedBytes += stats.bytes;
        deletedPaths.push(bPath);
      } catch {}
    }
  }

  // Remove conversations/<UUID>.db, .db-wal, .db-shm
  for (const cDir of allConvDirs) {
    const dbExtensions = [".db", ".db-wal", ".db-shm"];
    for (const ext of dbExtensions) {
      const dbFile = join(cDir, `${uuid}${ext}`);
      if (existsSync(dbFile)) {
        try {
          const st = statSync(dbFile);
          rmSync(dbFile, { force: true });
          freedBytes += st.size;
          deletedPaths.push(dbFile);
        } catch {}
      }
    }
  }

  return { freedBytes, deletedPaths };
}
