# AKDE Subsystem Docs

This folder splits the codebase documentation by subsystem instead of trying to describe the whole repo in one file.

## Documents

- [app-shell.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/app-shell.md)
  - Browser entrypoint, DOM bootstrap, static HTML, CSS, and top-level composition.

- [controller.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/controller.md)
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

1. `app-shell.md`
2. `controller.md`
3. `model/README.md`
4. `views/README.md`
5. `simulation/README.md`
6. `deployment/README.md`
7. `tests/README.md`

## Design rule

If code and docs disagree, trust the code first, then update the relevant subsystem doc in the same change.
