import type { FileMap, GitEvent, Line, LineKind, RepoState, RunResult } from "./types";
import {
  AUTHOR,
  REMOTE_URL,
  GitError,
  aheadBehind,
  advanceHead,
  ancestors,
  blobId,
  checkoutTree,
  cloneState,
  commitsBetween,
  currentBranch,
  diffStat,
  emptyRepo,
  fail,
  hasMarkers,
  headId,
  headTree,
  isAncestor,
  isDirty,
  logReflog,
  makeCommit,
  merge3,
  mergeBase,
  resolve,
  setHead,
  status,
  treeId,
  treeOf,
  untrackedFiles,
} from "./repo";
import { lineDiff, plural, short, tokenize } from "./utils";

class Out {
  lines: Line[] = [];
  event: GitEvent = "none";
  clear = false;
  push(text: string, kind: LineKind = "out") {
    for (const t of text.split("\n")) this.lines.push({ text: t, kind });
  }
}

export const GIT_COMMANDS = [
  "init", "status", "add", "commit", "log", "diff", "show", "branch", "checkout", "switch", "merge",
  "reset", "restore", "revert", "rm", "stash", "tag", "cherry-pick", "rebase", "reflog", "remote",
  "clone", "fetch", "pull", "push", "cat-file", "ls-tree", "hash-object", "config", "help",
];
export const SHELL_COMMANDS = ["ls", "cat", "touch", "echo", "rm", "clear", "help", "pwd"];

/** Run one line of input against a repository. Never mutates the input state. */
export function run(state: RepoState, input: string): RunResult {
  const out = new Out();
  const s = cloneState(state);
  const trimmed = input.trim();
  if (!trimmed) return { state, lines: [], event: "none" };
  try {
    dispatch(s, tokenize(trimmed), out, trimmed);
    return { state: s, lines: out.lines, event: out.event, clear: out.clear };
  } catch (e) {
    if (e instanceof GitError) {
      const lines: Line[] = e.lines.map((text) => ({ text, kind: "err" as const }));
      if (e.hint) lines.push({ text: `💡 ${e.hint}`, kind: "info" });
      return { state, lines, event: "error" };
    }
    throw e;
  }
}

/** Run a list of commands, throwing if any fails (used to build lesson scenarios). */
export function runScript(commands: string[], start: RepoState = emptyRepo()): RepoState {
  let s = start;
  for (const cmd of commands) {
    const r = run(s, cmd);
    if (r.event === "error") throw new Error(`Scenario command failed: ${cmd}\n${r.lines.map((l) => l.text).join("\n")}`);
    s = r.state;
  }
  return s;
}

function dispatch(s: RepoState, argv: string[], out: Out, raw: string) {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case "git":
      return git(s, args, out);
    case "clear":
    case "cls":
      out.clear = true;
      return;
    case "help":
      return help(out);
    case "pwd":
      return out.push("/home/you/project");
    case "ls":
    case "dir": {
      const files = Object.keys(s.working).sort();
      const all = args.includes("-a") || args.includes("-la");
      const list = [...(all && s.initialized ? [".git/"] : []), ...files];
      if (list.length) out.push(list.join("   "), "info");
      else out.push("(empty folder)", "muted");
      return;
    }
    case "cat": {
      if (!args.length) fail("cat: missing file name");
      for (const f of args) {
        if (!(f in s.working)) fail(`cat: ${f}: No such file or directory`);
        out.push(s.working[f] === "" ? "(empty file)" : s.working[f], s.working[f] === "" ? "muted" : "out");
      }
      return;
    }
    case "touch": {
      if (!args.length) fail("touch: missing file name");
      for (const f of args) if (!(f in s.working)) s.working[f] = "";
      out.event = "file";
      return;
    }
    case "echo":
      return echo(s, args, out, raw);
    case "rm": {
      const files = args.filter((a) => !a.startsWith("-"));
      if (!files.length) fail("rm: missing file name");
      for (const f of files) {
        if (!(f in s.working)) fail(`rm: cannot remove '${f}': No such file or directory`);
        delete s.working[f];
      }
      out.event = "file";
      return;
    }
    case "nano":
    case "vim":
    case "vi":
    case "code":
      fail(`${cmd}: editors aren't available in this sandbox`, `Write to files with: echo "some text" > ${args[0] ?? "file.txt"}   (use >> to append)`);
      return;
    case "__publish": {
      // Move the local repo to a pretend GitHub remote and empty the local folder.
      s.remote = { name: "origin", url: REMOTE_URL, branches: { ...s.branches } };
      const commits = s.commits;
      const seq = s.seq;
      Object.assign(s, emptyRepo(), { commits, seq, remote: s.remote });
      return;
    }
    case "__teammate": {
      // __teammate <branch> <file> <content> <message> — someone else pushes to the remote.
      const [branch, file, content, message] = args;
      if (!s.remote) fail("no remote");
      const parent = s.remote!.branches[branch];
      const tree = { ...treeOf(s, parent ?? null), [file]: content.replace(/\\n/g, "\n") };
      s.remote!.branches[branch] = makeCommit(s, message, parent ? [parent] : [], tree);
      return;
    }
    case "__write": {
      const [file, content] = args;
      s.working[file] = content.replace(/\\n/g, "\n");
      return;
    }
    default: {
      if (GIT_COMMANDS.includes(cmd)) fail(`${cmd}: command not found`, `Git commands start with "git". Try: git ${[cmd, ...args].join(" ")}`);
      fail(`${cmd}: command not found`, `Type "help" to see what you can do here.`);
    }
  }
}

function help(out: Out) {
  out.push("Shell:  ls  cat <file>  touch <file>  echo \"text\" > <file>  echo \"more\" >> <file>  rm <file>  clear", "info");
  out.push("Git:    " + GIT_COMMANDS.filter((c) => c !== "help").join("  "), "info");
  out.push("Tips:   ↑/↓ for history · Tab to autocomplete · Ctrl+L to clear", "muted");
}

function echo(s: RepoState, args: string[], out: Out, raw: string) {
  const redirect = args.findIndex((a) => a === ">" || a === ">>");
  if (redirect === -1) {
    // Support `echo hi>file` written without spaces.
    const m = raw.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)$/);
    if (m && !/^["']/.test(m[3])) return echo(s, [...tokenize(m[1]), m[2], m[3]], out, "");
    out.push(args.join(" "));
    return;
  }
  const text = args.slice(0, redirect).join(" ");
  const file = args[redirect + 1];
  if (!file) fail("syntax error: expected a file name after " + args[redirect]);
  if (args[redirect] === ">>" && s.working[file]) s.working[file] = s.working[file] + "\n" + text;
  else s.working[file] = text;
  out.event = "file";
}

// ------------------------------------------------------------------ git ----

function requireRepo(s: RepoState) {
  if (!s.initialized)
    fail("fatal: not a git repository (or any of the parent directories): .git", "Run `git init` first to turn this folder into a Git repository.");
}

function requireCommit(s: RepoState): string {
  const id = headId(s);
  if (!id) fail(`fatal: your current branch '${currentBranch(s)}' does not have any commits yet`, "Make your first commit with git add + git commit -m \"message\".");
  return id!;
}

function mustResolve(s: RepoState, ref: string): string {
  const id = resolve(s, ref);
  if (!id) fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`);
  return id!;
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function git(s: RepoState, args: string[], out: Out) {
  const [sub, ...rest] = args;
  if (!sub || sub === "help" || sub === "--help") return help(out);
  if (sub === "--version" || sub === "version") return out.push("git version 2.46.0 (Git Galaxy simulator)");
  const handler = HANDLERS[sub];
  if (!handler) {
    const guess = [...GIT_COMMANDS].sort((a, b) => levenshtein(sub, a) - levenshtein(sub, b))[0];
    fail(`git: '${sub}' is not a git command. See 'git --help'.`, `Did you mean: git ${guess}?`);
  }
  if (!["init", "clone", "config"].includes(sub)) requireRepo(s);
  handler(s, rest, out);
}

type Handler = (s: RepoState, args: string[], out: Out) => void;

const HANDLERS: Record<string, Handler> = {
  init(s, _args, out) {
    if (s.initialized) return out.push("Reinitialized existing Git repository in /home/you/project/.git/");
    s.initialized = true;
    s.head = { type: "branch", name: "main" };
    out.push("Initialized empty Git repository in /home/you/project/.git/", "success");
    out.event = "init";
  },

  config(_s, args, out) {
    if (args.includes("--list")) return out.push("user.name=You\nuser.email=you@gitgalaxy.dev\ninit.defaultbranch=main");
    if (args.length <= 2 && args[args.length - 1]?.startsWith("user.")) {
      return out.push(args[args.length - 1].endsWith("email") ? "you@gitgalaxy.dev" : "You");
    }
    out.push("(config saved)", "muted");
  },

  status(s, _args, out) {
    const branch = currentBranch(s);
    out.push(branch ? `On branch ${branch}` : `HEAD detached at ${short(headId(s)!)}`);
    if (branch && s.upstream[branch]) {
      const trackRef = `origin/${s.upstream[branch]}`;
      const local = s.branches[branch];
      const remote = s.tracking[trackRef];
      if (local && remote) {
        const { ahead, behind } = aheadBehind(s, local, remote);
        if (!ahead && !behind) out.push(`Your branch is up to date with '${trackRef}'.`);
        else if (ahead && !behind) out.push(`Your branch is ahead of '${trackRef}' by ${plural(ahead, "commit")}.\n  (use "git push" to publish your local commits)`);
        else if (behind && !ahead) out.push(`Your branch is behind '${trackRef}' by ${plural(behind, "commit")}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)`);
        else out.push(`Your branch and '${trackRef}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.`);
      }
    }
    if (!headId(s)) out.push("\nNo commits yet");
    if (s.merging) {
      const open = s.merging.conflicts;
      out.push(open.length ? "\nYou have unmerged paths.\n  (fix conflicts and run \"git commit\")" : "\nAll conflicts fixed but you are still merging.\n  (use \"git commit\" to conclude merge)");
      if (open.length) {
        out.push("\nUnmerged paths:\n  (use \"git add <file>...\" to mark resolution)");
        for (const f of open) out.push(`\tboth modified:   ${f}`, "err");
      }
    }
    const st = status(s);
    const conflicted = new Set(s.merging?.conflicts ?? []);
    const staged = st.staged.filter((c) => !conflicted.has(c.file));
    if (staged.length) {
      out.push("\nChanges to be committed:\n  (use \"git restore --staged <file>...\" to unstage)");
      for (const c of staged) out.push(`\t${(c.kind + ":").padEnd(12)}${c.file}`, "success");
    }
    const unstaged = st.unstaged.filter((c) => !conflicted.has(c.file));
    if (unstaged.length) {
      out.push("\nChanges not staged for commit:\n  (use \"git add <file>...\" to update what will be committed)\n  (use \"git restore <file>...\" to discard changes in working directory)");
      for (const c of unstaged) out.push(`\t${(c.kind + ":").padEnd(12)}${c.file}`, "err");
    }
    if (st.untracked.length) {
      out.push("\nUntracked files:\n  (use \"git add <file>...\" to include in what will be committed)");
      for (const f of st.untracked) out.push(`\t${f}`, "err");
    }
    if (!staged.length && !unstaged.length && !s.merging) {
      if (st.untracked.length) out.push("\nnothing added to commit but untracked files present (use \"git add\" to track)");
      else out.push(headId(s) ? "\nnothing to commit, working tree clean" : "\nnothing to commit (create/copy files and use \"git add\" to track)");
    } else if (!staged.length && unstaged.length) {
      out.push("\nno changes added to commit (use \"git add\" and/or \"git commit -a\")");
    }
  },

  add(s, args, out) {
    const paths = args.filter((a) => !a.startsWith("-") || a === "-A");
    if (!paths.length && !args.includes("--all")) fail("Nothing specified, nothing added.", "Try: git add <file>   or   git add .   to stage everything");
    const all = args.includes("-A") || args.includes("--all") || paths.includes(".");
    const targets = new Set<string>();
    if (all) {
      Object.keys(s.working).forEach((f) => targets.add(f));
      Object.keys(s.index).forEach((f) => targets.add(f));
    } else {
      for (const p of paths) {
        if (p.includes("*")) {
          const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
          const hits = [...Object.keys(s.working), ...Object.keys(s.index)].filter((f) => re.test(f));
          if (!hits.length) fail(`fatal: pathspec '${p}' did not match any files`);
          hits.forEach((f) => targets.add(f));
        } else {
          if (!(p in s.working) && !(p in s.index)) fail(`fatal: pathspec '${p}' did not match any files`, `Check the name with "ls". Files are case-sensitive.`);
          targets.add(p);
        }
      }
    }
    const changed: string[] = [];
    for (const f of targets) {
      if (f in s.working) {
        if (s.index[f] !== s.working[f]) changed.push(f);
        s.index[f] = s.working[f];
      } else if (f in s.index) {
        delete s.index[f];
        changed.push(f);
      }
    }
    if (s.merging) s.merging.conflicts = s.merging.conflicts.filter((f) => !targets.has(f) || hasMarkers(s.index[f]));
    const marked = [...targets].filter((f) => hasMarkers(s.index[f]));
    if (marked.length) out.push(`warning: ${marked.join(", ")} still contains conflict markers (<<<<<<< ======= >>>>>>>)`, "warn");
    if (changed.length) out.push(`(staged: ${changed.join(", ")})`, "muted");
    else out.push("(nothing new to stage)", "muted");
    out.event = "stage";
  },

  rm(s, args, out) {
    const cached = args.includes("--cached");
    const files = args.filter((a) => !a.startsWith("-"));
    if (!files.length) fail("usage: git rm <file>");
    for (const f of files) {
      if (!(f in s.index)) fail(`fatal: pathspec '${f}' did not match any files`);
      delete s.index[f];
      if (!cached) delete s.working[f];
      out.push(`rm '${f}'`);
    }
    out.event = "stage";
  },

  commit(s, args, out) {
    const messages: string[] = [];
    let all = false;
    let amend = false;
    let allowEmpty = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "-m" || a === "--message") messages.push(args[++i] ?? "");
      else if (a === "-am" || a === "-a" || a === "--all") {
        all = true;
        if (a === "-am") messages.push(args[++i] ?? "");
      } else if (a.startsWith("-m") && a.length > 2) messages.push(a.slice(2));
      else if (a === "--amend") amend = true;
      else if (a === "--allow-empty") allowEmpty = true;
      else if (a === "--no-edit") continue;
      else fail(`error: unknown option '${a}'`, 'Use: git commit -m "your message"');
    }
    const prev = headId(s);
    if (amend && !prev) fail("fatal: You have nothing to amend.");
    let message = messages.filter(Boolean).join("\n\n");
    if (!message && amend) message = s.commits[prev!].message;
    if (!message && s.merging) message = `Merge branch '${s.merging.theirsName}'`;
    if (!message) fail("Aborting commit due to empty commit message.", 'Every commit needs a message describing what changed: git commit -m "Add homepage"');
    if (all) for (const f of Object.keys(s.index)) {
      if (f in s.working) s.index[f] = s.working[f];
      else delete s.index[f];
    }
    if (s.merging) {
      // A conflict counts as resolved only once the fixed file has been `git add`ed.
      if (s.merging.conflicts.length)
        fail(["error: Committing is not possible because you have unmerged files.", "fatal: Exiting because of an unresolved conflict."], "Edit each conflicted file to remove the <<<<<<< ======= >>>>>>> markers, then git add it.");
    }
    const parentTree = amend ? treeOf(s, s.commits[prev!].parents[0] ?? null) : headTree(s);
    const nothing = Object.keys(parentTree).length === Object.keys(s.index).length && Object.keys(s.index).every((f) => parentTree[f] === s.index[f]);
    if (nothing && !allowEmpty && !s.merging && !amend) {
      const st = status(s);
      out.push(currentBranch(s) ? `On branch ${currentBranch(s)}` : "HEAD detached");
      if (st.unstaged.length || st.untracked.length)
        out.push("no changes added to commit (use \"git add\" to stage changes first)", "warn");
      else out.push("nothing to commit, working tree clean", "warn");
      out.lines.push({ text: "💡 git commit only saves what is in the staging area. Stage changes with git add.", kind: "info" });
      return;
    }
    const parents = amend ? s.commits[prev!].parents : prev ? [prev] : [];
    if (s.merging) parents.push(s.merging.theirs);
    const id = makeCommit(s, message, parents, s.index);
    advanceHead(s, id, `${amend ? "commit (amend)" : s.merging ? "commit (merge)" : parents.length ? "commit" : "commit (initial)"}: ${message.split("\n")[0]}`);
    s.merging = null;
    const where = currentBranch(s) ?? "detached HEAD";
    const stat = diffStat(parentTree, s.index);
    out.push(`[${where}${parents.length ? "" : " (root-commit)"} ${short(id)}] ${message.split("\n")[0]}`, "success");
    out.push(` ${plural(stat.files.length, "file")} changed, ${plural(stat.ins, "insertion")}(+), ${plural(stat.del, "deletion")}(-)`);
    for (const c of stat.files) if (c.kind !== "modified") out.push(` ${c.kind === "new file" ? "create" : "delete"} mode 100644 ${c.file}`, "muted");
    out.event = "commit";
  },

  log(s, args, out) {
    const oneline = args.includes("--oneline");
    const showAll = args.includes("--all");
    const nIdx = args.findIndex((a) => a === "-n" || /^-\d+$/.test(a));
    const limit = nIdx === -1 ? Infinity : args[nIdx] === "-n" ? Number(args[nIdx + 1]) : Number(args[nIdx].slice(1));
    const refArg = args.find((a, i) => !a.startsWith("-") && !(i > 0 && args[i - 1] === "-n"));
    const starts = showAll
      ? [headId(s), ...Object.values(s.branches), ...Object.values(s.tags), ...Object.values(s.tracking)]
      : [refArg ? mustResolve(s, refArg) : requireCommit(s)];
    const ids = new Set<string>();
    for (const st of starts) if (st) ancestors(s, st).forEach((id) => ids.add(id));
    const commits = [...ids].map((id) => s.commits[id]).sort((a, b) => b.seq - a.seq).slice(0, limit);
    for (const c of commits) {
      const deco = decorations(s, c.id);
      const decoText = deco.length ? ` (${deco.join(", ")})` : "";
      if (oneline) {
        out.lines.push({ text: `${short(c.id)}${decoText} ${c.message.split("\n")[0]}`, kind: deco.length ? "warn" : "out" });
      } else {
        out.push(`commit ${c.id}${decoText}`, "warn");
        if (c.parents.length > 1) out.push(`Merge: ${c.parents.map(short).join(" ")}`);
        out.push(`Author: ${AUTHOR}\n`);
        out.push(c.message.split("\n").map((l) => "    " + l).join("\n") + "\n");
      }
    }
  },

  diff(s, args, out) {
    const staged = args.includes("--staged") || args.includes("--cached");
    const refs = args.filter((a) => !a.startsWith("-"));
    let from: FileMap;
    let to: FileMap;
    if (refs.length >= 2) {
      from = treeOf(s, mustResolve(s, refs[0]));
      to = treeOf(s, mustResolve(s, refs[1]));
    } else if (refs.length === 1 && resolve(s, refs[0])) {
      from = treeOf(s, mustResolve(s, refs[0]));
      to = s.working;
    } else if (staged) {
      from = headTree(s);
      to = s.index;
    } else {
      from = s.index;
      to = Object.fromEntries(Object.entries(s.working).filter(([f]) => f in s.index));
    }
    const only = refs.length === 1 && !resolve(s, refs[0]) ? refs[0] : null;
    printDiff(out, from, to, only);
    if (!out.lines.length) out.push(staged ? "(no staged changes)" : "(no unstaged changes — try git diff --staged)", "muted");
  },

  show(s, args, out) {
    const id = args[0] ? mustResolve(s, args[0]) : requireCommit(s);
    const c = s.commits[id];
    const deco = decorations(s, id);
    out.push(`commit ${c.id}${deco.length ? ` (${deco.join(", ")})` : ""}`, "warn");
    out.push(`Author: ${AUTHOR}\n\n    ${c.message}\n`);
    printDiff(out, treeOf(s, c.parents[0] ?? null), c.tree);
  },

  branch(s, args, out) {
    const flags = args.filter((a) => a.startsWith("-"));
    const names = args.filter((a) => !a.startsWith("-"));
    if (flags.some((f) => f === "-d" || f === "-D" || f === "--delete")) {
      const force = flags.includes("-D");
      for (const n of names) {
        if (!(n in s.branches)) fail(`error: branch '${n}' not found.`);
        if (currentBranch(s) === n) fail(`error: Cannot delete branch '${n}' checked out at '/home/you/project'`, "Switch to another branch first.");
        const hid = headId(s);
        if (!force && hid && !isAncestor(s, s.branches[n], hid))
          fail([`error: The branch '${n}' is not fully merged.`, `If you are sure you want to delete it, run 'git branch -D ${n}'.`]);
        out.push(`Deleted branch ${n} (was ${short(s.branches[n])}).`);
        delete s.branches[n];
      }
      out.event = "branch";
      return;
    }
    if (flags.includes("-m") || flags.includes("-M")) {
      const [from, to] = names.length === 2 ? names : [currentBranch(s)!, names[0]];
      if (!to) fail("usage: git branch -m <old> <new>");
      if (!(from in s.branches) && currentBranch(s) !== from) fail(`error: refname refs/heads/${from} not found`);
      if (from in s.branches) {
        s.branches[to] = s.branches[from];
        delete s.branches[from];
      }
      if (currentBranch(s) === from) s.head = { type: "branch", name: to };
      out.push(`(renamed ${from} → ${to})`, "muted");
      out.event = "branch";
      return;
    }
    if (!names.length) {
      const cur = currentBranch(s);
      if (!cur) out.push(`* (HEAD detached at ${short(headId(s)!)})`, "success");
      const list = new Set(Object.keys(s.branches));
      if (cur && !headId(s)) list.add(cur);
      for (const b of [...list].sort()) out.push(`${b === cur ? "*" : " "} ${b}`, b === cur ? "success" : "out");
      if (flags.includes("-a") || flags.includes("-r"))
        for (const r of Object.keys(s.tracking).sort()) out.push(`  remotes/${r}`, "err");
      return;
    }
    const [name, start] = names;
    createBranch(s, name, start);
    out.push(`(created branch ${name} → ${short(s.branches[name])})`, "muted");
    out.event = "branch";
  },

  checkout(s, args, out) {
    const dd = args.indexOf("--");
    if (dd !== -1) return restoreFiles(s, args.slice(dd + 1), false, out);
    if (args[0] === "-b" || args[0] === "-B") {
      if (!args[1]) fail("error: switch `b' requires a value");
      createBranch(s, args[1], args[2], args[0] === "-B");
      switchTo(s, args[1], out, true);
      return;
    }
    const target = args.find((a) => !a.startsWith("-"));
    if (!target) fail("usage: git checkout <branch>");
    if (!resolve(s, target!) && !(target! in s.branches) && (target! in s.index || target === "."))
      return restoreFiles(s, args, false, out);
    switchTo(s, target!, out, false, true);
  },

  switch(s, args, out) {
    if (args[0] === "-c" || args[0] === "-C" || args[0] === "--create") {
      if (!args[1]) fail("error: switch `c' requires a value");
      createBranch(s, args[1], args[2], args[0] === "-C");
      switchTo(s, args[1], out, true);
      return;
    }
    const detach = args.includes("--detach") || args.includes("-d");
    const target = args.find((a) => !a.startsWith("-"));
    if (!target) fail("usage: git switch <branch>");
    if (target === "-") {
      const prev = s.reflog.find((r) => r.message.startsWith("checkout: moving from"));
      const name = prev?.message.match(/moving from (\S+) to/)?.[1];
      if (!name) fail("fatal: no previous branch");
      return switchTo(s, name!, out, false);
    }
    if (!(target! in s.branches) && !s.tracking[`origin/${target}`] && !detach)
      fail(`fatal: a branch is expected, got '${target}'`, `To look at an old commit use: git switch --detach ${target}  (or git checkout ${target})`);
    switchTo(s, target!, out, false, detach);
  },

  merge(s, args, out) {
    if (args.includes("--abort")) {
      if (!s.merging) fail("fatal: There is no merge to abort (MERGE_HEAD missing).");
      s.merging = null;
      checkoutTree(s, headTree(s));
      out.push("(merge aborted — everything is back to how it was)", "muted");
      out.event = "reset";
      return;
    }
    const target = args.find((a) => !a.startsWith("-"));
    if (!target) fail("fatal: No commit specified", "Try: git merge <branch-name>");
    doMerge(s, target!, args.includes("--no-ff"), out);
  },

  reset(s, args, out) {
    const mode = args.includes("--hard") ? "hard" : args.includes("--soft") ? "soft" : "mixed";
    const pos = args.filter((a) => !a.startsWith("-"));
    const files = pos.filter((p) => !resolve(s, p) && (p in s.index || p in headTree(s) || p in s.working));
    if (files.length) {
      const tree = headTree(s);
      for (const f of files) {
        if (f in tree) s.index[f] = tree[f];
        else delete s.index[f];
      }
      out.push(`Unstaged changes after reset:\n${files.map((f) => `M\t${f}`).join("\n")}`);
      out.event = "unstage";
      return;
    }
    const target = pos[0] ? mustResolve(s, pos[0]) : headId(s);
    if (!target) {
      s.index = {};
      out.event = "unstage";
      return;
    }
    advanceHead(s, target, `reset: moving to ${pos[0] ?? "HEAD"}`);
    s.merging = null;
    const tree = treeOf(s, target);
    if (mode !== "soft") s.index = { ...tree };
    if (mode === "hard") checkoutTree(s, tree);
    if (mode === "hard") out.push(`HEAD is now at ${short(target)} ${s.commits[target].message.split("\n")[0]}`, "warn");
    else if (mode === "mixed") {
      const un = status(s).unstaged;
      if (un.length) out.push(`Unstaged changes after reset:\n${un.map((c) => `${c.kind === "deleted" ? "D" : "M"}\t${c.file}`).join("\n")}`);
      else out.push(`(HEAD and branch moved to ${short(target)})`, "muted");
    } else out.push(`(branch moved to ${short(target)}; your changes are still staged)`, "muted");
    out.event = "reset";
  },

  restore(s, args, out) {
    const staged = args.includes("--staged") || args.includes("-S");
    const files = args.filter((a) => !a.startsWith("-"));
    if (!files.length) fail("fatal: you must specify path(s) to restore");
    restoreFiles(s, files, staged, out);
  },

  revert(s, args, out) {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) fail("usage: git revert <commit>");
    requireCommit(s);
    if (isDirty(s)) fail("error: your local changes would be overwritten by revert.", "Commit or stash your changes first.");
    const id = mustResolve(s, ref!);
    const c = s.commits[id];
    if (c.parents.length > 1) fail(`error: commit ${short(id)} is a merge but no -m option was given.`);
    const res = merge3(c.tree, headTree(s), treeOf(s, c.parents[0] ?? null));
    if (res.conflicts.length)
      fail([`error: could not revert ${short(id)}... ${c.message}`, `CONFLICT in ${res.conflicts.join(", ")}`], "Later commits changed the same lines. In real Git you'd resolve this like a merge conflict.");
    const msg = `Revert "${c.message.split("\n")[0]}"\n\nThis reverts commit ${c.id}.`;
    const nid = makeCommit(s, msg, [headId(s)!], res.tree);
    advanceHead(s, nid, `revert: ${msg.split("\n")[0]}`);
    checkoutTree(s, res.tree);
    out.push(`[${currentBranch(s) ?? "detached HEAD"} ${short(nid)}] Revert "${c.message.split("\n")[0]}"`, "success");
    const stat = diffStat(c.tree, treeOf(s, c.parents[0] ?? null));
    out.push(` ${plural(stat.files.length, "file")} changed, ${plural(stat.ins, "insertion")}(+), ${plural(stat.del, "deletion")}(-)`);
    out.event = "revert";
  },

  stash(s, args, out) {
    const [op = "push", ...rest] = args;
    if (op === "push" || op === "save" || op === "-m" || op === "-u") {
      const base = requireCommit(s);
      if (!isDirty(s)) return out.push("No local changes to save", "warn");
      const mIdx = args.indexOf("-m");
      const label = mIdx !== -1 ? args[mIdx + 1] : op === "save" ? rest.join(" ") : "";
      const tracked = Object.fromEntries(Object.entries(s.working).filter(([f]) => f in s.index || f in headTree(s)));
      const message = label ? `On ${currentBranch(s)}: ${label}` : `WIP on ${currentBranch(s) ?? "(no branch)"}: ${short(base)} ${s.commits[base].message.split("\n")[0]}`;
      s.stash.unshift({ message, base, index: { ...s.index }, working: tracked });
      checkoutTree(s, headTree(s));
      out.push(`Saved working directory and index state ${message}`, "success");
      out.event = "stash";
      return;
    }
    if (op === "list") {
      if (!s.stash.length) out.push("(stash is empty)", "muted");
      s.stash.forEach((e, i) => out.push(`stash@{${i}}: ${e.message}`));
      return;
    }
    const n = Number(rest[0]?.match(/\d+/)?.[0] ?? 0);
    const entry = s.stash[n];
    if (op === "drop" || op === "clear") {
      if (op === "clear") s.stash = [];
      else if (!entry) fail(`error: stash@{${n}} is not a valid reference`);
      else s.stash.splice(n, 1);
      out.push(op === "clear" ? "(stash cleared)" : `Dropped refs/stash@{${n}}`, "muted");
      out.event = "stash";
      return;
    }
    if (op === "pop" || op === "apply") {
      if (!entry) fail("error: No stash entries found.", "Save work with git stash first.");
      const baseTree = treeOf(s, entry.base);
      const head = headTree(s);
      const files = new Set([...Object.keys(entry.working), ...Object.keys(baseTree), ...Object.keys(entry.index)]);
      const touched = [...files].filter((f) => entry.working[f] !== baseTree[f] || entry.index[f] !== baseTree[f]);
      const blocked = touched.filter((f) => s.working[f] !== head[f]);
      if (blocked.length) fail([`error: Your local changes to the following files would be overwritten:`, ...blocked.map((f) => `\t${f}`)], "Commit or stash your current changes first.");
      for (const f of touched) {
        const val = entry.working[f] ?? entry.index[f];
        if (val === undefined) delete s.working[f];
        else s.working[f] = val;
        if (!(f in baseTree) && f in entry.index) s.index[f] = entry.index[f];
      }
      out.push(`(re-applied: ${touched.join(", ")})`, "success");
      if (op === "pop") {
        s.stash.splice(n, 1);
        out.push(`Dropped refs/stash@{${n}}`, "muted");
      }
      out.event = "stash";
      return;
    }
    fail(`error: unknown subcommand: ${op}`, "Try: git stash, git stash list, git stash pop");
  },

  tag(s, args, out) {
    const del = args.includes("-d");
    const pos: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-m") i++;
      else if (!args[i].startsWith("-")) pos.push(args[i]);
    }
    if (del) {
      if (!(pos[0] in s.tags)) fail(`error: tag '${pos[0]}' not found.`);
      out.push(`Deleted tag '${pos[0]}' (was ${short(s.tags[pos[0]])})`);
      delete s.tags[pos[0]];
      out.event = "tag";
      return;
    }
    if (!pos.length) {
      const names = Object.keys(s.tags).sort();
      if (!names.length) out.push("(no tags yet)", "muted");
      names.forEach((t) => out.push(t));
      return;
    }
    const [name, ref] = pos;
    if (name in s.tags) fail(`fatal: tag '${name}' already exists`);
    s.tags[name] = ref ? mustResolve(s, ref) : requireCommit(s);
    out.push(`(tagged ${short(s.tags[name])} as ${name})`, "muted");
    out.event = "tag";
  },

  "cherry-pick"(s, args, out) {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) fail("usage: git cherry-pick <commit>");
    requireCommit(s);
    if (isDirty(s)) fail("error: your local changes would be overwritten by cherry-pick.", "Commit or stash your changes first.");
    const id = mustResolve(s, ref!);
    const c = s.commits[id];
    const res = merge3(treeOf(s, c.parents[0] ?? null), headTree(s), c.tree);
    if (res.conflicts.length)
      fail([`error: could not apply ${short(id)}... ${c.message}`, `CONFLICT in ${res.conflicts.join(", ")}`], "This commit touches lines that differ here. The sandbox cancelled the cherry-pick so nothing broke.");
    if (Object.keys(res.tree).length === Object.keys(headTree(s)).length && Object.entries(res.tree).every(([f, v]) => headTree(s)[f] === v))
      return out.push("The previous cherry-pick is now empty, possibly due to conflict resolution.", "warn");
    const nid = makeCommit(s, c.message, [headId(s)!], res.tree);
    advanceHead(s, nid, `cherry-pick: ${c.message.split("\n")[0]}`);
    checkoutTree(s, res.tree);
    out.push(`[${currentBranch(s) ?? "detached HEAD"} ${short(nid)}] ${c.message.split("\n")[0]}`, "success");
    out.event = "cherry-pick";
  },

  rebase(s, args, out) {
    if (args.includes("-i") || args.includes("--interactive"))
      fail("Interactive rebase opens an editor, which this terminal doesn't have.", "Use plain `git rebase <branch>` here. The 'Rewrite History' world shows interactive rebase visually.");
    const target = args.find((a) => !a.startsWith("-"));
    if (!target) fail("usage: git rebase <branch>");
    doRebase(s, target!, out);
  },

  reflog(s, _args, out) {
    if (!s.reflog.length) return out.push("(reflog is empty)", "muted");
    s.reflog.forEach((r, i) => {
      out.lines.push({ text: `${short(r.id)} HEAD@{${i}}: ${r.message}`, kind: i === 0 ? "warn" : "out" });
    });
  },

  remote(s, args, out) {
    const [op, name, url] = args;
    if (!op || op === "-v") {
      if (!s.remote) return out.push("(no remotes yet — add one with git remote add origin <url>)", "muted");
      if (op === "-v") out.push(`${s.remote.name}\t${s.remote.url} (fetch)\n${s.remote.name}\t${s.remote.url} (push)`);
      else out.push(s.remote.name);
      return;
    }
    if (op === "add") {
      if (!name || !url) fail("usage: git remote add <name> <url>");
      if (s.remote) fail(`error: remote ${s.remote.name} already exists.`);
      s.remote = { name, url, branches: {} };
      out.push(`(remote '${name}' → ${url})`, "muted");
      return;
    }
    if (op === "remove" || op === "rm") {
      s.remote = null;
      s.tracking = {};
      s.upstream = {};
      return out.push("(remote removed)", "muted");
    }
    fail(`error: unknown subcommand: ${op}`);
  },

  clone(s, args, out) {
    const url = args.find((a) => !a.startsWith("-"));
    if (!url) fail("fatal: You must specify a repository to clone.");
    if (s.initialized) fail("fatal: destination path 'project' already exists and is not an empty directory.");
    if (!s.remote) {
      // Nothing seeded: invent a small demo project on the "server".
      const a = makeCommit(s, "Initial commit", [], { "README.md": "# Demo project" });
      const b = makeCommit(s, "Add app", [a], { "README.md": "# Demo project", "app.js": "console.log('hello')" });
      s.remote = { name: "origin", url: url!, branches: { main: b } };
    }
    const remote = s.remote!;
    remote.url = url!;
    s.initialized = true;
    s.tracking = {};
    for (const [b, id] of Object.entries(remote.branches)) s.tracking[`origin/${b}`] = id;
    const main = remote.branches.main ? "main" : Object.keys(remote.branches)[0];
    if (main) {
      s.branches = { [main]: remote.branches[main] };
      s.upstream = { [main]: main };
      setHead(s, { type: "branch", name: main }, `clone: from ${url}`);
      checkoutTree(s, treeOf(s, remote.branches[main]));
    }
    const count = ancestors(s, remote.branches[main]).size;
    out.push(`Cloning into 'project'...\nremote: Enumerating objects: ${count * 3}, done.\nReceiving objects: 100% (${count * 3}/${count * 3}), done.`);
    out.event = "clone";
  },

  fetch(s, _args, out) {
    const remote = requireRemote(s);
    out.push(`From ${remote.url}`);
    let any = false;
    for (const [b, id] of Object.entries(remote.branches)) {
      const key = `origin/${b}`;
      const old = s.tracking[key];
      if (old === id) continue;
      any = true;
      out.push(old ? `   ${short(old)}..${short(id)}  ${b.padEnd(10)} -> ${key}` : ` * [new branch]      ${b.padEnd(10)} -> ${key}`, "success");
      s.tracking[key] = id;
    }
    if (!any) out.lines.pop(), out.push("(already up to date with the remote)", "muted");
    out.event = "fetch";
  },

  pull(s, args, out) {
    const remote = requireRemote(s);
    const branch = currentBranch(s);
    if (!branch) fail("You are not currently on a branch.");
    const up = s.upstream[branch!] ?? (remote.branches[branch!] ? branch! : null);
    if (!up) fail("There is no tracking information for the current branch.", `Push it first with: git push -u origin ${branch}`);
    HANDLERS.fetch(s, [], out);
    const ref = `origin/${up}`;
    if (!s.tracking[ref]) fail(`fatal: couldn't find remote ref ${up}`);
    if (args.includes("--rebase")) doRebase(s, ref, out);
    else doMerge(s, ref, false, out, `Merge branch '${up}' of ${remote.url}`);
    if (out.event !== "conflict") out.event = "pull";
  },

  push(s, args, out) {
    const remote = requireRemote(s);
    const force = args.includes("--force") || args.includes("-f");
    const setUp = args.includes("-u") || args.includes("--set-upstream");
    const pos = args.filter((a) => !a.startsWith("-"));
    if (pos[0] && pos[0] !== remote.name) fail(`fatal: '${pos[0]}' does not appear to be a git repository`, `Your remote is called '${remote.name}'.`);
    const branch = pos[1] ?? currentBranch(s);
    if (!branch) fail("fatal: You are not currently on a branch.");
    const local = s.branches[branch!];
    if (!local) fail(`error: src refspec ${branch} does not match any`, "Make a commit before pushing.");
    if (!pos[1] && !s.upstream[branch!] && !setUp)
      fail([`fatal: The current branch ${branch} has no upstream branch.`, "To push the current branch and set the remote as upstream, use", "", `    git push --set-upstream origin ${branch}`], `Short version: git push -u origin ${branch}`);
    const remoteId = remote.branches[branch!];
    out.push(`To ${remote.url}`);
    if (remoteId === local) {
      out.lines.pop();
      out.push("Everything up-to-date");
    } else if (remoteId && !isAncestor(s, remoteId, local) && !force) {
      out.lines.pop();
      fail([`To ${remote.url}`, ` ! [rejected]        ${branch} -> ${branch} (fetch first)`, `error: failed to push some refs to '${remote.url}'`, "hint: Updates were rejected because the remote contains work that you do not", "hint: have locally. Integrate the remote changes (e.g. 'git pull') before pushing again."], "Run git pull to bring in your teammate's work, then push again.");
    } else {
      out.push(remoteId ? `   ${short(remoteId)}..${short(local)}  ${branch} -> ${branch}${force && !isAncestor(s, remoteId, local) ? " (forced update)" : ""}` : ` * [new branch]      ${branch} -> ${branch}`, "success");
      remote.branches[branch!] = local;
    }
    s.tracking[`origin/${branch}`] = local;
    if (setUp) {
      s.upstream[branch!] = branch!;
      out.push(`branch '${branch}' set up to track 'origin/${branch}'.`, "muted");
    }
    out.event = "push";
  },

  "cat-file"(s, args, out) {
    const flag = args.find((a) => a.startsWith("-")) ?? "-p";
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) fail("usage: git cat-file (-t | -p) <object>");
    const obj = findObject(s, ref!);
    if (!obj) fail(`fatal: Not a valid object name ${ref}`);
    if (flag === "-t") return out.push(obj!.type);
    if (obj!.type === "commit") {
      const c = s.commits[obj!.id];
      out.push(`tree ${treeId(c.tree)}`, "info");
      c.parents.forEach((p) => out.push(`parent ${p}`, "warn"));
      out.push(`author ${AUTHOR}\ncommitter ${AUTHOR}\n\n${c.message}`);
    } else if (obj!.type === "tree") {
      for (const f of Object.keys(obj!.tree!).sort()) out.push(`100644 blob ${blobId(obj!.tree![f])}\t${f}`);
    } else out.push(obj!.content || "(empty file)");
  },

  "ls-tree"(s, args, out) {
    const ref = args.find((a) => !a.startsWith("-")) ?? "HEAD";
    const tree = treeOf(s, mustResolve(s, ref));
    for (const f of Object.keys(tree).sort()) out.push(`100644 blob ${blobId(tree[f])}\t${f}`);
  },

  "hash-object"(s, args, out) {
    const f = args.find((a) => !a.startsWith("-"));
    if (!f || !(f in s.working)) fail(`fatal: could not open '${f}' for reading: No such file or directory`);
    out.push(blobId(s.working[f!]));
  },
};

// ------------------------------------------------------------- helpers ----

function requireRemote(s: RepoState) {
  if (!s.remote) fail("fatal: 'origin' does not appear to be a git repository", "Connect one first: git remote add origin https://github.com/you/project.git");
  return s.remote!;
}

function createBranch(s: RepoState, name: string, start?: string, force = false) {
  if (!/^[\w./-]+$/.test(name) || name.startsWith("-")) fail(`fatal: '${name}' is not a valid branch name.`);
  if (name in s.branches && !force) fail(`fatal: a branch named '${name}' already exists.`);
  const id = start ? mustResolve(s, start) : headId(s);
  if (!id) fail(`fatal: not a valid object name: '${currentBranch(s)}'.`, "You need at least one commit before you can create branches.");
  s.branches[name] = id!;
}

function switchTo(s: RepoState, target: string, out: Out, created: boolean, allowDetach = false) {
  if (s.merging) fail("error: you need to resolve your current index first", "Finish the merge (git commit) or cancel it (git merge --abort).");
  const from = currentBranch(s) ?? short(headId(s) ?? "");
  let isBranch = target in s.branches;
  if (!isBranch && s.tracking[`origin/${target}`] && !resolve(s, target)) {
    s.branches[target] = s.tracking[`origin/${target}`];
    s.upstream[target] = target;
    isBranch = true;
    out.push(`branch '${target}' set up to track 'origin/${target}'.`, "muted");
  }
  if (!isBranch && currentBranch(s) === target && !headId(s)) return out.push(`Already on '${target}'`);
  const id = isBranch ? s.branches[target] : resolve(s, target);
  if (!id) fail(`error: pathspec '${target}' did not match any file(s) known to git`, `See your branches with: git branch`);
  if (!isBranch && !allowDetach) fail(`fatal: '${target}' is not a branch`);
  if (isBranch && currentBranch(s) === target) return out.push(`Already on '${target}'`);

  // Refuse if local edits would be clobbered, like real Git.
  const cur = headTree(s);
  const next = treeOf(s, id);
  const files = new Set([...Object.keys(cur), ...Object.keys(s.index), ...Object.keys(s.working)]);
  const clobbered: string[] = [];
  const newIndex: FileMap = { ...next };
  const newWorking: FileMap = { ...next };
  for (const f of files) {
    const localChange = s.index[f] !== cur[f] || s.working[f] !== cur[f];
    if (!localChange) continue;
    if (next[f] !== cur[f]) {
      clobbered.push(f);
      continue;
    }
    if (s.index[f] === undefined) delete newIndex[f];
    else newIndex[f] = s.index[f];
    if (s.working[f] === undefined) delete newWorking[f];
    else newWorking[f] = s.working[f];
  }
  if (clobbered.length)
    fail(["error: Your local changes to the following files would be overwritten by checkout:", ...clobbered.map((f) => `\t${f}`), "Please commit your changes or stash them before you switch branches."], "Save them with git commit, or park them with git stash.");
  s.index = newIndex;
  s.working = newWorking;
  setHead(s, isBranch ? { type: "branch", name: target } : { type: "detached", id: id! }, `checkout: moving from ${from} to ${target}`);
  if (isBranch) out.push(created ? `Switched to a new branch '${target}'` : `Switched to branch '${target}'`, "success");
  else {
    out.push(`Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n`, "warn");
    out.push(`HEAD is now at ${short(id!)} ${s.commits[id!].message.split("\n")[0]}`);
  }
  out.event = "checkout";
}

function restoreFiles(s: RepoState, files: string[], staged: boolean, out: Out) {
  const head = headTree(s);
  const list = files.includes(".") ? [...new Set([...Object.keys(s.index), ...Object.keys(s.working), ...Object.keys(head)])] : files;
  for (const f of list) {
    if (staged) {
      if (!(f in s.index) && !(f in head)) fail(`error: pathspec '${f}' did not match any file(s) known to git`);
      if (f in head) s.index[f] = head[f];
      else delete s.index[f];
    } else {
      if (!(f in s.index)) {
        if (files.includes(".")) continue;
        fail(`error: pathspec '${f}' did not match any file(s) known to git`, "git restore only works on files Git already tracks.");
      }
      s.working[f] = s.index[f];
    }
  }
  out.push(staged ? `(unstaged: ${files.join(", ")} — your edits are still in the working directory)` : `(restored: ${files.join(", ")} — local edits discarded)`, "muted");
  out.event = staged ? "unstage" : "file";
}

function doMerge(s: RepoState, target: string, noFF: boolean, out: Out, message?: string) {
  const ours = requireCommit(s);
  if (s.merging) fail("error: Merging is not possible because you have unmerged files.", "Finish the current merge first.");
  const theirs = resolve(s, target);
  if (!theirs) fail(`merge: ${target} - not something we can merge`, "Check the branch name with git branch");
  if (isDirty(s)) fail(["error: Your local changes would be overwritten by merge.", "Please commit your changes or stash them before you merge."]);
  if (isAncestor(s, theirs!, ours)) return out.push("Already up to date.");
  const oursTree = headTree(s);
  if (isAncestor(s, ours, theirs!) && !noFF) {
    out.push(`Updating ${short(ours)}..${short(theirs!)}\nFast-forward`, "success");
    printStat(out, oursTree, treeOf(s, theirs!));
    advanceHead(s, theirs!, `merge ${target}: Fast-forward`);
    checkoutTree(s, treeOf(s, theirs!));
    out.event = "merge";
    return;
  }
  const base = mergeBase(s, ours, theirs!);
  const res = merge3(treeOf(s, base), oursTree, treeOf(s, theirs!), "HEAD", target);
  const cur = currentBranch(s);
  const msg = message ?? `Merge branch '${target}'${cur && cur !== "main" && cur !== "master" ? ` into ${cur}` : ""}`;
  if (res.conflicts.length) {
    const index: FileMap = { ...res.tree };
    for (const f of res.conflicts) {
      if (f in oursTree) index[f] = oursTree[f];
      else delete index[f];
    }
    s.index = index;
    s.working = { ...s.working, ...res.tree };
    for (const f of Object.keys(oursTree)) if (!(f in res.tree)) delete s.working[f];
    s.merging = { theirs: theirs!, theirsName: target, conflicts: res.conflicts };
    for (const f of res.conflicts) out.push(`Auto-merging ${f}\nCONFLICT (content): Merge conflict in ${f}`, "err");
    out.push("Automatic merge failed; fix conflicts and then commit the result.", "err");
    out.lines.push({ text: `💡 Open the file with cat ${res.conflicts[0]}, rewrite it with echo "..." > ${res.conflicts[0]}, then git add + git commit.`, kind: "info" });
    out.event = "conflict";
    return;
  }
  const id = makeCommit(s, msg, [ours, theirs!], res.tree);
  advanceHead(s, id, `merge ${target}: Merge made by the 'ort' strategy.`);
  checkoutTree(s, res.tree);
  out.push("Merge made by the 'ort' strategy.", "success");
  printStat(out, oursTree, res.tree);
  out.event = "merge";
}

function doRebase(s: RepoState, target: string, out: Out) {
  const branch = currentBranch(s);
  if (!branch) fail("fatal: You are not currently on a branch.");
  const ours = requireCommit(s);
  if (isDirty(s)) fail("error: cannot rebase: You have unstaged changes.", "Commit or stash them first.");
  const upstream = mustResolve(s, target);
  if (isAncestor(s, upstream, ours)) return out.push(`Current branch ${branch} is up to date.`);
  if (isAncestor(s, ours, upstream)) {
    advanceHead(s, upstream, `rebase (finish): refs/heads/${branch} onto ${short(upstream)}`);
    checkoutTree(s, treeOf(s, upstream));
    out.push(`Successfully rebased and updated refs/heads/${branch}.`, "success");
    out.event = "rebase";
    return;
  }
  const toReplay = commitsBetween(s, upstream, ours).filter((c) => c.parents.length === 1);
  let cur = upstream;
  for (const c of toReplay) {
    const res = merge3(treeOf(s, c.parents[0]), treeOf(s, cur), c.tree);
    if (res.conflicts.length)
      fail([`error: could not apply ${short(c.id)}... ${c.message}`, `CONFLICT (content): Merge conflict in ${res.conflicts.join(", ")}`, "(the sandbox aborted the rebase — your branch is unchanged)"], "Both branches changed the same lines. Try git merge instead, which lets you resolve conflicts here.");
    cur = makeCommit(s, c.message, [cur], res.tree);
    out.push(`  applied ${short(c.id)} → ${short(cur)}  ${c.message.split("\n")[0]}`, "muted");
  }
  s.branches[branch!] = cur;
  logReflog(s, cur, `rebase (finish): returning to refs/heads/${branch}`);
  checkoutTree(s, treeOf(s, cur));
  out.push(`Successfully rebased and updated refs/heads/${branch}.`, "success");
  out.event = "rebase";
}

function printStat(out: Out, from: FileMap, to: FileMap) {
  const stat = diffStat(from, to);
  for (const c of stat.files) out.push(` ${c.file} | ${c.kind}`);
  out.push(` ${plural(stat.files.length, "file")} changed, ${plural(stat.ins, "insertion")}(+), ${plural(stat.del, "deletion")}(-)`);
}

function printDiff(out: Out, from: FileMap, to: FileMap, only?: string | null) {
  const files = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort();
  for (const f of files) {
    if (only && f !== only) continue;
    if (from[f] === to[f]) continue;
    out.push(`diff --git a/${f} b/${f}`, "info");
    if (from[f] === undefined) out.push("new file mode 100644", "muted");
    if (to[f] === undefined) out.push("deleted file mode 100644", "muted");
    out.push(`--- ${from[f] === undefined ? "/dev/null" : "a/" + f}\n+++ ${to[f] === undefined ? "/dev/null" : "b/" + f}`, "info");
    for (const op of lineDiff(from[f] ?? "", to[f] ?? "")) {
      if (op.kind === "add") out.push("+" + op.text, "add");
      else if (op.kind === "del") out.push("-" + op.text, "del");
      else out.push(" " + op.text, "muted");
    }
  }
}

export function decorations(s: RepoState, id: string): string[] {
  const d: string[] = [];
  const cur = currentBranch(s);
  if (s.head.type === "detached" && s.head.id === id) d.push("HEAD");
  for (const [b, bid] of Object.entries(s.branches)) if (bid === id) d.push(b === cur ? `HEAD -> ${b}` : b);
  for (const [r, rid] of Object.entries(s.tracking)) if (rid === id) d.push(r);
  for (const [t, tid] of Object.entries(s.tags)) if (tid === id) d.push(`tag: ${t}`);
  d.sort((a, b) => (b.startsWith("HEAD") ? 1 : 0) - (a.startsWith("HEAD") ? 1 : 0));
  return d;
}

function findObject(s: RepoState, ref: string): { type: "commit" | "tree" | "blob"; id: string; tree?: FileMap; content?: string } | null {
  const treeSuffix = ref.endsWith("^{tree}");
  const cid = resolve(s, treeSuffix ? ref.slice(0, -7) : ref);
  if (cid) return treeSuffix ? { type: "tree", id: treeId(s.commits[cid].tree), tree: s.commits[cid].tree } : { type: "commit", id: cid };
  if (!/^[0-9a-f]{4,40}$/.test(ref)) return null;
  for (const c of Object.values(s.commits)) {
    if (treeId(c.tree).startsWith(ref)) return { type: "tree", id: treeId(c.tree), tree: c.tree };
    for (const content of Object.values(c.tree)) if (blobId(content).startsWith(ref)) return { type: "blob", id: blobId(content), content };
  }
  for (const content of [...Object.values(s.index), ...Object.values(s.working)])
    if (blobId(content).startsWith(ref)) return { type: "blob", id: blobId(content), content };
  return null;
}

/** Suggestions for Tab completion in the terminal. */
export function completions(s: RepoState, input: string): string[] {
  const parts = input.split(/\s+/);
  const last = parts[parts.length - 1];
  let pool: string[];
  if (parts.length === 1) pool = ["git", ...SHELL_COMMANDS];
  else if (parts[0] === "git" && parts.length === 2) pool = GIT_COMMANDS;
  else
    pool = [
      ...Object.keys(s.working),
      ...Object.keys(s.branches),
      ...Object.keys(s.tags),
      ...Object.keys(s.tracking),
      ...(s.remote ? [s.remote.name] : []),
    ];
  return [...new Set(pool)].filter((p) => p.startsWith(last) && p !== last);
}

export { untrackedFiles };
