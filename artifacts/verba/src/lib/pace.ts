// Il ritmo di chi usa l'app: quanti secondi impiega, in media, per domanda.
//
// Il quiz lo registra a fine sessione (sa già quanto è durata: la misura per i
// risultati), separatamente per ogni combinazione di formati — scrivere una
// parola richiede più tempo che riconoscerla. Il setup lo usa per stimare la
// durata di una sessione. Finché non ci sono abbastanza sessioni con quella
// combinazione, usa valori di partenza che includono la lettura della scheda
// quando sbagli e il tocco su Next.

const PACE_KEY = "verba_pace";

/** Secondi a domanda prima di avere dati propri. */
const DEFAULT_SECS: Record<number, number> = { 1: 14, 2: 22, 3: 30 };

/** Peso della sessione più recente nella media: il ritmo cambia con l'esperienza. */
const ALPHA = 0.3;

/** Sessioni necessarie prima di fidarsi del ritmo misurato. */
const MIN_SESSIONS = 2;

type Pace = Record<string, { secs: number; n: number }>;

const keyOf = (formats: readonly number[] | null): string =>
  formats && formats.length ? [...formats].sort((a, b) => a - b).join(",") : "auto";

function read(): Pace {
  try { return JSON.parse(localStorage.getItem(PACE_KEY) ?? "{}") as Pace; } catch { return {}; }
}

/** Da chiamare UNA volta a fine sessione. `formats` null = la scala ha scelto da sola. */
export function recordPace(formats: readonly number[] | null, elapsedMs: number, questions: number): void {
  if (questions < 3) return;
  const per = elapsedMs / 1000 / questions;
  // una sessione lasciata a metà (telefono in tasca) o finita troppo di corsa non insegna niente
  if (!Number.isFinite(per) || per < 3 || per > 120) return;
  const pace = read();
  const k = keyOf(formats);
  const prev = pace[k];
  pace[k] = prev ? { secs: prev.secs * (1 - ALPHA) + per * ALPHA, n: prev.n + 1 } : { secs: per, n: 1 };
  try { localStorage.setItem(PACE_KEY, JSON.stringify(pace)); } catch { /* resta la stima di partenza */ }
}

export function secondsPerQuestion(formats: readonly number[]): number {
  const measured = read()[keyOf(formats)];
  if (measured && measured.n >= MIN_SESSIONS) return measured.secs;
  if (!formats.length) return 20;
  return formats.reduce((a, f) => a + (DEFAULT_SECS[f] ?? 20), 0) / formats.length;
}

export function estimateMinutes(formats: readonly number[], count: number): number {
  return Math.max(1, Math.round((count * secondsPerQuestion(formats)) / 60));
}
