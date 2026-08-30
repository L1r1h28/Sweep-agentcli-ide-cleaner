#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dir = dirname(fileURLToPath(import.meta.url));
const runPath = existsSync(join(dir, "..", "dist", "run.cjs"))
  ? join(dir, "..", "dist", "run.cjs")
  : existsSync(join(dir, "dist", "run.cjs"))
  ? join(dir, "dist", "run.cjs")
  : join(dir, "run.ts");

if (runPath.endsWith(".cjs") || runPath.endsWith(".js")) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { runCli } = require(runPath);
  await runCli(process.argv.slice(2));
} else {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", runPath, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
