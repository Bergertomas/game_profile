import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint flat config.
 *
 * `next lint` was removed in Next 16, so linting runs through ESLint directly
 * (`npm run lint`). eslint-config-next 16 ships native flat-config entry
 * points, so no eslintrc compatibility layer is involved.
 */
const config = [
  {
    ignores: [
      ".next/**",
      // The Playwright run builds the multi-scope test corpus into its own
      // dist directory so two concurrent builds cannot overwrite each other's
      // prerendered pages. Build output, same as `.next`.
      ".next-*/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "screenshots/**",
      "test-results/**",
      "playwright-report/**",
      // Archived Fable output is design evidence, not application source. It
      // carries generated React support code that we do not own or ship; the
      // containment gate separately proves design artifacts stay out of public
      // builds.
      "docs/design/artifacts/**",
      "lib/db/migrations/**",
      "next-env.d.ts",
      ".open-next/**",
      ".wrangler/**",
      "cloudflare-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    settings: {
      // Pinned rather than auto-detected. eslint-plugin-react's detection path
      // calls context.getFilename(), which ESLint 10 removed; setting the
      // version explicitly skips that path entirely. It is also simply more
      // accurate than sniffing node_modules.
      react: { version: "19.2" },
    },
    rules: {
      // Deliberate: the rubric, fixtures and radar geometry are typed end to
      // end, so an escape hatch here would hide a real modelling problem.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
