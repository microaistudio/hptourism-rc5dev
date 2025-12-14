import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, CreditCard, Download, Copy, Camera, FileCheck, ScrollText, MapPin, Building2, ClipboardCheck } from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { isCorrectionRequiredStatus } from "@/constants/workflow";
import { ServiceCenterPanel } from "@/components/dashboard/service-center";

type FilterType =
  | 'all'
  | 'new_applications'
  | 'under_process'
  | 'completed'
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'sent_back'
  | 'payment_pending'
  | 'pending_review'
  | 'inspection';

const ownerProgressMilestones = [
  { id: "da_review", label: "With Dealing Assistant" },
  { id: "forwarded_dtdo", label: "Forwarded to DTDO" },
  { id: "inspection_scheduled", label: "Inspection Scheduled" },
  { id: "inspection_completed", label: "Inspection Completed" },
  { id: "payment_pending", label: "Payment Pending" },
  { id: "certificate", label: "Registration Approved" },
] as const;

const statusToMilestoneIndex: Record<string, number> = {
  draft: 0,
  paid_pending_submit: 0,
  submitted: 0,
  district_review: 0,
  under_scrutiny: 0,
  forwarded_to_dtdo: 1,
  sent_back_for_corrections: 0,
  reverted_to_applicant: 0,
  objection_raised: 1,
  state_review: 1,
  reverted_by_dtdo: 1,
  inspection_scheduled: 2,
  inspection_completed: 3,
  payment_pending: 4,
  verified_for_payment: 4,
  approved: 5,
  rejected: 5,
};

const progressSummaryMap: Record<string, string> = {
  draft: "Complete the draft to submit your application.",
  paid_pending_submit: "Payment received. Please confirm submission to proceed.",
  submitted: "Your application is with the Dealing Assistant for review.",
  district_review: "Your application is with the Dealing Assistant for review.",
  under_scrutiny: "Your application is being reviewed by the Dealing Assistant.",
  forwarded_to_dtdo: "Your application is with the DTDO for decision.",
  state_review: "Your application is with the DTDO for decision.",
  sent_back_for_corrections: "Action required: update the application with the requested corrections.",
  reverted_to_applicant: "Action required: update the application with the requested corrections.",
  objection_raised: "DTDO raised an objection. Please review and respond.",
  reverted_by_dtdo: "DTDO requested revisions — please review the remarks.",
  inspection_scheduled: "The inspection has been scheduled. Keep an eye on notifications.",
  inspection_completed: "Inspection finished. Awaiting final payment instructions.",
  payment_pending: "Complete the payment to receive your registration certificate.",
  verified_for_payment: "Payment verified — certificate will unlock shortly.",
  approved: "Certificate is ready for download.",
  rejected: "Application closed. Contact support for clarifications.",
};

const defaultProgressSummary = "We'll keep this tracker updated and notify you when action is needed.";

const getOwnerProgressState = (app: HomestayApplication) => {
  const status = app.status;
  let stageIndex = status ? statusToMilestoneIndex[status] ?? 0 : 0;
  if (app.siteInspectionCompletedDate) {
    stageIndex = Math.max(stageIndex, 3);
  } else if (app.siteInspectionScheduledDate) {
    stageIndex = Math.max(stageIndex, 2);
  }
  if (app.status === "payment_pending" || app.status === "verified_for_payment") {
    stageIndex = Math.max(stageIndex, 4);
  }
  if (app.approvedAt || app.status === "approved") {
    stageIndex = Math.max(stageIndex, 5);
  }
  const maxStageIndex = ownerProgressMilestones.length - 1;
  const boundedIndex = Math.min(Math.max(stageIndex, 0), maxStageIndex);
  const summary = (status && progressSummaryMap[status]) || defaultProgressSummary;

  return {
    stageIndex: boundedIndex,
    summary,
  };
};

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [showReadinessDialog, setShowReadinessDialog] = useState(false);
  const queryClient = useQueryClient();
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const { data: userData, isLoading: userLoading, error } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: !!userData?.user,
  });

  const searchParams = useMemo(() => {
    const query = location.includes("?") ? location.split("?")[1] : "";
    return new URLSearchParams(query);
  }, [location]);

  const paymentQuery = searchParams.get("payment");
  const paymentApplicationId = searchParams.get("application");
  const paymentApplicationNumber = searchParams.get("appNo");
  const paymentSuccess = paymentQuery === "success" && !!paymentApplicationId;
  const paymentFailed = paymentQuery === "failed" && !!paymentApplicationId;
  const handleCopy = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => {
        setCopiedValue((current) => (current === value ? null : current));
      }, 1500);
    } catch {
      setCopiedValue(null);
    }
  };

  useEffect(() => {
    if (paymentQuery) {
      const timer = window.setTimeout(() => {
        const pathOnly = location.split("?")[0];
        setLocation(pathOnly, { replace: true });
      }, 6000);
      return () => window.clearTimeout(timer);
    }
  }, [paymentQuery, location, setLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (error || !userData?.user) {
    setTimeout(() => setLocation("/login"), 0);
    return (
      <div className="flex items-center justify-center p-8">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const user = userData.user;
  const applications = applicationsData?.applications || [];
  const isResubmitted = (app: any) =>
    Boolean(app?.latestCorrection?.createdAt || app?.correctionSubmissionCount);
  const needsOwnerAction = (app: any) =>
    (app?.status === 'sent_back_for_corrections' ||
      app?.status === 'reverted_to_applicant' ||
      app?.status === 'reverted_by_dtdo' ||
      app?.status === 'objection_raised') &&
    !isResubmitted(app);
  const primaryOwnerApplication =
    user.role === "property_owner" && applications.length > 0 ? applications[0] : null;

  const submittedStatuses = ['submitted', 'district_review', 'state_review'] as const;
  const underProcessStatuses = [
    'under_scrutiny',
    'forwarded_to_dtdo',
    'inspection_scheduled',
    'inspection_completed',
    'payment_pending',
    'verified_for_payment',
  ] as const;
  const inspectionCompletedCount = applications.filter(a => a.status === 'inspection_completed').length;

  // Filter applications based on active filter
  const getFilteredApplications = () => {
    switch (activeFilter) {
      case 'new_applications':
        return applications.filter(a =>
          a.status === 'draft' ||
          a.status === 'paid_pending_submit' ||
          submittedStatuses.includes(a.status as typeof submittedStatuses[number])
        );
      case 'under_process':
        return applications.filter(a =>
          underProcessStatuses.includes(a.status as typeof underProcessStatuses[number]) &&
          !isResubmitted(a)
        );
      case 'completed':
        return applications.filter(a => a.status === 'approved' || a.status === 'rejected');
      case 'draft':
        return applications.filter(a => a.status === 'draft' || a.status === 'paid_pending_submit');
      case 'pending':
        return applications.filter(a =>
          a.status === 'submitted' ||
          a.status === 'district_review' ||
          a.status === 'state_review' ||
          a.status === 'under_scrutiny' ||
          a.status === 'forwarded_to_dtdo' ||
          a.status === 'inspection_scheduled' ||
          a.status === 'inspection_completed' ||
          a.status === 'reverted_to_applicant' ||
          a.status === 'reverted_by_dtdo' ||
          a.status === 'objection_raised' ||
          isResubmitted(a)
        );
      case 'pending_review':
        return applications.filter(a =>
          a.status === 'submitted' ||
          a.status === 'district_review' ||
          a.status === 'state_review' ||
          a.status === 'inspection_completed' ||
          a.status === 'under_scrutiny' ||
          a.status === 'forwarded_to_dtdo' ||
          a.status === 'reverted_to_applicant' ||
          a.status === 'reverted_by_dtdo' ||
          a.status === 'objection_raised' ||
          isResubmitted(a)
        );
      case 'inspection':
        return applications.filter(a => a.status === 'inspection_scheduled');
      case 'approved':
        return applications.filter(a => a.status === 'approved');
      case 'rejected':
        return applications.filter(a => a.status === 'rejected');
      case 'sent_back':
        return applications.filter(a => needsOwnerAction(a) || isResubmitted(a));
      case 'payment_pending':
        return applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment');
      case 'all':
      default:
        return applications;
    }
  };

  const filteredApplications = getFilteredApplications();

  // Different stats for different roles
  const stats = user.role === 'property_owner' ? {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft' || a.status === 'paid_pending_submit').length,
    // Pre-review submissions only; once in scrutiny/forwarded they move to under-process
    submitted: applications.filter(a =>
      a.status === 'submitted' ||
      a.status === 'district_review' ||
      a.status === 'state_review'
    ).length,
    sentBack: applications.filter(a => needsOwnerAction(a)).length,
    resubmitted: applications.filter(a => isResubmitted(a)).length,
    paymentPending: applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment').length,
    inspectionScheduled: applications.filter(a => a.status === 'inspection_scheduled').length,
    pending: applications.filter(a =>
      a.status === 'submitted' ||
      a.status === 'district_review' ||
      a.status === 'state_review' ||
      a.status === 'under_scrutiny' ||
      a.status === 'forwarded_to_dtdo' ||
      a.status === 'inspection_scheduled' ||
      a.status === 'inspection_completed' ||
      a.status === 'reverted_to_applicant' ||
      a.status === 'reverted_by_dtdo' ||
      isResubmitted(a)
    ).length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  } : {
    // Officer stats - all applications they can see
    total: applications.length,
    pendingReview: applications.filter(a =>
      a.status === 'submitted' ||
      a.status === 'district_review' ||
      a.status === 'state_review' ||
      a.status === 'inspection_completed'
    ).length,
    submitted: 0,
    inspectionScheduled: applications.filter(a => a.status === 'inspection_scheduled').length,
    paymentPending: applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections').length,
    resubmitted: 0,
    draft: applications.filter(a => a.status === 'draft').length,
    pending: 0,
  };

  const newApplicationsCount = stats.draft + stats.submitted;
  const underProcessCount = applications.filter(a =>
    underProcessStatuses.includes(a.status as typeof underProcessStatuses[number]) &&
    !isResubmitted(a)
  ).length;
  const pendingCorrectionsCount = stats.sentBack + stats.resubmitted;
  const completedCount = stats.approved + stats.rejected;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning", label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      submitted: { variant: "secondary", label: "Submitted" },
      district_review: { variant: "secondary", label: "District Review" },
      state_review: { variant: "secondary", label: "State Review" },
      sent_back_for_corrections: { variant: "warning", label: "Sent Back for Corrections" },
      reverted_to_applicant: { variant: "warning", label: "Reverted by DA" },
      reverted_by_dtdo: { variant: "warning", label: "Reverted by DTDO" },
      objection_raised: { variant: "warning", label: "DTDO Objection" },
      inspection_scheduled: { variant: "secondary", label: "Inspection Scheduled" },
      inspection_completed: { variant: "secondary", label: "Inspection Completed" },
      payment_pending: { variant: "secondary", label: "Payment Pending" },
      verified_for_payment: { variant: "secondary", label: "Payment Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="bg-background p-6">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {paymentSuccess && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <AlertTitle>Payment Successful</AlertTitle>
              <AlertDescription>
                Application {paymentApplicationNumber || paymentApplicationId} is now approved.
                Download your certificate from the application card below.
              </AlertDescription>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setLocation(`/applications/${paymentApplicationId}`)}
                data-testid="button-view-certificate"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(paymentApplicationNumber || paymentApplicationId)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Application #
              </Button>
            </div>
          </Alert>
        )}

        {paymentFailed && (
          <Alert className="mb-6 border-destructive/40 bg-red-50">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <AlertTitle>Payment Failed</AlertTitle>
              <AlertDescription>
                We could not confirm the payment for application {paymentApplicationNumber || paymentApplicationId}.
                Please try again or contact support with your HimKosh reference ID.
              </AlertDescription>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/applications/${paymentApplicationId}/payment-himkosh`)}
              >
                Retry Payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(paymentApplicationNumber || paymentApplicationId)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Application #
              </Button>
            </div>
          </Alert>
        )}

        {user.role === 'property_owner' && <ServiceCenterPanel />}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user.fullName}!</h2>
            {user.role === 'property_owner' && (
              <p className="text-muted-foreground">Manage your homestay applications</p>
            )}
            {user.role === 'district_officer' && (
              <p className="text-muted-foreground">District Officer Dashboard - {user.district || 'No District Assigned'}</p>
            )}
            {user.role === 'state_officer' && (
              <p className="text-muted-foreground">State Officer Dashboard - Statewide Access</p>
            )}
            {user.role === 'admin' && (
              <p className="text-muted-foreground">Administrator Dashboard</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              data-testid="button-dashboard-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {user.role === 'property_owner' && (
              <Button
                variant="secondary"
                onClick={() => setLocation("/existing-owner")}
                data-testid="button-existing-rc-registration"
              >
                Existing RC Registration
              </Button>
            )}
            {user.role === 'property_owner' && (
              <Button
                onClick={() => {
                  if (primaryOwnerApplication) {
                    setLocation(`/applications/${primaryOwnerApplication.id}`);
                    return;
                  }
                  // Show document readiness dialog for new applications
                  setShowReadinessDialog(true);
                }}
                data-testid="button-new-application"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Application
              </Button>
            )}
          </div>
        </div>

        {/* Payment Required Alert */}
        {user.role === 'property_owner' && stats.paymentPending > 0 && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle className="text-primary">Payment Required</CardTitle>
              </div>
              <CardDescription>
                You have {stats.paymentPending} application{stats.paymentPending > 1 ? 's' : ''} awaiting payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Your application{stats.paymentPending > 1 ? 's have' : ' has'} been approved for registration.
                Complete the payment to receive your certificate.
              </p>
              <Button
                onClick={() => {
                  const paymentApp = applications.find(a => a.status === 'payment_pending' || a.status === 'verified_for_payment');
                  if (paymentApp) setLocation(`/applications/${paymentApp.id}/payment-himkosh`);
                }}
                data-testid="button-make-payment"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Make Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Required Alert */}
        {user.role === 'property_owner' && stats.sentBack > 0 && (
          <Card className="mb-6 border border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-600">Action Required</CardTitle>
              </div>
              <CardDescription>
                You have {stats.sentBack} application{stats.sentBack > 1 ? 's' : ''} sent back for corrections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Your application{stats.sentBack > 1 ? 's have' : ' has'} been reviewed and require{stats.sentBack > 1 ? '' : 's'} corrections.
                Please update and resubmit to continue processing.
              </p>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  const sentBackApp = applications.find(a =>
                    needsOwnerAction(a) || isResubmitted(a)
                  );
                  if (sentBackApp) setLocation(`/applications/${sentBackApp.id}`);
                }}
                data-testid="button-view-sent-back"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                View and Update Application
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Inspection Acknowledgement Alert */}
        {user.role === 'property_owner' && stats.inspectionScheduled > 0 && (
          <Card className="mb-6 border border-cyan-100 bg-cyan-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-700" />
                <CardTitle className="text-cyan-800">Inspection Scheduled</CardTitle>
              </div>
              <CardDescription>
                {stats.inspectionScheduled > 1
                  ? `${stats.inspectionScheduled} inspections need your acknowledgement`
                  : "Please acknowledge the scheduled inspection so the team can visit."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-cyan-900/80 mb-3">
                Confirming the schedule helps the district team plan their visit. Tap below to review the details.
              </p>
              <Button
                className="bg-cyan-700 hover:bg-cyan-800 text-white"
                onClick={() => {
                  const inspectionApp = applications.find(a => a.status === 'inspection_scheduled');
                  if (inspectionApp) {
                    setLocation(`/applications/${inspectionApp.id}`);
                  } else if (applications.length > 0) {
                    setLocation(`/applications/${applications[0].id}`);
                  }
                }}
              >
                Review Schedule
              </Button>
            </CardContent>
          </Card>
        )}

        {user.role === 'property_owner' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card
              className={cn(
                "cursor-pointer bg-muted/50 border border-emerald-200 hover:shadow-sm transition",
                activeFilter === 'new_applications' && "ring-2 ring-emerald-500"
              )}
              onClick={() => setActiveFilter('new_applications')}
              data-testid="card-filter-new-applications"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">New Applications</p>
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <CardTitle className="text-4xl font-semibold text-emerald-800 leading-none" data-testid="stat-new-applications">
                  {newApplicationsCount}
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  Drafts: {stats.draft} • Submitted: {stats.submitted}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={cn(
                "cursor-pointer bg-muted/50 border border-blue-200 hover:shadow-sm transition",
                activeFilter === 'under_process' && "ring-2 ring-blue-500"
              )}
              onClick={() => setActiveFilter('under_process')}
              data-testid="card-filter-under-process"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Under Process</p>
                  <Clock className="w-5 h-5 text-sky-700" />
                </div>
                <CardTitle className="text-4xl font-semibold text-sky-900 leading-none" data-testid="stat-under-process">
                  {underProcessCount}
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  Inspections: {stats.inspectionScheduled + inspectionCompletedCount} • Payment pending: {stats.paymentPending}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={cn(
                "cursor-pointer bg-muted/50 border border-amber-200 hover:shadow-sm transition",
                activeFilter === 'sent_back' && "ring-2 ring-amber-500"
              )}
              onClick={() => setActiveFilter('sent_back')}
              data-testid="card-filter-pending-corrections"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending / Corrections</p>
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
                <CardTitle className="text-4xl font-semibold text-amber-800 leading-none" data-testid="stat-pending-corrections">
                  {pendingCorrectionsCount}
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  Sent back: {stats.sentBack} • Resubmitted: {stats.resubmitted}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={cn(
                "cursor-pointer bg-muted/50 border border-emerald-200 hover:shadow-sm transition",
                activeFilter === 'completed' && "ring-2 ring-emerald-500"
              )}
              onClick={() => setActiveFilter('completed')}
              data-testid="card-filter-completed"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <CardTitle className="text-4xl font-semibold text-emerald-900 leading-none" data-testid="stat-completed">
                  {completedCount}
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  Approved: {stats.approved} • Rejected: {stats.rejected}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card
              className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveFilter('all')}
              data-testid="card-filter-all"
            >
              <CardHeader className="pb-3">
                <CardDescription>Total Applications</CardDescription>
                <CardTitle className="text-3xl" data-testid="stat-total">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="w-4 h-4 mr-1" />
                  {user.role === 'property_owner' ? 'All submissions' :
                    user.role === 'district_officer' ? `In ${user.district || 'district'}` : 'Statewide'}
                </div>
              </CardContent>
            </Card>

            {user.role !== 'property_owner' && 'pendingReview' in stats && (
              <Card
                className={`border-orange-600 cursor-pointer hover-elevate transition-all ${activeFilter === 'pending_review' ? 'ring-2 ring-orange-600' : ''}`}
                onClick={() => setActiveFilter('pending_review')}
                data-testid="card-filter-pending-review"
              >
                <CardHeader className="pb-3">
                  <CardDescription>Pending Review</CardDescription>
                  <CardTitle className="text-3xl text-orange-600" data-testid="stat-pending-review">{stats.pendingReview}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    Requires action
                  </div>
                </CardContent>
              </Card>
            )}

            {user.role !== 'property_owner' && 'inspectionScheduled' in stats && (
              <Card
                className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'inspection' ? 'ring-2 ring-blue-600' : ''}`}
                onClick={() => setActiveFilter('inspection')}
                data-testid="card-filter-inspection"
              >
                <CardHeader className="pb-3">
                  <CardDescription>Inspections</CardDescription>
                  <CardTitle className="text-3xl text-blue-600" data-testid="stat-inspection">{stats.inspectionScheduled}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    Scheduled
                  </div>
                </CardContent>
              </Card>
            )}

            <Card
              className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'approved' ? 'ring-2 ring-green-600' : ''}`}
              onClick={() => setActiveFilter('approved')}
              data-testid="card-filter-approved"
            >
              <CardHeader className="pb-3">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-3xl text-green-600" data-testid="stat-approved">{stats.approved}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {user.role === 'property_owner' ? 'Active properties' : 'Completed'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {activeFilter === 'all' && 'All Applications'}
                  {activeFilter === 'new_applications' && 'New Applications'}
                  {activeFilter === 'under_process' && 'Under Process'}
                  {activeFilter === 'completed' && 'Completed Applications'}
                  {activeFilter === 'draft' && 'Draft Applications'}
                  {activeFilter === 'pending' && 'Pending Review'}
                  {activeFilter === 'pending_review' && 'Pending Review'}
                  {activeFilter === 'inspection' && 'Inspection Scheduled'}
                  {activeFilter === 'approved' && 'Approved Applications'}
                  {activeFilter === 'rejected' && 'Rejected Applications'}
                  {activeFilter === 'sent_back' && 'Sent Back for Corrections'}
                  {activeFilter === 'payment_pending' && 'Payment Pending'}
                </CardTitle>
                <CardDescription>
                  {activeFilter === 'all' && (user.role === 'property_owner' ? 'Your homestay applications' : 'Applications for review')}
                  {activeFilter === 'new_applications' && 'Drafts and recently submitted applications'}
                  {activeFilter === 'under_process' && 'Inspections and payments in progress'}
                  {activeFilter === 'completed' && 'Approved or rejected applications'}
                  {activeFilter === 'draft' && 'Continue editing incomplete applications'}
                  {activeFilter === 'pending' && 'Applications under review'}
                  {activeFilter === 'pending_review' && 'Requires officer action'}
                  {activeFilter === 'inspection' && 'Site inspections scheduled'}
                  {activeFilter === 'approved' && 'Registration completed'}
                  {activeFilter === 'rejected' && 'Not approved'}
                  {activeFilter === 'sent_back' && 'Needs corrections'}
                  {activeFilter === 'payment_pending' && 'Payment required to complete'}
                </CardDescription>
              </div>
              {activeFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeFilter === 'all' && 'No applications yet'}
                  {activeFilter === 'new_applications' && 'No drafts or submissions yet'}
                  {activeFilter === 'under_process' && 'No inspections or payments in progress'}
                  {activeFilter === 'completed' && 'No completed applications yet'}
                  {activeFilter !== 'all' && activeFilter !== 'new_applications' && activeFilter !== 'under_process' && activeFilter !== 'completed' && (
                    `No ${activeFilter.replace('_', ' ')} applications`
                  )}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilter === 'all' && user.role === 'property_owner'
                    ? 'Start your first homestay registration application'
                    : `No applications match this filter`}
                </p>
                {user.role === 'property_owner' && activeFilter === 'all' && (
                  <Button onClick={() => setShowReadinessDialog(true)} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Application
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((app) => {
                  const isHighlighted = paymentSuccess && paymentApplicationId === app.id;
                  const progressState = getOwnerProgressState(app);
                  const progressSummaryText =
                    app.status === 'approved' && app.certificateNumber
                      ? `Certificate ${app.certificateNumber} is ready for download.`
                      : progressState.summary;
                  return (
                    <div
                      key={app.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer transition-all ${isHighlighted ? "border-green-500 ring-2 ring-green-200" : ""
                        }`}
                      onClick={() => {
                        if (app.status === 'draft') {
                          setLocation(`/applications/new?draft=${app.id}`);
                        } else if (app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') {
                          setLocation(`/applications/new?application=${app.id}`);
                        } else {
                          setLocation(`/applications/${app.id}`);
                        }
                      }}
                      data-testid={`card-application-${app.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold">{app.propertyName}</h4>
                          {getStatusBadge(app.status || 'draft')}
                          <Badge variant="outline" className="capitalize">{app.category}</Badge>
                          {isHighlighted && (
                            <Badge variant="default" className="bg-green-600">
                              Certificate Ready
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>{app.applicationNumber}</span>
                          {app.applicationNumber && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(app.applicationNumber);
                              }}
                              aria-label={`Copy application ${app.applicationNumber}`}
                            >
                              <Copy
                                className={`h-4 w-4 ${copiedValue === app.applicationNumber ? "text-green-600" : ""
                                  }`}
                              />
                            </Button>
                          )}
                          <span>• {app.district || "District TBD"}</span>
                          <span>• {app.totalRooms} rooms</span>
                        </div>
                        {app.status === 'verified_for_payment' && (
                          <p className="text-xs text-green-600 mt-1">
                            Payment verified — certificate will unlock shortly.
                          </p>
                        )}
                        {(app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') && (app.clarificationRequested || (app as any).dtdoRemarks) && (
                          <p className="text-sm text-amber-600 mt-1">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            {app.clarificationRequested || (app as any).dtdoRemarks}
                          </p>
                        )}
                        {user.role === 'property_owner' && (
                          <div
                            className="mt-4 rounded-2xl border bg-white px-4 py-3 shadow-sm dark:bg-card"
                            data-testid={`progress-${app.id}`}
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Application Progress
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center gap-1">
                                {ownerProgressMilestones.map((milestone, idx) => {
                                  const isCompleted = idx <= progressState.stageIndex;
                                  const isConnectorComplete = idx < progressState.stageIndex;
                                  const isLast = idx === ownerProgressMilestones.length - 1;
                                  return (
                                    <Fragment key={milestone.id}>
                                      <div
                                        className={cn(
                                          "flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background text-[10px] font-semibold transition-colors",
                                          isCompleted
                                            ? "border-primary bg-primary text-white shadow-[0_0_0_4px_rgba(34,197,94,0.15)] dark:shadow-[0_0_0_4px_rgba(16,185,129,0.35)]"
                                            : "border-muted-foreground/30 text-muted-foreground",
                                        )}
                                      >
                                        {isCompleted && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                      </div>
                                      {!isLast && (
                                        <div
                                          className={cn(
                                            "h-[3px] flex-1 rounded-full transition-all",
                                            isConnectorComplete
                                              ? "bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-500"
                                              : "bg-muted-foreground/20",
                                          )}
                                        />
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </div>
                              <div
                                className="mt-3 grid gap-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                                style={{
                                  gridTemplateColumns: `repeat(${ownerProgressMilestones.length}, minmax(0, 1fr))`,
                                }}
                              >
                                {ownerProgressMilestones.map((milestone, idx) => (
                                  <span
                                    key={`${milestone.id}-label`}
                                    className={cn(
                                      "leading-tight",
                                      idx <= progressState.stageIndex ? "text-primary" : "text-muted-foreground",
                                    )}
                                  >
                                    {milestone.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">{progressSummaryText}</p>
                          </div>
                        )}
                      </div>
                      {app.status === 'draft' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/applications/new?draft=${app.id}`);
                          }}
                          data-testid={`button-resume-${app.id}`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Resume Editing
                        </Button>
                      ) : app.status === 'paid_pending_submit' ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/applications/${app.id}/payment-himkosh`);
                          }}
                          data-testid={`button-submit-${app.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Finalize Submission
                        </Button>
                      ) : (app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') ? (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/applications/new?application=${app.id}`);
                          }}
                          data-testid={`button-update-${app.id}`}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Continue Corrections
                        </Button>
                      ) : (app.status === 'payment_pending' || app.status === 'verified_for_payment') ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/applications/${app.id}/payment-himkosh`);
                          }}
                          data-testid={`button-payment-${app.id}`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Make Payment
                        </Button>
                      ) : (
                        <Button
                          variant={isHighlighted ? "default" : "ghost"}
                          size="sm"
                          data-testid={`button-view-${app.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/applications/${app.id}`);
                          }}
                        >
                          {isHighlighted ? (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download Certificate
                            </>
                          ) : (
                            "View Details"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Readiness Check Dialog */}
      <Dialog open={showReadinessDialog} onOpenChange={setShowReadinessDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="w-6 h-6 text-emerald-600" />
              Before You Begin
            </DialogTitle>
            <DialogDescription>
              Please ensure you have all required documents ready before starting your homestay registration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo Requirements */}
            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <div className="flex items-start gap-3">
                <Camera className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">Property Photographs</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    Upload <span className="font-bold">minimum 2</span> and up to <span className="font-bold">10 best photographs</span> of your property.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                    Include: External views, rooms, common areas, bathrooms, surroundings
                  </p>
                </div>
              </div>
            </div>

            {/* Required Documents by Category */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-slate-600" />
                Required Documents (All Categories)
              </h3>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-sm">Revenue Papers / Property Documents</p>
                    <p className="text-xs text-muted-foreground">Proof of ownership</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-sm">Affidavit (Section 29)</p>
                    <p className="text-xs text-muted-foreground">Self-declaration affidavit as per rules</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-sm">Undertaking (Form-C)</p>
                    <p className="text-xs text-muted-foreground">Declaration of compliance with regulations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category-specific */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-600" />
                Additional for Gold & Diamond Category
              </h3>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                  <CreditCard className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-sm">Commercial Electricity Bill</p>
                    <p className="text-xs text-muted-foreground">Recent utility bill under commercial connection</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                  <CreditCard className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-sm">Commercial Water Bill</p>
                    <p className="text-xs text-muted-foreground">Recent water utility bill</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Information */}
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200">Property Details Needed</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 mt-2 space-y-1">
                    <li>• Exact property address with PIN code</li>
                    <li>• Number of rooms and their rates</li>
                    <li>• Owner Aadhaar number (for verification)</li>
                    <li>• GPS location coordinates (if available)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReadinessDialog(false)}
              className="w-full sm:w-auto"
            >
              I'll Come Back Later
            </Button>
            <Button
              onClick={() => {
                setShowReadinessDialog(false);
                setLocation("/applications/new");
              }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Yes, I Have All Documents Ready
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
