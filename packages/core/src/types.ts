export type Platform = "win" | "mac" | "linux";

export type CleanKind = "cache" | "conversations";

export type Risk = "low" | "high";

export type ToolId =
  | "antigravity"
  | "codex"
  | "claude-code"
  | "windsurf"
  | "kiro"
  | "trae";

export type PathSet = {
  win: string[];
  mac: string[];
  linux: string[];
};

export type Target = {
  id: string;
  label: string;
  kind: CleanKind;
  risk: Risk;
  description: string;
  paths: PathSet;
};

export type ToolDef = {
  id: ToolId;
  name: string;
  shortName: string;
  products: string[];
  blurb: string;
  notes: string[];
  targets: Target[];
};

export type ResolvedTarget = {
  toolId: ToolId;
  toolName: string;
  target: Target;
  resolvedPaths: string[];
};

export type WhitelistRules = {
  projects?: string[];
  patterns?: string[];
  sessionIds?: string[];
};

export type SweepConfig = {
  version: string;
  customPaths?: Partial<Record<ToolId, string[]>>;
  whitelist: WhitelistRules;
  defaults?: {
    backupBeforeClean?: boolean;
    olderThanDays?: number;
  };
};

export type ScanEntry = {
  toolId: ToolId;
  toolName: string;
  targetId: string;
  label: string;
  kind: CleanKind;
  risk: Risk;
  path: string;
  exists: boolean;
  bytes: number;
  fileCount: number;
  isWhitelisted?: boolean;
  error?: string;
};

export type ScanReport = {
  scannedAt: string;
  platform: Platform;
  home: string;
  entries: ScanEntry[];
  totalBytes: number;
  cacheBytes: number;
  conversationBytes: number;
};

export type CleanOptions = {
  dryRun: boolean;
  backup: boolean;
  kinds: CleanKind[];
  toolIds?: ToolId[];
  targetIds?: string[];
};

export type CleanItem = {
  path: string;
  bytes: number;
  kind: CleanKind;
  toolId: ToolId;
  targetId: string;
  action: "would-delete" | "deleted" | "backed-up" | "skipped" | "failed";
  isWhitelisted?: boolean;
  error?: string;
};

export type CleanResult = {
  dryRun: boolean;
  backupDir?: string;
  items: CleanItem[];
  freedBytes: number;
};

export type BackupItemManifest = {
  id: string;
  toolId: ToolId;
  targetId: string;
  kind: CleanKind;
  originalPath: string;
  backupRelativePath: string;
  bytes: number;
  isDirectory?: boolean;
};

export type BackupManifest = {
  version: "1.0.0";
  backupId: string;
  timestamp: number;
  isoDate: string;
  home: string;
  platform: Platform;
  totalBytes: number;
  toolIds: ToolId[];
  items: BackupItemManifest[];
};

export type BackupSummary = {
  backupId: string;
  backupDir: string;
  timestamp: number;
  isoDate: string;
  totalBytes: number;
  toolIds: ToolId[];
  itemCount: number;
  hasManifest: boolean;
};

export type RestoreOptions = {
  toolIds?: ToolId[];
  targetIds?: string[];
  dryRun?: boolean;
  overwrite?: boolean;
};

export type RestoredItem = {
  originalPath: string;
  backupPath: string;
  toolId: ToolId;
  targetId: string;
  bytes: number;
  status: "restored" | "skipped" | "would-restore" | "failed";
  error?: string;
};

export type RestoreResult = {
  backupId: string;
  dryRun: boolean;
  items: RestoredItem[];
  restoredBytes: number;
  restoredCount: number;
};

export type PruneOptions = {
  olderThanDays?: number;
  keepLatest?: number;
  dryRun?: boolean;
};

export type PruneResult = {
  dryRun: boolean;
  prunedBackups: string[];
  freedBytes: number;
};

