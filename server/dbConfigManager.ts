import fs from "fs";
import path from "path";
import type { DbConnectionRecord } from "@shared/dbConfig";

const defaultEnvPath = process.env.HPT_ENV_FILE
  ? path.resolve(process.env.HPT_ENV_FILE)
  : path.resolve(process.cwd(), ".env");
const databaseConfigPath = path.resolve(process.cwd(), "Database/db-config.env");

const ensureDirectory = (filePath: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const setEnvEntries = (filePath: string, entries: Record<string, string>) => {
  ensureDirectory(filePath);
  let contents = "";
  if (fs.existsSync(filePath)) {
    contents = fs.readFileSync(filePath, "utf8");
  }

  const lines = contents.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const [key, value] of Object.entries(entries)) {
    const pattern = new RegExp(`^${key}=.*$`, "m");
    const replacement = `${key}=${value}`;
    if (pattern.test(contents)) {
      contents = contents.replace(pattern, replacement);
    } else {
      lines.push(replacement);
      contents = lines.join("\n");
    }
  }

  if (!contents.endsWith("\n")) {
    contents += "\n";
  }

  fs.writeFileSync(filePath, contents, "utf8");
};

const maskValue = (value: string | undefined) => encodeURIComponent(value ?? "");

export const formatConnectionString = (settings: Pick<DbConnectionRecord, "host" | "port" | "database" | "user" | "password">) => {
  const user = maskValue(settings.user);
  const password = settings.password ? `:${maskValue(settings.password)}` : "";
  return `postgresql://${user}${password}@${settings.host}:${settings.port}/${settings.database}`;
};

export const updateDbEnvFiles = (settings: DbConnectionRecord) => {
  const connectionString = formatConnectionString(settings);
  setEnvEntries(defaultEnvPath, {
    DATABASE_URL: connectionString,
  });

  ensureDirectory(databaseConfigPath);
  const data = [
    "# Auto-generated database configuration",
    `POSTGRES_HOST=${settings.host}`,
    `POSTGRES_PORT=${settings.port}`,
    `POSTGRES_DB=${settings.database}`,
    `POSTGRES_USER=${settings.user}`,
    `POSTGRES_PASSWORD=${settings.password ?? ""}`,
    `HOMESTAY_RELEASE_ROOT=${process.cwd()}`,
    `DATABASE_URL=${connectionString}`,
    "",
  ].join("\n");

  fs.writeFileSync(databaseConfigPath, data, "utf8");
};
