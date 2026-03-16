import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import Overview from "@/pages/overview";
import Products from "@/pages/products";
import Prompts from "@/pages/prompts";
import Scenarios from "@/pages/scenarios";
import PagesConfig from "@/pages/pages-config";
import Reports from "@/pages/reports";
import Logs from "@/pages/logs";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/products" component={Products} />
        <Route path="/prompts" component={Prompts} />
        <Route path="/scenarios" component={Scenarios} />
        <Route path="/pages" component={PagesConfig} />
        <Route path="/reports" component={Reports} />
        <Route path="/logs" component={Logs} />
        <Route path="/settings" component={SettingsPage} />
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
