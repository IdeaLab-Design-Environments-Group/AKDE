# Deployment Vite And Pages

## Files

- [vite.config.ts](/Users/emredayangac/Documents/AKDE/vite.config.ts)
- [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)

## Current hosting target

The live app is a GitHub Pages project site served under:

`https://idealab-design-environments-group.github.io/AKDE/`

Because it is a project site instead of a root-domain site, production assets must be emitted under `/AKDE/`.

## Vite structure

The current Vite shape is:

- source root: `app/`
- build output: root `dist/`
- dev base path: `/`
- production base path: `/AKDE/` unless overridden with `VITE_BASE`

This split matters:

- local dev should behave like a normal root-served app
- Pages should behave like a repo-subpath-served app
