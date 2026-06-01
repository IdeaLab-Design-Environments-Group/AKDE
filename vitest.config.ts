import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { coffeePlugin } from "./scripts/vite-plugin-coffee.js";

export default defineConfig({
  plugins: [coffeePlugin()],
  test: {
    globals: false,
    environment: "node",
  },
  resolve: {
    alias: {
      "@kirigami": resolve(__dirname, "kirigami"),
      "@fkld": resolve(__dirname, "fkld"),
    },
  },
});
