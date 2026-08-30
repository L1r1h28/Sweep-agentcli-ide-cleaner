# Sweep — AI 工具清理专家 (VS Code 扩展) 🧹

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> 专为 Visual Studio Code 与 Cursor 设计的存储空间查看与清理扩展，轻松管理主流 AI 辅助编程工具的缓存与对话记录。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` 将 Sweep 强大的清理能力直接带入您的 IDE。无需离开编辑器，即可快速发现后台中被 AI 缓存、IndexedDB 数据库与 Agent 工作阶段占用的数 GB 存储空间。

---

## 🌟 核心特色

- 📊 **活动栏集成（Activity Bar）**：在活动栏提供专属 **Sweep** 图标，一键查看存储空间占用状态。
- ⚡ **安全清理缓存**：一键安全清理 Electron 缓存、GPU 缓存与知识库索引，完整保留对话记录。
- 💬 **对话记录与 Agent 记忆管理**：精细化管理对话历史记录，具备高风险确认防护机制。
- 🛡️ **白名单与防删保护**：支持将重要项目、路径 pattern 或 Session ID 加入永久保护白名单，树状视图呈现绿色盾牌图标 (`$(shield)`)。
- 📦 **自动备份与一键还原**：清理前自动备份至 `~/.sweep/backups/`，随时支持历史快照还原。
- 🤖 **广泛支持主流工具**：支持 Antigravity、OpenAI Codex、Claude Code、Windsurf、Kiro 和 Trae IDE。

![Sweep 扩展面板概览](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/fullscreen.png)

*安全操作确认与模拟预检窗口：*

![缓存清理确认弹窗](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/notify.png)

---

## 🛠️ 提供的指令清单 (Contributed Commands)

| 指令 | 标题 | 分类 | 说明 |
| :--- | :--- | :--- | :--- |
| `sweep.scan` | **Sweep: 扫描存储空间** | 扫描 | 扫描并计算各 AI 工具的磁盘占用状况。 |
| `sweep.dryRun` | **Sweep: 模拟预检全部 (Dry-run)** | 预检 | 执行非破坏性模拟以估算可回收空间。 |
| `sweep.cleanCache` | **Sweep: 清理所有缓存 (安全)** | 清理 | 安全清除 Electron、GPU 与 IndexedDB 等缓存文件。 |
| `sweep.cleanConversations` | **Sweep: 清理所有对话记录 (破坏性)** | 清理 | 清理对话日志与 Agent 会话数据库（具备确认窗口）。 |
| `sweep.cleanCacheForTool` | **Sweep: 清理该工具的缓存** | 清理 | 清理所选 AI 工具的缓存文件。 |
| `sweep.cleanConversationsForTool` | **Sweep: 清理该工具的对话记录** | 清理 | 清理所选 AI 工具的对话记录。 |
| `sweep.cleanSessionsOlderThan` | **Sweep: 清理指定天数前的旧对话...** | 条件清理 | 清理早于指定天数（如 30d、2w）的对话记录。 |
| `sweep.cleanLargeSessions` | **Sweep: 清理大型对话记录 (>50MB)...** | 条件清理 | 清理超过指定大小阈值的大型 Session。 |
| `sweep.pickSessionsToClean` | **Sweep: 挑选欲删除的对话记录...** | 交互选择 | 通过 QuickPick 多选清单挑选特定对话删除。 |
| `sweep.cleanSingleSession` | **Sweep: 删除此对话 Session** | 树状操作 | 直接在树状视图删除单一对话记录。 |
| `sweep.exportSession` | **Sweep: 导出对话记录 (Markdown / JSON)** | 导出 | 将聊天历史导出为易阅读的 Markdown 或 JSON。 |
| `sweep.listBackups` | **Sweep: 查看备份历史** | 备份 | 列出本机 `~/.sweep/backups/` 快照备份。 |
| `sweep.restoreBackup` | **Sweep: 从备份还原...** | 还原 | 将对话或缓存从历史快照安全恢复。 |
| `sweep.openBackupFolder` | **Sweep: 打开备份文件夹** | 备份 | 在系统文件管理器中打开 `~/.sweep/backups/`。 |
| `sweep.pruneBackups` | **Sweep: 清理过期备份...** | 备份 | 清除超过指定天数（默认 14 天）的旧备份以释放空间。 |
| `sweep.addToWhitelist` | **Sweep: 加入白名单 (永久保护)** | 白名单 | 将选取的项目、路径 pattern 或 Session 设为永久保护。 |
| `sweep.removeFromWhitelist` | **Sweep: 从白名单移除** | 白名单 | 解除保护状态，恢复一般清理操作。 |
| `sweep.openConfigFile` | **Sweep: 打开配置文件** | 配置 | 打开 `~/.sweep/config.json` 进行编辑。 |

---

## 🛡️ 白名单与排除防护机制 (Whitelist & Protection)

树状视图中带有 **绿色盾牌图标 (`$(shield)`)** 的项目受白名单规则保护：

* **防删保证**：命中白名单的项目、路径或 Session，在执行批量清理、天数清理或单项删除时将会自动跳过，绝不误删。
* **右键快捷菜单**：在树状视图中的任意 Session 或路径上点击右键，即可点击“**加入白名单**”或“**从白名单移除**”。
* **安全标签**：受保护 Session 显示 `[🛡️ Whitelisted]` 标记，并禁用单项清理按钮以策安全。

---

## ⚙️ 扩展配置项 (Settings)

| 设置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `sweep.customPaths` | `object` | `{}` | 自定义 AI 工具存储路径（例如 `{ "claude-code": ["D:\\custom\\.claude"] }`）。 |
| `sweep.excludePatterns` | `array` | `[]` | 排除清理的 Glob 模式（例如 `["**/keep-*/**"]`）。 |
| `sweep.whitelistProjects` | `array` | `[]` | 永久保护的项目或 Workspace 名称清单。 |
| `sweep.backupBeforeClean` | `boolean` | `true` | 清理对话前自动将文件备份至 `~/.sweep/backups/`。 |

---

## 📦 安装方式
 
### 方式 1：直接下载安装 (.vsix)

从 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下载最新版 `sweep-aicleaner-1.1.5.vsix`，并通过命令行或 IDE 界面安装：

```bash
# 在 VS Code 中安装:
code --install-extension sweep-aicleaner-1.1.5.vsix

# 在 Cursor 中安装:
cursor --install-extension sweep-aicleaner-1.1.5.vsix
```

或打开编辑器，切换至 **Extensions** 扩展面板 (`Ctrl+Shift+X` / `Cmd+Shift+X`)，点击右上角 `...` 菜单并选择 **Install from VSIX...**。

---

### 方式 2：从源码构建与打包 (.vsix)

```bash
# 1. 在项目根目录安装依赖
npm install

# 2. 构建与打包扩展
cd packages/vscode-extension
npm run build
npm run pack
```

---

## 🏗️ 架构设计

本扩展使用 `esbuild` 打包为单一独立 CommonJS 文件（`dist/extension.js`），引入 `@aicleaner/core` 并保持 Node.js 原生模块外部化，以确保在各版本 VS Code 中的最佳兼容性与执行性能。

---

## 📄 授权协议

- MIT © [L1r1h28](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
- 图标设计参考 [Lucide](https://lucide.dev)，采用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
