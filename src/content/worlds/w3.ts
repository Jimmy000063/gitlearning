import type { World } from "../types";
import { branchTree, byMsg, ever, hasMergeCommit, headId, isAncestor, on } from "../helpers";

const site = ["git init", 'echo "<h1>Home</h1>" > index.html', "git add .", 'git commit -m "Add homepage"'];

export const w3: World = {
  id: "w3",
  n: 3,
  title: "Branching Nebula",
  emoji: "🌿",
  tagline: "Parallel timelines, merges and conflicts",
  color: "#a3e635",
  lessons: [
    {
      id: "w3-branches",
      title: "Branches Are Sticky Notes",
      tagline: "Parallel universes for your code",
      xp: 150,
      minutes: 6,
      hook: {
        emoji: "🧪",
        story: "You want to try a wild redesign, but the live site must keep working. Copying the whole folder to \"site-experiment\" feels… wrong.",
        question: "What if you could spin off a parallel universe, experiment, and only keep it if it works?",
      },
      concept: {
        analogies: [
          { emoji: "🏷️", title: "A branch is a sticky note", text: "A branch is just a named pointer to a commit, NOT a copy of your files. Creating one is instant and costs almost nothing." },
          { emoji: "🚶", title: "The note you hold moves", text: "When you commit, the branch HEAD is on moves forward to the new commit. Every other branch stays exactly where it was." },
          { emoji: "🔀", title: "Switching changes your desk", text: "git switch moves HEAD to another branch and swaps your files to match that branch's snapshot." },
        ],
        demo: {
          setup: [...site, 'echo "Hello" > README.md', "git add .", 'git commit -m "Add README"'],
          steps: [
            { cmds: ["git branch redesign"], say: "A new sticky note on the same commit as main. No files were copied!" },
            { cmds: ["git switch redesign"], say: "Now HEAD holds redesign. Look at the HEAD badge move." },
            { cmds: ['echo "dark mode!" > theme.css', "git add .", 'git commit -m "Add dark mode"'], say: "Only redesign moved forward. main is still where it was." },
            { cmds: ["git switch main"], say: "Back on main. theme.css vanished from your desk because main's snapshot doesn't have it. It's safe on redesign." },
            { cmds: ['echo "Hello, world" > README.md', 'git commit -am "Fix README"'], say: "A commit on main: the timeline splits into two paths. That's branching! 🌿" },
          ],
        },
      },
      predict: [
        {
          prompt: "You run git branch feature, then make a commit without switching. Which branch moves forward?",
          setup: site,
          commands: ["git branch feature", 'echo "new" > new.txt', "git add .", 'git commit -m "New stuff"'],
          options: [
            { text: "feature", why: "git branch creates a branch but doesn't switch to it. HEAD is still on main." },
            { text: "main", correct: true, why: "Right! Only the branch HEAD is on moves. Use git switch -c to create AND switch in one go." },
            { text: "Both", why: "Only one sticky note moves: the one HEAD is attached to." },
          ],
        },
        {
          prompt: "How much space does a new branch take?",
          options: [
            { text: "A full copy of the project", why: "That's the old \"copy the folder\" way of thinking. Git branches never copy files." },
            { text: "Almost nothing: it's a tiny file containing one commit ID", correct: true, why: "Exactly: .git/refs/heads/feature is a 41-byte file. That's why branching in Git is so cheap." },
          ],
        },
      ],
      challenge: {
        brief: "Build a contact page on its own branch without touching main, then return to main.",
        setup: site,
        tasks: [
          { label: "Create a branch called feature", check: (s) => "feature" in s.branches },
          { label: "Commit contact.html on feature", check: (s) => "contact.html" in branchTree(s, "feature") },
          { label: "main is untouched", check: (s) => s.branches.main === byMsg(s, "Add homepage") },
          { label: "Finish back on main", check: (s) => on(s, "main") && "feature" in s.branches },
        ],
        hints: ["git switch -c feature creates AND switches", 'echo "<h1>Contact</h1>" > contact.html, then add + commit', "git switch main"],
        par: 5,
      },
      recap: [
        "A branch = a movable pointer to a commit. No copying.",
        "Committing moves only the branch HEAD is attached to.",
        "git switch -c <name> creates a branch and switches to it.",
        "Switching swaps your desk to that branch's snapshot.",
      ],
      commands: [
        { cmd: "git branch", what: "List branches" },
        { cmd: "git branch <name>", what: "Create a branch" },
        { cmd: "git switch -c <name>", what: "Create + switch" },
        { cmd: "git switch <name>", what: "Move to a branch" },
      ],
    },
    {
      id: "w3-merging",
      title: "Merging Timelines",
      tagline: "Fast-forward vs three-way merge",
      xp: 160,
      minutes: 7,
      hook: {
        emoji: "🤝",
        story: "Your feature is done. Time to bring it home to main. But main has moved on too…",
        question: "How do two timelines become one?",
      },
      concept: {
        analogies: [
          { emoji: "⏩", title: "Fast-forward", text: "If main hasn't moved since you branched, Git just slides main's sticky note forward. No new commit needed." },
          { emoji: "🔀", title: "Three-way merge", text: "If both branches moved, Git compares both tips with their common ancestor and creates a merge commit with TWO parents." },
          { emoji: "🎯", title: "Merge INTO where you are", text: "Switch to the receiving branch first (usually main), then git merge <other-branch>." },
        ],
        demo: {
          setup: [...site, "git switch -c about", 'echo "About" > about.html', "git add .", 'git commit -m "Add about"', "git switch main"],
          steps: [
            { cmds: ["git merge about"], say: "main hadn't moved, so this is a fast-forward. main simply slides forward." },
            { cmds: ["git switch -c search", 'echo "search" > search.js', "git add .", 'git commit -m "Add search"', "git switch main"], say: "A new branch with a new commit…" },
            { cmds: ['echo "footer" > footer.html', "git add .", 'git commit -m "Add footer"'], say: "…while main also moves on. The timelines have diverged." },
            { cmds: ["git merge search"], say: "Both moved, so Git creates a merge commit with two parents that ties the timelines together. 🔀" },
          ],
        },
      },
      predict: [
        {
          prompt: "main hasn't changed since feature branched off. What does git merge feature do?",
          setup: [...site, "git switch -c feature", 'echo "f" > f.js', "git add .", 'git commit -m "Feature work"', "git switch main"],
          commands: ["git merge feature"],
          options: [
            { text: "Creates a merge commit", why: "Nothing needs combining: main's history is already part of feature's." },
            { text: "Fast-forwards main to feature", correct: true, why: "Yes. main just slides forward to feature's commit. No new commit." },
            { text: "Causes a conflict", why: "Conflicts need changes on both sides. main has none." },
          ],
        },
        {
          prompt: "Both main and feature have new commits. How many parents will the merge commit have?",
          setup: [...site, "git switch -c feature", 'echo "f" > f.js', "git add .", 'git commit -m "Feature work"', "git switch main", 'echo "m" > m.js', "git add .", 'git commit -m "Main work"'],
          commands: ["git merge feature"],
          options: [
            { text: "1", why: "A merge commit joins two histories, so it has to remember both." },
            { text: "2", correct: true, why: "Right: one parent from each timeline. That's what makes it a merge commit." },
            { text: "0", why: "Only the very first commit has zero parents." },
          ],
        },
      ],
      challenge: {
        brief: "Two features were built in parallel: login and cart. Merge BOTH into main.",
        setup: [
          ...site,
          "git switch -c login",
          'echo "login()" > login.js',
          "git add .",
          'git commit -m "Add login"',
          "git switch main",
          "git switch -c cart",
          'echo "cart()" > cart.js',
          "git add .",
          'git commit -m "Add cart"',
          "git switch main",
        ],
        tasks: [
          { label: "login is merged into main", check: (s) => !!s.branches.main && isAncestor(s, s.branches.login, s.branches.main) },
          { label: "cart is merged into main", check: (s) => !!s.branches.main && isAncestor(s, s.branches.cart, s.branches.main) },
          { label: "main has both login.js and cart.js", check: (s) => "login.js" in branchTree(s, "main") && "cart.js" in branchTree(s, "main") },
          { label: "A merge commit joins the timelines", check: (s) => hasMergeCommit(s, "main") },
        ],
        hints: ["You're on main already (check the prompt)", "git merge login (fast-forward!)", "git merge cart (this one needs a merge commit)"],
        par: 2,
      },
      recap: [
        "Merge into the branch you're on: switch first, then git merge <other>.",
        "Fast-forward: the receiving branch just moves forward.",
        "Diverged history: a merge commit with two parents.",
      ],
      commands: [
        { cmd: "git merge <branch>", what: "Bring another branch into this one" },
        { cmd: "git merge --no-ff <branch>", what: "Always create a merge commit" },
      ],
    },
    {
      id: "w3-conflicts",
      title: "Taming Merge Conflicts",
      tagline: "When both sides change the same line",
      xp: 180,
      minutes: 8,
      badge: "conflict-survivor",
      hook: {
        emoji: "⚔️",
        story: "You changed the headline to \"Hello World\". Your teammate changed the SAME line to \"Hi Universe\". Now you're merging.",
        question: "Git can't read minds. Who wins?",
      },
      concept: {
        analogies: [
          { emoji: "🙋", title: "A conflict is a question", text: "Both sides changed the same lines differently. Git isn't broken; it's asking YOU which version (or mix) is right." },
          { emoji: "🧾", title: "Conflict markers", text: "Git writes both versions into the file: <<<<<<< HEAD (your side), ======= then their side, and >>>>>>> branch-name. Edit it to the final text and delete the markers." },
          { emoji: "✅", title: "add, then commit", text: "git add marks the file as resolved; git commit completes the merge. Changed your mind? git merge --abort puts everything back." },
        ],
        demo: {
          setup: ["git init", 'echo "Welcome" > title.txt', "git add .", 'git commit -m "Add title"', "git switch -c team", 'echo "Hi Universe" > title.txt', 'git commit -am "Team title"', "git switch main", 'echo "Hello World" > title.txt', 'git commit -am "My title"'],
          steps: [
            { cmds: ["git merge team"], say: "CONFLICT! The prompt shows MERGING, and title.txt is flagged ⚔ in the Three Areas." },
            { cmds: ["cat title.txt"], say: "Git wrote both versions into the file, fenced by conflict markers." },
            { cmds: ['echo "Hello Universe" > title.txt'], say: "We decide: a mix of both! The markers are gone." },
            { cmds: ["git add title.txt"], say: "git add means \"I've resolved this file\"." },
            { cmds: ['git commit -m "Merge team title"'], say: "Merge complete 🎉 Two parents, one agreed version." },
          ],
        },
      },
      predict: [
        {
          prompt: "Does a merge conflict mean something is broken?",
          options: [
            { text: "Yes, the repository is corrupted", why: "Not at all. Conflicts are a normal part of teamwork." },
            { text: "No: Git is asking you to decide", correct: true, why: "Exactly. Only a human knows which change is right." },
            { text: "Yes, you must delete a branch", why: "No branches need deleting. Resolve the file, add, commit." },
          ],
        },
        {
          prompt: "You've edited the file and removed the markers. What's next?",
          options: [
            { text: "git commit right away", why: "Git still considers the file unresolved until you git add it." },
            { text: "git add the file, then git commit", correct: true, why: "Yes: add marks it resolved, commit completes the merge." },
            { text: "Run git merge again", why: "The merge is already in progress; you're finishing it." },
          ],
        },
      ],
      challenge: {
        brief: "Merge the pricing branch into main. Both sides changed the price; the team agreed it should be exactly: Price: $9",
        setup: ["git init", 'echo "Price: $5" > price.txt', "git add .", 'git commit -m "Set price"', "git switch -c pricing", 'echo "Price: $9" > price.txt', 'git commit -am "Raise price"', "git switch main", 'echo "Price: $7" > price.txt', 'git commit -am "Discount price"'],
        tasks: [
          { label: "Start merging pricing into main", check: (s, ctx) => ever(ctx, (st) => !!st.merging) || (!!s.branches.pricing && isAncestor(s, s.branches.pricing, s.branches.main)) },
          { label: "price.txt says exactly: Price: $9", check: (s) => branchTree(s, "main")["price.txt"] === "Price: $9" },
          { label: "Merge finished (a commit with two parents)", check: (s) => on(s, "main") && !s.merging && (s.commits[headId(s)!]?.parents.length ?? 0) === 2 },
        ],
        hints: ["git merge pricing", "cat price.txt to see the markers, then: echo \"Price: $9\" > price.txt", 'git add price.txt, then git commit -m "Merge pricing"'],
        par: 4,
      },
      recap: [
        "Conflicts happen when both sides change the same lines.",
        "Markers show both versions: <<<<<<< yours ======= theirs >>>>>>>.",
        "Edit → git add → git commit. Or escape with git merge --abort.",
      ],
      commands: [
        { cmd: "git merge --abort", what: "Cancel a merge in progress" },
        { cmd: "git add <file>", what: "Mark a conflict resolved" },
      ],
    },
  ],
};
