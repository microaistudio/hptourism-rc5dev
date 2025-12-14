import { format } from "date-fns";
import { notifications, type HomestayApplication, type SystemSetting, type User } from "@shared/schema";
import type { NotificationEventId } from "@shared/notifications";
export type { NotificationEventId } from "@shared/notifications";
import {
  sendTestEmail,
  sendTestSms,
  sendNicV2Sms,
  sendTwilioSms,
  type EmailGatewaySettings,
  type SmsGatewaySettings,
  type SmsGatewayV2Settings,
  type TwilioGatewaySettings,
} from "./communications";
export type { SmsGatewayV2Settings } from "./communications";
import { getSystemSettingRecord } from "./systemSettings";
import { storage } from "../storage";
import { db } from "../db";
import { logger } from "../logger";

const notificationLog = logger.child({ module: "notifications" });

export const EMAIL_GATEWAY_SETTING_KEY = "comm_email_gateway";
export const SMS_GATEWAY_SETTING_KEY = "comm_sms_gateway";
export const NOTIFICATION_RULES_SETTING_KEY = "comm_notification_rules";

export type EmailGatewayProvider = "custom" | "nic" | "sendgrid";

export type EmailGatewaySecretSettings = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromEmail?: string;
};

export type EmailGatewaySettingValue = {
  provider?: EmailGatewayProvider;
  custom?: EmailGatewaySecretSettings;
  nic?: EmailGatewaySecretSettings;
  sendgrid?: EmailGatewaySecretSettings;
  updatedAt?: string;
  updatedBy?: string | null;
} & Partial<EmailGatewaySecretSettings>;

export type SmsGatewayProvider = "nic" | "nic_v2" | "twilio";

export type NicSmsGatewaySettings = SmsGatewaySettings & { password?: string };
export type SmsGatewayV2SecretSettings = SmsGatewayV2Settings & { password?: string };
export type TwilioSmsGatewaySecretSettings = TwilioGatewaySettings & { authToken?: string };

export type SmsGatewaySettingValue = {
  provider?: SmsGatewayProvider;
  nic?: NicSmsGatewaySettings;
  nicV2?: SmsGatewayV2SecretSettings;
  twilio?: TwilioSmsGatewaySecretSettings;
  updatedAt?: string;
  updatedBy?: string | null;
};

export type NotificationRuleValue = {
  id: NotificationEventId;
  smsEnabled?: boolean;
  smsTemplate?: string;
  emailEnabled?: boolean;
  emailSubject?: string;
  emailBody?: string;
};

export type NotificationSettingsValue = {
  rules?: NotificationRuleValue[];
};

type NotificationEventDefinition = {
  id: NotificationEventId;
  label: string;
  description: string;
  defaultSmsTemplate: string;
  defaultEmailSubject: string;
  defaultEmailBody: string;
  placeholders: string[];
  defaultSmsEnabled?: boolean;
  defaultEmailEnabled?: boolean;
};

export const emailProviders: EmailGatewayProvider[] = ["custom", "nic", "sendgrid"];

export const notificationEventDefinitions: NotificationEventDefinition[] = [
  {
    id: "otp",
    label: "OTP verification",
    description: "Sent when an owner requests an OTP to access or confirm submissions.",
    defaultSmsTemplate:
      "{{OTP}} is your OTP for Himachal Tourism e-services portal login. - HP Tourism E-services",
    defaultEmailSubject: "Himachal Tourism OTP",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\n{{OTP}} is your one-time password for Himachal Tourism eServices. It expires in 10 minutes.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "OTP"],
    defaultSmsEnabled: true,
    defaultEmailEnabled: true,
  },
  {
    id: "password_reset",
    label: "Password reset",
    description: "Delivers the one-time code owners need to reset their account password.",
    defaultSmsTemplate:
      "{{OTP}} is your password reset code for Himachal Tourism eServices. Enter it in the portal within 10 minutes to set a new password.",
    defaultEmailSubject: "Password reset code",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nUse the code {{OTP}} to reset your Himachal Tourism eServices password. This code expires in 10 minutes. If you did not request a reset, you can ignore this email.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "OTP"],
    defaultSmsEnabled: true,
    defaultEmailEnabled: true,
  },
  {
    id: "application_submitted",
    label: "Application submitted",
    description: "Confirms that an owner successfully submitted a homestay application.",
    defaultSmsTemplate:
      "Your Himachal Tourism application {{APPLICATION_ID}} was submitted successfully. We will update you on the next steps.",
    defaultEmailSubject: "Application {{APPLICATION_ID}} submitted",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nWe received your homestay application {{APPLICATION_ID}}. We will notify you as it moves through scrutiny and inspection.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID"],
  },
  {
    id: "forwarded_to_dtdo",
    label: "Forwarded to DTDO",
    description: "Notifies the owner that scrutiny is complete and the case moved to DTDO.",
    defaultSmsTemplate:
      "Application {{APPLICATION_ID}} has moved to DTDO review for site inspection. Keep your documents handy.",
    defaultEmailSubject: "Application {{APPLICATION_ID}} forwarded for DTDO review",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nYour application {{APPLICATION_ID}} cleared scrutiny and has been forwarded to the DTDO for field inspection. Please stay available for coordination.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID"],
  },
  {
    id: "inspection_scheduled",
    label: "Inspection scheduled",
    description: "Alerts the owner about the scheduled inspection date.",
    defaultSmsTemplate:
      "DTDO scheduled a site inspection for application {{APPLICATION_ID}} on {{INSPECTION_DATE}}. Please ensure availability.",
    defaultEmailSubject: "Site inspection scheduled – Application {{APPLICATION_ID}}",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nA site inspection for application {{APPLICATION_ID}} is scheduled on {{INSPECTION_DATE}}. Kindly keep the property accessible and documents ready for verification.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID", "INSPECTION_DATE"],
  },
  {
    id: "verified_for_payment",
    label: "Verified for payment",
    description: "Informs the owner that the application is cleared for payment and certificate issue.",
    defaultSmsTemplate:
      "Application {{APPLICATION_ID}} is verified for payment. Log in to complete the fee and download your certificate after approval.",
    defaultEmailSubject: "Application {{APPLICATION_ID}} verified for payment",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nYour application {{APPLICATION_ID}} has been verified for payment. Please sign in to complete the fee so we can issue the certificate.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID"],
  },
  {
    id: "da_send_back",
    label: "DA send-back",
    description: "Alerts the owner that the Dealing Assistant sent the application back for corrections.",
    defaultSmsTemplate:
      "Application {{APPLICATION_ID}} needs corrections. DA remarks: {{REMARKS}}. Please update and resubmit.",
    defaultEmailSubject: "Corrections requested – Application {{APPLICATION_ID}}",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nOur Dealing Assistant reviewed application {{APPLICATION_ID}} and requested corrections.\n\nRemarks:\n{{REMARKS}}\n\nPlease sign in, update the form, and resubmit at the earliest.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID", "REMARKS"],
    defaultSmsEnabled: true,
    defaultEmailEnabled: true,
  },
  {
    id: "dtdo_revert",
    label: "DTDO revert",
    description: "Notifies the owner that DTDO returned the application for additional corrections after inspection.",
    defaultSmsTemplate:
      "DTDO returned application {{APPLICATION_ID}} for updates. Remarks: {{REMARKS}}. Please review and resubmit.",
    defaultEmailSubject: "DTDO corrections – Application {{APPLICATION_ID}}",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nDuring district review we found items that need attention for application {{APPLICATION_ID}}.\n\nRemarks:\n{{REMARKS}}\n\nPlease update the application and resubmit so we can continue processing.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID", "REMARKS"],
    defaultSmsEnabled: true,
    defaultEmailEnabled: true,
  },
  {
    id: "dtdo_objection",
    label: "DTDO objection raised",
    description: "Informs the owner that DTDO raised objections after the inspection report.",
    defaultSmsTemplate:
      "Inspection objections raised for application {{APPLICATION_ID}}. Remarks: {{REMARKS}}. Update the application to continue.",
    defaultEmailSubject: "Inspection objections – Application {{APPLICATION_ID}}",
    defaultEmailBody:
      "Hello {{OWNER_NAME}},\n\nAfter reviewing the inspection report for application {{APPLICATION_ID}}, the DTDO raised the following objections:\n\n{{REMARKS}}\n\nPlease sign in, address the feedback, and resubmit. Ignoring objections may lead to rejection.\n\n- Tourism Department",
    placeholders: ["OWNER_NAME", "APPLICATION_ID", "REMARKS"],
    defaultSmsEnabled: true,
    defaultEmailEnabled: true,
  },
];

const notificationDefinitionMap = new Map(
  notificationEventDefinitions.map((definition) => [definition.id, definition]),
);

export const extractLegacyEmailProfile = (
  value?: EmailGatewaySettingValue | null,
): EmailGatewaySecretSettings | undefined => {
  if (!value) return undefined;
  if (value.custom || value.nic || value.sendgrid) {
    return undefined;
  }
  if (!value.host && !value.fromEmail && !value.username && !value.password) {
    return undefined;
  }
  return {
    host: value.host,
    port: value.port,
    username: value.username,
    password: value.password,
    fromEmail: value.fromEmail,
  };
};

export const getEmailProfileFromValue = (
  value: EmailGatewaySettingValue,
  provider: EmailGatewayProvider,
): EmailGatewaySecretSettings | undefined => {
  const legacy = extractLegacyEmailProfile(value);
  if (provider === "custom") {
    return value.custom ?? legacy;
  }
  if (provider === "nic") {
    return value.nic ?? (legacy && value.provider === "nic" ? legacy : undefined);
  }
  if (provider === "sendgrid") {
    return value.sendgrid ?? (legacy && value.provider === "sendgrid" ? legacy : undefined);
  }
  return legacy;
};

export const sanitizeEmailGateway = (value?: EmailGatewaySettingValue | null) => {
  if (!value) return null;
  const provider: EmailGatewayProvider = value.provider ?? "custom";
  const legacy = extractLegacyEmailProfile(value);
  const mapProfile = (profile?: EmailGatewaySecretSettings) => {
    if (!profile) return undefined;
    return {
      host: profile.host ?? "",
      port: Number(profile.port) || 25,
      username: profile.username ?? "",
      fromEmail: profile.fromEmail ?? "",
      passwordSet: Boolean(profile.password),
    };
  };
  return {
    provider,
    custom: mapProfile(value.custom ?? (provider === "custom" ? legacy : undefined) ?? legacy),
    nic: mapProfile(value.nic),
    sendgrid: mapProfile(value.sendgrid),
  };
};

export const sanitizeSmsGateway = (value?: SmsGatewaySettingValue | null) => {
  if (!value) return null;
  const provider: SmsGatewayProvider = value.provider ?? "nic";
  const nic = value.nic
    ? {
        username: value.nic.username,
        senderId: value.nic.senderId,
        departmentKey: value.nic.departmentKey,
        templateId: value.nic.templateId,
        postUrl: value.nic.postUrl,
        passwordSet: Boolean(value.nic.password),
      }
    : undefined;
  const nicV2 = value.nicV2
    ? {
        username: value.nicV2.username,
        senderId: value.nicV2.senderId,
        templateId: value.nicV2.templateId,
        key: value.nicV2.key,
        postUrl: value.nicV2.postUrl,
        passwordSet: Boolean(value.nicV2.password),
      }
    : undefined;
  const twilio = value.twilio
    ? {
        accountSid: value.twilio.accountSid,
        fromNumber: value.twilio.fromNumber,
        messagingServiceSid: value.twilio.messagingServiceSid,
        authTokenSet: Boolean(value.twilio.authToken),
      }
    : undefined;
  return {
    provider,
    nic,
    nicV2,
    twilio,
  };
};

export const formatGatewaySetting = <T,>(
  record: SystemSetting | null,
  sanitizer: (value?: any) => T | null,
) => {
  if (!record) {
    return null;
  }
  const sanitized = sanitizer(record.settingValue as unknown);
  if (!sanitized) {
    return null;
  }
  return {
    ...sanitized,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
};

type NotificationTriggerOptions = {
  application?: HomestayApplication | null;
  applicationId?: string;
  owner?: User | null;
  recipientMobile?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  otp?: string;
  extras?: Record<string, string | undefined>;
};

const buildTemplateVariables = ({
  application,
  owner,
  recipientName,
  otp,
  extras,
}: {
  application?: HomestayApplication | null;
  owner?: User | null;
  recipientName?: string | null;
  otp?: string;
  extras?: Record<string, string | undefined>;
}) => {
  const inspectionDate =
    extras?.INSPECTION_DATE ??
    (application?.siteInspectionScheduledDate
      ? format(new Date(application.siteInspectionScheduledDate), "dd MMM yyyy")
      : "");

  return {
    APPLICATION_ID: application?.applicationNumber ?? application?.id ?? "",
    OWNER_NAME: recipientName ?? owner?.fullName ?? "",
    OWNER_MOBILE: owner?.mobile ?? "",
    OWNER_EMAIL: owner?.email ?? "",
    STATUS: application?.status ?? "",
    OTP: otp ?? "",
    INSPECTION_DATE: inspectionDate,
    REMARKS: extras?.REMARKS ?? "",
  };
};

const renderTemplate = (template: string, variables: Record<string, string>) =>
  template.replace(/{{\s*([^}]+)\s*}}/g, (_, token) => {
    const key = token.trim().toUpperCase();
    return variables[key] ?? "";
  });

const deliverNotificationSms = async (mobile: string, message: string) => {
  try {
    const record = await getSystemSettingRecord(SMS_GATEWAY_SETTING_KEY);
    if (!record) {
      notificationLog.warn("[notifications] SMS gateway not configured");
      return;
    }
    const config = (record.settingValue as SmsGatewaySettingValue) ?? {};
    const provider: SmsGatewayProvider = config.provider ?? "nic";
    if (provider === "twilio") {
      const twilioConfig = config.twilio;
      if (
        !twilioConfig ||
        !twilioConfig.accountSid ||
        !twilioConfig.authToken ||
        (!twilioConfig.fromNumber && !twilioConfig.messagingServiceSid)
      ) {
        notificationLog.warn("[notifications] Twilio SMS settings incomplete");
        return;
      }
      await sendTwilioSms(
        {
          accountSid: twilioConfig.accountSid,
          authToken: twilioConfig.authToken,
          fromNumber: twilioConfig.fromNumber,
          messagingServiceSid: twilioConfig.messagingServiceSid,
        },
        { mobile, message },
      );
      return;
    }
    if (provider === "nic_v2") {
      const nicV2Config = config.nicV2;
      if (
        !nicV2Config ||
        !nicV2Config.username ||
        !nicV2Config.password ||
        !nicV2Config.senderId ||
        !nicV2Config.key ||
        !nicV2Config.templateId ||
        !nicV2Config.postUrl
      ) {
        notificationLog.warn("[notifications] NIC V2 SMS settings incomplete");
        return;
      }
      await sendNicV2Sms(
        {
          username: nicV2Config.username,
          password: nicV2Config.password,
          senderId: nicV2Config.senderId,
          templateId: nicV2Config.templateId,
          key: nicV2Config.key,
          postUrl: nicV2Config.postUrl,
        },
        { mobile, message },
      );
      return;
    }
    const nicConfig = config.nic;
    if (
      !nicConfig ||
      !nicConfig.username ||
      !nicConfig.password ||
      !nicConfig.senderId ||
      !nicConfig.departmentKey ||
      !nicConfig.templateId ||
      !nicConfig.postUrl
    ) {
      notificationLog.warn("[notifications] NIC SMS settings incomplete");
      return;
    }
    await sendTestSms(
      {
        username: nicConfig.username,
        password: nicConfig.password,
        senderId: nicConfig.senderId,
        departmentKey: nicConfig.departmentKey,
        templateId: nicConfig.templateId,
        postUrl: nicConfig.postUrl,
      },
      { mobile, message },
    );
  } catch (error) {
    notificationLog.error("[notifications] Failed to send SMS", error);
  }
};

const deliverNotificationEmail = async (to: string, subject: string, body: string) => {
  try {
    const record = await getSystemSettingRecord(EMAIL_GATEWAY_SETTING_KEY);
    if (!record) {
      notificationLog.warn("[notifications] SMTP gateway not configured");
      return;
    }
    const value = (record.settingValue as EmailGatewaySettingValue) ?? {};
    const provider: EmailGatewayProvider = value.provider ?? "custom";
    const profile = getEmailProfileFromValue(value, provider) ?? extractLegacyEmailProfile(value);
    if (!profile?.host || !profile?.fromEmail || !profile?.password) {
      notificationLog.warn("[notifications] SMTP settings incomplete");
      return;
    }
    await sendTestEmail(
      {
        host: profile.host,
        port: Number(profile.port) || 25,
        username: profile.username,
        password: profile.password,
        fromEmail: profile.fromEmail,
      },
      {
        to,
        subject,
        body,
      },
    );
  } catch (error) {
    notificationLog.error("[notifications] Failed to send email", error);
  }
};

const triggerNotification = async (
  eventId: NotificationEventId,
  options: NotificationTriggerOptions = {},
) => {
  const definition = notificationDefinitionMap.get(eventId);
  if (!definition) {
    return;
  }

  const record = await getSystemSettingRecord(NOTIFICATION_RULES_SETTING_KEY);
  const value: NotificationSettingsValue | undefined =
    (record?.settingValue as NotificationSettingsValue) ?? undefined;
  const stored = value?.rules?.find((rule) => rule.id === eventId);
  const smsEnabled = stored?.smsEnabled ?? definition.defaultSmsEnabled ?? false;
  const emailEnabled = stored?.emailEnabled ?? definition.defaultEmailEnabled ?? false;
  if (!smsEnabled && !emailEnabled) {
    return;
  }

  let application = options.application ?? null;
  if (!application && options.applicationId) {
    const loadedApplication = await storage.getApplication(options.applicationId);
    application = loadedApplication ?? null;
  }
  let owner = options.owner ?? null;
  if (!owner && application?.userId) {
    const loadedOwner = await storage.getUser(application.userId);
    owner = loadedOwner ?? null;
  }

  const variables = buildTemplateVariables({
    application,
    owner,
    recipientName: options.recipientName,
    otp: options.otp,
    extras: options.extras,
  });
  const targetMobile =
    options.recipientMobile !== undefined ? options.recipientMobile : owner?.mobile ?? null;
  const targetEmail =
    options.recipientEmail !== undefined ? options.recipientEmail : owner?.email ?? null;

  if (smsEnabled && targetMobile) {
    const smsTemplate = stored?.smsTemplate ?? definition.defaultSmsTemplate;
    const smsMessage = renderTemplate(smsTemplate, variables);
    await deliverNotificationSms(targetMobile, smsMessage);
  }

  if (emailEnabled && targetEmail) {
    const emailSubjectTemplate = stored?.emailSubject ?? definition.defaultEmailSubject;
    const emailBodyTemplate = stored?.emailBody ?? definition.defaultEmailBody;
    const emailSubject = renderTemplate(emailSubjectTemplate, variables);
    const emailBody = renderTemplate(emailBodyTemplate, variables);
    await deliverNotificationEmail(targetEmail, emailSubject, emailBody);
  }
};

export const queueNotification = (
  eventId: NotificationEventId,
  options: NotificationTriggerOptions = {},
) => {
  triggerNotification(eventId, options).catch((error) => {
    notificationLog.error(`[notifications] Failed to send ${eventId} notification`, error);
  });
};

export const buildNotificationResponse = (record: SystemSetting | null) => {
  const value: NotificationSettingsValue | undefined =
    (record?.settingValue as NotificationSettingsValue) ?? undefined;
  const storedRules = value?.rules ?? [];
  const ruleMap = new Map(storedRules.map((rule) => [rule.id, rule]));
  return {
    events: notificationEventDefinitions.map((definition) => {
      const stored = ruleMap.get(definition.id);
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        placeholders: definition.placeholders,
        smsEnabled: stored?.smsEnabled ?? definition.defaultSmsEnabled ?? false,
        smsTemplate: stored?.smsTemplate ?? definition.defaultSmsTemplate,
        emailEnabled: stored?.emailEnabled ?? definition.defaultEmailEnabled ?? false,
        emailSubject: stored?.emailSubject ?? definition.defaultEmailSubject,
        emailBody: stored?.emailBody ?? definition.defaultEmailBody,
      };
    }),
    updatedAt: record?.updatedAt ?? null,
    updatedBy: record?.updatedBy ?? null,
  };
};

export const resolveNotificationChannelState = async (eventId: NotificationEventId) => {
  const definition = notificationDefinitionMap.get(eventId);
  if (!definition) {
    return { smsEnabled: false, emailEnabled: false };
  }
  const record = await getSystemSettingRecord(NOTIFICATION_RULES_SETTING_KEY);
  const value: NotificationSettingsValue | undefined =
    (record?.settingValue as NotificationSettingsValue) ?? undefined;
  const stored = value?.rules?.find((rule) => rule.id === eventId);
  return {
    smsEnabled: stored?.smsEnabled ?? definition.defaultSmsEnabled ?? false,
    emailEnabled: stored?.emailEnabled ?? definition.defaultEmailEnabled ?? false,
  };
};

export async function createInAppNotification({
  userId,
  applicationId,
  type,
  title,
  message,
}: {
  userId: string;
  applicationId?: string | null;
  type: string;
  title: string;
  message: string;
}) {
  try {
    await db.insert(notifications).values({
      userId,
      applicationId: applicationId ?? null,
      type,
      title,
      message,
      channels: { inapp: true },
    });
  } catch (error) {
    notificationLog.error("[notifications] Failed to create notification", {
      userId,
      applicationId,
      type,
      error,
    });
  }
}
