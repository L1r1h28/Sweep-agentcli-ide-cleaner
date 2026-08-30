# Changelog

All notable changes to Sweep (CLI, VS Code Extension, and Core Engine) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-30

### 🚀 Initial Release — Standalone CLI & Core Engine

This is the **first official release** of Sweep, featuring high-performance cross-platform standalone binaries (built with Node.js Single Executable Applications) and a shared safety-first clean engine.

#### ✨ Key Features

- 🖥️ **Cross-Platform Standalone Binaries**:
  - Windows x64 (`sweep-windows-x64.exe`)
  - macOS Apple Silicon (`sweep-darwin-arm64`)
  - macOS Intel (`sweep-darwin-x64`)
  - Linux x64 (`sweep-linux-x64`)
- 🤖 **6 AI Coding Tools Supported**:
  - Google Antigravity IDE
  - OpenAI Codex (CLI + Desktop App)
  - Anthropic Claude Code
  - Codeium Windsurf (Cascade)
  - AWS Kiro IDE
  - ByteDance Trae IDE
- 🛡️ **Three-Tier Safety Cleaning Model**:
  - `--kind cache`: Safely deletes Electron, GPU, and IndexedDB caches without touching chats.
  - `--kind conversations`: Destructive cleanup for session histories and chat databases (requires explicit `--force`).
  - `--kind all`: Cleans both caches and conversations.
- 📦 **Automated Backup System**:
  - Automatically archives conversation files to `~/AI-Cleaner-Backups/<timestamp>/` prior to deletion.
- 🔒 **Never-Delete Guard**:
  - Built-in permanent exclusion layer protecting `.sandbox-bin/`, `.kiro/extensions/`, `settings.json`, `auth.json`, `config.toml`, and `mcp_config.json`.
- 🧪 **Cross-Platform CI & Smoke Testing**:
  - Automated multi-OS verification across Windows, Linux, and macOS.
