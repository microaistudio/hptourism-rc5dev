export const ENFORCE_CATEGORY_SETTING_KEY = "enforce_property_category";
export const DA_SEND_BACK_SETTING_KEY = "da_send_back_enabled";
export const LEGACY_DTD0_FORWARD_SETTING_KEY = "legacy_dtdo_forward_enabled";
export const LOGIN_OTP_SETTING_KEY = "login_otp_required";
export const ROOM_RATE_BANDS_SETTING_KEY = "category_rate_bands";
export const ROOM_CALC_MODE_SETTING_KEY = "room_calc_mode";
export const EXISTING_RC_MIN_ISSUE_DATE_SETTING_KEY = "existing_owner_min_issue_date";

export type CategoryEnforcementSetting = {
  enforce: boolean;
  lockToRecommended: boolean;
};

export const DEFAULT_CATEGORY_ENFORCEMENT: CategoryEnforcementSetting = {
  enforce: false,
  lockToRecommended: false,
};

export type CategoryRateBands = {
  silver: { min: number; max: number | null };
  gold: { min: number; max: number | null };
  diamond: { min: number; max: number | null };
};

export const DEFAULT_CATEGORY_RATE_BANDS: CategoryRateBands = {
  silver: { min: 1, max: 2999 },
  gold: { min: 3000, max: 10000 },
  diamond: { min: 10000, max: null },
};

export type RoomCalcMode = "buckets" | "direct";
export type RoomCalcModeSetting = { mode: RoomCalcMode };

export const DEFAULT_ROOM_CALC_MODE: RoomCalcModeSetting = { mode: "direct" };

export const normalizeBooleanSetting = (
  value: unknown,
  defaultValue = false,
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  if (value && typeof value === "object") {
    const candidate = (value as Record<string, unknown>).enabled;
    if (typeof candidate === "boolean") {
      return candidate;
    }
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
  }

  return defaultValue;
};

export const normalizeCategoryEnforcementSetting = (
  value: unknown,
): CategoryEnforcementSetting => {
  const normalizeObject = (obj: Record<string, unknown>): CategoryEnforcementSetting => ({
    enforce: typeof obj.enforce === "boolean" ? obj.enforce : false,
    lockToRecommended:
      typeof obj.lockToRecommended === "boolean" ? obj.lockToRecommended : false,
  });

  if (typeof value === "boolean") {
    return { enforce: value, lockToRecommended: false };
  }

  if (value && typeof value === "object") {
    return normalizeObject(value as Record<string, unknown>);
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return { enforce: true, lockToRecommended: false };
    }
    if (value.toLowerCase() === "false") {
      return { enforce: false, lockToRecommended: false };
    }
  }

  return DEFAULT_CATEGORY_ENFORCEMENT;
};

export const normalizeCategoryRateBands = (value: unknown): CategoryRateBands => {
  const normalizeBand = (
    band: Partial<{ min: unknown; max: unknown }> | undefined,
    fallback: { min: number; max: number | null },
  ) => {
    const min =
      typeof band?.min === "number" && Number.isFinite(band.min)
        ? Math.max(0, Math.floor(band.min))
        : fallback.min;

    if (fallback.max === null) {
      return {
        min,
        max: null,
      };
    }

    const rawMax =
      typeof band?.max === "number" && Number.isFinite(band.max)
        ? Math.max(min, Math.floor(band.max))
        : band?.max === null
          ? null
          : fallback.max;
    return {
      min,
      max: rawMax === null ? null : rawMax,
    };
  };

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return {
      silver: normalizeBand(obj.silver as Record<string, unknown>, DEFAULT_CATEGORY_RATE_BANDS.silver),
      gold: normalizeBand(obj.gold as Record<string, unknown>, DEFAULT_CATEGORY_RATE_BANDS.gold),
      diamond: normalizeBand(obj.diamond as Record<string, unknown>, DEFAULT_CATEGORY_RATE_BANDS.diamond),
    };
  }

  return DEFAULT_CATEGORY_RATE_BANDS;
};

export const DEFAULT_EXISTING_RC_MIN_ISSUE_DATE = "2022-01-01";

export const normalizeIsoDateSetting = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length >= 4) {
    return value.trim();
  }
  if (value && typeof value === "object" && typeof (value as Record<string, unknown>).date === "string") {
    return String((value as Record<string, unknown>).date);
  }
  return fallback;
};

export const normalizeRoomCalcModeSetting = (value: unknown): RoomCalcModeSetting => {
  const normalizeMode = (mode?: string | null): RoomCalcMode => {
    if (mode === "buckets" || mode === "direct") {
      return mode;
    }
    return DEFAULT_ROOM_CALC_MODE.mode;
  };

  if (typeof value === "string") {
    return { mode: normalizeMode(value.trim().toLowerCase()) };
  }

  if (value && typeof value === "object") {
    const candidate = (value as Record<string, unknown>).mode;
    return { mode: normalizeMode(typeof candidate === "string" ? candidate.trim().toLowerCase() : undefined) };
  }

  return DEFAULT_ROOM_CALC_MODE;
};
