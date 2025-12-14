import { randomInt } from "crypto";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { loginOtpChallenges, passwordResetChallenges, type User } from "@shared/schema";
import { lookupStaffAccountByIdentifier, lookupStaffAccountByMobile } from "@shared/districtStaffManifest";
import { storage } from "../../storage";
import { queueNotification } from "../../services/notifications";
import { LOGIN_OTP_SETTING_KEY, normalizeBooleanSetting } from "@shared/appSettings";
import { getSystemSettingRecord } from "../../services/systemSettings";
import { logger } from "../../logger";
import { NotificationEventId } from "@shared/notifications";

const authLog = logger.child({ module: "auth-utils" });

const LOGIN_OTP_CODE_LENGTH = 6;
const LOGIN_OTP_EXPIRY_MINUTES = 10;
const PASSWORD_RESET_EXPIRY_MINUTES = 10;

export type PasswordResetChannel = "sms" | "email";

export const maskMobileNumber = (mobile?: string | null) => {
  if (!mobile) {
    return "";
  }
  const digits = mobile.replace(/\s+/g, "");
  if (digits.length <= 4) {
    return digits;
  }
  const visible = digits.slice(-4);
  return `${"•".repeat(Math.max(0, digits.length - 4))}${visible}`;
};

export const maskEmailAddress = (email?: string | null) => {
  if (!email) {
    return "";
  }
  const [local, domain] = email.split("@");
  if (!domain) {
    return email;
  }
  if (!local || local.length <= 2) {
    return `${local?.[0] ?? ""}***@${domain}`;
  }
  return `${local.slice(0, 1)}***${local.slice(-1)}@${domain}`;
};

export const generateLoginOtpCode = () =>
  randomInt(0, 10 ** LOGIN_OTP_CODE_LENGTH)
    .toString()
    .padStart(LOGIN_OTP_CODE_LENGTH, "0");

export const getLoginOtpSetting = async () => {
  const record = await getSystemSettingRecord(LOGIN_OTP_SETTING_KEY);
  return normalizeBooleanSetting(record?.settingValue, false);
};

const clearExistingLoginChallenges = async (userId: string) => {
  await db.delete(loginOtpChallenges).where(eq(loginOtpChallenges.userId, userId));
};

export const createLoginOtpChallenge = async (user: User, channel: PasswordResetChannel) => {
  const otp = generateLoginOtpCode();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000);

  await clearExistingLoginChallenges(user.id);

  const [challenge] = await db
    .insert(loginOtpChallenges)
    .values({
      userId: user.id,
      otpHash,
      expiresAt,
    })
    .returning();

  queueNotification("otp" as NotificationEventId, {
    owner: user,
    otp,
    recipientMobile: channel === "sms" ? user.mobile ?? null : null,
    recipientEmail: channel === "email" ? user.email ?? null : null,
  });

  return {
    id: challenge.id,
    expiresAt,
    channel,
  };
};

let passwordResetTableReady = false;

export const ensurePasswordResetTable = async () => {
  if (passwordResetTableReady) {
    return;
  }
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_challenges (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel VARCHAR(32) NOT NULL,
        recipient VARCHAR(255),
        otp_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_challenges_user_id
        ON password_reset_challenges(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_challenges_expires_at
        ON password_reset_challenges(expires_at)
    `);
    passwordResetTableReady = true;
  } catch (error) {
    authLog.error("[auth] Failed to ensure password_reset_challenges table", error);
    throw error;
  }
};

export const createPasswordResetChallenge = async (user: User, channel: PasswordResetChannel) => {
  await ensurePasswordResetTable();
  const otp = generateLoginOtpCode();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await db.delete(passwordResetChallenges).where(eq(passwordResetChallenges.userId, user.id));

  const recipient = channel === "sms" ? user.mobile ?? null : user.email ?? null;

  const [challenge] = await db
    .insert(passwordResetChallenges)
    .values({
      userId: user.id,
      channel,
      recipient,
      otpHash,
      expiresAt,
    })
    .returning();

  queueNotification("password_reset" as NotificationEventId, {
    owner: user,
    otp,
    recipientMobile: channel === "sms" ? recipient : undefined,
    recipientEmail: channel === "email" ? recipient : undefined,
  });

  return {
    id: challenge.id,
    expiresAt,
  };
};

export const findUserByIdentifier = async (rawIdentifier: string): Promise<User | null> => {
  const identifier = rawIdentifier.trim();
  if (!identifier) {
    return null;
  }
  const normalizedMobile = identifier.replace(/\s+/g, "");
  const looksLikeMobile = /^[0-9]{8,15}$/.test(normalizedMobile);
  const normalizedEmail = identifier.toLowerCase();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const manifestFromIdentifier = lookupStaffAccountByIdentifier(identifier);
  const manifestFromMobile = looksLikeMobile ? lookupStaffAccountByMobile(normalizedMobile) : undefined;

  let user =
    looksLikeMobile
      ? await storage.getUserByMobile(normalizedMobile)
      : looksLikeEmail
        ? await storage.getUserByEmail(normalizedEmail)
        : undefined;

  if (!user && manifestFromMobile && manifestFromMobile.mobile !== normalizedMobile) {
    user = await storage.getUserByMobile(manifestFromMobile.mobile);
  }

  if (!user) {
    user = await storage.getUserByUsername(identifier);
  }

  if (!user && manifestFromIdentifier) {
    user = await storage.getUserByMobile(manifestFromIdentifier.mobile);
  }

  if (!user && looksLikeEmail) {
    user = await storage.getUserByEmail(normalizedEmail);
  }

  return user ?? null;
};
