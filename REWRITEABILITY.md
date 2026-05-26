# AKDE Rewriteability Guide

This document is the file-specific rewrite guide for AKDE. It answers a narrow question:

> If you want to replace or heavily refactor a file, what must remain true for the rest of the repo to keep working?

Use it before large refactors, renderer swaps, simulation rewrites, or UI rebuilds.

## Rewriteability levels

- `High`: the file can be rewritten freely if its public behavior stays the same.
- `Medium`: the file can be rewritten, but downstream code depends on specific shapes, names, or sequencing.
- `Low`: rewrite only with deliberate coordination because the file encodes shared contracts or mathematical authority.

## Global invariants

These apply across almost every file:

- All physical lengths are in `mm`.
- Internal angles are in `rad`.
- `K_tot` in the UI means vertical apex height `H`, not slant height and not `Nθ`.
- Local dev runs at `/`; production Pages builds run at `/AKDE/` unless `VITE_BASE` overrides it.
- `kirigami/model/` is the source of truth for geometry and constraints.
- `kirigami/view/` should not invent geometry.
- Tests are expected to lock down externally visible behavior after rewrites.

## Root and Config Files

### [package.json](/Users/emredayangac/Documents/AKDE/package.json)
Rewriteability: `Medium`

Preserve:
- Script names: `dev`, `build`, `test`, `preview`
- Build path expectations used by docs and GitHub Pages

Safe to change:
- Dependency versions
- Additional scripts
- Internal toolchain choices, if the script contract remains stable

### [vite.config.ts](/Users/emredayangac/Documents/AKDE/vite.config.ts)
Rewriteability: `Low`

Preserve:
- Vite source root = `app/`
- Production output = root `dist/`
- Production base path behavior for GitHub Pages
- `@kirigami` alias resolution

Safe to change:
- Dev server options
- Build optimizations and chunking

Risk:
- This file must stay aligned with `.github/workflows/deploy.yml` and README deployment instructions.

### [.github/workflows/deploy.yml](/Users/emredayangac/Documents/AKDE/.github/workflows/deploy.yml)
Rewriteability: `Medium`

Preserve:
- Publish artifact path = `dist`
- Trigger path for Pages deployment

Safe to change:
- Node version
- Caching details
- Job naming

Risk:
- If this workflow stops uploading root `dist/`, the live Pages site breaks even if local builds still work.

### [README.md](/Users/emredayangac/Documents/AKDE/README.md)
Rewriteability: `High`

Preserve:
- Accurate run instructions
- Accurate deployment notes
- Links to the plan and formula docs

### [CONTRIBUTING.md](/Users/emredayangac/Documents/AKDE/CONTRIBUTING.md)
Rewriteability: `High`

Preserve:
- Architecture description
- Deployment-path notes
- File map accuracy

### [theory/current-formulas.tex](/Users/emredayangac/Documents/AKDE/theory/current-formulas.tex)
Rewriteability: `Medium`

Preserve:
- Match the active implementation, not aspirational math
- Keep source references under the relevant formula groups

Safe to change:
- Formatting
- Section order
- Citation wording

### [theory/current-formulas.pdf](/Users/emredayangac/Documents/AKDE/theory/current-formulas.pdf)
Rewriteability: `High`

This is build output. Regenerate it whenever `theory/current-formulas.tex` changes.

## App Shell

### [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)
Rewriteability: `Medium`

Preserve:
- `#app` mount point
- `.app-header` for header action mounting
- Basic page bootstrapping for `main.ts`

Safe to change:
- Static markup around those anchors
- Metadata
- Page copy

### [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts)
Rewriteability: `Medium`

Preserve:
- Creates the input/checklist/pattern view stack
- Wires controller, export modal, and sim modal
- Keeps `#app` bootstrap behavior

Safe to change:
- DOM composition
- Ordering of UI regions
- Non-contract visual wrappers

Risk:
- If you replace this file, keep the controller/view wiring clear. It is the main composition root.

### [app/styles.css](/Users/emredayangac/Documents/AKDE/app/styles.css)
Rewriteability: `High`

Preserve:
- Class names expected by the views
- Visual distinctions for polygon, molecule, fold, cut, and modal states

Safe to change:
- Layout system
- Typography
- Color system
- Motion and responsive behavior

## Controller Layer

### [kirigami/controller/kirigami-controller.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/kirigami-controller.ts)
Rewriteability: `Low`

Preserve:
- Validation before compute
- `computeState(...)` then `evaluateConstraints(...)` sequencing
- Null-state behavior for invalid inputs
- `getState()` and `getExportPayload()` semantics
- Derived field formatting contract passed to `InputsPanel`

Safe to change:
- Debounce strategy
- Internal state organization
- How view render models are assembled

Risk:
- This file is the orchestration spine. Rewrites ripple into every view.

### [kirigami/controller/formatters.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/formatters.ts)
Rewriteability: `High`

Preserve:
- Stable human-readable formatting for `mm` and angle display

Safe to change:
- String formatting details, as long as tests still pass and UI remains readable

## Model Layer

### [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
Rewriteability: `Low`

Preserve:
- `KirigamiInputs`
- `KirigamiDerived`
- `KirigamiState`
- `ConstraintState`

Risk:
- This is the main cross-layer contract. Renames or shape changes cascade through controller, views, tests, and exports.

### [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)
Rewriteability: `Low`

Preserve:
- The meaning of `H`, `R`, `s`, `eta`, `theta`, `tau`, `w`, `gamma`, `rApex`
- `defaultInputs()` behavior unless intentionally changing product defaults
- The active minor-cut formula branch and its documented meaning
- Error behavior for invalid apex height in `computeState(...)`

Safe to change:
- Internal derivation structure
- Helper decomposition
- Numeric-stability improvements

Risk:
- This file is mathematical authority in code form. Rewrite only with test updates and formula-doc updates together.

### [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)
Rewriteability: `Medium`

Preserve:
- Constraint IDs `C1` through `C6`
- Residual semantics
- Labels/messages used by the checklist

Safe to change:
- Internal implementations
- Tolerances, if done intentionally and tests are updated

Risk:
- UI copy, tests, and docs all assume the current constraint inventory.

### [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)
Rewriteability: `High`

Preserve:
- Field-level validation role separate from constraint evaluation
- Exported error constants used by the controller

### [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)
Rewriteability: `Medium`

Preserve:
- `PatternNet` shape
- Segment roles: `polygon`, `boundary`, `molecule-fill`, `molecule`, `cut`, `fold`
- ViewBox/segment output suitable for both on-screen rendering and export

Safe to change:
- Geometric construction details
- Helper layout functions
- Internal polygon/molecule decomposition

Risk:
- Export, tests, and the visual canvas all depend on this output contract.

### [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)
Rewriteability: `Medium`

Preserve:
- Cut/score split semantics
- Shared viewBox alignment between exported SVGs
- Public exports: `buildCricutSvgFiles`, `buildCricutZip`, `buildCricutPreviews`, `buildExportPayload`

Safe to change:
- SVG assembly internals
- Preview markup details
- File naming if coordinated with tests and UI copy

### [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)
Rewriteability: `High`

Preserve:
- Returns valid ZIP bytes
- Current archive layout expected by export tests

Safe to change:
- Internal ZIP implementation
- CRC or byte-writing helpers

### [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)
Rewriteability: `Medium`

Preserve:
- Barrel exports used by tests and downstream imports

Risk:
- Easy to overlook during rewrites; broken barrel exports create wide but shallow failures.

## View Layer

### [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)
Rewriteability: `Medium`

Preserve:
- Public API: input retrieval, input setting, change subscription, render behavior
- Input names and meanings
- Inline validation display hooks

Safe to change:
- DOM structure
- Interaction design
- Visual grouping of inputs and derived values

### [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)
Rewriteability: `High`

Preserve:
- Renders `ConstraintState[]`
- Safe text handling

### [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)
Rewriteability: `High`

Preserve:
- Consumes `PatternNet`
- Maps segment roles to render output

### [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)
Rewriteability: `Medium`

Preserve:
- Provider-based data flow from controller
- Single download action semantics
- Ability to render cut/score/both previews

### [kirigami/view/sim-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-modal.ts)
Rewriteability: `Medium`

Preserve:
- Provider-based state access
- Modal trigger and lifecycle
- State handoff into simulation view

### [kirigami/view/sim-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-canvas.ts)
Rewriteability: `Medium`

Preserve:
- The ability to visualize a `KirigamiState` through the sim pipeline
- Separation between DOM/modal concerns and solver internals

### [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)
Rewriteability: `Medium`

Preserve:
- Barrel exports consumed by `app/main.ts`

## Simulation Layer

The simulation files are more rewriteable than the geometry core, but less rewriteable than plain view code because they share data-shape and terminology contracts.

### [kirigami/sim/foldnet.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/foldnet.ts)
Rewriteability: `Medium`

Preserve:
- Fold-net topology contract used by model/solver/build layers

### [kirigami/sim/model.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/model.ts)
Rewriteability: `Medium`

Preserve:
- `BarHingeModel` and `SolverParams` shape
- `DEFAULT_PARAMS`
- Fixed-vertex semantics

### [kirigami/sim/forces.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/forces.ts)
Rewriteability: `Medium`

Preserve:
- Public function names used by the CPU solver
- Force accumulation conventions

### [kirigami/sim/solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/solver.ts)
Rewriteability: `Medium`

Preserve:
- `FoldSolver` API
- `measureTheta` semantics

### [kirigami/sim/build.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/build.ts)
Rewriteability: `Medium`

Preserve:
- Public scene/model builder entry points
- Bridge between kirigami geometry and simulation structures

### [kirigami/sim/vec3.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/vec3.ts)
Rewriteability: `High`

Preserve:
- Vector API used by simulation modules

### [kirigami/sim/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/index.ts)
Rewriteability: `Medium`

Preserve:
- Node-safe barrel behavior
- Export surface used by tests or future integration

### [kirigami/sim/gpu/gpu-solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/gpu-solver.ts)
Rewriteability: `High`

Preserve:
- Any public API actually consumed by `sim-canvas.ts`

Safe to change:
- Nearly all implementation detail. This is an accelerator path, not the main geometry contract.

### [kirigami/sim/gpu/pack.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/pack.ts)
Rewriteability: `High`

Preserve:
- Packing shape expected by the GPU solver

### [kirigami/sim/gpu/shaders.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/shaders.ts)
Rewriteability: `High`

Preserve:
- Shader IO expectations

### [theory/sim-ecs.md](/Users/emredayangac/Documents/AKDE/theory/sim-ecs.md)
Rewriteability: `High`

Preserve:
- Only if it is still meant to describe the implemented simulation architecture

## Tests

### [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts), [tests/geometry-functions.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry-functions.test.ts), [tests/constraints.test.ts](/Users/emredayangac/Documents/AKDE/tests/constraints.test.ts), [tests/pattern.test.ts](/Users/emredayangac/Documents/AKDE/tests/pattern.test.ts), [tests/svg-export.test.ts](/Users/emredayangac/Documents/AKDE/tests/svg-export.test.ts), [tests/validation.test.ts](/Users/emredayangac/Documents/AKDE/tests/validation.test.ts), [tests/formatters.test.ts](/Users/emredayangac/Documents/AKDE/tests/formatters.test.ts), [tests/vec3.test.ts](/Users/emredayangac/Documents/AKDE/tests/vec3.test.ts), [tests/zip.test.ts](/Users/emredayangac/Documents/AKDE/tests/zip.test.ts), [tests/sim.test.ts](/Users/emredayangac/Documents/AKDE/tests/sim.test.ts)
Rewriteability: `High`

Preserve:
- Coverage of externally meaningful behavior

Safe to change:
- Test organization
- Helpers
- Fixture structure

Risk:
- During rewrites, tests should move last. They are the best executable statement of what must survive.

### [tests/_diag-*.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-chord.ts:1)
Rewriteability: `High`

These look diagnostic rather than contractual. Treat them as disposable debugging aids unless another document elevates them to required tooling.

## Rewrite strategy by area

### If you are rewriting the UI

Safest order:

1. Keep `kirigami/model/types.ts` and `kirigami/model/*` stable.
2. Keep `KirigamiController` public behavior stable.
3. Replace `app/*` and `kirigami/view/*`.
4. Re-run visual/export tests.

### If you are rewriting the math

Safest order:

1. Update `geometry.ts`, `constraints.ts`, and `validation.ts` together.
2. Update [theory/current-formulas.tex](/Users/emredayangac/Documents/AKDE/theory/current-formulas.tex) in the same change.
3. Update tests immediately after.
4. Only then adjust view/controller copy if labels changed.

### If you are rewriting export

Safest order:

1. Preserve `PatternNet` first.
2. Change `svg-export.ts` and `zip.ts`.
3. Verify `ExportModal` still consumes the same payload shape.

### If you are rewriting deployment

Safest order:

1. Keep `vite.config.ts`, `.github/workflows/deploy.yml`, and README deployment notes in sync.
2. Verify `dist/index.html` asset paths after build.
3. Only then remove old publish-path assumptions.
