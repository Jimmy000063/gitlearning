import { w1 } from "./worlds/w1";
import { w2 } from "./worlds/w2";
import { w3 } from "./worlds/w3";
import { w4 } from "./worlds/w4";
import { w5 } from "./worlds/w5";
import { w6 } from "./worlds/w6";
import type { Lesson, World } from "./types";

export const WORLDS: World[] = [w1, w2, w3, w4, w5, w6];
export const ALL_LESSONS: (Lesson & { world: World })[] = WORLDS.flatMap((w) => w.lessons.map((l) => ({ ...l, world: w })));

export const getLesson = (id: string) => ALL_LESSONS.find((l) => l.id === id);
export const nextLesson = (id: string) => ALL_LESSONS[ALL_LESSONS.findIndex((l) => l.id === id) + 1];

/** A lesson is unlocked once the previous lesson has been completed. */
export function isUnlocked(id: string, completed: Record<string, number>, unlockAll: boolean) {
  const i = ALL_LESSONS.findIndex((l) => l.id === id);
  return unlockAll || i <= 0 || !!completed[ALL_LESSONS[i - 1].id];
}
