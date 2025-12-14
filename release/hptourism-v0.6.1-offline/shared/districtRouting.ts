const normalizeValue = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const CHAMBA_PANGI_TEHSILS = new Set(["pangi"]);
const CHAMBA_BHARMOUR_TEHSILS = new Set(["bharmour", "holi"]);
const LAHAUL_SPITI_KAZA_TEHSILS = new Set(["kaza", "spiti"]);

const canonicalLabels = {
  chamba: "Chamba",
  bharmour: "Bharmour",
  pangi: "Pangi",
  lahaul: "Lahaul",
  kaza: "Lahaul-Spiti (Kaza)",
};

const resolveChambaRouting = (tehsil?: string | null): string => {
  const normalizedTehsil = normalizeValue(tehsil);
  if (CHAMBA_PANGI_TEHSILS.has(normalizedTehsil)) {
    return canonicalLabels.pangi;
  }
  if (CHAMBA_BHARMOUR_TEHSILS.has(normalizedTehsil)) {
    return canonicalLabels.bharmour;
  }
  return canonicalLabels.chamba;
};

const resolveLahaulSpitiRouting = (tehsil?: string | null): string => {
  const normalizedTehsil = normalizeValue(tehsil);
  if (LAHAUL_SPITI_KAZA_TEHSILS.has(normalizedTehsil)) {
    return canonicalLabels.kaza;
  }
  return canonicalLabels.lahaul;
};

/**
 * Returns the canonical district routing label that should be stored on the application
 * and used for payment/DDO lookups.
 */
export const deriveDistrictRoutingLabel = (
  district?: string | null,
  tehsil?: string | null,
): string | undefined => {
  const normalizedDistrict = normalizeValue(district);
  if (!normalizedDistrict) {
    return district ?? undefined;
  }

  switch (normalizedDistrict) {
    case "chamba":
      return resolveChambaRouting(tehsil);
    case "lahaul and spiti":
    case "lahaul & spiti":
    case "lahaul-spiti":
    case "lahaul spiti":
      return resolveLahaulSpitiRouting(tehsil);
    default:
      return district ?? undefined;
  }
};
