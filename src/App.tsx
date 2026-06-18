import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import AssistantPage from "./pages/AssistantPage";
import TasksPage from "./pages/TasksPage";
import RevendedoresPage from "./pages/RevendedoresPage";
import CalendarPage from "./pages/CalendarPage";
import CampaignsPage from "./pages/CampaignsPage";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";
import { PrivateRoute } from "./components/PrivateRoute";
import { EstoqueLayout } from "./estoque/EstoqueLayout";
import { FinanceiroLayout } from "./financeiro/FinanceiroLayout";
import { Comando } from "./financeiro/telas/Comando";
import { Lucro } from "./financeiro/telas/Lucro";
import { Caixa } from "./financeiro/telas/Caixa";

const queryClient = new QueryClient();

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/overview" element={<ProtectedPage><OverviewPage /></ProtectedPage>} />
          <Route path="/assistente" element={<ProtectedPage><AssistantPage /></ProtectedPage>} />
          <Route path="/tasks" element={<ProtectedPage><TasksPage /></ProtectedPage>} />
          <Route path="/meetings" element={<Navigate to="/calendar" replace />} />
          <Route path="/revendedores" element={<ProtectedPage><RevendedoresPage /></ProtectedPage>} />
          <Route path="/content" element={<Navigate to="/calendar" replace />} />
          <Route path="/campaigns" element={<ProtectedPage><CampaignsPage /></ProtectedPage>} />
          <Route path="/financeiro" element={<PrivateRoute><FinanceiroLayout /></PrivateRoute>}>
            <Route index element={<Comando />} />
            <Route path="lucro" element={<Lucro />} />
            <Route path="caixa" element={<Caixa />} />
          </Route>
          <Route path="/estoque" element={<PrivateRoute><EstoqueLayout /></PrivateRoute>} />
          <Route path="/estoque/*" element={<PrivateRoute><EstoqueLayout /></PrivateRoute>} />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
          <Route path="/kanban" element={<Navigate to="/tasks" replace />} />
          <Route path="/calendar" element={<ProtectedPage><CalendarPage /></ProtectedPage>} />
          <Route path="/people" element={<Navigate to="/tasks" replace />} />
          <Route path="/areas" element={<Navigate to="/tasks" replace />} />
          <Route path="/activity" element={<Navigate to="/tasks" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
