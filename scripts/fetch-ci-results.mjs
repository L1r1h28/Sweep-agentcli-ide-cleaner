#!/usr/bin/env node

/**
 * Sweep CI / Workflow Run Watcher & Artifact Fetcher
 *
 * Automatically monitors GitHub Actions runs, waits for completion,
 * downloads all compiled binaries/artifacts, and retrieves cross-platform test logs.
 *
 * Usage:
 *   node scripts/fetch-ci-results.mjs [run_id] [--workflow <name>] [--out-dir <path>]
 *   npm run ci:watch
 *   npm run ci:watch -- 33316228141
 *   npm run ci:watch -- --workflow release.yml
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { execSync, spawnSync } from "node:child_process";

const ROOT_DIR = resolve(import.meta.dirname, "..");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--workflow" || a === "-w") args.workflow = argv[++i];
    else if (a.startsWith("--workflow=")) args.workflow = a.slice(11);
    else if (a === "--out-dir" || a === "-o") args.outDir = argv[++i];
    else if (a.startsWith("--out-dir=")) args.outDir = a.slice(10);
    else if (a === "--poll-interval" || a === "-i") args.interval = parseInt(argv[++i], 10);
    else if (a === "--timeout" || a === "-t") args.timeout = parseInt(argv[++i], 10);
    else if (a === "--no-logs") args.logs = false;
    else if (a === "--no-artifacts") args.artifacts = false;
    else if (a.startsWith("--")) args[a.slice(2)] = true;
    else args._.push(a);
  }
  if (args.interval === undefined) args.interval = 5; // seconds
  if (args.timeout === undefined) args.timeout = 30; // minutes
  if (args.logs === undefined) args.logs = true;
  if (args.artifacts === undefined) args.artifacts = true;
  return args;
}

function runGh(cmdArgs, { allowError = false } = {}) {
  const res = spawnSync("gh", cmdArgs, {
    cwd: ROOT_DIR,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (res.error) {
    throw new Error(`Failed to execute 'gh' CLI: ${res.error.message}. Make sure GitHub CLI is installed.`);
  }

  if (res.status !== 0 && !allowError) {
    throw new Error(`gh ${cmdArgs.join(" ")} failed: ${res.stderr || res.stdout}`);
  }

  return { stdout: res.stdout, stderr: res.stderr, status: res.status };
}

function getCurrentBranch() {
  try {
    return execSync("git branch --show-current", { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
  } catch {
    return "main";
  }
}

function findTargetRun(runIdArg, workflowArg) {
  if (runIdArg && /^\d+$/.test(runIdArg)) {
    return runIdArg;
  }

  const branch = getCurrentBranch();
  const listArgs = ["run", "list", "--limit", "10", "--json", "databaseId,name,workflowName,headBranch,status,conclusion,createdAt,event,url"];
  if (workflowArg) {
    listArgs.push("--workflow", workflowArg);
  }

  const { stdout } = runGh(listArgs);
  const runs = JSON.parse(stdout || "[]");

  if (runs.length === 0) {
    throw new Error("No GitHub Actions runs found for this repository.");
  }

  // Prefer match on current branch
  const match = runs.find((r) => r.headBranch === branch) || runs[0];
  return String(match.databaseId);
}

function getRunDetails(runId) {
  const fields = [
    "databaseId",
    "name",
    "workflowName",
    "headBranch",
    "headSha",
    "event",
    "status",
    "conclusion",
    "createdAt",
    "updatedAt",
    "url",
    "jobs",
  ].join(",");

  const { stdout } = runGh(["run", "view", String(runId), "--json", fields]);
  return JSON.parse(stdout);
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

function listFilesRecursive(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runIdTarget = findTargetRun(args._[0], args.workflow);

  console.log(`\n============================================================`);
  console.log(`🔎 Sweep CI Watcher & Artifact Fetcher`);
  console.log(`============================================================`);
  console.log(`Run ID Target : ${runIdTarget}`);

  let run = getRunDetails(runIdTarget);
  console.log(`Workflow Name : ${run.workflowName || run.name}`);
  console.log(`Branch / Commit: ${run.headBranch} (${run.headSha?.slice(0, 7) || "unknown"})`);
  console.log(`Trigger Event : ${run.event}`);
  console.log(`Run URL       : ${run.url}`);
  console.log(`============================================================\n`);

  const startTime = Date.now();
  const timeoutMs = args.timeout * 60 * 1000;

  // Poll until run completes
  while (run.status !== "completed") {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      throw new Error(`Timeout exceeded (${args.timeout} min) while waiting for run ${runIdTarget} to finish.`);
    }

    const completedJobs = (run.jobs || []).filter((j) => j.status === "completed").length;
    const totalJobs = run.jobs?.length || 0;

    const progressStr = totalJobs > 0 ? `(${completedJobs}/${totalJobs} jobs completed)` : `(${run.status})`;
    process.stdout.write(`\r⏳ Waiting for run to complete... Elapsed: ${formatDuration(elapsed)} ${progressStr}   `);

    await sleep(args.interval * 1000);
    run = getRunDetails(runIdTarget);
  }

  const totalRunDuration = Date.now() - new Date(run.createdAt).getTime();
  const conclusionEmoji = run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : "⚠️";

  console.log(`\n\n${conclusionEmoji} Run completed with status: ${run.status.toUpperCase()} (${run.conclusion?.toUpperCase() || "UNKNOWN"})`);
  console.log(`⏱️  Total Duration: ${formatDuration(totalRunDuration)}\n`);

  // Target directory
  const outDir = resolve(args.outDir ? args.outDir : join(ROOT_DIR, "dist", "ci-artifacts", String(runIdTarget)));
  const artifactsDir = join(outDir, "artifacts");
  const logsDir = join(outDir, "logs");

  mkdirSync(outDir, { recursive: true });
  if (args.artifacts) mkdirSync(artifactsDir, { recursive: true });
  if (args.logs) mkdirSync(logsDir, { recursive: true });

  // 1. Download Artifacts
  const downloadedFiles = [];
  if (args.artifacts) {
    console.log(`📦 [1/3] Downloading build artifacts & packaged binaries...`);
    try {
      runGh(["run", "download", String(runIdTarget), "--dir", artifactsDir], { allowError: true });
      const files = listFilesRecursive(artifactsDir);
      for (const f of files) {
        const rel = f.replace(outDir, "").replace(/^[\\/]/, "");
        const st = statSync(f);
        downloadedFiles.push({ path: rel, fullPath: f, bytes: st.size, name: basename(f) });
      }
      console.log(`   ✓ Successfully downloaded ${downloadedFiles.length} artifact file(s) into: ${artifactsDir}`);
    } catch (err) {
      console.warn(`   ⚠️ Could not download artifacts: ${err.message}`);
    }
  }

  // 2. Download Job Logs
  const jobResults = [];
  if (args.logs && run.jobs && run.jobs.length > 0) {
    console.log(`\n📋 [2/3] Fetching cross-platform build & test logs for ${run.jobs.length} job(s)...`);
    for (const job of run.jobs) {
      const jobNameClean = sanitizeFileName(job.name);
      const logFileName = `job_${jobNameClean}_${job.databaseId}.log`;
      const logFilePath = join(logsDir, logFileName);

      let logContent = "";
      try {
        const { stdout } = runGh(["run", "view", "--job", String(job.databaseId), "--log"], { allowError: true });
        logContent = stdout;
        writeFileSync(logFilePath, logContent, "utf-8");
      } catch (err) {
        logContent = `Error fetching job log: ${err.message}`;
        writeFileSync(logFilePath, logContent, "utf-8");
      }

      const jobDurationMs = job.completedAt && job.startedAt
        ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
        : 0;

      jobResults.push({
        name: job.name,
        id: job.databaseId,
        status: job.status,
        conclusion: job.conclusion || "unknown",
        duration: formatDuration(jobDurationMs),
        logFile: join("logs", logFileName),
        url: job.url,
      });

      const icon = job.conclusion === "success" ? "✓" : job.conclusion === "failure" ? "✗" : "·";
      console.log(`   ${icon} ${job.name.padEnd(36)} [${job.conclusion?.toUpperCase() || "UNKNOWN"}] (${formatDuration(jobDurationMs)}) -> logs/${logFileName}`);
    }
  }

  // 3. Generate Markdown Summary Report
  console.log(`\n📊 [3/3] Generating summary report (SUMMARY.md)...`);
  const summaryLines = [
    `# CI Run Report: ${run.workflowName || run.name} (#${run.databaseId})`,
    ``,
    `- **Status**: ${run.status} (${run.conclusion})`,
    `- **Branch**: \`${run.headBranch}\``,
    `- **Commit**: [\`${run.headSha?.slice(0, 7) || "unknown"}\`](https://github.com/L1r1h28/Sweep-agentcli-ide-cleaner/commit/${run.headSha})`,
    `- **Event**: \`${run.event}\``,
    `- **Created At**: ${run.createdAt}`,
    `- **Completed At**: ${run.updatedAt}`,
    `- **Total Duration**: ${formatDuration(totalRunDuration)}`,
    `- **Run URL**: [GitHub Actions Run](${run.url})`,
    ``,
    `---`,
    ``,
    `## 🧪 Cross-Platform Jobs & Test Logs`,
    ``,
    `| Status | Job Name | Duration | Log File | GitHub Job Link |`,
    `| :--- | :--- | :--- | :--- | :--- |`,
  ];

  for (const j of jobResults) {
    const emoji = j.conclusion === "success" ? "✅ Success" : j.conclusion === "failure" ? "❌ Failed" : "⚠️ " + j.conclusion;
    summaryLines.push(`| ${emoji} | **${j.name}** | ${j.duration} | [\`${j.logFile}\`](${j.logFile}) | [View Job](${j.url}) |`);
  }

  summaryLines.push(``);
  summaryLines.push(`---`);
  summaryLines.push(``);
  summaryLines.push(`## 📦 Downloaded Build Artifacts & Binaries`);
  summaryLines.push(``);

  if (downloadedFiles.length === 0) {
    summaryLines.push(`*No artifacts attached to this run.*`);
  } else {
    summaryLines.push(`| File Name | Size | Local Path |`);
    summaryLines.push(`| :--- | :--- | :--- |`);
    for (const f of downloadedFiles) {
      summaryLines.push(`| **\`${f.name}\`** | ${formatBytes(f.bytes)} | [\`${f.path}\`](${f.path}) |`);
    }
  }

  summaryLines.push(``);
  summaryLines.push(`---`);
  summaryLines.push(`*Report generated automatically by Sweep CI Fetcher on ${new Date().toISOString()}.*`);

  const summaryPath = join(outDir, "SUMMARY.md");
  writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");

  console.log(`   ✓ Summary report saved to: ${summaryPath}`);

  console.log(`\n============================================================`);
  console.log(`🎉 Done! All artifacts, logs, and summary are stored in:`);
  console.log(`📁 ${outDir}`);
  console.log(`============================================================\n`);
}

main().catch((err) => {
  console.error(`\n❌ Error:`, err.message);
  process.exit(1);
});
