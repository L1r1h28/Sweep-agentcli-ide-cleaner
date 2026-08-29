#!/usr/bin/env node
/**
 * Generate SHA-256 checksums for all binaries in dist/
 *
 * Outputs: dist/SHA256SUMS.txt
 */

import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

function sha256(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

function main() {
  const files = readdirSync(distDir)
    .filter(f => {
      if (f.endsWith('.map') || f.endsWith('.blob') || f.endsWith('.cjs') || f.endsWith('.js') || f.endsWith('.json') || f === 'SHA256SUMS.txt') return false;
      if (f === 'err.txt' || f === 'out.txt' || f === 'ver.txt') return false;
      if (!f.startsWith('sweep-')) return false; // only binaries
      const full = join(distDir, f);
      return statSync(full).isFile();
    })
    .sort();

  if (files.length === 0) {
    console.log('[checksum] No binary files found in dist/');
    return;
  }

  const lines = files.map(f => {
    const hash = sha256(join(distDir, f));
    return `${hash}  ${f}`;
  });

  const outPath = join(distDir, 'SHA256SUMS.txt');
  writeFileSync(outPath, lines.join('\n') + '\n');
  console.log('[checksum] Generated:', outPath);
  console.log(lines.join('\n'));
}

main();