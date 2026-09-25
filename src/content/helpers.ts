import type { RepoState } from "@/engine/types";
import { ancestors, currentBranch, headId, headTree, isAncestor, treeOf } from "@/engine/repo";
import type { TaskContext } from "./types";

export const tree = (s: RepoState) => headTree(s);
export const branchTree = (s: RepoState, b: string) => treeOf(s, s.branches[b] ?? null);
export const commitCount = (s: RepoState) => ancestors(s, headId(s)).size;
export const on = (s: RepoState, b: string) => currentBranch(s) === b;
export const byMsg = (s: RepoState, msg: string) => Object.values(s.commits).find((c) => c.message === msg)?.id;
export const contains = (s: RepoState, branch: string, commitMsg: string) => {
  const id = byMsg(s, commitMsg);
  const tip = s.branches[branch];
  return !!id && !!tip && isAncestor(s, id, tip);
};
export const hasMergeCommit = (s: RepoState, branch: string) =>
  [...ancestors(s, s.branches[branch] ?? null)].some((id) => s.commits[id].parents.length > 1);
export const ran = (ctx: TaskContext, re: RegExp) => ctx.history.some((h) => re.test(h.trim()));
export const ever = (ctx: TaskContext, pred: (s: RepoState) => boolean) => ctx.states.some(pred);
export const rootCommit = (s: RepoState) => Object.values(s.commits).sort((a, b) => a.seq - b.seq)[0]?.id;
export { headId, isAncestor };
