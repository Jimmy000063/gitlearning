import type { World } from "../types";
import { commitCount, ran, tree } from "../helpers";

export const w1: World = {
  id: "w1",
  n: 1,
  title: "Origins",
  emoji: "🌱",
  tagline: "What Git is, and your very first snapshots",
  color: "#a78bfa",
  lessons: [
    {
      id: "w1-first-snapshot",
      title: "Your Project's Time Machine",
      tagline: "Repositories, snapshots, and your first commit",
      xp: 100,
      minutes: 5,
      hook: {
        emoji: "😱",
        story:
          "It's 2am. You \"improved\" your project and now nothing works. Your folder has final.txt, final-v2.txt, final-REAL.txt and final-REAL-fixed.txt. Which one was the version that worked?",
        question: "What if every version you ever saved was one command away?",
      },
      concept: {
        analogies: [
          { emoji: "📸", title: "A commit is a photo", text: "Each commit is a complete snapshot of your project at one moment, plus a caption (the commit message). Not a list of edits: the whole picture." },
          { emoji: "📚", title: "The repository is the photo album", text: "All snapshots live in a hidden .git folder. Your normal files are just the page you're looking at right now." },
          { emoji: "✨", title: "git init creates the album", text: "Before git init, a folder is just a folder. After it, Git is ready to remember. The album starts empty; Git never takes photos by itself." },
        ],
        demo: {
          setup: [],
          steps: [
            { say: "This is an ordinary folder. Git isn't involved yet. Let's create a file." , cmds: ['echo "Hello, galaxy" > hello.txt'] },
            { cmds: ["git init"], say: "git init creates the hidden .git album. See the three areas light up below? The file is still untracked: Git sees it but hasn't saved it." },
            { cmds: ["git add hello.txt"], say: "git add places hello.txt on the loading dock (the staging area): \"include this in the next photo\"." },
            { cmds: ['git commit -m "First snapshot"'], say: "Click! 📸 A commit appears as a star on the graph. That snapshot is now saved forever." },
          ],
        },
      },
      predict: [
        {
          prompt: "A folder has 3 files. You run git init. How many commits does the repository have now?",
          setup: ["echo a > a.txt", "echo b > b.txt", "echo c > c.txt"],
          commands: ["git init"],
          options: [
            { text: "3 (one per file)", why: "git init doesn't save anything. It only creates the empty album. Commits happen only when you ask." },
            { text: "1 (a starting snapshot)", why: "Tempting! But Git never commits by itself. You decide when to take a snapshot." },
            { text: "0 (the album is empty)", correct: true, why: "Exactly. git init creates an empty repository. Your files are untracked until you add and commit them." },
          ],
        },
        {
          prompt: "What does a commit store?",
          options: [
            { text: "Only the lines you changed", why: "That's how diffs display it, but conceptually every commit is a full snapshot of all tracked files. (Git cleverly re-uses unchanged files so this stays tiny.)" },
            { text: "A full snapshot of your tracked files + a message", correct: true, why: "Yes! A snapshot of everything, a message, an author, and a link to the previous commit." },
            { text: "A backup of your whole computer", why: "😄 Git only cares about the files inside your project folder that you tell it to track." },
          ],
        },
      ],
      challenge: {
        brief: "A README is waiting in this folder. Turn the folder into a repository and save your very first snapshot.",
        setup: ['echo "# My Galaxy" > README.md'],
        tasks: [
          { label: "Turn the folder into a repository", check: (s) => s.initialized },
          { label: "Stage README.md", check: (s) => "README.md" in s.index },
          { label: "Make your first commit", check: (s) => commitCount(s) >= 1 },
        ],
        hints: ["Start with: git init", "Stage the file: git add README.md", 'Save the snapshot: git commit -m "My first commit"'],
        par: 3,
        suggestions: ["ls", "git init", "git status", "git add README.md", 'git commit -m "First commit"'],
      },
      recap: [
        "A repository = your folder + a hidden .git album of snapshots.",
        "git init creates the album, and it starts empty.",
        "A commit is a full snapshot + a message.",
        "Git only saves what you explicitly commit. Nothing is automatic.",
      ],
      commands: [
        { cmd: "git init", what: "Create a new repository in this folder" },
        { cmd: "git add <file>", what: "Stage a file for the next commit" },
        { cmd: 'git commit -m "msg"', what: "Save the staged snapshot" },
      ],
    },
    {
      id: "w1-three-areas",
      title: "The Three Areas",
      tagline: "Desk, loading dock, photo album",
      xp: 120,
      minutes: 6,
      hook: {
        emoji: "🎒",
        story: "You fixed a bug AND started a half-finished experiment in another file. Your teammate needs the bug fix right now, but the experiment is a mess.",
        question: "How can one snapshot include some changes but not others?",
      },
      concept: {
        analogies: [
          { emoji: "🛠️", title: "Working Directory = your desk", text: "Where you actually edit files. It can be messy; nothing here is saved by Git yet." },
          { emoji: "📦", title: "Staging Area = the loading dock", text: "You choose exactly what goes into the next snapshot by putting it on the dock with git add." },
          { emoji: "🗄️", title: "Repository = the album", text: "git commit takes everything on the dock and seals it into a permanent snapshot." },
        ],
        demo: {
          setup: ["git init", 'echo "v1" > app.js', "git add .", 'git commit -m "Start app"'],
          steps: [
            { say: "We have one commit. All three areas agree: app.js is the same everywhere." },
            { cmds: ['echo "bug fixed" > app.js'], say: "We edit app.js on our desk. The Working Directory marks it as edited; the dock and album still hold the old version." },
            { cmds: ['echo "half-baked idea" > experiment.js'], say: "We start an experiment. It's untracked: Git has never seen this file." },
            { cmds: ["git status"], say: "git status is your dashboard. It tells you what's in each area. Run it all the time!" },
            { cmds: ["git add app.js"], say: "Only app.js goes onto the loading dock. The experiment stays on the desk." },
            { cmds: ['git commit -m "Fix bug"'], say: "The new snapshot contains the bug fix only. The experiment is still on your desk, not committed." },
          ],
        },
      },
      predict: [
        {
          prompt: "You stage a.txt (containing \"hi\"), then edit it to \"hi there\", then commit. What's in the commit?",
          setup: ["git init", 'echo "hi" > a.txt', "git add a.txt", 'echo "hi there" > a.txt'],
          commands: ['git commit -m "save"', "git show"],
          options: [
            { text: "\"hi there\" (the latest version)", why: "Classic trap! git add stages the file as it was at that moment. Later edits stay on your desk until you git add again." },
            { text: "\"hi\" (the version you staged)", correct: true, why: "Yes! The dock holds a copy from when you ran git add. The commit seals exactly that copy." },
            { text: "Nothing: it errors", why: "No error. Something is staged, so Git happily commits it." },
          ],
        },
        {
          prompt: "What does git add actually do?",
          options: [
            { text: "Saves the file permanently", why: "Not yet! Only git commit makes a permanent snapshot. add just prepares it." },
            { text: "Copies the current version onto the staging area", correct: true, why: "Exactly: it's like placing a copy on the loading dock." },
            { text: "Uploads it to GitHub", why: "Nothing leaves your computer. Uploading is git push, a few worlds from now!" },
          ],
        },
      ],
      challenge: {
        brief: "You've been busy. Commit ONLY the finished login feature, and keep your messy notes out of the snapshot.",
        setup: ["git init", 'echo "base" > app.js', "git add .", 'git commit -m "Start"', 'echo "login feature done" > login.js', 'echo "todo: ??? lol" > notes.txt'],
        tasks: [
          { label: "Check the situation with git status", check: (_s, ctx) => ran(ctx, /^git status/) },
          { label: "Commit login.js in a new commit", check: (s) => commitCount(s) >= 2 && "login.js" in tree(s) },
          { label: "Keep notes.txt out of the commit (still on your desk)", check: (s) => commitCount(s) >= 2 && !("notes.txt" in tree(s)) && "notes.txt" in s.working },
        ],
        hints: ["git status shows untracked files in red", "Stage just one file: git add login.js", 'Then: git commit -m "Add login"'],
        par: 3,
      },
      recap: [
        "Working directory = your desk. Edit freely.",
        "Staging area = the loading dock. git add chooses what goes into the next snapshot.",
        "Repository = the album. git commit seals the dock into a snapshot.",
        "git add copies the file as it is right now. Edit again? Add again.",
      ],
      commands: [
        { cmd: "git status", what: "See what's in each area" },
        { cmd: "git add <file>", what: "Put a file on the loading dock" },
        { cmd: "git add .", what: "Stage everything in the folder" },
      ],
    },
    {
      id: "w1-history",
      title: "Reading History",
      tagline: "log, diff and the chain of commits",
      xp: 130,
      minutes: 6,
      hook: {
        emoji: "🕵️",
        story: "A teammate asks: \"When did we add the homepage, and what exactly changed since then?\"",
        question: "How do you read the story of a project?",
      },
      concept: {
        analogies: [
          { emoji: "🧵", title: "Commits form a chain", text: "Each commit remembers its parent, the snapshot before it. Following parents backwards is reading history." },
          { emoji: "🔑", title: "Every commit has an ID", text: "Like a1b2c3d. It's a fingerprint computed from the contents, so change anything and the ID changes." },
          { emoji: "🔍", title: "git diff shows differences", text: "git diff = desk vs dock. git diff --staged = dock vs last commit. Green lines were added, red were removed." },
        ],
        demo: {
          setup: ["git init", 'echo "# Blog" > README.md', "git add .", 'git commit -m "Create README"'],
          steps: [
            { cmds: ['echo "Welcome!" > index.html', "git add index.html", 'git commit -m "Add homepage"'], say: "A second commit. See the line connecting it to its parent?" },
            { cmds: ['echo "Welcome to my blog!" > index.html'], say: "We edit the homepage again…" },
            { cmds: ["git diff"], say: "git diff shows exactly what changed: red = removed, green = added (desk vs dock)." },
            { cmds: ['git commit -am "Improve welcome text"'], say: "Shortcut: -a stages every already-tracked file, then commits. (It will NOT pick up brand-new files!)" },
            { cmds: ["git log --oneline"], say: "git log --oneline: the whole story, newest first. Each line starts with a commit ID." },
          ],
        },
      },
      predict: [
        {
          prompt: "Three commits were made in order: one, two, three. In what order does git log show them?",
          setup: ["git init", "echo 1 > f.txt", "git add .", 'git commit -m "one"', "echo 2 > f.txt", 'git commit -am "two"', "echo 3 > f.txt", 'git commit -am "three"'],
          commands: ["git log --oneline"],
          options: [
            { text: "one, two, three", why: "log starts from HEAD (the newest) and walks back through parents." },
            { text: "three, two, one", correct: true, why: "Right: newest first, because Git walks backwards from where you are through each parent." },
            { text: "Alphabetical", why: "😄 Nope. History order, newest first." },
          ],
        },
        {
          prompt: "You edited a file and staged it. Now git diff shows nothing. Why?",
          options: [
            { text: "The change was lost", why: "It's safe! It just moved onto the dock." },
            { text: "git diff compares desk vs dock, and they're now equal. Use git diff --staged", correct: true, why: "Exactly. Once staged, the change lives between the dock and the last commit." },
            { text: "diff only works after committing", why: "diff works any time. It's about which two areas you compare." },
          ],
        },
        {
          prompt: "You create a brand-new file and run git commit -am \"add\". Is the new file included?",
          options: [
            { text: "Yes", why: "-a only auto-stages files Git already tracks. New files need an explicit git add first." },
            { text: "No: -a only stages already-tracked files", correct: true, why: "Correct! This catches many people out." },
          ],
        },
      ],
      challenge: {
        brief: "Grow your journal into a real history: at least 3 commits. Inspect a change with diff before committing it, then read the story with log.",
        setup: ["git init", 'echo "# Journal" > journal.md', "git add .", 'git commit -m "Start journal"'],
        tasks: [
          { label: "Inspect a change with git diff", check: (_s, ctx) => ran(ctx, /^git diff/) },
          { label: "Have at least 3 commits in total", check: (s) => commitCount(s) >= 3 },
          { label: "Read the story with git log", check: (_s, ctx) => ran(ctx, /^git log/) },
        ],
        hints: ['Append a line: echo "Day 2: learned git" >> journal.md', 'git diff, then git commit -am "Day 2"', "Repeat once more, then git log --oneline"],
        par: 7,
      },
      recap: [
        "Commits form a chain; each points to its parent.",
        "Every commit has a unique ID (hash) based on its content.",
        "git log shows history newest first. Add --oneline for a compact view.",
        "git diff = unstaged changes; git diff --staged = staged changes.",
      ],
      commands: [
        { cmd: "git log --oneline", what: "Compact history" },
        { cmd: "git diff", what: "Changes not yet staged" },
        { cmd: "git diff --staged", what: "Changes staged for commit" },
        { cmd: 'git commit -am "msg"', what: "Stage tracked files + commit" },
      ],
    },
  ],
};
