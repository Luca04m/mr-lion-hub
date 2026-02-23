import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import TasksPage from "./pages/TasksPage";
import KanbanPage from "./pages/KanbanPage";
import CalendarPage from "./pages/CalendarPage";
import PeoplePage from "./pages/PeoplePage";
import AreasPage from "./pages/AreasPage";
import ActivityPage from "./pages/ActivityPage";
import MeetingsPage from "./pages/MeetingsPage";
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
          <Route path="/kanban" element={<ProtectedPage><KanbanPage /></ProtectedPage>} />
          <Route path="/calendar" element={<ProtectedPage><CalendarPage /></ProtectedPage>} />
          <Route path="/people" element={<ProtectedPage><PeoplePage /></ProtectedPage>} />
          <Route path="/areas" element={<ProtectedPage><AreasPage /></ProtectedPage>} />
          <Route path="/activity" element={<ProtectedPage><ActivityPage /></ProtectedPage>} />
          <Route path="/meetings" element={<ProtectedPage><MeetingsPage /></ProtectedPage>} />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
