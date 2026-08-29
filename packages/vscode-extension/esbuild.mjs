// esbuild.mjs — VS Code extension bundler
// Bundles src/extension.js + @aicleaner/core into dist/extension.js (CommonJS)
// so the extension host can require() it without strip-types or ESM shims.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [join(__dirname, "src/extension.js")],
  bundle: true,
  outfile: join(__dirname, "dist/extension.js"),
  platform: "node",
  format: "cjs",
  // vscode is provided by the host — do not bundle it.
  external: ["vscode"],
  // core ships .ts source; esbuild handles TS natively.
  loader: { ".ts": "ts" },
  // Keep Node built-ins external (fs, path, os, etc.).
  packages: "external",
  minify: false,
  sourcemap: true,
  logLevel: "info",
});
