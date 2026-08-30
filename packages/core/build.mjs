import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

execFileSync(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', 'tsconfig.json', '--noEmit'], {
  stdio: 'inherit'
});

console.log('[@l1r1h28/sweep-core] Typecheck successful (bundled by CLI and extension)');
