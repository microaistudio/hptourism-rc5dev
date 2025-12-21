import { useCallback, useEffect, useMemo, useState } from "react";
import { isThisMonth, differenceInCalendarDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  BellRing,
  Calendar,
  MapPin,
  User,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import type { ApplicationKind } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isCorrectionRequiredStatus } from "@/constants/workflow";
import { cn } from "@/lib/utils";
import { ApplicationPipelineRow, type PipelineApplication } from "@/components/application/application-pipeline-row";
import { Badge } from "@/components/ui/badge";

const isInCurrentMonth = (value?: string | Date | null) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return isThisMonth(date);
};
type ApplicationWithOwner = PipelineApplication;

type InspectionOrder = {
  id: string;
  applicationId: string;
  inspectionDate?: string | null;
  inspectionAddress?: string | null;
  specialInstructions?: string | null;
  status: string;
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    category: string;
    status: string;
    dtdoRemarks?: string | null;
  } | null;
  owner: {
    fullName: string;
    mobile: string;
  } | null;
  reportSubmitted: boolean;
  updatedAt?: string | null;
};

type SortOrder = "newest" | "oldest";

export default function DADashboard() {
  const [activeStage, setActiveStage] = useState("new-queue");
  const [activePill, setActivePill] = useState("new-queue-new");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [completedRange, setCompletedRange] = useState<"month" | "30d">("month");
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/da/inspections"] });
  };
  const navigateToInspections = useCallback(() => {
    setLocation("/da/inspections");
  }, [setLocation]);

  const { data: applications, isLoading } = useQuery<ApplicationWithOwner[]>({
    queryKey: ["/api/da/applications"],
  });

  const allApplications = applications ?? [];
  const correctionStatuses = new Set([
    "sent_back_for_corrections",
    "reverted_to_applicant",
    "reverted_by_dtdo",
    "objection_raised",
  ]);
  const isResubmitted = (app: ApplicationWithOwner) =>
    isCorrectionRequiredStatus(app.status) &&
    Boolean(app.latestCorrection?.createdAt || (app.correctionSubmissionCount ?? 0) > 0);
  const needsCorrectionHandling = (app: ApplicationWithOwner) =>
    correctionStatuses.has(app.status) || isResubmitted(app);

  const getSortTimestamp = useCallback((app: ApplicationWithOwner) => {
    const candidate = app.updatedAt ?? app.submittedAt ?? app.createdAt;
    return candidate ? new Date(candidate).getTime() : 0;
  }, []);

  const sortApplications = useCallback(
    (apps: ApplicationWithOwner[]) =>
      [...apps].sort((a, b) => {
        const diff = getSortTimestamp(a) - getSortTimestamp(b);
        return sortOrder === "newest" ? -diff : diff;
      }),
    [getSortTimestamp, sortOrder],
  );

  const { data: user } = useQuery<{ user: { id: string; fullName: string; role: string; district?: string } }>({
    queryKey: ["/api/auth/me"],
  });
  const { data: inspections } = useQuery<InspectionOrder[]>({
    queryKey: ["/api/da/inspections"],
  });

  // Group applications by status
  const submittedApplications = useMemo(
    () => allApplications.filter((app) => app.status === "submitted"),
    [allApplications],
  );
  const underScrutiny = useMemo(
    () => allApplications.filter((app) => app.status === "under_scrutiny" && !needsCorrectionHandling(app)),
    [allApplications],
  );
  const forwarded = useMemo(
    () => allApplications.filter((app) => app.status === "forwarded_to_dtdo"),
    [allApplications],
  );
  const reverted = useMemo(
    () => allApplications.filter((app) => needsCorrectionHandling(app)),
    [allApplications],
  );
  const awaitingOwner = useMemo(
    () => reverted.filter((app) => !isResubmitted(app)),
    [reverted],
  );
  const ownerResubmitted = useMemo(
    () => reverted.filter((app) => isResubmitted(app)),
    [reverted],
  );
  const sortedUnderScrutiny = useMemo(
    () => sortApplications(underScrutiny),
    [underScrutiny, sortApplications],
  );
  const sortedForwarded = useMemo(() => sortApplications(forwarded), [forwarded, sortApplications]);
  const sortedAwaitingOwners = useMemo(() => sortApplications(awaitingOwner), [awaitingOwner, sortApplications]);
  const sortedResubmitted = useMemo(
    () => sortApplications(ownerResubmitted),
    [ownerResubmitted, sortApplications],
  );
  const scheduledInspections = useMemo(
    () => {
      const seen = new Set<string>();
      return (inspections ?? []).filter((order) => {
        const key = order.applicationId || order.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return !order.reportSubmitted;
      });
    },
    [inspections],
  );
  const completedInspections = useMemo(
    () => {
      const finalStatuses = new Set([
        "approved",
        "rejected",
        "payment_pending",
        "verified_for_payment",
      ]);
      const seen = new Set<string>();
      return (inspections ?? []).filter((order) => {
        const key = order.applicationId || order.id;
        if (seen.has(key)) return false;
        seen.add(key);
        const appStatus = order.application?.status;
        const isFinal = appStatus ? finalStatuses.has(appStatus) : false;
        return order.reportSubmitted && !isFinal;
      });
    },
    [inspections],
  );
  const completedInspectionsThisMonth = useMemo(
    () =>
      completedInspections.filter((order) =>
        isInCurrentMonth(order.updatedAt || order.inspectionDate || null),
      ),
    [completedInspections],
  );
  const isModificationKind = useCallback((app: ApplicationWithOwner) => {
    const kind = (app.applicationKind || (app as any).application_kind) as string | undefined;
    const value = kind?.toLowerCase() || "";
    return value === "cancel_certificate" || value.includes("modification");
  }, []);

  const isAmendmentKind = useCallback((app: ApplicationWithOwner) => {
    const kind = (app.applicationKind || (app as any).application_kind) as string | undefined;
    const value = kind?.toLowerCase() || "";
    // Explicit checks for known kinds
    if (value === "add_rooms" || value === "delete_rooms" || value === "change_category") return true;
    // Fallback for variations
    return value.includes("amend") || value.includes("add_room") || value.includes("delete_room");
  }, []);

  const submittedNew = useMemo(
    () =>
      sortApplications(
        submittedApplications.filter(
          (app) =>
            !isModificationKind(app) &&
            !isAmendmentKind(app),
        ),
      ),
    [submittedApplications, sortApplications, isModificationKind, isAmendmentKind],
  );
  const submittedAmendments = useMemo(
    () =>
      sortApplications(
        submittedApplications.filter((app) => isAmendmentKind(app)),
      ),
    [submittedApplications, sortApplications, isAmendmentKind],
  );
  const submittedModifications = useMemo(
    () =>
      sortApplications(
        submittedApplications.filter((app) => isModificationKind(app)),
      ),
    [submittedApplications, sortApplications, isModificationKind],
  );

  const renderInspectionList = useCallback(
    (list: InspectionOrder[], variant: "scheduled" | "completed") => {
      if (!list.length) {
        return (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">
              {variant === "scheduled" ? "All inspections cleared" : "No reports in this window"}
            </p>
            <p className="text-sm mt-1">
              {variant === "scheduled"
                ? "You don't have any pending field visits."
                : "Completed inspections will appear here."}
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {list.map((inspection) => (
            <Card
              key={inspection.id}
              className="cursor-pointer transition-all hover-elevate active-elevate-2"
              onClick={() => setLocation(`/da/inspections/${inspection.id}`)}
              data-testid={`card-inspection-${inspection.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {inspection.application?.propertyName || "Property Name Unavailable"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {inspection.application?.applicationNumber || "N/A"}
                          </span>
                          {inspection.application?.category &&
                            (
                              <Badge
                                variant="outline"
                                className={
                                  {
                                    diamond: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
                                    gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20",
                                    silver: "bg-gray-50 text-gray-700 dark:bg-gray-950/20",
                                  }[inspection.application.category.toLowerCase()] || ""
                                }
                              >
                                {inspection.application.category.toUpperCase()}
                              </Badge>
                            )}
                          <Badge
                            variant="outline"
                            className={
                              inspection.reportSubmitted
                                ? "bg-green-50 text-green-700 dark:bg-green-950/20"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                            }
                          >
                            {inspection.reportSubmitted ? "Report Submitted" : "Scheduled"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Scheduled:</span>
                        <span>
                          {inspection.inspectionDate
                            ? new Date(inspection.inspectionDate).toLocaleDateString()
                            : "Not set"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Owner:</span>
                        <span>{inspection.owner?.fullName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Address:</span>
                        <span className="truncate">
                          {inspection.inspectionAddress || inspection.application?.propertyName || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Status:</span>
                        <span>{inspection.status || (inspection.reportSubmitted ? "Completed" : "Pending")}</span>
                      </div>
                    </div>

                    {inspection.application?.dtdoRemarks && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">DTDO Instructions:</span>{" "}
                        {inspection.application.dtdoRemarks}
                      </p>
                    )}
                    {inspection.specialInstructions && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Owner Message:</span>{" "}
                        {inspection.specialInstructions}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/da/inspections/${inspection.id}`);
                      }}
                    >
                      {inspection.reportSubmitted ? "View Report" : "Open inspection"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    },
    [setLocation],
  );

  const completedRangeFilter = useCallback(
    (date?: string | Date | null) => {
      if (!date) return false;
      const dt = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(dt.getTime())) return false;
      if (completedRange === "month") return isThisMonth(dt);
      return differenceInCalendarDays(new Date(), dt) <= 30;
    },
    [completedRange],
  );
  const approvedCompleted = useMemo(
    () =>
      sortApplications(
        allApplications.filter(
          (app) => app.status === "approved" &&
            !app.applicationNumber?.startsWith('LG-HS-') &&  // Exclude Legacy RC
            completedRangeFilter(app.approvedAt ?? app.updatedAt),
        ),
      ),
    [allApplications, sortApplications, completedRangeFilter],
  );
  const legacyRCVerified = useMemo(
    () =>
      sortApplications(
        allApplications.filter(
          (app) => app.status === "approved" &&
            app.applicationNumber?.startsWith('LG-HS-') &&
            completedRangeFilter(app.approvedAt ?? app.updatedAt),
        ),
      ),
    [allApplications, sortApplications, completedRangeFilter],
  );
  const rejectedCompleted = useMemo(
    () =>
      sortApplications(
        allApplications.filter((app) => app.status === "rejected" && completedRangeFilter(app.updatedAt)),
      ),
    [allApplications, sortApplications, completedRangeFilter],
  );
  const stageSummaries = useMemo(
    () => ({
      new: `New ${submittedNew.length} · Amend ${submittedAmendments.length} · Mods ${submittedModifications.length}`,
      process: `Screening ${sortedUnderScrutiny.length} · Forwarded ${sortedForwarded.length}`,
      corrections: `Sent back ${sortedAwaitingOwners.length} · Resubmitted ${sortedResubmitted.length}`,
      inspections: `Scheduled ${scheduledInspections.length} · Reports ${completedInspectionsThisMonth.length}`,
      completed: `Approved ${approvedCompleted.length} · RC Verified ${legacyRCVerified.length} · Rejected ${rejectedCompleted.length}`,
    }),
    [
      submittedNew.length,
      submittedAmendments.length,
      submittedModifications.length,
      sortedUnderScrutiny.length,
      sortedForwarded.length,
      sortedAwaitingOwners.length,
      sortedResubmitted.length,
      scheduledInspections.length,
      completedInspectionsThisMonth.length,
      approvedCompleted.length,
      rejectedCompleted.length,
      completedRange,
      renderInspectionList,
    ],
  );
  const stageConfigs = useMemo<StageConfig[]>(
    () => [
      {
        key: "new-queue",
        title: "New Applications",
        description: "Fresh submissions waiting for you to start scrutiny.",
        icon: FileText,
        summary: stageSummaries.new,
        pills: [
          {
            value: "new-queue-new",
            label: "New Application",
            count: submittedNew.length,
            description: "Brand-new properties seeking recognition.",
            applications: submittedNew,
            actionLabel: "Start scrutiny",
            emptyTitle: "No new registrations",
            emptyDescription: "Every new application has been triaged.",
          },
          {
            value: "new-queue-amend",
            label: "Amendments",
            count: submittedAmendments.length,
            description: "Add/remove room requests waiting to be reviewed.",
            applications: submittedAmendments,
            actionLabel: "Start scrutiny",
            emptyTitle: "No amendments",
            emptyDescription: "No amendment requests pending.",
          },
          {
            value: "new-queue-mod",
            label: "Cancellation",
            count: submittedModifications.length,
            description: "Cancellation requests to validate.",
            applications: submittedModifications,
            actionLabel: "Start scrutiny",
            emptyTitle: "No cancellations",
            emptyDescription: "No cancellation requests pending.",
          },
        ],
      },
      {
        key: "process",
        title: "Under Process",
        description: "Files currently in your scrutiny flow.",
        icon: Search,
        summary: stageSummaries.process,
        pills: [
          {
            value: "process-screening",
            label: "Screening",
            count: sortedUnderScrutiny.length,
            description: "Applications you're actively reviewing.",
            applications: sortedUnderScrutiny,
            actionLabel: "Resume review",
            emptyTitle: "No files in scrutiny",
            emptyDescription: "Pick any pending application to keep the queue moving.",
          },
          {
            value: "process-forwarded",
            label: "Forwarded to DTDO",
            count: sortedForwarded.length,
            description: "Cases awaiting DTDO action.",
            applications: sortedForwarded,
            actionLabel: "View summary",
            emptyTitle: "Nothing forwarded yet",
            emptyDescription: "Forward files once all DA checks are complete.",
          },
        ],
      },
      {
        key: "corrections",
        title: "Pending / Corrections",
        description: "Owner clarifications and resubmissions that need follow-up.",
        icon: AlertCircle,
        summary: stageSummaries.corrections,
        pills: [
          {
            value: "corrections-waiting",
            label: "Sent back to applicant",
            count: sortedAwaitingOwners.length,
            description: "Corrections requested and awaiting owner response.",
            applications: sortedAwaitingOwners,
            actionLabel: "Review notes",
            emptyTitle: "No pending owners",
            emptyDescription: "All requested corrections have been acknowledged.",
          },
          {
            value: "corrections-resubmitted",
            label: "Resubmitted",
            count: sortedResubmitted.length,
            description: "Owners have shared updates and await your confirmation.",
            applications: sortedResubmitted,
            actionLabel: "Review update",
            emptyTitle: "No new resubmissions",
            emptyDescription: "You'll be notified when an owner sends corrections.",
          },
        ],
      },
      {
        key: "inspections",
        title: "Inspections",
        description: "Status of field inspections assigned to you.",
        icon: BellRing,
        summary: stageSummaries.inspections,
        pills: [
          {
            value: "inspections-scheduled",
            label: "Scheduled",
            count: scheduledInspections.length,
            description: "Visits assigned but awaiting field report uploads.",
            applications: [],
            emptyTitle: "All inspections cleared",
            emptyDescription: "You don't have any pending field visits.",
            render: () => renderInspectionList(scheduledInspections, "scheduled"),
          },
          {
            value: "inspections-completed",
            label: "Report submitted",
            count: completedInspectionsThisMonth.length,
            description: "Field reports submitted.",
            applications: [],
            emptyTitle: "No recent inspections",
            emptyDescription: "Completed inspections will appear here.",
            render: () => renderInspectionList(completedInspectionsThisMonth, "completed"),
          },
        ],
      },
      {
        key: "completed",
        title: "Completed",
        description:
          completedRange === "month" ? "Decisions recorded this month." : "Decisions in the last 30 days.",
        icon: CheckCircle,
        summary: stageSummaries.completed,
        pills: [
          {
            value: "completed-approved",
            label: "Approved",
            count: approvedCompleted.length,
            description: "Applications that cleared all checks.",
            applications: approvedCompleted,
            emptyTitle: "No approvals yet",
            emptyDescription: "Complete scrutiny + inspection to unlock approvals.",
          },
          {
            value: "completed-legacy-rc",
            label: "Existing RC Verified",
            count: legacyRCVerified.length,
            description: "Existing RC registrations verified and onboarded.",
            applications: legacyRCVerified,
            emptyTitle: "No RC verifications yet",
            emptyDescription: "Verified Existing RC registrations will appear here.",
          },
          {
            value: "completed-rejected",
            label: "Rejected",
            count: rejectedCompleted.length,
            description: "Applications declined in this window.",
            applications: rejectedCompleted,
            actionLabel: "Review decision",
            emptyTitle: "No rejections",
            emptyDescription: "Declined files in this window will appear here.",
          },
        ],
      },
    ],
    [
      submittedNew,
      submittedAmendments,
      submittedModifications,
      sortedUnderScrutiny,
      sortedForwarded,
      sortedAwaitingOwners,
      sortedResubmitted,
      scheduledInspections,
      completedInspectionsThisMonth,
      navigateToInspections,
      approvedCompleted,
      legacyRCVerified,
      rejectedCompleted,
      completedRange,
      stageSummaries,
    ],
  );

  const actionablePills = useMemo(
    () =>
      new Set([
        "new-queue-new",
        "new-queue-amend",
        "new-queue-mod",
        "process-screening",
        "inspections-scheduled",
      ]),
    [],
  );

  useEffect(() => {
    if (!stageConfigs.length) return;
    const resolvedStage = stageConfigs.find((stage) => stage.key === activeStage) ?? stageConfigs[0];
    if (resolvedStage.key !== activeStage) {
      setActiveStage(resolvedStage.key);
      setActivePill(resolvedStage.pills[0]?.value ?? "");
      return;
    }
    if (!resolvedStage.pills.length) return;
    const resolvedPill =
      resolvedStage.pills.find((pill) => pill.value === activePill) ?? resolvedStage.pills[0];
    if (resolvedPill.value !== activePill) {
      setActivePill(resolvedPill.value);
    }
  }, [stageConfigs, activeStage, activePill]);

  // If the current stage has no items but another stage does, auto-switch to the first non-empty stage
  useEffect(() => {
    const stageTotals: Record<StageKey, number> = {
      "new-queue": submittedNew.length + submittedAmendments.length + submittedModifications.length,
      process: sortedUnderScrutiny.length + sortedForwarded.length,
      corrections: sortedAwaitingOwners.length + sortedResubmitted.length,
      inspections: scheduledInspections.length + completedInspectionsThisMonth.length,
      completed: approvedCompleted.length + legacyRCVerified.length + rejectedCompleted.length,
    };
    const currentTotal = stageTotals[activeStage] ?? 0;
    if (currentTotal > 0) return;

    const preference: StageKey[] = ["corrections", "inspections", "process", "new-queue", "completed"];
    const nextStage = preference.find((key) => (stageTotals[key] ?? 0) > 0);
    if (!nextStage) return;

    setActiveStage(nextStage);
    const pill =
      stageConfigs.find((s) => s.key === nextStage)?.pills.find((p) => p.count > 0) ??
      stageConfigs.find((s) => s.key === nextStage)?.pills[0];
    if (pill) setActivePill(pill.value);
  }, [
    activeStage,
    stageConfigs,
    submittedNew.length,
    submittedAmendments.length,
    submittedModifications.length,
    sortedUnderScrutiny.length,
    sortedForwarded.length,
    sortedAwaitingOwners.length,
    sortedResubmitted.length,
    scheduledInspections.length,
    completedInspectionsThisMonth.length,
    approvedCompleted.length,
    legacyRCVerified.length,
    rejectedCompleted.length,
  ]);
  const activeStageConfig =
    stageConfigs.find((stage) => stage.key === activeStage) ?? stageConfigs[0];
  const activePillConfig =
    activeStageConfig?.pills.find((pill) => pill.value === activePill) ??
    activeStageConfig?.pills[0];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dealing Assistant Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.user?.district || "District"} – Scrutiny + inspection workflow
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={handleRefresh}
            data-testid="button-da-refresh"
            className="w-full sm:w-fit"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/da/incomplete-applications")}
            className="w-full sm:w-fit"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Incomplete Applications
          </Button>
        </div>
      </div>

      {/* Stage Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
        {stageConfigs.map((stage) => {
          const Icon = stage.icon;
          const totalCount = stage.totalCount ?? stage.pills.reduce((sum, pill) => sum + pill.count, 0);
          const isActiveStage = stage.key === activeStageConfig?.key;
          const hasActionable = stage.pills.some((pill) => actionablePills.has(pill.value));
          return (
            <Card
              key={stage.key}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (stage.key !== activeStage) {
                  setActiveStage(stage.key);
                  setActivePill(stage.pills[0]?.value ?? "");
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (stage.key !== activeStage) {
                    setActiveStage(stage.key);
                    setActivePill(stage.pills[0]?.value ?? "");
                  }
                }
              }}
              className={cn(
                "p-4 sm:p-5 flex flex-col gap-2 cursor-pointer transition-all border border-border hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl",
                isActiveStage ? "ring-2 ring-primary" : "",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stage.title}</p>
                  <p className="text-3xl font-semibold mt-1">{totalCount}</p>
                </div>
                <div className="p-2 rounded-full bg-muted/40">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{stage.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                {stage.pills.map((pill) => {
                  const isActionable = actionablePills.has(pill.value) && pill.count > 0;
                  const content = (
                    <>
                      <span>{pill.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{pill.count}</span>
                    </>
                  );
                  if (isActionable) {
                    return (
                      <button
                        key={pill.value}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveStage(stage.key);
                          setActivePill(pill.value);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        {content}
                      </button>
                    );
                  }
                  return (
                    <span
                      key={pill.value}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
                    >
                      {content}
                    </span>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {activeStageConfig && (
        <div className="flex flex-wrap gap-2 bg-muted/30 p-3 rounded-3xl mb-6 items-center">
          {activeStageConfig.pills.map((pill) => {
            const isActivePill = pill.value === activePillConfig?.value;
            const isAttentionPill = pill.count > 0;
            return (
              <button
                key={pill.value}
                type="button"
                className={cn(
                  "px-4 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-2 transition-colors",
                  isActivePill
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white text-foreground border-border hover:bg-muted",
                )}
                onClick={() => {
                  setActiveStage(activeStageConfig.key);
                  setActivePill(pill.value);
                }}
              >
                <span>{pill.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{pill.count}</span>
                {isAttentionPill && !isActivePill && <span className="h-2 w-2 rounded-full bg-amber-500" />}
              </button>
            );
          })}
          {activeStageConfig.key === "completed" && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Window:</span>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border",
                  completedRange === "month"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-foreground border-border hover:bg-muted"
                )}
                onClick={() => setCompletedRange("month")}
              >
                This month
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border",
                  completedRange === "30d"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-foreground border-border hover:bg-muted"
                )}
                onClick={() => setCompletedRange("30d")}
              >
                Last 30 days
              </button>
            </div>
          )}
        </div>
      )}

      {scheduledInspections.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Inspections need attention</p>
            <p className="text-sm text-amber-900/80">
              {scheduledInspections.length} inspection{scheduledInspections.length === 1 ? "" : "s"} are awaiting field
              reports.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-900 hover:bg-amber-100"
            onClick={navigateToInspections}
          >
            <BellRing className="w-4 h-4 mr-2" />
            View inspection queue
          </Button>
        </div>
      )}

      {activeStageConfig && activePillConfig && (
        <Card data-testid={`stage-${activeStageConfig.key}-${activePillConfig.value}`}>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle>{activePillConfig.label}</CardTitle>
              <CardDescription>{activePillConfig.description}</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {!activePillConfig.render && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Sort</span>
                  <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
          </CardHeader>
          <CardContent>
            {activePillConfig.render ? (
              activePillConfig.render(activePillConfig.applications)
            ) : activePillConfig.applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{activePillConfig.emptyTitle}</p>
                <p className="text-sm mt-1">{activePillConfig.emptyDescription}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePillConfig.applications.map((application) => (
                  <ApplicationPipelineRow
                    key={application.id}
                    application={application}
                    actionLabel={activePillConfig.actionLabel ?? "Open application"}
                    applicationIds={activePillConfig.applications.map((a) => a.id)}
                    hideAction={activeStageConfig.key === "completed"}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface StageConfig {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  totalCount?: number;
  summary: string;
  pills: StagePillConfig[];
}

interface StagePillConfig {
  value: string;
  label: string;
  count: number;
  description: string;
  applications: ApplicationWithOwner[];
  actionLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
  render?: (applications: ApplicationWithOwner[]) => JSX.Element;
}

interface InspectionSummaryCardProps {
  count: number;
  variant: "pending" | "completed";
  onNavigate: () => void;
  subtitle?: string;
}

function InspectionSummaryCard({ count, variant, onNavigate, subtitle }: InspectionSummaryCardProps) {
  const isPending = variant === "pending";
  const title = isPending ? "Scheduled inspections" : "Completed inspections";
  const description = subtitle
    ? subtitle
    : isPending
      ? "Field visits are scheduled and waiting for updates."
      : "These inspections already include submitted reports.";
  const buttonLabel = isPending ? "Capture inspection updates" : "View inspection history";

  return (
    <div className="text-center py-8 space-y-4">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-4xl font-semibold">{count}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Button onClick={onNavigate} variant={isPending ? "default" : "outline"} className="gap-2">
        {buttonLabel}
      </Button>
    </div>
  );
}
