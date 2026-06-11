import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Overview } from "@/pages/overview";
import { CattleList } from "@/pages/cattle";
import { CattleDetail } from "@/pages/cattle-detail";
import { InvestorsList } from "@/pages/investors";
import { InvestorDetail } from "@/pages/investor-detail";
import { TreatmentsList } from "@/pages/treatments";
import { Reports } from "@/pages/reports";
import { Settings } from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/overview" />} />
        <Route path="/overview" component={Overview} />
        <Route path="/cattle" component={CattleList} />
        <Route path="/cattle/:id" component={CattleDetail} />
        <Route path="/investors" component={InvestorsList} />
        <Route path="/investors/:id" component={InvestorDetail} />
        <Route path="/treatments" component={TreatmentsList} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
