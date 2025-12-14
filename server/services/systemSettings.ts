import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemSettings, type SystemSetting } from "@shared/schema";

export async function getSystemSettingRecord(key: string): Promise<SystemSetting | null> {
  const [record] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, key))
    .limit(1);
  return record ?? null;
}

// =============================================================================
// PAYMENT WORKFLOW CONFIGURATION
// =============================================================================
// Two main modes:
//   1. "on_approval" (default) - Pay AFTER DTDO approval (existing flow)
//   2. "upfront" - Pay BEFORE submission (prepayment)
//
// For "upfront" mode, there's an additional sub-option:
//   - "auto" - After payment success, auto-submit the application
//   - "manual" - After payment success, show confirmation page, user clicks submit
//
// IMPORTANT: The middle workflow (DA → DTDO → Inspection) is IDENTICAL for both modes.
// The only differences are:
//   - START: When payment happens (before submit vs after approval)
//   - END: Skip payment step if already paid (for upfront mode)
// =============================================================================

const PAYMENT_WORKFLOW_SETTING_KEY = "payment_workflow";

export type PaymentWorkflow = "upfront" | "on_approval";
export type UpfrontSubmitMode = "auto" | "manual";

export interface PaymentWorkflowConfig {
  workflow: PaymentWorkflow;
  upfrontSubmitMode: UpfrontSubmitMode;
}

/**
 * Get the payment workflow mode (upfront vs on_approval)
 */
export async function getPaymentWorkflow(): Promise<PaymentWorkflow> {
  const record = await getSystemSettingRecord(PAYMENT_WORKFLOW_SETTING_KEY);
  const workflow = (record?.settingValue as any)?.workflow;
  return workflow === "upfront" ? "upfront" : "on_approval"; // Default to legacy
}

/**
 * Get the upfront submit mode (auto vs manual)
 * Only applicable when workflow is "upfront"
 */
export async function getUpfrontSubmitMode(): Promise<UpfrontSubmitMode> {
  const record = await getSystemSettingRecord(PAYMENT_WORKFLOW_SETTING_KEY);
  const submitMode = (record?.settingValue as any)?.upfrontSubmitMode;
  return submitMode === "manual" ? "manual" : "auto"; // Default to auto
}

/**
 * Get the complete payment workflow configuration
 */
export async function getPaymentWorkflowConfig(): Promise<PaymentWorkflowConfig> {
  const record = await getSystemSettingRecord(PAYMENT_WORKFLOW_SETTING_KEY);
  const settingValue = record?.settingValue as any;

  return {
    workflow: settingValue?.workflow === "upfront" ? "upfront" : "on_approval",
    upfrontSubmitMode: settingValue?.upfrontSubmitMode === "manual" ? "manual" : "auto",
  };
}

/**
 * Check if payment has already been made for an application
 * Used at DTDO approval to decide whether to skip payment step
 */
export function isPaymentAlreadyCompleted(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid" || paymentStatus === "completed";
}
