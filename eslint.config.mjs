import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier/flat"

// Next 16 ships eslint-config-next as native flat config, so we spread the
// shared configs directly instead of going through @eslint/eslintrc FlatCompat
// (which broke under the newer config validator).
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "tailwind.config.js",
      "postcss.config.js",
      "prettier.config.js",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  prettier,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // React-Compiler-aware rules newly enforced by eslint-config-next 16.
      // They flag valid patterns in this static, read-only app (guarded async
      // fetch->setState, stable icon lookups, TanStack Table's uncacheable API),
      // so keep them visible as warnings instead of failing the lint gate.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
]

export default eslintConfig
