import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "*.js", "*.d.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Permitir 'any' en backend (común en NestJS)
      "@typescript-eslint/no-unused-vars": "off", // Ya está desactivado en root config
      "@typescript-eslint/ban-ts-comment": "off", // Permitir @ts-ignore/@ts-expect-error
      "@typescript-eslint/no-require-imports": "off", // Permitir require() cuando sea necesario
      "no-case-declarations": "off", // Permitir declaraciones en case blocks
    },
  }
);

