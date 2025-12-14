import "@testing-library/jest-dom/vitest";

// Provide minimal environment defaults so shared config parsing succeeds during tests.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/testdb";
process.env.SESSION_SECRET ??= "test-session-secret-must-be-long-123456";
