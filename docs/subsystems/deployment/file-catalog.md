# Deployment File Catalog

This catalog documents the code and configuration files involved in build and
deployment.

## [package.json](/Users/emredayangac/Documents/AKDE/package.json)

### Purpose

Defines the project package metadata, script contract, and dependencies.

### Package Settings

- `name`: `akde`
- `private`: `true`
- `type`: `module`

`type: module` means project JavaScript uses ESM semantics. TypeScript imports
therefore use `.js` extensions in source where emitted module paths need them.

### Scripts

- `dev`
  - Runs Vite dev server.
- `build`
  - Runs `tsc --noEmit`.
  - Then runs `vite build`.
- `preview`
  - Runs Vite preview server for production build output.
- `test`
  - Runs Vitest once.
- `test:watch`
  - Runs Vitest in watch mode.

### Dependencies

Runtime:

- `three`

Development:

- `@types/node`
- `@types/three`
- `typescript`
- `vite`
- `vitest`

### Contract

Docs, CI, and local workflow assume `dev`, `build`, `test`, and `preview`
continue to exist.

## [vite.config.ts](/Users/emredayangac/Documents/AKDE/vite.config.ts)

### Purpose

Vite build and dev-server configuration.

### Imports

- `defineConfig` from `vite`.
- `resolve` from `node:path`.

### Constants

- `REPO_BASE`
  - Uses `process.env.VITE_BASE`.
  - Falls back to `/AKDE/`.

### Exported Config

The default export is `defineConfig(({ command }) => ({ ... }))`.

Important settings:

- `base`
  - `/` during dev.
  - `REPO_BASE` during production build.
- `root`
  - `app`.
- `publicDir`
  - `false`.
- `resolve.alias`
  - `@kirigami` maps to repository `kirigami/`.
- `build.outDir`
  - Root `dist`.
- `build.emptyOutDir`
  - `true`.
- `server.open`
  - `true`.

### Deployment Contract

GitHub Pages serves this repo under `/AKDE/`, so production assets must be
built with that base unless the deployment target changes. The workflow uploads
root `dist`, so `outDir` must stay aligned with CI.

## [vitest.config.ts](/Users/emredayangac/Documents/AKDE/vitest.config.ts)

### Purpose

Vitest test-runner configuration.

### Imports

- `defineConfig` from `vitest/config`.
- `resolve` from `node:path`.

### Settings

- `test.globals = false`
  - Tests import `describe`, `it`, and `expect` explicitly.
- `test.environment = "node"`
  - Main suite runs without a browser.
- `resolve.alias["@kirigami"]`
  - Matches Vite alias behavior.

### Contract

The simulation core and model tests must remain Node-compatible. Browser-only
code should stay behind dynamic imports or be isolated from this test config.

## [tsconfig.json](/Users/emredayangac/Documents/AKDE/tsconfig.json)

### Purpose

TypeScript compiler configuration.

### Compiler Options

- `target: ES2022`
- `module: ESNext`
- `moduleResolution: bundler`
- `strict: true`
- `noEmit: true`
- `skipLibCheck: true`
- `esModuleInterop: true`
- `isolatedModules: true`
- libraries:
  - `ES2022`
  - `DOM`
  - `DOM.Iterable`
- types:
  - `node`
- `baseUrl: .`
- path alias:
  - `@kirigami/*` -> `kirigami/*`

### Included Files

- `app/**/*`
- `kirigami/**/*`
- `tests/**/*`
- `vite.config.ts`
- `vitest.config.ts`

### Contract

`noEmit` means typechecking is separate from bundle output. Vite remains
responsible for browser build output.

## [.github/workflows/deploy.yml](/Users/emredayangac/Documents/AKDE/.github/workflows/deploy.yml)

### Purpose

GitHub Actions workflow for GitHub Pages deployment.

### Expected Flow

1. Trigger on push to `main`.
2. Check out repository.
3. Set up Node.
4. Install dependencies with `npm ci`.
5. Build with `npm run build`.
6. Upload root `dist`.
7. Deploy using GitHub Pages actions.

### Contract

The workflow assumes:

- `npm run build` typechecks and builds.
- Vite emits `dist` at repo root.
- GitHub Pages source is configured as GitHub Actions.

If the repo slug changes or the app moves to a custom domain, update the Vite
base path through `VITE_BASE` or the config fallback.
