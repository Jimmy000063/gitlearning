import type { World } from "../types";
import { commitCount, headId, ran } from "../helpers";

export const w6: World = {
  id: "w6",
  n: 6,
  title: "Git Internals",
  emoji: "🧠",
  tagline: "Blobs, trees, hashes, refs and tags",
  color: "#fbbf24",
  lessons: [
    {
      id: "w6-objects",
      title: "Inside .git: The Object Store",
      tagline: "Blobs, trees, commits and hashes",
      xp: 200,
      minutes: 8,
      hook: {
        emoji: "🔬",
        story: "Git stores every version of every file you've ever committed, yet repositories stay small and fast.",
        question: "How? Let's open the hood.",
      },
      concept: {
        analogies: [
          { emoji: "💧", title: "Blob = file contents", text: "A blob stores only a file's contents, with no filename. Identical content produces the same blob, stored just once." },
          { emoji: "🌳", title: "Tree = folder listing", text: "A tree maps names to blobs (and to sub-trees for folders). Filenames live here." },
          { emoji: "📸", title: "Commit = tree + context", text: "A commit points to one tree (the snapshot), its parent commit(s), the author and the message." },
          { emoji: "🔐", title: "Hash = fingerprint", text: "Every object's ID is a hash of its content. Change one character and the ID changes completely. That's how Git detects any change or corruption." },
        ],
        demo: {
          setup: ["git init", 'echo "hello" > a.txt', 'echo "hello" > b.txt', 'echo "bye" > c.txt', "git add .", 'git commit -m "Three files"'],
          tabs: ["objects", "files"],
          steps: [
            { say: "Look at the Objects panel: commit → tree → blobs. Notice a.txt and b.txt share a blob, because their content is identical." },
            { cmds: ["git cat-file -p HEAD"], say: "The raw commit object: a tree ID, an author, a message." },
            { cmds: ["git cat-file -p HEAD^{tree}"], say: "The tree: names → blob IDs. a.txt and b.txt point to the SAME blob. Stored once!" },
            { cmds: ["git hash-object a.txt", 'echo "hello!" > a.txt', "git hash-object a.txt"], say: "Add a single \"!\" and the hash is completely different." },
          ],
        },
      },
      predict: [
        {
          prompt: "Two files have identical content. How many blobs does Git store for them?",
          options: [
            { text: "1", correct: true, why: "Same content → same hash → one blob. This deduplication is why Git is so space-efficient." },
            { text: "2", why: "Blobs don't know filenames, so two identical contents are the same blob." },
          ],
        },
        {
          prompt: "You rename a file without changing its content. Which object changes?",
          options: [
            { text: "The blob", why: "The content didn't change, so the blob is identical." },
            { text: "The tree (filenames live in trees)", correct: true, why: "Exactly. A new tree with the new name points to the same old blob." },
          ],
        },
      ],
      challenge: {
        brief: "Become a Git archaeologist: inspect a commit object, its tree, and one blob by its hash.",
        setup: ["git init", 'echo "# Secrets of Git" > README.md', 'echo "print(42)" > main.py', "git add .", 'git commit -m "Ancient artifact"'],
        tabs: ["objects", "files"],
        tasks: [
          { label: "Inspect the commit (git cat-file -p HEAD)", check: (_s, ctx) => ran(ctx, /^git cat-file -p (HEAD|main|[0-9a-f]{4,})$/) },
          { label: "Inspect its tree (HEAD^{tree} or git ls-tree HEAD)", check: (_s, ctx) => ran(ctx, /\^\{tree\}|^git ls-tree/) },
          { label: "Read a blob by its hash", check: (_s, ctx) => ctx.history.some((h, i) => /^git cat-file -p [0-9a-f]{4,}$/.test(h.trim()) && ctx.history.slice(0, i).some((p) => /tree/.test(p))) },
        ],
        hints: ["git cat-file -p HEAD", "git cat-file -p HEAD^{tree}", "Copy a blob hash from the tree output: git cat-file -p <hash>"],
        par: 3,
      },
      recap: [
        "blob = contents · tree = names → blobs · commit = tree + parents + message.",
        "Every object's ID is a hash of its content.",
        "Identical content is stored once; that's why Git stays small.",
      ],
      commands: [
        { cmd: "git cat-file -p <id>", what: "Print any object" },
        { cmd: "git ls-tree HEAD", what: "List a commit's tree" },
        { cmd: "git hash-object <file>", what: "Compute a file's blob ID" },
      ],
    },
    {
      id: "w6-refs",
      title: "Refs, Tags & Amend",
      tagline: "Names that point at commits",
      xp: 200,
      minutes: 6,
      hook: {
        emoji: "🏷️",
        story: "You're shipping version 1.0! You need a permanent bookmark on this exact commit, one that never moves, unlike a branch.",
        question: "What's the difference between a branch and a tag?",
      },
      concept: {
        analogies: [
          { emoji: "🔗", title: "Everything is a ref", text: "Branches, tags and HEAD are all refs: human-friendly names that point to a commit ID." },
          { emoji: "📌", title: "Tags don't move", text: "A branch moves when you commit on it. A tag stays put forever, which makes it perfect for releases like v1.0." },
          { emoji: "🩹", title: "Amend = replace the last commit", text: "git commit --amend makes a new commit that replaces the previous one (new ID!). Only amend what you haven't pushed." },
        ],
        demo: {
          setup: ["git init", 'echo "app" > app.js', "git add .", 'git commit -m "Build app"', 'echo "styles" > style.css', "git add .", 'git commit -m "Add styles"'],
          steps: [
            { cmds: ["git tag v1.0"], say: "A green tag pinned to the current commit." },
            { cmds: ['echo "more" >> app.js', 'git commit -am "Start v2 work"'], say: "main moves forward… v1.0 stays exactly where it was." },
            { cmds: ['git commit --amend -m "Start version 2"'], say: "Amend replaced the last commit: the old one is a ghost, the new one has a new ID." },
          ],
        },
      },
      predict: [
        {
          prompt: "You tag a commit v1.0, then make 3 more commits. Where does v1.0 point?",
          setup: ["git init", "echo a > a.txt", "git add .", 'git commit -m "Release"', "git tag v1.0"],
          commands: ["echo b > a.txt", 'git commit -am "More 1"', "echo c > a.txt", 'git commit -am "More 2"', "echo d > a.txt", 'git commit -am "More 3"'],
          options: [
            { text: "The newest commit", why: "That's what a branch would do. Tags never move." },
            { text: "The same commit as before", correct: true, why: "Right! Tags are fixed bookmarks, ideal for releases." },
          ],
        },
      ],
      challenge: {
        brief: "The last commit message has a typo (\"readmee\"). Fix it with amend, then tag the fixed commit as v1.0.",
        setup: ["git init", 'echo "app" > app.js', "git add .", 'git commit -m "Build app"', 'echo "# App" > README.md', "git add .", 'git commit -m "Add readmee"'],
        tasks: [
          { label: "Last commit message reads: Add readme", check: (s) => s.commits[headId(s)!]?.message === "Add readme" },
          { label: "Still exactly 2 commits (amended, not added)", check: (s) => commitCount(s) === 2 },
          { label: "Tag v1.0 points at the fixed commit", check: (s) => s.tags["v1.0"] === headId(s) && s.commits[headId(s)!]?.message === "Add readme" },
        ],
        hints: ['git commit --amend -m "Add readme"', "git tag v1.0", "git log --oneline to admire it"],
        par: 2,
      },
      recap: [
        "Branches, tags, HEAD: all refs pointing at commits.",
        "Tags stay put, so use them for releases.",
        "--amend replaces the last commit (new ID). Don't amend pushed commits.",
      ],
      commands: [
        { cmd: "git tag <name>", what: "Bookmark the current commit" },
        { cmd: "git commit --amend", what: "Replace the last commit" },
        { cmd: "git show <ref>", what: "Inspect a commit" },
      ],
    },
  ],
};
