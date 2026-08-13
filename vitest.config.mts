import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // `next/server` expects `globalThis.AsyncLocalStorage`, which every real
    // Next runtime installs and a plain Node process does not.
    setupFiles: ["tests/setup/next-runtime.ts"],
    include: ["tests/**/*.test.ts"],
    // The database-backed suite needs a real Postgres instance and runs under
    // vitest.db.config.mts (`npm run test:db-read`). This one must stay
    // runnable on a laptop with no database.
    exclude: ["node_modules/**", "tests/db-read/**"],
  },
});
