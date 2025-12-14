import { createLogger } from "../logger";
import { getSystemSettingRecord } from "./systemSettings";
import {
    SMS_GATEWAY_SETTING_KEY,
    type SmsGatewaySettingValue,
    type SmsGatewayProvider
} from "./notifications";
import {
    sendTestSms,
    sendNicV2Sms,
    sendTwilioSms
} from "./communications";

const log = createLogger("sms-service");

/**
 * Send an SMS message to a mobile number
 * Uses the configured system gateway (NIC, NIC V2, or Twilio)
 */
export async function sendSms(mobile: string, message: string): Promise<boolean> {
    try {
        // Normalize phone number to 10 digits for logging
        const normalizedMobile = mobile.replace(/^\+91|^91/, "").trim();

        if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
            log.warn({ mobile }, "Invalid mobile number format");
            return false;
        }

        // Fetch Gateway Configuration
        const record = await getSystemSettingRecord(SMS_GATEWAY_SETTING_KEY);
        if (!record) {
            log.warn({ mobile: normalizedMobile.slice(-4) }, "SMS gateway not configured - Falling back to DEV log");
            logDevSms(normalizedMobile, message);
            return true;
        }

        const config = (record.settingValue as SmsGatewaySettingValue) ?? {};
        const provider: SmsGatewayProvider = config.provider ?? "nic";

        if (provider === "twilio") {
            const twilioConfig = config.twilio;
            if (!twilioConfig || !twilioConfig.accountSid || !twilioConfig.authToken || (!twilioConfig.fromNumber && !twilioConfig.messagingServiceSid)) {
                log.warn("Twilio settings incomplete - using DEV log");
                logDevSms(normalizedMobile, message);
                return true;
            }
            await sendTwilioSms(
                {
                    accountSid: twilioConfig.accountSid,
                    authToken: twilioConfig.authToken,
                    fromNumber: twilioConfig.fromNumber,
                    messagingServiceSid: twilioConfig.messagingServiceSid,
                },
                { mobile, message }
            );
        } else if (provider === "nic_v2") {
            const nicV2Config = config.nicV2;
            if (!nicV2Config || !nicV2Config.username || !nicV2Config.password || !nicV2Config.senderId || !nicV2Config.key || !nicV2Config.templateId || !nicV2Config.postUrl) {
                log.warn("NIC V2 settings incomplete - using DEV log");
                logDevSms(normalizedMobile, message);
                return true;
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
                { mobile, message }
            );
        } else {
            // Default NIC
            const nicConfig = config.nic;
            if (!nicConfig || !nicConfig.username || !nicConfig.password || !nicConfig.senderId || !nicConfig.departmentKey || !nicConfig.templateId || !nicConfig.postUrl) {
                log.warn("NIC settings incomplete - using DEV log");
                logDevSms(normalizedMobile, message);
                return true;
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
                { mobile, message }
            );
        }

        log.info({ mobile: normalizedMobile.slice(-4), provider }, "SMS sent successfully via gateway");

        // Log OTP in dev logs as backup
        const otpMatch = message.match(/OTP:\s*(\d{6})/);
        if (otpMatch) {
            log.info({ otp: otpMatch[1], mobile: normalizedMobile.slice(-4) }, "DEV OTP (Backup Log)");
        }

        return true;
    } catch (error) {
        log.error({ err: error, mobile: mobile.slice(-4) }, "Failed to send SMS via gateway");

        // Fallback log on error ensures dev/testing isn't blocked by gateway failure
        logDevSms(mobile, message);
        return false;
    }
}

function logDevSms(mobile: string, message: string) {
    const normalizedMobile = mobile.replace(/^\+91|^91/, "").trim();
    log.info({
        mobile: normalizedMobile.slice(-4),
        message: message.substring(0, 100)
    }, "SMS would be sent (DEV MODE)");

    const otpMatch = message.match(/OTP:\s*(\d{6})/);
    if (otpMatch) {
        log.warn({ otp: otpMatch[1], mobile: normalizedMobile.slice(-4) }, "DEV OTP for testing");
    }
}
