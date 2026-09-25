export const BADGES = {
  "first-steps": { name: "First Steps", emoji: "👣", description: "Finished your first lesson." },
  perfectionist: { name: "Perfectionist", emoji: "💎", description: "Got 3 stars on a challenge." },
  "on-fire": { name: "On Fire", emoji: "🔥", description: "Learned 3 days in a row." },
  dedicated: { name: "Dedicated", emoji: "🏅", description: "Completed 10 lessons." },
  "world-w1": { name: "Origin Story", emoji: "🌱", description: "Completed World 1: Origins." },
  "world-w2": { name: "Time Lord", emoji: "🕰️", description: "Completed World 2: Time Travel." },
  "world-w3": { name: "Branch Ranger", emoji: "🌿", description: "Completed World 3: Branching Nebula." },
  "world-w4": { name: "Cloud Walker", emoji: "☁️", description: "Completed World 4: Remote Realms." },
  "world-w5": { name: "History Bender", emoji: "⚔️", description: "Completed World 5: Rewrite History." },
  "world-w6": { name: "Git Whisperer", emoji: "🧠", description: "Completed World 6: Internals." },
  "conflict-survivor": { name: "Conflict Survivor", emoji: "🛡️", description: "Resolved your first merge conflict." },
  "sandbox-explorer": { name: "Sandbox Explorer", emoji: "🧪", description: "Ran 25 commands in the playground." },
} as const;

export type BadgeId = keyof typeof BADGES;
