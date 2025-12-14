export const CORRECTION_STATUSES = [
  "sent_back_for_corrections",
  "reverted_to_applicant",
  "reverted_by_dtdo",
  "correction_resubmitted",
  "objection_raised",
  // Resubmitted routing targets
  "dtdo_review",
] as const;

const CORRECTION_STATUS_SET = new Set<string>(CORRECTION_STATUSES);

export const isCorrectionRequiredStatus = (status?: string | null) =>
  status ? CORRECTION_STATUS_SET.has(status) : false;
