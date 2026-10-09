import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import WelcomeScreen from "@/pages/WelcomeScreen";
import DeckSelectionScreen from "@/pages/DeckSelectionScreen";
import PracticeHomeScreen from "@/pages/PracticeHomeScreen";
import PracticeSetupScreen from "@/pages/PracticeSetupScreen";
import DifficultyScreen from "@/pages/DifficultyScreen";
import PreQuizSetup from "@/pages/PreQuizSetup";
import QuizScreen from "@/pages/QuizScreen";
import ResultsScreen from "@/pages/ResultsScreen";
import ReviewSummaryScreen from "@/pages/ReviewSummaryScreen";
import StudyScreen from "@/pages/StudyScreen";
import ProgressScreen from "@/pages/ProgressScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import MyVerbaScreen from "@/pages/MyVerbaScreen";
import HowItWorksScreen from "@/pages/HowItWorksScreen";
import ChainScreen from "@/pages/ChainScreen";
import BottomNav, { TAB_PATHS } from "@/components/BottomNav";
import TabPager from "@/components/TabPager";
import { takeSkipSlide } from "@/lib/pageTransition";
import { SHOW_TABS_EVENT } from "@/lib/cardMorph";
import CardMorph from "@/components/CardMorph";

const queryClient = new QueryClient();

const SLIDE = {
  transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] as [number,number,number,number] },
};

/**
 * Ordine delle schede nella barra in basso. Decide da che lato scorre la pagina:
 * verso una scheda più a destra la pagina nuova entra da destra, verso una più
 * a sinistra entra da sinistra. Entrata e uscita vanno sempre nello stesso verso.
 */
const TAB_ORDER = ["/study", "/decks", "/progress", "/profile"];

/** 1 = avanti (entra da destra), -1 = indietro (entra da sinistra). */
function slideDirection(from: string | null, to: string): 1 | -1 {
  // tornare a una scheda da una pagina fuori dalle schede (setup, quiz,
  // risultati, scelta dei deck) è tornare indietro
  if (from && !TAB_ORDER.includes(from) && TAB_ORDER.includes(to)) return -1;
  const a = from ? TAB_ORDER.indexOf(from) : -1;
  const b = TAB_ORDER.indexOf(to);
  if (a >= 0 && b >= 0 && a !== b) return b > a ? 1 : -1;
  // tutto il resto (setup, quiz, risultati…) va avanti, come prima
  return 1;
}

const slideVariants = {
  // d = 0: la pagina nasce da una card allargata (o si richiude in una card). Compare
  // e sparisce SUBITO, sotto la tinta della card, che sta sopra a tutto e fa da
  // transizione: nessuna opacità animata sull'intera pagina (su iPhone bloccava).
  enter: (d: number) => (d === 0 ? { x: 0 } : { x: d > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (d: number) => (d === 0 ? { x: 0, transition: { duration: 0 } } : { x: d > 0 ? "-100%" : "100%" }),
};

function Router() {
  const [location] = useLocation();
  const showNav = TAB_PATHS.includes(location);
  // Calcolata una volta per cambio di pagina e tenuta ferma: AnimatePresence la
  // passa anche alla pagina che esce, così le due scorrono nello stesso verso.
  const isTabPage = TAB_ORDER.includes(location);
  const prevRef = useRef<string | null>(null);
  const dirRef = useRef<1 | -1 | 0>(1);
  // Le schede restano SEMPRE in memoria, come in un'app iOS: aprendo una pagina
  // (setup, quiz, Chain…) la striscia delle schede esce di scena ma non si smonta,
  // e tornando è già pronta, senza ricostruirla. "visit" conta i ritorni: a ogni
  // ritorno TabPager rinfresca i dati delle schede (vedi TabPager.tsx).
  const visitRef = useRef(0);
  const lastTabRef = useRef(isTabPage ? location : "/study");
  const everTabsRef = useRef(isTabPage);
  const firstRenderRef = useRef(true);
  useEffect(() => { firstRenderRef.current = false; }, []);
  if (prevRef.current !== location) {
    // 0 = la pagina nasce da una card che si è appena allargata a tutto schermo
    dirRef.current = takeSkipSlide() ? 0 : slideDirection(prevRef.current, location);
    // un ritorno vero: le schede esistevano già e si torna da una pagina
    if (isTabPage && everTabsRef.current && prevRef.current !== null && !TAB_ORDER.includes(prevRef.current)) visitRef.current += 1;
    prevRef.current = location;
  }
  if (isTabPage) { lastTabRef.current = location; everTabsRef.current = true; }
  const dir = dirRef.current;
  // Quando una pagina copre del tutto le schede, le schede si nascondono
  // (visibility: hidden, che a differenza di display: none conserva la posizione
  // di scorrimento di ogni scheda): niente disegno dietro al quiz.
  const [tabsHidden, setTabsHidden] = useState(!isTabPage);
  useEffect(() => {
    if (isTabPage) { setTabsHidden(false); return; }
    const t = window.setTimeout(() => setTabsHidden(true), 450);
    return () => window.clearTimeout(t);
  }, [isTabPage]);
  // una pagina che si richiude nella sua card chiede di rivedere le schede sotto di sé
  useEffect(() => {
    const show = () => setTabsHidden(false);
    window.addEventListener(SHOW_TABS_EVENT, show);
    return () => window.removeEventListener(SHOW_TABS_EVENT, show);
  }, []);
  const tabsVisible = isTabPage || !tabsHidden;
  // TabPager e le schede: TAB_ORDER qui e in TabPager.tsx devono restare uguali.
  return (
    <div style={{ position: "relative", overflow: "hidden", height: "100dvh", width: "100%", background: "#0A0A0A" }}>
      {everTabsRef.current && (
        <motion.div
          // la prima volta (dal Welcome) le schede entrano scorrendo come una pagina;
          // all'avvio direttamente su una scheda invece sono già al loro posto
          initial={firstRenderRef.current || dir === 0 ? false : { x: dir > 0 ? "100%" : "-100%" }}
          animate={{ x: isTabPage || dir === 0 ? 0 : dir > 0 ? "-100%" : "100%" }}
          transition={dir === 0 ? { duration: 0 } : SLIDE.transition}
          aria-hidden={!isTabPage}
          style={{ position: "absolute", inset: 0, visibility: tabsVisible ? "visible" : "hidden", pointerEvents: isTabPage ? "auto" : "none" }}
        >
          <TabPager location={lastTabRef.current} visit={visitRef.current} />
        </motion.div>
      )}
      <AnimatePresence initial={false} custom={dir}>
        {!isTabPage && (
        <motion.div
          key={location}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SLIDE.transition}
          style={{
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            paddingBottom: showNav ? "calc(64px + env(safe-area-inset-bottom))" : 0,
          }}
        >
          {/* location fissata: la pagina che esce continua a mostrare SE STESSA mentre
              scorre via, invece di ridisegnarsi con la pagina nuova (che così veniva
              costruita due volte) */}
          {/* CardMorph: se la pagina nasce da una card, si apre da lei e ci si richiude */}
          <CardMorph>
          <Switch location={location}>
            <Route path="/" component={WelcomeScreen} />
            <Route path="/study" component={StudyScreen} />
            <Route path="/decks" component={PracticeHomeScreen} />
            <Route path="/choose-deck" component={DeckSelectionScreen} />
            <Route path="/practice" component={PracticeSetupScreen} />
            <Route path="/progress" component={ProgressScreen} />
            <Route path="/profile" component={ProfileScreen} />
            <Route path="/difficulty" component={DifficultyScreen} />
            <Route path="/setup" component={PreQuizSetup} />
            <Route path="/quiz" component={QuizScreen} />
            <Route path="/results" component={ResultsScreen} />
            <Route path="/review-summary" component={ReviewSummaryScreen} />
            <Route path="/my-verba" component={MyVerbaScreen} />
            <Route path="/how-it-works" component={HowItWorksScreen} />
            <Route path="/chain" component={ChainScreen} />
            <Route component={NotFound} />
          </Switch>
          </CardMorph>
        </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
