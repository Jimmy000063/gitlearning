"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BADGES, type BadgeId } from "@/content/badges";
import { levelFor } from "@/lib/levels";
import { toast } from "./toast";

interface ProgressState {
  xp: number;
  completed: Record<string, number>; // lesson id -> stars (1-3)
  badges: BadgeId[];
  streak: { count: number; last: string | null };
  sound: boolean;
  unlockAll: boolean;
  completeLesson: (id: string, stars: number, xp: number, worldLessonIds: string[]) => { gained: number; leveledUp: boolean };
  earn: (id: BadgeId) => void;
  toggleSound: () => void;
  setUnlockAll: (v: boolean) => void;
  reset: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      completed: {},
      badges: [],
      streak: { count: 0, last: null },
      sound: true,
      unlockAll: false,

      completeLesson(id, stars, xp, worldLessonIds) {
        const prevStars = get().completed[id] ?? 0;
        // Replaying only pays out for improved stars.
        const gained = prevStars ? Math.round((xp * Math.max(0, stars - prevStars)) / 3) : xp;
        const before = levelFor(get().xp).level;
        const completed = { ...get().completed, [id]: Math.max(prevStars, stars) };

        const { streak } = get();
        let nextStreak = streak;
        if (streak.last !== today()) nextStreak = { count: streak.last === yesterday() ? streak.count + 1 : 1, last: today() };

        set({ xp: get().xp + gained, completed, streak: nextStreak });

        const earn = get().earn;
        earn("first-steps");
        if (stars === 3) earn("perfectionist");
        if (nextStreak.count >= 3) earn("on-fire");
        if (worldLessonIds.every((l) => completed[l])) earn(`world-${worldLessonIds[0].split("-")[0]}` as BadgeId);
        if (Object.keys(completed).length >= 10) earn("dedicated");

        const leveledUp = levelFor(get().xp).level > before;
        if (leveledUp) {
          const lv = levelFor(get().xp);
          toast({ title: `Level ${lv.level}: ${lv.title}`, body: "You levelled up!", emoji: lv.emoji });
        }
        return { gained, leveledUp };
      },

      earn(id) {
        if (!BADGES[id] || get().badges.includes(id)) return;
        set({ badges: [...get().badges, id] });
        toast({ title: `Badge unlocked: ${BADGES[id].name}`, body: BADGES[id].description, emoji: BADGES[id].emoji });
      },

      toggleSound: () => set({ sound: !get().sound }),
      setUnlockAll: (v) => set({ unlockAll: v }),
      reset: () => set({ xp: 0, completed: {}, badges: [], streak: { count: 0, last: null }, unlockAll: false }),
    }),
    { name: "git-galaxy-progress" },
  ),
);
