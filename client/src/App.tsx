import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminJobs from "@/pages/admin/jobs";
import AdminPipeline from "@/pages/admin/pipeline";
import AdminEmailTemplates from "@/pages/admin/email-templates";
import AssessmentTemplatesPage from "@/pages/admin/assessment-templates";
import AssessmentAnalyticsPage from "@/pages/admin/assessment-analytics";
import AssessmentCategoriesPage from "@/pages/admin/assessment-categories";
import EmailComposePage from "./pages/admin/email-compose";
import CandidateProfile from "@/pages/candidate/profile";
import CandidateJobs from "@/pages/candidate/jobs";
import CandidateApplications from "@/pages/candidate/applications";
import CandidateAssessments from "@/pages/candidate/assessments";
import TakeAssessment from "@/pages/candidate/take-assessment";
import AssessmentResults from "@/pages/candidate/assessment-results";
import AuthGuard from "@/components/auth-guard";
import ErrorBoundary from "@/components/ErrorBoundary";
import ResumeSearchPage from "@/pages/admin/resume-search";
import { ChatbotWidget } from "@/components/ChatbotWidget";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Admin Routes */}
      <Route path="/admin/jobs">
        <AuthGuard requiredRole="admin">
          <AdminJobs />
        </AuthGuard>
      </Route>
      <Route path="/admin/pipeline">
        <AuthGuard requiredRole="admin">
          <AdminPipeline />
        </AuthGuard>
      </Route>
      <Route path="/admin/email-templates">
        <AuthGuard requiredRole="admin">
          <AdminEmailTemplates />
        </AuthGuard>
      </Route>
      <Route path="/admin/assessment-templates">
        <AuthGuard requiredRole="admin">
          <AssessmentTemplatesPage />
        </AuthGuard>
      </Route>
      <Route path="/admin/assessment-analytics">
        <AuthGuard requiredRole="admin">
          <AssessmentAnalyticsPage />
        </AuthGuard>
      </Route>
      <Route path="/admin/assessment-categories">
        <AuthGuard requiredRole="admin">
          <AssessmentCategoriesPage />
        </AuthGuard>
      </Route>
      <Route path="/admin/email/compose">
        <AuthGuard requiredRole="admin">
          <EmailComposePage />
        </AuthGuard>
      </Route>
      <Route path="/admin/resume-search">
        <AuthGuard requiredRole="admin">
          <ResumeSearchPage />
        </AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard requiredRole="admin">
          <AdminDashboard />
        </AuthGuard>
      </Route>

      {/* Assessment Routes */}
      <Route path="/assessment/:templateId">
        {(params: any) => {
          console.log('Route params:', params);
          return (
            <AuthGuard requiredRole="candidate">
              <TakeAssessment />
            </AuthGuard>
          );
        }}
      </Route>
      <Route path="/assessment-results">
        <AuthGuard requiredRole="candidate">
          <AssessmentResults />
        </AuthGuard>
      </Route>

      {/* Candidate Routes */}
      <Route path="/candidate">
        <AuthGuard requiredRole="candidate">
          <Redirect to="/candidate/profile" />
        </AuthGuard>
      </Route>
      <Route path="/candidate/profile">
        <AuthGuard requiredRole="candidate">
          <CandidateProfile />
        </AuthGuard>
      </Route>
      <Route path="/candidate/jobs">
        <AuthGuard requiredRole="candidate">
          <CandidateJobs />
        </AuthGuard>
      </Route>
      <Route path="/candidate/applications">
        <AuthGuard requiredRole="candidate">
          <CandidateApplications />
        </AuthGuard>
      </Route>
      <Route path="/candidate/assessments">
        <AuthGuard requiredRole="candidate">
          <CandidateAssessments />
        </AuthGuard>
      </Route>
      <Route path="/candidate/take-assessment">
        <AuthGuard requiredRole="candidate">
          <TakeAssessment />
        </AuthGuard>
      </Route>

      {/* Default redirect */}
      <Route path="/">
        <Login />
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatbotWidget />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
