import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { z } from "zod";

const envFile = process.env.HPT_ENV_FILE;
if (envFile && fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

const preprocessBoolean = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    if (["1", "true", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return undefined;
    }
    return value !== 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
};

const booleanFlag = (defaultValue: boolean) =>
  z.preprocess(preprocessBoolean, z.boolean().optional()).default(defaultValue);

const optionalBoolean = () =>
  z.preprocess(preprocessBoolean, z.boolean().optional());

const defaultLocalStoragePath = path.resolve(process.cwd(), "local-object-storage");
const defaultLogFilePath = path.resolve(process.cwd(), "logs", "app.log");

const rawEnv: Record<string, string | undefined> = { ...process.env };
const aliasEnv = (target: string, ...sourceKeys: string[]) => {
  if (rawEnv[target]) {
    return;
  }
  for (const key of sourceKeys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      rawEnv[target] = value;
      break;
    }
  }
};

aliasEnv("FRONTEND_BASE_URL", "VITE_FRONTEND_URL");
aliasEnv("HIMKOSH_PAYMENT_URL", "HIMKOSH_POST_URL");
aliasEnv("HIMKOSH_VERIFICATION_URL", "HIMKOSH_VERIFY_URL");
aliasEnv("HIMKOSH_MERCHANT_CODE", "HIMKOSH_MERCHANTCODE", "HIMKOSH_MERCHANT_ID");
aliasEnv("HIMKOSH_DEPT_ID", "HIMKOSH_DEPT_CODE");
aliasEnv("HIMKOSH_SERVICE_CODE", "HIMKOSH_SERVICECODE");
aliasEnv("HIMKOSH_DDO_CODE", "HIMKOSH_DDO");
aliasEnv("HIMKOSH_HEAD", "HIMKOSH_HEAD_OF_ACCOUNT", "HIMKOSH_HEAD1");
aliasEnv("HIMKOSH_HEAD2", "HIMKOSH_SECONDARY_HEAD", "HIMKOSH_HEAD_OF_ACCOUNT_2");
aliasEnv("HIMKOSH_HEAD2_AMOUNT", "HIMKOSH_SECONDARY_HEAD_AMOUNT");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    HOST: z.string().default("0.0.0.0"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_DRIVER: z.enum(["pg", "neon"]).default("pg"),
    DATABASE_AUTH_TOKEN: z.string().optional(),

    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters")
      .default("staging-session-secret-1234567890-default-key"),
    SESSION_COOKIE_NAME: z.string().default("hp-tourism.sid"),
    SESSION_COOKIE_DOMAIN: z.string().optional(),
    SESSION_COOKIE_SECURE: booleanFlag(false),
    SESSION_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
    SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(60 * 24),
    SESSION_STORE: z.enum(["postgres", "redis"]).default("postgres"),

    REDIS_URL: z.string().optional(),
    REDIS_TLS: booleanFlag(false),

    USE_MEM_STORAGE: booleanFlag(false),

    OBJECT_STORAGE_MODE: z.enum(["local", "s3", "replit"]).default("local"),
    LOCAL_OBJECT_DIR: z.string().default(defaultLocalStoragePath),
    LOCAL_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
    PRIVATE_OBJECT_DIR: z.string().optional(),

    OBJECT_STORAGE_S3_BUCKET: z.string().optional(),
    OBJECT_STORAGE_S3_REGION: z.string().optional(),
    OBJECT_STORAGE_S3_ENDPOINT: z.string().optional(),
    OBJECT_STORAGE_S3_FORCE_PATH_STYLE: booleanFlag(true),
    OBJECT_STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
    OBJECT_STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
    OBJECT_STORAGE_S3_SIGNED_URL_TTL: z.coerce.number().int().positive().default(15 * 60),

    FRONTEND_BASE_URL: z.string().optional(),

    HIMKOSH_PAYMENT_URL: z.string().optional(),
    HIMKOSH_VERIFICATION_URL: z.string().optional(),
    HIMKOSH_CHALLAN_PRINT_URL: z.string().optional(),
    HIMKOSH_SEARCH_URL: z.string().optional(),
    HIMKOSH_MERCHANT_CODE: z.string().optional(),
    HIMKOSH_DEPT_ID: z.string().optional(),
    HIMKOSH_SERVICE_CODE: z.string().optional(),
    HIMKOSH_DDO_CODE: z.string().optional(),
    HIMKOSH_HEAD: z.string().optional(),
    HIMKOSH_HEAD2: z.string().optional(),
    HIMKOSH_HEAD2_AMOUNT: z.coerce.number().optional(),
    HIMKOSH_RETURN_URL: z.string().optional(),
    HIMKOSH_KEY_FILE_PATH: z.string().optional(),
    HIMKOSH_ALLOW_DEV_FALLBACK: booleanFlag(false),
    HIMKOSH_TEST_MODE: optionalBoolean(),
    HIMKOSH_FORCE_TEST_MODE: optionalBoolean(),

    SECURITY_ENABLE_RATE_LIMIT: booleanFlag(true),
    SECURITY_ENABLE_CSRF: booleanFlag(false),
    SECURITY_CSRF_HEADER: z.string().default("x-csrf-token"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(500),
    RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
    RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_UPLOAD_WINDOW_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
    RATE_LIMIT_UPLOAD_MAX_REQUESTS: z.coerce.number().int().positive().default(30),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    LOG_PRETTY: booleanFlag(false),
    LOG_FILE_ENABLED: booleanFlag(false),
    LOG_FILE_PATH: z.string().default(defaultLogFilePath),
    LOG_FILE_MAX_SIZE_MB: z.coerce.number().int().positive().default(10),
    LOG_FILE_MAX_FILES: z.coerce.number().int().positive().default(7),
    LOG_FILE_ROTATE_INTERVAL: z.string().default("1d"),
    LOG_TRACE_PAYMENTS: booleanFlag(false),
    LOG_TRACE_SMS: booleanFlag(false),
    LOG_TRACE_HTTP: booleanFlag(false),

    CLAMAV_ENABLED: booleanFlag(false),
    CLAMAV_HOST: z.string().default("127.0.0.1"),
    CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
    CLAMAV_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  })
  .superRefine((value, ctx) => {
    if (value.SESSION_STORE === "redis" && !value.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REDIS_URL"],
        message: "REDIS_URL is required when SESSION_STORE=redis",
      });
    }

    if (value.OBJECT_STORAGE_MODE === "s3") {
      const missingKeys: string[] = [];
      if (!value.OBJECT_STORAGE_S3_BUCKET) missingKeys.push("OBJECT_STORAGE_S3_BUCKET");
      if (!value.OBJECT_STORAGE_S3_REGION) missingKeys.push("OBJECT_STORAGE_S3_REGION");
      if (!value.OBJECT_STORAGE_S3_ACCESS_KEY_ID)
        missingKeys.push("OBJECT_STORAGE_S3_ACCESS_KEY_ID");
      if (!value.OBJECT_STORAGE_S3_SECRET_ACCESS_KEY)
        missingKeys.push("OBJECT_STORAGE_S3_SECRET_ACCESS_KEY");
      if (missingKeys.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["OBJECT_STORAGE_MODE"],
          message: `Missing required S3 config: ${missingKeys.join(", ")}`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  server: {
    port: env.PORT,
    host: env.HOST,
  },
  database: {
    url: env.DATABASE_URL,
    driver: env.DATABASE_DRIVER,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
  session: {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_COOKIE_NAME,
    cookieDomain: env.SESSION_COOKIE_DOMAIN,
    secureCookies: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAMESITE,
    idleTimeoutMinutes: env.SESSION_IDLE_TIMEOUT_MINUTES,
    store: env.SESSION_STORE,
  },
  redis: {
    url: env.REDIS_URL,
    tls: env.REDIS_TLS,
  },
  storage: {
    useMemory: env.USE_MEM_STORAGE,
  },
  objectStorage: {
    mode: env.OBJECT_STORAGE_MODE,
    localDirectory: env.LOCAL_OBJECT_DIR,
    maxUploadBytes: env.LOCAL_MAX_UPLOAD_BYTES,
    signedUrlTtlSeconds: env.OBJECT_STORAGE_S3_SIGNED_URL_TTL,
    replitPrivateDir: env.PRIVATE_OBJECT_DIR,
    s3:
      env.OBJECT_STORAGE_MODE === "s3"
        ? {
            bucket: env.OBJECT_STORAGE_S3_BUCKET!,
            region: env.OBJECT_STORAGE_S3_REGION!,
            endpoint: env.OBJECT_STORAGE_S3_ENDPOINT,
            forcePathStyle: env.OBJECT_STORAGE_S3_FORCE_PATH_STYLE,
            credentials: {
              accessKeyId: env.OBJECT_STORAGE_S3_ACCESS_KEY_ID!,
              secretAccessKey: env.OBJECT_STORAGE_S3_SECRET_ACCESS_KEY!,
            },
          }
        : undefined,
  },
  frontend: {
    baseUrl: env.FRONTEND_BASE_URL,
  },
  himkosh: {
    paymentUrl: env.HIMKOSH_PAYMENT_URL,
    verificationUrl: env.HIMKOSH_VERIFICATION_URL,
    challanPrintUrl: env.HIMKOSH_CHALLAN_PRINT_URL,
    searchUrl: env.HIMKOSH_SEARCH_URL,
    merchantCode: env.HIMKOSH_MERCHANT_CODE,
    deptId: env.HIMKOSH_DEPT_ID,
    serviceCode: env.HIMKOSH_SERVICE_CODE,
    ddo: env.HIMKOSH_DDO_CODE,
    head: env.HIMKOSH_HEAD,
    secondaryHead: env.HIMKOSH_HEAD2,
    secondaryHeadAmount: env.HIMKOSH_HEAD2_AMOUNT,
    returnUrl: env.HIMKOSH_RETURN_URL,
    keyFilePath: env.HIMKOSH_KEY_FILE_PATH,
    allowDevFallback: env.HIMKOSH_ALLOW_DEV_FALLBACK,
    testMode: env.HIMKOSH_TEST_MODE,
    forceTestMode: env.HIMKOSH_FORCE_TEST_MODE,
  },
  security: {
    enableRateLimit: env.SECURITY_ENABLE_RATE_LIMIT,
    enableCsrf: env.SECURITY_ENABLE_CSRF,
    csrfHeader: env.SECURITY_CSRF_HEADER,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      authWindowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
      authMaxRequests: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
      uploadWindowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
      uploadMaxRequests: env.RATE_LIMIT_UPLOAD_MAX_REQUESTS,
    },
  },
  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
    trace: {
      payments: env.LOG_TRACE_PAYMENTS,
      sms: env.LOG_TRACE_SMS,
      http: env.LOG_TRACE_HTTP,
    },
    file: {
      enabled: env.LOG_FILE_ENABLED,
      path: env.LOG_FILE_PATH,
      maxSizeMB: env.LOG_FILE_MAX_SIZE_MB,
      maxFiles: env.LOG_FILE_MAX_FILES,
      interval: env.LOG_FILE_ROTATE_INTERVAL,
    },
  },
  clamav: {
    enabled: env.CLAMAV_ENABLED,
    host: env.CLAMAV_HOST,
    port: env.CLAMAV_PORT,
    timeoutMs: env.CLAMAV_TIMEOUT_MS,
  },
};

export type AppConfig = typeof config;
