import type { RepoState } from "@/engine/types";
import type { LabTab } from "@/components/lab/GitLab";
import type { BadgeId } from "./badges";

export interface Analogy {
  emoji: string;
  title: string;
  text: string;
}

export interface DemoStep {
  cmds?: string[];
  say: string;
}

export interface PredictOption {
  text: string;
  correct?: boolean;
  why: string;
}

export interface Predict {
  prompt: string;
  /** Optional scenario shown as a graph before answering; `commands` then animate as the reveal. */
  setup?: string[];
  commands?: string[];
  options: PredictOption[];
}

export interface TaskContext {
  history: string[];
  states: RepoState[];
}

export interface Task {
  label: string;
  check: (s: RepoState, ctx: TaskContext) => boolean;
}

export interface Challenge {
  brief: string;
  setup: string[];
  tasks: Task[];
  hints: string[];
  par: number; // commands for 3 stars
  tabs?: LabTab[];
  suggestions?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  tagline: string;
  xp: number;
  minutes: number;
  hook: { emoji: string; story: string; question: string };
  concept: { analogies: Analogy[]; demo: { setup: string[]; steps: DemoStep[]; tabs?: LabTab[] } };
  predict: Predict[];
  challenge: Challenge;
  recap: string[];
  commands: { cmd: string; what: string }[];
  badge?: BadgeId;
}

export interface World {
  id: string;
  n: number;
  title: string;
  emoji: string;
  tagline: string;
  color: string;
  lessons: Lesson[];
}
