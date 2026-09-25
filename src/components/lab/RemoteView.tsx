"use client";
import { motion } from "framer-motion";
import type { RepoState } from "@/engine/types";
import { aheadBehind } from "@/engine/repo";
import { short } from "@/engine/utils";

/** Side-by-side: your laptop vs the remote server, branch by branch. */
export function RemoteView({ state, className = "" }: { state: RepoState; className?: string }) {
  const remote = state.remote;
  if (!remote)
    return (
      <div className={`flex items-center justify-center p-6 text-center text-xs text-mist ${className}`}>
        No remote connected. A remote is another copy of the repository, usually on GitHub.
      </div>
    );
  const names = [...new Set([...Object.keys(state.branches), ...Object.keys(remote.branches)])].sort();

  return (
    <div className={`grid grid-cols-2 gap-3 p-3 text-xs ${className}`}>
      <Side title="Your computer" emoji="💻" sub={state.initialized ? "local repository" : "nothing cloned yet"}>
        {state.initialized &&
          names.map((b) => {
            const local = state.branches[b];
            const tracked = state.tracking[`origin/${b}`];
            if (!local) return null;
            const ab = tracked ? aheadBehind(state, local, tracked) : null;
            return (
              <Row key={b} name={b} id={local}>
                {ab && ab.ahead > 0 && <Badge cls="bg-lime/20 text-lime">↑{ab.ahead} to push</Badge>}
                {ab && ab.behind > 0 && <Badge cls="bg-amber/20 text-amber">↓{ab.behind} to pull</Badge>}
                {!tracked && <Badge cls="bg-white/10 text-white/60">local only</Badge>}
              </Row>
            );
          })}
        {Object.keys(state.tracking).length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/40">
            Last-known remote positions (updated by fetch/pull/push):
            {Object.entries(state.tracking).map(([r, id]) => (
              <div key={r} className="font-mono text-white/60">
                ☁ {r} → {short(id)}
              </div>
            ))}
          </div>
        )}
      </Side>
      <Side title={remote.name} emoji="☁️" sub={remote.url.replace("https://", "")}>
        {Object.entries(remote.branches).map(([b, id]) => {
          const known = state.tracking[`origin/${b}`];
          return (
            <Row key={b} name={b} id={id}>
              {known && known !== id && <Badge cls="bg-pink/20 text-pink">new work you haven&apos;t fetched</Badge>}
            </Row>
          );
        })}
        {!Object.keys(remote.branches).length && <div className="text-white/40">empty — push something!</div>}
      </Side>
    </div>
  );
}

function Side({ title, emoji, sub, children }: { title: string; emoji: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-lg">{emoji}</span> {title}
      </div>
      <div className="mb-2 truncate text-[10px] text-white/40">{sub}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ name, id, children }: { name: string; id: string; children?: React.ReactNode }) {
  return (
    <motion.div layout className="flex flex-wrap items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1.5">
      <span className="font-mono font-semibold text-violet">{name}</span>
      <motion.span key={id} initial={{ scale: 1.4, color: "#fbbf24" }} animate={{ scale: 1, color: "rgba(255,255,255,0.5)" }} className="font-mono text-[10px]">
        {short(id)}
      </motion.span>
      {children}
    </motion.div>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${cls}`}>{children}</span>;
}
