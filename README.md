# Git Galaxy 🌌

An interactive website that teaches Git from zero to advanced. Every command you type runs against a real in-browser Git simulator, and the commit graph, the three areas and the remote update live as you type.

Everything runs in the browser: no backend and no database. Progress (XP, stars, streaks, badges) is saved in `localStorage`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5000
npm test           # engine + lesson tests (vitest)
npm run build      # static export to /out: deploy anywhere (Vercel, Netlify, GitHub Pages)
```

## How it's built

| Area | Where |
|---|---|
| Git simulator (commits, branches, merge + conflicts, rebase, stash, reflog, remotes, objects) | `src/engine/` |
| Graph layout (lanes, ghost/unreachable commits) | `src/engine/layout.ts` |
| Lessons (6 worlds, 17 lessons) as typed data | `src/content/worlds/` |
| Terminal, commit graph, three-areas / objects / remote views | `src/components/lab/` |
| 5-step lesson player: Hook → Understand → Predict → Challenge → Recap | `src/components/lesson/` |
| Landing page (3D galaxy, live auto-demo) | `src/components/landing/` |
| Progress store (XP, levels, badges, streaks) | `src/store/progress.ts` |

Stack: Next.js 15 (static export) · TypeScript · Tailwind CSS v4 · Framer Motion · React Three Fiber · Zustand · Vitest.

## Adding a lesson

Add a `Lesson` object to a world in `src/content/worlds/`. Each lesson has:

- a hook
- analogies
- a scripted demo (`setup` + `steps`)
- predict questions (optional `setup`/`commands` to animate the answer)
- a challenge with `tasks` (predicates over the repo state)
- a recap

Then add a reference solution to `SOLUTIONS` in `src/content/content.test.ts`. The tests prove every scenario runs and every challenge can be solved.
