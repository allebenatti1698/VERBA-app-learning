// src/lib/wordStats.ts
// Motore SRS in localStorage. Stesso data-model di user_word_progress (Supabase):
// in Fase 2 la migrazione cloud diventa una copia 1:1 dei campi.

import { recordStudyToday } from "@/lib/studyActivity";

const WORD_STATS_KEY = "verba_word_stats";

export const MASTERY_THRESHOLD = 3; // corrette consecutive su review DOVUTE → mastered

// Ladder intervalli (giorni), indicizzato per consecutiveCorrect (1-based):
// 1ª → +1g, 2ª → +3g, 3ª (mastered) → +7g, poi +10g, +14g (cap, ~2 settimane).
const INTERVAL_DAYS = [1, 3, 7, 10, 14];

// Dopo una sbagliata la parola rientra "presto" (tunable).
const LAPSE_MINUTES = 10;

export type WordStatus = "learning" | "reviewing" | "mastered";

export interface WordStat {
  consecutiveCorrect: number;
  totalCorrect: number;
  totalSeen: number;
  status: WordStatus;
  lastSeenAt: string | null;   // ISO
  nextReviewAt: string | null; // ISO
  updatedAt: string;           // ISO
}

type StatsMap = Record<string, WordStat>;

function rawRead(): StatsMap {
  try {
    const raw = localStorage.getItem(WORD_STATS_KEY);
    return raw ? (JSON.parse(raw) as StatsMap) : {};
  } catch {
    return {};
  }
}

function rawWrite(map: StatsMap): void {
  try {
    localStorage.setItem(WORD_STATS_KEY, JSON.stringify(map));
  } catch {
    /* storage non disponibile */
  }
}

function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
function isoInMinutes(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}
function intervalDaysFor(consecutive: number): number {
  const i = Math.min(Math.max(consecutive, 1), INTERVAL_DAYS.length) - 1;
  return INTERVAL_DAYS[i];
}
function statusFor(consecutive: number): WordStatus {
  if (consecutive >= MASTERY_THRESHOLD) return "mastered";
  if (consecutive >= 1) return "reviewing";
  return "learning";
}
function emptyStat(): WordStat {
  return {
    consecutiveCorrect: 0, totalCorrect: 0, totalSeen: 0,
    status: "learning", lastSeenAt: null, nextReviewAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function read(): StatsMap {
  return rawRead();
}

/**
 * Registra UNA risposta. Il chiamante (QuizScreen) la invoca UNA SOLA VOLTA per
 * parola per sessione, sulla PRIMA risposta (i retry dentro la sessione NON vanno
 * registrati → niente skew).
 * Spaziata: una corretta avanza la mastery SOLO se la parola era dovuta o nuova;
 * rispondere prima della scadenza (cramming) aggiorna i totali ma NON avanza.
 * Sbagliata: azzera lo streak e riprogramma "presto" (decaying).
 */
export function recordAnswer(wordId: string, correct: boolean): WordStat {
  recordStudyToday();
  const map = read();
  const prev = map[wordId];
  const now = Date.now();
  const wasDue = !prev || !prev.nextReviewAt || new Date(prev.nextReviewAt).getTime() <= now;

  const s: WordStat = prev ? { ...prev } : emptyStat();
  const nowISO = new Date().toISOString();
  s.totalSeen += 1;
  s.lastSeenAt = nowISO;

  if (!correct) {
    s.consecutiveCorrect = 0;
    s.status = "learning";
    s.nextReviewAt = isoInMinutes(LAPSE_MINUTES);
  } else {
    s.totalCorrect += 1;
    if (wasDue) {
      s.consecutiveCorrect += 1;
      s.status = statusFor(s.consecutiveCorrect);
      s.nextReviewAt = isoInDays(intervalDaysFor(s.consecutiveCorrect));
    }
    // non dovuta → conferma soft: niente avanzamento, schedule invariato
  }
  s.updatedAt = nowISO;
  map[wordId] = s;
  rawWrite(map);
  return s;
}

export function getWordStat(wordId: string): WordStat | null {
  return read()[wordId] ?? null;
}

export function getAllWordStats(): StatsMap {
  return read();
}

/** ID parole dovute (nextReviewAt valorizzato e <= adesso), più scadute prima. */
export function getDueWordIds(limit?: number): string[] {
  const map = read();
  const now = Date.now();
  const due = Object.entries(map)
    .filter(([, s]) => s.nextReviewAt != null && new Date(s.nextReviewAt as string).getTime() <= now)
    .sort((a, b) => new Date(a[1].nextReviewAt as string).getTime() - new Date(b[1].nextReviewAt as string).getTime())
    .map(([id]) => id);
  return typeof limit === "number" ? due.slice(0, limit) : due;
}

export function getDueCount(): number {
  return getDueWordIds().length;
}
