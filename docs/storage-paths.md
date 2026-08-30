# AI IDE 儲存路徑參考文件

> 本文件依據 2026-08 對 `%USERPROFILE%` 的實際掃描結果撰寫，並整合社群文件與官方資訊。
> 路徑以 Windows 為主；macOS / Linux 的對應路徑亦一併列出。
> 標記說明：🔴 = 刪除後**無法恢復對話**（高風險）、🟡 = 刪除**快取**（低風險）、⛔ = **不要刪除**

---

## 1. Antigravity IDE（Google）

實際根目錄：`%USERPROFILE%\.gemini\` 與 `%APPDATA%\Antigravity IDE\`

### 實際掃描到的資料夾樹

```
C:\Users\<user>\.gemini\
├── antigravity-ide\          377 MB  ← 主要資料夾
│   ├── brain\                 96 MB  🔴 agent 記憶、transcript.jsonl（純文字對話記錄）、artifacts
│   ├── conversations\        232 MB  🔴 .db SQLite 資料庫（與 brain/<UUID> 呈 1:1 一對一對應）
│   ├── implicit\              35 MB  🔴 .pb 二進位隱性對話狀態
│   ├── knowledge\              0 MB  ⛔ **Agent 核心知識庫與記憶庫（不要刪除）**
│   ├── annotations\            0 MB  🔴 對話標注（.pbtxt 記錄檢視時間）
│   ├── browser_recordings\    0 MB  🔴 錄影暫存
│   ├── context_state\          0 MB  🔴 上下文狀態暫存
│   ├── code_tracker\           1 MB  🟡 程式碼編輯歷史與影子修訂暫存 (active/<repo_hash>)
│   ├── daemon\                 0 MB  🟡 語言伺服器守護程序日誌 (ls_*.json, ls_*.log)
│   ├── crashes\                0 MB  🟡 崩潰日誌 (crash_*.log，多為 0 Bytes)
│   ├── bin\                   13 MB  ⛔ **核心執行引擎與工具 (agentapi.bat, webm_encoder.exe)**
│   ├── builtin\                0 MB  ⛔ **原廠內建技能庫 (skills/)**
│   └── plugins\                0 MB  ⛔ 擴充插件
├── antigravity-backup\        34 MB  🔴 歷史備份庫（可手動管理）
│   ├── brain\                  0 MB  🔴 備份 agent 記憶
│   ├── conversations\          0 MB  🔴 備份對話
│   ├── implicit\              33 MB  🔴 備份隱性狀態
│   └── ...
├── config\                     0 MB  ⛔ 全域設定 (config.json, mcp_config.json, projects, sidecars)
├── history\                    0 MB  ⛔ **Shadow Git 專案檢查點 (Checkpoint / Rewind，含 .git，不要刪除)**
├── google_accounts.json        0 MB  ⛔ **Google 登入帳號設定（不要刪除）**
├── oauth_creds.json            0 MB  ⛔ **OAuth 授權憑證（不要刪除）**
├── settings.json               0 MB  ⛔ **全域偏好設定（不要刪除）**
├── GEMINI.md                   0 MB  ⛔ **全域 Prompt 規則（不要刪除）**
└── tmp\                        5 MB  🟡 暫存目錄 (含嵌入式 rg.exe 與 chats 暫存)

C:\Users\<user>\AppData\Roaming\Antigravity IDE\    350 MB  ← Electron 快取（路徑中間帶空格）
├── Cache\                     10 MB  🟡 Chrome 網路快取
├── CachedData\                85 MB  🟡 VS Code / V8 引擎編譯快取
├── CachedExtensionVSIXs\       0 MB  🟡 擴充套件暫存
├── GPUCache\                   6 MB  🟡 GPU 快取
├── DawnWebGPUCache\            1 MB  🟡
├── DawnGraphiteCache\          1 MB  🟡
├── WebStorage\               153 MB  🟡 IndexedDB / Local Storage（最大）
├── logs\                      33 MB  🟡 執行日誌
├── Crashpad\                  33 MB  🟡 Crash 暫存
├── blob_storage\               0 MB  🟡 Blob 快取
├── Code Cache\                 0 MB  🟡 代碼快取
├── Session Storage\            0 MB  🟡
├── Local Storage\              0 MB  🟡
└── User\                      25 MB  ⛔ 使用者設定、擴充套件
```

**注意事項：**
- `brain/<UUID>/` 與 `conversations/<UUID>.db` 為 **100% 一對一關聯**：
  - `brain/<UUID>/.system_generated/logs/transcript.jsonl` 為 UTF-8 純文字 JSON Lines，內含使用者首則提問與 ISO 時間戳記，可進行輕量高效串流解析與中英視寬標題截斷。
  - `conversations/<UUID>.db` 為 SQLite 3 資料庫，儲存原始步驟 Protobuf 二進位 Blob。
  - 刪除 Session 時必須雙向連動清理（同時刪除 `brain/<UUID>/` 與 `conversations/<UUID>.db*`）。
- `~/.gemini/history/` 內為 Shadow Git 檢查點（Checkpoint Repo），刪除會破壞 Agent 回到檢查點與 Diff 功能，**必須絕對保護**。
- `~/.gemini/antigravity-ide/knowledge/` 是 Agent 長期記憶與知識庫，**非快取垃圾，禁止預設刪除**。
- Windows AppData 真實路徑為 `%APPDATA%\Antigravity IDE`（資料夾名稱帶有空格）。

---

## 2. OpenAI Codex（Desktop 應用程式與 CLI 後端）

實際根目錄：
- **Codex CLI / 共用後端**：`%USERPROFILE%\.codex\`
- **Codex Desktop (Windows MSIX App / Electron)**：`%LOCALAPPDATA%\Packages\OpenAI.Codex_*\` 與 `%LOCALAPPDATA%\OpenAI\Codex\`

### 2.1 Codex CLI / 共用後端資料夾樹 (`~/.codex\`)

```
C:\Users\<user>\.codex\                    950 MB 總計
├── sessions\                               15 MB  🔴 rollout-*.jsonl 完整對話（階層式 YYYY/MM/DD/*.jsonl）
├── session_index.jsonl                      0 MB  🔴 對話索引（含 id 與 thread_name 語意標題對照）
├── archived_sessions\                       0 MB  🔴 歸檔之對話 Sessions
├── sqlite\                                  9 MB  🔴/🟡 資料庫目錄
│   ├── memories_1.sqlite                    0 MB  🔴 Agent 長期核心記憶（嚴格保護，高風險）
│   ├── goals_1.sqlite                       0 MB  🔴 目標追蹤記錄（高風險）
│   ├── state_5.sqlite                       0 MB  🔴 執行狀態快照
│   ├── logs_2.sqlite (+wal/shm)             8 MB  🟡 執行階段紀錄資料庫（可清理）
│   └── codex-dev.db                         1 MB  ⛔ 開發核心設定（保護）
├── .tmp\                                  142 MB  🟡 下載快取、市場擴充模組暫存（可安全清理）
├── plugins\                               412 MB  🟡/⛔ 外掛模組
│   ├── cache\                              50 MB  🟡 外掛下載快取（可清理）
│   ├── .remote-plugin-install-staging\      0 MB  🟡 安裝暫存（可清理）
│   └── .plugin-appserver\                 362 MB  ⛔ 外掛伺服器執行檔主機（保護）
├── visualizations\                          0 MB  🟡 圖表與 HTML 視覺化輸出快取（可清理）
├── computer-use\                            0 MB  🟡 電腦操作快取（可清理）
├── cache\                                   0 MB  🟡 一般運作快取（可清理）
├── tmp\                                     0 MB  🟡 臨時檔案（可清理）
├── .sandbox-bin\                          340 MB  ⛔ **沙盒執行環境二進位檔（codex.exe 等，絕對不要刪除）**
├── .sandbox\                                0 MB  ⛔ 沙盒根目錄標記
├── .sandbox-secrets\                        0 MB  ⛔ 沙盒安全憑證
├── pets\                                    2 MB  ⛔ **Desktop 伴侶寵物精靈圖與設定（reze 等，不要刪除）**
├── rules\                                   0 MB  ⛔ 使用者自訂規則（default.rules）
├── skills\                                  0 MB  ⛔ 技能定義庫（.system/）
├── vendor_imports\                          6 MB  ⛔ 匯入之技能範本庫
├── auth.json                                0 MB  ⛔ **OpenAI 授權登入憑證（絕對不要刪除）**
└── config.toml                              0 MB  ⛔ 全域設定檔
```

### 2.2 Codex Desktop (Windows 應用程式快取樹)

```
C:\Users\<user>\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\   210 MB
└── LocalCache\
    ├── Roaming\Codex\                     205 MB  ← Electron UI 快取
    │   ├── web\                           176 MB  🟡 Web 靜態資源與組件快取
    │   ├── Cache\                          25 MB  🟡 Chromium 網路快取
    │   ├── GPUCache\                        2 MB  🟡 GPU 渲染快取
    │   ├── DawnGraphiteCache\               1 MB  🟡 Graphite 快取
    │   ├── DawnWebGPUCache\                 1 MB  🟡 WebGPU 快取
    │   ├── Session Storage\                 0 MB  🟡 會話暫存
    │   ├── Local Storage\                   0 MB  🟡 本地儲存
    │   ├── Network\                         0 MB  🟡 網路記錄
    │   └── Crashpad\                        0 MB  🟡 崩潰暫存
    └── Local\Codex\
        └── Logs\                            5 MB  🟡 應用程式日誌
└── AC\
    ├── INetCache\                           0 MB  🟡 暫存快取
    └── Temp\                                0 MB  🟡 暫存快取

C:\Users\<user>\AppData\Local\OpenAI\Codex\  814 MB
├── runtimes\                              319 MB  🟡 舊版/下載執行階段快取 (cua_node)
└── bin\                                   495 MB  ⛔ 應用程式相依二進位工具 (rg.exe, node.exe 等)
```

**架構與調優重點：**
- **Session 深層階層掃描與語意標題解析**：
  - `sessions/` 下採用 `sessions/YYYY/MM/DD/rollout-*.jsonl` 深層目錄，需支援階層式遞迴探勘。
  - `session_index.jsonl` 提供 `id` 與 `thread_name` 映射（如「修正 TUI 錯誤訊息遺失」、「新增三個 llama.cpp 模型」），優先作為語意化標題。
  - Rollout 檔案內首行包含 `turn_context`（`payload.cwd` / `workspace_roots` 提取真實專案名），使用者訊息過濾 `<environment_context>` 系統注入標籤後作為標題備選。
- **安全防護白名單**：
  - `.sandbox-bin/`、`auth.json`、`.sandbox/`、`.sandbox-secrets/`、`rules/`、`skills/`、`pets/`、`sqlite/memories_1.sqlite` 嚴格納入保護。
- **產品線獨立管理**：
  - **Codex Desktop**：聚焦清理 `%LOCALAPPDATA%\Packages\OpenAI.Codex_*\LocalCache\Roaming\Codex` 內之 `web/`、`Cache/`、`GPUCache/` 等 Electron 快取（約 200+ MB）。
  - **Codex CLI**：聚焦管理 `.tmp/`、`plugins/cache/`、`visualizations/` 與對話 Sessions。

---

## 3. Windsurf（Codeium / Devin 變體）

實際根目錄：
- **Cascade 對話與記憶庫**：`%USERPROFILE%\.codeium\windsurf\`
- **IDE 擴充套件與設定**：`%USERPROFILE%\.windsurf\`
- **IDE Electron 快取**：`%APPDATA%\Windsurf\`、`%LOCALAPPDATA%\Windsurf\`（及 `%APPDATA%\Windsurf - Next`、`%APPDATA%\devin`）

### 實際掃描到的完整資料夾樹

```
C:\Users\<user>\.codeium\windsurf\
├── cascade\                        🔴 Cascade 對話歷史（目錄式 Session / SQLite WAL trio / JSONL）
├── code_tracker\                   🟡 程式碼編輯追蹤快照
│   ├── history\                    🟡 歷史修訂快照（可安全清理釋放空間）
│   └── active\                     🔴 當前工作階段追蹤檔案
├── database\                       🔴 本地數據庫與索引 (UUID 目錄)
├── implicit\                       🔴 二進位隱性對話狀態 (*.pb)
├── memories\                       ⛔ **長期記憶庫 (*.pb) 與全域規則 (global_rules.md，絕對不要刪除)**
├── skills\                         ⛔ **Windsurf 自訂技能庫 (skills/，絕對不要刪除)**
├── global_workflows\               ⛔ **全域工作流程 (gitpush.md 等，絕對不要刪除)**
├── windsurf\workflows\             ⛔ **自訂工作流程 (review.md 等，絕對不要刪除)**
├── codemaps\                       🟡 程式碼地圖快取 (codemapindex.json)
├── context_state\                  🔴 上下文狀態暫存
├── brain\                          🔴 Agent 暫存大腦
├── mcp_config.json                 ⛔ **MCP 伺服器設定檔（絕對不要刪除）**
├── user_settings.pb                ⛔ **使用者設定檔（絕對不要刪除）**
└── installation_id                 ⛔ **安裝識別碼（絕對不要刪除）**

C:\Users\<user>\.windsurf\
├── extensions\                     ⛔ **VS Code / Windsurf 擴充套件（不要刪除）**
├── plans\                          ⛔ **計畫與規格草稿（不要刪除）**
└── argv.json                       ⛔ **執行引數組態（不要刪除）**

C:\Users\<user>\AppData\Roaming\Windsurf\ (及 %APPDATA%\devin\)
├── Cache\                          🟡 網路快取
├── CachedData\                     🟡 V8 位元碼編譯快取
├── GPUCache\                       🟡 GPU 渲染快取
├── Code Cache\                     🟡 代碼快取
├── DawnWebGPUCache\                🟡 WebGPU 快取
├── DawnGraphiteCache\              🟡 Graphite 著色器快取
├── CachedExtensionVSIXs\           🟡 擴充套件暫存
├── blob_storage\                   🟡 Blob 暫存
├── Crashpad\                       🟡 崩潰回報日誌
├── logs\                           🟡 執行日誌
├── WebStorage\                     🟡 IndexedDB / Local Storage 快取
└── User\workspaceStorage\          🟡 工作區工作階段快照
```

**注意事項：**
- `cascade/` 支援目錄式會話、JSON/JSONL 單檔以及 SQLite WAL 三合一檔案（`<id>.db`, `<id>.db-wal`, `<id>.db-shm`），Sweep 自動聚合檔案並提取標題。
- `~/.codeium/windsurf/code_tracker/history` 為歷史修訂快照，可作為 `ws-snapshots` 標靶清理，保留 `active/` 進行中追蹤。
- `memories/`、`skills/`、`global_workflows/`、`mcp_config.json` 等受 `NEVER_DELETE_GLOBS` 保護，快取清理與會話清理時均嚴格保留。
- `%APPDATA%\devin` 與 `%APPDATA%\Windsurf - Next` 亦已納入 IDE 快取清理範圍。

---

## 4. Kiro IDE

實際根目錄：`%APPDATA%\Kiro\` 與 `%USERPROFILE%\.kiro\`

### 實際掃描到的資料夾樹

```
C:\Users\<user>\AppData\Roaming\Kiro\   145 MB  ← Electron 快取
├── Cache\                               8 MB  🟡
├── CachedData\                         13 MB  🟡 VS Code 引擎快取
├── CachedExtensionVSIXs\               33 MB  🟡 擴充套件 VSIX
├── GPUCache\                            6 MB  🟡
├── DawnWebGPUCache\                     1 MB  🟡
├── DawnGraphiteCache\                   1 MB  🟡
├── WebStorage\                         28 MB  🟡 IndexedDB 快取
├── logs\                               28 MB  🟡
├── User\                               27 MB  ← 使用者資料
│   └── globalStorage\
│       └── kiro.kiroagent\            25 MB  🔴 IDE 對話 (.chat 與 session hash)
│       └── state.vscdb                 0 MB  ⛔ UI 索引（非對話本體）
├── blob_storage\                        0 MB  🟡
├── Code Cache\                          0 MB  🟡
└── Session Storage\                     0 MB  🟡

C:\Users\<user>\.kiro\                  355 MB  ← CLI / 本地設定
├── extensions\                        355 MB  ⛔ **Kiro 擴充套件（不要刪）**
├── sessions\                            0 MB  🔴 CLI 對話
│   ├── 085ccde82fe1b916\              (session hash 目錄)
│   └── 3539fec2a1ef486a\
├── logs\                                0 MB  🟡
├── settings\                            0 MB  ⛔ 本地設定
├── steering\                            0 MB  ⛔ Steering 指令
├── skills\                              0 MB  ⛔ 技能定義
├── powers\                              0 MB  ⛔
└── workspace-roots\                     0 MB  ⛔
```

**注意事項：**
- `~/.kiro/extensions/`（355 MB）是 CLI 的擴充套件安裝目錄，**不是快取，不要清除**
- `kiro.kiroagent/`（25 MB）是 IDE 的對話核心，刪除後無法 resume session
- `state.vscdb` 是 UI 狀態索引，不是對話本體

---

## 5. Trae IDE（ByteDance）

實際根目錄：`%APPDATA%\Trae\` 與 `%USERPROFILE%\.trae\`

### 實際掃描到的資料夾樹

```
C:\Users\<user>\.trae\
├── memory\                             🔴 SOLO agent 記憶與專案 session
│   ├── projects\                       🔴 各專案 session_memory_*.md、project_memory.md
│   └── user_profile.md                 🔴 使用者偏好記憶
├── worktrees\                          🔴 SOLO agent 建立的 git worktrees
├── toolhost\                           🟡 指令執行快照 (native-runcommand-snapshots)
├── builtin\                            ⛔ 內建功能
├── builtin_skills\                     ⛔ 內建技能
├── extensions\                         ⛔ 擴充套件
└── rules\                              ⛔ 專案/全域規則

C:\Users\<user>\AppData\Roaming\Trae\
├── Code Cache\                         🟡 V8/Chromium 位元碼快取
├── Crashpad\                           🟡 崩潰日誌
├── monitor\                            🟡 監控與效能追蹤日誌 (parfait)
├── CachedConfigurations\               🟡 組態快取
├── CachedProfilesData\                 🟡 設定檔快取
├── CachedExtensionVSIXs\               🟡 擴充套件暫存
├── Network\                            🟡 網路暫存
├── Service Worker\                     🟡 Service Worker 快取
├── Session Storage\                    🟡 Session Storage
├── WebStorage\                         🟡 IndexedDB / Local Storage 快取
├── aha\ / ahanet\                      🟡 ByteDance 網路與 TinyStorage 快取
├── ModularData\
│   ├── ai-agent\                       🔴 早期或部分版本對話 SQLite (database.db)
│   └── ckg_server\                    🟡 程式碼知識圖快取
├── User\
│   ├── globalStorage\
│   │   ├── .ckg\                       🟡 程式碼知識圖快取 (SQLite DB)
│   │   └── .mcp_gallery_cache\        🟡 MCP 商店快取
│   └── workspaceStorage\               🟡 工作區快照與圖片暫存
└── ...
```

**注意事項：**
- 本機路徑支援 `Trae`、`Trae CN` 以及使用者目錄 `~/.trae`
- 新版 Trae SOLO Agent 對話與記憶主要儲存於 `~/.trae/memory`
- `Code Cache`、`monitor`、`WebStorage` 與 `.ckg` 等為安全可清理快取
- `~/.trae/skills/`、`builtin/`、`rules/`、`permission/` 等設定與規則為受保護項目，不會被刪除

---

## 6. Anthropic Claude (Claude Code CLI 與 Claude Desktop)

實際根目錄：
- **Claude Code CLI**：`%USERPROFILE%\.claude\` 與 `%USERPROFILE%\.claude.json`
- **Claude Desktop (應用程式)**：`%LOCALAPPDATA%\Claude-Data\`、`%LOCALAPPDATA%\Claude\` 與 `%APPDATA%\Claude\`

### 6.1 Claude Code CLI 資料夾樹 (`~/.claude\`)

```
%USERPROFILE%\.claude\             (CLAUDE_CONFIG_DIR 可覆寫)
├── projects\                      🔴 JSONL 對話，依工作目錄分類 (projects/<encoded-cwd>/<session-id>.jsonl)
├── sessions\                      🔴 CLI 階段金鑰與會話狀態 (*.key)
├── backups\                       🔴 .claude.json 自動備份存檔 (.claude.json.backup.*)
├── file-history\                  🔴 檔案編輯前完整快照 (Rewind 復原用，佔用大容量，可安全獨立清理)
├── paste-cache\                   🔴 大型剪貼簿暫存
├── uploads\                       🔴 附件上傳暫存
├── history.jsonl                  🔴 命令列全域 Prompt 輸入歷史
├── stats-cache.json               🟡 統計快取
├── usage-data\                    🟡 使用量資料快取
├── cache\                         🟡 本地快取 (如 changelog.md 等)
├── downloads\                     🟡 下載暫存
├── memory\                        ⛔ **專案長期記憶庫 (MEMORY.md，禁止刪除)**
├── skills\                        ⛔ **自訂技能庫 (skills/，禁止刪除)**
├── plugins\                       ⛔ **外掛擴充套件 (plugins/，禁止刪除)**
└── settings.json                  ⛔ **全域設定檔 (settings.json，禁止刪除)**
```

### 6.2 Claude Desktop (Windows 應用程式快取樹)

```
C:\Users\<user>\AppData\Local\Claude\          (主程式與日誌)
├── app-0.9.1\Claude.exe           ⛔ 應用程式本體
└── logs\                          🟡 應用程式日誌 (main.log, claude.ai-web.log, mcp.log)

C:\Users\<user>\AppData\Local\Claude-Data\     (Chromium / Electron 數據核心快取)
├── Cache\                         🟡 網路快取 (Cache_Data: data_0, data_1, data_2, index)
├── Code Cache\                    🟡 V8 位元碼編譯快取 (js, wasm)
├── DawnCache\                     🟡 WebGPU / Dawn 著色器快取
├── GPUCache\                      🟡 GPU 渲染快取
├── IndexedDB\                     🟡 本地資料庫暫存
├── Local Storage\                 🟡 本地儲存暫存
├── Session Storage\               🟡 會話暫存
├── WebStorage\                    🟡 WebStorage 暫存
├── blob_storage\                  🟡 Blob 快取
└── logs\                          🟡 執行日誌 (main.log)

C:\Users\<user>\AppData\Roaming\Claude\        (Roaming 設定與快取)
├── Cache\                         🟡 Roaming 網路快取
├── Code Cache\                    🟡 Roaming 代碼快取
├── Crashpad\                      🟡 崩潰傾印暫存
├── claude_desktop_config.json     ⛔ **MCP 伺服器核心設定檔 (絕對不要刪除)**
└── logs\                          🟡 日誌
```

**注意事項與調優重點：**
- **專案 Slug 解碼與 Session 標題解析**：
  - 支援 POSIX（`-Users-name-my-app`）與 Windows（`C__Users_name_my-app`）雙向解碼還原乾淨專案名稱。
  - 對 `projects/<slug>/*.jsonl` 前 40 行高效解析，提取 `type === 'user'` 之 `message.content` 或 `text` 作為標題，並套用 East Asian Width 適配。
- **快取暫存分離與空間釋放**：
  - `file-history/` 儲存大量編輯前快照，佔用極大空間，可安全歸類清理。
  - `%LOCALAPPDATA%\Claude-Data` 與 `%APPDATA%\Claude` 內之 Electron 快取可安全清理。
- **白名單絕對保護**：
  - `claude_desktop_config.json`（MCP 配置）、`~/.claude/memory/`（長期記憶 `MEMORY.md`）、`settings.json`、`CLAUDE.md` 永不被掃描為刪除目標。


---

## 清理優先順序建議

| 優先 | 工具 | 目標 | 類型 | 大小（本機） |
|------|------|------|------|------------|
| 1 | Antigravity | `WebStorage/` in AppData | 快取 | 153 MB |
| 2 | Antigravity | `CachedData/` in AppData | 快取 | 85 MB |
| 3 | Antigravity | `conversations/` + `brain/` + `implicit/` | 對話 | 362 MB |
| 4 | Trae | `CachedData/` | 快取 | 192 MB |
| 5 | Trae | `logs/` | 快取 | 78 MB |
| 6 | Trae | `database.db` + `snapshot/` | 對話 | 42 MB |
| 7 | Kiro | `CachedExtensionVSIXs/` + `logs/` + `WebStorage/` | 快取 | 89 MB |
| 8 | Windsurf | `cascade/` | 對話 | 156 MB |
| 9 | Codex | `sessions/` + `memories/` | 對話 | ~10 MB |
| ⛔ | Codex | `.sandbox-bin/` | **禁止** | 340 MB |
| ⛔ | Kiro | `~/.kiro/extensions/` | **禁止** | 355 MB |

---

## 跨平台路徑對照表

| 工具 | Windows | macOS | Linux |
|------|---------|-------|-------|
| Antigravity IDE 對話 | `%USERPROFILE%\.gemini\antigravity-ide\conversations` | `~/.gemini/antigravity-ide/conversations` | 同 macOS |
| Antigravity IDE 快取 | `%APPDATA%\Antigravity IDE\` | `~/Library/Application Support/Antigravity IDE/` | `~/.config/Antigravity IDE/` |
| Antigravity 瀏覽器快取 | `%USERPROFILE%\.gemini\antigravity-browser-profile\` | `~/.gemini/antigravity-browser-profile/` | 同 macOS |
| Antigravity 安裝包快取 | `%LOCALAPPDATA%\antigravity-updater\` | `~/Library/Caches/antigravity-updater/` | `~/.cache/antigravity-updater/` |
| Codex sessions | `%USERPROFILE%\.codex\sessions` | `~/.codex/sessions` | 同 macOS |
| Windsurf cascade | `%USERPROFILE%\.codeium\windsurf\cascade` | `~/.codeium/windsurf/cascade` | 同 macOS |
| Kiro IDE 對話 | `%APPDATA%\Kiro\User\globalStorage\kiro.kiroagent` | `~/Library/Application Support/Kiro/User/globalStorage/kiro.kiroagent` | `~/.config/Kiro/User/globalStorage/kiro.kiroagent` |
| Kiro CLI sessions | `%USERPROFILE%\.kiro\sessions` | `~/.kiro/sessions` | 同 macOS |
| Trae 對話 | `%APPDATA%\Trae\ModularData\ai-agent\database.db` | `~/Library/Application Support/Trae/ModularData/ai-agent/database.db` | `~/.config/Trae/ModularData/ai-agent/database.db` |
| Claude sessions | `%USERPROFILE%\.claude\projects` | `~/.claude/projects` | 同 macOS |
