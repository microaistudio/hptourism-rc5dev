import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    include: [
      "client/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.ts",
      "shared/**/*.{test,spec}.ts",
    ],
    environment: "jsdom",
    environmentMatchGlobs: [
      ["server/**", "node"],
      ["shared/**", "node"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
    typecheck: {
      tsconfig: path.resolve(__dirname, "tsconfig.vitest.json"),
    },
    coverage: {
      provider: "v8",
      reports: ["text", "html"],
    },
  },
});
