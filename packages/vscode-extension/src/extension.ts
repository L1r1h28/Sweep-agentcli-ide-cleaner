import * as vscode from "vscode";
import {
  scanDisk,
  runClean,
  planClean,
  formatBytes,
  TOOLS,
  type ToolDef,
  type ScanReport,
  type ScanEntry,
  type CleanKind,
  type ToolId,
} from "@aicleaner/core";

type TreeNode =
  | { type: "tool"; tool: ToolDef; entries: ScanEntry[]; totalBytes: number; cacheBytes: number; convBytes: number }
  | { type: "target"; toolId: ToolId; targetId: string; label: string; kind: CleanKind; risk: string; entries: ScanEntry[]; totalBytes: number }
  | { type: "path"; entry: ScanEntry };

export class SweepTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private report: ScanReport | null = null;

  constructor() {
    this.refresh();
  }

  getReport(): ScanReport {
    if (!this.report) {
      this.report = scanDisk();
    }
    return this.report;
  }

  refresh(): ScanReport {
    this.report = scanDisk();
    this._onDidChangeTreeData.fire();
    return this.report;
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.type === "tool") {
      const { tool, totalBytes, cacheBytes, convBytes } = element;
      const item = new vscode.TreeItem(
        tool.name,
        totalBytes > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
      );

      item.contextValue = `tool:${tool.id}`;
      item.description = totalBytes > 0
        ? `${formatBytes(totalBytes)} (💾 ${formatBytes(cacheBytes)} · 💬 ${formatBytes(convBytes)})`
        : "0 B (not found)";

      item.tooltip = new vscode.MarkdownString(
        `### ${tool.name}\n\n` +
        `**${tool.blurb}**\n\n` +
        `• 💾 **Cache**: ${formatBytes(cacheBytes)}\n` +
        `• 💬 **Conversations**: ${formatBytes(convBytes)}\n` +
        `• 📦 **Total**: ${formatBytes(totalBytes)}\n\n` +
        (tool.notes.length > 0 ? `*${tool.notes.join("\n")}*` : "")
      );

      item.iconPath = totalBytes > 0
        ? new vscode.ThemeIcon("robot")
        : new vscode.ThemeIcon("circle-slash");

      return item;
    }

    if (element.type === "target") {
      const { label, kind, risk, totalBytes, entries } = element;
      const existingEntries = entries.filter((e) => e.exists);
      const totalFiles = existingEntries.reduce((s, e) => s + e.fileCount, 0);

      const kindIcon = kind === "cache" ? "💾" : "💬";
      const riskBadge = risk === "high" ? "🔴" : "🟡";

      const item = new vscode.TreeItem(
        `${label} ${kindIcon} ${riskBadge}`,
        entries.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      item.contextValue = `target:${element.targetId}`;
      item.description = totalBytes > 0
        ? `${formatBytes(totalBytes)} (${totalFiles} ${totalFiles === 1 ? "file" : "files"})`
        : "not found";

      item.iconPath = kind === "cache"
        ? new vscode.ThemeIcon("database")
        : (risk === "high" ? new vscode.ThemeIcon("comment-discussion") : new vscode.ThemeIcon("shield"));

      return item;
    }

    // Path level
    const { entry } = element;
    const item = new vscode.TreeItem(
      entry.path,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = "pathEntry";
    if (entry.exists) {
      item.description = `${formatBytes(entry.bytes)} (${entry.fileCount} files)`;
      item.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
      item.tooltip = `${entry.path}\nSize: ${formatBytes(entry.bytes)} (${entry.fileCount} files)`;
    } else {
      item.description = "(not found)";
      item.iconPath = new vscode.ThemeIcon("circle-slash", new vscode.ThemeColor("disabledForeground"));
      item.tooltip = `${entry.path} (Not present on this machine)`;
    }

    return item;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    const report = this.getReport();

    if (!element) {
      // Root level: return all tools
      return TOOLS.map((tool) => {
        const toolEntries = report.entries.filter((e) => e.toolId === tool.id);
        const presentEntries = toolEntries.filter((e) => e.exists);
        const totalBytes = presentEntries.reduce((s, e) => s + e.bytes, 0);
        const cacheBytes = presentEntries
          .filter((e) => e.kind === "cache")
          .reduce((s, e) => s + e.bytes, 0);
        const convBytes = totalBytes - cacheBytes;

        return {
          type: "tool",
          tool,
          entries: toolEntries,
          totalBytes,
          cacheBytes,
          convBytes,
        };
      });
    }

    if (element.type === "tool") {
      const tool = element.tool;
      return tool.targets.map((target) => {
        const targetEntries = element.entries.filter((e) => e.targetId === target.id);
        const totalBytes = targetEntries
          .filter((e) => e.exists)
          .reduce((s, e) => s + e.bytes, 0);

        return {
          type: "target",
          toolId: tool.id,
          targetId: target.id,
          label: target.label,
          kind: target.kind,
          risk: target.risk,
          entries: targetEntries,
          totalBytes,
        };
      });
    }

    if (element.type === "target") {
      return element.entries.map((entry) => ({
        type: "path",
        entry,
      }));
    }

    return [];
  }
}

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new SweepTreeDataProvider();

  const treeView = vscode.window.createTreeView("sweep.tools", {
    treeDataProvider,
    showCollapseAll: true,
  });

  // sweep.scan
  const scanCmd = vscode.commands.registerCommand("sweep.scan", async () => {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Sweep: Scanning AI tool caches and conversation histories...",
        cancellable: false,
      },
      async () => {
        const report = treeDataProvider.refresh();
        const msg = `Sweep scan complete: Found ${formatBytes(report.totalBytes)} (💾 Cache ${formatBytes(report.cacheBytes)} · 💬 Conversations ${formatBytes(report.conversationBytes)}).`;
        vscode.window.showInformationMessage(msg);
      }
    );
  });

  // sweep.cleanCache
  const cleanCacheCmd = vscode.commands.registerCommand("sweep.cleanCache", async () => {
    const report = treeDataProvider.getReport();
    const planned = planClean(report, {
      kinds: ["cache"],
      dryRun: true,
      backup: false,
    });

    const totalToFree = planned.reduce((s, i) => s + i.bytes, 0);
    if (totalToFree === 0) {
      vscode.window.showInformationMessage("Sweep: No cleanable cache found.");
      return;
    }

    const confirm = await vscode.window.showInformationMessage(
      `Clean all AI tool cache files? Estimated space to recover: ${formatBytes(totalToFree)} (Safe operation, conversations will be kept).`,
      { modal: true },
      "Clean Cache",
      "Dry Run"
    );

    if (confirm === "Clean Cache") {
      const result = runClean(report, {
        kinds: ["cache"],
        dryRun: false,
        backup: false,
      });
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Sweep: Cache cleaned successfully! Freed ${formatBytes(result.freedBytes)}.`);
    } else if (confirm === "Dry Run") {
      vscode.window.showInformationMessage(`Sweep [Dry Run]: Would free ${formatBytes(totalToFree)} of cache without deleting any files.`);
    }
  });

  // sweep.cleanConversations
  const cleanConvCmd = vscode.commands.registerCommand("sweep.cleanConversations", async () => {
    const report = treeDataProvider.getReport();
    const planned = planClean(report, {
      kinds: ["conversations"],
      dryRun: true,
      backup: true,
    });

    const totalToFree = planned.reduce((s, i) => s + i.bytes, 0);
    if (totalToFree === 0) {
      vscode.window.showInformationMessage("Sweep: No conversation records found.");
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `⚠️ High Risk: Delete all AI conversation records and agent memories?\nEstimated space to recover: ${formatBytes(totalToFree)} (History cannot be resumed once deleted. An automatic backup will be created).`,
      { modal: true },
      "Delete (with Backup)",
      "Dry Run"
    );

    if (confirm === "Delete (with Backup)") {
      const result = runClean(report, {
        kinds: ["conversations"],
        dryRun: false,
        backup: true,
      });
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        `Sweep: Conversations cleaned! Freed ${formatBytes(result.freedBytes)}.` +
        (result.backupDir ? ` Backup saved to: ${result.backupDir}` : "")
      );
    } else if (confirm === "Dry Run") {
      vscode.window.showInformationMessage(`Sweep [Dry Run]: Would clean ${formatBytes(totalToFree)} of conversation files without modifying data.`);
    }
  });

  // sweep.cleanCacheForTool
  const cleanCacheForToolCmd = vscode.commands.registerCommand(
    "sweep.cleanCacheForTool",
    async (node?: TreeNode) => {
      let toolId: ToolId | undefined;
      let toolName = "";

      if (node && node.type === "tool") {
        toolId = node.tool.id;
        toolName = node.tool.name;
      } else {
        const pick = await vscode.window.showQuickPick(
          TOOLS.map((t) => ({ label: t.name, id: t.id })),
          { placeHolder: "Select tool to clean cache for" }
        );
        if (!pick) return;
        toolId = pick.id as ToolId;
        toolName = pick.label;
      }

      const report = treeDataProvider.getReport();
      const result = runClean(report, {
        kinds: ["cache"],
        toolIds: [toolId],
        dryRun: false,
        backup: false,
      });
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Sweep: Cleaned ${toolName} cache, freeing ${formatBytes(result.freedBytes)}.`);
    }
  );

  // sweep.cleanConversationsForTool
  const cleanConvForToolCmd = vscode.commands.registerCommand(
    "sweep.cleanConversationsForTool",
    async (node?: TreeNode) => {
      let toolId: ToolId | undefined;
      let toolName = "";

      if (node && node.type === "tool") {
        toolId = node.tool.id;
        toolName = node.tool.name;
      } else {
        const pick = await vscode.window.showQuickPick(
          TOOLS.map((t) => ({ label: t.name, id: t.id })),
          { placeHolder: "Select tool to clean conversations for" }
        );
        if (!pick) return;
        toolId = pick.id as ToolId;
        toolName = pick.label;
      }

      const confirm = await vscode.window.showWarningMessage(
        `⚠️ Are you sure you want to delete all conversations for ${toolName}? This action is irreversible!`,
        { modal: true },
        "Delete (with Backup)",
        "Cancel"
      );

      if (confirm === "Delete (with Backup)") {
        const report = treeDataProvider.getReport();
        const result = runClean(report, {
          kinds: ["conversations"],
          toolIds: [toolId],
          dryRun: false,
          backup: true,
        });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          `Sweep: Cleaned ${toolName} conversations, freeing ${formatBytes(result.freedBytes)}.` +
          (result.backupDir ? ` Backup saved to: ${result.backupDir}` : "")
        );
      }
    }
  );

  // sweep.dryRun
  const dryRunCmd = vscode.commands.registerCommand("sweep.dryRun", async () => {
    const report = treeDataProvider.getReport();
    const planned = planClean(report, {
      kinds: ["cache", "conversations"],
      dryRun: true,
      backup: true,
    });
    const total = planned.reduce((s, i) => s + i.bytes, 0);
    const cacheSize = planned.filter((i) => i.kind === "cache").reduce((s, i) => s + i.bytes, 0);
    const convSize = total - cacheSize;

    vscode.window.showInformationMessage(
      `Sweep [Dry Run]: Would clean ${formatBytes(total)} (💾 Cache ${formatBytes(cacheSize)} · 💬 Conversations ${formatBytes(convSize)}) across ${planned.length} targets.`
    );
  });

  // sweep.expandAll & sweep.collapseAll
  const expandAllCmd = vscode.commands.registerCommand("sweep.expandAll", () => {
    treeDataProvider.refresh();
  });

  const collapseAllCmd = vscode.commands.registerCommand("sweep.collapseAll", () => {
    treeDataProvider.refresh();
  });

  context.subscriptions.push(
    treeView,
    scanCmd,
    cleanCacheCmd,
    cleanConvCmd,
    cleanCacheForToolCmd,
    cleanConvForToolCmd,
    dryRunCmd,
    expandAllCmd,
    collapseAllCmd
  );
}

export function deactivate() {}
