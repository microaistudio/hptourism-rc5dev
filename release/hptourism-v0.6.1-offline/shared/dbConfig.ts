export type DbConnectionSettings = {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
};

export type DbConnectionMetadata = {
  lastAppliedAt?: string | null;
  lastVerifiedAt?: string | null;
  lastVerificationResult?: "success" | "failure" | null;
  lastVerificationMessage?: string | null;
};

export type DbConnectionRecord = DbConnectionSettings & DbConnectionMetadata;
