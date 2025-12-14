import ws from "ws";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import { config } from "@shared/config";

const { url, driver } = config.database;

if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let pool: PgPool | NeonPool;
let db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>;

if (driver === "pg") {
  const localPool = new PgPool({
    connectionString: url,
    max: 20, // Max connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Return an error after 2s if connection could not be established
  });
  pool = localPool;
  db = drizzlePg(localPool, { schema });
} else {
  neonConfig.webSocketConstructor = ws;

  const neonPool = new NeonPool({
    connectionString: url,
  });
  pool = neonPool;
  db = drizzleNeon(neonPool, { schema });
}

export { pool, db };
