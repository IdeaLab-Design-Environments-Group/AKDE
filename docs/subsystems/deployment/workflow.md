# Deployment Workflow

## File

- [.github/workflows/deploy.yml](/Users/emredayangac/Documents/AKDE/.github/workflows/deploy.yml)

## Build result

`npm run build` does two things:

1. `tsc --noEmit`
2. `vite build`

The generated artifact is root `dist/`, which the Pages workflow uploads.

## GitHub Actions workflow

`.github/workflows/deploy.yml` does the following on push to `main`:

1. check out the repo
2. install Node
3. run `npm ci`
4. run `npm run build`
5. upload `dist/`
6. deploy via Pages

This means the deploy artifact is always a clean CI rebuild, not a manually committed build directory.

## One-time Pages setup

In the repository settings:

- go to `Settings -> Pages`
- under `Build and deployment`
- set `Source = GitHub Actions`

## Common failure modes

- wrong base path
- wrong artifact directory
- repo slug changed without updating `VITE_BASE` or the fallback base path
