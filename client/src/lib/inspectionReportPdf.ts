import jsPDFImport from "jspdf";
import { format } from "date-fns";
import hpGovLogo from "@/assets/logos_tr/HP_Gov_TR.png?inline";
import hpTourismLogo from "@/assets/logos_tr/HP_Touris_TR.png?inline";
import { DESIRABLE_TOTAL, MANDATORY_TOTAL } from "@/constants/inspection";
import type { InspectionReportSummary } from "./inspection-report";

const jsPDF = (jsPDFImport as any).jsPDF || jsPDFImport;
type JsPDFInstance = any;

type LogoSpec = {
  width: number;
  x: number;
};

const LOGO_SPECS: LogoSpec[] = [
  { width: 28, x: 20 },
  { width: 32, x: 160 },
];

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed?.getTime?.())) {
    return "—";
  }
  return format(parsed, "dd/MM/yyyy");
};

export function generateInspectionReportPdf(summary: InspectionReportSummary) {
  const doc: JsPDFInstance = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const footerY = doc.internal.pageSize.getHeight() - 15;
  drawHeaderSection(doc, summary);
  drawStatusStrip(doc, summary);
  drawMetricCards(doc, summary);
  drawOwnerAndInspection(doc, summary);
  drawFindingsSection(doc, summary);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Auto-generated snapshot based on latest inspection data.", 105, footerY, { align: "center" });
  const fileName = `Inspection_Report_${summary.application.applicationNumber}.pdf`;
  doc.save(fileName);
}

function drawHeaderSection(doc: JsPDFInstance, summary: InspectionReportSummary) {
  doc.setFillColor(255);
  doc.roundedRect(18, 16, 174, 32, 3, 3, "S");
  doc.addImage(hpGovLogo, "PNG", 24, 18, 24, 24);
  doc.addImage(hpTourismLogo, "PNG", 162, 18, 24, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Government of Himachal Pradesh", 105, 26, { align: "center" });
  doc.setFontSize(17);
  doc.text("District Inspection Memorandum", 105, 34, { align: "center" });
  doc.setFontSize(10);
  doc.text(
    `Application #${summary.application.applicationNumber} \u2022 Homestay Registration 2025`,
    105,
    41,
    { align: "center" },
  );
}

function drawStatusStrip(doc: JsPDFInstance, summary: InspectionReportSummary) {
  const y = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("STATUS", 24, y);
  doc.text("INSPECTION WINDOW", 84, y);
  doc.text("REPORT SUBMITTED", 150, y);
  const computedStatus =
    (summary.application.siteInspectionOutcome || summary.report.recommendation || "Under Review")
      .replace(/_/g, " ")
      .trim()
      .toLowerCase();
  const displayStatus = computedStatus.includes("approve")
    ? "VERIFY FOR PAYMENT"
    : computedStatus.toUpperCase();
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(displayStatus, 24, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const startText = formatDate(summary.inspectionOrder?.inspectionDate);
  const endText = formatDate(summary.report.actualInspectionDate);
  doc.text(`${startText} - ${endText}`, 84, y + 6);
  doc.text(`${formatDate(summary.report.submittedDate)}`, 150, y + 6);
}

function drawMetricCards(doc: JsPDFInstance, summary: InspectionReportSummary) {
  const mandatoryChecklist = summary.report.mandatoryChecklist as Record<string, boolean> | null;
  const desirableChecklist = summary.report.desirableChecklist as Record<string, boolean> | null;
  const mandatoryChecked = mandatoryChecklist ? Object.values(mandatoryChecklist).filter(Boolean).length : 0;
  const desirableChecked = desirableChecklist ? Object.values(desirableChecklist).filter(Boolean).length : 0;

  const cards = [
    {
      title: "Application",
      primary: summary.application.applicationNumber,
      secondary: summary.application.propertyName,
    },
    {
      title: "Category",
      primary: (summary.report.recommendedCategory ?? summary.application.category).toUpperCase(),
      secondary: summary.report.categoryMeetsStandards ? "Meets standards" : "Requires review",
    },
    {
      title: "Mandatory Compliance",
      primary: `${Math.round((mandatoryChecked / MANDATORY_TOTAL) * 100)}%`,
      secondary: `${mandatoryChecked} of ${MANDATORY_TOTAL} met`,
    },
    {
      title: "Desirable Compliance",
      primary: `${Math.round((desirableChecked / DESIRABLE_TOTAL) * 100)}%`,
      secondary: `${desirableChecked} of ${DESIRABLE_TOTAL} met`,
    },
  ];

  cards.forEach((card, index) => {
    const x = 20 + (index % 2) * 92;
    const y = 60 + Math.floor(index / 2) * 30;
    doc.setDrawColor(220);
    doc.roundedRect(x, y, 86, 28, 3, 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(card.title.toUpperCase(), x + 4, y + 6);
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(card.primary, x + 4, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(card.secondary || "", x + 4, y + 22);
  });
}

function drawOwnerAndInspection(doc: JsPDFInstance, summary: InspectionReportSummary) {
  const blockY = 120;
  doc.setDrawColor(230);
  doc.roundedRect(20, blockY, 86, 42, 3, 3, "S");
  doc.roundedRect(112, blockY, 86, 42, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Property Owner", 24, blockY + 8);
  doc.text("Inspection Details", 116, blockY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const ownerLines = [
    summary.owner?.fullName ?? "—",
    summary.owner?.mobile ?? "",
    summary.owner?.email ?? "",
  ].filter(Boolean);
  ownerLines.forEach((line, idx) => doc.text(line, 24, blockY + 18 + idx * 5));

  const inspectionLines = [
    `Inspector: ${summary.da?.fullName ?? "—"}`,
    `Scheduled: ${formatDate(summary.inspectionOrder?.inspectionDate)}`,
    `Visited: ${formatDate(summary.report.actualInspectionDate)}`,
    `Report: ${formatDate(summary.report.submittedDate)}`,
  ];
  inspectionLines.forEach((line, idx) => doc.text(line, 116, blockY + 18 + idx * 5));
}

function drawFindingsSection(doc: JsPDFInstance, summary: InspectionReportSummary) {
  let cursorY = 170;
  doc.setDrawColor(220);
  doc.roundedRect(20, cursorY, 170, 58, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Inspection Findings", 24, cursorY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const findings = summary.report.detailedFindings?.trim() || "No remarks recorded.";
  let y = addWrappedText(doc, findings, 24, cursorY + 14, 162, 5);

  if (summary.application.siteInspectionNotes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("DTDO Notes", 24, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, summary.application.siteInspectionNotes, 24, y, 162, 5);
  }

  if (summary.inspectionOrder?.specialInstructions) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Special Instructions", 24, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    addWrappedText(doc, summary.inspectionOrder.specialInstructions, 24, y, 162, 5);
  }
}

function addWrappedText(
  doc: JsPDFInstance,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}
