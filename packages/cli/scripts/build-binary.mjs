#!/usr/bin/env node
/**
 * Build SEA (Single Executable Application) binary for the current platform.
 *
 * Usage:
 *   node scripts/build-binary.mjs        # build for current platform
 *
 * On Windows, produces: dist/sweep-win-x64.exe
 * On macOS (Apple Silicon), produces: dist/sweep-macos-arm64
 * On macOS (Intel), produces: dist/sweep-macos-x64
 * On Linux, produces: dist/sweep-linux-x64
 */

import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, chmodSync, statSync, unlinkSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = join(root, 'dist');
const bundlePath = join(distDir, 'run.cjs');
const seaConfigPath = join(root, 'sea-config.json');
const blobPath = join(distDir, 'sea-prep.blob');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
  return result;
}

function cleanDist() {
  // Remove old build artifacts (esm, js, .map, .blob, stale binaries)
  if (!existsSync(distDir)) return;
  for (const f of readdirSync(distDir)) {
    if (
      f === 'run.mjs' || f === 'run.mjs.map' ||
      f === 'run.js' || f === 'run.js.map' ||
      f === 'run.cjs.map' ||
      f === 'sea-prep.blob' || f === 'SHA256SUMS.txt' ||
      /^sweep-.*\.(exe|app|bin)$/.test(f)
    ) {
      try { unlinkSync(join(distDir, f)); } catch {}
    }
  }
}

function buildBundle() {
  console.log('[build-binary] Building esbuild bundle (CJS)...');
  cleanDist();
  run('node', ['build.mjs'], { cwd: root });
  if (!existsSync(bundlePath)) {
    throw new Error(`Bundle not found: ${bundlePath}`);
  }
  console.log('[build-binary] Bundle OK:', bundlePath);
}

function buildSeaBlob() {
  console.log('[build-binary] Generating SEA blob...');
  // SEA config's main field is relative to cwd, so run from dist/
  run('node', ['--experimental-sea-config', '../sea-config.json'], { cwd: distDir });
  if (!existsSync(blobPath)) {
    throw new Error(`SEA blob not found: ${blobPath}`);
  }
  console.log('[build-binary] SEA blob OK:', blobPath);
}

function getBinaryName() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return 'sweep-win-x64.exe';
  if (platform === 'darwin') return arch === 'arm64' ? 'sweep-macos-arm64' : 'sweep-macos-x64';
  if (platform === 'linux') return 'sweep-linux-x64';
  throw new Error(`Unsupported platform: ${platform}`);
}

function getNodeBinary() {
  const nodePath = process.execPath;
  if (!existsSync(nodePath)) {
    throw new Error(`Node binary not found: ${nodePath}`);
  }
  return nodePath;
}

function injectBlob(binaryPath) {
  console.log(`[build-binary] Injecting SEA blob into ${binaryPath}...`);

  const sentinel = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

  run('npx', [
    'postject',
    binaryPath,
    'NODE_SEA_BLOB',
    blobPath,
    '--sentinel-fuse',
    sentinel,
    '--macho-segment-name',
    'NODE_SEA',
  ]);

  console.log('[build-binary] Injection OK');
}

function signMacOS(binaryPath) {
  if (process.platform === 'darwin') {
    console.log('[build-binary] Ad-hoc code signing (macOS)...');
    run('codesign', ['--sign', '-', binaryPath]);
    console.log('[build-binary] Code signing OK');
  }
}

function makeExecutable(binaryPath) {
  if (process.platform !== 'win32') {
    chmodSync(binaryPath, 0o755);
  }
}

function main() {
  console.log('=== Sweep CLI SEA Binary Builder ===');
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log(`Node: ${process.version}`);

  try {
    buildBundle();
    buildSeaBlob();

    const binaryName = getBinaryName();
    const binaryPath = join(distDir, binaryName);

    const nodeBin = getNodeBinary();
    console.log(`[build-binary] Copying ${nodeBin} -> ${binaryPath}`);
    copyFileSync(nodeBin, binaryPath);

    injectBlob(binaryPath);
    signMacOS(binaryPath);
    makeExecutable(binaryPath);

    const sizeMB = (statSync(binaryPath).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Binary created: ${binaryPath}`);
    console.log(`   Size: ${sizeMB} MB`);

    console.log('\n[build-binary] Running quick verification...');
    run(binaryPath, ['--version'], { cwd: distDir });
    run(binaryPath, ['help'], { cwd: distDir });

    // Generate SHA-256 checksums
    console.log('\n[build-binary] Generating SHA-256 checksums...');
    run('node', ['scripts/checksum.mjs'], { cwd: root });

    console.log('\n✅ All checks passed!');

  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
  }
}

main();