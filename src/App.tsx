import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import WorkshopDetail from "./pages/WorkshopDetail";
import AdminPanel from "./pages/AdminPanel";
import VerifyCertificate from "./pages/VerifyCertificate";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminShortcut() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/admin');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminShortcut />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/workshop/:id" element={<WorkshopDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
