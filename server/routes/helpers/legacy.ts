export const LEGACY_RC_PREFIX = "LEGACY-";
export const ADMIN_RC_ALLOWED_ROLES = ['admin_rc', 'admin', 'super_admin'] as const;
export const LEGACY_CATEGORY_OPTIONS = ['diamond', 'gold', 'silver'] as const;
export const LEGACY_LOCATION_TYPES = ['mc', 'tcp', 'gp'] as const;
export const LEGACY_PROPERTY_OWNERSHIP = ['owned', 'leased'] as const;
export const LEGACY_OWNER_GENDERS = ['male', 'female', 'other'] as const;
export const LEGACY_STATUS_OPTIONS = [
  'draft',
  'legacy_rc_review',
  'submitted',
  'under_scrutiny',
  'forwarded_to_dtdo',
  'dtdo_review',
  'inspection_scheduled',
  'inspection_under_review',
  'verified_for_payment',
  'payment_pending',
  'approved',
  'rejected',
] as const;

export const LEGACY_DTD0_FORWARD_SETTING_KEY = "legacy_dtdo_forward_enabled";

import { getDistrictCode } from "@shared/applicationNumber";
import { db } from "../../db";
import { homestayApplications, systemSettings } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const LEGACY_SERIAL_SEED_KEY = "legacy_application_serial_seed";

const getLegacySerialSeed = async () => {
  const seedRow = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, LEGACY_SERIAL_SEED_KEY))
    .limit(1);
  const seedValue = seedRow?.[0]?.value ? parseInt(seedRow[0].value, 10) : 0;
  return Number.isFinite(seedValue) && seedValue > 0 ? seedValue : 0;
};

export const generateLegacyApplicationNumber = async (district?: string | null) => {
  const year = String(new Date().getFullYear());
  const districtCode = getDistrictCode(district);
  const [row] = await db
    .select({
      maxSerial: sql<number>`COALESCE(MAX(CAST(substring(${homestayApplications.applicationNumber} from '([0-9]+)$') AS INTEGER)), 0)`,
    })
    .from(homestayApplications)
    .where(sql`substring(${homestayApplications.applicationNumber} from '^LG-HS') IS NOT NULL`);

  const maxSerial = row?.maxSerial ?? 0;
  const seed = await getLegacySerialSeed();
  const baseline = Math.max(maxSerial, seed - 1);
  const serial = String(baseline + 1).padStart(6, "0");

  // LG-HS mirrors HP-HS numbering but clearly separates legacy RC onboarding
  return `LG-HS-${year}-${districtCode}-${serial}`;
};

import { getSystemSettingRecord } from "../../services/systemSettings";
import { normalizeBooleanSetting } from "@shared/appSettings";

export const getLegacyForwardEnabled = async () => {
  const record = await getSystemSettingRecord(LEGACY_DTD0_FORWARD_SETTING_KEY);
  return normalizeBooleanSetting(record?.settingValue, true);
};
