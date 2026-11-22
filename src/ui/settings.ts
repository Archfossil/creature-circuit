// Per-device preferences. Storage can be unavailable (private mode), so every access is guarded.
export interface Settings { sound: boolean; /** Sound volume, 0–100. */ volume: number; fastDice: boolean; reduceMotion: boolean; doubleTapTravel: boolean; fastBattle: boolean; followerPrompt: boolean; turnPing: boolean }

const KEY = 'creature-circuit-settings-v1';
const defaults: Settings = {
  sound: true,
  volume: 80,
  fastDice: false,
  doubleTapTravel: true,
  fastBattle: false,
  followerPrompt: true,
  turnPing: true,
  reduceMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

let current: Settings = { ...defaults };
try { current = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { /* storage unavailable */ }

export const settings = (): Readonly<Settings> => current;
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  current = { ...current, [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  document.documentElement.classList.toggle('reduce-motion', current.reduceMotion);
}
document.documentElement.classList.toggle('reduce-motion', current.reduceMotion);
