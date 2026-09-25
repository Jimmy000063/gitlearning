"use client";
import { useEffect, useRef, useState } from "react";
import type { Line, RepoState } from "@/engine/types";
import { completions } from "@/engine/commands";
import { currentBranch, headId } from "@/engine/repo";
import { short } from "@/engine/utils";
import { play } from "@/lib/sound";

const KIND: Record<Line["kind"], string> = {
  out: "text-white/85",
  err: "text-coral",
  info: "text-cyan",
  success: "text-lime",
  warn: "text-amber",
  muted: "text-white/40",
  add: "text-lime",
  del: "text-coral",
  cmd: "text-white",
};

function Prompt({ state }: { state: RepoState }) {
  let ref: string | null = null;
  if (state.initialized) {
    const b = currentBranch(state);
    ref = b ?? short(headId(state) ?? "");
    if (state.merging) ref += "|MERGING";
  }
  return (
    <span className="select-none whitespace-nowrap">
      <span className="text-violet">you@galaxy</span>
      <span className="text-white/40">:</span>
      <span className="text-cyan">~/project</span>
      {ref && <span className={state.merging ? "text-coral" : "text-pink"}> ({ref})</span>}
      <span className="text-white/60"> $ </span>
    </span>
  );
}

export function Terminal({
  state,
  lines,
  onSubmit,
  className = "",
  placeholder = "type a command… (try: help)",
  autoFocus = false,
  suggestions = [],
}: {
  state: RepoState;
  lines: Line[];
  onSubmit: (cmd: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [tabHint, setTabHint] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const submit = (cmd: string) => {
    onSubmit(cmd);
    if (cmd.trim()) setHist((h) => [...h, cmd]);
    setHIdx(-1);
    setInput("");
    setTabHint([]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hist.length) return;
      const i = hIdx === -1 ? hist.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(i);
      setInput(hist[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx === -1) return;
      const i = hIdx + 1;
      if (i >= hist.length) {
        setHIdx(-1);
        setInput("");
      } else {
        setHIdx(i);
        setInput(hist[i]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const opts = completions(state, input);
      if (opts.length === 1) {
        const parts = input.split(/\s+/);
        parts[parts.length - 1] = opts[0];
        setInput(parts.join(" ") + " ");
        setTabHint([]);
      } else setTabHint(opts.slice(0, 12));
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      submit("clear");
    } else if (e.key.length === 1) {
      play("key");
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07051a]/90 font-mono text-[13px] shadow-[0_0_60px_-20px_rgba(139,92,246,0.5)] ${className}`}
      onClick={() => window.getSelection()?.toString() || inputRef.current?.focus({ preventScroll: true })}
    >
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-coral/80" />
        <span className="h-3 w-3 rounded-full bg-amber/80" />
        <span className="h-3 w-3 rounded-full bg-lime/80" />
        <span className="ml-3 text-xs text-white/40">terminal — ~/project</span>
      </div>
      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-4 py-3 leading-relaxed">
        {lines.map((l, i) =>
          l.kind === "cmd" ? (
            <div key={i} className="mt-1 break-all">
              <span className="text-lime">❯ </span>
              <span className="text-white">{l.text}</span>
            </div>
          ) : (
            <div key={i} className={`whitespace-pre-wrap break-words ${KIND[l.kind]}`}>
              {l.text || " "}
            </div>
          ),
        )}
        <div className="mt-1 flex flex-wrap items-center">
          <Prompt state={state} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={lines.length < 3 ? placeholder : ""}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal input"
            className="min-w-[8rem] flex-1 bg-transparent text-white caret-pink outline-none placeholder:text-white/25"
          />
        </div>
        {tabHint.length > 0 && <div className="mt-1 text-xs text-white/40">{tabHint.join("   ")}</div>}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 bg-white/[0.02] px-3 py-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                setInput(s);
                inputRef.current?.focus();
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 transition hover:border-violet/60 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
