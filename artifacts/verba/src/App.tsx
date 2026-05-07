import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import WelcomeScreen from "@/pages/WelcomeScreen";
import DeckSelectionScreen from "@/pages/DeckSelectionScreen";
import DifficultyScreen from "@/pages/DifficultyScreen";
import PreQuizSetup from "@/pages/PreQuizSetup";
import QuizScreen from "@/pages/QuizScreen";
import ResultsScreen from "@/pages/ResultsScreen";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomeScreen} />
      <Route path="/decks" component={DeckSelectionScreen} />
      <Route path="/difficulty" component={DifficultyScreen} />
      <Route path="/setup" component={PreQuizSetup} />
      <Route path="/quiz" component={QuizScreen} />
      <Route path="/results" component={ResultsScreen} />
      <Route component={NotFound} />
    </Switch>
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
