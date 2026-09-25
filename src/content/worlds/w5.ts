import type { World } from "../types";
import { branchTree, byMsg, contains, hasMergeCommit, isAncestor, on, ran } from "../helpers";

const base = ["git init", 'echo "v1" > app.js', "git add .", 'git commit -m "Build app"'];

export const w5: World = {
  id: "w5",
  n: 5,
  title: "Rewrite History",
  emoji: "⚔️",
  tagline: "Stash, rebase, cherry-pick and the reflog",
  color: "#f472b6",
  lessons: [
    {
      id: "w5-stash",
      title: "Stash: The Pocket Dimension",
      tagline: "Park unfinished work instantly",
      xp: 170,
      minutes: 6,
      hook: {
        emoji: "🔥",
        story: "You're halfway through a feature when your lead shouts: \"Urgent bug on main, fix it NOW!\" Your work is half-done and not ready to commit.",
        question: "Where do you put unfinished work for a moment?",
      },
      concept: {
        analogies: [
          { emoji: "🎒", title: "stash = pocket your changes", text: "git stash tucks your uncommitted changes away and gives you a clean desk that matches the last commit." },
          { emoji: "🧳", title: "stash pop = take them back out", text: "git stash pop re-applies the changes (on whatever branch you're on) and removes them from the pocket." },
          { emoji: "📚", title: "Stashes stack up", text: "You can stash several times; git stash list shows them all, newest on top." },
        ],
        demo: {
          setup: [...base, "git switch -c feature", 'echo "v2" > app.js', 'git commit -am "Start feature"', 'echo "v2 + half-done work" > app.js'],
          steps: [
            { say: "We're on feature with a half-done edit to app.js. Now the urgent bug arrives…" },
            { cmds: ["git switch main"], say: "Git refuses: switching would overwrite your unsaved edits. It's protecting you!" },
            { cmds: ["git stash"], say: "Pocket the work. The desk is clean again (check the Three Areas)." },
            { cmds: ["git switch main", 'echo "fixed" > hotfix.txt', "git add .", 'git commit -m "Hotfix"'], say: "Now we can switch and ship the fix on main." },
            { cmds: ["git switch feature", "git stash pop"], say: "Back on feature, and our half-done work pops right back out. ✨" },
          ],
        },
      },
      predict: [
        {
          prompt: "Right after git stash, what does your working directory look like?",
          setup: [...base, 'echo "work in progress" > app.js'],
          commands: ["git stash"],
          options: [
            { text: "Same as before", why: "stash takes the changes away, which is the whole point!" },
            { text: "Clean: it matches the last commit", correct: true, why: "Right. Your edits are safe in the stash, and the desk is clean." },
            { text: "An empty folder", why: "Committed files stay; only your uncommitted edits are pocketed." },
          ],
        },
      ],
      challenge: {
        brief: "Pocket your half-done work, commit an urgent fix (a file called hotfix.txt) on main, then bring your work back on feature.",
        setup: [...base, "git switch -c feature", 'echo "v2" > app.js', 'git commit -am "Start feature"', 'echo "v2 + half-done work" > app.js'],
        tasks: [
          { label: "Commit hotfix.txt on main", check: (s) => "hotfix.txt" in branchTree(s, "main") },
          { label: "Finish back on feature", check: (s) => on(s, "feature") },
          { label: "Your half-done work is back in app.js", check: (s) => s.working["app.js"] === "v2 + half-done work" && on(s, "feature") },
          { label: "The stash is empty again", check: (s, ctx) => s.stash.length === 0 && ran(ctx, /stash/) },
        ],
        hints: ["git stash", 'git switch main, echo "fix" > hotfix.txt, git add ., git commit -m "Hotfix"', "git switch feature, then git stash pop"],
        par: 7,
      },
      recap: [
        "git stash = pocket uncommitted changes, clean desk.",
        "git stash pop = re-apply and remove from the pocket.",
        "git stash list = see what's pocketed.",
      ],
      commands: [
        { cmd: "git stash", what: "Save uncommitted work aside" },
        { cmd: "git stash pop", what: "Re-apply the latest stash" },
        { cmd: "git stash list", what: "List stashes" },
      ],
    },
    {
      id: "w5-rebase",
      title: "Rebase: Replay the Timeline",
      tagline: "Straight-line history",
      xp: 200,
      minutes: 8,
      hook: {
        emoji: "🧶",
        story: "Your project history looks like spaghetti: merge commits everywhere. Reading it is a nightmare.",
        question: "What if your commits could be replayed on top of the latest main, as if you'd started today?",
      },
      concept: {
        analogies: [
          { emoji: "🎞️", title: "Rebase replays commits", text: "git rebase main takes your branch's commits and replays them one by one on top of main's tip. The result is a straight line." },
          { emoji: "🆕", title: "Replayed = brand-new commits", text: "Each replayed commit gets a new parent, so it gets a new ID. The originals become unreachable 👻 ghosts." },
          { emoji: "⚠️", title: "The golden rule", text: "Never rebase commits that others already have. Rebase only your own local, unshared work." },
        ],
        demo: {
          setup: [...base, "git switch -c feature", 'echo "a" > a.js', "git add .", 'git commit -m "Feature part 1"', 'echo "b" > b.js', "git add .", 'git commit -m "Feature part 2"', "git switch main", 'echo "docs" > docs.md', "git add .", 'git commit -m "Update docs"', "git switch feature"],
          steps: [
            { say: "feature branched off before main's \"Update docs\" commit. The history has diverged." },
            { cmds: ["git rebase main"], say: "Watch: feature's commits are copied on top of main. The originals fade into ghosts (new IDs!)." },
            { cmds: ["git switch main", "git merge feature"], say: "Now main can fast-forward. One perfectly straight line, no merge commit. ✨" },
          ],
        },
      },
      predict: [
        {
          prompt: "After a rebase, do your commits keep the same IDs?",
          options: [
            { text: "Yes", why: "An ID is a fingerprint of the content AND the parent. New parent → new ID." },
            { text: "No: they're new commits", correct: true, why: "Right. Which is exactly why rebasing shared commits confuses everyone else." },
          ],
        },
        {
          prompt: "Which one creates a merge commit?",
          options: [
            { text: "git merge (on diverged branches)", correct: true, why: "Yes: merge ties histories together with a two-parent commit." },
            { text: "git rebase", why: "Rebase avoids merge commits by replaying commits on top instead." },
          ],
        },
      ],
      challenge: {
        brief: "Rebase feature onto the latest main, then fast-forward main so history is one straight line. No merge commits allowed!",
        setup: [...base, "git switch -c feature", 'echo "search" > search.js', "git add .", 'git commit -m "Add search"', 'echo "filters" > filters.js', "git add .", 'git commit -m "Add filters"', "git switch main", 'echo "docs" > docs.md', "git add .", 'git commit -m "Update docs"', "git switch feature"],
        tasks: [
          { label: "feature sits on top of main's latest commit", check: (s) => isAncestor(s, byMsg(s, "Update docs")!, s.branches.feature) },
          { label: "main includes feature's work", check: (s) => isAncestor(s, s.branches.feature, s.branches.main) },
          { label: "History is linear (no merge commits)", check: (s) => !hasMergeCommit(s, "main") && contains(s, "main", "Update docs") },
        ],
        hints: ["You're on feature. git rebase main", "git switch main", "git merge feature (it will fast-forward)"],
        par: 3,
      },
      recap: [
        "Rebase replays your commits on top of another branch.",
        "Replayed commits are new (new IDs); originals become unreachable.",
        "Rebase for a clean, linear history, but only on unshared work.",
      ],
      commands: [
        { cmd: "git rebase <branch>", what: "Replay current branch onto <branch>" },
        { cmd: "git pull --rebase", what: "Update without a merge commit" },
      ],
    },
    {
      id: "w5-cherry-pick",
      title: "Cherry-Pick: Take Just One",
      tagline: "Copy a single commit anywhere",
      xp: 170,
      minutes: 5,
      hook: {
        emoji: "🍒",
        story: "A branch full of wild experiments contains ONE brilliant security fix. You want that fix on main, but none of the experiments.",
        question: "Can you pluck a single commit from another branch?",
      },
      concept: {
        analogies: [
          { emoji: "🍒", title: "Pick one cherry", text: "git cherry-pick <commit> copies that single commit's changes onto your current branch as a new commit." },
          { emoji: "🚑", title: "Perfect for hotfixes", text: "Classic use: apply one fix to a release branch without merging everything else." },
          { emoji: "🔎", title: "Find it first", text: "git log --oneline <branch> lists that branch's commits and IDs." },
        ],
        demo: {
          setup: [...base, "git switch -c lab", 'echo "comic sans" > font.css', "git add .", 'git commit -m "Try weird font"', 'echo "fixed" > login.js', "git add .", 'git commit -m "Fix login crash"', 'echo "neon" > colors.css', "git add .", 'git commit -m "Try neon colors"', "git switch main"],
          steps: [
            { cmds: ["git log --oneline lab"], say: "lab has three commits. Only the middle one is good." },
            { cmds: ["git cherry-pick lab~1"], say: "lab~1 = the commit before lab's tip. Only \"Fix login crash\" is copied onto main as a new commit." },
          ],
        },
      },
      predict: [
        {
          prompt: "After cherry-picking a commit from lab onto main, is it removed from lab?",
          options: [
            { text: "Yes, it moves", why: "cherry-pick copies. The original stays on lab untouched." },
            { text: "No: it's copied, lab is unchanged", correct: true, why: "Right. Two commits now carry the same change, with different IDs." },
          ],
        },
      ],
      challenge: {
        brief: "The experimental branch has a critical security patch hidden between two silly experiments. Bring ONLY the patch to main.",
        setup: [...base, "git switch -c experimental", 'echo "comic sans" > font.css', "git add .", 'git commit -m "Experiment: comic sans"', 'echo "patched" > security.js', "git add .", 'git commit -m "Fix: security patch"', 'echo "autoplay" > music.js', "git add .", 'git commit -m "Experiment: autoplay music"', "git switch main"],
        tasks: [
          { label: "main has security.js", check: (s) => "security.js" in branchTree(s, "main") },
          { label: "main has none of the experiments", check: (s) => !("font.css" in branchTree(s, "main")) && !("music.js" in branchTree(s, "main")) },
          { label: "You stayed on main", check: (s) => on(s, "main") },
        ],
        hints: ["git log --oneline experimental", "The patch is experimental~1", "git cherry-pick experimental~1"],
        par: 2,
      },
      recap: ["cherry-pick copies one commit onto your current branch.", "The copy is a new commit; the original stays put.", "Great for hotfixes and backports."],
      commands: [{ cmd: "git cherry-pick <commit>", what: "Copy a commit here" }],
    },
    {
      id: "w5-reflog",
      title: "Reflog: Git's Black Box",
      tagline: "Recover \"lost\" commits",
      xp: 200,
      minutes: 6,
      hook: {
        emoji: "😨",
        story: "You ran git reset --hard and three commits of work vanished. Heart stops.",
        question: "Are they really gone forever?",
      },
      concept: {
        analogies: [
          { emoji: "📼", title: "The flight recorder", text: "The reflog is a diary of every place HEAD has been: every commit, checkout, reset and merge." },
          { emoji: "👻", title: "Lost ≠ deleted", text: "\"Lost\" commits are just unreachable: no branch points to them. Git keeps them for weeks. On our graph they're ghost stars." },
          { emoji: "🎣", title: "Hook them back", text: "Find the ID in git reflog, then git reset --hard <id> (or git branch rescue <id>)." },
        ],
        demo: {
          setup: [...base, 'echo "chapter 1" > book.txt', "git add .", 'git commit -m "Chapter 1"', 'echo "chapter 2" >> book.txt', 'git commit -am "Chapter 2"'],
          steps: [
            { cmds: ["git reset --hard HEAD~2"], say: "Two chapters, gone?! Look closer: they're ghosts on the graph." },
            { cmds: ["git reflog"], say: "The black box remembers everything. HEAD@{1} is where we were one move ago." },
            { cmds: ["git reset --hard HEAD@{1}"], say: "Rescued! 🦸 The chapters are back." },
          ],
        },
      },
      predict: [
        {
          prompt: "Which is true right after git reset --hard HEAD~1?",
          setup: [...base, 'echo "v2" > app.js', 'git commit -am "Precious work"'],
          commands: ["git reset --hard HEAD~1"],
          options: [
            { text: "The commit is deleted from disk immediately", why: "Git keeps unreachable commits for a long time (usually 30-90 days)." },
            { text: "The commit still exists; no branch points to it", correct: true, why: "Yes! See the ghost? The reflog can bring it back." },
          ],
        },
      ],
      challenge: {
        brief: "Disaster! An accidental reset wiped out three chapters of your novel. Recover them all onto main.",
        setup: ["git init", 'echo "Title" > novel.txt', "git add .", 'git commit -m "Start novel"', 'echo "Ch 1" >> novel.txt', 'git commit -am "Write chapter 1"', 'echo "Ch 2" >> novel.txt', 'git commit -am "Write chapter 2"', 'echo "Ch 3" >> novel.txt', 'git commit -am "Write chapter 3"', "git reset --hard HEAD~3"],
        tasks: [
          { label: "Consult the black box (git reflog)", check: (_s, ctx) => ran(ctx, /^git reflog/) },
          { label: "main contains all three chapters again", check: (s) => contains(s, "main", "Write chapter 3") },
        ],
        hints: ["git reflog", "The line before the reset is HEAD@{1}", "git reset --hard HEAD@{1}"],
        par: 2,
      },
      recap: ["The reflog records everywhere HEAD has been.", "Reset/rebased-away commits are unreachable, not deleted.", "git reset --hard <id> or git branch <name> <id> rescues them."],
      commands: [
        { cmd: "git reflog", what: "History of HEAD movements" },
        { cmd: "git reset --hard HEAD@{1}", what: "Go back to where HEAD just was" },
      ],
    },
  ],
};
