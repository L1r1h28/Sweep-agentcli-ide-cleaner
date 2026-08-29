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
  error?: string;
};

export type CleanResult = {
  dryRun: boolean;
  backupDir?: string;
  items: CleanItem[];
  freedBytes: number;
};
