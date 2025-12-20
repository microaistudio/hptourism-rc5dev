import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// DevConsole removed - dangerous in production
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthLayout } from "@/components/auth-layout";
import { getDefaultRouteForRole } from "@/config/navigation";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import OwnerDashboardNew from "@/pages/owner-dashboard-new";
import ProfilePage from "@/pages/profile";
import NewApplication from "@/pages/applications/new";
import ServiceRequestHandler from "@/pages/applications/service-request";
import ApplicationDetail from "@/pages/applications/detail";
import HimKoshPaymentPage from "@/pages/applications/payment-himkosh";
import PublicProperties from "@/pages/public/properties";
import PublicPropertyDetail from "@/pages/public/property-detail";
import AnalyticsPage from "@/pages/analytics";
import WorkflowMonitoring from "@/pages/workflow-monitoring";
import PaymentVerification from "@/pages/payment-verification";
import AdminUsers from "@/pages/admin/users";
import AdminConsole from "@/pages/admin/console";
import AdminConsoleOld from "@/pages/admin/console-old";
import AdminLGDImport from "@/pages/admin/lgd-import";
import AdminAuditLog from "@/pages/admin/audit-log";
import AdminRcApplications from "@/pages/admin/rc-applications";
import AdminRcApplicationDetail from "@/pages/admin/rc-application-detail";
import AdminRcApplicationCertificate from "@/pages/admin/rc-application-certificate";
import LegacyOwnerSupport from "@/pages/admin/legacy-owner-support";
import SuperAdminConsole from "@/pages/admin/super-admin-console";
import SuperAdminDashboard from "@/pages/admin/super-admin-dashboard";
import SuperAdminDashboardOld from "@/pages/admin/super-admin-dashboard-old";
import AdminBackup from "@/pages/admin/backup";
import AdminExportImport from "@/pages/admin/export-import";
import DADashboard from "@/pages/da/dashboard";
import DALegacyDashboard from "@/pages/da/legacy-dashboard";
import DAApplicationDetail from "@/pages/da/application-detail";
import DAIncompleteApplications from "@/pages/da/incomplete-applications";
import DAInspections from "@/pages/da/inspections";
import DAInspectionReport from "@/pages/da/inspection-report";
import DAProfile from "@/pages/da/profile";
import DTDODashboard from "@/pages/dtdo/dashboard";
import DTDOApplicationReview from "@/pages/dtdo/application-review";
import DTDOScheduleInspection from "@/pages/dtdo/schedule-inspection";
import DTDOInspectionReview from "@/pages/dtdo/inspection-review";
import DTDOProfile from "@/pages/dtdo/profile";
import OfficerApplicationSearch from "@/pages/officer-application-search";
import TestAPI from "@/pages/test-api";
import HimKoshTest from "@/pages/himkosh-test";
import ExistingOwnerOnboarding from "@/pages/existing-owner-onboarding";
import SandboxLandingPage from "@/pages/sandbox/landing";
import SandboxLoginExperiment from "@/pages/sandbox/login-experiment";
import ContactPage from "@/pages/contact";
import TrackApplicationPage from "@/pages/track-application";
import VerifyCertificatePage from "@/pages/verify-certificate";
import AdventureSportsRegistration from "@/pages/adventure-sports/registration";
import ServiceSelection from "@/pages/services";
import type { User } from "@shared/schema";

interface ProtectedRouteProps {
  component: React.ComponentType;
  allowedRoles?: string[];
}

function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { data: userData, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  // If still loading, show nothing (AuthLayout will show loading state)
  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AuthLayout>
    );
  }

  // If not logged in, redirect to login
  if (!userData?.user) {
    setLocation("/login");
    return null;
  }

  // If role restrictions exist and user doesn't have required role, redirect to their home
  if (allowedRoles && !allowedRoles.includes(userData.user.role)) {
    const homeRoute = getDefaultRouteForRole(userData.user.role);
    setLocation(homeRoute);
    return null;
  }

  return (
    <AuthLayout>
      <Component />
    </AuthLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomePage} />
      <Route path="/test-api" component={TestAPI} />
      <Route path="/himkosh-test" component={HimKoshTest} />
      <Route path="/properties" component={PublicProperties} />
      <Route path="/properties/:id" component={PublicPropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/contact">
        {() => <ContactPage />}
      </Route>
      <Route path="/track">
        {() => <TrackApplicationPage />}
      </Route>
      <Route path="/verify-certificate">
        {() => <VerifyCertificatePage />}
      </Route>
      <Route path="/sandbox/landing" component={SandboxLandingPage} />
      <Route path="/sandbox/login-experiment" component={SandboxLoginExperiment} />

      {/* Protected Routes - All wrapped in AuthLayout */}
      {/* Service Selection Hub - Renders without sidebar (user selects service first) */}
      <Route path="/services">
        {() => <ServiceSelection />}
      </Route>

      {/* Property Owner Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/dashboard-new">
        {() => <ProtectedRoute component={OwnerDashboardNew} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/existing-owner">
        {() => <ProtectedRoute component={ExistingOwnerOnboarding} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/service-request">
        {() => <ProtectedRoute component={ServiceRequestHandler} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/new">
        {() => <ProtectedRoute component={NewApplication} allowedRoles={['property_owner']} />}
      </Route>
      {/* Adventure Sports - Separate pipeline without Homestay sidebar */}
      <Route path="/adventure-sports/register">
        {() => <AdventureSportsRegistration />}
      </Route>
      <Route path="/applications/:id/payment-himkosh">
        {() => <ProtectedRoute component={HimKoshPaymentPage} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/:id">
        {() => <ProtectedRoute component={ApplicationDetail} />}
      </Route>

      {/* Officer-Only Routes */}
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsPage} allowedRoles={['dealing_assistant', 'district_tourism_officer', 'district_officer', 'state_officer', 'admin']} />}
      </Route>
      <Route path="/workflow-monitoring">
        {() => <ProtectedRoute component={WorkflowMonitoring} allowedRoles={['dealing_assistant', 'district_tourism_officer', 'district_officer', 'state_officer', 'admin']} />}
      </Route>
      <Route path="/payment-verification">
        {() => <ProtectedRoute component={PaymentVerification} allowedRoles={['district_officer', 'state_officer']} />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/console">
        {() => <ProtectedRoute component={AdminConsole} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/console-old">
        {() => <ProtectedRoute component={AdminConsoleOld} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/lgd-import">
        {() => <ProtectedRoute component={AdminLGDImport} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/audit-log">
        {() => <ProtectedRoute component={AdminAuditLog} allowedRoles={['admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/rc-applications">
        {() => <ProtectedRoute component={AdminRcApplications} allowedRoles={['admin_rc', 'admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/rc-applications/:id">
        {() => <ProtectedRoute component={AdminRcApplicationDetail} allowedRoles={['admin_rc', 'admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/rc-applications/:id/certificate">
        {() => <ProtectedRoute component={AdminRcApplicationCertificate} allowedRoles={['admin_rc', 'admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/rc-application-certificate">
        {() => <ProtectedRoute component={AdminRcApplicationCertificate} allowedRoles={['admin_rc', 'admin', 'super_admin']} />}
      </Route>
      <Route path="/admin/legacy-owner-support">
        {() => <ProtectedRoute component={LegacyOwnerSupport} allowedRoles={['admin', 'super_admin']} />}
      </Route>

      {/* Super Admin Only Routes */}
      <Route path="/admin/super-dashboard">
        {() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/super-dashboard-old">
        {() => <ProtectedRoute component={SuperAdminDashboardOld} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/super-console">
        {() => <ProtectedRoute component={SuperAdminConsole} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/backup">
        {() => <ProtectedRoute component={AdminBackup} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/export-import">
        {() => <ProtectedRoute component={AdminExportImport} allowedRoles={['super_admin']} />}
      </Route>

      {/* Dealing Assistant Routes */}
      <Route path="/da/dashboard">
        {() => <ProtectedRoute component={DADashboard} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/legacy">
        {() => <ProtectedRoute component={DALegacyDashboard} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/profile">
        {() => <ProtectedRoute component={DAProfile} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/applications/:id">
        {() => <ProtectedRoute component={DAApplicationDetail} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/incomplete-applications">
        {() => <ProtectedRoute component={DAIncompleteApplications} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/inspections">
        {() => <ProtectedRoute component={DAInspections} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/inspections/:id">
        {() => <ProtectedRoute component={DAInspectionReport} allowedRoles={['dealing_assistant']} />}
      </Route>
      <Route path="/da/search">
        {() => <ProtectedRoute component={OfficerApplicationSearch} allowedRoles={['dealing_assistant']} />}
      </Route>

      {/* DTDO (District Tourism Development Officer) Routes */}
      <Route path="/dtdo/dashboard">
        {() => <ProtectedRoute component={DTDODashboard} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>
      <Route path="/dtdo/applications/:id">
        {() => <ProtectedRoute component={DTDOApplicationReview} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>
      <Route path="/dtdo/schedule-inspection/:id">
        {() => <ProtectedRoute component={DTDOScheduleInspection} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>
      <Route path="/dtdo/inspection-review/:id">
        {() => <ProtectedRoute component={DTDOInspectionReview} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>
      <Route path="/dtdo/profile">
        {() => <ProtectedRoute component={DTDOProfile} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>
      <Route path="/dtdo/search">
        {() => <ProtectedRoute component={OfficerApplicationSearch} allowedRoles={['district_tourism_officer', 'district_officer']} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          {/* DevConsole removed for production safety */}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
