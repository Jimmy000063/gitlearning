import type { RepoState } from "./types";
import { ancestors, currentBranch, headId } from "./repo";

export interface GraphNode {
  id: string;
  col: number;
  lane: number;
  message: string;
  ghost: boolean;
  merge: boolean;
}

export interface GraphEdge {
  from: string; // parent
  to: string; // child
  lane: number; // colour lane
  ghost: boolean;
}

export interface GraphRef {
  name: string;
  kind: "branch" | "remote" | "tag" | "head";
  target: string;
  current: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  refs: GraphRef[];
  lanes: number;
  cols: number;
  headTarget: string | null;
  headOnBranch: string | null;
}

/**
 * Lay commits out on "lanes" (rows) with time flowing left → right.
 * main/master claims lane 0 so the trunk is always a straight line.
 */
export function layoutGraph(s: RepoState): GraphLayout {
  const hid = headId(s);
  const cur = currentBranch(s);
  const refs: GraphRef[] = [];
  const branchNames = Object.keys(s.branches).sort((a, b) => rank(a) - rank(b));
  for (const b of branchNames) refs.push({ name: b, kind: "branch", target: s.branches[b], current: b === cur });
  for (const [r, id] of Object.entries(s.tracking)) refs.push({ name: r, kind: "remote", target: id, current: false });
  for (const [t, id] of Object.entries(s.tags)) refs.push({ name: t, kind: "tag", target: id, current: false });

  const visible = new Set<string>();
  const roots = [hid, ...refs.map((r) => r.target)].filter(Boolean) as string[];
  for (const r of roots) ancestors(s, r).forEach((id) => visible.add(id));

  // Commits still in the reflog but no longer reachable become faded "ghosts".
  const ghosts = new Set<string>();
  for (const e of s.reflog) {
    if (!visible.has(e.id) && s.commits[e.id]) ancestors(s, e.id).forEach((id) => !visible.has(id) && ghosts.add(id));
  }

  const all = [...visible, ...ghosts].map((id) => s.commits[id]).sort((a, b) => a.seq - b.seq);
  const col = new Map(all.map((c, i) => [c.id, i]));
  const lane = new Map<string, number>();
  let nextLane = 0;

  const claim = (tip: string) => {
    let c: string | undefined = tip;
    let used = false;
    while (c && !lane.has(c)) {
      lane.set(c, nextLane);
      used = true;
      c = s.commits[c].parents[0];
    }
    if (used) nextLane++;
  };
  for (const r of refs) claim(r.target);
  if (hid) claim(hid);
  // Anything left (second parents of merges, ghosts) gets its own lane, newest first.
  for (const c of [...all].reverse()) if (!lane.has(c.id)) claim(c.id);

  const nodes: GraphNode[] = all.map((c) => ({
    id: c.id,
    col: col.get(c.id)!,
    lane: lane.get(c.id)!,
    message: c.message.split("\n")[0],
    ghost: ghosts.has(c.id),
    merge: c.parents.length > 1,
  }));

  const edges: GraphEdge[] = [];
  for (const c of all) {
    c.parents.forEach((p, i) => {
      if (!col.has(p)) return;
      edges.push({ from: p, to: c.id, lane: i === 0 ? lane.get(c.id)! : lane.get(p)!, ghost: ghosts.has(c.id) });
    });
  }

  if (s.head.type === "detached" && hid) refs.push({ name: "HEAD", kind: "head", target: hid, current: true });

  return {
    nodes,
    edges,
    refs,
    lanes: Math.max(1, nextLane),
    cols: all.length,
    headTarget: hid,
    headOnBranch: cur,
  };
}

function rank(name: string) {
  return name === "main" ? 0 : name === "master" ? 1 : 2;
}
