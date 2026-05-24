import { defineConfig } from "vite";
import { resolve } from "node:path";

// GitHub Pages serves this project repo under /<repo>/, so production assets need that base
// path. Dev keeps "/" so `npm run dev` works at the root. Override with VITE_BASE if the repo
// is renamed or moved to a custom domain (set VITE_BASE=/ for a user/org or custom-domain site).
const REPO_BASE = process.env.VITE_BASE ?? "/AKDE/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? REPO_BASE : "/",
  root: "app",
  publicDir: false,
  resolve: {
    alias: {
      "@kirigami": resolve(__dirname, "kirigami"),
    },
  },
  build: {
    // Emit the site at the repo root so the Pages workflow uploads ./dist.
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
}));
