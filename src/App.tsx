import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const NicknameModal = lazy(() => import("@/components/NicknameModal"));

const ModalFallback = () => null;
const PageFallback = () => (
  <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
    <LoadingSpinner />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Suspense fallback={<ModalFallback />}>
              <NicknameModal />
            </Suspense>
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/draw" element={<Index />} />
                  <Route path="/games" element={<Index />} />
                  <Route path="/games/:gameId" element={<Index />} />
                  <Route path="/story" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
