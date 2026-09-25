import { describe, expect, it } from "vitest";
import { run, runScript } from "./commands";
import { emptyRepo, headId, resolve, status } from "./repo";
import { layoutGraph } from "./layout";
import type { RepoState } from "./types";

const text = (s: RepoState, cmd: string) => run(s, cmd).lines.map((l) => l.text).join("\n");

const base = () =>
  runScript(['git init', 'echo "hello" > a.txt', "git add .", 'git commit -m "first"']);

describe("basics", () => {
  it("refuses git commands before init", () => {
    expect(run(emptyRepo(), "git status").event).toBe("error");
  });

  it("init, stage, commit", () => {
    const s = base();
    expect(Object.keys(s.commits)).toHaveLength(1);
    expect(status(s).staged).toHaveLength(0);
    expect(text(s, "git status")).toContain("working tree clean");
  });

  it("only commits what is staged", () => {
    let s = base();
    s = runScript(['echo "x" > b.txt', 'echo "y" > c.txt', "git add b.txt", 'git commit -m "b"'], s);
    const tree = s.commits[headId(s)!].tree;
    expect(tree["b.txt"]).toBe("x");
    expect(tree["c.txt"]).toBeUndefined();
    expect(status(s).untracked).toEqual(["c.txt"]);
  });

  it("reports nothing to commit without staging", () => {
    const s = base();
    const r = run(runScript(['echo "more" >> a.txt'], s), 'git commit -m "x"');
    expect(r.event).toBe("none");
    expect(r.lines.map((l) => l.text).join()).toContain("no changes added");
  });

  it("resolves relative refs", () => {
    const s = runScript(['echo 2 > a.txt', 'git commit -am "second"', 'echo 3 > a.txt', 'git commit -am "third"'], base());
    expect(s.commits[resolve(s, "HEAD~2")!].message).toBe("first");
    expect(s.commits[resolve(s, "main^")!].message).toBe("second");
  });
});

describe("branching", () => {
  it("fast-forwards", () => {
    const s = runScript(["git switch -c feature", 'echo f > f.txt', "git add .", 'git commit -m "f"', "git switch main", "git merge feature"], base());
    expect(s.branches.main).toBe(s.branches.feature);
    expect(s.working["f.txt"]).toBe("f");
  });

  it("creates a merge commit when histories diverge", () => {
    const s = runScript(
      ["git switch -c feature", 'echo f > f.txt', "git add .", 'git commit -m "f"', "git switch main", 'echo m > m.txt', "git add .", 'git commit -m "m"', "git merge feature"],
      base(),
    );
    const head = s.commits[headId(s)!];
    expect(head.parents).toHaveLength(2);
    expect(head.tree).toMatchObject({ "f.txt": "f", "m.txt": "m" });
    const g = layoutGraph(s);
    expect(g.nodes.find((n) => n.id === head.id)?.lane).toBe(0);
  });

  it("handles conflicts end to end", () => {
    let s = runScript(
      ["git switch -c feature", 'echo "blue" > a.txt', 'git commit -am "blue"', "git switch main", 'echo "red" > a.txt', 'git commit -am "red"'],
      base(),
    );
    const r = run(s, "git merge feature");
    expect(r.event).toBe("conflict");
    s = r.state;
    expect(s.working["a.txt"]).toContain("<<<<<<< HEAD");
    expect(run(s, 'git commit -m "merge"').event).toBe("error");
    s = runScript(['echo "purple" > a.txt', "git add a.txt", 'git commit -m "merge"'], s);
    expect(s.merging).toBeNull();
    expect(s.commits[headId(s)!].parents).toHaveLength(2);
  });

  it("protects uncommitted work when switching", () => {
    const s = runScript(["git switch -c feature", 'echo "f" > a.txt', 'git commit -am "f"', "git switch main", 'echo "dirty" > a.txt'], base());
    expect(run(s, "git switch feature").event).toBe("error");
  });

  it("detaches HEAD on checkout of a commit", () => {
    const s = runScript(['echo 2 > a.txt', 'git commit -am "second"', "git checkout HEAD~1"], base());
    expect(s.head.type).toBe("detached");
    expect(s.working["a.txt"]).toBe("hello");
  });
});

describe("undo", () => {
  it("reset --hard then reflog rescue", () => {
    let s = runScript(['echo 2 > a.txt', 'git commit -am "precious"'], base());
    const lost = headId(s)!;
    s = runScript(["git reset --hard HEAD~1"], s);
    expect(layoutGraph(s).nodes.find((n) => n.id === lost)?.ghost).toBe(true);
    s = runScript(["git reset --hard HEAD@{1}"], s);
    expect(headId(s)).toBe(lost);
  });

  it("revert adds an inverse commit", () => {
    const s = runScript(['echo "bug" > a.txt', 'git commit -am "bad"', "git revert HEAD"], base());
    expect(s.working["a.txt"]).toBe("hello");
    expect(Object.keys(s.commits)).toHaveLength(3);
  });

  it("stash and pop", () => {
    let s = runScript(['echo "wip" > a.txt', "git stash"], base());
    expect(s.working["a.txt"]).toBe("hello");
    s = runScript(["git stash pop"], s);
    expect(s.working["a.txt"]).toBe("wip");
  });
});

describe("rewriting", () => {
  it("rebase makes history linear", () => {
    const s = runScript(
      ["git switch -c feature", 'echo f > f.txt', "git add .", 'git commit -m "f"', "git switch main", 'echo m > m.txt', "git add .", 'git commit -m "m"', "git switch feature", "git rebase main"],
      base(),
    );
    const tip = s.commits[s.branches.feature];
    expect(tip.parents[0]).toBe(s.branches.main);
    expect(tip.tree).toMatchObject({ "f.txt": "f", "m.txt": "m" });
  });

  it("cherry-picks a single commit", () => {
    const s = runScript(
      ["git switch -c hotfix", 'echo fix > fix.txt', "git add .", 'git commit -m "fix"', 'echo junk > junk.txt', "git add .", 'git commit -m "junk"', "git switch main", "git cherry-pick hotfix~1"],
      base(),
    );
    expect(s.working["fix.txt"]).toBe("fix");
    expect(s.working["junk.txt"]).toBeUndefined();
  });
});

describe("remotes", () => {
  it("clone, commit, push; rejected when behind; pull fixes it", () => {
    let s = runScript(["__publish", "git clone https://github.com/you/project.git"], base());
    expect(s.branches.main).toBeTruthy();
    s = runScript(["__teammate main team.txt hi \"Teammate work\"", 'echo me > me.txt', "git add .", 'git commit -m "mine"'], s);
    expect(run(s, "git push").event).toBe("error");
    s = runScript(["git pull", "git push"], s);
    expect(s.remote!.branches.main).toBe(s.branches.main);
    expect(s.working["team.txt"]).toBe("hi");
  });

  it("requires upstream for new branches", () => {
    const s = runScript(["__publish", "git clone https://github.com/you/project.git", "git switch -c feat"], base());
    expect(run(s, "git push").event).toBe("error");
    expect(run(s, "git push -u origin feat").event).toBe("push");
  });
});
