export const LEVELS = [
  { min: 0, title: "Git Seedling", emoji: "🌱" },
  { min: 100, title: "Commit Cadet", emoji: "📸" },
  { min: 300, title: "Time Traveller", emoji: "🕰️" },
  { min: 600, title: "Branch Ranger", emoji: "🌿" },
  { min: 1000, title: "Merge Mage", emoji: "🔮" },
  { min: 1500, title: "Remote Voyager", emoji: "🛰️" },
  { min: 2100, title: "Rebase Wizard", emoji: "🧙" },
  { min: 2800, title: "Git Grandmaster", emoji: "🌌" },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { level: i + 1, ...cur, next, progress };
}
