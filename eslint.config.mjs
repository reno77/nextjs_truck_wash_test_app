import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow unused vars in test files and for underscore-prefixed variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Allow any type in test files and API routes where it's common
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused expressions in test files
      "@typescript-eslint/no-unused-expressions": "off",
      // Allow require imports for dynamic imports in tests
      "@typescript-eslint/no-require-imports": "off",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "off",
      // Allow img elements (we can optimize later)
      "@next/next/no-img-element": "warn",
    },
  },
  {
    files: ["**/__tests__/**/*", "**/*.test.*"],
    rules: {
      // More lenient rules for test files
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
