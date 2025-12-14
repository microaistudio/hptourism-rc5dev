import { eq } from "drizzle-orm";
import { systemSettings } from "../../shared/schema";
import { db } from "../db";
import { getHimKoshConfig } from "./config";

export const HIMKOSH_GATEWAY_SETTING_KEY = "himkosh_gateway";

export type HimkoshGatewaySettingValue = {
  merchantCode?: string;
  deptId?: string;
  serviceCode?: string;
  ddo?: string;
  head1?: string;
  head2?: string;
  head2Amount?: number;
  returnUrl?: string;
  allowFallback?: boolean;
};

export const trimMaybe = (value?: string | null) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

export async function getHimkoshGatewaySettingRecord() {
  const [record] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, HIMKOSH_GATEWAY_SETTING_KEY))
    .limit(1);
  return record ?? null;
}

export const mergeHimkoshConfig = <T extends ReturnType<typeof getHimKoshConfig>>(
  baseConfig: T,
  overrides?: HimkoshGatewaySettingValue | null,
) => {
  if (!overrides) {
    return baseConfig;
  }

  const heads = {
    registrationFee: trimMaybe(overrides.head1) || baseConfig.heads.registrationFee,
    secondaryHead:
      overrides.head2 !== undefined ? trimMaybe(overrides.head2) || undefined : baseConfig.heads.secondaryHead,
    secondaryHeadAmount:
      overrides.head2Amount !== undefined ? overrides.head2Amount : baseConfig.heads.secondaryHeadAmount,
  };

  return {
    ...baseConfig,
    merchantCode: trimMaybe(overrides.merchantCode) || baseConfig.merchantCode,
    deptId: trimMaybe(overrides.deptId) || baseConfig.deptId,
    serviceCode: trimMaybe(overrides.serviceCode) || baseConfig.serviceCode,
    ddo: trimMaybe(overrides.ddo) || baseConfig.ddo,
    heads,
    returnUrl: trimMaybe(overrides.returnUrl) || baseConfig.returnUrl,
    configStatus: overrides ? "database_override" : baseConfig.configStatus,
  };
};

export const sanitizeHimkoshGatewaySetting = (value?: HimkoshGatewaySettingValue | null) => {
  if (!value) return null;
  return {
    merchantCode: trimMaybe(value.merchantCode) ?? "",
    deptId: trimMaybe(value.deptId) ?? "",
    serviceCode: trimMaybe(value.serviceCode) ?? "",
    ddo: trimMaybe(value.ddo) ?? "",
    head1: trimMaybe(value.head1) ?? "",
    head2: trimMaybe(value.head2) ?? "",
    head2Amount: parseOptionalNumber(value.head2Amount) ?? undefined,
    returnUrl: trimMaybe(value.returnUrl) ?? "",
    allowFallback: Boolean(value.allowFallback),
  };
};

export async function resolveHimkoshGatewayConfig() {
  const base = getHimKoshConfig();
  const record = await getHimkoshGatewaySettingRecord();
  const overrides = (record?.settingValue as HimkoshGatewaySettingValue) ?? null;
  const config = mergeHimkoshConfig(base, overrides);
  return { config, overrides, record };
}
