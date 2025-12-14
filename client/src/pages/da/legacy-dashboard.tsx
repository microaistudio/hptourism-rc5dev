import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, AlertCircle, Share2, CheckCircle, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import type { HomestayApplication } from "@shared/schema";
import { isLegacyApplication } from "@shared/legacy";
import { ApplicationPipelineRow, type PipelineApplication } from "@/components/application/application-pipeline-row";
import { isCorrectionRequiredStatus } from "@/constants/workflow";
import { formatDistanceToNow } from "date-fns";

 type ApplicationWithOwner = PipelineApplication;
type SortOrder = "newest" | "oldest";

interface StageConfig {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  totalCount?: number;
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
}

const LEGACY_QUEUE_STATUSES = new Set(["legacy_rc_review", "under_scrutiny", "submitted"]);

const useLegacySettings = () => {
  const { data } = useQuery<{ forwardEnabled: boolean }>({
    queryKey: ["/api/legacy/settings"],
  });
  return {
    forwardEnabled: data?.forwardEnabled ?? true,
  };
};

const isInCurrentMonth = (value?: string | Date | null) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const getSortTimestamp = (app: HomestayApplication) => {
  const candidate = app.updatedAt ?? app.submittedAt ?? app.createdAt;
  return candidate ? new Date(candidate).getTime() : 0;
};

const sortApplications = (apps: ApplicationWithOwner[], order: SortOrder) =>
  [...apps].sort((a, b) => {
    const diff = getSortTimestamp(a) - getSortTimestamp(b);
    return order === "newest" ? -diff : diff;
  });

const getCorrectionStateMeta = (application: ApplicationWithOwner) => {
  if (!isCorrectionRequiredStatus(application.status)) {
    return null;
  }
  const resubmitted = Boolean(application.latestCorrection?.createdAt);
  const relative =
    resubmitted && application.latestCorrection?.createdAt
      ? formatDistanceToNow(new Date(application.latestCorrection.createdAt), { addSuffix: true })
      : null;
  return {
    resubmitted,
    relative,
  };
};

export default function DALegacyDashboard() {
  const [activeStage, setActiveStage] = useState("legacy-queue");
  const [activePill, setActivePill] = useState("legacy-new");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const queryClient = useQueryClient();
  const { forwardEnabled } = useLegacySettings();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
  }, [queryClient]);

  const { data: applications, isLoading } = useQuery<ApplicationWithOwner[]>({
    queryKey: ["/api/da/applications"],
  });

  const { data: user } = useQuery<{ user: { district?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const legacyApplications = useMemo(
    () => (applications ?? []).filter((app) => isLegacyApplication(app)),
    [applications],
  );

  const sortedLegacy = useMemo(() => sortApplications(legacyApplications, sortOrder), [legacyApplications, sortOrder]);
  const verificationQueue = useMemo(
    () => sortedLegacy.filter((app) => LEGACY_QUEUE_STATUSES.has(app.status ?? "")),
    [sortedLegacy],
  );
  const returnedFromDtdo = useMemo(
    () => sortedLegacy.filter((app) => (app.status ?? "") === "reverted_by_dtdo"),
    [sortedLegacy],
  );
  const corrections = useMemo(
    () => sortedLegacy.filter((app) => isCorrectionRequiredStatus(app.status)),
    [sortedLegacy],
  );
  const waitingOnOwner = useMemo(
    () => corrections.filter((app) => !getCorrectionStateMeta(app)?.resubmitted),
    [corrections],
  );
  const ownerResubmitted = useMemo(
    () => corrections.filter((app) => Boolean(getCorrectionStateMeta(app)?.resubmitted)),
    [corrections],
  );
  const forwarded = useMemo(
    () => sortedLegacy.filter((app) => (app.status ?? "") === "forwarded_to_dtdo"),
    [sortedLegacy],
  );
  const dtdoReview = useMemo(
    () => sortedLegacy.filter((app) => (app.status ?? "") === "dtdo_review"),
    [sortedLegacy],
  );
  const approvedThisMonth = useMemo(
    () =>
      sortedLegacy.filter(
        (app) => app.status === "approved" && isInCurrentMonth(app.approvedAt ?? app.updatedAt ?? app.createdAt),
      ),
    [sortedLegacy],
  );
  const rejectedThisMonth = useMemo(
    () => sortedLegacy.filter((app) => app.status === "rejected" && isInCurrentMonth(app.updatedAt ?? app.createdAt)),
    [sortedLegacy],
  );

  const stageConfigs = useMemo(() => {
    const base: StageConfig[] = [
      {
        key: "legacy-queue",
        title: "Verification Queue",
        description: "Owner, property, and RC details awaiting validation.",
        icon: FileText,
        pills: [
          {
            value: "legacy-new",
            label: "New submissions",
            count: verificationQueue.length,
            description: "Fresh onboarding requests captured from owners.",
            applications: verificationQueue,
            actionLabel: "Start verification",
            emptyTitle: "No pending submissions",
            emptyDescription: "Every captured request has already been reviewed.",
          },
          {
            value: "legacy-returned",
            label: "Returned by DTDO",
            count: returnedFromDtdo.length,
            description: "Cases DTDO sent back for DA review.",
            applications: returnedFromDtdo,
            actionLabel: "Resume review",
            emptyTitle: "Nothing returned",
            emptyDescription: "DTDO hasn't sent any existing RC case back recently.",
          },
        ],
      },
      {
        key: "legacy-corrections",
        title: "Corrections",
        description: "Owner clarifications and resubmissions.",
        icon: AlertCircle,
        pills: [
          {
            value: "legacy-waiting",
            label: "Waiting on owner",
            count: waitingOnOwner.length,
            description: "Cases sent back that still need owner action.",
            applications: waitingOnOwner,
            actionLabel: "Review remarks",
            emptyTitle: "No pending corrections",
            emptyDescription: "All requested corrections have been addressed.",
          },
          {
            value: "legacy-resubmitted",
            label: "Resubmitted",
            count: ownerResubmitted.length,
            description: "Owners have uploaded the requested documents.",
            applications: ownerResubmitted,
            actionLabel: "Validate resubmission",
            emptyTitle: "No resubmissions yet",
            emptyDescription: "You'll be notified when an owner resubmits.",
          },
        ],
      },
    ];

    if (forwardEnabled || forwarded.length > 0 || dtdoReview.length > 0) {
      base.push({
        key: "legacy-escalated",
        title: "Escalated to DTDO",
        description: "Existing RC cases monitored at the DTDO desk.",
        icon: Share2,
        pills: [
          {
            value: "legacy-forwarded",
            label: "Forwarded",
            count: forwarded.length,
            description: "Awaiting DTDO acknowledgement.",
            applications: forwarded,
            actionLabel: "View summary",
            emptyTitle: "Nothing with DTDO",
            emptyDescription: "Forward cases only when DA checks are complete.",
          },
          {
            value: "legacy-dtdo-review",
            label: "DTDO review",
            count: dtdoReview.length,
            description: "DTDO accepted files undergoing final checks.",
            applications: dtdoReview,
            actionLabel: "Track progress",
            emptyTitle: "No active reviews",
            emptyDescription: "You'll see DTDO activity once they accept a case.",
          },
        ],
      });
    }

    base.push({
      key: "legacy-closures",
      title: "Closed this month",
      description: "Existing RC registrations verified in the current month.",
      icon: CheckCircle,
      pills: [
        {
          value: "legacy-approved",
          label: "Verified",
          count: approvedThisMonth.length,
          description: "Existing RC registration verified and migrated.",
          applications: approvedThisMonth,
          actionLabel: "View certificate",
          emptyTitle: "No verifications yet",
          emptyDescription: "Progress existing RC cases to add them here.",
        },
        {
          value: "legacy-rejected",
          label: "Rejected",
          count: rejectedThisMonth.length,
          description: "Existing RC requests declined this month.",
          applications: rejectedThisMonth,
          actionLabel: "Review decision",
          emptyTitle: "No rejections",
          emptyDescription: "Declined files will appear for follow-up.",
        },
      ],
    });

    return base;
  }, [
    verificationQueue,
    returnedFromDtdo,
    waitingOnOwner,
    ownerResubmitted,
    forwarded,
    dtdoReview,
    approvedThisMonth,
    rejectedThisMonth,
    forwardEnabled,
  ]);

  useEffect(() => {
    if (!stageConfigs.length) return;
    const resolvedStage = stageConfigs.find((stage) => stage.key === activeStage) ?? stageConfigs[0];
    if (resolvedStage.key !== activeStage) {
      setActiveStage(resolvedStage.key);
      setActivePill(resolvedStage.pills[0]?.value ?? "");
      return;
    }
    const resolvedPill =
      resolvedStage.pills.find((pill) => pill.value === activePill) ?? resolvedStage.pills[0];
    if (resolvedPill.value !== activePill) {
      setActivePill(resolvedPill.value);
    }
  }, [stageConfigs, activeStage, activePill]);

  const activeStageConfig = stageConfigs.find((stage) => stage.key === activeStage) ?? stageConfigs[0];
  const activePillConfig =
    activeStageConfig?.pills.find((pill) => pill.value === activePill) ?? activeStageConfig?.pills[0];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Existing RC Registration Desk</h1>
          <p className="text-muted-foreground">
            {user?.user?.district || "District"} – Current license validation
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center rounded-full border bg-muted/40 text-xs font-semibold">
            <Link
              href="/da/dashboard"
              className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
            >
              Next-gen view
            </Link>
            <span className="px-3 py-1.5 rounded-full bg-background shadow-sm text-foreground">
              Classic view
            </span>
          </div>
          <Button variant="outline" onClick={handleRefresh} className="w-full sm:w-fit">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {forwardEnabled === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          DTDO escalation is disabled. All existing RC onboarding cases must be verified and closed within the DA desk.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stageConfigs.map((stage) => {
          const Icon = stage.icon;
          const totalCount = stage.totalCount ?? stage.pills.reduce((sum, pill) => sum + pill.count, 0);
          const isActiveStage = stage.key === activeStageConfig?.key;
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
              className={`p-5 flex flex-col gap-3 cursor-pointer transition-all border border-border rounded-2xl ${isActiveStage ? "ring-2 ring-primary" : ""}`}
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
              <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
            </Card>
          );
        })}
      </div>

      {activeStageConfig && activePillConfig && (
        <>
          <div className="flex flex-wrap gap-2 bg-muted/30 p-3 rounded-3xl">
            {activeStageConfig.pills.map((pill) => {
              const isActive = pill.value === activePillConfig.value;
              return (
                <button
                  key={pill.value}
                  className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium ${isActive ? "bg-background shadow" : "text-muted-foreground"}`}
                  onClick={() => setActivePill(pill.value)}
                >
                  <span>{pill.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{pill.count}</span>
                </button>
              );
            })}
          </div>
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{activePillConfig.label}</CardTitle>
                <CardDescription>{activePillConfig.description}</CardDescription>
              </div>
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
            </CardHeader>
            <CardContent>
              {activePillConfig.applications.length === 0 ? (
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
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
