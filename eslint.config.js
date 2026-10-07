import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".cache/**",
      ".superpowers/**",
      ".npm-cache/**",
      "test-results/**",
      "playwright-report/**",
      "android/app/build/**",
      "public/games/battlecity/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Canvas games use imperative refs; React Compiler is not enabled.
      // Preserve hook ordering and dependency checks independently of compiler diagnostics.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    files: [
      "src/components/DrawingGallery.tsx",
      "src/components/ui/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/lib/logger.ts", "src/main.tsx"],
    rules: {
      "no-console": "off",
    },
  },
  {
    extends: [js.configs.recommended],
    files: ["functions/**/*.js", "tests/**/*.mjs", "scripts/**/*.mjs", "public/sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
);
