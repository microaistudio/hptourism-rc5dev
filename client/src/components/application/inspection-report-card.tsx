import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardCheck, Download, ExternalLink, FileWarning, Info, Printer } from "lucide-react";
import { DESIRABLE_TOTAL, MANDATORY_TOTAL } from "@/constants/inspection";
import { buildObjectViewUrl, cn } from "@/lib/utils";
import { fetchInspectionReportSummary, type InspectionReportSummary } from "@/lib/inspection-report";
import { generateInspectionReportPdf } from "@/lib/inspectionReportPdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const outcomeBadge = (outcome?: string | null) => {
  if (!outcome) {
    return { label: "Pending", className: "bg-muted text-muted-foreground" };
  }
  switch (outcome.toLowerCase()) {
    case "recommended":
    case "approved":
      return { label: "Recommended", className: "bg-emerald-50 text-emerald-800" };
    case "objection":
    case "raise_objections":
      return { label: "Objection Raised", className: "bg-amber-50 text-amber-900" };
    case "rejected":
      return { label: "Rejected", className: "bg-rose-50 text-rose-700" };
    default:
      return { label: outcome.replace(/_/g, " "), className: "bg-muted text-muted-foreground" };
  }
};

export function InspectionReportCard({
  applicationId,
  className,
  preferDtdoEndpoint = false,
  enabled = true,
}: {
  applicationId?: string | null;
  className?: string;
  preferDtdoEndpoint?: boolean;
  enabled?: boolean;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/applications", applicationId ?? "unknown", "inspection-report"],
    enabled: Boolean(applicationId) && enabled,
    retry: false,
    queryFn: () => fetchInspectionReportSummary(applicationId!, preferDtdoEndpoint),
  });

  const mandatoryProgress = useMemo(() => {
    if (!data?.report?.mandatoryChecklist) return 0;
    const values = Object.values(data.report.mandatoryChecklist as Record<string, boolean>);
    if (values.length === 0) return 0;
    return (values.filter(Boolean).length / MANDATORY_TOTAL) * 100;
  }, [data]);

  const desirableProgress = useMemo(() => {
    if (!data?.report?.desirableChecklist) return 0;
    const values = Object.values(data.report.desirableChecklist as Record<string, boolean>);
    if (values.length === 0) return 0;
    return (values.filter(Boolean).length / DESIRABLE_TOTAL) * 100;
  }, [data]);

  if (!applicationId || !enabled) {
    return null;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    if (error) {
      return null;
    }

    if (!data) {
      return (
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Info className="h-5 w-5" />
            <p className="text-sm">Inspection report will be available once the DA submits it from the field.</p>
          </div>
        </div>
      );
    }

    const { report, inspectionOrder, da, dtdo, application } = data;
    const outcome = outcomeBadge(application.siteInspectionOutcome || report.recommendation);
    const actualDate = report.actualInspectionDate ? format(new Date(report.actualInspectionDate), "PPP") : null;
    const submittedDate = report.submittedDate ? format(new Date(report.submittedDate), "PPP") : null;
    const mandatoryCompleted = Math.round((mandatoryProgress / 100) * MANDATORY_TOTAL);
    const desirableCompleted = Math.round((desirableProgress / 100) * DESIRABLE_TOTAL);

    const scheduleDate = inspectionOrder?.inspectionDate
      ? format(new Date(inspectionOrder.inspectionDate), "PPP")
      : null;
    const inspector = da?.fullName ?? "—";
    const dtdoName = dtdo?.fullName ?? "—";
    const photos = Array.isArray(report.inspectionPhotos) ? report.inspectionPhotos : [];
    const inspectionReportLink = report?.id ? `/dtdo/inspection-report/${report.id}` : null;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-inner">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={cn("flex items-center gap-2", outcome.className)}>
              <ClipboardCheck className="h-4 w-4" /> {outcome.label}
            </Badge>
            {actualDate && (
              <span className="text-sm text-emerald-900/80">Inspected on {actualDate}</span>
            )}
            {submittedDate && (
              <span className="text-sm text-emerald-900/70">· Report filed {submittedDate}</span>
            )}
            {report.recommendedCategory && (
              <Badge variant="outline" className="ml-auto border-emerald-200 text-emerald-900">
                Recommended: {report.recommendedCategory.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Inspection</TabsTrigger>
            <TabsTrigger value="dtdo">DTDO</TabsTrigger>
            <TabsTrigger value="rooms">Room Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="mt-4">
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled Visit</p>
              <p className="text-base font-semibold text-foreground">{scheduleDate ?? "Pending"}</p>
              <p className="text-xs text-muted-foreground mt-1">Inspector: {inspector}</p>
            </div>
          </TabsContent>
          <TabsContent value="dtdo" className="mt-4">
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">DTDO</p>
              <p className="text-base font-semibold text-foreground">{dtdoName}</p>
              {inspectionOrder?.specialInstructions && (
                <p className="text-xs text-muted-foreground mt-1">Notes: {inspectionOrder.specialInstructions}</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="rooms" className="mt-4">
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Room Count</p>
              <p className="text-base font-semibold text-foreground">
                {report.actualRoomCount ?? "—"} {report.roomCountVerified ? "rooms verified" : "rooms (pending)"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Category meets standards: {report.categoryMeetsStandards ? "Yes" : "Needs review"}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="mandatory" className="w-full">
          <TabsList className="mt-2 grid w-full grid-cols-2">
            <TabsTrigger value="mandatory">Mandatory</TabsTrigger>
            <TabsTrigger value="desirable">Desirable</TabsTrigger>
          </TabsList>
          <TabsContent value="mandatory" className="mt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-800">Mandatory compliance</p>
                <span className="text-xs text-muted-foreground">{mandatoryCompleted}/{MANDATORY_TOTAL}</span>
              </div>
              <Progress value={mandatoryProgress} className="mt-2 h-2" />
              {report.mandatoryRemarks && (
                <p className="mt-2 text-xs text-muted-foreground">Remarks: {report.mandatoryRemarks}</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="desirable" className="mt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-800">Desirable facilities</p>
                <span className="text-xs text-muted-foreground">{desirableCompleted}/{DESIRABLE_TOTAL}</span>
              </div>
              <Progress value={desirableProgress} className="mt-2 h-2 bg-muted" />
              {report.desirableRemarks && (
                <p className="mt-2 text-xs text-muted-foreground">Remarks: {report.desirableRemarks}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-2">Inspector's summary</p>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {report.detailedFindings || "No remarks recorded."}
          </p>
        </div>

        {(inspectionReportLink || report.reportDocumentUrl) && (
          <div className="flex flex-wrap gap-2">
            {inspectionReportLink && (
              <Button variant="outline" size="sm" asChild>
                <a href={inspectionReportLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Inspection Report
                </a>
              </Button>
            )}
            {report.reportDocumentUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={report.reportDocumentUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Attachment
                </a>
              </Button>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Inspection photos</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {photos.slice(0, 6).map((photo) => (
                <a
                  key={photo.fileUrl}
                  href={buildObjectViewUrl(photo.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border"
                >
                  <img
                    src={buildObjectViewUrl(photo.fileUrl)}
                    alt={photo.caption || photo.fileName}
                    className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{photo.caption}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {report.reportDocumentUrl ? (
            <Button variant="outline" asChild>
              <a href={buildObjectViewUrl(report.reportDocumentUrl)} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => generateInspectionReportPdf(data)}
              data-testid="button-generate-inspection-pdf"
            >
              <Download className="mr-2 h-4 w-4" /> Download Snapshot
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print view
          </Button>
        </div>

        {application.siteInspectionNotes && (
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertDescription>{application.siteInspectionNotes}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className={className} data-testid="inspection-report-card">
      <CardHeader>
        <CardTitle>Inspection Report</CardTitle>
        <CardDescription>Snapshot of the latest field inspection submitted by the DA.</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
