export const CORRECTION_STATUSES = [
  "sent_back_for_corrections",
  "reverted_to_applicant",
  "reverted_by_dtdo",
  "objection_raised",
  // Note: dtdo_review and correction_resubmitted are routing targets AFTER resubmission
  // They should NOT be included here as they don't require owner action
] as const;

const CORRECTION_STATUS_SET = new Set<string>(CORRECTION_STATUSES);

export const isCorrectionRequiredStatus = (status?: string | null) =>
  status ? CORRECTION_STATUS_SET.has(status) : false;
