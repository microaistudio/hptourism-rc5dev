import type { User } from "@shared/schema";
import { getManifestDerivedUsername } from "@shared/districtStaffManifest";

export const formatUserForResponse = (user: User) => {
  const { password, ...userWithoutPassword } = user as any;
  const derivedUsername = getManifestDerivedUsername(
    userWithoutPassword.mobile,
    userWithoutPassword.username ?? undefined,
  );
  return {
    ...userWithoutPassword,
    username: derivedUsername ?? userWithoutPassword.username ?? null,
  };
};

