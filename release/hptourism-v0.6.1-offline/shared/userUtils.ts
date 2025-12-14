const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,30}$/;

export const isValidUsername = (value?: string | null): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  return USERNAME_REGEX.test(value.trim());
};

export const normalizeUsername = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
};

export const getUsernameValidationMessage = (value?: string | null): string | null => {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return "Username is required.";
  }
  if (!isValidUsername(value)) {
    return "Use 4-30 characters (letters, numbers, dot, dash, underscore).";
  }
  return null;
};
