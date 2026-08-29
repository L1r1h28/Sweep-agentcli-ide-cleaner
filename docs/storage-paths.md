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
│   ├── brain\                 96 MB  🔴 agent 記憶、transcript、artifacts
│   ├── conversations\        232 MB  🔴 .pb / .db 對話檔（最大）
│   ├── implicit\              35 MB  🔴 隱性對話狀態
│   ├── annotations\            0 MB  🔴 對話標注
│   ├── browser_recordings\    0 MB  🔴 錄影
│   ├── context_state\          0 MB  🔴 上下文狀態
│   ├── code_tracker\           1 MB  🟡 程式碼追蹤暫存
│   ├── bin\                   13 MB  ⛔ 執行檔
│   ├── builtin\                0 MB  ⛔ 內建設定
│   ├── daemon\                 0 MB  ⛔ 背景服務
│   ├── crashes\                0 MB  🟡 crash 報告
│   └── ...（其他系統目錄）
├── antigravity-backup\        34 MB
│   ├── brain\                  0 MB  🔴 備份 agent 記憶
│   ├── conversations\          0 MB  🔴 備份對話
│   ├── implicit\              33 MB  🔴 備份隱性狀態
│   └── ...
├── config\                     0 MB  ⛔ 設定
├── history\                    0 MB  ⛔ 指令歷史
└── tmp\                        5 MB  🟡 暫存

C:\Users\<user>\AppData\Roaming\Antigravity IDE\    350 MB  ← Electron 快取
├── Cache\                     10 MB  🟡
├── CachedData\                85 MB  🟡 VS Code 引擎快取
├── CachedExtensionVSIXs\       0 MB  🟡
├── GPUCache\                   6 MB  🟡
├── DawnWebGPUCache\            1 MB  🟡
├── DawnGraphiteCache\          1 MB  🟡
├── WebStorage\               153 MB  🟡 IndexedDB / Local Storage（最大）
├── logs\                      33 MB  🟡
├── Crashpad\                  33 MB  🟡
├── blob_storage\               0 MB  🟡
├── Code Cache\                 0 MB  🟡
├── Session Storage\            0 MB  🟡
├── Local Storage\              0 MB  🟡
└── User\                      25 MB  ⛔ 使用者設定、擴充套件
```

**注意事項：**
- 本機只有 `antigravity-ide` 和 `antigravity-backup`，不存在 `antigravity/` 或 `antigravity-cli/`
- `brain/` 通常是容量最大的對話資料；`conversations/` 存放 .pb/.db 原始檔
- `WebStorage` (153 MB) 是 Electron IndexedDB 快取，安全可清

---

## 2. Codex（OpenAI）

實際根目錄：`%USERPROFILE%\.codex\`（CLI + Desktop 共用）

### 實際掃描到的資料夾樹

```
C:\Users\<user>\.codex\              949 MB 總計
├── sessions\                        10 MB  🔴 rollout-*.jsonl 完整對話
├── archived_sessions\                0 MB  🔴 歸檔的 session
├── memories\                         ?     🔴 長期記憶
├── memories_1.sqlite                 ?     🔴
├── thread_history_1.sqlite           ?     🔴 對話執行緒歷史
├── session_index.jsonl               0 MB  🔴 session 索引
├── goals_1.sqlite                    0 MB  🔴 目標追蹤
├── .codex-global-state.json          0 MB  ⛔/🔴 全域狀態
├── computer-use\                     0 MB  🟡 電腦操作快取
├── cache\                            0 MB  🟡 一般快取
├── logs_2.sqlite                     0 MB  🟡 日誌
├── queue_1.sqlite                    0 MB  🟡 工作佇列
├── models_cache.json                 0 MB  🟡 模型快取
├── tmp\                              0 MB  🟡 暫存
├── visualizations\                   0 MB  🟡 視覺化快取
├── .sandbox-bin\                   340 MB  ⛔ **沙盒執行環境（不要刪）**
├── .sandbox\                         0 MB  ⛔ 沙盒根目錄
├── .sandbox-secrets\                 0 MB  ⛔ 沙盒憑證
├── plugins\                          0 MB  ⛔ 插件
├── rules\                            0 MB  ⛔ 規則設定
├── skills\                           0 MB  ⛔ 技能設定
├── vendor_imports\                   0 MB  ⛔ 第三方匯入
├── auth.json                         0 MB  ⛔ 認證憑證
└── config.toml                       0 MB  ⛔ 主要設定
```

**注意事項：**
- `.sandbox-bin/`（340 MB）是 Codex 沙盒執行環境，**絕對不要清除**；它不是對話，是工具執行所需的二進位檔
- `sessions/` 目前只有 9.6 MB，但隨使用量會累積
- Desktop App 與 CLI **共用 sessions/**，刪除後兩端都會失去歷史

---

## 3. Windsurf（Codeium / Devin 更名）

實際根目錄：`%USERPROFILE%\.codeium\windsurf\`

### 實際掃描到的資料夾樹

```
C:\Users\<user>\.codeium\
└── windsurf\                       208 MB
    └── cascade\                    156 MB  🔴 Cascade 對話歷史與記憶
        └── (對話 DB 與索引檔)
```

**注意事項：**
- 本機未安裝 Windsurf 獨立 IDE（無 `%APPDATA%\Windsurf\`），只有 `.codeium` 的資料目錄
- `cascade/` 是唯一需要管理的目錄，清除後本地 Cascade 歷史消失
- `mcp_config.json`（若存在）**不要刪除**

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

實際根目錄：`%APPDATA%\Trae\`

### 實際掃描到的資料夾樹

```
C:\Users\<user>\AppData\Roaming\Trae\   392 MB
├── CachedData\                        192 MB  🟡 VS Code 引擎快取（最大）
├── logs\                               78 MB  🟡 應用程式日誌
├── ModularData\                        62 MB
│   ├── ai-agent\                       44 MB
│   │   ├── database.db                38 MB  🔴 **完整對話資料庫（SQLite）**
│   │   ├── database.db-shm             0 MB  🔴 共享記憶體（隨 db 一起刪）
│   │   ├── database.db-wal             4 MB  🔴 WAL 日誌（隨 db 一起刪）
│   │   ├── snapshot\                   2 MB  🔴 對話快照
│   │   ├── command-execution\          0 MB  🟡 指令執行暫存
│   │   ├── hooks_env\                  0 MB  🟡
│   │   └── sandbox\                    0 MB  🟡
│   └── ckg_server\                    18 MB  🟡 程式碼知識圖快取
├── GPUCache\                            6 MB  🟡
├── Cache\                              10 MB  🟡
├── DawnWebGPUCache\                     1 MB  🟡
├── DawnGraphiteCache\                   1 MB  🟡
├── Partitions\                         30 MB  🟡 Chrome 分割區快取
├── Local Storage\                       2 MB  🟡
├── blob_storage\                        0 MB  🟡
├── IndexedDB\                           0 MB  🟡
└── ...（其他系統目錄）
```

**注意事項：**
- 本機路徑是 `Trae`，**不是** `Trae CN`（用戶可能是全球版）
- `database.db`（38 MB）是對話的核心 SQLite，刪除三個 `.db` / `.db-shm` / `.db-wal` 要一起清；**清除前務必關閉 Trae**
- `CachedData`（192 MB）是最大的可安全清除項目

---

## 6. Claude Code（參考，本機未安裝）

路徑來源：官方文件與社群確認。

```
%USERPROFILE%\.claude\             (CLAUDE_CONFIG_DIR 可覆寫)
├── projects\                      🔴 JSONL 對話，依工作目錄分類
│   └── <encoded-cwd>\
│       └── <session-id>.jsonl
├── file-history\                  🔴 編輯前快照（Rewind 用）
├── paste-cache\                   🔴 大型貼上暫存
├── uploads\                       🔴 附件
├── history.jsonl                  🔴 輸入歷史（上箭頭）
├── stats-cache.json               🟡 統計快取
├── usage-data\                    🟡 使用量資料
└── settings.json                  ⛔ 不要刪
```

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
| Antigravity 對話 | `%USERPROFILE%\.gemini\antigravity-ide\conversations` | `~/.gemini/antigravity-ide/conversations` | 同 macOS |
| Antigravity 快取 | `%APPDATA%\Antigravity IDE\Cache` | `~/Library/Application Support/Antigravity IDE/Cache` | `~/.config/Antigravity IDE/Cache` |
| Codex sessions | `%USERPROFILE%\.codex\sessions` | `~/.codex/sessions` | 同 macOS |
| Windsurf cascade | `%USERPROFILE%\.codeium\windsurf\cascade` | `~/.codeium/windsurf/cascade` | 同 macOS |
| Kiro IDE 對話 | `%APPDATA%\Kiro\User\globalStorage\kiro.kiroagent` | `~/Library/Application Support/Kiro/User/globalStorage/kiro.kiroagent` | `~/.config/Kiro/User/globalStorage/kiro.kiroagent` |
| Kiro CLI sessions | `%USERPROFILE%\.kiro\sessions` | `~/.kiro/sessions` | 同 macOS |
| Trae 對話 | `%APPDATA%\Trae\ModularData\ai-agent\database.db` | `~/Library/Application Support/Trae/ModularData/ai-agent/database.db` | `~/.config/Trae/ModularData/ai-agent/database.db` |
| Claude sessions | `%USERPROFILE%\.claude\projects` | `~/.claude/projects` | 同 macOS |
