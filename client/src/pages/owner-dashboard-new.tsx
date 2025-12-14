import { useEffect, useMemo, useState } from "react";
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
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Plus,
    ChevronRight,
    Home,
    Camera,
    FileCheck,
    ScrollText,
    MapPin,
    CreditCard,
    Building2,
    ClipboardCheck,
} from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { isCorrectionRequiredStatus } from "@/constants/workflow";

// Progress milestones for New Registration (full pipeline)
const newRegistrationMilestones = [
    { id: "da_review", label: "With Dealing Assistant", short: "DA Review" },
    { id: "forwarded_dtdo", label: "Forwarded to DTDO", short: "DTDO" },
    { id: "inspection_scheduled", label: "Inspection Scheduled", short: "Inspection" },
    { id: "inspection_completed", label: "Inspection Completed", short: "Completed" },
    { id: "payment_pending", label: "Payment Pending", short: "Payment" },
    { id: "certificate", label: "Registration Approved", short: "Approved" },
] as const;

// Progress milestones for Existing RC Onboarding (shortened pipeline - no payment, optional DTDO)
const existingRcMilestones = [
    { id: "da_review", label: "With Dealing Assistant", short: "DA Review" },
    { id: "forwarded_dtdo", label: "Forwarded to DTDO", short: "DTDO" }, // Optional based on admin config
    { id: "certificate", label: "RC Verified", short: "Verified" },
] as const;

const statusToNewRegMilestoneIndex: Record<string, number> = {
    draft: 0,
    submitted: 0,
    under_scrutiny: 0,
    district_review: 0,
    sent_back_for_corrections: 0,
    reverted_to_applicant: 0,
    forwarded_to_dtdo: 1,
    state_review: 1,
    dtdo_review: 1,
    reverted_by_dtdo: 1,
    inspection_scheduled: 2,
    inspection_under_review: 3,
    inspection_completed: 3,
    payment_pending: 4,
    verified_for_payment: 4,
    approved: 5,
    rejected: 5,
};

const statusToExistingRcMilestoneIndex: Record<string, number> = {
    draft: 0,
    submitted: 0,
    under_scrutiny: 0,
    district_review: 0,
    sent_back_for_corrections: 0,
    reverted_to_applicant: 0,
    forwarded_to_dtdo: 1,
    state_review: 1,
    dtdo_review: 1,
    approved: 2,
    rejected: 2,
};

const getApplicationProgress = (app: HomestayApplication) => {
    const isExistingRc = app.applicationKind === "existing_rc_onboarding";
    const milestones = isExistingRc ? existingRcMilestones : newRegistrationMilestones;
    const statusMap = isExistingRc ? statusToExistingRcMilestoneIndex : statusToNewRegMilestoneIndex;

    let stageIndex = app.status ? statusMap[app.status] ?? 0 : 0;

    // Adjust based on actual progress
    if (!isExistingRc) {
        if (app.siteInspectionCompletedDate) {
            stageIndex = Math.max(stageIndex, 3);
        } else if (app.siteInspectionScheduledDate) {
            stageIndex = Math.max(stageIndex, 2);
        }
        if (app.status === "payment_pending" || app.status === "verified_for_payment") {
            stageIndex = Math.max(stageIndex, 4);
        }
    }

    if (app.approvedAt || app.status === "approved") {
        stageIndex = milestones.length - 1;
    }

    const boundedIndex = Math.min(Math.max(stageIndex, 0), milestones.length - 1);

    return {
        stageIndex: boundedIndex,
        currentMilestone: milestones[boundedIndex],
        milestones,
    };
};

const getProgressSummary = (app: HomestayApplication) => {
    const status = app.status;

    const summaryMap: Record<string, string> = {
        draft: "Complete the draft to submit your application.",
        submitted: "Your application is with the Dealing Assistant for review.",
        under_scrutiny: "Your application is being reviewed by the Dealing Assistant.",
        district_review: "Your application is with the Dealing Assistant for review.",
        forwarded_to_dtdo: "Your application has been forwarded to DTDO for final decision.",
        state_review: "Your application is with the DTDO for decision.",
        dtdo_review: "Your application is under DTDO review.",
        sent_back_for_corrections: "Action required: update the application with the requested corrections.",
        reverted_to_applicant: "Action required: update the application with the requested corrections.",
        reverted_by_dtdo: "DTDO requested revisions — please review the remarks.",
        inspection_scheduled: "The inspection has been scheduled. Keep an eye on notifications.",
        inspection_under_review: "Inspection report is under review.",
        inspection_completed: "Inspection finished. Awaiting final payment instructions.",
        payment_pending: "Complete the payment to receive your registration certificate.",
        verified_for_payment: "Payment verified — certificate will unlock shortly.",
        approved: app.certificateNumber
            ? `Certificate ${app.certificateNumber} is ready for download.`
            : "Certificate is ready for download.",
        rejected: "Application closed. Contact support for clarifications.",
    };

    return status ? summaryMap[status] || "We'll keep this tracker updated and notify you when action is needed." : "";
};

export default function OwnerDashboardNew() {
    const [location, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [showReadinessDialog, setShowReadinessDialog] = useState(false);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    };

    const { data: userData, isLoading: userLoading } = useQuery<{ user: User }>({
        queryKey: ["/api/auth/me"],
        retry: false,
    });

    const { data: applicationsData, isLoading: appsLoading } = useQuery<{ applications: HomestayApplication[] }>({
        queryKey: ["/api/applications"],
        enabled: !!userData?.user,
    });

    // Check for existing owner draft
    const { data: existingOwnerDraftData } = useQuery<{
        draft: {
            id: string;
            values: { propertyName?: string };
            savedAt: string;
        } | null;
    }>({
        queryKey: ["/api/existing-owners/draft"],
        enabled: !!userData?.user,
        staleTime: 30 * 1000,
    });
    const hasExistingOwnerDraft = !!existingOwnerDraftData?.draft;

    if (userLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Skeleton className="h-12 w-48" />
            </div>
        );
    }

    if (!userData?.user) {
        setTimeout(() => setLocation("/login"), 0);
        return (
            <div className="flex items-center justify-center p-8">
                <p>Redirecting to login...</p>
            </div>
        );
    }

    const user = userData.user;
    const applications = applicationsData?.applications || [];

    // Primary application (first one, either draft or submitted)
    const primaryApplication = applications[0] || null;

    // Determine if user has an active draft or submitted application
    const hasActiveApplication = primaryApplication && (
        primaryApplication.status === "draft" ||
        primaryApplication.status !== "approved" &&
        primaryApplication.status !== "rejected"
    );

    const isResubmitted = (app: HomestayApplication) =>
        isCorrectionRequiredStatus(app.status) &&
        Boolean((app as any).latestCorrection?.createdAt || (app as any).correctionSubmissionCount);

    // Stats
    const draftCount = applications.filter(a => a.status === "draft").length;
    const submittedCount = applications.filter(a =>
        a.status !== "draft" &&
        a.status !== "approved" &&
        a.status !== "rejected" &&
        !isResubmitted(a)
    ).length;
    const underProcessCount = applications.filter(a =>
        a.status === "inspection_scheduled" ||
        a.status === "inspection_completed" ||
        a.status === "inspection_under_review" ||
        a.status === "payment_pending" ||
        a.status === "verified_for_payment"
    ).length;
    const correctionCount = applications.filter(a =>
        a.status === "sent_back_for_corrections" ||
        a.status === "reverted_to_applicant" ||
        a.status === "reverted_by_dtdo" ||
        isResubmitted(a)
    ).length;
    const completedCount = applications.filter(a => a.status === "approved" || a.status === "rejected").length;
    const approvedCount = applications.filter(a => a.status === "approved").length;
    const rejectedCount = applications.filter(a => a.status === "rejected").length;

    const newApplicationCount = draftCount + submittedCount;
    const sentBackCount = applications.filter(a =>
        a.status === "sent_back_for_corrections" ||
        a.status === "reverted_to_applicant" ||
        a.status === "reverted_by_dtdo" ||
        isResubmitted(a)
    ).filter(a => !(a as any).latestCorrection?.createdAt).length;

    const isExistingRcApp = primaryApplication?.applicationKind === "existing_rc_onboarding";

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        <Home className="inline w-7 h-7 mr-2 mb-1" />
                        Welcome, {user.fullName?.split(" ")[0] || "Owner"}!
                    </h1>
                    <p className="text-muted-foreground">Manage your homestay applications</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/dashboard")}
                        data-testid="button-switch-to-old-dashboard"
                        className="text-xs"
                    >
                        Switch to Classic View
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        data-testid="button-dashboard-refresh"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        variant={hasExistingOwnerDraft ? "default" : "outline"}
                        onClick={() => setLocation("/existing-owner")}
                        data-testid="button-existing-rc-registration"
                        disabled={hasActiveApplication && isExistingRcApp}
                        className={hasExistingOwnerDraft ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                        {hasExistingOwnerDraft ? (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Resume RC Draft
                            </>
                        ) : (
                            "Existing RC Registration"
                        )}
                    </Button>
                    <Button
                        onClick={() => {
                            if (primaryApplication) {
                                if (primaryApplication.status === "draft") {
                                    setLocation(`/applications/new?draft=${primaryApplication.id}`);
                                } else {
                                    setLocation(`/applications/${primaryApplication.id}`);
                                }
                                return;
                            }
                            // Show document readiness dialog for new applications
                            setShowReadinessDialog(true);
                        }}
                        data-testid="button-new-application"
                        disabled={hasActiveApplication && !isExistingRcApp}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Application
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
                {/* New Applications */}
                <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-emerald-700 dark:text-emerald-400">
                                NEW APPLICATIONS
                            </CardDescription>
                            <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <CardTitle className="text-4xl">{newApplicationCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Drafts and newly submitted files.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Drafts: {draftCount}</span>
                            <span>•</span>
                            <span>Submitted: {submittedCount}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Under Process */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription>UNDER PROCESS</CardDescription>
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-4xl">{underProcessCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Inspections and payments in progress.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Inspection scheduled: {applications.filter(a => a.status === "inspection_scheduled").length}</span>
                            <span>•</span>
                            <span>Payment pending: {applications.filter(a => a.status === "payment_pending").length}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending / Corrections */}
                <Card className={cn(
                    correctionCount > 0 ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : ""
                )}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription className={correctionCount > 0 ? "text-amber-700" : ""}>
                                PENDING / CORRECTIONS
                            </CardDescription>
                            {correctionCount > 0 ? (
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                        <CardTitle className={cn("text-4xl", correctionCount > 0 ? "text-amber-600" : "")}>
                            {correctionCount}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Applications requiring updates.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Sent back: {sentBackCount}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Completed */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardDescription>COMPLETED</CardDescription>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <CardTitle className="text-4xl">{completedCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Decisions finalized.
                        </p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Approved: {approvedCount}</span>
                            <span>•</span>
                            <span>Rejected: {rejectedCount}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Current Application Status */}
            {primaryApplication ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    Status: {isExistingRcApp ? "Existing RC Onboarding" : "New Application"}
                                </CardTitle>
                                <CardDescription>Track your latest homestay application.</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (primaryApplication.status === "draft") {
                                        setLocation(`/applications/new?draft=${primaryApplication.id}`);
                                    } else if (
                                        primaryApplication.status === "sent_back_for_corrections" ||
                                        primaryApplication.status === "reverted_to_applicant" ||
                                        primaryApplication.status === "reverted_by_dtdo"
                                    ) {
                                        setLocation(`/applications/new?application=${primaryApplication.id}`);
                                    } else {
                                        setLocation(`/applications/${primaryApplication.id}`);
                                    }
                                }}
                            >
                                {primaryApplication.status === "draft" ? (
                                    <>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Resume Editing
                                    </>
                                ) : (
                                    <>
                                        View Details
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Application Info */}
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold">{primaryApplication.propertyName}</h3>
                                <Badge variant={primaryApplication.status === "draft" ? "outline" : "secondary"}>
                                    {primaryApplication.status === "draft" ? "Draft" : primaryApplication.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                    {primaryApplication.category}
                                </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                <p>
                                    <strong>Application Type:</strong> {isExistingRcApp ? "Existing RC Onboarding" : "New Registration"}
                                </p>
                                {!isExistingRcApp && (
                                    <p>
                                        <strong>Location:</strong> {primaryApplication.district} • {primaryApplication.totalRooms} rooms
                                    </p>
                                )}
                                {primaryApplication.submittedAt && (
                                    <p>
                                        <strong>Submitted:</strong> {new Date(primaryApplication.submittedAt).toLocaleDateString()}
                                    </p>
                                )}
                                {primaryApplication.status === "draft" && (
                                    <p className="text-muted-foreground mt-1">
                                        Started: {new Date(primaryApplication.createdAt).toLocaleDateString()} •
                                        Last edited: {new Date(primaryApplication.updatedAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            {/* Progress Timeline */}
                            <div className="mt-6 rounded-2xl border bg-white px-4 py-3 shadow-sm dark:bg-card">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    APPLICATION PROGRESS
                                </div>
                                <ApplicationProgressTimeline application={primaryApplication} />
                                <p className="mt-4 text-sm text-muted-foreground">
                                    {getProgressSummary(primaryApplication)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Get started by creating your first homestay application.
                            </p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => setShowReadinessDialog(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Application
                                </Button>
                                <Button variant="outline" onClick={() => setLocation("/existing-owner")}>
                                    Existing RC Holder
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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

function ApplicationProgressTimeline({ application }: { application: HomestayApplication }) {
    const progress = getApplicationProgress(application);
    const milestones = progress.milestones;

    return (
        <div>
            <div className="flex items-center gap-1">
                {milestones.map((milestone, idx) => {
                    const isCompleted = idx <= progress.stageIndex;
                    const isConnectorComplete = idx < progress.stageIndex;
                    const isLast = idx === milestones.length - 1;

                    return (
                        <div key={milestone.id} className="flex items-center flex-1">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                                    isCompleted
                                        ? "border-primary bg-primary text-white shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
                                        : "border-muted-foreground/30 bg-background text-muted-foreground"
                                )}
                            >
                                {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            {!isLast && (
                                <div
                                    className={cn(
                                        "h-[3px] flex-1 rounded-full transition-all mx-1",
                                        isConnectorComplete
                                            ? "bg-gradient-to-r from-emerald-300 to-emerald-500"
                                            : "bg-muted-foreground/20"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            <div
                className="mt-3 grid gap-2 text-center text-[10px] font-semibold uppercase tracking-wide"
                style={{
                    gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))`,
                }}
            >
                {milestones.map((milestone, idx) => (
                    <span
                        key={`${milestone.id}-label`}
                        className={cn(
                            "leading-tight",
                            idx <= progress.stageIndex ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        {milestone.short}
                    </span>
                ))}
            </div>
        </div>
    );
}
