// In-memory model of a Git repository. Everything is plain data so a state can be
// cloned for undo, step-through playback, and "predict what happens next" reveals.

export type FileMap = Record<string, string>;

export interface Commit {
  id: string;
  message: string;
  parents: string[];
  tree: FileMap;
  seq: number; // creation order, used for graph layout
}

export type Head = { type: "branch"; name: string } | { type: "detached"; id: string };

export interface StashEntry {
  message: string;
  base: string;
  index: FileMap;
  working: FileMap;
}

export interface ReflogEntry {
  id: string;
  message: string;
}

export interface MergeState {
  theirs: string;
  theirsName: string;
  conflicts: string[];
}

export interface Remote {
  name: string;
  url: string;
  branches: Record<string, string>;
}

export interface RepoState {
  initialized: boolean;
  working: FileMap;
  index: FileMap;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  head: Head;
  tags: Record<string, string>;
  stash: StashEntry[];
  reflog: ReflogEntry[];
  merging: MergeState | null;
  remote: Remote | null;
  tracking: Record<string, string>; // "origin/main" -> commit id
  upstream: Record<string, string>; // local branch -> remote branch name
  seq: number;
}

export type LineKind = "out" | "err" | "info" | "success" | "warn" | "muted" | "add" | "del" | "cmd";

export interface Line {
  text: string;
  kind: LineKind;
}

export type GitEvent =
  | "init"
  | "stage"
  | "unstage"
  | "commit"
  | "branch"
  | "checkout"
  | "merge"
  | "conflict"
  | "reset"
  | "revert"
  | "stash"
  | "rebase"
  | "cherry-pick"
  | "push"
  | "fetch"
  | "pull"
  | "clone"
  | "tag"
  | "file"
  | "error"
  | "none";

export interface RunResult {
  state: RepoState;
  lines: Line[];
  event: GitEvent;
  clear?: boolean;
}
