import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { config } from "@shared/config";
import { logger } from "../logger";

type LimiterOptions = {
  windowMs: number;
  max: number;
  message: string;
  type: string;
};

const disabledLimiter: RequestHandler = (_req, _res, next) => next();

const buildLimiter = ({ windowMs, max, message, type }: LimiterOptions) => {
  if (!config.security.enableRateLimit) {
    return disabledLimiter;
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      logger.warn(
        {
          ip: req.ip,
          path: req.originalUrl,
          userId: (req as any)?.session?.userId ?? null,
          limiter: type,
        },
        "Rate limit exceeded",
      );
      res.status(options.statusCode).json({
        message,
      });
    },
  });
};

export const globalRateLimiter = buildLimiter({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: "Too many requests from this IP. Please try again soon.",
  type: "global",
});

export const authRateLimiter = buildLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.authMaxRequests,
  message: "Too many authentication attempts. Please wait a few minutes and try again.",
  type: "auth",
});

export const uploadRateLimiter = buildLimiter({
  windowMs: config.security.rateLimit.uploadWindowMs,
  max: config.security.rateLimit.uploadMaxRequests,
  message: "Upload rate exceeded. Please retry after a short pause.",
  type: "upload",
});
