# Sweep — AI 工具清理专家 (VS Code 扩展) 🧹

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> 专为 Visual Studio Code 与 Cursor 设计的存储占用检测与清理扩展，轻松管理主流 AI 辅助编程工具的缓存与对话记录。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
[![VS Code Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue.svg)](package.json)

`sweep-aicleaner` 将 Sweep 强大的清理能力直接带入您的 IDE。无需离开编辑器，即可快速发现后台被 AI 缓存、IndexedDB 数据库与 Agent 会话占用的数 GB 存储空间。

---

## 🌟 核心功能

- 📊 **活动栏集成（Activity Bar）**：在活动栏提供专属 **Sweep** 图标，一键查看存储占用详情。
- ⚡ **安全清理缓存**：一键安全清理 Electron 缓存、GPU 缓存与知识库索引，完整保留对话记录。
- 💬 **对话记录与 Agent 记忆管理**：精细化管理对话历史记录，具备高风险确认防护机制。
- 🛡️ **模拟预检（Dry-Run）与自动备份**：预先估算可释放空间，并支持在清理对话前自动备份至 `~/.sweep/backups/`。
- 🤖 **全面支持主流工具**：支持 Antigravity、OpenAI Codex、Claude Code、Windsurf、Kiro 与 Trae IDE。

![Sweep 扩展面板总览](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/fullscreen.png)

*安全操作确认与模拟预检弹窗：*

![缓存清理确认弹窗](https://raw.githubusercontent.com/L1r1h28/Sweep-agentcli-ide-cleaner/main/assets/notify.png)

---

## 🛠️ 提供的命令

| 命令 | 标题 | 说明 |
| :--- | :--- | :--- |
| `sweep.scan` | **Sweep: 扫描存储空间** | 扫描并计算各 AI 工具的磁盘占用情况。 |
| `sweep.cleanCache` | **Sweep: 清理所有缓存 (安全)** | 安全清除 Electron、GPU 与 IndexedDB 等缓存文件。 |
| `sweep.cleanConversations` | **Sweep: 清理所有对话记录 (破坏性)** | 清理对话日志与 Agent 会话数据库（具备确认弹窗）。 |
| `sweep.cleanCacheForTool` | **Sweep: 清理该工具的缓存** | 清理所选 AI 工具的缓存文件。 |
| `sweep.cleanConversationsForTool` | **Sweep: 清理该工具的对话记录** | 清理所选 AI 工具的对话记录。 |
| `sweep.dryRun` | **Sweep: 模拟预检全部 (Dry-run)** | 执行非破坏性模拟以估算可回收空间。 |

---

## 📦 安装方式
 
### 方式 1：直接下载安装 (.vsix)

从 **[GitHub Releases](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/releases)** 下载最新版 `sweep-aicleaner-x.x.x.vsix`，并通过命令行或 IDE 界面安装：

```bash
# 在 VS Code 中安装:
code --install-extension sweep-aicleaner-1.1.0.vsix

# 在 Cursor 中安装:
cursor --install-extension sweep-aicleaner-1.1.0.vsix
```

或打开编辑器，切换至 **Extensions** 扩展面板 (`Ctrl+Shift+X` / `Cmd+Shift+X`)，点击右上角 `...` 菜单并选择 **Install from VSIX...**。

---

### 方式 2：从源码构建与打包 (.vsix)

```bash
# 1. 在项目根目录安装依赖
npm install

# 2. 构建并打包扩展
cd packages/vscode-extension
npm run build
npm run pack
```

---

## 🏗️ 架构设计

本扩展使用 `esbuild` 打包为单一独立 CommonJS 文件（`dist/extension.js`），引入 `@aicleaner/core` 并保持 Node.js 原生模块外部化，以确保在各版本 VS Code 中的最佳兼容性与运行效率。

---

## 📄 授权协议

- MIT © [L1r1h28](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/blob/main/LICENSE)
- 图标设计参考 [Lucide](https://lucide.dev)，采用 [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
