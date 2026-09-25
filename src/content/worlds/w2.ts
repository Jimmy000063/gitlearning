import type { World } from "../types";
import { contains, ever, headId, on, ran, rootCommit, tree } from "../helpers";

const recipe = [
  "git init",
  'echo "Pancakes: flour, eggs, milk" > recipe.txt',
  "git add .",
  'git commit -m "Original recipe"',
  'echo "Pancakes: flour, eggs, milk, sugar" > recipe.txt',
  'git commit -am "Add sugar"',
  'echo "Pancakes: flour, eggs, milk, sugar, ketchup??" > recipe.txt',
  'git commit -am "Experimental topping"',
];

export const w2: World = {
  id: "w2",
  n: 2,
  title: "Time Travel",
  emoji: "🕰️",
  tagline: "Move through history and undo mistakes",
  color: "#22d3ee",
  lessons: [
    {
      id: "w2-head",
      title: "HEAD: You Are Here",
      tagline: "Checkout old snapshots safely",
      xp: 130,
      minutes: 6,
      hook: {
        emoji: "🗺️",
        story: "Your app worked perfectly last Tuesday. Today it's broken. You want to look at Tuesday's version without destroying today's work.",
        question: "Can you visit the past and come back?",
      },
      concept: {
        analogies: [
          { emoji: "📍", title: "HEAD = \"you are here\"", text: "HEAD marks what you're currently looking at. Normally HEAD points to a branch (like main), which points to a commit." },
          { emoji: "⏪", title: "Checkout = time travel", text: "git checkout <commit> moves HEAD to an old snapshot, and the files on your desk change to match it." },
          { emoji: "🎈", title: "Detached HEAD", text: "When HEAD points straight at a commit instead of a branch, it's \"detached\". Great for looking around; switch back to a branch before doing real work." },
        ],
        demo: {
          setup: recipe,
          steps: [
            { cmds: ["git log --oneline"], say: "Three snapshots. See the HEAD tag on main? HEAD → main → newest commit." },
            { cmds: ["git checkout HEAD~2"], say: "HEAD~2 means \"two commits before HEAD\". HEAD jumps back and detaches from main. main itself didn't move!" },
            { cmds: ["cat recipe.txt"], say: "The file on your desk now shows the old version. You're literally looking at the past." },
            { cmds: ["git switch main"], say: "Back to the present. Nothing was lost: every snapshot is still in the album." },
          ],
        },
      },
      predict: [
        {
          prompt: "HEAD is on main (3 commits). You run git checkout HEAD~1. What happens to main?",
          setup: recipe,
          commands: ["git checkout HEAD~1"],
          options: [
            { text: "main moves back one commit too", why: "No: checkout moves only HEAD. Branches stay put. That's why looking around is completely safe." },
            { text: "main stays; HEAD detaches onto the older commit", correct: true, why: "Exactly. Watch the amber HEAD label hop back while main stays on the newest commit." },
            { text: "The newest commit is deleted", why: "Checkout never deletes anything. It just changes what you're looking at." },
          ],
        },
        {
          prompt: "What does HEAD~2 mean?",
          options: [
            { text: "The commit two steps before HEAD", correct: true, why: "Yes: ~ follows parents backwards. HEAD~1 is the parent, HEAD~2 the grandparent." },
            { text: "The second branch", why: "~ is about parents, not branches." },
            { text: "Two commits in the future", why: "Commits only know their parents, so ~ can only go backwards." },
          ],
        },
      ],
      challenge: {
        brief: "Someone ruined the pancake recipe. Travel back to the very first commit, read the original recipe, then return to main.",
        setup: recipe,
        tasks: [
          { label: "Travel to the first commit (detached HEAD)", check: (_s, ctx) => ever(ctx, (st) => st.head.type === "detached" && headId(st) === rootCommit(st)) },
          { label: "Read the original with cat recipe.txt", check: (_s, ctx) => ran(ctx, /^cat recipe\.txt/) },
          { label: "Return to main", check: (s, ctx) => on(s, "main") && ever(ctx, (st) => st.head.type === "detached") },
        ],
        hints: ["Find commit IDs with git log --oneline", "git checkout HEAD~2 (or paste the first commit's ID)", "git switch main brings you home"],
        par: 3,
      },
      recap: [
        "HEAD = where you are. Usually it points to a branch.",
        "git checkout <commit> time-travels by moving HEAD. Branches don't move.",
        "HEAD~n = n commits back. Detached HEAD = looking at a commit directly.",
        "git switch <branch> brings you back to the present.",
      ],
      commands: [
        { cmd: "git checkout <commit>", what: "Visit an old snapshot" },
        { cmd: "git switch <branch>", what: "Go back to a branch" },
        { cmd: "HEAD~2", what: "Two commits before HEAD" },
      ],
    },
    {
      id: "w2-undo-local",
      title: "Undo Before You Commit",
      tagline: "restore and restore --staged",
      xp: 130,
      minutes: 5,
      hook: {
        emoji: "💥",
        story: "You experimented in style.css and broke every page. You haven't committed. You just want the last good version back, right now.",
        question: "How do you throw away a bad edit, or take a file back off the dock?",
      },
      concept: {
        analogies: [
          { emoji: "♻️", title: "git restore <file>", text: "Throws away desk changes by copying the file back from the dock. ⚠️ Those edits were never saved, so they're gone for good." },
          { emoji: "↩️", title: "git restore --staged <file>", text: "Takes a file off the loading dock. Your edits stay safely on your desk; they just won't be in the next commit." },
          { emoji: "🛡️", title: "Why commits are safe", text: "Anything committed can be recovered. Uncommitted edits are the only fragile thing, so commit often!" },
        ],
        demo: {
          setup: ["git init", 'echo "body { color: black }" > style.css', "git add .", 'git commit -m "Add styles"'],
          steps: [
            { cmds: ['echo "body { color: ??? BROKEN" > style.css'], say: "Oops. style.css is broken on our desk." },
            { cmds: ["git diff"], say: "git diff shows the damage." },
            { cmds: ["git restore style.css"], say: "restore copies the good version back onto the desk. The edit is gone." },
            { cmds: ['echo "PASSWORD=hunter2" > secrets.env', "git add ."], say: "Uh-oh: git add . just staged a secrets file!" },
            { cmds: ["git restore --staged secrets.env"], say: "Off the dock! It stays on your desk but won't be committed." },
          ],
        },
      },
      predict: [
        {
          prompt: "app.js has staged edits. You run git restore --staged app.js. What happens to your edits?",
          setup: ["git init", 'echo "v1" > app.js', "git add .", 'git commit -m "v1"', 'echo "v2" > app.js', "git add app.js"],
          commands: ["git restore --staged app.js"],
          options: [
            { text: "Deleted forever", why: "--staged only touches the dock. Your desk copy is untouched." },
            { text: "They stay on the desk, just unstaged", correct: true, why: "Right. Watch the Three Areas: the edit leaves the dock but stays in the working directory." },
            { text: "They get committed", why: "Nothing is committed without git commit." },
          ],
        },
        {
          prompt: "Which of these can permanently lose work?",
          options: [
            { text: "git restore <file> (discard desk edits)", correct: true, why: "Yes: uncommitted edits you discard were never saved by Git, so there's no way back. Use it deliberately." },
            { text: "git restore --staged <file>", why: "Safe: it only unstages. The edits remain on your desk." },
            { text: "git status", why: "Totally read-only. Run it as often as you like!" },
          ],
        },
      ],
      challenge: {
        brief: "Rescue this mess: keep the good index.html change staged, throw away the broken style.css edit, and make sure secrets.env won't be committed.",
        setup: [
          "git init",
          'echo "<h1>Hi</h1>" > index.html',
          'echo "body { margin: 0 }" > style.css',
          "git add .",
          'git commit -m "Initial site"',
          'echo "<h1>Hi there!</h1>" > index.html',
          'echo "💥💥💥 broken" > style.css',
          'echo "API_KEY=abc123" > secrets.env',
          "git add .",
        ],
        tasks: [
          { label: "style.css is back to the last good version", check: (s) => s.working["style.css"] === tree(s)["style.css"] && s.index["style.css"] === tree(s)["style.css"] },
          { label: "secrets.env is not staged", check: (s) => !("secrets.env" in s.index) },
          { label: "The index.html improvement is still staged", check: (s) => s.index["index.html"] === "<h1>Hi there!</h1>" },
        ],
        hints: ["git status shows everything that's staged", "Unstage: git restore --staged style.css secrets.env", "Then discard the desk edit: git restore style.css"],
        par: 3,
      },
      recap: [
        "git restore <file> discards desk edits. They're gone for good!",
        "git restore --staged <file> unstages but keeps your edits.",
        "Committed work is always recoverable; uncommitted work isn't.",
      ],
      commands: [
        { cmd: "git restore <file>", what: "Discard working changes" },
        { cmd: "git restore --staged <file>", what: "Unstage a file" },
      ],
    },
    {
      id: "w2-reset-revert",
      title: "Reset vs Revert",
      tagline: "Undo commits: erase or counteract?",
      xp: 150,
      minutes: 7,
      hook: {
        emoji: "🚨",
        story: "You committed a bug. Should you erase the commit from history, or add a new commit that cancels it out?",
        question: "It depends on one thing: has anyone else got it yet?",
      },
      concept: {
        analogies: [
          { emoji: "✂️", title: "reset = move the branch back", text: "git reset moves your branch pointer to an older commit. Later commits fall off the timeline. --soft keeps their changes staged, the default keeps them on your desk, --hard throws them away." },
          { emoji: "🔁", title: "revert = an anti-commit", text: "git revert creates a NEW commit that does the exact opposite of an old one. History stays honest, so it's safe for shared branches." },
          { emoji: "🧭", title: "Rule of thumb", text: "Not shared yet? reset is fine. Already pushed or shared? Use revert." },
        ],
        demo: {
          setup: ["git init", 'echo "v1" > app.js', "git add .", 'git commit -m "Build app"', 'echo "v1 + feature" > app.js', 'git commit -am "Add feature"', 'echo "v1 + feature + BUG" > app.js', 'git commit -am "Add bug"'],
          steps: [
            { cmds: ["git revert HEAD"], say: "revert adds a new commit that undoes \"Add bug\". Nothing disappears; the history now tells the full truth." },
            { cmds: ["git reset --hard HEAD~2"], say: "reset --hard moves main back two commits. Those commits become 👻 ghosts: no branch points to them any more." },
            { cmds: ["git log --oneline"], say: "History is now shorter. That's rewriting history: fine for local work, dangerous for shared work." },
          ],
        },
      },
      predict: [
        {
          prompt: "main is A → B → C. You run git reset --soft HEAD~1. Where do C's changes end up?",
          setup: ["git init", "echo A > f.txt", "git add .", 'git commit -m "A"', "echo B > f.txt", 'git commit -am "B"', "echo C > f.txt", 'git commit -am "C"'],
          commands: ["git reset --soft HEAD~1"],
          options: [
            { text: "Gone forever", why: "Only --hard discards changes, and even then the commit survives in the reflog for a while." },
            { text: "Staged, ready to re-commit", correct: true, why: "Yes! --soft moves the branch but leaves the dock as it was. Great for squashing or rewording." },
            { text: "Still in commit C on main", why: "main moved back to B, so C is no longer part of main (see the ghost)." },
          ],
        },
        {
          prompt: "Your bad commit is already on GitHub and teammates pulled it. Best fix?",
          options: [
            { text: "git reset --hard, then force push", why: "That rewrites history your teammates already have, which causes chaos for them." },
            { text: "git revert <commit>", correct: true, why: "Right. A new commit cancels the bad one; everyone simply pulls it." },
            { text: "Delete the repository and start over", why: "😅 Let's not." },
          ],
        },
      ],
      challenge: {
        brief: "A commit called \"Add broken footer\" slipped into main and it's already shared with the team. Undo it the safe way, keeping everything else.",
        setup: [
          "git init",
          'echo "<header>Hi</header>" > index.html',
          "git add .",
          'git commit -m "Add header"',
          'echo "<footer>BROKEN</footer>" > footer.html',
          "git add .",
          'git commit -m "Add broken footer"',
          'echo "<p>About us</p>" > about.html',
          "git add .",
          'git commit -m "Add about page"',
        ],
        tasks: [
          { label: "The broken footer is undone", check: (s) => !("footer.html" in tree(s)) },
          { label: "The about page is kept", check: (s) => "about.html" in tree(s) },
          { label: "History not rewritten (all 3 original commits still on main)", check: (s) => ["Add header", "Add broken footer", "Add about page"].every((m) => contains(s, "main", m)) },
        ],
        hints: ["git log --oneline to find the bad commit", "It's one before HEAD: HEAD~1", "git revert HEAD~1"],
        par: 2,
      },
      recap: [
        "reset moves the branch pointer back (rewrites history).",
        "--soft keeps changes staged · default (--mixed) keeps them on your desk · --hard discards them.",
        "revert adds a new commit that cancels an old one (safe for shared work).",
      ],
      commands: [
        { cmd: "git reset --soft HEAD~1", what: "Undo commit, keep changes staged" },
        { cmd: "git reset --hard HEAD~1", what: "Undo commit and discard changes" },
        { cmd: "git revert <commit>", what: "Add a commit that undoes another" },
      ],
    },
  ],
};
