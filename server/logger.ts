import fs from "fs";
import path from "path";
import pino, { multistream, type StreamEntry } from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { createStream } from "rotating-file-stream";
import { config } from "@shared/config";

const buildConsoleStream = () => {
  if (config.logging.pretty) {
    return pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        singleLine: false,
      },
    });
  }
  return process.stdout;
};

const buildFileStream = () => {
  if (!config.logging.file.enabled) {
    return null;
  }
  const filePath = config.logging.file.path;
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const baseName = path.basename(filePath);

  const rotationStream = createStream(baseName, {
    path: directory,
    size: `${config.logging.file.maxSizeMB}M`,
    interval: config.logging.file.interval as any,
    maxFiles: config.logging.file.maxFiles,
    compress: "gzip",
  });

  rotationStream.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("[logging] rotating stream error", error);
  });
  rotationStream.on("open", () => {
    // eslint-disable-next-line no-console
    console.info("[logging] file stream opened", filePath);
  });

  return rotationStream;
};

const streamEntries: StreamEntry[] = [];
const consoleStream = buildConsoleStream();
if (consoleStream) {
  streamEntries.push({ level: config.logging.level, stream: consoleStream });
}

const fileStream = buildFileStream();
if (fileStream) {
  // eslint-disable-next-line no-console
  console.info("[logging] file logging enabled", config.logging.file.path);
  streamEntries.push({ level: config.logging.level, stream: fileStream });
} else if (config.logging.file.enabled) {
  // eslint-disable-next-line no-console
  console.warn("[logging] file logging was enabled but stream could not be created", {
    path: config.logging.file.path,
  });
}

const destination =
  streamEntries.length > 1
    ? multistream(streamEntries)
    : streamEntries[0]?.stream ?? process.stdout;

export const logger: any = pino(
  {
    level: config.logging.level,
  },
  destination,
);

export const createLogger = (module: string, bindings?: Record<string, unknown>) =>
  logger.child({
    module,
    ...bindings,
  });

const paymentTraceLogger = createLogger("payments");
const smsTraceLogger = createLogger("sms");
const httpTraceLogger = createLogger("http-trace");

export const logPaymentTrace = (
  message: string,
  bindings?: Record<string, unknown>,
): void => {
  if (!config.logging.trace.payments) {
    return;
  }
  if (bindings) {
    paymentTraceLogger.info(bindings, message);
  } else {
    paymentTraceLogger.info(message);
  }
};

export const logSmsTrace = (message: string, bindings?: Record<string, unknown>): void => {
  if (!config.logging.trace.sms) {
    return;
  }
  if (bindings) {
    smsTraceLogger.info(bindings, message);
  } else {
    smsTraceLogger.info(message);
  }
};

export const logHttpTrace = (message: string, bindings?: Record<string, unknown>): void => {
  if (!config.logging.trace.http) {
    return;
  }
  if (bindings) {
    httpTraceLogger.info(bindings, message);
  } else {
    httpTraceLogger.info(message);
  }
};

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const headerName = "x-request-id";
    const existingId =
      (req.headers[headerName] as string | undefined) ||
      (req.headers[headerName.toUpperCase()] as string | undefined);
    const id = existingId || randomUUID();
    res.setHeader(headerName, id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
});
