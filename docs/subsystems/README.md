# AKDE Subsystem Docs

This folder splits the codebase documentation by subsystem instead of trying to describe the whole repo in one file.

## Documents

- [file-reference.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/file-reference.md)
  - Detailed file-by-file code reference: exports, internal sequencing, contracts, and test coverage.

- [app-shell/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/app-shell/README.md)
  - Browser entrypoint, DOM bootstrap, static HTML, CSS, and top-level composition.

- [controller/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/controller/README.md)
  - Recompute pipeline, validation flow, view orchestration, and derived-field formatting.

- [model/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/model/README.md)
  - Geometry, constraints, validation, pattern generation, SVG export, and ZIP packaging.

- [views/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/views/README.md)
  - Input, checklist, pattern, export, and simulation modal/canvas responsibilities.

- [simulation/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/simulation/README.md)
  - Fold-net topology, bar-and-hinge model, solver, GPU path, and scene construction.

- [deployment/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/deployment/README.md)
  - Vite root/output structure, GitHub Pages base path, and deployment workflow.

- [tests/README.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/tests/README.md)
  - What the tests assert and which contracts they lock down.

## Reading order

Recommended order for onboarding:

1. `file-reference.md`
2. `app-shell/README.md`
3. `controller/README.md`
4. `model/README.md`
5. `views/README.md`
6. `simulation/README.md`
7. `deployment/README.md`
8. `tests/README.md`

## Design rule

If code and docs disagree, trust the code first, then update the relevant subsystem doc in the same change.
