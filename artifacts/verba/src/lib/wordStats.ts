// src/lib/wordStats.ts
// Motore SRS in localStorage. Stesso data-model di user_word_progress (Supabase):
// in Fase 2 la migrazione cloud diventa una copia 1:1 dei campi.
//
// SCALA A TRE GRADINI
//   1 Recognize          — vedi la parola, scegli la definizione      soglia 2
//   2 Recall in context  — frase col buco, scegli la parola           soglia 1
//   3 Produce            — leggi la definizione, digiti la parola     soglia 2
//
// Una parola sale se è DOVUTA, se rispondi GIUSTO, e se il formato è PARI O
// SUPERIORE al suo gradino. Le tre condizioni insieme.

import { recordStudyToday, recordWordsToday } from "@/lib/studyActivity";

const WORD_STATS_KEY = "verba_word_stats";

/* ─────────────── COSTANTI REGOLABILI ─────────────── */

/** Risposte corrette richieste da ciascun gradino. */
export const LEVEL_THRESHOLD: Record<MasteryLevel, number> = {
  1: 2,
  2: 1,
  3: 2,
};

/** Intervalli fino alla padronanza. Percorso: giorno 0 → 1 → 3 → 7 → 14. */
const TO_MASTERY = [1, 2, 4, 7];

/** Manutenzione dopo la padronanza. ❓ Ancora aperta: cambiare qui. */
const MAINTENANCE_DAYS = [14, 30, 60, 120];

/** Errori consecutivi sullo stesso gradino prima di scendere. ❓ Ancora aperta. */
const REGRESS_AFTER_WRONG = 2;

/** Un errore su una parola mastered la fa uscire subito? ❓ Ancora aperta. */
const MASTERED_EXITS_ON_FIRST_WRONG = true;

/** Dopo una sbagliata la parola torna dovuta domani, non fra dieci minuti. */
const LAPSE_DAYS = 1;

/**
 * Gradino più alto che l'app sa davvero interrogare.
 * ⚠️ OGGI VALE 2: esistono Recognize e Recall in context.
 * Portare a 3 con il gradino 3.
 * Una parola che satura il tetto resta ferma con il contatore pieno e un
 * intervallo di attesa, invece di salire in un gradino che non esiste.
 */
export const MAX_AVAILABLE_LEVEL: MasteryLevel = 2;

/** Intervallo di parcheggio per una parola che ha saturato il tetto. */
const SATURATED_HOLD_DAYS = 7;

/** Eventi conservati per parola nella scheda storica. */
const MAX_HISTORY = 12;

/** Compatibilità: resta esportata perché altri file potrebbero importarla. */
export const MASTERY_THRESHOLD = 3;

/* ─────────────── TIPI ─────────────── */

export type MasteryLevel = 1 | 2 | 3;
export type AnswerFormat = 1 | 2 | 3;
export type WordStatus = "learning" | "reviewing" | "mastered";

export type EventKind =
  | "correct" // corretta che ha fatto avanzare il contatore
  | "wrong" // sbagliata, gradino invariato
  | "up" // promozione di gradino
  | "down" // retrocessione di gradino
  | "mastered" // padronanza raggiunta
  | "unmastered" // uscita dalla padronanza
  | "practice"; // risposta che non ha mosso la scala

export interface WordEvent {
  at: string; // ISO
  kind: EventKind;
  level: MasteryLevel; // gradino DOPO l'evento
  format?: AnswerFormat; // formato con cui è stata data la risposta
  note?: string; // perché non ha contato, quando kind === "practice"
}

export interface WordStat {
  // campi storici: restano, altri file li leggono
  consecutiveCorrect: number;
  totalCorrect: number;
  totalSeen: number;
  status: WordStatus;
  lastSeenAt: string | null; // ISO
  nextReviewAt: string | null; // ISO
  updatedAt: string; // ISO
  // scala
  level: MasteryLevel;
  levelCorrect: number; // corrette accumulate SUL gradino corrente
  levelWrong: number; // errori consecutivi sul gradino corrente
  mastered: boolean;
  maintStep: number; // indice in MAINTENANCE_DAYS, -1 se non mastered
  masteredAt: string | null;
  history: WordEvent[];
}

type StatsMap = Record<string, WordStat>;

/* ─────────────── LETTURA E SCRITTURA ─────────────── */

/**
 * Aggiorna al volo un record vecchio. Nessun flag di migrazione, nessuna chiave
 * da ricordare: se manca `level`, il record viene portato alla forma nuova ogni
 * volta che lo si legge, e riscritto alla prima modifica.
 * Tutte le parole già praticate atterrano a Recognize: nessuna di loro è mai
 * stata interrogata con un formato superiore, quindi nessuna ha titolo per
 * stare più in alto.
 */
function upgrade(raw: unknown): WordStat {
  const s = raw as Partial<WordStat> & Record<string, unknown>;
  if (typeof s.level === "number") {
    return {
      ...(s as WordStat),
      history: Array.isArray(s.history) ? s.history : [],
    };
  }
  const cc =
    typeof s.consecutiveCorrect === "number" ? s.consecutiveCorrect : 0;
  return {
    consecutiveCorrect: cc,
    totalCorrect: typeof s.totalCorrect === "number" ? s.totalCorrect : 0,
    totalSeen: typeof s.totalSeen === "number" ? s.totalSeen : 0,
    status: cc > 0 ? "reviewing" : "learning",
    lastSeenAt: (s.lastSeenAt as string) ?? null,
    nextReviewAt: (s.nextReviewAt as string) ?? null,
    updatedAt: (s.updatedAt as string) ?? new Date().toISOString(),
    level: 1,
    levelCorrect: Math.min(cc, LEVEL_THRESHOLD[1] - 1),
    levelWrong: 0,
    mastered: false,
    maintStep: -1,
    masteredAt: null,
    history: [],
  };
}

function rawRead(): StatsMap {
  try {
    const raw = localStorage.getItem(WORD_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: StatsMap = {};
    for (const [id, v] of Object.entries(parsed)) out[id] = upgrade(v);
    return out;
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

function read(): StatsMap {
  return rawRead();
}

/* ─────────────── AIUTI ─────────────── */

function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function statusOf(s: WordStat): WordStatus {
  if (s.mastered) return "mastered";
  if (s.level > 1 || s.levelCorrect > 0 || s.totalSeen > 0) return "reviewing";
  return "learning";
}

/**
 * Intervallo dopo una corretta che conta, calcolato sullo stato PRIMA della
 * mutazione. È una funzione della posizione sul percorso, non del gradino.
 */
function nextIntervalDays(s: WordStat): number {
  if (s.mastered) {
    return MAINTENANCE_DAYS[
      Math.min(s.maintStep + 1, MAINTENANCE_DAYS.length - 1)
    ];
  }
  if (s.level === 1)
    return s.levelCorrect === 0 ? TO_MASTERY[0] : TO_MASTERY[1];
  if (s.level === 2) return TO_MASTERY[2];
  return s.levelCorrect === 0 ? TO_MASTERY[3] : MAINTENANCE_DAYS[0];
}

function push(
  s: WordStat,
  kind: EventKind,
  format?: AnswerFormat,
  note?: string,
): void {
  s.history.push({
    at: new Date().toISOString(),
    kind,
    level: s.level,
    format,
    note,
  });
  if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY);
}

function emptyStat(): WordStat {
  const now = new Date().toISOString();
  return {
    consecutiveCorrect: 0,
    totalCorrect: 0,
    totalSeen: 0,
    status: "learning",
    lastSeenAt: null,
    nextReviewAt: null,
    updatedAt: now,
    level: 1,
    levelCorrect: 0,
    levelWrong: 0,
    mastered: false,
    maintStep: -1,
    masteredAt: null,
    history: [],
  };
}

/* ─────────────── REGISTRAZIONE ─────────────── */

/**
 * Registra UNA risposta. Il chiamante la invoca UNA SOLA VOLTA per parola per
 * sessione, sulla PRIMA risposta: i ritentativi dentro la stessa sessione non
 * vanno registrati.
 *
 * `format` è il gradino del formato con cui è stata data la risposta.
 * Oggi vale sempre 1 perché la scelta multipla è l'unico formato esistente.
 */
export function recordAnswer(
  wordId: string,
  correct: boolean,
  format: AnswerFormat = 1,
): WordStat {
  recordStudyToday();
  recordWordsToday(1);

  const map = read();
  const prev = map[wordId];
  const now = Date.now();
  const wasDue =
    !prev || !prev.nextReviewAt || new Date(prev.nextReviewAt).getTime() <= now;

  const s: WordStat = prev
    ? { ...prev, history: [...prev.history] }
    : emptyStat();
  const nowISO = new Date().toISOString();
  s.totalSeen += 1;
  s.lastSeenAt = nowISO;

  const requiredFormat: AnswerFormat = s.mastered ? 3 : s.level;

  if (correct) {
    s.totalCorrect += 1;

    if (!wasDue) {
      push(s, "practice", format, "non era dovuta");
    } else if (format < requiredFormat) {
      push(s, "practice", format, "formato sotto il gradino della parola");
    } else {
      const interval = nextIntervalDays(s);
      s.levelWrong = 0;
      s.consecutiveCorrect += 1;

      if (s.mastered) {
        s.maintStep = Math.min(s.maintStep + 1, MAINTENANCE_DAYS.length - 1);
        s.nextReviewAt = isoInDays(interval);
        push(s, "correct", format);
      } else {
        s.levelCorrect += 1;
        const need = LEVEL_THRESHOLD[s.level];

        if (s.levelCorrect < need) {
          s.nextReviewAt = isoInDays(interval);
          push(s, "correct", format);
        } else if (s.level === 3) {
          s.mastered = true;
          s.maintStep = 0;
          s.masteredAt = nowISO;
          s.nextReviewAt = isoInDays(interval);
          push(s, "mastered", format);
        } else if (s.level < MAX_AVAILABLE_LEVEL) {
          s.level = (s.level + 1) as MasteryLevel;
          s.levelCorrect = 0;
          s.nextReviewAt = isoInDays(interval);
          push(s, "up", format);
        } else {
          // tetto raggiunto: il gradino successivo non esiste ancora nell'app.
          // La parola resta qui col contatore pieno e va in attesa.
          s.levelCorrect = need;
          s.nextReviewAt = isoInDays(SATURATED_HOLD_DAYS);
          push(
            s,
            "practice",
            format,
            "gradino successivo non ancora disponibile",
          );
        }
      }
    }
  } else {
    s.consecutiveCorrect = 0;
    s.levelWrong += 1;

    const exitsNow = s.mastered && MASTERED_EXITS_ON_FIRST_WRONG;

    if (exitsNow || s.levelWrong >= REGRESS_AFTER_WRONG) {
      if (s.mastered) {
        s.mastered = false;
        s.maintStep = -1;
        s.level = 3;
        s.levelCorrect = 0;
        s.levelWrong = 0;
        push(s, "unmastered", format);
      } else if (s.level > 1) {
        s.level = (s.level - 1) as MasteryLevel;
        s.levelCorrect = 0;
        s.levelWrong = 0;
        push(s, "down", format);
      } else {
        s.levelCorrect = 0;
        s.levelWrong = 0;
        push(s, "wrong", format, "sotto Recognize non si scende");
      }
    } else {
      s.levelCorrect = 0;
      push(s, "wrong", format);
    }

    s.nextReviewAt = isoInDays(LAPSE_DAYS);
  }

  s.status = statusOf(s);
  s.updatedAt = nowISO;
  map[wordId] = s;
  rawWrite(map);
  return s;
}

/* ─────────────── LETTURE ─────────────── */

export function getWordStat(wordId: string): WordStat | null {
  return read()[wordId] ?? null;
}

export function getAllWordStats(): StatsMap {
  return read();
}

/** Il formato con cui la parola va interrogata adesso, tetto compreso. */
export function formatForWord(wordId: string): AnswerFormat {
  const s = read()[wordId];
  if (!s) return 1;
  const wanted: AnswerFormat = s.mastered ? 3 : s.level;
  return Math.min(wanted, MAX_AVAILABLE_LEVEL) as AnswerFormat;
}

/** ID parole dovute (nextReviewAt valorizzato e <= adesso), più scadute prima. */
export function getDueWordIds(limit?: number): string[] {
  const map = read();
  const now = Date.now();
  const due = Object.entries(map)
    .filter(
      ([, s]) =>
        s.nextReviewAt != null &&
        new Date(s.nextReviewAt as string).getTime() <= now,
    )
    .sort(
      (a, b) =>
        new Date(a[1].nextReviewAt as string).getTime() -
        new Date(b[1].nextReviewAt as string).getTime(),
    )
    .map(([id]) => id);
  return typeof limit === "number" ? due.slice(0, limit) : due;
}

export function getDueCount(): number {
  return getDueWordIds().length;
}

/** Conteggio parole per gradino, per le superfici di Progress. */
export function getLevelCounts(): {
  level1: number;
  level2: number;
  level3: number;
  mastered: number;
} {
  const map = read();
  const out = { level1: 0, level2: 0, level3: 0, mastered: 0 };
  for (const s of Object.values(map)) {
    if (s.mastered) out.mastered += 1;
    else if (s.level === 1) out.level1 += 1;
    else if (s.level === 2) out.level2 += 1;
    else out.level3 += 1;
  }
  return out;
}
