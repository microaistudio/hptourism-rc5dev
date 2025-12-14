const DISTRICT_CODE_OVERRIDES: Record<string, string> = {
  shimla: "SML",
  "shimla division": "SML",
  "shimla hq": "SML",
  kullu: "KUL",
  "kullu dhalpur": "KUL",
  "kullu (bhuntar/manali)": "KUL",
  kangra: "KNG",
  dharamsala: "KNG",
  hamirpur: "HMP",
  una: "UNA",
  mandi: "MDI",
  chamba: "CHM",
  bharmour: "BRM",
  "lahaul": "LHL",
  "lahaul & spiti": "LHS",
  "lahaul and spiti": "LHS",
  kinnaur: "KNR",
  sirmaur: "SMR",
  solan: "SOL",
  bilaspur: "BIL",
  pangi: "PNG",
  kaza: "KZA",
};

const sanitizeDistrictLabel = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase();

export const getDistrictCode = (district?: string | null) => {
  const normalized = sanitizeDistrictLabel(district);
  if (!normalized) {
    return "HPG";
  }

  if (DISTRICT_CODE_OVERRIDES[normalized]) {
    return DISTRICT_CODE_OVERRIDES[normalized];
  }

  // Fall back to first three alphabetic characters
  const cleaned = normalized.replace(/[^a-z]/g, "");
  return cleaned.slice(0, 3).toUpperCase() || "HPG";
};

export const formatApplicationNumber = (
  sequence: number,
  district?: string | null,
) => {
  const year = String(new Date().getFullYear());
  const districtCode = getDistrictCode(district);
  const serial = String(sequence).padStart(6, "0");

  return `HP-HS-${year}-${districtCode}-${serial}`;
};

export const ensureDistrictCodeOnApplicationNumber = (
  applicationNumber: string,
  district?: string | null,
) => {
  if (/HP-HS-\d{4}-[A-Z]{3}-\d{6}/.test(applicationNumber)) {
    return applicationNumber;
  }

  const parts = applicationNumber.split("-");
  const yearCandidate =
    parts.length >= 3 && /^\d{4}$/.test(parts[2]) ? parts[2] : String(new Date().getFullYear());
  const serial = parts[parts.length - 1] || "000000";
  const districtCode = getDistrictCode(district);

  return `HP-HS-${yearCandidate}-${districtCode}-${serial.padStart(6, "0")}`;
};
