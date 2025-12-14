import jsPDFImport from "jspdf";
import type { HomestayApplication } from "@shared/schema";
import hpGovLogo from "@/assets/logos_tr/HP_Gov_TR.png?inline";
import hpTourismLogo from "@/assets/logos_tr/HP_Touris_TR.png?inline";
import type { InspectionReportSummary } from "@/lib/inspection-report";

const jsPDF = (jsPDFImport as any).jsPDF || jsPDFImport;
type JsPDFInstance = any;

export type CertificateFormat = "policy_portrait" | "policy_landscape" | "policy_heritage";

type RGB = [number, number, number];

type ThemeColors = {
  primary: RGB;
  accent: RGB;
  text: RGB;
  borderOuter: RGB;
  borderInner: RGB;
  background?: RGB;
};

type PolicyLayout = {
  orientation: "portrait" | "landscape";
  marginX: number;
  marginTop: number;
  headerSpacing: number;
  bodyLineHeight: number;
  tableColumns: [number, number, number, number];
  tableRowHeight: number;
  colors: ThemeColors;
  showLogos?: boolean;
};

type CertificateOptions = {
  inspectionReport?: InspectionReportSummary | null;
};

const POLICY_LAYOUTS: Record<CertificateFormat, PolicyLayout> = {
  policy_portrait: {
    orientation: "portrait",
    marginX: 24,
    marginTop: 28,  // Reduced from 34 to move content up
    headerSpacing: 8,  // Increased for more gap
    bodyLineHeight: 5.4,
    tableColumns: [14, 70, 26, 52],  // Adjusted: smaller details, bigger rent column
    tableRowHeight: 9,
    colors: {
      primary: [19, 73, 138],
      accent: [19, 73, 138],
      text: [33, 37, 41],
      borderOuter: [21, 71, 138],
      borderInner: [21, 71, 138],
    },
    showLogos: true,
  },
  policy_landscape: {
    orientation: "landscape",
    marginX: 30,
    marginTop: 26,
    headerSpacing: 6,
    bodyLineHeight: 5,
    tableColumns: [16, 122, 34, 60],
    tableRowHeight: 8.2,
    colors: {
      primary: [19, 73, 138],
      accent: [19, 73, 138],
      text: [33, 37, 41],
      borderOuter: [21, 71, 138],
      borderInner: [21, 71, 138],
    },
    showLogos: true,
  },
  policy_heritage: {
    orientation: "portrait",
    marginX: 24,
    marginTop: 28,  // Reduced from 34 to move content up
    headerSpacing: 8,  // Increased for more gap
    bodyLineHeight: 5.2,
    tableColumns: [14, 70, 26, 52],  // Adjusted: smaller details, bigger rent column
    tableRowHeight: 9,
    colors: {
      primary: [92, 54, 14],
      accent: [171, 119, 44],
      text: [66, 47, 27],
      borderOuter: [92, 54, 14],
      borderInner: [202, 160, 95],
      background: [253, 246, 233],
    },
    showLogos: true,
  },
};

const CATEGORY_NOTES: Record<string, string> = {
  diamond: "Tariff Rs. 10,000 and above per room per day",
  gold: "Tariff between Rs. 3,000 and Rs. 9,999 per room per day",
  silver: "Tariff less than Rs. 3,000 per room per day",
};

// Room rate text based on category
const CATEGORY_RATE_TEXT: Record<string, string> = {
  diamond: "Room Rate Rs. 10,000/- or above per room per day",
  gold: "Room Rate between Rs. 3,000/- to Rs. 9,999/- per room per day",
  silver: "Room Rate less than Rs. 3,000/- per room per day",
};

const BLANK = "__________";

const LOGO_SPECS = {
  gov: {
    aspectRatio: 148 / 194,
    portraitWidth: 27,   // Reduced by 10% (was 30)
    landscapeWidth: 22,  // Reduced by 10%
  },
  tourism: {
    aspectRatio: 176 / 195,
    portraitWidth: 27,   // Reduced by 15% (was 32)
    landscapeWidth: 22,  // Reduced by 15%
  },
} as const;

export function generateCertificatePDF(
  application: HomestayApplication,
  format: CertificateFormat = "policy_heritage",
  options?: CertificateOptions,
) {
  const layout = POLICY_LAYOUTS[format];
  const doc = new jsPDF({
    orientation: layout.orientation,
    unit: "mm",
    format: "a4",
  });

  renderPolicyCertificate(doc, application, layout, options);

  const certificateId = sanitizeFileSegment(application.certificateNumber || "N_A");
  doc.save(`HP_Homestay_Certificate_${certificateId}_${format}.pdf`);
}

function renderPolicyCertificate(
  doc: JsPDFInstance,
  application: HomestayApplication,
  layout: PolicyLayout,
  options?: CertificateOptions,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - layout.marginX * 2;
  const spacingScale = layout.orientation === "portrait" ? 1 : 0.82;

  drawBorder(doc, pageWidth, pageHeight, layout);
  const logoBottom = drawLogos(doc, pageWidth, hpGovLogo, hpTourismLogo, layout);
  let cursorY = Math.max(layout.marginTop, logoBottom + 8);
  cursorY = drawHeader(doc, cursorY, pageWidth, layout);

  doc.setFont("times", "normal");
  doc.setFontSize(11.2);
  doc.setTextColor(...layout.colors.text);
  cursorY += 12 * spacingScale;  // Increased from 9 to 12 for 3mm more space after header

  doc.setFont("times", "bold");
  doc.text(`RC No.: ${valueOrBlank(application.certificateNumber)}`, layout.marginX, cursorY);
  doc.text(`Valid till: ${formatDateLine(application.certificateExpiryDate)}`, pageWidth - layout.marginX, cursorY, { align: "right" });

  cursorY += 11 * spacingScale;
  doc.setFont("times", "normal");

  const propertyName = valueOrBlank(application.propertyName);
  const touristArea = valueOrBlank(resolveTouristArea(application));
  const ownerHonorific = getOwnerHonorific(application.ownerGender);
  const ownerName = valueOrBlank(application.ownerName);
  const guardianName = valueOrBlank(resolveGuardianName(application));
  const categoryLabel = formatCategoryLabel(application.category);
  const categoryNote = CATEGORY_NOTES[(application.category || "").toLowerCase()];

  cursorY = writeParagraph(
    doc,
    `This is to certify that the Home Stay unit known as ${propertyName} located in the tourist area ${touristArea} has been registered with the Department of Tourism & Civil Aviation, Himachal Pradesh.`,
    {
      x: layout.marginX,
      y: cursorY,
      maxWidth: usableWidth,
      lineHeight: layout.bodyLineHeight,
    },
  );

  cursorY = writeParagraph(
    doc,
    "The Home Stay unit is to be operated / being operated by:",
    {
      x: layout.marginX,
      y: cursorY + 2 * spacingScale,
      maxWidth: usableWidth,
      lineHeight: layout.bodyLineHeight,
    },
  );

  doc.setFont("times", "bold");
  // Owner name - bold and centered with correct relation
  const relationPrefix = getRelationPrefix(application.ownerGender);
  // Note: guardian name should NOT have "Shri" prefix - it's already implied
  const ownerLine = `${ownerHonorific} ${ownerName} ${relationPrefix} ${guardianName}`;
  doc.text(ownerLine, pageWidth / 2, cursorY + 3 * spacingScale, { align: "center" });
  cursorY = cursorY + 3 * spacingScale + layout.bodyLineHeight;
  doc.setFont("times", "normal");

  cursorY = writeParagraph(
    doc,
    "Proprietor / Owner(s) / Promoter(s) of the said Home Stay unit has been registered under the Himachal Pradesh Tourism Development and Registration Act, 2002 and the rules made thereunder.",
    {
      x: layout.marginX,
      y: cursorY + 2 * spacingScale,
      maxWidth: usableWidth,
      lineHeight: layout.bodyLineHeight,
    },
  );

  cursorY += 4 * spacingScale;
  doc.setFont("times", "bold");
  doc.text(`Category: ${categoryLabel}`, layout.marginX, cursorY);
  if (categoryNote) {
    doc.setFont("times", "italic");
    doc.setFontSize(10.2);
    doc.text(`(${categoryNote})`, layout.marginX + 40, cursorY);
    doc.setFontSize(11.2);
  }
  doc.setFont("times", "normal");

  cursorY += 8 * spacingScale;
  cursorY = drawAccommodationTable(doc, application, layout, cursorY);

  cursorY += 5 * spacingScale;
  cursorY = writeParagraph(doc, "Note: Total number of beds shall not exceed 12.", {
    x: layout.marginX,
    y: cursorY,
    maxWidth: usableWidth,
    lineHeight: layout.bodyLineHeight,
    fontSize: 10.2,
    fontStyle: "italic",
  });

  cursorY += 5 * spacingScale;
  cursorY = writeParagraph(doc, `Registered address: ${buildAddress(application)}`, {
    x: layout.marginX,
    y: cursorY,
    maxWidth: usableWidth,
    lineHeight: layout.bodyLineHeight,
    fontSize: 10.5,
  });

  if (options?.inspectionReport) {
    cursorY += 6 * spacingScale;
    cursorY = appendInspectionReference(doc, options.inspectionReport, {
      x: layout.marginX,
      y: cursorY,
      maxWidth: usableWidth,
      lineHeight: layout.bodyLineHeight,
    });
  }

  const instructions = [
    "Display this certificate prominently at the Homestay property.",
    "Registration remains subject to adherence with HP Homestay Rules 2025.",
    "Any change in ownership or property configuration must be reported for revalidation.",
  ];

  const bottomSafeLimit = pageHeight - 18;
  const signatureBlockHeight = 28 * spacingScale;
  const instructionsHeight = instructions.length * (layout.bodyLineHeight + 0.5) + 10;
  const upcomingBlock = 12 * spacingScale + signatureBlockHeight + instructionsHeight;
  if (cursorY + upcomingBlock > bottomSafeLimit) {
    cursorY = Math.max(layout.marginTop, bottomSafeLimit - upcomingBlock);
  }

  cursorY += 10 * spacingScale;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(`Place: ${valueOrBlank(resolvePlace(application))}`, layout.marginX, cursorY);
  cursorY += layout.bodyLineHeight;
  doc.text(`Date: ${formatDateLine(application.certificateIssuedDate)}`, layout.marginX, cursorY);

  const signatureOffset = 8 * spacingScale;
  let signatureY = cursorY + signatureOffset;
  const signatureTail = 14 * spacingScale;
  if (signatureY + signatureTail > bottomSafeLimit) {
    const adjustment = signatureY + signatureTail - bottomSafeLimit;
    signatureY -= adjustment;
  }

  doc.setDrawColor(140, 101, 52);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - layout.marginX - 50, signatureY - 2, pageWidth - layout.marginX, signatureY - 2);

  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.text("(Prescribed Authority)", pageWidth - layout.marginX, signatureY + 2, { align: "right" });
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("District Tourism Development Officer", pageWidth - layout.marginX, signatureY + 8, { align: "right" });
  doc.setFont("times", "normal");
  doc.text(valueOrBlank(application.district), pageWidth - layout.marginX, signatureY + 14, { align: "right" });

  const instructionsLineHeight = layout.bodyLineHeight + 1.5;  // Increased spacing
  const instructionsPadding = 14;
  const totalInstructionsHeight = instructions.length * (instructionsLineHeight + 2) + instructionsPadding;
  const instructionStart = Math.max(signatureY + 20, pageHeight - layout.marginTop - totalInstructionsHeight);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Important Instructions:", layout.marginX, instructionStart);
  doc.setFont("times", "normal");
  doc.setFontSize(10.3);
  let instructionY = instructionStart + 7;  // More space after header
  instructions.forEach((line) => {
    const bullet = "• ";
    const wrapped = doc.splitTextToSize(`${bullet}${line}`, usableWidth) as string[];
    wrapped.forEach((textLine, idx) => {
      const drawX = idx === 0 ? layout.marginX : layout.marginX + 4;
      doc.text(textLine, drawX, instructionY);
      instructionY += layout.bodyLineHeight + 0.5;  // Added extra spacing between lines
    });
    instructionY += 1;  // Extra spacing between bullet points
  });
}

function drawBorder(doc: JsPDFInstance, pageWidth: number, pageHeight: number, layout: PolicyLayout) {
  const outerMargin = 8;
  if (layout.colors.background) {
    doc.setFillColor(...layout.colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  }
  doc.setDrawColor(...layout.colors.borderOuter);
  doc.setLineWidth(layout.colors.background ? 1.4 : 1.2);
  doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2);
  doc.setDrawColor(...layout.colors.borderInner);
  doc.setLineWidth(layout.colors.background ? 0.9 : 0.6);
  doc.rect(outerMargin + 4, outerMargin + 4, pageWidth - (outerMargin + 4) * 2, pageHeight - (outerMargin + 4) * 2);
}

function drawLogos(
  doc: JsPDFInstance,
  pageWidth: number,
  govLogo: string,
  tourismLogo: string,
  layout: PolicyLayout,
): number {
  if (layout.showLogos === false) {
    return layout.marginTop - 6;
  }
  const orientationKey = layout.orientation === "portrait" ? "portraitWidth" : "landscapeWidth";
  const govWidth = LOGO_SPECS.gov[orientationKey];
  const govHeight = govWidth * LOGO_SPECS.gov.aspectRatio;
  const tourismWidth = LOGO_SPECS.tourism[orientationKey];
  const tourismHeight = tourismWidth * LOGO_SPECS.tourism.aspectRatio;
  const buffer = 4;
  const logoY = Math.max(10, layout.marginTop - 14);  // Shifted up
  const drawLogo = (image: string, x: number, width: number, height: number) => {
    doc.addImage(image, "PNG", x, logoY, width, height);
    return logoY + height;
  };
  const govBottom = govLogo ? drawLogo(govLogo, layout.marginX, govWidth, govHeight) : logoY;
  const tourismBottom = tourismLogo
    ? drawLogo(tourismLogo, pageWidth - layout.marginX - tourismWidth, tourismWidth, tourismHeight)
    : logoY;
  doc.setDrawColor(...layout.colors.accent);
  doc.setLineWidth(0.6);
  doc.line(layout.marginX, Math.max(govBottom, tourismBottom) + 2, pageWidth - layout.marginX, Math.max(govBottom, tourismBottom) + 2);
  return Math.max(govBottom, tourismBottom) + 2;
}

function appendInspectionReference(
  doc: JsPDFInstance,
  summary: InspectionReportSummary,
  area: { x: number; y: number; maxWidth: number; lineHeight: number },
) {
  let cursorY = area.y;
  const outcome = (summary.application.siteInspectionOutcome || summary.report.recommendation || "Pending").replace(
    /_/g,
    " ",
  );
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Inspection Reference", area.x, cursorY);
  cursorY += area.lineHeight;

  doc.setFont("times", "normal");
  doc.setFontSize(10.3);
  const infoLines = [
    `Inspection ID: ${summary.report.id}`,
    `Report filed on ${formatDateLine(summary.report.submittedDate)} by ${summary.da?.fullName ?? "Field Officer"}`,
    `Field inspection: ${formatDateLine(summary.report.actualInspectionDate)} | Recommendation: ${outcome}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, area.x, cursorY);
    cursorY += area.lineHeight;
  });

  const findings = summary.report.detailedFindings?.trim();
  if (findings) {
    cursorY = writeParagraph(doc, findings, {
      x: area.x,
      y: cursorY + 1,
      maxWidth: area.maxWidth,
      lineHeight: area.lineHeight,
      fontSize: 10.3,
    });
  }

  if (summary.report.reportDocumentUrl) {
    cursorY += area.lineHeight;
    doc.setFont("times", "italic");
    doc.text("Full inspection dossier is archived in the eServices portal.", area.x, cursorY);
    doc.setFont("times", "normal");
  }

  return cursorY;
}

function drawHeader(doc: JsPDFInstance, startY: number, pageWidth: number, layout: PolicyLayout) {
  let cursorY = startY;
  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...layout.colors.primary);
  doc.text("GOVERNMENT OF HIMACHAL PRADESH", pageWidth / 2, cursorY, { align: "center" });

  cursorY += layout.headerSpacing;
  doc.setFontSize(13);
  doc.text("DEPARTMENT OF TOURISM & CIVIL AVIATION", pageWidth / 2, cursorY, { align: "center" });

  cursorY += layout.headerSpacing;
  doc.setFontSize(12);
  doc.text("CERTIFICATE OF REGISTRATION OF A HOME STAY UNIT", pageWidth / 2, cursorY, { align: "center" });

  doc.setTextColor(...layout.colors.text);
  return cursorY;
}

function drawAccommodationTable(
  doc: JsPDFInstance,
  application: HomestayApplication,
  layout: PolicyLayout,
  startY: number,
) {
  // Get actual rates from application data
  const singleRate = formatRoomRate(application.singleBedRoomRate);
  const doubleRate = formatRoomRate(application.doubleBedRoomRate);
  const suiteRate = formatRoomRate((application as any).familySuiteRate); // May not exist

  const rows = [
    {
      sl: "1.",
      label: "Single bed rooms",
      count: formatRooms(application.singleBedRooms),
      rate: application.singleBedRooms && application.singleBedRooms > 0 ? singleRate : "-",
    },
    {
      sl: "2.",
      label: "Double bed rooms",
      count: formatRooms(application.doubleBedRooms),
      rate: application.doubleBedRooms && application.doubleBedRooms > 0 ? doubleRate : "-",
    },
    {
      sl: "3.",
      label: "Family suite",
      count: formatRooms(application.familySuites),
      rate: application.familySuites && application.familySuites > 0 ? suiteRate : "-",
    },
  ];

  const header = ["Sl.No.", "Details of accommodation", "No. of rooms", "Proposed room rent per day"];
  const totalWidth = layout.tableColumns.reduce((sum, width) => sum + width, 0);
  const xStart = layout.marginX;
  const totalHeight = layout.tableRowHeight * (rows.length + 1);

  doc.setDrawColor(...layout.colors.text);
  doc.setLineWidth(0.4);
  doc.rect(xStart, startY, totalWidth, totalHeight);
  doc.setFillColor(248, 234, 208);
  doc.rect(xStart, startY, totalWidth, layout.tableRowHeight, "F");

  // Column boundaries
  let offsetX = xStart;
  for (const width of layout.tableColumns) {
    doc.line(offsetX, startY, offsetX, startY + totalHeight);
    offsetX += width;
  }
  doc.line(offsetX, startY, offsetX, startY + totalHeight);

  // Row boundaries
  let offsetY = startY + layout.tableRowHeight;
  for (let i = 0; i < rows.length; i++) {
    doc.line(xStart, offsetY, xStart + totalWidth, offsetY);
    offsetY += layout.tableRowHeight;
  }

  // Header
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...layout.colors.primary);
  offsetX = xStart;
  header.forEach((text, index) => {
    drawCellText(doc, text, offsetX, startY, layout.tableColumns[index], layout.tableRowHeight, index === 1 ? "left" : "center");
    offsetX += layout.tableColumns[index];
  });

  // Rows
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...layout.colors.text);
  rows.forEach((row, rowIndex) => {
    const rowY = startY + layout.tableRowHeight * (rowIndex + 1);
    let cellX = xStart;
    drawCellText(doc, row.sl, cellX, rowY, layout.tableColumns[0], layout.tableRowHeight, "center");
    cellX += layout.tableColumns[0];
    drawCellText(doc, row.label, cellX, rowY, layout.tableColumns[1], layout.tableRowHeight, "left");
    cellX += layout.tableColumns[1];
    drawCellText(doc, row.count, cellX, rowY, layout.tableColumns[2], layout.tableRowHeight, "center");
    cellX += layout.tableColumns[2];
    drawCellText(doc, row.rate, cellX, rowY, layout.tableColumns[3], layout.tableRowHeight, "center");
  });

  return startY + totalHeight;
}

function drawCellText(
  doc: JsPDFInstance,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  align: "left" | "center" | "right",
) {
  const paddingX = 3;
  const paddingY = 2.2;
  const maxWidth = Math.max(width - paddingX * 2, 10);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  const lineHeight = 4;
  let textY = y + paddingY + lineHeight / 2;

  for (const line of lines) {
    if (align === "center") {
      doc.text(line, x + width / 2, textY, { align: "center" });
    } else if (align === "right") {
      doc.text(line, x + width - paddingX, textY, { align: "right" });
    } else {
      doc.text(line, x + paddingX, textY);
    }
    textY += lineHeight;
  }
}

function writeParagraph(
  doc: JsPDFInstance,
  text: string,
  options: { x: number; y: number; maxWidth: number; lineHeight?: number; fontSize?: number; fontStyle?: "normal" | "bold" | "italic"; color?: RGB },
) {
  const { x, y, maxWidth, lineHeight = 5.2, fontSize = 11, fontStyle = "normal", color } = options;
  doc.setFont("times", fontStyle);
  doc.setFontSize(fontSize);
  if (color) {
    doc.setTextColor(color[0], color[1], color[2]);
  }
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let cursorY = y;
  for (const line of lines) {
    doc.text(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function formatDateLine(value?: string | Date | null) {
  const formatted = formatDate(value);
  return formatted ?? BLANK;
}

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const resolvedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(resolvedDate.getTime())) {
    return null;
  }
  return resolvedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && value.trim().length > 0 && /[<>]/.test(value)) {
    return value.trim();
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `₹${numeric.toLocaleString("en-IN")}/-`;
}

function formatRooms(value?: number | null) {
  if (!value || value <= 0) {
    return "—";
  }
  return `${value}`;
}

function resolveTouristArea(application: HomestayApplication) {
  const parts = [
    application.gramPanchayat,
    application.block,
    application.tehsil,
    application.urbanBody,
    application.district,
  ].filter((value) => value && value.trim());
  if (parts.length > 0) {
    return parts.join(", ");
  }
  if (application.address) {
    return application.address;
  }
  return application.district || "";
}

function resolvePlace(application: HomestayApplication) {
  return (
    application.district ||
    application.tehsil ||
    application.block ||
    application.urbanBody ||
    application.gramPanchayat ||
    application.address ||
    ""
  );
}

function resolveGuardianName(application: HomestayApplication) {
  if (typeof application.guardianName === "string" && application.guardianName.trim()) {
    return application.guardianName.trim();
  }
  const contextName = (application.serviceContext as any)?.legacyGuardianName;
  if (typeof contextName === "string" && contextName.trim()) {
    return contextName.trim();
  }
  const potentialFields = ["ownerGuardianName", "ownerParentName", "ownerParentage", "ownerFatherName", "ownerSpouseName"];
  const record = application as Record<string, unknown>;
  for (const field of potentialFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof console !== "undefined") {
    const identifier = application.applicationNumber || application.id || "unknown-id";
    console.warn(`[certificate] Guardian/father name missing for application ${identifier}. Please update the record in Admin RC queue.`);
  }
  return "";
}

function buildAddress(application: HomestayApplication) {
  const segments = [
    application.address,
    application.gramPanchayat,
    application.tehsil,
    application.district,
    application.pincode ? `PIN: ${application.pincode}` : "",
  ].filter((segment) => segment && segment.trim());
  return segments.join(", ") || BLANK;
}

function getOwnerHonorific(gender?: string | null) {
  if (gender === "female") return "Smt.";  // Shrimati
  if (gender === "male") return "Sh.";    // Sh. for consistency
  return "Sh.";  // Default to Sh.
}

// Get the correct relation prefix based on gender
function getRelationPrefix(gender?: string | null) {
  if (gender === "female") return "w/o"; // wife of
  if (gender === "male") return "s/o";   // son of
  return "s/o";  // default to son of
}

// Format room rate as currency
function formatRoomRate(rate?: string | number | null): string {
  if (rate === null || rate === undefined) return "—";
  const numericRate = typeof rate === "string" ? parseFloat(rate) : rate;
  if (!Number.isFinite(numericRate) || numericRate <= 0) return "—";
  return `₹${numericRate.toLocaleString("en-IN")}/-`;
}

function formatCategoryLabel(category?: string | null) {
  if (!category) return BLANK;
  return category.trim().toUpperCase();
}

function valueOrBlank(value?: string | null) {
  if (value === null || value === undefined) {
    return BLANK;
  }
  const trimmed = value.toString().trim();
  return trimmed || BLANK;
}

function sanitizeFileSegment(value: string) {
  return value.replace(/[^\w.-]+/g, "_");
}
