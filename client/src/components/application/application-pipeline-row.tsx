import { useMemo, type KeyboardEvent } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { ApplicationKind, HomestayApplication } from "@shared/schema";
import { ApplicationKindBadge, getApplicationKindLabel, isServiceApplication } from "@/components/application/application-kind-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { isCorrectionRequiredStatus } from "@/constants/workflow";
import { cn } from "@/lib/utils";

const CATEGORY_VARIANTS: Record<string, { color: string; bg: string }> = {
  diamond: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20" },
  gold: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  silver: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/20" },
};

const STATUS_VARIANTS: Record<string, { label: string; bg: string }> = {
  submitted: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-950/20" },
  under_scrutiny: { label: "Under Scrutiny", bg: "bg-orange-50 dark:bg-orange-950/20" },
  forwarded_to_dtdo: { label: "Forwarded to DTDO", bg: "bg-green-50 dark:bg-green-950/20" },
  reverted_to_applicant: { label: "Sent Back", bg: "bg-red-50 dark:bg-red-950/20" },
  reverted_by_dtdo: { label: "DTDO Reverted", bg: "bg-rose-50 dark:bg-rose-950/20" },
  objection_raised: { label: "DTDO Objection", bg: "bg-rose-50 dark:bg-rose-950/20" },
  dtdo_review: { label: "DTDO Review", bg: "bg-purple-50 dark:bg-purple-950/20" },
  inspection_scheduled: { label: "Inspection Scheduled", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
  inspection_under_review: { label: "Inspection Review", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  approved: { label: "Approved", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  rejected: { label: "Rejected", bg: "bg-rose-50 dark:bg-rose-950/20" },
  draft: { label: "Draft", bg: "bg-slate-50 dark:bg-slate-900/40" },
};

const renderCategoryBadge = (category?: string | null) => {
  const key = (category || "silver").toLowerCase();
  const variant = CATEGORY_VARIANTS[key] || CATEGORY_VARIANTS.silver;
  return (
    <Badge variant="outline" className={`${variant.bg} capitalize`}>
      {category || "silver"}
    </Badge>
  );
};

const renderStatusBadge = (status?: string | null) => {
  if (!status) {
    return <Badge variant="outline">Pending</Badge>;
  }
  const config = STATUS_VARIANTS[status] || {
    label: status.replace(/_/g, " "),
    bg: "bg-muted/40",
  };
  return (
    <Badge variant="outline" className={config.bg}>
      {config.label}
    </Badge>
  );
};

const getCorrectionStateMeta = (application: PipelineApplication) => {
  if (!isCorrectionRequiredStatus(application.status)) {
    return null;
  }
  const resubmitted = Boolean(application.latestCorrection?.createdAt);
  const relative =
    resubmitted && application.latestCorrection?.createdAt
      ? formatDistanceToNow(new Date(application.latestCorrection.createdAt), { addSuffix: true })
      : null;
  return {
    label: resubmitted ? "Owner resubmitted" : "Waiting on owner",
    className: resubmitted
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
      : "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
    relative,
  };
};

export type PipelineApplication = HomestayApplication & {
  ownerName: string;
  ownerMobile: string;
  latestCorrection?: {
    createdAt: string;
    feedback?: string | null;
  } | null;
};

interface ApplicationPipelineRowProps {
  application: PipelineApplication;
  actionLabel: string;
  applicationIds: string[];
  hideAction?: boolean;
}

export function ApplicationPipelineRow({ application, actionLabel, applicationIds, hideAction }: ApplicationPipelineRowProps) {
  const applicationKind = application.applicationKind as ApplicationKind | undefined;
  const legacyOnboarding = Boolean((application as any)?.serviceContext?.legacyOnboarding);
  const isService = legacyOnboarding || isServiceApplication(applicationKind);
  const serviceLabel = legacyOnboarding ? "RC Registration" : getApplicationKindLabel(applicationKind);
  const [, navigate] = useLocation();
  const queueParam = useMemo(() => encodeURIComponent(applicationIds.join(",")), [applicationIds]);
  const targetUrl = `/da/applications/${application.id}?queue=${queueParam}`;
  const correctionState = getCorrectionStateMeta(application);

  const handleNavigate = () => {
    navigate(targetUrl);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate();
    }
  };

  return (
    <div
      className="p-4 border rounded-2xl hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer flex items-center justify-between"
      tabIndex={0}
      role="button"
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="text-lg font-semibold">{application.propertyName || "Untitled Homestay"}</span>
          {renderCategoryBadge(application.category)}
          {renderStatusBadge(application.status)}
          {correctionState && (
            <Badge className={`${correctionState.className} border`}>
              {correctionState.label}
            </Badge>
          )}
          {legacyOnboarding ? (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30">
              RC Registration
            </Badge>
          ) : (
            <ApplicationKindBadge kind={applicationKind} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Owner:</span> {application.ownerName}
          </div>
          <div>
            <span className="font-medium">Mobile:</span> {application.ownerMobile}
          </div>
          <div>
            <span className="font-medium">District:</span> {application.district}
          </div>
          <div>
            <span className="font-medium">Submitted:</span>{" "}
            {application.submittedAt ? format(new Date(application.submittedAt), "MMM dd, yyyy") : "N/A"}
          </div>
          {(application.correctionSubmissionCount ?? 0) > 0 && (
            <div className="col-span-2 text-xs text-muted-foreground">
              Correction cycles used: {application.correctionSubmissionCount}
            </div>
          )}
          {correctionState && (
            <div className="col-span-2 text-xs text-muted-foreground">
              {correctionState.relative
                ? `Owner resubmitted ${correctionState.relative}`
                : "Awaiting owner confirmation"}
            </div>
          )}
          {isService && (
            <div className={cn("col-span-2 text-xs text-muted-foreground flex flex-wrap gap-4")}>
              <span>
                <span className="font-medium">Service:</span> {serviceLabel}
              </span>
              <span>
                <span className="font-medium">Parent App:</span> {application.parentApplicationNumber || "—"}
              </span>
              <span>
                <span className="font-medium">Certificate #:</span> {application.parentCertificateNumber ||
                  application.certificateNumber ||
                  "—"}
              </span>
            </div>
          )}
        </div>
      </div>
      {!hideAction && (
        <div className="ml-4">
          <Button
            data-testid={`button-review-${application.id}`}
            onClick={(event) => {
              event.stopPropagation();
              handleNavigate();
            }}
          >
            {actionLabel || "Open application"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
