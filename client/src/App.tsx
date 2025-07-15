import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminJobs from "@/pages/admin/jobs";
import AdminPipeline from "@/pages/admin/pipeline";
import AdminEmailTemplates from "@/pages/admin/email-templates";
import EmailComposePage from "./pages/admin/email-compose";
import CandidateProfile from "@/pages/candidate/profile";
import CandidateJobs from "@/pages/candidate/jobs";
import CandidateApplications from "@/pages/candidate/applications";
import AuthGuard from "@/components/auth-guard";
import ErrorBoundary from "@/components/ErrorBoundary";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
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
      <Route path="/admin/email/compose">
        <AuthGuard requiredRole="admin">
          <EmailComposePage />
        </AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard requiredRole="admin">
          <AdminDashboard />
        </AuthGuard>
      </Route>

      {/* Candidate Routes */}
      <Route path="/candidate">
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
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
