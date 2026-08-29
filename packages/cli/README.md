# @aicleaner/cli

Command-line client for Sweep. Uses `@aicleaner/core` only.

```bash
node packages/cli/src/cli.mjs scan
node packages/cli/src/cli.mjs clean --kind cache --dry-run
node packages/cli/src/cli.mjs clean --kind conversations --force
```

Pack:

```bash
cd packages/cli && npm pack
```

`--force` is required for real deletes. Default is dry-run + backup.
