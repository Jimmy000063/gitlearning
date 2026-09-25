import { describe, expect, it } from "vitest";
import { run, runScript } from "@/engine/commands";
import { blobId } from "@/engine/repo";
import type { RepoState } from "@/engine/types";
import { ALL_LESSONS } from "./index";

const URL = "https://github.com/you/project.git";

// A known-good solution for every challenge, proving each one is solvable.
const SOLUTIONS: Record<string, string[]> = {
  "w1-first-snapshot": ["git init", "git add README.md", 'git commit -m "First"'],
  "w1-three-areas": ["git status", "git add login.js", 'git commit -m "Add login"'],
  "w1-history": ['echo "Day 2" >> journal.md', "git diff", 'git commit -am "Day 2"', 'echo "Day 3" >> journal.md', 'git commit -am "Day 3"', "git log --oneline"],
  "w2-head": ["git checkout HEAD~2", "cat recipe.txt", "git switch main"],
  "w2-undo-local": ["git restore --staged style.css secrets.env", "git restore style.css"],
  "w2-reset-revert": ["git revert HEAD~1"],
  "w3-branches": ["git switch -c feature", 'echo "hi" > contact.html', "git add .", 'git commit -m "Contact"', "git switch main"],
  "w3-merging": ["git merge login", "git merge cart"],
  "w3-conflicts": ["git merge pricing", 'echo "Price: $9" > price.txt', "git add price.txt", 'git commit -m "Merge pricing"'],
  "w4-remotes": [`git clone ${URL}`, 'echo "Me" > CONTRIBUTORS', "git add .", 'git commit -m "Add me"', "git push"],
  "w4-teamwork": ["git push", "git pull", "git push"],
  "w5-stash": ["git stash", "git switch main", 'echo "fix" > hotfix.txt', "git add .", 'git commit -m "Hotfix"', "git switch feature", "git stash pop"],
  "w5-rebase": ["git rebase main", "git switch main", "git merge feature"],
  "w5-cherry-pick": ["git cherry-pick experimental~1"],
  "w5-reflog": ["git reflog", "git reset --hard HEAD@{1}"],
  "w6-objects": ["git cat-file -p HEAD", "git cat-file -p HEAD^{tree}", `git cat-file -p ${blobId("# Secrets of Git").slice(0, 7)}`],
  "w6-refs": ['git commit --amend -m "Add readme"', "git tag v1.0"],
};

describe.each(ALL_LESSONS.map((l) => [l.id, l] as const))("%s", (id, lesson) => {
  it("has runnable demo and predict scenarios", () => {
    let s = runScript(lesson.concept.demo.setup);
    for (const step of lesson.concept.demo.steps) for (const c of step.cmds ?? []) s = run(s, c).state;
    for (const p of lesson.predict) {
      if (!p.setup) continue;
      runScript(p.commands ?? [], runScript(p.setup));
      expect(p.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });

  it("challenge starts unsolved and the reference solution solves it", () => {
    let s: RepoState = runScript(lesson.challenge.setup);
    const states = [s];
    const history: string[] = [];
    expect(lesson.challenge.tasks.every((t) => t.check(s, { history, states }))).toBe(false);
    const sol = SOLUTIONS[id];
    expect(sol, `missing solution for ${id}`).toBeDefined();
    for (const cmd of sol) {
      s = run(s, cmd).state;
      states.push(s);
      history.push(cmd);
    }
    for (const t of lesson.challenge.tasks) expect(t.check(s, { history, states }), `${id}: ${t.label}`).toBe(true);
    expect(sol.length).toBeLessThanOrEqual(lesson.challenge.par + 1);
  });
});
