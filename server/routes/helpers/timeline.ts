import type { User, HomestayApplication } from "@shared/schema";

export const canViewApplicationTimeline = (user: User | null, application: HomestayApplication | null) => {
  if (!user || !application) {
    return false;
  }

  if (user.role === "property_owner") {
    return user.id === application.userId;
  }

  return true;
};

export const summarizeTimelineActor = (user?: User | null) => {
  if (!user) {
    return null;
  }

  const displayName = user.fullName || user.username || user.mobile || "Officer";
  return {
    id: user.id,
    name: displayName,
    role: user.role,
    designation: user.designation ?? null,
    district: user.district ?? null,
  };
};
