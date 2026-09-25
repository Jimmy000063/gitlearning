import type { Commit, FileMap, Head, RepoState } from "./types";
import { fakeSha, lineDiff } from "./utils";

export const REMOTE_URL = "https://github.com/you/project.git";
export const AUTHOR = "You <you@gitgalaxy.dev>";

export function emptyRepo(): RepoState {
  return {
    initialized: false,
    working: {},
    index: {},
    commits: {},
    branches: {},
    head: { type: "branch", name: "main" },
    tags: {},
    stash: [],
    reflog: [],
    merging: null,
    remote: null,
    tracking: {},
    upstream: {},
    seq: 0,
  };
}

export const cloneState = (s: RepoState): RepoState => structuredClone(s);

export class GitError extends Error {
  constructor(public lines: string[], public hint?: string) {
    super(lines[0]);
  }
}

export const fail = (msg: string | string[], hint?: string): never => {
  throw new GitError(Array.isArray(msg) ? msg : [msg], hint);
};

export function currentBranch(s: RepoState): string | null {
  return s.head.type === "branch" ? s.head.name : null;
}

export function headId(s: RepoState): string | null {
  return s.head.type === "detached" ? s.head.id : s.branches[s.head.name] ?? null;
}

export function treeOf(s: RepoState, id: string | null): FileMap {
  return id ? s.commits[id].tree : {};
}

export const headTree = (s: RepoState) => treeOf(s, headId(s));

/** Resolve names like HEAD, main, v1.0, origin/main, a1b2c3d, HEAD~2, main^2, HEAD@{1}. */
export function resolve(s: RepoState, ref: string): string | null {
  const m = ref.match(/^(.*?)((?:[~^]\d*)*)$/);
  if (!m) return null;
  const [, base, mods] = m;
  let id: string | null = null;
  const at = base.match(/^HEAD@\{(\d+)\}$/);
  if (base === "HEAD" || base === "@") id = headId(s);
  else if (at) id = s.reflog[Number(at[1])]?.id ?? null;
  else if (base in s.branches) id = s.branches[base];
  else if (base in s.tags) id = s.tags[base];
  else if (base in s.tracking) id = s.tracking[base];
  else if (/^[0-9a-f]{4,40}$/.test(base)) {
    const hits = Object.keys(s.commits).filter((c) => c.startsWith(base));
    if (hits.length === 1) id = hits[0];
  }
  if (!id) return null;
  const re = /([~^])(\d*)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(mods))) {
    const n = mm[2] === "" ? 1 : Number(mm[2]);
    if (mm[1] === "~") {
      for (let i = 0; i < n && id; i++) id = s.commits[id].parents[0] ?? null;
    } else if (n > 0) {
      id = s.commits[id!].parents[n - 1] ?? null;
    }
    if (!id) return null;
  }
  return id;
}

export function ancestors(s: RepoState, id: string | null): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    stack.push(...s.commits[c].parents);
  }
  return seen;
}

export const isAncestor = (s: RepoState, a: string, b: string) => ancestors(s, b).has(a);

export function mergeBase(s: RepoState, a: string, b: string): string | null {
  const A = ancestors(s, a);
  let best: Commit | null = null;
  for (const id of ancestors(s, b)) {
    if (A.has(id) && (!best || s.commits[id].seq > best.seq)) best = s.commits[id];
  }
  return best?.id ?? null;
}

/** Commits reachable from `from` that are not reachable from `exclude`, oldest first. */
export function commitsBetween(s: RepoState, exclude: string | null, from: string): Commit[] {
  const ex = ancestors(s, exclude);
  return [...ancestors(s, from)]
    .filter((id) => !ex.has(id))
    .map((id) => s.commits[id])
    .sort((a, b) => a.seq - b.seq);
}

export interface Merge3Result {
  tree: FileMap;
  conflicts: string[];
}

export function merge3(base: FileMap, ours: FileMap, theirs: FileMap, oursLabel = "HEAD", theirsLabel = "theirs"): Merge3Result {
  const tree: FileMap = {};
  const conflicts: string[] = [];
  const files = new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]);
  for (const f of [...files].sort()) {
    const b = base[f];
    const o = ours[f];
    const t = theirs[f];
    let result: string | undefined;
    if (o === t) result = o;
    else if (o === b) result = t;
    else if (t === b) result = o;
    else if (o === undefined) result = t; // modify/delete: keep the modified side
    else if (t === undefined) result = o;
    else {
      conflicts.push(f);
      result = `<<<<<<< ${oursLabel}\n${o}\n=======\n${t}\n>>>>>>> ${theirsLabel}`;
    }
    if (result !== undefined) tree[f] = result;
  }
  return { tree, conflicts };
}

export const hasMarkers = (content: string | undefined) => !!content && /^(<<<<<<<|=======|>>>>>>>)/m.test(content);

export function makeCommit(s: RepoState, message: string, parents: string[], tree: FileMap): string {
  s.seq += 1;
  const id = fakeSha(`commit|${message}|${parents.join(",")}|${JSON.stringify(tree)}|${s.seq}`);
  s.commits[id] = { id, message, parents, tree: { ...tree }, seq: s.seq };
  return id;
}

export function logReflog(s: RepoState, id: string, message: string) {
  s.reflog.unshift({ id, message });
  if (s.reflog.length > 60) s.reflog.pop();
}

/** Point the current branch (or detached HEAD) at a commit. */
export function advanceHead(s: RepoState, id: string, reflogMsg: string) {
  if (s.head.type === "branch") s.branches[s.head.name] = id;
  else s.head = { type: "detached", id };
  logReflog(s, id, reflogMsg);
}

export function setHead(s: RepoState, head: Head, reflogMsg: string) {
  s.head = head;
  const id = headId(s);
  if (id) logReflog(s, id, reflogMsg);
}

export function untrackedFiles(s: RepoState): string[] {
  return Object.keys(s.working)
    .filter((f) => !(f in s.index))
    .sort();
}

export type ChangeKind = "new file" | "modified" | "deleted";
export interface Change {
  file: string;
  kind: ChangeKind;
}

function changes(from: FileMap, to: FileMap, only?: (f: string) => boolean): Change[] {
  const out: Change[] = [];
  const files = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const f of [...files].sort()) {
    if (only && !only(f)) continue;
    if (from[f] === to[f]) continue;
    out.push({ file: f, kind: from[f] === undefined ? "new file" : to[f] === undefined ? "deleted" : "modified" });
  }
  return out;
}

export function status(s: RepoState) {
  const staged = changes(headTree(s), s.index);
  const unstaged = changes(s.index, s.working, (f) => f in s.index);
  return { staged, unstaged, untracked: untrackedFiles(s) };
}

export function isDirty(s: RepoState) {
  const st = status(s);
  return st.staged.length > 0 || st.unstaged.length > 0;
}

export function diffStat(from: FileMap, to: FileMap) {
  let ins = 0;
  let del = 0;
  const files = changes(from, to);
  for (const c of files) {
    for (const op of lineDiff(from[c.file] ?? "", to[c.file] ?? "")) {
      if (op.kind === "add") ins++;
      if (op.kind === "del") del++;
    }
  }
  return { files, ins, del };
}

/** Rebuild the working tree after HEAD moves, keeping untracked files around. */
export function checkoutTree(s: RepoState, tree: FileMap) {
  const untracked = untrackedFiles(s);
  const working: FileMap = { ...tree };
  for (const f of untracked) if (!(f in tree)) working[f] = s.working[f];
  s.index = { ...tree };
  s.working = working;
}

export type ZoneState = {
  name: string;
  working: "untracked" | "modified" | "deleted" | "clean" | null;
  staged: ChangeKind | "clean" | null;
  committed: boolean;
  conflict: boolean;
};

/** Per-file view of the "three trees" used by the Files visualisation. */
export function fileZones(s: RepoState): ZoneState[] {
  const head = headTree(s);
  const files = new Set([...Object.keys(head), ...Object.keys(s.index), ...Object.keys(s.working)]);
  return [...files].sort().map((name) => {
    const w = s.working[name];
    const i = s.index[name];
    const h = head[name];
    let working: ZoneState["working"] = null;
    if (w !== undefined) working = i === undefined ? "untracked" : w === i ? "clean" : "modified";
    else if (i !== undefined) working = "deleted";
    let staged: ZoneState["staged"] = null;
    if (i !== undefined || h !== undefined) {
      if (i === h) staged = i === undefined ? null : "clean";
      else staged = h === undefined ? "new file" : i === undefined ? "deleted" : "modified";
    }
    return {
      name,
      working,
      staged,
      committed: h !== undefined,
      conflict: !!s.merging?.conflicts.includes(name),
    };
  });
}

// ---- Object model (used by cat-file / ls-tree and the Objects view) ----
export const blobId = (content: string) => fakeSha(`blob|${content}`);
export const treeId = (tree: FileMap) =>
  fakeSha(`tree|${Object.keys(tree).sort().map((f) => `${f}:${blobId(tree[f])}`).join(";")}`);

/** Ahead/behind counts between a branch and its remote-tracking ref. */
export function aheadBehind(s: RepoState, local: string, remote: string) {
  const L = ancestors(s, local);
  const R = ancestors(s, remote);
  let ahead = 0;
  let behind = 0;
  L.forEach((id) => !R.has(id) && ahead++);
  R.forEach((id) => !L.has(id) && behind++);
  return { ahead, behind };
}
