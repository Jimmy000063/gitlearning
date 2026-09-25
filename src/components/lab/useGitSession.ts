"use client";
import { useCallback, useRef, useState } from "react";
import { run } from "@/engine/commands";
import type { GitEvent, Line, RepoState } from "@/engine/types";
import { play } from "@/lib/sound";

export interface SessionEvent {
  event: GitEvent;
  command: string;
  n: number;
}

/** Owns a simulated repo plus terminal scrollback, with unlimited undo. */
export function useGitSession(initial: RepoState, intro: Line[] = []) {
  const [state, setState] = useState(initial);
  const [lines, setLines] = useState<Line[]>(intro);
  const [undoDepth, setUndoDepth] = useState(0);
  const [commands, setCommands] = useState(0);
  const [last, setLast] = useState<SessionEvent | null>(null);
  // Every command typed and every state visited, for objectives like "you visited the first commit".
  const [trail, setTrail] = useState<{ history: string[]; states: RepoState[] }>({ history: [], states: [initial] });
  const stateRef = useRef(state);
  const undoRef = useRef<RepoState[]>([]);
  const counter = useRef(0);

  const commit = (next: RepoState) => {
    stateRef.current = next;
    setState(next);
  };

  const exec = useCallback((input: string) => {
    const prev = stateRef.current;
    const res = run(prev, input);
    const echo: Line = { text: input, kind: "cmd" };
    setLines((l) => (res.clear ? [] : [...l, echo, ...res.lines].slice(-400)));
    if (res.state !== prev) {
      undoRef.current = [...undoRef.current.slice(-50), prev];
      setUndoDepth(undoRef.current.length);
      commit(res.state);
    }
    if (input.trim()) {
      setCommands((c) => c + 1);
      setTrail((t) => ({ history: [...t.history, input.trim()], states: [...t.states, res.state] }));
    }
    counter.current += 1;
    setLast({ event: res.event, command: input, n: counter.current });
    if (res.event === "error") play("error");
    else if (res.event === "commit" || res.event === "merge") play("commit");
    else if (res.event !== "none") play("pop");
    return res;
  }, []);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    setUndoDepth(undoRef.current.length);
    commit(prev);
    setLines((l) => [...l, { text: "↶ undone — the repository went back one step", kind: "muted" }]);
    play("whoosh");
  }, []);

  const reset = useCallback((next: RepoState, introLines: Line[] = []) => {
    commit(next);
    setLines(introLines);
    undoRef.current = [];
    setUndoDepth(0);
    setCommands(0);
    setLast(null);
    setTrail({ history: [], states: [next] });
  }, []);

  return { state, lines, exec, undo, reset, canUndo: undoDepth > 0, commands, last, trail };
}
