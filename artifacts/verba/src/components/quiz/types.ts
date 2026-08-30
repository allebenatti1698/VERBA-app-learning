import type { QuizWord } from "@/lib/quizQueries";

/**
 * Contratto comune a tutti i formati di domanda.
 * Il componente sa QUAL È la risposta giusta per il proprio formato e la
 * comunica; l'orchestratore non lo sa e non deve saperlo.
 * Nessun componente domanda chiama recordAnswer: la registrazione SRS vive
 * in un posto solo, nell'orchestratore.
 */
export interface QuestionProps {
  word: QuizWord;
  isAnswered: boolean;
  selectedOption: string | null;
  /**
   * correct è deciso dal componente, che conosce la verità del suo formato.
   * revealDelayMs: quanto l'orchestratore deve attendere prima di mostrare la
   * scheda e il Next. Serve ai formati con un'animazione di risposta lunga:
   * rivelare troppo presto copre il momento in cui si impara. Se omesso, 400.
   */
  onSelect: (option: string, correct: boolean, revealDelayMs?: number) => void;
  /** Cambia a ogni nuova parola: chiave delle transizioni di entrata/uscita. */
  animKey: number;
}
