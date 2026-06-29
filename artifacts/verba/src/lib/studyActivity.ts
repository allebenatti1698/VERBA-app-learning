// src/lib/studyActivity.ts
// Registro attività di studio per-giorno (localStorage) → Momentum (giorni consecutivi).
// In Fase 2 diventa una tabella/colonna cloud; per ora solo locale.
// NB: il conteggio parte da quando questo modulo è in produzione: i giorni
// passati NON sono ricostruibili (prima non venivano registrati).

const STUDY_DAYS_KEY = "verba_study_days";

// ── date helper (LOCALI, non UTC: il confine del giorno è quello dell'utente) ──
function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── storage ───────────────────────────────────────────────────────────────
function readDays(): Set<string> {
  try {
    const raw = localStorage.getItem(STUDY_DAYS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
function writeDays(set: Set<string>): void {
  try {
    localStorage.setItem(STUDY_DAYS_KEY, JSON.stringify([...set]));
  } catch {
    /* storage non disponibile */
  }
}

/** Registra "oggi" come giorno di studio. Idempotente (Set). */
export function recordStudyToday(): void {
  const set = readDays();
  const today = localYMD(startOfToday());
  if (set.has(today)) return;
  set.add(today);
  writeDays(set);
}

/** Tutte le date di studio (YYYY-MM-DD), ordinate crescenti. Per heatmap futura. */
export function getStudyDays(): string[] {
  return [...readDays()].sort();
}

/** Ha studiato in quella data? */
export function hasStudiedOn(ymd: string): boolean {
  return readDays().has(ymd);
}

/**
 * Momentum = giorni consecutivi fino a OGGI (incluso) o IERI.
 * - Studiato oggi → conta all'indietro da oggi.
 * - Non oggi ma ieri → streak ancora viva (oggi non è finito): conta da ieri.
 * - Ultimo studio ≥ 2 giorni fa → 0 (spezzata).
 */
export function getMomentum(): number {
  const days = readDays();
  if (days.size === 0) return 0;
  let cursor = startOfToday();
  if (!days.has(localYMD(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(localYMD(cursor))) return 0;
  }
  let count = 0;
  while (days.has(localYMD(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Streak più lungo di sempre (run massimo di giorni consecutivi). */
export function getBestStreak(): number {
  const sorted = getStudyDays();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const cur = new Date(sorted[i] + "T00:00:00");
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export interface DayCell {
  ymd: string;
  weekday: string; // "M" | "T" | ... (lun→dom)
  studied: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Settimana corrente lun→dom, per la striscia di puntini della Profile. */
export function getWeekStrip(): DayCell[] {
  const days = readDays();
  const today = startOfToday();
  const todayYMD = localYMD(today);
  const dow = (today.getDay() + 6) % 7; // 0=lun … 6=dom
  const monday = addDays(today, -dow);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const ymd = localYMD(d);
    cells.push({
      ymd,
      weekday: labels[i],
      studied: days.has(ymd),
      isToday: ymd === todayYMD,
      isFuture: d.getTime() > today.getTime(),
    });
  }
  return cells;
}
