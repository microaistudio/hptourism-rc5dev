import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Printer,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { HomestayApplication, InspectionReport, InspectionOrder } from "@shared/schema";
import hpGovLogo from "@/assets/logos_tr/HP_Gov_TR.png";
import hpTourismLogo from "@/assets/logos_tr/HP_Touris_TR.png";
import { generateInspectionReportPdf } from "@/lib/inspectionReportPdf";
import type { InspectionReportSummary } from "@/lib/inspection-report";
import { DESIRABLE_POINTS, MANDATORY_POINTS } from "@/constants/inspection";

interface InspectionReviewData {
  report: InspectionReport;
  application: HomestayApplication;
  inspectionOrder: InspectionOrder;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  } | null;
  da: {
    fullName: string;
    mobile: string;
  } | null;
}

const reportPrintStyles = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  @media print {
    html, body, #root, #root > div {
      width: 100%;
      height: auto;
      background: #ffffff !important;
      overflow: visible !important;
      min-height: auto !important;
    }
    body * {
      visibility: hidden !important;
    }
    #inspection-report-page, #inspection-report-page * {
      visibility: visible !important;
    }
    #inspection-report-page {
      width: 640px !important;
      max-width: 640px !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: visible !important;
      position: static !important;
    }
    #inspection-report-page .print\\:hidden {
      display: none !important;
    }
    #inspection-report-page .avoid-break {
      page-break-inside: avoid;
    }
  }
`;

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const parsedValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return "—";
  }
  return format(parsedValue, "dd/MM/yyyy");
};

export default function DTDOInspectionReview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revert' | null>(null);
  const [remarks, setRemarks] = useState("");
  const { data, isLoading } = useQuery<InspectionReviewData>({
    queryKey: ["/api/dtdo/inspection-report", id],
  });

  const actionEndpointMap = {
    approve: "approve",
    reject: "reject",
    revert: "raise-objections",
  } as const;

  const actionMutation = useMutation({
    mutationFn: async ({ endpoint, remarks }: { endpoint: string; remarks: string }) => {
      const response = await apiRequest("POST", `/api/dtdo/inspection-report/${id}/${endpoint}`, {
        remarks,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/inspection-report", id] });
      toast({
        title: "Success",
        description: "Inspection report processed successfully",
      });
      setLocation("/dtdo/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process inspection report",
        variant: "destructive",
      });
    },
  });

  const normalizeDateValue = (value: string | Date | null | undefined) => {
    if (!value) return null;
    return typeof value === "string" ? value : value.toISOString();
  };

  const inspectionSummary = useMemo<InspectionReportSummary | null>(() => {
    if (!data) {
      return null;
    }
    return {
      report: data.report,
      inspectionOrder: data.inspectionOrder,
      application: {
        id: data.application.id,
        applicationNumber: data.application.applicationNumber,
        propertyName: data.application.propertyName,
        district: data.application.district,
        tehsil: data.application.tehsil,
        address: data.application.address,
        category: data.application.category,
        status: data.application.status ?? "",
        siteInspectionOutcome: data.application.siteInspectionOutcome ?? null,
        siteInspectionNotes: data.application.siteInspectionNotes ?? null,
        siteInspectionCompletedDate: normalizeDateValue(data.application.siteInspectionCompletedDate),
      },
      owner: data.owner
        ? {
            id: data.application.userId,
            fullName: data.owner.fullName,
            mobile: data.owner.mobile,
            email: data.owner.email ?? null,
          }
        : null,
      da: data.da
        ? {
            id: data.report.submittedBy,
            fullName: data.da.fullName,
            mobile: data.da.mobile,
            district: data.application.district,
          }
        : null,
      dtdo: null,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Inspection Report Not Found</h3>
            <Button onClick={() => setLocation("/dtdo/dashboard")} className="mt-4" data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, application, inspectionOrder, owner, da } = data;
const normalizedRecommendation = (report.recommendation || "").toLowerCase();
const hasDAObjection = normalizedRecommendation === "raise_objections";
const formatRecommendationLabel = (value?: string | null) => {
  if (!value) return "—";
  const normalized = value.toLowerCase();
  if (normalized === "approve") return "Verify for Payment";
  if (normalized === "raise_objections") return "Raise Objections";
  return value.replace(/_/g, " ");
};

  const handleAction = (action: 'approve' | 'reject' | 'revert') => {
    setActionType(action);
    setRemarks("");
  };

  const confirmAction = () => {
    if (!actionType) return;
    
    if (!remarks.trim() && (actionType === 'reject' || actionType === 'revert')) {
      toast({
        title: "Remarks Required",
        description: `Please provide ${actionType === 'reject' ? 'rejection reason' : 'objection details'}`,
        variant: "destructive",
      });
      return;
    }

    const endpoint = actionEndpointMap[actionType];
    actionMutation.mutate({ endpoint, remarks: remarks.trim() });
  };

  // Calculate compliance
  const mandatoryChecklist = (report.mandatoryChecklist as Record<string, boolean>) || {};
  const desirableChecklist = (report.desirableChecklist as Record<string, boolean>) || {};
  
  const mandatoryValues = Object.values(mandatoryChecklist);
  const mandatoryCompliance = mandatoryValues.length > 0 
    ? Math.round((mandatoryValues.filter(Boolean).length / mandatoryValues.length) * 100)
    : 0;
    
  const desirableValues = Object.values(desirableChecklist);
  const desirableCompliance = desirableValues.length > 0
    ? Math.round((desirableValues.filter(Boolean).length / desirableValues.length) * 100)
    : 0;
  const mandatoryMetCount = MANDATORY_POINTS.filter((point) => mandatoryChecklist?.[point.key]).length;
  const desirableMetCount = DESIRABLE_POINTS.filter((point) => desirableChecklist?.[point.key]).length;
  const mandatoryTotalPoints = MANDATORY_POINTS.length;
  const desirableTotalPoints = DESIRABLE_POINTS.length;
  const scheduledOn = formatDate(inspectionOrder?.inspectionDate ?? null);
  const inspectionDoneOn = formatDate(report.actualInspectionDate ?? null);
  const reportSubmittedOn = formatDate(report.createdAt ?? null);

  const handlePrint = () => {
    if (typeof window === "undefined") {
      return;
    }
    const reportNode = document.getElementById("inspection-report-page");
    if (!reportNode) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) {
      window.print();
      return;
    }

    const stylesheetNodes = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Inspection Report</title>
          ${stylesheetNodes}
          <style>${reportPrintStyles}</style>
        </head>
        <body>${reportNode.outerHTML}</body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const getCategoryBadge = (category: string) => {
    const colorMap: Record<string, string> = {
      diamond: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20",
      silver: "bg-gray-50 text-gray-700 dark:bg-gray-950/20",
    };
    return (
      <Badge variant="outline" className={colorMap[category.toLowerCase()] || ""}>
        {category.toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      <style>{reportPrintStyles}</style>
      <div
        id="inspection-report-page"
        className="mx-auto max-w-6xl space-y-6 p-6 print:max-w-[640px] print:w-[640px] print:p-0 print:bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dtdo/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Back to Dashboard
          </div>
          <div className="flex flex-wrap gap-2">
            {report.reportDocumentUrl ? (
              <Button asChild variant="outline" size="sm" data-testid="button-download-report">
                <a href={report.reportDocumentUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download Attachment
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => inspectionSummary && generateInspectionReportPdf(inspectionSummary)}
                disabled={!inspectionSummary}
                data-testid="button-generate-report-snapshot"
              >
                <Download className="mr-2 h-4 w-4" /> Download Snapshot
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handlePrint} data-testid="button-print-report">
              <Printer className="mr-2 h-4 w-4" /> Print Report
            </Button>
          </div>
        </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm print:border print:shadow-none">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 px-6 py-6 md:flex-row">
          <img src={hpGovLogo} alt="Government of Himachal Pradesh" className="h-16 w-auto" />
          <div className="text-center md:text-left">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Government of Himachal Pradesh</p>
            <h1 className="text-3xl font-bold tracking-tight">District Inspection Memorandum</h1>
            <p className="text-sm text-muted-foreground">
              Application #{application.applicationNumber} • Homestay Registration 2025
            </p>
          </div>
          <img src={hpTourismLogo} alt="Himachal Tourism" className="h-16 w-auto" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 text-xs uppercase tracking-wide text-muted-foreground">
          <div>
            <p>Status</p>
            <Badge variant="outline" className={hasDAObjection ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
              {hasDAObjection ? "DA Raised Objections" : "Under Review"}
            </Badge>
          </div>
          <div>
            <p>Inspection Window</p>
            <p className="text-sm font-medium normal-case text-slate-900">
              {scheduledOn} to {inspectionDoneOn}
            </p>
          </div>
          <div>
            <p>Report Submitted</p>
            <p className="text-sm font-medium normal-case text-slate-900">{reportSubmittedOn}</p>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Application</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{application.applicationNumber}</div>
                <p className="text-xs text-muted-foreground mt-1">{application.propertyName}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2">{getCategoryBadge(report.recommendedCategory || application.category)}</div>
                {report.categoryMeetsStandards ? (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Meets standards</p>
                ) : (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">✗ Does not meet standards</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Mandatory Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{mandatoryCompliance}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mandatoryValues.filter(Boolean).length} of {mandatoryValues.length} met
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Desirable Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{desirableCompliance}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {desirableValues.filter(Boolean).length} of {desirableValues.length} met
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="owner" className="avoid-break">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Property & Inspection</CardTitle>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="owner">Owner</TabsTrigger>
                    <TabsTrigger value="property">Property</TabsTrigger>
                    <TabsTrigger value="inspection">Inspection</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="owner" className="space-y-2 text-sm">
                  <p className="font-medium">{owner?.fullName ?? "—"}</p>
                  <p className="text-muted-foreground">{owner?.mobile ?? "No mobile"}</p>
                  {owner?.email && <p className="text-muted-foreground">{owner.email}</p>}
                </TabsContent>
                <TabsContent value="property" className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Property Name</p>
                    <p className="font-medium">{application.propertyName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">District / Tehsil</p>
                    <p className="font-medium">{application.district} · {application.tehsil}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rooms</p>
                    <p className="font-medium">
                      Declared: {application.totalRooms || "N/A"} | Verified: {report.actualRoomCount || "N/A"}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="inspection" className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Inspector</p>
                    <p className="font-medium">{da?.fullName || "N/A"}</p>
                    {da?.mobile && <p className="text-muted-foreground">{da.mobile}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inspection Date</p>
                    <p className="font-medium">{formatDate(report.actualInspectionDate ?? null)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Report Submitted</p>
                    <p className="font-medium">{formatDate(report.submittedDate ?? null)}</p>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Findings</CardTitle>
              <CardDescription>
                ANNEXURE-III Compliance Checklist (HP Homestay Rules 2025)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="mandatory" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/60 p-1 text-xs font-medium">
                  <TabsTrigger value="mandatory" className="text-sm">
                    Section A · Mandatory ({mandatoryMetCount}/{mandatoryTotalPoints})
                  </TabsTrigger>
                  <TabsTrigger value="desirable" className="text-sm">
                    Section B · Desirable ({desirableMetCount}/{desirableTotalPoints})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mandatory" className="mt-4 space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    All mandatory requirements must be met for approval.
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {MANDATORY_POINTS.map((point) => (
                      <div key={point.key} className="flex items-center gap-2 rounded border p-2 text-sm">
                        {mandatoryChecklist[point.key] ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className={mandatoryChecklist[point.key] ? "text-slate-900" : "text-muted-foreground"}>
                          {point.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {report.mandatoryRemarks && (
                    <div className="rounded border bg-muted/30 p-3 text-sm">
                      <p className="mb-1 font-medium">DA Remarks</p>
                      {report.mandatoryRemarks}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="desirable" className="mt-4 space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    Desirable amenities enhance guest comfort and property rating.
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DESIRABLE_POINTS.map((point) => (
                      <div key={point.key} className="flex items-center gap-2 rounded border p-2 text-sm">
                        {desirableChecklist[point.key] ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={desirableChecklist[point.key] ? "text-slate-900" : "text-muted-foreground"}>
                          {point.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {report.desirableRemarks && (
                    <div className="rounded border bg-muted/30 p-3 text-sm">
                      <p className="mb-1 font-medium">DA Remarks</p>
                      {report.desirableRemarks}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* DA's Overall Assessment */}
          {report.detailedFindings && (
            <Card>
              <CardHeader>
                <CardTitle>DA's Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{report.detailedFindings}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-medium">Recommendation:</span>
                  <Badge>{formatRecommendationLabel(report.recommendation)}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DTDO Decision Actions */}
          <Card>
            <CardHeader>
              <CardTitle>DTDO Decision</CardTitle>
              <CardDescription>
                Make your final decision on this inspection report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handleAction('approve')}
                  data-testid="button-approve"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Verify for Payment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction('revert')}
                  data-testid="button-revert"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Revert to Applicant
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction('reject')}
                  data-testid="button-reject"
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent data-testid="dialog-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Verify for Payment'}
              {actionType === 'reject' && 'Reject Application'}
              {actionType === 'revert' && 'Revert to Applicant'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'The owner will be allowed to proceed with payment.'}
              {actionType === 'reject' && 'The application will be permanently rejected.'}
              {actionType === 'revert' && 'Send the application back to the owner with your remarks for correction.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">
                {actionType === 'approve' ? 'Remarks (Optional)' : 'Remarks (Required)'}
              </Label>
              <Textarea
                id="remarks"
                placeholder={
                  actionType === 'approve'
                    ? 'Add any additional notes...'
                    : actionType === 'reject'
                    ? 'Specify the reason for rejection...'
                    : 'Specify the issues that need to be addressed...'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                data-testid="textarea-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionType(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              data-testid="button-confirm"
            >
              {actionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
