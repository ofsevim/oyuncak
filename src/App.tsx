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
import ExperiencePreferences from '@/components/ExperiencePreferences';
import RouteMetadata from '@/components/RouteMetadata';

const Parents = lazy(() => import('./pages/Parents'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

const NicknameModal = lazy(() => import("@/components/NicknameModal"));
const PWAUpdatePrompt = lazy(() => import("@/components/PWAUpdatePrompt"));
const ScoreSyncNotice = lazy(() => import("@/components/ScoreSyncNotice"));

const ModalFallback = () => null;
const PageFallback = () => (
  <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
    <LoadingSpinner />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <ExperiencePreferences>
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <RouteMetadata />
            <Suspense fallback={<ModalFallback />}>
              <NicknameModal />
              <PWAUpdatePrompt />
              <ScoreSyncNotice />
            </Suspense>
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/draw" element={<Index />} />
                  <Route path="/games" element={<Index />} />
                  <Route path="/games/:gameId" element={<Index />} />
                  <Route path="/story" element={<Index />} />
                  <Route path="/parents" element={<Parents />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </ThemeProvider>
    </ExperiencePreferences>
  </ErrorBoundary>
);

export default App;
