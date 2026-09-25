// Tiny synthesized sound effects via Web Audio: no audio files to download.
import { useProgress } from "@/store/progress";

let ctx: AudioContext | null = null;

type Sfx = "key" | "success" | "error" | "commit" | "pop" | "levelup" | "whoosh";

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export function play(sfx: Sfx) {
  if (typeof window === "undefined" || !useProgress.getState().sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    return;
  }
  switch (sfx) {
    case "key":
      tone(900 + Math.random() * 200, 0, 0.03, "square", 0.012);
      break;
    case "pop":
      tone(660, 0, 0.08, "sine", 0.07);
      tone(990, 0.04, 0.1, "sine", 0.05);
      break;
    case "commit":
      tone(523, 0, 0.12, "triangle");
      tone(784, 0.08, 0.18, "triangle");
      break;
    case "success":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.2, "triangle", 0.07));
      break;
    case "levelup":
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, "triangle", 0.07));
      break;
    case "error":
      tone(220, 0, 0.15, "sawtooth", 0.04);
      tone(165, 0.1, 0.2, "sawtooth", 0.04);
      break;
    case "whoosh":
      tone(300, 0, 0.25, "sine", 0.03);
      tone(600, 0.05, 0.2, "sine", 0.02);
      break;
  }
}
