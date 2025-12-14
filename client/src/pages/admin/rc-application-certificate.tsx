import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Home, User, MapPin, Calendar, ArrowLeft } from "lucide-react";
import { generateCertificatePDF, type CertificateFormat } from "@/lib/certificateGenerator";
import { fetchInspectionReportSummary } from "@/lib/inspection-report";
import type { HomestayApplication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type LegacyApplicationResponse = {
  application: HomestayApplication;
  owner?: {
    fullName: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
};

const certificateFormatOptions: { value: CertificateFormat; label: string; description: string }[] = [
  {
    value: "policy_heritage",
    label: "Official RC Format",
    description: "Golden bordered Form-A certificate cleared for issue across HP",
  },
];

const formatDisplayDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const resolved = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(resolved.getTime())) {
    return "—";
  }
  return resolved.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const infoRow = (label: string, value: string | number | null | undefined) => (
  <div className="space-y-1">
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
    <p className="text-base font-medium">{value ?? "—"}</p>
  </div>
);

export default function AdminRcApplicationCertificate() {
  const [, params] = useRoute("/admin/rc-applications/:id/certificate");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [certificateFormat, setCertificateFormat] = useState<CertificateFormat>("policy_heritage");
  const [isGenerating, setIsGenerating] = useState(false);
  const applicationId = params?.id;
  const [lookupId, setLookupId] = useState("");

  const { data, isLoading, error } = useQuery<LegacyApplicationResponse>({
    queryKey: ["/api/admin-rc/applications", applicationId],
    enabled: Boolean(applicationId),
  });

  const application = data?.application;
  const owner = data?.owner;
  const canDownload = Boolean(application?.certificateNumber);

  const openLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) return;
    navigate(`/admin/rc-applications/${trimmed}/certificate`);
  };

  const handleDownload = async () => {
    if (!application) {
      return;
    }
    setIsGenerating(true);
    try {
      let inspectionSummary = null;
      if (applicationId) {
        try {
          inspectionSummary = await fetchInspectionReportSummary(applicationId);
        } catch (error) {
          console.warn("[admin rc] Failed to fetch inspection reference", error);
        }
      }
      generateCertificatePDF(application, certificateFormat, {
        inspectionReport: inspectionSummary ?? undefined,
      });
      if (!application.certificateNumber) {
        toast({
          title: "Blank certificate downloaded",
          description: "RC number, dates, and other blanks can be filled manually on the printout.",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to prepare certificate right now.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!applicationId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">RC Desk</p>
          <h1 className="text-3xl font-bold">Certificate Generator</h1>
          <p className="text-muted-foreground">
            Enter an approved application ID to jump into the certificate preview. You can find IDs in the RC Applications workspace.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lookup Application</CardTitle>
            <CardDescription>Paste the numeric application ID or RC number.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="eg. 1025"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  openLookup();
                }
              }}
            />
            <div className="flex gap-2">
              <Button onClick={openLookup}>Open Certificate</Button>
              <Button variant="outline" onClick={() => navigate("/admin/rc-applications")}>
                RC Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Certificate Preview</h1>
          <p className="text-muted-foreground">
            Review issuance details, pick a format, and download the RC for stamping/signing.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/admin/rc-applications/${applicationId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
          <Button onClick={handleDownload} disabled={!application || isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            {isGenerating
              ? "Preparing..."
              : `Download ${certificateFormatOptions.find((opt) => opt.value === certificateFormat)?.label ?? ""}`}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load application. Please refresh.
        </div>
      ) : !application ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Application not found or not part of the legacy RC queue.
        </div>
      ) : (
        <div className="space-y-6">
          {!application.certificateNumber && (
            <Alert variant="destructive">
              <AlertTitle>Certificate number missing</AlertTitle>
              <AlertDescription>
                Enter certificate number, issue date, and validity in the editor before you print the RC. Blank templates can still be downloaded but officers
                must write the details manually.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Registration Certificate</CardTitle>
              <CardDescription>
                {application.propertyName || "Homestay"} • {application.district || "District TBD"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {infoRow("Certificate Number", application.certificateNumber || "—")}
                {infoRow("Issue Date", formatDisplayDate(application.certificateIssuedDate))}
                {infoRow("Valid Till", formatDisplayDate(application.certificateExpiryDate))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {infoRow("Status", application.status ? application.status.replaceAll("_", " ") : "Draft")}
                {infoRow("Category", application.category ? application.category.toUpperCase() : "—")}
                {infoRow("Total Rooms", application.totalRooms || 0)}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Certificate Format</p>
                <div className="flex flex-wrap gap-2">
                  {certificateFormatOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={certificateFormat === option.value ? "default" : "outline"}
                      onClick={() => setCertificateFormat(option.value)}
                      type="button"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Both options follow the HP Tourism Policy 2025 Form-A master. Choose an orientation, then download the ready-to-print PDF.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {infoRow("Full Name", application.ownerName || owner?.fullName || "—")}
              {infoRow("Mobile Number", application.ownerMobile || owner?.mobile || "—")}
              {infoRow("Email Address", application.ownerEmail || owner?.email || "—")}
              {infoRow("Aadhaar Number", application.ownerAadhaar || "—")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {infoRow("Property Name", application.propertyName || "—")}
              {infoRow("Category", application.category ? application.category.toUpperCase() : "—")}
              {infoRow("Location Type", application.locationType?.toUpperCase() || "—")}
              {infoRow("Project Type", application.projectType || "—")}
              <div className="md:col-span-2 space-y-1">
                <p className="text-xs uppercase text-muted-foreground">Address</p>
                <p className="text-base font-medium flex gap-2 items-start">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>
                    {application.address ? `${application.address}, ` : ""}
                    {application.tehsil ? `${application.tehsil}, ` : ""}
                    {application.district || ""}
                    {application.pincode ? ` • ${application.pincode}` : ""}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {infoRow("Submitted On", formatDisplayDate(application.submittedAt))}
              {infoRow("Updated On", formatDisplayDate(application.updatedAt))}
              {infoRow("Renewal Window", application.serviceContext?.renewalWindow ? `${formatDisplayDate(application.serviceContext.renewalWindow.start)} → ${formatDisplayDate(application.serviceContext.renewalWindow.end)}` : "—")}
            </CardContent>
          </Card>

          {!canDownload && (
            <Alert>
              <AlertTitle>Template download available</AlertTitle>
              <AlertDescription>
                Even without certificate metadata this will export a blank RC template so you can fill in the remaining fields manually.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
