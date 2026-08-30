import * as vscode from "vscode";
import { writeFileSync } from "node:fs";
import {
  scanDisk,
  runClean,
  planClean,
  formatBytes,
  TOOLS,
  scanSessions,
  filterSessions,
  cleanSessions,
  exportSessionToMarkdown,
  exportSessionToJson,
  listBackups,
  pruneBackups,
  restoreBackup,
  getLatestBackup,
  loadConfig,
  saveConfig,
  getConfigPath,
  addToWhitelist,
  removeFromWhitelist,
  type ToolDef,
  type ScanReport,
  type ScanEntry,
  type CleanKind,
  type ToolId,
  type ConversationSession,
  type BackupSummary,
  type SweepConfig,
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
  sessions: SessionNode[] = [];

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

export class SessionNode {
  readonly type = "session" as const;

  constructor(
    public readonly parent: TargetNode,
    public readonly session: ConversationSession
  ) {}
}

export type TreeNode = ToolNode | TargetNode | PathNode | SessionNode;

export function getEffectiveConfig(): SweepConfig {
  const diskConfig = loadConfig();
  const vsConfig = vscode.workspace.getConfiguration("sweep");

  const rawCustom = vsConfig.get("customPaths");
  const vsCustomPaths = rawCustom && typeof rawCustom === "object" && !Array.isArray(rawCustom) ? rawCustom : {};
  const customPaths = {
    ...diskConfig.customPaths,
    ...vsCustomPaths,
  };

  const rawPatterns = vsConfig.get("excludePatterns");
  const extraPatterns = Array.isArray(rawPatterns) ? rawPatterns : [];
  const rawProjects = vsConfig.get("whitelistProjects");
  const extraProjects = Array.isArray(rawProjects) ? rawProjects : [];

  const patterns = Array.from(
    new Set([...(diskConfig.whitelist.patterns || []), ...extraPatterns])
  );
  const projects = Array.from(
    new Set([...(diskConfig.whitelist.projects || []), ...extraProjects])
  );

  return {
    version: diskConfig.version,
    customPaths: customPaths as SweepConfig["customPaths"],
    whitelist: {
      projects,
      patterns,
      sessionIds: diskConfig.whitelist.sessionIds || [],
    },
    defaults: {
      backupBeforeClean:
        vsConfig.get<boolean>("backupBeforeClean") ?? diskConfig.defaults?.backupBeforeClean ?? true,
      olderThanDays: diskConfig.defaults?.olderThanDays ?? 30,
    },
  };
}

export class SweepTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private report: ScanReport | null = null;
  private sessions: ConversationSession[] = [];
  private rootNodes: ToolNode[] = [];

  constructor() {
    this.refresh();
  }

  getReport(): ScanReport {
    if (!this.report) {
      const config = getEffectiveConfig();
      this.report = scanDisk({ config });
      this.sessions = scanSessions({ config });
      this.buildTree();
    }
    return this.report;
  }

  getSessions(): ConversationSession[] {
    if (!this.sessions || this.sessions.length === 0) {
      const config = getEffectiveConfig();
      this.sessions = scanSessions({ config });
    }
    return this.sessions;
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
    const allSessions = this.sessions || [];
    const vsConfig = vscode.workspace.getConfiguration("sweep");
    const hideUninstalled = vsConfig.get<boolean>("hideUninstalledTools", true);

    this.rootNodes = TOOLS.map((tool) => {
      const toolEntries = report.entries.filter((e) => e.toolId === tool.id);
      const presentEntries = toolEntries.filter((e) => e.exists);
      const totalBytes = presentEntries.reduce((s, e) => s + e.bytes, 0);
      const cacheBytes = presentEntries
        .filter((e) => e.kind === "cache")
        .reduce((s, e) => s + e.bytes, 0);
      const convBytes = totalBytes - cacheBytes;

      const toolNode = new ToolNode(tool, toolEntries, totalBytes, cacheBytes, convBytes);

      let targetList = tool.targets.map((target) => {
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

        targetNode.paths = targetEntries
          .filter((entry) => !hideUninstalled || entry.exists)
          .map((entry) => new PathNode(targetNode, entry));

        // If target is conversation, attach matching scanned individual sessions
        if (target.kind === "conversations") {
          const matchingSessions = allSessions.filter(
            (s) => s.toolId === tool.id && s.targetId === target.id
          );
          targetNode.sessions = matchingSessions.map((s) => new SessionNode(targetNode, s));
        }

        return targetNode;
      });

      if (hideUninstalled) {
        targetList = targetList.filter((t) => t.totalBytes > 0 || t.sessions.length > 0);
      }

      toolNode.targets = targetList;
      return toolNode;
    });

    if (hideUninstalled) {
      this.rootNodes = this.rootNodes.filter((n) => n.totalBytes > 0);
    }
  }

  refresh(): ScanReport {
    const config = getEffectiveConfig();
    this.report = scanDisk({ config });
    this.sessions = scanSessions({ config });
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
      item.description =
        totalBytes > 0
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

      item.iconPath =
        totalBytes > 0
          ? new vscode.ThemeIcon("robot")
          : new vscode.ThemeIcon("circle-slash");

      return item;
    }

    if (element instanceof TargetNode) {
      const { label, kind, risk, totalBytes, entries, targetId, toolId, sessions } = element;
      const rawTarget = TOOLS.find((t) => t.id === toolId)?.targets.find((tgt) => tgt.id === targetId);
      const displayLabel = vscode.l10n.t(label);
      const displayDesc = rawTarget ? vscode.l10n.t(rawTarget.description) : "";

      const existingEntries = entries.filter((e) => e.exists);
      const totalFiles = existingEntries.reduce((s, e) => s + e.fileCount, 0);

      const kindIcon = kind === "cache" ? "💾" : "💬";
      const riskBadge = risk === "high" ? "🔴" : "🟡";

      const hasChildren = sessions.length > 0 || entries.length > 0;

      const item = new vscode.TreeItem(
        `${displayLabel} ${kindIcon} ${riskBadge}`,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      item.contextValue = `target:${element.targetId}`;
      item.description =
        totalBytes > 0
          ? `${formatBytes(totalBytes)} (${vscode.l10n.t("{0} files", totalFiles)})`
          : vscode.l10n.t("not found");

      item.tooltip = new vscode.MarkdownString(
        `### ${displayLabel}\n\n` +
          (displayDesc ? `**${displayDesc}**\n\n` : "") +
          `• 📦 **${vscode.l10n.t("Total")}**: ${formatBytes(totalBytes)} (${vscode.l10n.t("{0} files", totalFiles)})\n` +
          `• 🏷️ **${vscode.l10n.t("Category")}**: ${
            kind === "cache"
              ? vscode.l10n.t("Cache (Safe to delete)")
              : vscode.l10n.t("Conversations (High Risk)")
          }`
      );

      item.iconPath =
        kind === "cache"
          ? new vscode.ThemeIcon("database")
          : risk === "high"
          ? new vscode.ThemeIcon("comment-discussion")
          : new vscode.ThemeIcon("shield");

      return item;
    }

    if (element instanceof SessionNode) {
      const { session } = element;
      const title = session.title || session.id;
      const isWhitelisted = Boolean(session.isWhitelisted);

      // Clean display title without bracket prefixes
      const item = new vscode.TreeItem(
        title,
        vscode.TreeItemCollapsibleState.None
      );

      item.contextValue = isWhitelisted ? "sessionEntry:whitelisted" : "sessionEntry";
      const projectPart = session.projectName ? ` · 📁 ${session.projectName}` : "";
      item.description = `${formatBytes(session.bytes)} · ${session.ageDays}d${projectPart}${isWhitelisted ? " · 🛡️ Whitelisted" : ""}`;
      item.iconPath = isWhitelisted
        ? new vscode.ThemeIcon("shield", new vscode.ThemeColor("charts.green"))
        : new vscode.ThemeIcon("comment");

      const associatedInfo =
        session.associatedPaths && session.associatedPaths.length > 1
          ? `\n• **Linked Storage Paths (${session.associatedPaths.length})**:\n` +
            session.associatedPaths.map((p) => `  - \`${p}\``).join("\n")
          : `\n• **Path**: \`${session.path}\``;

      item.tooltip = new vscode.MarkdownString(
        `### ${title}${isWhitelisted ? " 🛡️ [Whitelisted / Protected]" : ""}\n\n` +
          `• **Session ID**: \`${session.id}\`\n` +
          (session.projectName ? `• **Project**: \`${session.projectName}\`\n` : "") +
          `• **Tool**: ${session.toolName}\n` +
          `• **Status**: ${isWhitelisted ? "🛡️ Protected by Whitelist" : "Normal"}\n` +
          `• **Total Size**: ${formatBytes(session.bytes)} (${session.fileCount} files)\n` +
          `• **Age**: ${session.ageDays} days ago (${session.updatedAt})` +
          associatedInfo
      );

      return item;
    }

    // Path level
    const { entry } = element;
    const item = new vscode.TreeItem(entry.path, vscode.TreeItemCollapsibleState.None);

    const isWhitelisted = Boolean(entry.isWhitelisted);
    item.contextValue = isWhitelisted ? "pathEntry:whitelisted" : "pathEntry";

    if (entry.exists) {
      item.description = isWhitelisted
        ? `${formatBytes(entry.bytes)} (🛡️ Whitelisted)`
        : `${formatBytes(entry.bytes)} (${vscode.l10n.t("{0} files", entry.fileCount)})`;
      item.iconPath = isWhitelisted
        ? new vscode.ThemeIcon("shield", new vscode.ThemeColor("charts.green"))
        : new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
      item.tooltip = `${entry.path}\n${vscode.l10n.t(
        "Size: {0} ({1} files)",
        formatBytes(entry.bytes),
        entry.fileCount
      )}${isWhitelisted ? " (Protected by Whitelist)" : ""}`;
    } else {
      item.description = vscode.l10n.t("(not found)");
      item.iconPath = new vscode.ThemeIcon(
        "circle-slash",
        new vscode.ThemeColor("disabledForeground")
      );
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
      if (element.sessions.length > 0) {
        return element.sessions;
      }
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
        vscode.l10n.t(
          "Sweep [Dry Run]: Would free {0} of cache without deleting any files.",
          formatBytes(totalToFree)
        )
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
        vscode.l10n.t(
          "Sweep [Dry Run]: Would clean {0} of conversation files without modifying data.",
          formatBytes(totalToFree)
        )
      );
    }
  });

  // sweep.cleanSessionsOlderThan
  const cleanOlderThanCmd = vscode.commands.registerCommand(
    "sweep.cleanSessionsOlderThan",
    async () => {
      const choice = await vscode.window.showQuickPick(
        [
          { label: "7 days ago (>7d)", days: 7 },
          { label: "14 days ago (>14d)", days: 14 },
          { label: "30 days ago (>30d)", days: 30 },
          { label: "90 days ago (>90d)", days: 90 },
        ],
        { placeHolder: vscode.l10n.t("Select age threshold to clean conversations") }
      );
      if (!choice) return;

      const allSessions = treeDataProvider.getSessions();
      const matched = filterSessions(allSessions, { olderThanDays: choice.days });

      if (matched.length === 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t("No sessions found older than {0} days.", choice.days)
        );
        return;
      }

      const totalSize = matched.reduce((s, x) => s + x.bytes, 0);
      const btnDelete = vscode.l10n.t("Delete {0} sessions ({1})", matched.length, formatBytes(totalSize));
      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Found {0} sessions older than {1} days ({2}). Clean them with automatic backup?",
          matched.length,
          choice.days,
          formatBytes(totalSize)
        ),
        { modal: true },
        btnDelete
      );

      if (confirm === btnDelete) {
        const res = cleanSessions(matched, { dryRun: false, backup: true });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Freed {0} across {1} sessions.", formatBytes(res.freedBytes), res.items.length) +
            (res.backupDir ? vscode.l10n.t(" Backup saved to: {0}", res.backupDir) : "")
        );
      }
    }
  );

  // sweep.cleanLargeSessions
  const cleanLargeSessionsCmd = vscode.commands.registerCommand(
    "sweep.cleanLargeSessions",
    async () => {
      const allSessions = treeDataProvider.getSessions();
      const largeSessions = filterSessions(allSessions, { minBytes: 50 * 1024 * 1024 });

      if (largeSessions.length === 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: No large sessions (>50MB) detected.")
        );
        return;
      }

      const totalSize = largeSessions.reduce((s, x) => s + x.bytes, 0);
      const btnDelete = vscode.l10n.t("Delete {0} large sessions ({1})", largeSessions.length, formatBytes(totalSize));
      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Found {0} large sessions (>50MB) consuming {1}. Clean them with automatic backup?",
          largeSessions.length,
          formatBytes(totalSize)
        ),
        { modal: true },
        btnDelete
      );

      if (confirm === btnDelete) {
        const res = cleanSessions(largeSessions, { dryRun: false, backup: true });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Freed {0} from large sessions.", formatBytes(res.freedBytes)) +
            (res.backupDir ? vscode.l10n.t(" Backup saved to: {0}", res.backupDir) : "")
        );
      }
    }
  );

  // sweep.pickSessionsToClean
  const pickSessionsToCleanCmd = vscode.commands.registerCommand(
    "sweep.pickSessionsToClean",
    async () => {
      const allSessions = treeDataProvider.getSessions();
      if (allSessions.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t("No sessions found to clean."));
        return;
      }

      const items = allSessions.map((s) => ({
        label: `[${s.toolName}] ${s.title || s.id}`,
        description: `${formatBytes(s.bytes)} · ${s.ageDays}d ago`,
        detail: `${s.projectName ? `Project: ${s.projectName} · ` : ""}${s.path}`,
        session: s,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: vscode.l10n.t("Check the conversation sessions you want to delete"),
      });

      if (!picked || picked.length === 0) return;

      const sessionsToDelete = picked.map((p) => p.session);
      const totalSize = sessionsToDelete.reduce((s, x) => s + x.bytes, 0);

      const btnDelete = vscode.l10n.t("Delete ({0})", formatBytes(totalSize));
      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Are you sure you want to delete {0} selected sessions ({1})?",
          sessionsToDelete.length,
          formatBytes(totalSize)
        ),
        { modal: true },
        btnDelete
      );

      if (confirm === btnDelete) {
        const res = cleanSessions(sessionsToDelete, { dryRun: false, backup: true });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Deleted {0} sessions, freeing {1}.", res.items.length, formatBytes(res.freedBytes)) +
            (res.backupDir ? vscode.l10n.t(" Backup saved to: {0}", res.backupDir) : "")
        );
      }
    }
  );

  // sweep.exportSession
  const exportSessionCmd = vscode.commands.registerCommand(
    "sweep.exportSession",
    async (node?: TreeNode) => {
      let session: ConversationSession | undefined;

      if (node && node.type === "session") {
        session = node.session;
      } else {
        const allSessions = treeDataProvider.getSessions();
        if (allSessions.length === 0) {
          vscode.window.showInformationMessage(vscode.l10n.t("No sessions available to export."));
          return;
        }
        const picked = await vscode.window.showQuickPick(
          allSessions.map((s) => ({
            label: `[${s.toolName}] ${s.title || s.id}`,
            description: `${formatBytes(s.bytes)} · ${s.ageDays}d ago`,
            detail: `${s.projectName ? `Project: ${s.projectName} · ` : ""}${s.path}`,
            session: s,
          })),
          { placeHolder: vscode.l10n.t("Select conversation session to export") }
        );
        if (!picked) return;
        session = picked.session;
      }

      const formatPick = await vscode.window.showQuickPick(
        [
          { label: "Markdown (.md)", format: "md" as const },
          { label: "JSON (.json)", format: "json" as const },
        ],
        { placeHolder: vscode.l10n.t("Select export format") }
      );
      if (!formatPick) return;

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${session.toolId}-${session.id.slice(0, 16)}.${formatPick.format}`),
        filters:
          formatPick.format === "md"
            ? { Markdown: ["md", "markdown"] }
            : { JSON: ["json"] },
      });

      if (!uri) return;

      const content =
        formatPick.format === "md"
          ? exportSessionToMarkdown(session)
          : exportSessionToJson(session);

      writeFileSync(uri.fsPath, content, "utf-8");

      const openBtn = vscode.l10n.t("Open File");
      const chosen = await vscode.window.showInformationMessage(
        vscode.l10n.t("Session exported successfully to: {0}", uri.fsPath),
        openBtn
      );
      if (chosen === openBtn) {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      }
    }
  );

  // sweep.cleanSingleSession
  const cleanSingleSessionCmd = vscode.commands.registerCommand(
    "sweep.cleanSingleSession",
    async (node?: TreeNode) => {
      if (!node || node.type !== "session") return;
      const session = node.session;
      const btnDelete = vscode.l10n.t("Delete (with Backup)");

      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Delete session \"{0}\" ({1})? An automatic backup will be created.",
          session.title || session.id,
          formatBytes(session.bytes)
        ),
        { modal: true },
        btnDelete
      );

      if (confirm === btnDelete) {
        const res = cleanSessions([session], { dryRun: false, backup: true });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Session deleted, freed {0}.", formatBytes(res.freedBytes)) +
            (res.backupDir ? vscode.l10n.t(" Backup saved to: {0}", res.backupDir) : "")
        );
      }
    }
  );

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

  // sweep.listBackups
  const listBackupsCmd = vscode.commands.registerCommand("sweep.listBackups", async () => {
    const backups = listBackups();
    if (backups.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No backup archives found in ~/.sweep/backups."));
      return;
    }

    const items = backups.map((b) => ({
      label: `$(archive) ${b.backupId}`,
      description: formatBytes(b.totalBytes),
      detail: `${b.toolIds.join(", ") || "all"} · ${b.itemCount} items · ${b.isoDate}`,
      backup: b,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: vscode.l10n.t("Select a backup archive to manage or restore"),
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!picked) return;

    const action = await vscode.window.showQuickPick(
      [
        { label: "$(history) " + vscode.l10n.t("Restore from this backup"), id: "restore" },
        { label: "$(folder-opened) " + vscode.l10n.t("Open backup folder"), id: "open" },
      ],
      { placeHolder: vscode.l10n.t("Choose action for backup {0}", picked.backup.backupId) }
    );

    if (!action) return;

    if (action.id === "restore") {
      vscode.commands.executeCommand("sweep.restoreBackup", picked.backup.backupId);
    } else if (action.id === "open") {
      vscode.commands.executeCommand("sweep.openBackupFolder", picked.backup.backupDir);
    }
  });

  // sweep.restoreBackup
  const restoreBackupCmd = vscode.commands.registerCommand(
    "sweep.restoreBackup",
    async (backupId?: string) => {
      let targetId = backupId;
      if (!targetId) {
        const backups = listBackups();
        if (backups.length === 0) {
          vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No backup archives found to restore."));
          return;
        }
        const picked = await vscode.window.showQuickPick(
          backups.map((b) => ({
            label: `$(archive) ${b.backupId}`,
            description: formatBytes(b.totalBytes),
            detail: `${b.toolIds.join(", ") || "all"} · ${b.itemCount} items · ${b.isoDate}`,
            id: b.backupId,
          })),
          { placeHolder: vscode.l10n.t("Select backup archive to restore from") }
        );
        if (!picked) return;
        targetId = picked.id;
      }

      const btnRestore = vscode.l10n.t("Confirm Restore");
      const btnCancel = vscode.l10n.t("Cancel");

      const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          "⚠️ Are you sure you want to restore from backup \"{0}\"? This will overwrite existing AI conversation records and caches.",
          targetId
        ),
        { modal: true },
        btnRestore,
        btnCancel
      );

      if (confirm !== btnRestore) return;

      try {
        const res = restoreBackup(targetId, { overwrite: true, dryRun: false });
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(
          vscode.l10n.t(
            "Sweep: Successfully restored {0} items ({1}) from backup {2}.",
            res.restoredCount,
            formatBytes(res.restoredBytes),
            targetId
          )
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("Sweep Restore Failed: {0}", (err as Error).message)
        );
      }
    }
  );

  // sweep.openBackupFolder
  const openBackupFolderCmd = vscode.commands.registerCommand(
    "sweep.openBackupFolder",
    async (targetPath?: string) => {
      let folderPath = targetPath;
      if (!folderPath) {
        const backups = listBackups();
        if (backups.length > 0) {
          folderPath = backups[0].backupDir;
        } else {
          vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No backup folder found."));
          return;
        }
      }
      vscode.env.openExternal(vscode.Uri.file(folderPath));
    }
  );

  // sweep.pruneBackups
  const pruneBackupsCmd = vscode.commands.registerCommand("sweep.pruneBackups", async () => {
    const backups = listBackups();
    if (backups.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No backups found to prune."));
      return;
    }

    const options = [
      { label: vscode.l10n.t("Older than 7 days"), days: 7 },
      { label: vscode.l10n.t("Older than 14 days (Recommended)"), days: 14 },
      { label: vscode.l10n.t("Older than 30 days"), days: 30 },
      { label: vscode.l10n.t("Keep only latest 5 backups"), keepLatest: 5 },
    ];

    const pick = await vscode.window.showQuickPick(options, {
      placeHolder: vscode.l10n.t("Select backup retention policy to prune expired archives"),
    });
    if (!pick) return;

    const dryResult = pruneBackups(undefined, {
      olderThanDays: pick.days,
      keepLatest: pick.keepLatest,
      dryRun: true,
    });

    if (dryResult.prunedBackups.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t("Sweep: No backups matched the selected prune criteria."));
      return;
    }

    const btnPrune = vscode.l10n.t("Prune {0} backups ({1})", dryResult.prunedBackups.length, formatBytes(dryResult.freedBytes));
    const btnCancel = vscode.l10n.t("Cancel");

    const confirm = await vscode.window.showWarningMessage(
      vscode.l10n.t(
        "Pruning will permanently delete {0} backup archives, freeing {1}. Proceed?",
        dryResult.prunedBackups.length,
        formatBytes(dryResult.freedBytes)
      ),
      { modal: true },
      btnPrune,
      btnCancel
    );

    if (confirm === btnPrune) {
      const realResult = pruneBackups(undefined, {
        olderThanDays: pick.days,
        keepLatest: pick.keepLatest,
        dryRun: false,
      });
      vscode.window.showInformationMessage(
        vscode.l10n.t(
          "Sweep: Successfully pruned {0} backups, freeing {1}.",
          realResult.prunedBackups.length,
          formatBytes(realResult.freedBytes)
        )
      );
    }
  });

  // sweep.addToWhitelist
  const addToWhitelistCmd = vscode.commands.registerCommand(
    "sweep.addToWhitelist",
    async (node?: TreeNode) => {
      if (node instanceof SessionNode) {
        const { session } = node;
        const pick = await vscode.window.showQuickPick(
          [
            {
              label: vscode.l10n.t("Protect Session ID: {0}", session.id),
              type: "session" as const,
              val: session.id,
            },
            ...(session.projectName
              ? [
                  {
                    label: vscode.l10n.t("Protect Entire Project: {0}", session.projectName),
                    type: "project" as const,
                    val: session.projectName,
                  },
                ]
              : []),
            {
              label: vscode.l10n.t("Protect Path Pattern: {0}", session.path),
              type: "pattern" as const,
              val: session.path,
            },
          ],
          { placeHolder: vscode.l10n.t("Select whitelist protection scope") }
        );
        if (!pick) return;
        addToWhitelist({ type: pick.type, value: pick.val });
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Added \"{0}\" to whitelist.", pick.val)
        );
        treeDataProvider.refresh();
        return;
      }

      if (node instanceof PathNode) {
        addToWhitelist({ type: "pattern", value: node.entry.path });
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Added \"{0}\" to whitelist.", node.entry.path)
        );
        treeDataProvider.refresh();
        return;
      }

      const input = await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Enter project name, glob pattern, or session ID to protect"),
        placeHolder: "e.g. my-project, **/keep-*/**, or session UUID",
      });
      if (!input || !input.trim()) return;
      const trimmed = input.trim();
      let type: "project" | "pattern" | "session" = "project";
      if (trimmed.includes("*") || trimmed.includes("/") || trimmed.includes("\\")) {
        type = "pattern";
      } else if (/^[0-9a-f-]{16,}$/i.test(trimmed)) {
        type = "session";
      }

      addToWhitelist({ type, value: trimmed });
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep: Added \"{0}\" to whitelist.", trimmed)
      );
      treeDataProvider.refresh();
    }
  );

  // sweep.removeFromWhitelist
  const removeFromWhitelistCmd = vscode.commands.registerCommand(
    "sweep.removeFromWhitelist",
    async (node?: TreeNode) => {
      if (node instanceof SessionNode) {
        const { session } = node;
        removeFromWhitelist({ type: "session", value: session.id });
        if (session.projectName) {
          removeFromWhitelist({ type: "project", value: session.projectName });
        }
        removeFromWhitelist({ type: "pattern", value: session.path });
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Removed \"{0}\" from whitelist.", session.title || session.id)
        );
        treeDataProvider.refresh();
        return;
      }

      if (node instanceof PathNode) {
        removeFromWhitelist({ type: "pattern", value: node.entry.path });
        vscode.window.showInformationMessage(
          vscode.l10n.t("Sweep: Removed \"{0}\" from whitelist.", node.entry.path)
        );
        treeDataProvider.refresh();
        return;
      }

      const cfg = loadConfig();
      const items = [
        ...(cfg.whitelist.projects || []).map((p) => ({
          label: `📁 Project: ${p}`,
          type: "project" as const,
          val: p,
        })),
        ...(cfg.whitelist.patterns || []).map((pat) => ({
          label: `🧩 Pattern: ${pat}`,
          type: "pattern" as const,
          val: pat,
        })),
        ...(cfg.whitelist.sessionIds || []).map((s) => ({
          label: `💬 Session: ${s}`,
          type: "session" as const,
          val: s,
        })),
      ];

      if (items.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t("Sweep: Whitelist is currently empty."));
        return;
      }

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t("Select item to remove from whitelist"),
      });
      if (!pick) return;

      removeFromWhitelist({ type: pick.type, value: pick.val });
      vscode.window.showInformationMessage(
        vscode.l10n.t("Sweep: Removed \"{0}\" from whitelist.", pick.val)
      );
      treeDataProvider.refresh();
    }
  );

  // sweep.openConfigFile
  const openConfigFileCmd = vscode.commands.registerCommand("sweep.openConfigFile", async () => {
    const cfgPath = getConfigPath();
    // Ensure file exists on disk
    loadConfig();
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(cfgPath));
    await vscode.window.showTextDocument(doc);
  });

  context.subscriptions.push(
    treeView,
    scanCmd,
    cleanCacheCmd,
    cleanConvCmd,
    cleanOlderThanCmd,
    cleanLargeSessionsCmd,
    pickSessionsToCleanCmd,
    exportSessionCmd,
    cleanSingleSessionCmd,
    cleanCacheForToolCmd,
    cleanConvForToolCmd,
    dryRunCmd,
    listBackupsCmd,
    restoreBackupCmd,
    openBackupFolderCmd,
    pruneBackupsCmd,
    addToWhitelistCmd,
    removeFromWhitelistCmd,
    openConfigFileCmd
  );
}

export function deactivate() {}

