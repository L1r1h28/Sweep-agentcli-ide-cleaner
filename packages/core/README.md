# @aicleaner/core

Shared engine for Sweep (AI coding tools cleaner).

- Browser-safe: `catalog`, `paths`, `format`, `demo`
- Node-only: `scan`, `clean`, `backup` via `@aicleaner/core/node`

```ts
import { TOOLS, buildDemoReport } from "@aicleaner/core";
import { scanDisk, runClean } from "@aicleaner/core/node";
```

Pack independently:

```bash
cd packages/core && npm pack
```
