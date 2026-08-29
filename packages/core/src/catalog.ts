import type { ToolDef } from "./types.ts";

/**
 * Canonical storage map for supported AI coding tools.
 * Paths use tokens: ~  %USERPROFILE%  %APPDATA%  %LOCALAPPDATA%
 * Resolved at scan time — never hard-code a username.
 *
 * Verified against an actual Windows scan (2026-08).
 * See docs/storage-paths.md for the full annotated folder tree.
 */
export const TOOLS: ToolDef[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Antigravity IDE (Google)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "antigravity",
    name: "Antigravity",
    shortName: "AG",
    products: ["IDE", "Desktop 2.0", "CLI (agy)"],
    blurb:
      "Google agent IDE. Conversations live under ~/.gemini/antigravity-ide; Electron caches in %APPDATA%\\Antigravity IDE.",
    notes: [
      "Only antigravity-ide and antigravity-backup exist on most installs. antigravity/ and antigravity-cli/ may not be present.",
      "brain/ + conversations/ + implicit/ hold the bulk of chat data (≈360 MB on a typical install).",
      "WebStorage in AppData is the largest safe-to-delete item (IndexedDB, ≈150 MB).",
      "state.vscdb is a UI index — not conversation data. Leave it unless you need a full reset.",
    ],
    targets: [
      {
        id: "ag-conversations",
        label: "Conversation files",
        kind: "conversations",
        risk: "high",
        description: ".pb / .db chat files for IDE and Desktop. Typically the largest folder.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity-backup\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity-cli\\conversations",
          ],
          mac: [
            "~/.gemini/antigravity-ide/conversations",
            "~/.gemini/antigravity-backup/conversations",
            "~/.gemini/antigravity/conversations",
            "~/.gemini/antigravity-cli/conversations",
          ],
          linux: [
            "~/.gemini/antigravity-ide/conversations",
            "~/.gemini/antigravity-backup/conversations",
            "~/.gemini/antigravity/conversations",
            "~/.gemini/antigravity-cli/conversations",
          ],
        },
      },
      {
        id: "ag-brain",
        label: "Brain / agent memory",
        kind: "conversations",
        risk: "high",
        description: "Per-UUID transcripts, artifacts, and agent memory. Often 50–100 MB.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\brain",
            "%USERPROFILE%\\.gemini\\antigravity-backup\\brain",
            "%USERPROFILE%\\.gemini\\antigravity\\brain",
            "%USERPROFILE%\\.gemini\\antigravity-cli\\brain",
          ],
          mac: [
            "~/.gemini/antigravity-ide/brain",
            "~/.gemini/antigravity-backup/brain",
            "~/.gemini/antigravity/brain",
            "~/.gemini/antigravity-cli/brain",
          ],
          linux: [
            "~/.gemini/antigravity-ide/brain",
            "~/.gemini/antigravity-backup/brain",
            "~/.gemini/antigravity/brain",
            "~/.gemini/antigravity-cli/brain",
          ],
        },
      },
      {
        id: "ag-implicit",
        label: "Implicit / context state",
        kind: "conversations",
        risk: "high",
        description: "implicit/, context_state/, annotations/ — implicit session state. Can be 30–35 MB.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\implicit",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\context_state",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\annotations",
            "%USERPROFILE%\\.gemini\\antigravity-backup\\implicit",
            "%USERPROFILE%\\.gemini\\antigravity\\implicit",
            "%USERPROFILE%\\.gemini\\antigravity\\context_state",
            "%USERPROFILE%\\.gemini\\antigravity\\annotations",
          ],
          mac: [
            "~/.gemini/antigravity-ide/implicit",
            "~/.gemini/antigravity-ide/context_state",
            "~/.gemini/antigravity-ide/annotations",
            "~/.gemini/antigravity-backup/implicit",
            "~/.gemini/antigravity/implicit",
            "~/.gemini/antigravity/context_state",
            "~/.gemini/antigravity/annotations",
          ],
          linux: [
            "~/.gemini/antigravity-ide/implicit",
            "~/.gemini/antigravity-ide/context_state",
            "~/.gemini/antigravity-ide/annotations",
            "~/.gemini/antigravity-backup/implicit",
            "~/.gemini/antigravity/implicit",
            "~/.gemini/antigravity/context_state",
            "~/.gemini/antigravity/annotations",
          ],
        },
      },
      {
        id: "ag-recordings",
        label: "Browser recordings",
        kind: "conversations",
        risk: "high",
        description: "browser_recordings/ — screen capture files used during sessions.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\browser_recordings",
            "%USERPROFILE%\\.gemini\\antigravity\\browser_recordings",
          ],
          mac: [
            "~/.gemini/antigravity-ide/browser_recordings",
            "~/.gemini/antigravity/browser_recordings",
          ],
          linux: [
            "~/.gemini/antigravity-ide/browser_recordings",
            "~/.gemini/antigravity/browser_recordings",
          ],
        },
      },
      {
        id: "ag-cache",
        label: "Electron / IDE cache",
        kind: "cache",
        risk: "low",
        description: "WebStorage (IndexedDB, ≈150 MB), Cache, GPUCache, CachedData, logs, Crashpad in %APPDATA%\\Antigravity IDE.",
        paths: {
          win: [
            "%APPDATA%\\Antigravity IDE\\WebStorage",
            "%APPDATA%\\Antigravity IDE\\CachedData",
            "%APPDATA%\\Antigravity IDE\\Cache",
            "%APPDATA%\\Antigravity IDE\\GPUCache",
            "%APPDATA%\\Antigravity IDE\\DawnWebGPUCache",
            "%APPDATA%\\Antigravity IDE\\DawnGraphiteCache",
            "%APPDATA%\\Antigravity IDE\\logs",
            "%APPDATA%\\Antigravity IDE\\Crashpad",
            "%APPDATA%\\Antigravity IDE\\blob_storage",
            "%APPDATA%\\Antigravity IDE\\Code Cache",
            "%APPDATA%\\Antigravity IDE\\Session Storage",
            "%APPDATA%\\Antigravity IDE\\Local Storage",
            "%APPDATA%\\Antigravity IDE\\CachedExtensionVSIXs",
            "%APPDATA%\\Antigravity\\WebStorage",
            "%APPDATA%\\Antigravity\\Cache",
            "%APPDATA%\\Antigravity\\GPUCache",
            "%LOCALAPPDATA%\\Antigravity IDE\\Cache",
            "%LOCALAPPDATA%\\Antigravity\\Cache",
          ],
          mac: [
            "~/Library/Application Support/Antigravity IDE/WebStorage",
            "~/Library/Application Support/Antigravity IDE/Cache",
            "~/Library/Application Support/Antigravity IDE/GPUCache",
            "~/Library/Application Support/Antigravity IDE/CachedData",
            "~/Library/Application Support/Antigravity IDE/blob_storage",
            "~/Library/Application Support/Antigravity/Cache",
            "~/Library/Application Support/Antigravity/GPUCache",
            "~/Library/Caches/Antigravity",
            "~/Library/Caches/Antigravity IDE",
          ],
          linux: [
            "~/.config/Antigravity IDE/WebStorage",
            "~/.config/Antigravity IDE/Cache",
            "~/.config/Antigravity IDE/GPUCache",
            "~/.config/Antigravity IDE/CachedData",
            "~/.config/Antigravity IDE/blob_storage",
            "~/.config/Antigravity/Cache",
            "~/.config/Antigravity/GPUCache",
            "~/.cache/Antigravity",
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Codex (OpenAI) — CLI + Desktop share the same backend
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "codex",
    name: "Codex",
    shortName: "CX",
    products: ["CLI", "Desktop App"],
    blurb:
      "OpenAI Codex. Desktop App and CLI share the same ~/.codex backend. WARNING: .sandbox-bin/ (≈340 MB) is the sandbox runtime — never delete it.",
    notes: [
      "Desktop App and CLI share ~/.codex/sessions — deleting affects every client.",
      "session_index.jsonl + thread_history_1.sqlite hold conversation metadata.",
      ".sandbox-bin/ is the sandbox execution environment, NOT cache or sessions — leave it alone.",
      "memories_1.sqlite + memories/ hold long-term memory (high risk to delete).",
    ],
    targets: [
      {
        id: "codex-sessions",
        label: "Sessions (CLI + Desktop shared)",
        kind: "conversations",
        risk: "high",
        description: "rollout-*.jsonl under sessions/YYYY/MM/DD, archived_sessions, and session_index.jsonl.",
        paths: {
          win: [
            "%USERPROFILE%\\.codex\\sessions",
            "%USERPROFILE%\\.codex\\archived_sessions",
            "%USERPROFILE%\\.codex\\session_index.jsonl",
          ],
          mac: [
            "~/.codex/sessions",
            "~/.codex/archived_sessions",
            "~/.codex/session_index.jsonl",
          ],
          linux: [
            "~/.codex/sessions",
            "~/.codex/archived_sessions",
            "~/.codex/session_index.jsonl",
          ],
        },
      },
      {
        id: "codex-memory",
        label: "Long-term memory",
        kind: "conversations",
        risk: "high",
        description: "memories/, memories_1.sqlite, thread_history_1.sqlite, goals_1.sqlite — agent long-term memory.",
        paths: {
          win: [
            "%USERPROFILE%\\.codex\\memories",
            "%USERPROFILE%\\.codex\\memories_1.sqlite",
            "%USERPROFILE%\\.codex\\thread_history_1.sqlite",
            "%USERPROFILE%\\.codex\\goals_1.sqlite",
          ],
          mac: [
            "~/.codex/memories",
            "~/.codex/memories_1.sqlite",
            "~/.codex/thread_history_1.sqlite",
            "~/.codex/goals_1.sqlite",
          ],
          linux: [
            "~/.codex/memories",
            "~/.codex/memories_1.sqlite",
            "~/.codex/thread_history_1.sqlite",
            "~/.codex/goals_1.sqlite",
          ],
        },
      },
      {
        id: "codex-cache",
        label: "Cache & logs",
        kind: "cache",
        risk: "low",
        description: "cache/, computer-use/, tmp/, visualizations/, models_cache.json, logs_2.sqlite, queue_1.sqlite.",
        paths: {
          win: [
            "%USERPROFILE%\\.codex\\cache",
            "%USERPROFILE%\\.codex\\computer-use",
            "%USERPROFILE%\\.codex\\tmp",
            "%USERPROFILE%\\.codex\\visualizations",
            "%USERPROFILE%\\.codex\\models_cache.json",
            "%USERPROFILE%\\.codex\\logs_2.sqlite",
            "%USERPROFILE%\\.codex\\queue_1.sqlite",
          ],
          mac: [
            "~/.codex/cache",
            "~/.codex/computer-use",
            "~/.codex/tmp",
            "~/.codex/visualizations",
            "~/.codex/models_cache.json",
            "~/.codex/logs_2.sqlite",
            "~/.codex/queue_1.sqlite",
          ],
          linux: [
            "~/.codex/cache",
            "~/.codex/computer-use",
            "~/.codex/tmp",
            "~/.codex/visualizations",
            "~/.codex/models_cache.json",
            "~/.codex/logs_2.sqlite",
            "~/.codex/queue_1.sqlite",
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Claude Code (Anthropic)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "claude-code",
    name: "Claude Code",
    shortName: "CC",
    products: ["CLI", "VS Code / JetBrains extension", "Desktop coding"],
    blurb:
      "Anthropic Claude Code. CLI, extensions, and desktop coding features write to the same ~/.claude directory (CLAUDE_CONFIG_DIR).",
    notes: [
      "Sessions are JSONL under projects/<encoded-cwd>/<session-id>.jsonl.",
      "Default retention is cleanupPeriodDays = 30.",
      "Deleting projects/ removes resume, continue, and rewind.",
    ],
    targets: [
      {
        id: "cc-sessions",
        label: "Project sessions",
        kind: "conversations",
        risk: "high",
        description: "JSONL transcripts, subagents, and spilled tool-results under ~/.claude/projects.",
        paths: {
          win: ["%USERPROFILE%\\.claude\\projects"],
          mac: ["~/.claude/projects"],
          linux: ["~/.claude/projects"],
        },
      },
      {
        id: "cc-history-extras",
        label: "History, pastes & checkpoints",
        kind: "conversations",
        risk: "high",
        description: "history.jsonl (up-arrow recall), paste-cache, file-history (rewind snapshots), uploads.",
        paths: {
          win: [
            "%USERPROFILE%\\.claude\\history.jsonl",
            "%USERPROFILE%\\.claude\\paste-cache",
            "%USERPROFILE%\\.claude\\file-history",
            "%USERPROFILE%\\.claude\\uploads",
          ],
          mac: [
            "~/.claude/history.jsonl",
            "~/.claude/paste-cache",
            "~/.claude/file-history",
            "~/.claude/uploads",
          ],
          linux: [
            "~/.claude/history.jsonl",
            "~/.claude/paste-cache",
            "~/.claude/file-history",
            "~/.claude/uploads",
          ],
        },
      },
      {
        id: "cc-cache",
        label: "Stats & usage cache",
        kind: "cache",
        risk: "low",
        description: "stats-cache.json and usage-data/. Does not affect transcripts.",
        paths: {
          win: [
            "%USERPROFILE%\\.claude\\stats-cache.json",
            "%USERPROFILE%\\.claude\\usage-data",
          ],
          mac: ["~/.claude/stats-cache.json", "~/.claude/usage-data"],
          linux: ["~/.claude/stats-cache.json", "~/.claude/usage-data"],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Windsurf (Codeium / formerly Devin)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "windsurf",
    name: "Windsurf",
    shortName: "WS",
    products: ["IDE", "Cascade"],
    blurb:
      "Codeium Windsurf (formerly Devin). Cascade history is under ~/.codeium/windsurf/cascade. On most Windows installs the standalone IDE AppData folder may not exist.",
    notes: [
      "cascade/ is the primary data folder — deleting clears local Cascade history and memory.",
      "Do not delete mcp_config.json — that is MCP configuration.",
      "AppData\\Windsurf may not exist if using Windsurf as a VS Code extension only.",
      "Also check Windsurf - Next variant folders if you use preview builds.",
    ],
    targets: [
      {
        id: "ws-cascade",
        label: "Cascade conversations",
        kind: "conversations",
        risk: "high",
        description: "Local Cascade chats and persistent memory. Typically 100–200 MB.",
        paths: {
          win: ["%USERPROFILE%\\.codeium\\windsurf\\cascade"],
          mac: ["~/.codeium/windsurf/cascade"],
          linux: ["~/.codeium/windsurf/cascade"],
        },
      },
      {
        id: "ws-cache",
        label: "IDE cache",
        kind: "cache",
        risk: "low",
        description: "Cache, CachedData, GPUCache, Code Cache, Dawn caches in %APPDATA%\\Windsurf.",
        paths: {
          win: [
            "%APPDATA%\\Windsurf\\Cache",
            "%APPDATA%\\Windsurf\\CachedData",
            "%APPDATA%\\Windsurf\\GPUCache",
            "%APPDATA%\\Windsurf\\Code Cache",
            "%APPDATA%\\Windsurf\\DawnWebGPUCache",
            "%APPDATA%\\Windsurf\\DawnGraphiteCache",
            "%APPDATA%\\Windsurf\\CachedExtensionVSIXs",
            "%APPDATA%\\Windsurf\\blob_storage",
            "%LOCALAPPDATA%\\Windsurf\\Cache",
            "%APPDATA%\\Windsurf - Next\\Cache",
            "%APPDATA%\\Windsurf - Next\\GPUCache",
          ],
          mac: [
            "~/Library/Application Support/Windsurf/Cache",
            "~/Library/Application Support/Windsurf/CachedData",
            "~/Library/Application Support/Windsurf/GPUCache",
            "~/Library/Application Support/Windsurf/Code Cache",
            "~/Library/Application Support/Windsurf/DawnWebGPUCache",
            "~/Library/Caches/Windsurf",
            "~/Library/Application Support/Windsurf - Next/Cache",
          ],
          linux: [
            "~/.config/Windsurf/Cache",
            "~/.config/Windsurf/CachedData",
            "~/.config/Windsurf/GPUCache",
            "~/.config/Windsurf/Code Cache",
            "~/.config/Windsurf/DawnWebGPUCache",
            "~/.config/Windsurf/CachedExtensionVSIXs",
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Kiro IDE (AWS / Amazon)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "kiro",
    name: "Kiro",
    shortName: "KR",
    products: ["IDE", "CLI"],
    blurb:
      "Kiro IDE stores chats in %APPDATA%\\Kiro\\User\\globalStorage\\kiro.kiroagent. CLI sessions live under ~/.kiro/sessions. NOTE: ~/.kiro/extensions/ is the extension install dir — never delete it.",
    notes: [
      "IDE chats: kiro.kiroagent hash folders and .chat files (≈25 MB).",
      "CLI sessions: ~/.kiro/sessions/<hash>/ directories.",
      "~/.kiro/extensions/ (≈355 MB) is the CLI extension install dir — NOT cache, do not delete.",
      "Do not delete ~/.kiro/settings/, steering/, or skills/.",
      "WebStorage in AppData (≈28 MB) and CachedExtensionVSIXs (≈33 MB) are safe to clear.",
    ],
    targets: [
      {
        id: "kiro-ide-chats",
        label: "IDE chat store",
        kind: "conversations",
        risk: "high",
        description: "kiro.kiroagent session files (.chat and hash folders). Deleting removes all IDE conversation history.",
        paths: {
          win: ["%APPDATA%\\Kiro\\User\\globalStorage\\kiro.kiroagent"],
          mac: [
            "~/Library/Application Support/Kiro/User/globalStorage/kiro.kiroagent",
          ],
          linux: [
            "~/.config/Kiro/User/globalStorage/kiro.kiroagent",
            "~/.kiro-server/data/User/globalStorage/kiro.kiroagent",
          ],
        },
      },
      {
        id: "kiro-cli-sessions",
        label: "CLI sessions",
        kind: "conversations",
        risk: "high",
        description: "JSONL and sess_* directories under ~/.kiro/sessions.",
        paths: {
          win: ["%USERPROFILE%\\.kiro\\sessions"],
          mac: ["~/.kiro/sessions"],
          linux: ["~/.kiro/sessions"],
        },
      },
      {
        id: "kiro-cache",
        label: "Electron cache & logs",
        kind: "cache",
        risk: "low",
        description: "Cache, CachedData, CachedExtensionVSIXs, GPUCache, WebStorage, logs in %APPDATA%\\Kiro.",
        paths: {
          win: [
            "%APPDATA%\\Kiro\\Cache",
            "%APPDATA%\\Kiro\\CachedData",
            "%APPDATA%\\Kiro\\CachedExtensionVSIXs",
            "%APPDATA%\\Kiro\\GPUCache",
            "%APPDATA%\\Kiro\\DawnWebGPUCache",
            "%APPDATA%\\Kiro\\DawnGraphiteCache",
            "%APPDATA%\\Kiro\\WebStorage",
            "%APPDATA%\\Kiro\\logs",
            "%APPDATA%\\Kiro\\blob_storage",
            "%APPDATA%\\Kiro\\Code Cache",
            "%LOCALAPPDATA%\\Kiro\\Cache",
          ],
          mac: [
            "~/Library/Application Support/Kiro/Cache",
            "~/Library/Application Support/Kiro/CachedData",
            "~/Library/Application Support/Kiro/GPUCache",
            "~/Library/Application Support/Kiro/logs",
            "~/Library/Caches/Kiro",
            "~/Library/Application Support/kiro-cli/knowledge_bases",
          ],
          linux: [
            "~/.config/Kiro/Cache",
            "~/.config/Kiro/CachedData",
            "~/.config/Kiro/GPUCache",
            "~/.config/Kiro/logs",
            "~/.local/share/kiro-cli/knowledge_bases",
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Trae IDE (ByteDance)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "trae",
    name: "Trae",
    shortName: "TR",
    products: ["IDE", "SOLO"],
    blurb:
      "ByteDance Trae IDE. Conversations are in a single SQLite database.db under ModularData\\ai-agent. CachedData (≈192 MB) and logs (≈78 MB) are the largest safe-to-delete items.",
    notes: [
      "Close Trae completely before deleting database.db — the WAL files must also be deleted together.",
      "This install uses 'Trae' (not 'Trae CN'). Both path variants are checked.",
      "ckg_server/ is the code knowledge graph cache — safe to delete, will rebuild on next open.",
      "Partitions/ is Chromium partition cache — safe to delete.",
      "Do not delete project /.trae/ directories — those are project-scoped memory.",
    ],
    targets: [
      {
        id: "trae-conversations",
        label: "AI database & snapshots",
        kind: "conversations",
        risk: "high",
        description: "database.db + database.db-shm + database.db-wal (SQLite WAL trio) and snapshot/ — delete all three DB files together.",
        paths: {
          win: [
            "%APPDATA%\\Trae\\ModularData\\ai-agent",
            "%APPDATA%\\Trae CN\\ModularData\\ai-agent",
          ],
          mac: [
            "~/Library/Application Support/Trae/ModularData/ai-agent",
            "~/Library/Application Support/Trae CN/ModularData/ai-agent",
          ],
          linux: [
            "~/.config/Trae/ModularData/ai-agent",
            "~/.config/Trae CN/ModularData/ai-agent",
          ],
        },
      },
      {
        id: "trae-cache",
        label: "Electron cache & logs",
        kind: "cache",
        risk: "low",
        description: "CachedData (≈192 MB), logs (≈78 MB), Partitions, ckg_server (code knowledge graph), GPUCache, Cache.",
        paths: {
          win: [
            "%APPDATA%\\Trae\\CachedData",
            "%APPDATA%\\Trae\\logs",
            "%APPDATA%\\Trae\\Partitions",
            "%APPDATA%\\Trae\\ModularData\\ckg_server",
            "%APPDATA%\\Trae\\GPUCache",
            "%APPDATA%\\Trae\\Cache",
            "%APPDATA%\\Trae\\DawnWebGPUCache",
            "%APPDATA%\\Trae\\DawnGraphiteCache",
            "%APPDATA%\\Trae\\blob_storage",
            "%APPDATA%\\Trae\\IndexedDB",
            "%APPDATA%\\Trae\\Local Storage",
            "%APPDATA%\\Trae CN\\CachedData",
            "%APPDATA%\\Trae CN\\logs",
            "%APPDATA%\\Trae CN\\GPUCache",
            "%APPDATA%\\Trae CN\\Cache",
            "%LOCALAPPDATA%\\Trae\\Cache",
          ],
          mac: [
            "~/Library/Application Support/Trae/CachedData",
            "~/Library/Application Support/Trae/ModularData/ckg_server",
            "~/Library/Application Support/Trae/GPUCache",
            "~/Library/Application Support/Trae CN/CachedData",
            "~/Library/Application Support/Trae CN/GPUCache",
            "~/Library/Caches/Trae",
            "~/Library/Caches/Trae CN",
          ],
          linux: [
            "~/.config/Trae/CachedData",
            "~/.config/Trae/GPUCache",
            "~/.config/Trae/Cache",
            "~/.config/Trae CN/CachedData",
            "~/.config/Trae CN/GPUCache",
            "~/.config/Trae CN/Cache",
          ],
        },
      },
    ],
  },
];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const NEVER_DELETE_GLOBS = [
  "**/settings.json",
  "**/mcp_config.json",
  "**/auth.json",
  "**/config.toml",
  "**/CLAUDE.md",
  "**/.kiro/steering/**",
  "**/.kiro/settings/**",
  "**/.kiro/skills/**",
  "**/.trae/**",
  "**/.sandbox-bin/**",
  "**/.sandbox/**",
  "**/.sandbox-secrets/**",
  "**/extensions/**",
];
