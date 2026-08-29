import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const dir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const version = pkg.version;

await build({
  entryPoints: [join(dir, 'src/run.ts')],
  bundle: true,
  outfile: join(dir, 'dist/run.cjs'),
  platform: 'node',
  format: 'cjs',
  // No `packages: 'external'` — bundle @aicleaner/core inline so the
  // produced single-file bundle can be embedded into a SEA binary
  // (Single Executable Application) without node_modules.
  sourcemap: true,
  loader: { '.ts': 'ts' },
  logLevel: 'info',
  // Inject the version string so __CLI_VERSION__ is replaced at bundle time.
  // This works both for regular bundle and SEA single-file execution.
  define: {
    '__CLI_VERSION__': JSON.stringify(version),
  },
});

console.log('[@aicleaner/cli] Build successful -> dist/');
