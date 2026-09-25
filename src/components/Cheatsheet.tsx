"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Copy, Search } from "lucide-react";
import { WORLDS } from "@/content";
import { toast } from "@/store/toast";

export function Cheatsheet() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return WORLDS.map((w) => ({
      world: w,
      items: w.lessons.flatMap((l) => l.commands.map((c) => ({ ...c, lesson: l }))).filter((c) => !needle || `${c.cmd} ${c.what}`.toLowerCase().includes(needle)),
    })).filter((g) => g.items.length);
  }, [q]);

  const copy = (cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(
      () => toast({ title: "Copied!", body: cmd, emoji: "📋" }),
      () => undefined,
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 md:pt-32">
      <div className="mb-10 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink">Quick reference</div>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-5xl">
          The <span className="text-gradient">Cheatsheet</span>
        </h1>
        <p className="mt-2 text-mist">Every command from the journey, and the lesson where it clicks.</p>
        <div className="glass mx-auto mt-6 flex max-w-md items-center gap-2 rounded-2xl px-4 py-3">
          <Search size={16} className="text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commands… (e.g. undo, branch)" className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <AnimatePresence>
          {groups.map(({ world, items }) => (
            <motion.section key={world.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg">
                <span className="text-2xl">{world.emoji}</span>
                <span style={{ color: world.color }}>{world.title}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <motion.div key={c.cmd + c.lesson.id} layout whileHover={{ y: -4 }} className="glass group relative rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <code className="font-mono text-sm text-pink">{c.cmd}</code>
                      <button onClick={() => copy(c.cmd)} className="rounded-lg p-1 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100" aria-label="Copy command">
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-white/75">{c.what}</p>
                    <Link href={`/learn/${c.lesson.id}/`} className="mt-3 inline-block text-[11px] text-white/40 hover:text-violet">
                      Learn it → {c.lesson.title}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
        {!groups.length && <p className="text-center text-mist">Nothing matches &ldquo;{q}&rdquo;. Try the playground and experiment!</p>}
      </div>
    </div>
  );
}
