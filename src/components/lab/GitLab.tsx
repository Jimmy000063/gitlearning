"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import { Terminal } from "./Terminal";
import { CommitGraph } from "./CommitGraph";
import { FilesView } from "./FilesView";
import { ObjectsView } from "./ObjectsView";
import { RemoteView } from "./RemoteView";
import type { useGitSession } from "./useGitSession";

export type LabTab = "files" | "objects" | "remote";
const TAB_LABEL: Record<LabTab, string> = { files: "🗂 Three Areas", objects: "🧬 Objects", remote: "☁️ Remote" };

type Session = ReturnType<typeof useGitSession>;

export function GitLab({
  session,
  tabs = ["files"],
  onReset,
  suggestions,
  autoFocus,
  terminalClass = "h-[440px]",
}: {
  session: Session;
  tabs?: LabTab[];
  onReset?: () => void;
  suggestions?: string[];
  autoFocus?: boolean;
  terminalClass?: string;
}) {
  const [tab, setTab] = useState<LabTab>(tabs[0]);
  const { state, lines, exec, undo, canUndo, last } = session;

  // Follow the action: jump to the view that best shows what just happened.
  useEffect(() => {
    if (!last) return;
    const e = last.event;
    if (["push", "fetch", "pull", "clone"].includes(e) && tabs.includes("remote")) setTab("remote");
    else if (["stage", "unstage", "file", "conflict", "stash"].includes(e) && tabs.includes("files")) setTab("files");
  }, [last, tabs]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col gap-2">
        <Terminal state={state} lines={lines} onSubmit={exec} className={terminalClass} autoFocus={autoFocus} suggestions={suggestions} />
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Undo2 size={13} /> Undo last command
          </button>
          {onReset && (
            <button onClick={onReset} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white">
              <RotateCcw size={13} /> Start over
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="glass relative overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-3 text-xs">
            <span className="font-semibold text-white/80">🌌 Commit Graph</span>
            <span className="text-white/40">time flows →</span>
          </div>
          <CommitGraph state={state} className="h-[250px]" />
        </div>
        <div className="glass overflow-hidden rounded-2xl">
          {tabs.length > 1 && (
            <div className="flex gap-1 px-3 pt-3">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className="relative rounded-lg px-3 py-1 text-xs text-white/70 hover:text-white">
                  {tab === t && <motion.span layoutId={`labtab-${tabs.join()}`} className="absolute inset-0 rounded-lg bg-white/10" />}
                  <span className="relative">{TAB_LABEL[t]}</span>
                </button>
              ))}
            </div>
          )}
          {tabs.length === 1 && <div className="px-4 pt-3 text-xs font-semibold text-white/80">{TAB_LABEL[tabs[0]]}</div>}
          {tab === "files" && <FilesView state={state} className="h-[190px]" />}
          {tab === "objects" && <ObjectsView state={state} className="h-[190px]" />}
          {tab === "remote" && <RemoteView state={state} className="h-[190px] overflow-auto" />}
        </div>
      </div>
    </div>
  );
}
