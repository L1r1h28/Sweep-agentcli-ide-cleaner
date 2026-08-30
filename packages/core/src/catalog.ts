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
  // 1. Antigravity IDE (Google)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "antigravity",
    name: "Antigravity IDE",
    shortName: "AG-IDE",
    products: ["IDE"],
    blurb:
      "Google agent IDE. Conversations live under ~/.gemini/antigravity-ide; Electron caches in %APPDATA%\\Antigravity IDE.",
    notes: [
      "brain/ + conversations/ + implicit/ hold the bulk of chat data (≈360 MB on a typical install).",
      "WebStorage in AppData is the largest safe-to-delete item (IndexedDB, ≈150 MB).",
      "history/ contains Shadow Git checkpoints — protected by safety rules.",
    ],
    targets: [
      {
        id: "ag-ide-conversations",
        label: "Conversations & Agent Brain",
        kind: "conversations",
        risk: "high",
        description: "Unified chat history (.db) and agent memory/transcripts (brain/) for Antigravity IDE.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\brain",
          ],
          mac: [
            "~/.gemini/antigravity-ide/conversations",
            "~/.gemini/antigravity-ide/brain",
          ],
          linux: [
            "~/.gemini/antigravity-ide/conversations",
            "~/.gemini/antigravity-ide/brain",
          ],
        },
      },
      {
        id: "ag-ide-implicit",
        label: "IDE Implicit / context state",
        kind: "conversations",
        risk: "high",
        description: "implicit/, context_state/, annotations/ in antigravity-ide.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\implicit",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\context_state",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\annotations",
          ],
          mac: [
            "~/.gemini/antigravity-ide/implicit",
            "~/.gemini/antigravity-ide/context_state",
            "~/.gemini/antigravity-ide/annotations",
          ],
          linux: [
            "~/.gemini/antigravity-ide/implicit",
            "~/.gemini/antigravity-ide/context_state",
            "~/.gemini/antigravity-ide/annotations",
          ],
        },
      },
      {
        id: "ag-ide-recordings",
        label: "Browser recordings",
        kind: "conversations",
        risk: "high",
        description: "browser_recordings/ — screen capture files used during IDE sessions.",
        paths: {
          win: ["%USERPROFILE%\\.gemini\\antigravity-ide\\browser_recordings"],
          mac: ["~/.gemini/antigravity-ide/browser_recordings"],
          linux: ["~/.gemini/antigravity-ide/browser_recordings"],
        },
      },
      {
        id: "ag-ide-cache",
        label: "Electron / IDE Web Data Cache",
        kind: "cache",
        risk: "low",
        description: "WebStorage (IndexedDB), CachedData, CachedProfilesData, Language Pack (clp), logs, Service Worker, and Network cache.",
        paths: {
          win: [
            "%APPDATA%\\Antigravity IDE\\WebStorage",
            "%APPDATA%\\Antigravity IDE\\CachedData",
            "%APPDATA%\\Antigravity IDE\\CachedProfilesData",
            "%APPDATA%\\Antigravity IDE\\clp",
            "%APPDATA%\\Antigravity IDE\\Cache",
            "%APPDATA%\\Antigravity IDE\\logs",
            "%APPDATA%\\Antigravity IDE\\Service Worker",
            "%APPDATA%\\Antigravity IDE\\Network",
            "%APPDATA%\\Antigravity IDE\\Shared Dictionary",
            "%APPDATA%\\Antigravity IDE\\blob_storage",
            "%APPDATA%\\Antigravity IDE\\Session Storage",
            "%APPDATA%\\Antigravity IDE\\Local Storage",
            "%APPDATA%\\Antigravity IDE\\CachedConfigurations",
          ],
          mac: [
            "~/Library/Application Support/Antigravity IDE/WebStorage",
            "~/Library/Application Support/Antigravity IDE/CachedData",
            "~/Library/Application Support/Antigravity IDE/CachedProfilesData",
            "~/Library/Application Support/Antigravity IDE/clp",
            "~/Library/Application Support/Antigravity IDE/Cache",
            "~/Library/Application Support/Antigravity IDE/logs",
            "~/Library/Application Support/Antigravity IDE/Service Worker",
            "~/Library/Application Support/Antigravity IDE/Network",
            "~/Library/Application Support/Antigravity IDE/Shared Dictionary",
            "~/Library/Application Support/Antigravity IDE/blob_storage",
            "~/Library/Caches/Antigravity IDE",
          ],
          linux: [
            "~/.config/Antigravity IDE/WebStorage",
            "~/.config/Antigravity IDE/CachedData",
            "~/.config/Antigravity IDE/CachedProfilesData",
            "~/.config/Antigravity IDE/clp",
            "~/.config/Antigravity IDE/Cache",
            "~/.config/Antigravity IDE/logs",
            "~/.config/Antigravity IDE/Service Worker",
            "~/.config/Antigravity IDE/Network",
            "~/.config/Antigravity IDE/Shared Dictionary",
            "~/.config/Antigravity IDE/blob_storage",
            "~/.cache/Antigravity IDE",
          ],
        },
      },
      {
        id: "ag-ide-browser-profile",
        label: "Browser Profile & GPU Cache",
        kind: "cache",
        risk: "low",
        description: "Chromium Browser Sandbox caches (Code Cache, GPUCache, ShaderCache, DawnWebGPU, Crashpad) in ~/.gemini/antigravity-browser-profile.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\Cache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\Code Cache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\GPUCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\DawnWebGPUCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\DawnGraphiteCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\Service Worker",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Default\\blob_storage",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\GraphiteDawnCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\GrShaderCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\ShaderCache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\Crashpad",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\component_crx_cache",
            "%USERPROFILE%\\.gemini\\antigravity-browser-profile\\extensions_crx_cache",
          ],
          mac: [
            "~/.gemini/antigravity-browser-profile/Default/Cache",
            "~/.gemini/antigravity-browser-profile/Default/Code Cache",
            "~/.gemini/antigravity-browser-profile/Default/GPUCache",
            "~/.gemini/antigravity-browser-profile/Default/DawnWebGPUCache",
            "~/.gemini/antigravity-browser-profile/Default/DawnGraphiteCache",
            "~/.gemini/antigravity-browser-profile/Default/Service Worker",
            "~/.gemini/antigravity-browser-profile/Default/blob_storage",
            "~/.gemini/antigravity-browser-profile/GraphiteDawnCache",
            "~/.gemini/antigravity-browser-profile/GrShaderCache",
            "~/.gemini/antigravity-browser-profile/ShaderCache",
            "~/.gemini/antigravity-browser-profile/Crashpad",
            "~/.gemini/antigravity-browser-profile/component_crx_cache",
            "~/.gemini/antigravity-browser-profile/extensions_crx_cache",
          ],
          linux: [
            "~/.gemini/antigravity-browser-profile/Default/Cache",
            "~/.gemini/antigravity-browser-profile/Default/Code Cache",
            "~/.gemini/antigravity-browser-profile/Default/GPUCache",
            "~/.gemini/antigravity-browser-profile/Default/DawnWebGPUCache",
            "~/.gemini/antigravity-browser-profile/Default/DawnGraphiteCache",
            "~/.gemini/antigravity-browser-profile/Default/Service Worker",
            "~/.gemini/antigravity-browser-profile/Default/blob_storage",
            "~/.gemini/antigravity-browser-profile/GraphiteDawnCache",
            "~/.gemini/antigravity-browser-profile/GrShaderCache",
            "~/.gemini/antigravity-browser-profile/ShaderCache",
            "~/.gemini/antigravity-browser-profile/Crashpad",
            "~/.gemini/antigravity-browser-profile/component_crx_cache",
            "~/.gemini/antigravity-browser-profile/extensions_crx_cache",
          ],
        },
      },
      {
        id: "ag-ide-daemon-logs",
        label: "Daemon, Crashes & Scratch",
        kind: "cache",
        risk: "low",
        description: "Language Server daemon logs, crash dump markers, and temporary scratch files in ~/.gemini/antigravity-ide and ~/.gemini/tmp.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-ide\\daemon",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\crashes",
            "%USERPROFILE%\\.gemini\\antigravity-ide\\scratch",
            "%USERPROFILE%\\.gemini\\tmp",
          ],
          mac: [
            "~/.gemini/antigravity-ide/daemon",
            "~/.gemini/antigravity-ide/crashes",
            "~/.gemini/antigravity-ide/scratch",
            "~/.gemini/tmp",
          ],
          linux: [
            "~/.gemini/antigravity-ide/daemon",
            "~/.gemini/antigravity-ide/crashes",
            "~/.gemini/antigravity-ide/scratch",
            "~/.gemini/tmp",
          ],
        },
      },
      {
        id: "ag-ide-updater",
        label: "IDE Updater Installer Cache",
        kind: "cache",
        risk: "low",
        description: "Downloaded IDE update installers (installer.exe) in AppData\\Local\\antigravity-updater.",
        paths: {
          win: ["%LOCALAPPDATA%\\antigravity-updater"],
          mac: ["~/Library/Caches/antigravity-updater"],
          linux: ["~/.cache/antigravity-updater"],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Antigravity 2.0 (Desktop App)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "antigravity-desktop",
    name: "Antigravity 2.0 (Desktop)",
    shortName: "AG-App",
    products: ["Desktop 2.0"],
    blurb:
      "Google Antigravity 2.0 Desktop standalone app. Storage located in ~/.gemini/antigravity and %APPDATA%\\Antigravity.",
    notes: [
      "Separated from Antigravity IDE storage to manage Desktop 2.0 App independently.",
    ],
    targets: [
      {
        id: "ag-app-conversations",
        label: "Desktop Conversations & Brain",
        kind: "conversations",
        risk: "high",
        description: "Conversations and brain directory in ~/.gemini/antigravity.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity\\brain",
          ],
          mac: [
            "~/.gemini/antigravity/conversations",
            "~/.gemini/antigravity/brain",
          ],
          linux: [
            "~/.gemini/antigravity/conversations",
            "~/.gemini/antigravity/brain",
          ],
        },
      },
      {
        id: "ag-app-implicit",
        label: "Desktop Implicit State",
        kind: "conversations",
        risk: "high",
        description: "implicit/, context_state/, annotations/ in antigravity.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity\\implicit",
            "%USERPROFILE%\\.gemini\\antigravity\\context_state",
            "%USERPROFILE%\\.gemini\\antigravity\\annotations",
          ],
          mac: [
            "~/.gemini/antigravity\\implicit",
            "~/.gemini/antigravity\\context_state",
            "~/.gemini/antigravity\\annotations",
          ],
          linux: [
            "~/.gemini/antigravity/implicit",
            "~/.gemini/antigravity/context_state",
            "~/.gemini/antigravity/annotations",
          ],
        },
      },
      {
        id: "ag-app-cache",
        label: "Desktop App Cache",
        kind: "cache",
        risk: "low",
        description: "Electron cache for Desktop 2.0 in %APPDATA%\\Antigravity.",
        paths: {
          win: [
            "%APPDATA%\\Antigravity\\WebStorage",
            "%APPDATA%\\Antigravity\\Cache",
            "%APPDATA%\\Antigravity\\GPUCache",
            "%LOCALAPPDATA%\\Antigravity\\Cache",
          ],
          mac: [
            "~/Library/Application Support/Antigravity/Cache",
            "~/Library/Application Support/Antigravity/GPUCache",
            "~/Library/Caches/Antigravity",
          ],
          linux: [
            "~/.config/Antigravity/Cache",
            "~/.config/Antigravity/GPUCache",
            "~/.cache/Antigravity",
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Antigravity CLI (agy)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "antigravity-cli",
    name: "Antigravity CLI (agy)",
    shortName: "AG-CLI",
    products: ["CLI (agy)"],
    blurb:
      "Google Antigravity command line tool (agy). Storage located in ~/.gemini/antigravity-cli.",
    notes: [
      "Conversations and temporary execution files generated via agy terminal commands.",
    ],
    targets: [
      {
        id: "ag-cli-conversations",
        label: "CLI Conversations & Brain",
        kind: "conversations",
        risk: "high",
        description: "Conversations and brain directory in ~/.gemini/antigravity-cli.",
        paths: {
          win: [
            "%USERPROFILE%\\.gemini\\antigravity-cli\\conversations",
            "%USERPROFILE%\\.gemini\\antigravity-cli\\brain",
          ],
          mac: [
            "~/.gemini/antigravity-cli/conversations",
            "~/.gemini/antigravity-cli/brain",
          ],
          linux: [
            "~/.gemini/antigravity-cli/conversations",
            "~/.gemini/antigravity-cli/brain",
          ],
        },
      },
      {
        id: "ag-cli-tmp",
        label: "CLI Temporary Cache",
        kind: "cache",
        risk: "low",
        description: "Temporary execution artifacts in ~/.gemini/tmp.",
        paths: {
          win: ["%USERPROFILE%\\.gemini\\tmp"],
          mac: ["~/.gemini/tmp"],
          linux: ["~/.gemini/tmp"],
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
      "ByteDance Trae IDE & SOLO agent. Conversations and sessions are stored in ~/.trae/memory and ModularData\\ai-agent database.db. WebStorage, monitor, .ckg and Code Cache are the largest safe-to-delete items.",
    notes: [
      "Close Trae completely before deleting database.db — the WAL files must also be deleted together.",
      "This install checks both 'Trae' and 'Trae CN' path variants as well as ~/.trae.",
      "ckg / ckg_server is the code knowledge graph cache — safe to delete, will rebuild on next open.",
      "Partitions/ is Chromium partition cache — safe to delete.",
      "Do not delete project /.trae/ settings or rules — those are project-scoped configurations.",
    ],
    targets: [
      {
        id: "trae-conversations",
        label: "AI database & agent memory",
        kind: "conversations",
        risk: "high",
        description: "database.db (SQLite WAL trio), snapshot/, ~/.trae/memory sessions, and worktrees/ — deleting removes conversation & SOLO agent history.",
        paths: {
          win: [
            "%APPDATA%\\Trae\\ModularData\\ai-agent",
            "%APPDATA%\\Trae CN\\ModularData\\ai-agent",
            "%USERPROFILE%\\.trae\\memory",
            "%USERPROFILE%\\.trae\\worktrees",
          ],
          mac: [
            "~/Library/Application Support/Trae/ModularData/ai-agent",
            "~/Library/Application Support/Trae CN/ModularData/ai-agent",
            "~/.trae/memory",
            "~/.trae/worktrees",
          ],
          linux: [
            "~/.config/Trae/ModularData/ai-agent",
            "~/.config/Trae CN/ModularData/ai-agent",
            "~/.trae/memory",
            "~/.trae/worktrees",
          ],
        },
      },
      {
        id: "trae-cache",
        label: "Electron cache & logs",
        kind: "cache",
        risk: "low",
        description: "WebStorage, Code Cache, Crashpad, monitor, .ckg code knowledge graph, CachedData, logs, Partitions, GPUCache, workspaceStorage.",
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
            "%APPDATA%\\Trae\\Code Cache",
            "%APPDATA%\\Trae\\Crashpad",
            "%APPDATA%\\Trae\\monitor",
            "%APPDATA%\\Trae\\CachedConfigurations",
            "%APPDATA%\\Trae\\CachedProfilesData",
            "%APPDATA%\\Trae\\CachedExtensionVSIXs",
            "%APPDATA%\\Trae\\Network",
            "%APPDATA%\\Trae\\Service Worker",
            "%APPDATA%\\Trae\\Session Storage",
            "%APPDATA%\\Trae\\WebStorage",
            "%APPDATA%\\Trae\\aha",
            "%APPDATA%\\Trae\\ahanet",
            "%APPDATA%\\Trae\\User\\globalStorage\\.ckg",
            "%APPDATA%\\Trae\\User\\globalStorage\\.mcp_gallery_cache",
            "%APPDATA%\\Trae\\User\\workspaceStorage",
            "%USERPROFILE%\\.trae\\toolhost",
            "%APPDATA%\\Trae CN\\CachedData",
            "%APPDATA%\\Trae CN\\logs",
            "%APPDATA%\\Trae CN\\GPUCache",
            "%APPDATA%\\Trae CN\\Cache",
            "%APPDATA%\\Trae CN\\Code Cache",
            "%APPDATA%\\Trae CN\\Crashpad",
            "%APPDATA%\\Trae CN\\monitor",
            "%APPDATA%\\Trae CN\\WebStorage",
            "%APPDATA%\\Trae CN\\User\\globalStorage\\.ckg",
            "%APPDATA%\\Trae CN\\User\\workspaceStorage",
            "%LOCALAPPDATA%\\Trae\\Cache",
            "%LOCALAPPDATA%\\Trae CN\\Cache",
          ],
          mac: [
            "~/Library/Application Support/Trae/CachedData",
            "~/Library/Application Support/Trae/ModularData/ckg_server",
            "~/Library/Application Support/Trae/GPUCache",
            "~/Library/Application Support/Trae/Code Cache",
            "~/Library/Application Support/Trae/Crashpad",
            "~/Library/Application Support/Trae/monitor",
            "~/Library/Application Support/Trae/CachedConfigurations",
            "~/Library/Application Support/Trae/CachedProfilesData",
            "~/Library/Application Support/Trae/CachedExtensionVSIXs",
            "~/Library/Application Support/Trae/blob_storage",
            "~/Library/Application Support/Trae/WebStorage",
            "~/Library/Application Support/Trae/aha",
            "~/Library/Application Support/Trae/ahanet",
            "~/Library/Application Support/Trae/User/globalStorage/.ckg",
            "~/Library/Application Support/Trae/User/globalStorage/.mcp_gallery_cache",
            "~/Library/Application Support/Trae/User/workspaceStorage",
            "~/.trae/toolhost",
            "~/Library/Caches/Trae",
            "~/Library/Application Support/Trae CN/CachedData",
            "~/Library/Application Support/Trae CN/GPUCache",
            "~/Library/Application Support/Trae CN/Code Cache",
            "~/Library/Application Support/Trae CN/Crashpad",
            "~/Library/Application Support/Trae CN/monitor",
            "~/Library/Application Support/Trae CN/WebStorage",
            "~/Library/Application Support/Trae CN/User/globalStorage/.ckg",
            "~/Library/Application Support/Trae CN/User/workspaceStorage",
            "~/Library/Caches/Trae CN",
          ],
          linux: [
            "~/.config/Trae/CachedData",
            "~/.config/Trae/GPUCache",
            "~/.config/Trae/Cache",
            "~/.config/Trae/Code Cache",
            "~/.config/Trae/Crashpad",
            "~/.config/Trae/monitor",
            "~/.config/Trae/CachedConfigurations",
            "~/.config/Trae/CachedProfilesData",
            "~/.config/Trae/CachedExtensionVSIXs",
            "~/.config/Trae/blob_storage",
            "~/.config/Trae/WebStorage",
            "~/.config/Trae/aha",
            "~/.config/Trae/ahanet",
            "~/.config/Trae/User/globalStorage/.ckg",
            "~/.config/Trae/User/globalStorage/.mcp_gallery_cache",
            "~/.config/Trae/User/workspaceStorage",
            "~/.trae/toolhost",
            "~/.cache/Trae",
            "~/.config/Trae CN/CachedData",
            "~/.config/Trae CN/GPUCache",
            "~/.config/Trae CN/Cache",
            "~/.config/Trae CN/Code Cache",
            "~/.config/Trae CN/Crashpad",
            "~/.config/Trae CN/monitor",
            "~/.config/Trae CN/WebStorage",
            "~/.config/Trae CN/User/globalStorage/.ckg",
            "~/.config/Trae CN/User/workspaceStorage",
            "~/.cache/Trae CN",
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
  "**/GEMINI.md",
  "**/google_accounts.json",
  "**/oauth_creds.json",
  "**/.gemini/history/**",
  "**/.gemini/**/knowledge/**",
  "**/.gemini/**/builtin/**",
  "**/.gemini/**/bin/**",
  "**/.kiro/steering/**",
  "**/.kiro/settings/**",
  "**/.kiro/skills/**",
  "**/.trae/skills/**",
  "**/.trae/builtin_skills/**",
  "**/.trae/builtin/**",
  "**/.trae/rules/**",
  "**/.trae/settings/**",
  "**/.trae/permission/**",
  "**/.trae/trae-jwt-token",
  "**/.trae/argv.json",
  "**/.trae/skill-config.json",
  "**/.sandbox-bin/**",
  "**/.sandbox/**",
  "**/.sandbox-secrets/**",
  "**/extensions/**",
];
