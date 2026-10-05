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
