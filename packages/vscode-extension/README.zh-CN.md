# Sweep — AI 工具清理器 (VS Code 扩展) 🧹

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> 专为 Visual Studio Code 与 Cursor / Trae / Windsurf 设计的 AI 辅助工具缓存分析与安全清理扩展。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` 将 Sweep 的强大功能直接带入您的 IDE 开发环境。无需离开编辑器，即可快速诊断后台 AI 缓存、IndexedDB 与 Agent 对话历史数据库所占用的数 GB 空间。

---

## 🌟 核心特色

- 📊 **Activity Bar 集成**：侧边栏常驻 **Sweep 扫帚图标**，随时掌握存储占用状态。
- ⚡ **安全缓存释放**：一键清除 Electron 缓存、GPU 暂存与知识图谱索引，绝不丢失对话上下文。
- 💬 **会话与 Agent 状态管理**：提供细粒度会话管理、高风险防误删弹窗与自动备份机制。
- 👁️ **未安装工具切换开关**：一键切换隐藏未安装或 0-byte 的 AI 工具 (`$(eye)`)。
- 📁 **GUI 自定义路径选择器**：通过原生文件夹选择器交互式设置自定义存储目录 (`$(folder-library)`)。
- 🛡️ **白名单安全保护**：在 Tree View 中直观标示盾牌图标 (`$(shield)`)，永久保护重要项目与路径。
- 📦 **备份与一键还原**：清理前自动归档至 `~/.sweep/backups/`，随时秒级快速还原。
- 🤖 **完整 15 个产品线支持**：支持 Antigravity 全家族、OpenAI Codex、Claude Code/Desktop、Windsurf & Cascade、AWS Kiro 与 ByteDance Trae。

![Sweep Extension Overview](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/fullscreen.png)

*清理确认与 Dry-run 模拟提示弹窗：*

![Clean Cache Confirmation Dialog](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/notify.png)

---

## 🛠️ 扩展指令清单

| 指令 ID | 指令名称 | 分类 | 说明 |
| :--- | :--- | :--- | :--- |
| `sweep.scan` | **Sweep: 扫描存储空间** | 扫描 | 扫描并计算本机所有 AI 工具占用容量。 |
| `sweep.dryRun` | **Sweep: 模拟预览全部 (Dry-run)** | 查看 | 运行非破坏性模拟，预估可释放空间。 |
| `sweep.cleanCache` | **Sweep: 清理所有缓存 (安全)** | 清理 | 安全清理 Electron、GPU 与 IndexedDB 缓存。 |
| `sweep.cleanConversations` | **Sweep: 清理所有对话记录 (破坏性)** | 清理 | 清理对话历史与会话数据库（弹出确认窗口并备份）。 |
| `sweep.cleanCacheForTool` | **Sweep: 清理此工具缓存** | 清理 | 仅清理选定 AI 工具的暂存缓存。 |
| `sweep.cleanConversationsForTool` | **Sweep: 清理此工具对话记录** | 清理 | 仅清理选定 AI 工具的对话历史。 |
| `sweep.cleanSessionsOlderThan` | **Sweep: 清理超过指定天数的对话...** | 筛选清理 | 清理超过指定时间（如 30d、2w）的历史对话。 |
| `sweep.cleanLargeSessions` | **Sweep: 清理超大对话记录 (>50MB)...** | 筛选清理 | 清理容量超过指定门槛的庞大会话。 |
| `sweep.pickSessionsToClean` | **Sweep: 挑选欲删除的对话记录...** | 交互式 | 通过 QuickPick 多选特定会话进行批量清理。 |
| `sweep.cleanSingleSession` | **Sweep: 删除此对话记录** | 项目动作 | 从树状视图中单独删除选定的会话记录。 |
| `sweep.exportSession` | **Sweep: 导出对话记录 (Markdown / JSON)** | 导出 | 将聊天历史导出为易读的 Markdown 或 JSON 结构文件。 |
| `sweep.listBackups` | **Sweep: 查看备份历史** | 备份 | 查看 `~/.sweep/backups/` 内的本地备份归档文件。 |
| `sweep.restoreBackup` | **Sweep: 从备份还原...** | 还原 | 从先前的备份快照还原对话或缓存。 |
| `sweep.openBackupFolder` | **Sweep: 打开备份文件夹** | 备份 | 在系统文件管理器中打开 `~/.sweep/backups/`。 |
| `sweep.pruneBackups` | **Sweep: 修剪过期备份...** | 备份 | 清理超过 14 天的历史备份以释放空间。 |
| `sweep.addToWhitelist` | **Sweep: 加入白名单保护** | 白名单 | 保护选定的项目、路径或会话不被任何清理操作删除。 |
| `sweep.removeFromWhitelist` | **Sweep: 从白名单移除** | 白名单 | 解除保护，恢复正常清理。 |
| `sweep.openConfigFile` | **Sweep: 打开配置文件** | 配置 | 打开 `~/.sweep/config.json` 进行编辑。 |
| `sweep.toggleHideUninstalled` | **Sweep: 切换隐藏未安装工具** | 查看 | 切换是否在树状视图中隐藏未安装或空数据的工具。 |
| `sweep.addCustomPath` | **Sweep: 添加自定义路径** | 配置 | 交互式挑选目录并添加至特定 AI 工具的自定义存储路径。 |

---

## 🛡️ 白名单保护机制

标有 **盾牌 (`$(shield)`)** 的项目代表受白名单永久保护：

* **防误删保证**：白名单内的会话、项目与路径将在批量清理、筛选清理与单项删除中被自动跳过。
* **快捷右键菜单**：在树状视图中右键点击任何会话或路径即可运行 **加入白名单** 或 **从白名单移除**。
* **可视化标识**：受保护项目显示 `[🛡️ 已列入白名单]` 与绿色盾牌图标，单项删除按钮自动禁用。

---

## ⚙️ 扩展设置项目

| 设置名称 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `sweep.customPaths` | `object` | `{}` | AI 工具的自定义存储路径（例如 `{ "claude-code": ["D:\\custom\\.claude"] }`）。 |
| `sweep.excludePatterns` | `array` | `[]` | 排除不删除的会话文件 Glob 规则（例如 `["**/keep-*/**"]`）。 |
| `sweep.whitelistProjects` | `array` | `[]` | 永久保护不被清理的项目/工作区名称列表。 |
| `sweep.backupBeforeClean` | `boolean` | `true` | 清除对话前自动备份至 `~/.sweep/backups/`。 |
| `sweep.hideUninstalledTools` | `boolean` | `true` | 在树状视图中隐藏本机未安装或数据量为 0 的 AI 工具。 |

---

## 📦 安装方式
 
### 方法 1：直接下载 (.vsix)

前往 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下载 `sweep-aicleaner-1.2.0.vsix`，通过终端或编辑器安装：

```bash
# 在 VS Code 中安装：
code --install-extension sweep-aicleaner-1.2.0.vsix

# 在 Cursor 中安装：
cursor --install-extension sweep-aicleaner-1.2.0.vsix
```

或在编辑器中打开 **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)，点击右上角 `...` 选择 **Install from VSIX...**。

---

### 方法 2：从源码构建与打包 (.vsix)

```bash
# 1. 于项目根目录安装依赖
npm install

# 2. 打包扩展
npm run pack --workspace=sweep-aicleaner
```

---

## 🏗️ 架构设计

本扩展通过 `esbuild` 打包为单一独立 CommonJS 文件 (`dist/extension.js`)，直接引入 `@l1r1h28/sweep-core`，并将 Node.js 内置模块保留为 external，确保在各 VS Code 版本中的最高兼容性。

---

## 📄 授权协议

- MIT © [L1r1h28](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
- 图标设计基于 [Lucide](https://lucide.dev)，采用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
