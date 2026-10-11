// src/lib/tabVisit.ts
// Le quattro schede restano sempre montate (TabPager.tsx). Quando si torna da una
// pagina (quiz, setup, Chain…) il numero "visit" cresce: una scheda che legge
// useTabVisit() lo mette fra le dipendenze dei propri dati e li rilegge sul posto,
// senza ricostruirsi.
import { createContext, useContext } from "react";

export const TabVisitContext = createContext(0);

/** Cresce a ogni ritorno da una pagina: usalo per rileggere i dati della scheda. */
export function useTabVisit(): number {
  return useContext(TabVisitContext);
}
