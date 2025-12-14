import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemSettings } from "@shared/schema";
import {
  DEFAULT_UPLOAD_POLICY,
  UPLOAD_POLICY_SETTING_KEY,
  normalizeUploadPolicy,
  type UploadPolicy,
} from "@shared/uploadPolicy";
import { logger } from "../logger";

const uploadPolicyLog = logger.child({ module: "upload-policy" });

export async function getUploadPolicy(): Promise<UploadPolicy> {
  try {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, UPLOAD_POLICY_SETTING_KEY))
      .limit(1);

    if (!setting) {
      return DEFAULT_UPLOAD_POLICY;
    }

    return normalizeUploadPolicy(setting.settingValue);
  } catch (error) {
    uploadPolicyLog.error("Failed to fetch upload policy, falling back to defaults", error);
    return DEFAULT_UPLOAD_POLICY;
  }
}
