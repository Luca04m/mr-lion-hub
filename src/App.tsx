import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import TasksPage from "./pages/TasksPage";
import MeetingsPage from "./pages/MeetingsPage";
import RevendedoresPage from "./pages/RevendedoresPage";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";

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
          <Route path="/tasks" element={<ProtectedPage><TasksPage /></ProtectedPage>} />
          <Route path="/meetings" element={<ProtectedPage><MeetingsPage /></ProtectedPage>} />
          <Route path="/revendedores" element={<ProtectedPage><RevendedoresPage /></ProtectedPage>} />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
          <Route path="/kanban" element={<Navigate to="/tasks" replace />} />
          <Route path="/calendar" element={<Navigate to="/tasks" replace />} />
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
