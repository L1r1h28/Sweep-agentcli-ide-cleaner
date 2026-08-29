import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [join(dir, 'src/run.ts')],
  bundle: true,
  outfile: join(dir, 'dist/run.js'),
  platform: 'node',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  loader: { '.ts': 'ts' },
  logLevel: 'info'
});

console.log('[@aicleaner/cli] Build successful -> dist/');
