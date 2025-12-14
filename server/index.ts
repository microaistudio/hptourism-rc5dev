import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "@shared/config";
import { httpLogger, logger } from "./logger";
import { globalRateLimiter } from "./security/rateLimit";
import helmet from "helmet";
import { startBackupScheduler } from "./services/backup-scheduler";

const app = express();
logger.info(
  {
    level: config.logging.level,
    pretty: config.logging.pretty,
    file: config.logging.file,
  },
  "[logging] bootstrap configuration",
);
// Behind reverse proxy (nginx) so secure cookies work
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for now to prevent breaking frontend assets
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(globalRateLimiter);

app.use(httpLogger);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Handle Zod errors specifically
    if (err.name === 'ZodError' || (err.errors && Array.isArray(err.errors))) {
      return res.status(400).json({
        message: "Validation Error",
        errors: err.errors
      });
    }

    // Log the error if it's a server error
    if (status >= 500) {
      logger.error({ err }, "[server] Unhandled error");
    }

    res.status(status).json({ message });
    // Do not re-throw error as response is already sent
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = config.server.port;
  server.listen({
    port,
    host: config.server.host,
    reusePort: true,
  }, () => {
    logger.info({ port, host: config.server.host }, "server started");

    // Initialize backup scheduler
    startBackupScheduler().catch((err) => {
      logger.error({ err }, "Failed to start backup scheduler");
    });
  });
})();
