// src/lib/chain.ts
// La catena: ogni giorno in cui studi è un anello. Legge gli stessi giorni di
// studio di studyActivity.ts (verba_study_days) e li traduce in quello che
// serve per disegnarla: la card in Profile, il calendario, la celebrazione.
import { getStudyDays, getMomentum, getBestStreak } from "@/lib/studyActivity";

/** Lo stato di un giorno nella catena. */
export type DayState =
  | "done"       // studiato
  | "today"      // oggi, già studiato: l'anello di oggi è chiuso
  | "todayWait"  // oggi, non ancora: l'anello è aperto
  | "missed"     // un giorno saltato, dopo il primo giorno di studio
  | "future"     // un giorno che deve ancora venire
  | "none";      // prima che Verba tenesse il conto

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayStart(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export interface ChainSnapshot {
  days: Set<string>;
  first: string | null;      // il primo giorno di studio (YYYY-MM-DD)
  today: string;
  todayDone: boolean;
  current: number;           // anelli di fila fino a oggi (o fino a ieri, se oggi è ancora aperto)
  currentStart: string | null; // il primo giorno della catena attuale
  longest: number;
  total: number;             // giorni studiati in tutto
}

export function getChain(): ChainSnapshot {
  const list = getStudyDays();
  const days = new Set(list);
  const today = ymd(dayStart(new Date()));
  const current = getMomentum();
  let currentStart: string | null = null;
  if (current > 0) {
    const end = days.has(today) ? dayStart(new Date()) : addDays(dayStart(new Date()), -1);
    currentStart = ymd(addDays(end, -(current - 1)));
  }
  return {
    days,
    first: list.length ? list[0] : null,
    today,
    todayDone: days.has(today),
    current,
    currentStart,
    longest: getBestStreak(),
    total: list.length,
  };
}

/** Lo stato di un giorno qualsiasi. */
export function dayState(date: Date, c: ChainSnapshot): DayState {
  const k = ymd(date);
  if (k === c.today) return c.todayDone ? "today" : "todayWait";
  if (k > c.today) return "future";
  if (!c.first || k < c.first) return "none";
  return c.days.has(k) ? "done" : "missed";
}

/** Il giorno fa parte della catena attuale? (gli anelli più accesi) */
export function inCurrentChain(date: Date, c: ChainSnapshot): boolean {
  const k = ymd(date);
  return !!c.currentStart && k >= c.currentStart && k <= c.today && c.days.has(k);
}

/** Gli ultimi n giorni, l'ultimo è oggi. */
export function lastDays(n: number, c: ChainSnapshot): { date: Date; state: DayState; recent: boolean }[] {
  const base = dayStart(new Date());
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(base, -(n - 1 - i));
    return { date, state: dayState(date, c), recent: inCurrentChain(date, c) };
  });
}

/**
 * Per la celebrazione: la catena spezzata da cui si riparte.
 * Se oggi la catena è di 1 giorno ma avevi già studiato prima, restituisce
 * quanti anelli aveva l'ultima catena (quella che si è interrotta); altrimenti 0.
 */
export function previousRun(c: ChainSnapshot): number {
  if (c.current !== 1 || !c.todayDone) return 0;
  const before = [...c.days].filter((d) => d < c.today).sort();
  if (before.length === 0) return 0;
  let run = 1;
  let cursor = new Date(before[before.length - 1] + "T00:00:00");
  while (c.days.has(ymd(addDays(cursor, -1)))) {
    run += 1;
    cursor = addDays(cursor, -1);
  }
  return run;
}

// ── la celebrazione: una volta al giorno, alla fine della prima sessione ──
const CELEBRATED_KEY = "verba_streak_celebrated"; // chiave storica, la teniamo

export function shouldCelebrateToday(): boolean {
  try {
    const c = getChain();
    return c.todayDone && localStorage.getItem(CELEBRATED_KEY) !== c.today;
  } catch {
    return false;
  }
}
export function markCelebratedToday(): void {
  try { localStorage.setItem(CELEBRATED_KEY, ymd(dayStart(new Date()))); } catch { /* storage non disponibile */ }
}
