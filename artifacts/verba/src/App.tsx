import { useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import WelcomeScreen from "@/pages/WelcomeScreen";
import DeckSelectionScreen from "@/pages/DeckSelectionScreen";
import PracticeHomeScreen from "@/pages/PracticeHomeScreen";
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
import BottomNav, { TAB_PATHS } from "@/components/BottomNav";
import TabPager from "@/components/TabPager";

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
  // la scelta del deck si apre dalla pillola di Practice: tornarci è tornare indietro
  if (from === "/choose-deck" && to === "/decks") return -1;
  const a = from ? TAB_ORDER.indexOf(from) : -1;
  const b = TAB_ORDER.indexOf(to);
  if (a >= 0 && b >= 0 && a !== b) return b > a ? 1 : -1;
  // tutto il resto (setup, quiz, risultati…) va avanti, come prima
  return 1;
}

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%" }),
};

function Router() {
  const [location] = useLocation();
  const showNav = TAB_PATHS.includes(location);
  // Calcolata una volta per cambio di pagina e tenuta ferma: AnimatePresence la
  // passa anche alla pagina che esce, così le due scorrono nello stesso verso.
  const prevRef = useRef<string | null>(null);
  const dirRef = useRef<1 | -1>(1);
  if (prevRef.current !== location) {
    dirRef.current = slideDirection(prevRef.current, location);
    prevRef.current = location;
  }
  const dir = dirRef.current;
  // Le quattro schede vivono in una striscia sola (TabPager): passando da una
  // all'altra la pagina NON cambia, scorre la striscia. TAB_ORDER qui e in
  // TabPager.tsx devono restare uguali.
  const isTabPage = TAB_ORDER.includes(location);
  return (
    <div style={{ position: "relative", overflow: "hidden", height: "100dvh", width: "100%", background: "#0A0A0A" }}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={isTabPage ? "tabs" : location}
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
          {isTabPage ? (
            <TabPager location={location} />
          ) : (
          <Switch>
            <Route path="/" component={WelcomeScreen} />
            <Route path="/study" component={StudyScreen} />
            <Route path="/decks" component={PracticeHomeScreen} />
            <Route path="/choose-deck" component={DeckSelectionScreen} />
            <Route path="/progress" component={ProgressScreen} />
            <Route path="/profile" component={ProfileScreen} />
            <Route path="/difficulty" component={DifficultyScreen} />
            <Route path="/setup" component={PreQuizSetup} />
            <Route path="/quiz" component={QuizScreen} />
            <Route path="/results" component={ResultsScreen} />
            <Route path="/review-summary" component={ReviewSummaryScreen} />
            <Route path="/my-verba" component={MyVerbaScreen} />
            <Route path="/how-it-works" component={HowItWorksScreen} />
            <Route component={NotFound} />
          </Switch>
          )}
        </motion.div>
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
