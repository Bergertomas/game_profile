import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The database-backed suite.
 *
 * Separate from `vitest.config.mts` because these tests need a real Postgres
 * instance, and the default suite must stay runnable — and fast — on a laptop
 * with no database. `npm run test` never picks these up; `npm run test:db-read`
 * runs exactly these, after `db:setup`.
 *
 * Not parallel: every test reads one shared seeded database, and the reader
 * memoises a per-process snapshot, so concurrent files would fight over both.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/db-read/**/*.test.ts"],
    fileParallelism: false,
  },
});
