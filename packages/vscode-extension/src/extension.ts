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

export class ToolNode {
  readonly type = "tool" as const;
  readonly parent = undefined;
  targets: TargetNode[] = [];

  constructor(
    public readonly tool: ToolDef,
    public readonly entries: ScanEntry[],
    public readonly totalBytes: number,
    public readonly cacheBytes: number,
    public readonly convBytes: number
  ) {}
}

export class TargetNode {
  readonly type = "target" as const;
  paths: PathNode[] = [];

  constructor(
    public readonly parent: ToolNode,
    public readonly toolId: ToolId,
    public readonly targetId: string,
    public readonly label: string,
    public readonly kind: CleanKind,
    public readonly risk: string,
    public readonly entries: ScanEntry[],
    public readonly totalBytes: number
  ) {}
}

export class PathNode {
  readonly type = "path" as const;

  constructor(
    public readonly parent: TargetNode,
    public readonly entry: ScanEntry
  ) {}
}

export type TreeNode = ToolNode | TargetNode | PathNode;

export class SweepTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private report: ScanReport | null = null;
  private rootNodes: ToolNode[] = [];

  constructor() {
    this.refresh();
  }

  getReport(): ScanReport {
    if (!this.report) {
      this.report = scanDisk();
      this.buildTree();
    }
    return this.report;
  }

  getRootNodes(): ToolNode[] {
    if (this.rootNodes.length === 0) {
      this.getReport();
    }
    return this.rootNodes;
  }

  private buildTree(): void {
    if (!this.report) return;
    const report = this.report;

    this.rootNodes = TOOLS.map((tool) => {
      const toolEntries = report.entries.filter((e) => e.toolId === tool.id);
      const presentEntries = toolEntries.filter((e) => e.exists);
      const totalBytes = presentEntries.reduce((s, e) => s + e.bytes, 0);
      const cacheBytes = presentEntries
        .filter((e) => e.kind === "cache")
        .reduce((s, e) => s + e.bytes, 0);
      const convBytes = totalBytes - cacheBytes;

      const toolNode = new ToolNode(tool, toolEntries, totalBytes, cacheBytes, convBytes);

      toolNode.targets = tool.targets.map((target) => {
        const targetEntries = toolEntries.filter((e) => e.targetId === target.id);
        const targetTotalBytes = targetEntries
          .filter((e) => e.exists)
          .reduce((s, e) => s + e.bytes, 0);

        const targetNode = new TargetNode(
          toolNode,
          tool.id,
          target.id,
          target.label,
          target.kind,
          target.risk,
          targetEntries,
          targetTotalBytes
        );

        targetNode.paths = targetEntries.map((entry) => new PathNode(targetNode, entry));
        return targetNode;
      });

      return toolNode;
    });
  }

  refresh(): ScanReport {
    this.report = scanDisk();
    this.buildTree();
    this._onDidChangeTreeData.fire();
    return this.report;
  }

  getParent(element: TreeNode): TreeNode | undefined {
    return element.parent;
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element instanceof ToolNode) {
      const { tool, totalBytes, cacheBytes, convBytes } = element;
      const blurb = vscode.l10n.t(tool.blurb);
      const localizedNotes = tool.notes.map((n) => vscode.l10n.t(n));

      const item = new vscode.TreeItem(
        tool.name,
        totalBytes > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
      );

      item.contextValue = `tool:${tool.id}`;
      item.description = totalBytes > 0
        ? `${formatBytes(totalBytes)} (💾 ${formatBytes(cacheBytes)} · 💬 ${formatBytes(convBytes)})`
        : vscode.l10n.t("0 B (not found)");

      item.tooltip = new vscode.MarkdownString(
        `### ${tool.name}\n\n` +
        `**${blurb}**\n\n` +
        `• 💾 **${vscode.l10n.t("Cache")}**: ${formatBytes(cacheBytes)}\n` +
        `• 💬 **${vscode.l10n.t("Conversations")}**: ${formatBytes(convBytes)}\n` +
        `• 📦 **${vscode.l10n.t("Total")}**: ${formatBytes(totalBytes)}\n\n` +
        (localizedNotes.length > 0 ? `*${localizedNotes.join("\n\n")}*` : "")
      );

      item.iconPath = totalBytes > 0
        ? new vscode.ThemeIcon("robot")
        : new vscode.ThemeIcon("circle-slash");

      return item;
    }

    if (element instanceof TargetNode) {
      const { label, kind, risk, totalBytes, entries, targetId, toolId } = element;
      const rawTarget = TOOLS.find((t) => t.id === toolId)?.targets.find((tgt) => tgt.id === targetId);
      const displayLabel = vscode.l10n.t(label);
      const displayDesc = rawTarget ? vscode.l10n.t(rawTarget.description) : "";

      const existingEntries = entries.filter((e) => e.exists);
      const totalFiles = existingEntries.reduce((s, e) => s + e.fileCount, 0);

      const kindIcon = kind === "cache" ? "💾" : "💬";
      const riskBadge = risk === "high" ? "🔴" : "🟡";

      const item = new vscode.TreeItem(
        `${displayLabel} ${kindIcon} ${riskBadge}`,
        entries.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      item.contextValue = `target:${element.targetId}`;
      item.description = totalBytes > 0
        ? `${formatBytes(totalBytes)} (${vscode.l10n.t("{0} files", totalFiles)})`
        : vscode.l10n.t("not found");

      item.tooltip = new vscode.MarkdownString(
        `### ${displayLabel}\n\n` +
        (displayDesc ? `**${displayDesc}**\n\n` : "") +
        `• 📦 **${vscode.l10n.t("Total")}**: ${formatBytes(totalBytes)} (${vscode.l10n.t("{0} files", totalFiles)})\n` +
        `• 🏷️ **${vscode.l10n.t("Category")}**: ${kind === "cache" ? vscode.l10n.t("Cache (Safe to delete)") : vscode.l10n.t("Conversations (High Risk)")}`
      );

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
      item.description = `${formatBytes(entry.bytes)} (${vscode.l10n.t("{0} files", entry.fileCount)})`;
      item.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
      item.tooltip = `${entry.path}\n${vscode.l10n.t("Size: {0} ({1} files)", formatBytes(entry.bytes), entry.fileCount)}`;
    } else {
      item.description = vscode.l10n.t("(not found)");
      item.iconPath = new vscode.ThemeIcon("circle-slash", new vscode.ThemeColor("disabledForeground"));
      item.tooltip = vscode.l10n.t("{0} (Not present on this machine)", entry.path);
    }

    return item;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.getRootNodes();
    }
    if (element instanceof ToolNode) {
      return element.targets;
    }
    if (element instanceof TargetNode) {
      return element.paths;
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
        title: vscode.l10n.t("Sweep: Scanning AI tool caches and conversation histories..."),
        cancellable: false,
      },
      async () => {
        const report = treeDataProvider.refresh();
        const msg = vscode.l10n.t(
          "Sweep scan complete: Found {0} (💾 Cache {1} · 💬 Conversations {2}).",
          formatBytes(report.totalBytes),
          formatBytes(report.cacheBytes),
          formatBytes(report.conversationBytes)
        );
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
      vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No cleanable cache found."));
      return;
    }

    const btnClean = vscode.l10n.t("Clean Cache");
    const btnDryRun = vscode.l10n.t("Dry Run");

    const confirm = await vscode.window.showInformationMessage(
      vscode.l10n.t(
        "Clean all AI tool cache files? Estimated space to recover: {0} (Safe operation, conversations will be kept).",
        formatBytes(totalToFree)
      ),
      { modal: true },
      btnClean,
      btnDryRun
    );

    if (confirm === btnClean) {
      const result = runClean(report, {
        kinds: ["cache"],
        dryRun: false,
        backup: false,
      });
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep: Cache cleaned successfully! Freed {0}.", formatBytes(result.freedBytes))
      );
    } else if (confirm === btnDryRun) {
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep [Dry Run]: Would free {0} of cache without deleting any files.", formatBytes(totalToFree))
      );
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
      vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No conversation records found."));
      return;
    }

    const btnDelete = vscode.l10n.t("Delete (with Backup)");
    const btnDryRun = vscode.l10n.t("Dry Run");

    const confirm = await vscode.window.showWarningMessage(
      vscode.l10n.t(
        "⚠️ High Risk: Delete all AI conversation records and agent memories?\nEstimated space to recover: {0} (History cannot be resumed once deleted. An automatic backup will be created).",
        formatBytes(totalToFree)
      ),
      { modal: true },
      btnDelete,
      btnDryRun
    );

    if (confirm === btnDelete) {
      const result = runClean(report, {
        kinds: ["conversations"],
        dryRun: false,
        backup: true,
      });
      treeDataProvider.refresh();
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep: Conversations cleaned! Freed {0}.", formatBytes(result.freedBytes)) +
        (result.backupDir ? vscode.l10n.t(" Backup saved to: {0}", result.backupDir) : "")
      );
    } else if (confirm === btnDryRun) {
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep [Dry Run]: Would clean {0} of conversation files without modifying data.", formatBytes(totalToFree))
      );
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
          { placeHolder: vscode.l10n.t("Select tool to clean cache for") }
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
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep: Cleaned {0} cache, freeing {1}.", toolName, formatBytes(result.freedBytes))
      );
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
          { placeHolder: vscode.l10n.t("Select tool to clean conversations for") }
        );
        if (!pick) return;
        toolId = pick.id as ToolId;
        toolName = pick.label;
      }

      const btnDelete = vscode.l10n.t("Delete (with Backup)");
      const btnCancel = vscode.l10n.t("Cancel");

      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "⚠️ Are you sure you want to delete all conversations for {0}? This action is irreversible!",
          toolName
        ),
        { modal: true },
        btnDelete,
        btnCancel
      );

      if (confirm === btnDelete) {
        const report = treeDataProvider.getReport();
        const result = runClean(report, {
          kinds: ["conversations"],
          toolIds: [toolId],
          dryRun: false,
          backup: true,
        });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Cleaned {0} conversations, freeing {1}.", toolName, formatBytes(result.freedBytes)) +
          (result.backupDir ? vscode.l10n.t(" Backup saved to: {0}", result.backupDir) : "")
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
      vscode.l10n.t(
        "Sweep [Dry Run]: Would clean {0} (💾 Cache {1} · 💬 Conversations {2}) across {3} targets.",
        formatBytes(total),
        formatBytes(cacheSize),
        formatBytes(convSize),
        planned.length
      )
    );
  });

  context.subscriptions.push(
    treeView,
    scanCmd,
    cleanCacheCmd,
    cleanConvCmd,
    cleanCacheForToolCmd,
    cleanConvForToolCmd,
    dryRunCmd
  );
}

export function deactivate() {}
