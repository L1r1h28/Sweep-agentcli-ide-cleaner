import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  extractCleanProjectName,
  extractProjectFromContent,
  isEastAsianFullWidth,
  sanitizeAntigravityPrompt,
  truncateByDisplayWidth,
} from "./adapters/antigravity.ts";
import {
  extractCodexPromptAndMeta,
  scanCodexSessions,
} from "./adapters/codex.ts";
import {
  decodeClaudeProjectSlug,
  extractClaudeSessionMeta,
  scanClaudeSessions,
} from "./adapters/claude.ts";
import { backupRoot, copyToBackup } from "./backup.ts";
import { NEVER_DELETE_GLOBS, TOOLS } from "./catalog.ts";
import { loadConfig } from "./config.ts";
import { isSessionWhitelisted } from "./filter.ts";
import { defaultHome, detectPlatform, resolveTargets, type EnvMap } from "./paths.ts";
import type { CleanKind, Platform, SweepConfig, ToolDef, ToolId } from "./types.ts";

export interface ConversationSession {
  id: string;
  toolId: ToolId;
  toolName: string;
  targetId: string;
  path: string;
  associatedPaths?: string[];
  projectName?: string;
  title?: string;
  updatedAt: string;
  ageDays: number;
  bytes: number;
  fileCount: number;
  isDirectory: boolean;
  isWhitelisted?: boolean;
}

export interface SessionFilterOptions {
  olderThanDays?: number;
  newerThanDays?: number;
  minBytes?: number;
  maxBytes?: number;
  projectQuery?: string;
  toolIds?: ToolId[];
  targetIds?: string[];
  searchQuery?: string;
}

export interface SessionCleanItem {
  session: ConversationSession;
  action: "would-delete" | "deleted" | "backed-up" | "skipped" | "failed";
  bytes: number;
  error?: string;
}

export interface SessionCleanResult {
  dryRun: boolean;
  backupDir?: string;
  items: SessionCleanItem[];
  freedBytes: number;
}

export function parseDurationToDays(input: string | number): number {
  if (typeof input === "number") return input;
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(d|days?|w|weeks?|m|months?|y|years?)?$/i);
  if (!match) {
    throw new Error(`Invalid duration format: "${input}". Expected e.g. "30d", "2w", "1m", "90d" or number of days.`);
  }
  const val = parseFloat(match[1]!);
  const unit = match[2] ? match[2].charAt(0).toLowerCase() : "d";
  switch (unit) {
    case "w":
      return val * 7;
    case "m":
      return val * 30;
    case "y":
      return val * 365;
    case "d":
    default:
      return val;
  }
}

export function parseSizeToBytes(input: string | number): number {
  if (typeof input === "number") return input;
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(b|bytes?|kb?|mb?|gb?|tb?)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: "${input}". Expected e.g. "50mb", "100kb", "1gb".`);
  }
  const val = parseFloat(match[1]!);
  const unit = match[2] ? match[2].toLowerCase() : "b";
  if (unit.startsWith("t")) return Math.round(val * 1024 * 1024 * 1024 * 1024);
  if (unit.startsWith("g")) return Math.round(val * 1024 * 1024 * 1024);
  if (unit.startsWith("m")) return Math.round(val * 1024 * 1024);
  if (unit.startsWith("k")) return Math.round(val * 1024);
  return Math.round(val);
}

function dirStats(root: string): { bytes: number; files: number; latestMtimeMs: number } {
  let bytes = 0;
  let files = 0;
  let latestMtimeMs = 0;
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

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*\\\*/g, "\uFFFD")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/\uFFFD/g, ".*");
  return new RegExp(escaped, "i");
}

const NEVER_DELETE_REGEXES = NEVER_DELETE_GLOBS.map(globToRegex);

function isSessionProtected(p: string): boolean {
  const normalised = p.replace(/\\/g, "/");
  const withTrailing = normalised.endsWith("/") ? normalised : `${normalised}/`;
  return NEVER_DELETE_REGEXES.some((re) => re.test(normalised) || re.test(withTrailing));
}

function extractTranscriptInfo(filePath: string): { title?: string; projectName?: string } {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let title: string | undefined;
    let projectName: string | undefined;

    for (const line of lines.slice(0, 30)) {
      try {
        const obj = JSON.parse(line);
        // Antigravity style
        if (!projectName && obj.user_information?.CorpusName) {
          projectName = extractCleanProjectName(obj.user_information.CorpusName);
        }
        if (!projectName && obj.content && typeof obj.content === "string") {
          projectName = extractProjectFromContent(obj.content);
        }
        if (!title && (obj.type === "USER_INPUT" || obj.source === "USER_EXPLICIT")) {
          const raw = typeof obj.content === "string" ? obj.content : JSON.stringify(obj.content ?? "");
          const sanitized = sanitizeAntigravityPrompt(raw, 26);
          if (sanitized) {
            title = sanitized;
          }
        }
        // Codex style (turn_context, response_item, event_msg, workspace)
        if (!projectName && obj.type === "turn_context" && obj.payload) {
          if (obj.payload.cwd) projectName = extractCleanProjectName(obj.payload.cwd);
          else if (Array.isArray(obj.payload.workspace_roots) && obj.payload.workspace_roots[0]) {
            projectName = extractCleanProjectName(obj.payload.workspace_roots[0]);
          }
        }
        if (!projectName && obj.workspace) {
          projectName = extractCleanProjectName(obj.workspace);
        }
        if (!title && obj.type === "response_item" && obj.payload?.type === "message" && obj.payload.role === "user") {
          const c = obj.payload.content;
          if (Array.isArray(c) && c[0]?.text && !String(c[0].text).startsWith("<environment_context>")) {
            title = truncateByDisplayWidth(String(c[0].text).replace(/[\r\n]+/g, " ").trim(), 26);
          }
        }
        if (!title && obj.type === "event_msg" && obj.payload?.type === "user_message" && obj.payload.message) {
          if (!String(obj.payload.message).startsWith("<environment_context>")) {
            title = truncateByDisplayWidth(String(obj.payload.message).replace(/[\r\n]+/g, " ").trim(), 26);
          }
        }
        if (!title && obj.payload?.messages) {
          const firstUser = obj.payload.messages.find((m: any) => m.role === "user");
          if (firstUser?.content) {
            title = truncateByDisplayWidth(String(firstUser.content).replace(/[\r\n]+/g, " ").trim(), 26);
          }
        }
        if (!title && obj.role === "user" && obj.content) {
          const raw = typeof obj.content === "string" ? obj.content : JSON.stringify(obj.content);
          if (!raw.startsWith("<environment_context>")) {
            title = sanitizeAntigravityPrompt(raw, 26) || truncateByDisplayWidth(raw.replace(/[\r\n]+/g, " ").trim(), 26);
          }
        }
      } catch {
        // skip non-json line
      }
      if (title && projectName) break;
    }
    return { title, projectName };
  } catch {
    return {};
  }
}

function inspectSessionItem(
  itemPath: string,
  toolId: ToolId,
  toolName: string,
  targetId: string,
  nowMs: number,
  fallbackProject?: string
): ConversationSession | null {
  try {
    const st = statSync(itemPath);
    const isDir = st.isDirectory();
    let bytes = st.size;
    let files = 1;
    let mtimeMs = st.mtimeMs;
    let title: string | undefined;
    let projectName = fallbackProject;

    if (isDir) {
      const stats = dirStats(itemPath);
      bytes = stats.bytes;
      files = stats.files;
      if (stats.latestMtimeMs > 0) mtimeMs = stats.latestMtimeMs;

      // Check common transcript files inside directory
      const candidates = [
        join(itemPath, "transcript.jsonl"),
        join(itemPath, ".system_generated", "logs", "transcript.jsonl"),
        join(itemPath, "session.json"),
        join(itemPath, "metadata.json"),
      ];

      for (const cand of candidates) {
        if (existsSync(cand)) {
          const meta = extractTranscriptInfo(cand);
          if (meta.title && !title) title = meta.title;
          if (meta.projectName && !projectName) projectName = meta.projectName;
          break;
        }
      }

      // If metadata.json has Summary / title
      const metaFile = join(itemPath, "metadata.json");
      if (existsSync(metaFile)) {
        try {
          const meta = JSON.parse(readFileSync(metaFile, "utf-8"));
          if (meta.title && !title) title = truncateByDisplayWidth(meta.title, 26);
          if (meta.summary && !title) title = truncateByDisplayWidth(String(meta.summary), 26);
          if (meta.project && !projectName) projectName = meta.project;
        } catch {
          // ignore
        }
      }
    } else {
      // Single file session (e.g. .codex/sessions/rollout-*.jsonl or .claude/projects/p/*.jsonl)
      if (itemPath.endsWith(".jsonl") || itemPath.endsWith(".json")) {
        const meta = extractTranscriptInfo(itemPath);
        if (meta.title) title = meta.title;
        if (meta.projectName && !projectName) projectName = meta.projectName;
      }
    }

    const id = basename(itemPath).replace(/\.(jsonl|json|pb|db)$/i, "");
    const ageDays = Math.max(0, Math.round(((nowMs - mtimeMs) / (1000 * 60 * 60 * 24)) * 10) / 10);
    const d = new Date(mtimeMs);
    const formattedFallback = `Session (${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;

    return {
      id,
      toolId,
      toolName,
      targetId,
      path: itemPath,
      associatedPaths: [itemPath],
      projectName,
      title: title || formattedFallback,
      updatedAt: new Date(mtimeMs).toISOString(),
      ageDays,
      bytes,
      fileCount: files,
      isDirectory: isDir,
    };
  } catch {
    return null;
  }
}

export function scanSessions(options?: {
  platform?: Platform;
  home?: string;
  env?: EnvMap;
  toolIds?: ToolId[];
  tools?: ToolDef[];
  config?: SweepConfig;
}): ConversationSession[] {
  const platform = options?.platform ?? detectPlatform();
  const env = options?.env ?? (typeof process !== "undefined" ? process.env : {});
  const home = options?.home ?? defaultHome(platform, env);
  const config = options?.config ?? loadConfig(undefined, home, env);
  const tools = options?.tools ?? TOOLS;
  const filteredTools = options?.toolIds
    ? tools.filter((t) => options.toolIds!.includes(t.id))
    : tools;

  const resolved = resolveTargets(platform, home, env, filteredTools, config.customPaths);
  const convTargets = resolved.filter((r) => r.target.kind === "conversations");
  const sessions: ConversationSession[] = [];
  const nowMs = Date.now();

  // 1. Check if Antigravity variants (IDE, Desktop, CLI) are among targets, and process their sessions in unified mode
  const agVariantIds: ToolId[] = ["antigravity", "antigravity-ide", "antigravity-desktop", "antigravity-cli"];
  const agTargets = convTargets.filter((r) => agVariantIds.includes(r.toolId));

  for (const agToolId of agVariantIds) {
    const specificTargets = agTargets.filter((r) => r.toolId === agToolId);
    if (specificTargets.length === 0) continue;

    const toolDef = tools.find((t) => t.id === agToolId) || { name: "Antigravity IDE", id: agToolId };
    const brainPaths: string[] = [];
    const convPaths: string[] = [];
    for (const r of specificTargets) {
      for (const p of r.resolvedPaths) {
        if (p.toLowerCase().endsWith("brain") || p.toLowerCase().includes("brain")) {
          brainPaths.push(p);
        } else if (p.toLowerCase().endsWith("conversations") || p.toLowerCase().includes("conversations")) {
          convPaths.push(p);
        }
      }
    }

    const agSessionsMap = new Map<string, ConversationSession>();
    const defaultTargetId = specificTargets[0]!.target.id;

    // Scan brain folders
    for (const bDir of brainPaths) {
      if (!existsSync(bDir)) continue;
      try {
        const entries = readdirSync(bDir);
        for (const e of entries) {
          if (e === "tempmediaStorage") continue;
          const fullPath = join(bDir, e);
          try {
            if (!statSync(fullPath).isDirectory()) continue;
          } catch {
            continue;
          }

          const s = inspectSessionItem(fullPath, agToolId, toolDef.name, defaultTargetId, nowMs);
          if (s) {
            agSessionsMap.set(e, s);
          }
        }
      } catch {}
    }

    // Scan and merge conversations db files
    for (const cDir of convPaths) {
      if (!existsSync(cDir)) continue;
      try {
        const entries = readdirSync(cDir);
        for (const e of entries) {
          const extMatch = e.match(/^(.+?)\.db(-wal|-shm)?$/i);
          if (!extMatch) continue;
          const uuid = extMatch[1]!;
          const fullPath = join(cDir, e);
          let st;
          try {
            st = statSync(fullPath);
          } catch {
            continue;
          }

          const existing = agSessionsMap.get(uuid);
          if (existing) {
            existing.bytes += st.size;
            existing.fileCount += 1;
            if (!existing.associatedPaths) existing.associatedPaths = [existing.path];
            if (!existing.associatedPaths.includes(fullPath)) {
              existing.associatedPaths.push(fullPath);
            }
          } else {
            const s = inspectSessionItem(fullPath, agToolId, toolDef.name, defaultTargetId, nowMs);
            if (s) {
              s.id = uuid;
              agSessionsMap.set(uuid, s);
            }
          }
        }
      } catch {}
    }

    for (const s of agSessionsMap.values()) {
      s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
      sessions.push(s);
    }
  }

  // 2. Check if Codex variants (CLI, Desktop, Shared) are among targets
  const codexVariantIds: ToolId[] = ["codex", "codex-desktop", "codex-cli"];
  const codexTargets = convTargets.filter((r) => codexVariantIds.includes(r.toolId));

  for (const cxToolId of codexVariantIds) {
    const specificTargets = codexTargets.filter((r) => r.toolId === cxToolId);
    if (specificTargets.length === 0) continue;

    const toolDef = tools.find((t) => t.id === cxToolId) || { name: "Codex", id: cxToolId };
    const sessionDirs: string[] = [];
    const indexPaths: string[] = [];

    for (const r of specificTargets) {
      for (const p of r.resolvedPaths) {
        if (!existsSync(p)) continue;
        try {
          const st = statSync(p);
          if (st.isDirectory()) {
            sessionDirs.push(p);
          } else if (p.endsWith("session_index.jsonl")) {
            indexPaths.push(p);
          }
        } catch {}
      }
    }

    if (sessionDirs.length > 0) {
      const defaultTargetId = specificTargets[0]!.target.id;
      const found = scanCodexSessions({
        sessionDirs,
        sessionIndexPaths: indexPaths,
        toolId: cxToolId,
        toolName: toolDef.name,
        targetId: defaultTargetId,
        nowMs,
      });

      for (const s of found) {
        s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
        sessions.push(s);
      }
    }
  }

  // 3. Check if Claude variants (Claude Code, Claude Desktop) are among targets
  const claudeVariantIds: ToolId[] = ["claude-code", "claude-desktop"];
  const claudeTargets = convTargets.filter((r) => claudeVariantIds.includes(r.toolId));

  for (const ccToolId of claudeVariantIds) {
    const specificTargets = claudeTargets.filter((r) => r.toolId === ccToolId);
    if (specificTargets.length === 0) continue;

    const toolDef = tools.find((t) => t.id === ccToolId) || { name: "Claude Code", id: ccToolId };
    const claudeRootDirs: string[] = [];

    for (const r of specificTargets) {
      for (const p of r.resolvedPaths) {
        if (!existsSync(p)) continue;
        claudeRootDirs.push(p);
      }
    }

    if (claudeRootDirs.length > 0) {
      const defaultTargetId = specificTargets[0]!.target.id;
      const found = scanClaudeSessions({
        claudeRootDirs,
        toolId: ccToolId,
        toolName: toolDef.name,
        defaultTargetId,
        nowMs,
      });

      for (const s of found) {
        s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
        sessions.push(s);
      }
    }
  }

  // 4. Process all other tools (or targets not Antigravity, Codex, or Claude conversations)
  for (const r of convTargets) {
    if (agVariantIds.includes(r.toolId) || codexVariantIds.includes(r.toolId) || claudeVariantIds.includes(r.toolId)) continue;

    for (const targetPath of r.resolvedPaths) {
      if (!existsSync(targetPath)) continue;

      let st;
      try {
        st = statSync(targetPath);
      } catch {
        continue;
      }

      if (!st.isDirectory()) {
        const s = inspectSessionItem(targetPath, r.toolId, r.toolName, r.target.id, nowMs);
        if (s) {
          s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
          sessions.push(s);
        }
        continue;
      }

      // Special structure handling for Claude Code projects: ~/.claude/projects/<project>/*.jsonl
      if (r.target.id === "claude-projects" || targetPath.replace(/\\/g, "/").includes(".claude/projects")) {
        try {
          const projectFolders = readdirSync(targetPath);
          for (const proj of projectFolders) {
            const projDir = join(targetPath, proj);
            try {
              if (!statSync(projDir).isDirectory()) continue;
              const sessionFiles = readdirSync(projDir);
              for (const sf of sessionFiles) {
                const sPath = join(projDir, sf);
                const s = inspectSessionItem(sPath, r.toolId, r.toolName, r.target.id, nowMs, proj);
                if (s) {
                  s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
                  sessions.push(s);
                }
              }
            } catch {
              continue;
            }
          }
        } catch {}
        continue;
      }

      // Standard directory of sessions
      try {
        const children = readdirSync(targetPath);
        for (const child of children) {
          const childPath = join(targetPath, child);
          const s = inspectSessionItem(childPath, r.toolId, r.toolName, r.target.id, nowMs);
          if (s) {
            s.isWhitelisted = isSessionWhitelisted(s, config.whitelist);
            sessions.push(s);
          }
        }
      } catch {}
    }
  }

  // Sort by updatedAt descending (newest first)
  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function filterSessions(
  sessions: ConversationSession[],
  options: SessionFilterOptions
): ConversationSession[] {
  return sessions.filter((s) => {
    if (options.toolIds && !options.toolIds.includes(s.toolId)) {
      return false;
    }
    if (options.targetIds && !options.targetIds.includes(s.targetId)) {
      return false;
    }
    if (options.olderThanDays !== undefined && s.ageDays < options.olderThanDays) {
      return false;
    }
    if (options.newerThanDays !== undefined && s.ageDays > options.newerThanDays) {
      return false;
    }
    if (options.minBytes !== undefined && s.bytes < options.minBytes) {
      return false;
    }
    if (options.maxBytes !== undefined && s.bytes > options.maxBytes) {
      return false;
    }
    if (options.projectQuery) {
      const q = options.projectQuery.toLowerCase();
      const proj = (s.projectName || "").toLowerCase();
      const pathStr = s.path.toLowerCase();
      if (!proj.includes(q) && !pathStr.includes(q)) {
        return false;
      }
    }
    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      const id = s.id.toLowerCase();
      const title = (s.title || "").toLowerCase();
      const proj = (s.projectName || "").toLowerCase();
      if (!id.includes(q) && !title.includes(q) && !proj.includes(q)) {
        return false;
      }
    }
    return true;
  });
}

export function exportSessionToMarkdown(session: ConversationSession): string {
  const parts: string[] = [];
  parts.push(`# Session: ${session.title || session.id}`);
  parts.push(`- **Tool**: ${session.toolName} (\`${session.toolId}\`)`);
  parts.push(`- **Session ID**: \`${session.id}\``);
  if (session.projectName) {
    parts.push(`- **Project**: ${session.projectName}`);
  }
  parts.push(`- **Last Modified**: ${session.updatedAt} (${session.ageDays} days ago)`);
  parts.push(`- **Size**: ${session.bytes} bytes (${session.fileCount} files)`);
  parts.push(`- **Path**: \`${session.path}\``);
  parts.push("");
  parts.push("---");
  parts.push("");

  let transcriptPath: string | null = null;
  if (session.isDirectory) {
    const candidates = [
      join(session.path, "transcript.jsonl"),
      join(session.path, ".system_generated", "logs", "transcript.jsonl"),
      join(session.path, "session.json"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        transcriptPath = c;
        break;
      }
    }
  } else if (session.path.endsWith(".jsonl") || session.path.endsWith(".json")) {
    transcriptPath = session.path;
  }

  if (transcriptPath && existsSync(transcriptPath)) {
    try {
      const raw = readFileSync(transcriptPath, "utf-8");
      if (transcriptPath.endsWith(".jsonl")) {
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        let turn = 1;
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const isUser =
              entry.type === "USER_INPUT" ||
              entry.source === "USER_EXPLICIT" ||
              entry.role === "user";
            const isAssistant =
              entry.type === "PLANNER_RESPONSE" ||
              entry.source === "MODEL" ||
              entry.role === "assistant";

            let content = "";
            if (typeof entry.content === "string") {
              content = entry.content;
            } else if (entry.content) {
              content = JSON.stringify(entry.content, null, 2);
            }

            if (isUser) {
              parts.push(`### 👤 User (Turn ${turn})`);
              parts.push(content || "*(empty)*");
              parts.push("");
            } else if (isAssistant) {
              parts.push(`### 🤖 Assistant`);
              parts.push(content || "*(response)*");
              parts.push("");
              turn++;
            }
          } catch {
            // skip unparseable lines
          }
        }
      } else {
        // Generic json
        parts.push("```json");
        parts.push(raw);
        parts.push("```");
      }
    } catch (err) {
      parts.push(`> Failed to read transcript content: ${String(err)}`);
    }
  } else {
    parts.push(`> Binary or directory session without structured JSON transcript.`);
  }

  return parts.join("\n");
}

export function exportSessionToJson(session: ConversationSession): string {
  let transcriptData: any[] = [];
  let transcriptPath: string | null = null;

  if (session.isDirectory) {
    const candidates = [
      join(session.path, "transcript.jsonl"),
      join(session.path, ".system_generated", "logs", "transcript.jsonl"),
      join(session.path, "session.json"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        transcriptPath = c;
        break;
      }
    }
  } else if (session.path.endsWith(".jsonl") || session.path.endsWith(".json")) {
    transcriptPath = session.path;
  }

  if (transcriptPath && existsSync(transcriptPath)) {
    try {
      const raw = readFileSync(transcriptPath, "utf-8");
      if (transcriptPath.endsWith(".jsonl")) {
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            transcriptData.push(JSON.parse(line));
          } catch {
            transcriptData.push({ raw: line });
          }
        }
      } else {
        transcriptData = JSON.parse(raw);
      }
    } catch (err) {
      transcriptData = [{ error: String(err) }];
    }
  }

  return JSON.stringify(
    {
      session,
      exportedAt: new Date().toISOString(),
      transcript: transcriptData,
    },
    null,
    2
  );
}

export function cleanSessions(
  sessions: ConversationSession[],
  options?: {
    dryRun?: boolean;
    backup?: boolean;
    backupDir?: string;
    home?: string;
    platform?: Platform;
    env?: EnvMap;
    config?: SweepConfig;
  }
): SessionCleanResult {
  const dryRun = options?.dryRun ?? false;
  const backup = options?.backup ?? true;
  const platform = options?.platform ?? detectPlatform();
  const env = options?.env ?? (typeof process !== "undefined" ? process.env : {});
  const home = options?.home ?? defaultHome(platform, env);
  const config = options?.config ?? loadConfig(undefined, home, env);
  const backupDir = backup ? options?.backupDir ?? backupRoot(home) : undefined;
  const items: SessionCleanItem[] = [];
  let freed = 0;

  for (const session of sessions) {
    if (session.isWhitelisted || isSessionWhitelisted(session, config.whitelist)) {
      items.push({
        session,
        action: "skipped",
        bytes: 0,
        error: "Whitelisted (Protected)",
      });
      continue;
    }

    if (isSessionProtected(session.path)) {
      items.push({
        session,
        action: "skipped",
        bytes: 0,
        error: "Protected by system rules",
      });
      continue;
    }

    if (dryRun) {
      items.push({
        session,
        action: "would-delete",
        bytes: session.bytes,
      });
      freed += session.bytes;
      continue;
    }

    const targetPaths = session.associatedPaths && session.associatedPaths.length > 0
      ? session.associatedPaths
      : [session.path];

    try {
      for (const p of targetPaths) {
        if (!existsSync(p)) continue;
        if (backupDir) {
          try {
            copyToBackup(p, backupDir);
          } catch {
            // continue even if backup fails for single path
          }
        }
        rmSync(p, { recursive: true, force: true });
      }

      items.push({
        session,
        action: backupDir ? "backed-up" : "deleted",
        bytes: session.bytes,
      });
      freed += session.bytes;
    } catch (err) {
      items.push({
        session,
        action: "failed",
        bytes: 0,
        error: String(err),
      });
    }
  }

  return {
    dryRun,
    backupDir,
    items,
    freedBytes: freed,
  };
}
