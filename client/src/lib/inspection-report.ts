import type { InspectionOrder, InspectionReport } from "@shared/schema";

export type InspectionReportSummary = {
  report: InspectionReport;
  inspectionOrder: InspectionOrder | null;
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    district: string;
    tehsil: string;
    address: string;
    category: string;
    status: string;
    siteInspectionOutcome: string | null;
    siteInspectionNotes: string | null;
    siteInspectionCompletedDate: string | null;
  };
  owner: {
    id: string;
    fullName: string;
    mobile: string;
    email: string | null;
  } | null;
  da: {
    id: string;
    fullName: string;
    mobile: string;
    district: string | null;
  } | null;
  dtdo: {
    id: string;
    fullName: string;
    mobile: string;
    district: string | null;
  } | null;
};

export async function fetchInspectionReportSummary(
  applicationId: string,
  preferDtdoEndpoint = false,
): Promise<InspectionReportSummary | null> {
  const endpoints = preferDtdoEndpoint
    ? [
        `/api/dtdo/inspection-report/${applicationId}`,
        `/api/applications/${applicationId}/inspection-report`,
      ]
    : [
        `/api/applications/${applicationId}/inspection-report`,
        `/api/dtdo/inspection-report/${applicationId}`,
      ];

  let lastError: unknown = new Error("Unable to load inspection report");

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (res.status === 404) {
        continue;
      }

      if (!res.ok) {
        const text = (await res.text()) || "Unable to load inspection report";
        throw new Error(text);
      }

      return (await res.json()) as InspectionReportSummary;
    } catch (error) {
      lastError = error;
      const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
      if (!message.includes("not allowed") && !message.includes("insufficient") && !message.includes("authentication")) {
        break;
      }
    }
  }

  return null;
}
