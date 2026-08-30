#!/usr/bin/env node

/**
 * Sweep Monorepo Version Bump Tool
 *
 * Usage:
 *   node scripts/bump-version.mjs [patch | minor | major | <version>] [--dry-run] [--git-tag]
 *   npm run bump patch
 *   npm run bump minor
 *   npm run bump 1.1.0
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = resolve(import.meta.dirname, "..");

const PACKAGE_JSON_PATHS = [
  "package.json",
  "packages/core/package.json",
  "packages/cli/package.json",
  "packages/vscode-extension/package.json",
];

const EXTENSION_README_PATHS = [
  "packages/vscode-extension/README.md",
  "packages/vscode-extension/README.zh-TW.md",
  "packages/vscode-extension/README.zh-CN.md",
];

function parseSemVer(version) {
  const match = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(`Invalid SemVer format: "${version}". Expected e.g. "1.0.1", "1.1.0", or "2.0.0-beta.1"`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || undefined,
  };
}

function formatSemVer(semver) {
  const base = `${semver.major}.${semver.minor}.${semver.patch}`;
  return semver.prerelease ? `${base}-${semver.prerelease}` : base;
}

function calculateNextVersion(currentVersion, bumpTypeOrVersion) {
  const current = parseSemVer(currentVersion);
  const target = bumpTypeOrVersion.trim().toLowerCase();

  if (target === "patch") {
    return formatSemVer({ ...current, patch: current.patch + 1, prerelease: undefined });
  }
  if (target === "minor") {
    return formatSemVer({ ...current, minor: current.minor + 1, patch: 0, prerelease: undefined });
  }
  if (target === "major") {
    return formatSemVer({ ...current, major: current.major + 1, minor: 0, patch: 0, prerelease: undefined });
  }

  // Explicit version given
  return formatSemVer(parseSemVer(bumpTypeOrVersion));
}

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes("--dry-run"),
    gitTag: args.includes("--git-tag"),
  };

  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  const bumpArg = positionalArgs[0] || "patch";

  // 1. Read current version from root package.json
  const rootPkgPath = join(ROOT_DIR, "package.json");
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
  const currentVersion = rootPkg.version;

  const nextVersion = calculateNextVersion(currentVersion, bumpArg);

  console.log(`\n🚀 Sweep Version Bump Tool`);
  console.log(`──────────────────────────────────────────`);
  console.log(`Current Version : v${currentVersion}`);
  console.log(`Next Version    : v${nextVersion} (${bumpArg})`);
  console.log(`Mode            : ${flags.dryRun ? "🔍 Dry Run (no files modified)" : "✍️  Live Update"}`);
  console.log(`──────────────────────────────────────────\n`);

  if (currentVersion === nextVersion) {
    console.log(`ℹ️  Current version is already ${nextVersion}. No update needed.`);
    return;
  }

  const modifiedFiles = [];

  // 2. Update package.json files
  for (const relPath of PACKAGE_JSON_PATHS) {
    const fullPath = join(ROOT_DIR, relPath);
    if (!existsSync(fullPath)) continue;

    const raw = readFileSync(fullPath, "utf-8");
    const json = JSON.parse(raw);
    json.version = nextVersion;

    if (!flags.dryRun) {
      writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`, "utf-8");
    }
    modifiedFiles.push({ file: relPath, change: `version: "${currentVersion}" -> "${nextVersion}"` });
  }

  // 3. Update package-lock.json safely (only workspace targets, never 3rd-party dependencies)
  const lockPath = join(ROOT_DIR, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
    lock.version = nextVersion;
    if (lock.packages) {
      if (lock.packages[""]) lock.packages[""].version = nextVersion;
      if (lock.packages["packages/core"]) lock.packages["packages/core"].version = nextVersion;
      if (lock.packages["packages/cli"]) lock.packages["packages/cli"].version = nextVersion;
      if (lock.packages["packages/vscode-extension"]) lock.packages["packages/vscode-extension"].version = nextVersion;
    }

    if (!flags.dryRun) {
      writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
    }
    modifiedFiles.push({ file: "package-lock.json", change: `workspace packages version -> "${nextVersion}"` });
  }

  // 4. Update Extension README documentation VSIX filenames
  const vsixOldPattern = new RegExp(`sweep-aicleaner-${currentVersion.replace(/\./g, "\\.")}\\.vsix`, "g");
  const vsixNewString = `sweep-aicleaner-${nextVersion}.vsix`;

  for (const relPath of EXTENSION_README_PATHS) {
    const fullPath = join(ROOT_DIR, relPath);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf-8");
    if (vsixOldPattern.test(content)) {
      const updated = content.replace(vsixOldPattern, vsixNewString);
      if (!flags.dryRun) {
        writeFileSync(fullPath, updated, "utf-8");
      }
      modifiedFiles.push({ file: relPath, change: `VSIX link: ${vsixNewString}` });
    }
  }

  // 5. Check & Prepare CHANGELOG.md section if needed
  const changelogPath = join(ROOT_DIR, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    const changelog = readFileSync(changelogPath, "utf-8");
    const hasVersionHeader = changelog.includes(`## [${nextVersion}]`);
    if (!hasVersionHeader) {
      const today = getTodayString();
      const insertPoint = changelog.indexOf("## [");
      if (insertPoint !== -1) {
        const headerTemplate = `## [${nextVersion}] - ${today}\n\n### ✨ Features & Enhancements\n- \n\n---\n\n`;
        const updated = changelog.slice(0, insertPoint) + headerTemplate + changelog.slice(insertPoint);
        if (!flags.dryRun) {
          writeFileSync(changelogPath, updated, "utf-8");
        }
        modifiedFiles.push({ file: "CHANGELOG.md", change: `Added release section header: ## [${nextVersion}] - ${today}` });
      }
    }
  }

  // Summary output
  console.log(`📋 Summary of Changes:`);
  for (const item of modifiedFiles) {
    console.log(`  ✓ ${item.file.padEnd(42)} ${item.change}`);
  }
  console.log(`\n🎉 Successfully updated version to v${nextVersion} across ${modifiedFiles.length} files!\n`);

  // Optional Git tag & commit
  if (flags.gitTag && !flags.dryRun) {
    console.log(`📦 Creating git commit and tag v${nextVersion}...`);
    execSync(`git add -A`, { cwd: ROOT_DIR, stdio: "inherit" });
    execSync(`git commit -m "chore(release): bump version to v${nextVersion}"`, { cwd: ROOT_DIR, stdio: "inherit" });
    execSync(`git tag v${nextVersion}`, { cwd: ROOT_DIR, stdio: "inherit" });
    console.log(`🏷️  Git tag v${nextVersion} created.`);
  }

  if (flags.dryRun) {
    console.log(`💡 Tip: Run without --dry-run to apply changes.`);
  } else {
    console.log(`💡 Next steps:`);
    console.log(`   1. Run 'npm run build' to verify builds with new version.`);
    console.log(`   2. Run 'npm test' to verify test suites.`);
  }
}

main().catch((err) => {
  console.error(`\n❌ Error:`, err.message);
  process.exit(1);
});
