import express from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { User } from "@shared/schema";
import {
  insertUserSchema,
  insertUserProfileSchema,
  userProfiles,
  users,
  loginOtpChallenges,
  passwordResetChallenges,
} from "@shared/schema";
import { storage } from "../../storage";
import { db } from "../../db";
import { authRateLimiter } from "../../security/rateLimit";
import {
  PasswordResetChannel,
  maskEmailAddress,
  maskMobileNumber,
  getLoginOtpSetting,
  createLoginOtpChallenge,
  createPasswordResetChallenge,
  findUserByIdentifier,
  ensurePasswordResetTable,
} from "./utils";
import {
  getCaptchaSetting,
  shouldBypassCaptcha,
  updateCaptchaSettingCache,
} from "../core/captcha";
import { formatUserForResponse } from "../core/users.ts";
import { requireAuth } from "../core/middleware";
import { logger } from "../../logger";
import { resolveNotificationChannelState } from "../../services/notifications";
import {
  lookupStaffAccountByIdentifier,
  lookupStaffAccountByMobile,
} from "@shared/districtStaffManifest";

const authLog = logger.child({ module: "auth-routes" });

type LoginAuthMode = "password" | "otp";

const generateCaptcha = () => {
  const first = Math.floor(Math.random() * 9) + 1;
  const second = Math.floor(Math.random() * 9) + 1;
  const operations = [
    { symbol: "+", apply: (a: number, b: number) => a + b },
    { symbol: "-", apply: (a: number, b: number) => a - b },
    { symbol: "×", apply: (a: number, b: number) => a * b },
  ] as const;
  const op = operations[Math.floor(Math.random() * operations.length)];
  return {
    question: `${first} ${op.symbol} ${second}`,
    answer: String(op.apply(first, second)),
  };
};

type OtpChannelState = {
  smsEnabled: boolean;
  emailEnabled: boolean;
  anyEnabled: boolean;
};

type OtpLoginAvailability = OtpChannelState & { allowed: boolean };

const getOtpChannelState = async (): Promise<OtpChannelState> => {
  const otpChannels = await resolveNotificationChannelState("otp");
  const smsEnabled = Boolean(otpChannels.smsEnabled);
  const emailEnabled = Boolean(otpChannels.emailEnabled);
  return {
    smsEnabled,
    emailEnabled,
    anyEnabled: smsEnabled || emailEnabled,
  };
};

const getOtpLoginAvailabilityForUser = async (user: User): Promise<OtpLoginAvailability> => {
  const channelState = await getOtpChannelState();
  const allowed = user.role === "property_owner" && channelState.anyEnabled;
  return {
    ...channelState,
    allowed,
  };
};

export function createAuthRouter() {
  const router = express.Router();

  router.post("/register", authRateLimiter, async (req, res) => {
    try {
      const rawData = {
        ...req.body,
        role: "property_owner",
        email: req.body.email || undefined,
        aadhaarNumber: req.body.aadhaarNumber || undefined,
        district: req.body.district || undefined,
      };
      const data = insertUserSchema.parse(rawData);

      const existing = await storage.getUserByMobile(data.mobile);
      if (existing) {
        return res.status(400).json({ message: "Mobile number already registered" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      authLog.error("[registration] Error during registration:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, errors: error.errors });
      }
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        if ("constraint" in error && error.constraint === "users_aadhaar_number_unique") {
          return res.status(400).json({
            message: "This Aadhaar number is already registered. Please login or use a different Aadhaar number.",
          });
        }
      }

      res
        .status(500)
        .json({ message: "Registration failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  router.get("/captcha", async (req, res) => {
    try {
      if (shouldBypassCaptcha(req.get("host"))) {
        updateCaptchaSettingCache(false);
        req.session.captchaAnswer = null;
        req.session.captchaIssuedAt = null;
        return res.json({ enabled: false });
      }

      const enabled = await getCaptchaSetting();
      if (!enabled) {
        req.session.captchaAnswer = null;
        req.session.captchaIssuedAt = null;
        return res.json({ enabled: false });
      }
      const { question, answer } = generateCaptcha();
      req.session.captchaAnswer = answer;
      req.session.captchaIssuedAt = Date.now();
      res.json({ enabled: true, question, expiresInSeconds: 300 });
    } catch (error) {
      authLog.error("[auth] Failed to load captcha:", error);
      res.status(500).json({ message: "Captcha unavailable" });
    }
  });

  router.get("/login/options", async (_req, res) => {
    try {
      const otpChannels = await getOtpChannelState();
      const otpRequired = otpChannels.anyEnabled ? await getLoginOtpSetting() : false;
      const payload = {
        otpEnabled: otpChannels.anyEnabled,
        smsOtpEnabled: otpChannels.smsEnabled,
        emailOtpEnabled: otpChannels.emailEnabled,
        otpRequired,
      };
      authLog.info("[auth] login options", payload);
      res.json(payload);
    } catch (error) {
      authLog.error("[auth] Failed to load login options", error);
      res.status(500).json({ message: "Unable to load login options" });
    }
  });

  router.post("/login", authRateLimiter, async (req, res) => {
    try {
      const authModeRaw =
        typeof req.body?.authMode === "string" ? req.body.authMode.trim().toLowerCase() : "password";
      const authMode: LoginAuthMode = authModeRaw === "otp" ? "otp" : "password";
      const otpChannelRaw =
        typeof req.body?.otpChannel === "string" ? req.body.otpChannel.trim().toLowerCase() : "sms";
      const otpChannel: PasswordResetChannel = otpChannelRaw === "email" ? "email" : "sms";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const captchaAnswer = typeof req.body?.captchaAnswer === "string" ? req.body.captchaAnswer.trim() : "";
      const rawIdentifier =
        typeof req.body?.identifier === "string" && req.body.identifier.trim().length > 0
          ? req.body.identifier.trim()
          : typeof req.body?.mobile === "string"
            ? req.body.mobile.trim()
            : "";

      if (!rawIdentifier) {
        return res.status(400).json({ message: "Identifier required" });
      }
      if (authMode === "password" && !password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const captchaRequired = shouldBypassCaptcha(req.get("host")) ? false : await getCaptchaSetting();
      if (captchaRequired) {
        if (!captchaAnswer) {
          return res.status(400).json({ message: "Captcha answer required" });
        }

        const expectedCaptchaAnswer = req.session.captchaAnswer;
        const captchaIssuedAt = req.session.captchaIssuedAt ?? 0;
        const captchaExpired = !captchaIssuedAt || Date.now() - captchaIssuedAt > 5 * 60 * 1000;
        if (!expectedCaptchaAnswer || captchaExpired || captchaAnswer !== expectedCaptchaAnswer) {
          req.session.captchaAnswer = null;
          req.session.captchaIssuedAt = null;
          const message = captchaExpired ? "Captcha expired. Please refresh and try again." : "Invalid captcha answer";
          return res.status(400).json({ message });
        }
      }

      const normalizedMobile = rawIdentifier.replace(/\s+/g, "");
      const looksLikeMobile = /^[0-9]{8,15}$/.test(normalizedMobile);
      const normalizedEmail = rawIdentifier.toLowerCase();
      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      const manifestFromIdentifier = lookupStaffAccountByIdentifier(rawIdentifier);
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
        user = await storage.getUserByUsername(rawIdentifier);
      }

      if (!user && manifestFromIdentifier) {
        user = await storage.getUserByMobile(manifestFromIdentifier.mobile);
      }

      if (!user && looksLikeEmail) {
        user = await storage.getUserByEmail(normalizedEmail);
      }

      if (!user && typeof req.body?.mobile === "string") {
        user = await storage.getUserByMobile(req.body.mobile.trim());
      }

      if (!user || (authMode === "password" && !user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account deactivated" });
      }

      if (authMode === "otp") {
        const otpAvailability = await getOtpLoginAvailabilityForUser(user);
        if (!otpAvailability.allowed) {
          return res.status(400).json({ message: "OTP login is disabled" });
        }
        if (otpChannel === "sms") {
          if (!otpAvailability.smsEnabled) {
            return res.status(400).json({ message: "SMS OTP is disabled. Switch to email OTP." });
          }
          if (!user.mobile || user.mobile.trim().length < 6) {
            return res.status(400).json({ message: "OTP login unavailable (missing mobile)" });
          }
        } else if (otpChannel === "email") {
          if (!otpAvailability.emailEnabled) {
            return res.status(400).json({ message: "Email OTP is disabled. Switch to SMS OTP." });
          }
          if (!user.email) {
            return res.status(400).json({ message: "OTP login unavailable (missing email)" });
          }
        }
        const challenge = await createLoginOtpChallenge(user, otpChannel);
        req.session.captchaAnswer = null;
        req.session.captchaIssuedAt = null;
        return res.json({
          otpRequired: true,
          challengeId: challenge.id,
          expiresAt: challenge.expiresAt.toISOString(),
          maskedMobile: otpChannel === "sms" ? maskMobileNumber(user.mobile) : undefined,
          maskedEmail: otpChannel === "email" ? maskEmailAddress(user.email) : undefined,
          channel: otpChannel,
        });
      }

      const comparePassword = async (candidate?: typeof user) => {
        if (!candidate || !candidate.password) {
          return false;
        }
        try {
          return await bcrypt.compare(password, candidate.password);
        } catch (error) {
          authLog.warn("[auth] Failed to compare password hash", {
            userId: candidate.id,
            identifier: rawIdentifier,
            error,
          });
          return false;
        }
      };

      let passwordMatch = await comparePassword(user);

      if (!passwordMatch && manifestFromIdentifier) {
        try {
          const manifestUser = await storage.getUserByMobile(manifestFromIdentifier.mobile);
          if (
            manifestUser &&
            manifestUser.id !== user.id &&
            manifestUser.password &&
            (await comparePassword(manifestUser))
          ) {
            user = manifestUser;
            passwordMatch = true;
            authLog.info("[auth] Resolved staff login via manifest fallback", {
              identifier: rawIdentifier,
              mobile: manifestFromIdentifier.mobile,
            });
          }
        } catch (fallbackError) {
          authLog.error("[auth] Manifest fallback failed", fallbackError);
        }
      }

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const manifestAccount =
        manifestFromIdentifier ??
        manifestFromMobile ??
        lookupStaffAccountByMobile(user.mobile);

      if (
        manifestAccount &&
        manifestAccount.username &&
        (!user.username || user.username.toLowerCase() !== manifestAccount.username.toLowerCase())
      ) {
        try {
          const updated = await storage.updateUser(user.id, {
            username: manifestAccount.username,
          });
          if (updated) {
            user = updated;
          }
        } catch (updateError) {
          authLog.warn("[auth] Failed to backfill staff username", updateError);
        }
      }

      req.session.userId = user.id;
      req.session.captchaAnswer = null;
      req.session.captchaIssuedAt = null;

      const userResponse = formatUserForResponse(user);
      res.json({ user: userResponse });
    } catch (error) {
      authLog.error("[auth] Login error", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  router.post("/login/verify-otp", authRateLimiter, async (req, res) => {
    try {
      const challengeId =
        typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";
      const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

      if (!challengeId || !otp) {
        return res.status(400).json({ message: "OTP verification failed" });
      }

      const [challenge] = await db
        .select()
        .from(loginOtpChallenges)
        .where(eq(loginOtpChallenges.id, challengeId))
        .limit(1);

      if (!challenge) {
        return res.status(400).json({ message: "OTP expired. Please sign in again." });
      }

      if (challenge.consumedAt) {
        return res.status(400).json({ message: "OTP already used. Please sign in again." });
      }

      const now = new Date();
      if (challenge.expiresAt < now) {
        await db.delete(loginOtpChallenges).where(eq(loginOtpChallenges.id, challengeId));
        return res.status(400).json({ message: "OTP expired. Please sign in again." });
      }

      const user = await storage.getUser(challenge.userId);
      if (!user || !user.isActive) {
        return res.status(400).json({ message: "Account unavailable" });
      }

      const otpMatch = await bcrypt.compare(otp, challenge.otpHash);
      if (!otpMatch) {
        return res.status(400).json({ message: "Incorrect OTP" });
      }

      await db
        .update(loginOtpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(loginOtpChallenges.id, challengeId));

      req.session.userId = user.id;
      req.session.captchaAnswer = null;
      req.session.captchaIssuedAt = null;

      const userResponse = formatUserForResponse(user);
      res.json({ user: userResponse });
    } catch (error) {
      authLog.error("[auth] OTP verification failed", error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  const passwordResetRequestSchema = z.object({
    identifier: z.string().min(3, "Enter your registered mobile number, email, or username"),
    channel: z.enum(["sms", "email"]).optional(),
  });

  const passwordResetVerifySchema = z.object({
    challengeId: z.string().min(1, "Challenge id missing"),
    otp: z.string().min(4, "Enter the code sent to you"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  });

  router.post("/password-reset/request", authRateLimiter, async (req, res) => {
    try {
      const { identifier, channel: rawChannel } = passwordResetRequestSchema.parse(req.body ?? {});
      const channel: PasswordResetChannel = rawChannel === "email" ? "email" : "sms";
      const user = await findUserByIdentifier(identifier);
      if (!user) {
        return res.status(404).json({ message: "Account not found" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account disabled" });
      }

      if (channel === "sms") {
        if (!user.mobile || user.mobile.trim().length < 6) {
          return res.status(400).json({ message: "No mobile number linked to this account" });
        }
      } else if (channel === "email") {
        if (!user.email) {
          return res.status(400).json({ message: "No email linked to this account" });
        }
      }

      const challenge = await createPasswordResetChallenge(user, channel);
      res.json({
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt.toISOString(),
        channel,
        maskedMobile: channel === "sms" ? maskMobileNumber(user.mobile) : undefined,
        maskedEmail: channel === "email" ? maskEmailAddress(user.email) : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid request" });
      }
      authLog.error("[auth] Password reset request failed", error);
      res.status(500).json({ message: "Failed to issue reset code" });
    }
  });

  router.post("/password-reset/verify", authRateLimiter, async (req, res) => {
    try {
      const { challengeId, otp, newPassword } = passwordResetVerifySchema.parse(req.body ?? {});

      await ensurePasswordResetTable();
      const [challenge] = await db
        .select()
        .from(passwordResetChallenges)
        .where(eq(passwordResetChallenges.id, challengeId))
        .limit(1);

      if (!challenge) {
        return res.status(400).json({ message: "Reset code expired. Please start again." });
      }

      if (challenge.consumedAt) {
        return res.status(400).json({ message: "Reset code already used. Please request a new one." });
      }

      const now = new Date();
      if (challenge.expiresAt < now) {
        await db.delete(passwordResetChallenges).where(eq(passwordResetChallenges.id, challengeId));
        return res.status(400).json({ message: "Reset code expired. Please request a new one." });
      }

      const user = await storage.getUser(challenge.userId);
      if (!user || !user.isActive) {
        return res.status(404).json({ message: "Account unavailable" });
      }

      const otpMatch = await bcrypt.compare(otp, challenge.otpHash);
      if (!otpMatch) {
        return res.status(400).json({ message: "Incorrect reset code" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      await db
        .update(passwordResetChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetChallenges.id, challengeId));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid reset request" });
      }
      authLog.error("[auth] Password reset verify failed", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  router.get("/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userResponse = formatUserForResponse(user);
    res.json({ user: userResponse });
  });

  return router;
}

export function createProfileRouter() {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (!profile) {
        return res.json(null);
      }

      res.json(profile);
    } catch (error) {
      authLog.error("[profile] Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const profileData = insertUserProfileSchema.parse(req.body);

      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      let profile;

      if (existingProfile) {
        [profile] = await db
          .update(userProfiles)
          .set({
            ...profileData,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, userId))
          .returning();
      } else {
        [profile] = await db
          .insert(userProfiles)
          .values({
            ...profileData,
            userId,
          })
          .returning();
      }

      const normalizedEmail =
        typeof profileData.email === "string" && profileData.email.trim().length > 0
          ? profileData.email.trim()
          : null;
      const normalizedAadhaar =
        typeof profileData.aadhaarNumber === "string" && profileData.aadhaarNumber.trim().length > 0
          ? profileData.aadhaarNumber.trim()
          : null;

      await db
        .update(users)
        .set({
          fullName: profileData.fullName,
          mobile: profileData.mobile,
          email: normalizedEmail,
          aadhaarNumber: normalizedAadhaar ?? null,
          district: profileData.district || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({
        profile,
        message: existingProfile ? "Profile updated successfully" : "Profile created successfully",
      });
    } catch (error) {
      authLog.error("[profile] Error saving profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  return router;
}
