import type { Request, Response, NextFunction } from "express";
import { storage } from "../../storage";
import { logger } from "../../logger";

const routeLog = logger.child({ module: "routes" });

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    routeLog.warn(`[auth] ${req.method} ${req.path} missing session`, {
      sid: req.sessionID,
      cookie: req.headers.cookie,
    });
    return res.status(401).json({ message: "Authentication required" });
  }
  routeLog.info(`[auth] ${req.method} ${req.path} user=${req.session.userId}`);
  next();
}

export function requireRole(...roles: string[]) {
  const allowedRoles = roles.includes("super_admin") ? roles : [...roles, "super_admin"];
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(req.session.userId);
    const normalizedRole = user?.role?.trim();
    const hasRole = !!normalizedRole && allowedRoles.includes(normalizedRole);
    routeLog.info(
      `[auth] ${req.method} ${req.path} user=${user?.id ?? "unknown"} role=${normalizedRole ?? "none"} allowed=${allowedRoles.join(",")}`,
    );
    if (!user || !hasRole) {
      routeLog.warn(
        `[auth] Role check failed for user=${user?.id ?? "unknown"} role=${user?.role ?? "none"} required=${allowedRoles.join(",")}`,
      );
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
