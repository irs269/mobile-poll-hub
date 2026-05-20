import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Survey from "./pages/Survey";
import PublicSurvey from "./pages/PublicSurvey";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SurveysPage from "./pages/admin/SurveysPage";
import SurveyEditor from "./pages/admin/SurveyEditor";
import SurveyPreview from "./pages/admin/SurveyPreview";
import SurveyorsPage from "./pages/admin/SurveyorsPage";
import ResponsesPage from "./pages/admin/ResponsesPage";
import PublicResponsesPage from "./pages/admin/PublicResponsesPage";
import ReportingPage from "./pages/admin/ReportingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/s/:surveyId" element={<PublicSurvey />} />
            
            {/* Surveyor Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/survey/:surveyId" element={<Survey />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="surveys" element={<SurveysPage />} />
              <Route path="surveys/:surveyId/edit" element={<SurveyEditor />} />
              <Route path="surveys/:surveyId/preview" element={<SurveyPreview />} />
              <Route path="surveyors" element={<SurveyorsPage />} />
              <Route path="responses" element={<ResponsesPage />} />
              <Route path="reporting" element={<ReportingPage />} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
