export const removeUndefined = <T extends Record<string, any>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
