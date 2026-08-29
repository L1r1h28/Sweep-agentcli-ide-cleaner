# Sweep VS Code extension

Thin client over `@aicleaner/core.` Commands:

- Sweep: Scan storage
- Sweep: Clean cache (safe)
- Sweep: Clean conversations (destructive)
- Sweep: Dry-run all

Pack:
```bash
cd packages/vscode-extension
npx @vscode/vsce package --no-dependencies --allow-missing-repository
```
Keep `packages/core` next to this folder so the extension can import the engine.