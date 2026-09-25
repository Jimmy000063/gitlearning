"use client";
import { motion } from "framer-motion";
import type { RepoState } from "@/engine/types";
import { blobId, headId, treeId } from "@/engine/repo";
import { short } from "@/engine/utils";

/** Shows how HEAD's commit → tree → blobs link together by hash. */
export function ObjectsView({ state, className = "" }: { state: RepoState; className?: string }) {
  const id = headId(state);
  if (!id)
    return <div className={`flex items-center justify-center p-6 text-center text-xs text-mist ${className}`}>Make a commit to see Git&apos;s objects: commits, trees and blobs.</div>;
  const c = state.commits[id];
  const files = Object.keys(c.tree).sort();

  return (
    <div className={`scroll-thin flex items-start gap-3 overflow-auto p-3 ${className}`}>
      <Box color="amber" kind="commit" hash={id} delay={0}>
        <div className="text-white/80">&ldquo;{c.message.split("\n")[0]}&rdquo;</div>
        <div className="mt-1 text-white/45">tree → {short(treeId(c.tree))}</div>
        {c.parents.map((p) => (
          <div key={p} className="text-white/45">parent → {short(p)}</div>
        ))}
      </Box>
      <Arrow />
      <Box color="cyan" kind="tree" hash={treeId(c.tree)} delay={0.1}>
        {files.map((f) => (
          <div key={f} className="whitespace-nowrap text-white/70">
            blob {short(blobId(c.tree[f]))} <span className="text-white">{f}</span>
          </div>
        ))}
      </Box>
      <Arrow />
      <div className="flex flex-col gap-2">
        {files.map((f, i) => (
          <Box key={f} color="pink" kind="blob" hash={blobId(c.tree[f])} delay={0.2 + i * 0.05}>
            <div className="max-w-[160px] truncate text-white/80">{c.tree[f] || "(empty)"}</div>
          </Box>
        ))}
      </div>
    </div>
  );
}

const COLORS = { amber: "border-amber/50 text-amber", cyan: "border-cyan/50 text-cyan", pink: "border-pink/50 text-pink" };

function Box({ color, kind, hash, children, delay }: { color: keyof typeof COLORS; kind: string; hash: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      key={hash}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`shrink-0 rounded-xl border bg-black/30 p-2.5 font-mono text-[10.5px] ${COLORS[color]}`}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-bold uppercase tracking-wider">{kind}</span>
        <span className="opacity-70">{short(hash)}</span>
      </div>
      {children}
    </motion.div>
  );
}

function Arrow() {
  return <div className="mt-8 shrink-0 text-lg text-white/30">→</div>;
}
