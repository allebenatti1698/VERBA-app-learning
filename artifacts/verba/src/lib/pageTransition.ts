// Un segnale da una schermata al Router: "la prossima pagina non deve scorrere".
//
// Quando una card si allarga fino a coprire lo schermo, la pagina che segue
// (la sessione di Review, il setup di Practice) nasce da lì: deve comparire in
// dissolvenza sopra la card allargata, non entrare scorrendo da destra come le
// altre. La schermata chiama skipNextSlide() subito prima di navigare; il
// Router lo legge una volta sola al cambio di pagina con takeSkipSlide().

let skip = false;

export function skipNextSlide(): void {
  skip = true;
}

export function takeSkipSlide(): boolean {
  const s = skip;
  skip = false;
  return s;
}

/*
 * Il ritorno. Chi esce da una pagina nata da una card (la ✕ della Review, il
 * tasto indietro del setup) chiama requestCollapse() prima di navigare: la
 * schermata Practice, appena ricompare, si presenta coperta dalla tinta di
 * quella card e la richiude al suo posto.
 * Il segnale si LEGGE senza consumarlo (peekCollapse), perché il primo disegno
 * può avvenire due volte; lo cancella chi ha finito l'animazione
 * (clearCollapse), e comunque scade da solo dopo un secondo e mezzo.
 */
type CardKind = "review" | "practice" | "chain";
let collapse: { kind: CardKind; at: number } | null = null;

export function requestCollapse(kind: CardKind): void {
  collapse = { kind, at: Date.now() };
}

export function peekCollapse(): CardKind | null {
  if (!collapse || Date.now() - collapse.at > 1500) return null;
  return collapse.kind;
}

export function clearCollapse(): void {
  collapse = null;
}
