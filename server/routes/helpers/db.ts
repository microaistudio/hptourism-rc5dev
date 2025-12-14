export const isPgUniqueViolation = (
  error: unknown,
  constraint?: string,
): error is { code: string; constraint?: string } => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const pgErr = error as { code?: string; constraint?: string };
  if (pgErr.code !== "23505") {
    return false;
  }
  if (constraint && pgErr.constraint !== constraint) {
    return false;
  }
  return true;
};
