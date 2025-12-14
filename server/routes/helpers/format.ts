export const trimOptionalString = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const trimRequiredString = (value: string) => {
  const trimmed = value.trim();
  return trimmed;
};

export const parseIsoDateOrNull = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
