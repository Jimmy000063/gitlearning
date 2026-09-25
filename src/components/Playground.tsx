"use client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { runScript } from "@/engine/commands";
import { emptyRepo } from "@/engine/repo";
import type { Line } from "@/engine/types";
import { GitLab } from "@/components/lab/GitLab";
import { useGitSession } from "@/components/lab/useGitSession";
import { BitSays, type Mood } from "@/components/Mascot";
import { useProgress } from "@/store/progress";

const URL = "https://github.com/you/project.git";

const SCENARIOS = [
  { id: "empty", emoji: "🪐", title: "Empty folder", desc: "Start from absolute zero.", setup: [] as string[] },
  {
    id: "history",
    emoji: "📜",
    title: "Repo with history",
    desc: "A few commits to time-travel through.",
    setup: ["git init", 'echo "# Portfolio" > README.md', "git add .", 'git commit -m "Create README"', 'echo "<h1>Me</h1>" > index.html', "git add .", 'git commit -m "Add homepage"', 'echo "body{}" > style.css', "git add .", 'git commit -m "Add styles"'],
  },
  {
    id: "branches",
    emoji: "🌿",
    title: "Branching galaxy",
    desc: "Three diverged branches. Merge or rebase them!",
    setup: ["git init", 'echo "v1" > app.js', "git add .", 'git commit -m "Initial app"', "git switch -c login", 'echo "login" > login.js', "git add .", 'git commit -m "Add login"', 'echo "oauth" >> login.js', 'git commit -am "Add OAuth"', "git switch main", "git switch -c darkmode", 'echo "dark" > theme.css', "git add .", 'git commit -m "Dark mode"', "git switch main", 'echo "docs" > docs.md', "git add .", 'git commit -m "Write docs"'],
  },
  {
    id: "conflict",
    emoji: "⚔️",
    title: "Conflict arena",
    desc: "Merging here WILL conflict. Resolve it.",
    setup: ["git init", 'echo "color: blue" > theme.txt', "git add .", 'git commit -m "Theme"', "git switch -c red", 'echo "color: red" > theme.txt', 'git commit -am "Make it red"', "git switch main", 'echo "color: green" > theme.txt', 'git commit -am "Make it green"'],
  },
  {
    id: "remote",
    emoji: "☁️",
    title: "Team on GitHub",
    desc: "Clone it. Your teammate is already pushing…",
    setup: ["git init", 'echo "# Team" > README.md', "git add .", 'git commit -m "Initial commit"', "__publish", '__teammate main notes.txt "from Sam" "Sam: add notes"'],
  },
];

const IDEAS = [
  "Make a commit, then find it again with git reflog after a reset --hard",
  "Create two branches that edit the same file, then merge them",
  "Rebase a branch and watch the ghost commits appear",
  "Inspect a commit with git cat-file -p HEAD",
  "Stash some work, switch branches, then pop it back",
  `Clone ${URL.replace("https://", "")}, commit, and push`,
];

export function Playground() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const initial = useMemo(() => (scenario.setup.length ? runScript(scenario.setup) : emptyRepo()), [scenario]);
  const intro: Line[] = [
    { text: `🧪 Sandbox: ${scenario.title}. ${scenario.desc}`, kind: "info" },
    { text: 'Type "help" for every command. Nothing here can break. There\'s always Undo.', kind: "muted" },
  ];
  const session = useGitSession(initial, intro);
  const earn = useProgress((s) => s.earn);

  useEffect(() => {
    if (session.commands >= 25) earn("sandbox-explorer");
  }, [session.commands, earn]);

  const pick = (s: (typeof SCENARIOS)[number]) => {
    setScenario(s);
    const next = s.setup.length ? runScript(s.setup) : emptyRepo();
    session.reset(next, [
      { text: `🧪 Sandbox: ${s.title}. ${s.desc}`, kind: "info" },
      ...(s.id === "remote" ? [{ text: `Start with: git clone ${URL}`, kind: "muted" as const }] : []),
    ]);
  };

  const ev = session.last?.event;
  const mood: Mood = ev === "error" ? "oops" : ev === "commit" || ev === "merge" || ev === "push" ? "happy" : ev === "conflict" ? "think" : "idle";
  const say =
    ev === "error"
      ? "Git said no, and read why. Its error messages are surprisingly helpful!"
      : ev === "conflict"
        ? "A conflict! cat the file, rewrite it with echo, then git add + git commit."
        : ev === "commit"
          ? "Snapshot saved ✨ See the new star in the graph?"
          : ev === "merge"
            ? "Timelines merged. Hover commits to inspect them."
            : ev === "push"
              ? "Uploaded to the remote. Check the ☁️ Remote tab."
              : "Try anything. Hover the graph's stars to see commit details.";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 md:pt-32">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Sandbox mode</div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-5xl">
            The <span className="text-gradient">Playground</span>
          </h1>
          <p className="mt-2 max-w-xl text-mist">A full Git simulator. No goals, no grades: just you, a terminal, and a universe that reacts to every command.</p>
        </div>
        <BitSays mood={mood} size={56}>
          {say}
        </BitSays>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scroll-thin">
        {SCENARIOS.map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ y: -3 }}
            onClick={() => pick(s)}
            className={`glass flex min-w-[190px] flex-col rounded-2xl p-3 text-left transition ${scenario.id === s.id ? "border-violet/70 shadow-[0_0_30px_-10px_rgba(139,92,246,0.9)]" : "opacity-75 hover:opacity-100"}`}
          >
            <span className="text-xl">{s.emoji}</span>
            <span className="mt-1 text-sm font-semibold">{s.title}</span>
            <span className="text-[11px] text-white/50">{s.desc}</span>
          </motion.button>
        ))}
      </div>

      <GitLab session={session} tabs={["files", "remote", "objects"]} onReset={() => pick(scenario)} autoFocus terminalClass="h-[480px]" />

      <div className="mt-10">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Things to try</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              <span className="mr-2 text-violet">✦</span>
              {idea}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
