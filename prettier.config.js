/** @type {import('prettier').Config} */
module.exports = {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  // Blank entries are where a blank line is emitted between groups, which is
  // how @ianvs/prettier-plugin-sort-imports v4 expresses separation.
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "^(next/(.*)$)|^(next$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^types$",
    "^@/types/(.*)$",
    "^@/config/(.*)$",
    "^@/lib/(.*)$",
    "^@/hooks/(.*)$",
    "^@/components/ui/(.*)$",
    "^@/components/(.*)$",
    "^@/styles/(.*)$",
    "^@/app/(.*)$",
    "",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  // Lets the plugin parse syntax up to the TypeScript version in use.
  importOrderTypeScriptVersion: "6.0.0",
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  // v4 sorts specifiers, merges duplicate imports and combines type/value
  // imports by default; the v3 options that configured those were removed and
  // were being reported as unknown on every run.
}
