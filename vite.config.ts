import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "app",
  publicDir: false,
  resolve: {
    alias: {
      "@kirigami": resolve(__dirname, "kirigami"),
    },
  },
  server: {
    open: true,
  },
});
