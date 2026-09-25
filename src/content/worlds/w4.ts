import type { World } from "../types";
import { ran, tree } from "../helpers";
import { treeOf } from "@/engine/repo";
import type { RepoState } from "@/engine/types";

const URL = "https://github.com/you/project.git";
const published = ["git init", 'echo "# Team Project" > README.md', "git add .", 'git commit -m "Initial commit"', 'echo "app()" > app.js', "git add .", 'git commit -m "Add app"', "__publish"];
const remoteTree = (s: RepoState) => treeOf(s, s.remote?.branches.main ?? null);

export const w4: World = {
  id: "w4",
  n: 4,
  title: "Remote Realms",
  emoji: "☁️",
  tagline: "GitHub, clone, push, pull and teamwork",
  color: "#60a5fa",
  lessons: [
    {
      id: "w4-remotes",
      title: "Your Repo in the Cloud",
      tagline: "Remotes, clone and push",
      xp: 160,
      minutes: 7,
      hook: {
        emoji: "🌍",
        story: "Your laptop falls in a lake. Or a friend wants to help with your project. Right now the whole repository lives on exactly one machine.",
        question: "How do repositories travel between computers?",
      },
      concept: {
        analogies: [
          { emoji: "👯", title: "A remote is another copy", text: "A remote is another full copy of the repository, usually on GitHub. \"origin\" is just the default nickname for it." },
          { emoji: "📥", title: "clone = download everything", text: "git clone copies the entire history to your computer and sets up origin for you." },
          { emoji: "📤", title: "push = upload new commits", text: "git push sends your new commits up. ☁ origin/main is your computer's memory of where main is on GitHub." },
        ],
        demo: {
          setup: published,
          tabs: ["remote", "files"],
          steps: [
            { say: "The project lives on GitHub (right side of the Remote panel). Your computer is empty." },
            { cmds: [`git clone ${URL}`], say: "Clone: all history arrives. The dashed ☁ origin/main label shows where GitHub's main is." },
            { cmds: ['echo "feature()" > feature.js', "git add .", 'git commit -m "Add feature"'], say: "A local commit: main moves ahead of origin/main. GitHub doesn't know about it yet!" },
            { cmds: ["git status"], say: "Git tells you: \"ahead of 'origin/main' by 1 commit\"." },
            { cmds: ["git push"], say: "Upload! GitHub's main and ☁ origin/main catch up. 🚀" },
          ],
        },
      },
      predict: [
        {
          prompt: "You committed locally but haven't pushed. What does GitHub have?",
          setup: [...published, `git clone ${URL}`, 'echo "x" > x.txt', "git add .", 'git commit -m "Local work"'],
          options: [
            { text: "Your new commit", why: "Commits stay on your machine until you push. Git never uploads anything automatically." },
            { text: "Only the older commits", correct: true, why: "Right. See how main is ahead of ☁ origin/main on the graph?" },
          ],
        },
        {
          prompt: "What is origin/main?",
          options: [
            { text: "Your computer's last-known position of main on GitHub", correct: true, why: "Exactly: a bookmark that updates only when you fetch, pull or push." },
            { text: "A live connection that updates automatically", why: "It's a snapshot of what you last saw. Run git fetch to refresh it." },
            { text: "Another name for your local main", why: "They can point to different commits, which is exactly how Git knows you're ahead or behind." },
          ],
        },
      ],
      challenge: {
        brief: "Clone the team project, add a CONTRIBUTORS file with your name, and publish it to GitHub.",
        setup: published,
        tabs: ["remote", "files"],
        tasks: [
          { label: "Clone the repository", check: (s) => s.initialized },
          { label: "Commit a file named CONTRIBUTORS", check: (s) => "CONTRIBUTORS" in tree(s) },
          { label: "Push it so GitHub has it", check: (s) => "CONTRIBUTORS" in remoteTree(s) },
        ],
        hints: [`git clone ${URL}`, 'echo "Your Name" > CONTRIBUTORS, then git add + git commit', "git push"],
        par: 5,
        suggestions: [`git clone ${URL}`, "git status", "git push"],
      },
      recap: [
        "A remote is another copy of the repo, usually on GitHub; origin is its nickname.",
        "clone downloads all history and sets up origin.",
        "Commits are local until you push.",
        "origin/main = where GitHub's main was last time you checked.",
      ],
      commands: [
        { cmd: "git clone <url>", what: "Copy a remote repository" },
        { cmd: "git push", what: "Upload your commits" },
        { cmd: "git push -u origin <branch>", what: "Push a new branch + track it" },
        { cmd: "git remote -v", what: "List remotes" },
      ],
    },
    {
      id: "w4-teamwork",
      title: "Fetch, Pull & Teamwork",
      tagline: "When someone pushes before you",
      xp: 180,
      minutes: 7,
      hook: {
        emoji: "🚫",
        story: "You run git push and GitHub answers: REJECTED. Your teammate Sam pushed while you were working.",
        question: "How do you combine your work with theirs, safely?",
      },
      concept: {
        analogies: [
          { emoji: "📬", title: "fetch = check the mailbox", text: "git fetch downloads new commits and updates origin/main, but never touches your files or your branches." },
          { emoji: "🔄", title: "pull = fetch + merge", text: "git pull fetches, then merges origin/<branch> into your current branch in one step." },
          { emoji: "🚦", title: "Pull before you push", text: "GitHub rejects a push that would throw away commits it has. Integrate first. Never force-push a shared branch." },
        ],
        demo: {
          setup: [...published, `git clone ${URL}`, '__teammate main sam.txt "Hi from Sam" "Sam adds a note"', 'echo "mine" > me.js', "git add .", 'git commit -m "My feature"'],
          tabs: ["remote", "files"],
          steps: [
            { say: "Sam pushed a commit to GitHub. You made a commit locally. Neither knows about the other yet." },
            { cmds: ["git push"], say: "Rejected! GitHub has Sam's commit and you don't. Pushing would erase it." },
            { cmds: ["git fetch"], say: "fetch: Sam's commit arrives and ☁ origin/main moves. Your main and your files didn't change." },
            { cmds: ["git merge origin/main"], say: "Merge Sam's work in. (git pull = fetch + this merge.)" },
            { cmds: ["git push"], say: "Now GitHub accepts it: both your work and Sam's are safe. 🤝" },
          ],
        },
      },
      predict: [
        {
          prompt: "After git fetch, do the files on your desk change?",
          options: [
            { text: "Yes, they update to the remote version", why: "fetch never touches your working directory or local branches. It only updates origin/* bookmarks." },
            { text: "No: only the origin/* bookmarks update", correct: true, why: "Right. That makes fetch 100% safe to run any time." },
          ],
        },
        {
          prompt: "Your push was rejected because the remote has new work. What's the safest fix?",
          options: [
            { text: "git push --force", why: "That would erase your teammate's commit from GitHub. 😬 Never on shared branches!" },
            { text: "git pull, then git push", correct: true, why: "Yes: integrate their work first, then push the combined history." },
            { text: "Delete your commit", why: "No need to lose work. Pull, then push." },
          ],
        },
      ],
      challenge: {
        brief: "Sam pushed while you were working. Get your commit onto GitHub without losing Sam's work.",
        setup: [...published, `git clone ${URL}`, '__teammate main sam.txt "Hi from Sam" "Sam adds a note"', 'echo "my feature" > me.js', "git add .", 'git commit -m "Add my feature"'],
        tabs: ["remote", "files"],
        tasks: [
          { label: "GitHub has your commit (me.js)", check: (s) => "me.js" in remoteTree(s) },
          { label: "GitHub still has Sam's work (sam.txt)", check: (s) => "sam.txt" in remoteTree(s) },
          { label: "No force-pushing", check: (_s, ctx) => !ran(ctx, /push.*(--force|-f\b)/) },
        ],
        hints: ["Try git push and read the error", "git pull brings Sam's commit in", "Then git push"],
        par: 2,
      },
      recap: [
        "fetch = download + update origin/* (safe, touches nothing else).",
        "pull = fetch + merge into your current branch.",
        "Rejected push? Pull first, then push.",
        "Force-pushing shared branches destroys other people's work.",
      ],
      commands: [
        { cmd: "git fetch", what: "Download remote commits" },
        { cmd: "git pull", what: "Fetch + merge" },
        { cmd: "git pull --rebase", what: "Fetch + rebase your commits on top" },
      ],
    },
  ],
};
