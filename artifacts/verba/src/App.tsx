import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import WelcomeScreen from "@/pages/WelcomeScreen";
import DeckSelectionScreen from "@/pages/DeckSelectionScreen";
import DifficultyScreen from "@/pages/DifficultyScreen";
import PreQuizSetup from "@/pages/PreQuizSetup";
import QuizScreen from "@/pages/QuizScreen";
import ResultsScreen from "@/pages/ResultsScreen";
import ReviewCompleteScreen from "@/pages/ReviewCompleteScreen";
import ReviewSummaryScreen from "@/pages/ReviewSummaryScreen";
import StudyScreen from "@/pages/StudyScreen";
import ProgressScreen from "@/pages/ProgressScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import MyVerbaScreen from "@/pages/MyVerbaScreen";
import HowItWorksScreen from "@/pages/HowItWorksScreen";
import BottomNav, { TAB_PATHS } from "@/components/BottomNav";

const queryClient = new QueryClient();

const SLIDE = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit:    { x: "-100%" },
  transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] as [number,number,number,number] },
};

function Router() {
  const [location] = useLocation();
  const showNav = TAB_PATHS.includes(location);
  return (
    <div style={{ position: "relative", overflow: "hidden", height: "100dvh", width: "100%", background: "#0A0A0A" }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={location}
          initial={SLIDE.initial}
          animate={SLIDE.animate}
          exit={SLIDE.exit}
          transition={SLIDE.transition}
          style={{
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            paddingBottom: showNav ? "calc(64px + env(safe-area-inset-bottom))" : 0,
          }}
        >
          <Switch>
            <Route path="/" component={WelcomeScreen} />
            <Route path="/study" component={StudyScreen} />
            <Route path="/decks" component={DeckSelectionScreen} />
            <Route path="/progress" component={ProgressScreen} />
            <Route path="/profile" component={ProfileScreen} />
            <Route path="/difficulty" component={DifficultyScreen} />
            <Route path="/setup" component={PreQuizSetup} />
            <Route path="/quiz" component={QuizScreen} />
            <Route path="/results" component={ResultsScreen} />
            <Route path="/review-complete" component={ReviewCompleteScreen} />
            <Route path="/review-summary" component={ReviewSummaryScreen} />
            <Route path="/my-verba" component={MyVerbaScreen} />
            <Route path="/how-it-works" component={HowItWorksScreen} />
            <Route component={NotFound} />
          </Switch>
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
