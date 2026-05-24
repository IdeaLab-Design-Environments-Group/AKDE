# Contributing to AKDE

This document is the onboarding guide for developers working on AKDE. It explains how the project is structured, how data moves through the app, which design patterns are in use, and what practices keep the work reproducible.

## 1. Project purpose

AKDE is a small TypeScript/Vite application that computes and renders a uniform edge-molecule kirigami pattern for a regular `N`-gon pyramid. The mathematical source of truth is [plan/plan.md](/Users/emredayangac/Documents/AKDE/plan/plan.md).

The implementation goal is narrow on purpose:

- deterministic geometry
- explicit constraint checks
- explicit validation rules
- thin DOM views
- no framework runtime
- testable model logic

## 2. Local setup

Prerequisites:

- Node.js 22+ is the safest target here
- npm

Install and run:

```bash
npm install
npm run dev
```

Build and test:

```bash
npm run build
npm run test
```

The Vite app root is `app/`, so the browser entry point is [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html).

## 3. Working rules

These are the rules that keep contributions predictable:

- Keep all physical lengths in `mm`.
- Keep all internal angles in radians.
- Treat `K_tot` as vertical apex height `H`, never as slant height or `Nθ`.
- Treat `T` as material thickness in `mm` and route it through `rApex = T / sin(theta/2)`.
- Put business logic in `kirigami/model/`.
- Keep DOM mutation in `kirigami/view/`.
- Keep orchestration in `kirigami/controller/`.
- Add or update tests for any model change.
- Prefer pure functions for geometry and constraints.
- Reuse the `@kirigami/...` alias instead of long relative imports when crossing top-level folders.

## 4. Architecture at a glance

The codebase uses a small, explicit MVC split.

### Model

The model owns math, validation, constraints, and pattern generation. It should be deterministic and testable without a browser.

### View

The view owns DOM rendering only. It should not derive geometry, enforce equations, or decide validity rules beyond displaying messages already computed elsewhere.

### Controller

The controller is the glue layer. It reads validated inputs from the view, recomputes the model, and pushes the results back into the views.

## 5. Runtime data flow

This is the main execution path in the running app:

1. `app/main.ts` creates the three view instances.
2. `KirigamiController` subscribes to input changes.
3. The inputs panel emits on every `input` and `change`.
4. The controller debounces recomputation.
5. Input validation runs first.
6. If inputs are valid, geometry is recomputed with `computeState(...)`.
7. Constraints are evaluated with `evaluateConstraints(...)`.
8. Pattern geometry is generated with `buildPatternNet(...)`.
9. The three views render:
   - derived values
   - checklist rows
   - SVG pattern

Today the derived panel includes `R`, `s`, `psi`, `kappa`, `eta`, `deltaApex`, `theta`, `w`, `tau`, `rApex`, and the computed minor-cut length.

Invalid inputs short-circuit the pipeline: derived output and pattern output are cleared instead of rendering stale geometry.

## 6. File-by-file guide

### Root files

- [README.md](/Users/emredayangac/Documents/AKDE/README.md)
  - Short project entry point.
  - Explains how to run the app and points to the plan and formula sheet.

- [CONTRIBUTING.md](/Users/emredayangac/Documents/AKDE/CONTRIBUTING.md)
  - This document.

- [current-formulas.tex](/Users/emredayangac/Documents/AKDE/current-formulas.tex)
  - Implementation-synchronized formula reference in LaTeX.
  - Links each formula block to its paper, textbook, or code authority.

- [current-formulas.pdf](/Users/emredayangac/Documents/AKDE/current-formulas.pdf)
  - Compiled formula handout for quick review outside the source tree.

- [package.json](/Users/emredayangac/Documents/AKDE/package.json)
  - Defines the dev workflow:
    - `dev` uses Vite
    - `build` runs TypeScript typechecking plus Vite build
    - `test` runs Vitest once
    - `test:watch` runs Vitest in watch mode

- [tsconfig.json](/Users/emredayangac/Documents/AKDE/tsconfig.json)
  - Enables strict TypeScript.
  - Uses `moduleResolution: "bundler"`.
  - Defines the `@kirigami/*` path alias.

- [vite.config.ts](/Users/emredayangac/Documents/AKDE/vite.config.ts)
  - Sets `app/` as the Vite root.
  - Defines the `@kirigami` alias for runtime imports.
  - Opens the browser on dev start.

- [vitest.config.ts](/Users/emredayangac/Documents/AKDE/vitest.config.ts)
  - Runs tests in Node, not a browser.
  - Reuses the same alias strategy as Vite.

### Planning files

- [plan/plan.md](/Users/emredayangac/Documents/AKDE/plan/plan.md)
  - Mathematical and product spec.
  - Treat this as the design authority.

- [plan/references.md](/Users/emredayangac/Documents/AKDE/plan/references.md)
  - Bibliography and paper references.

### App bootstrap

- [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)
  - Static shell for the app.
  - Defines `#app`, the header, and the footer legend.

- [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts)
  - Runtime entry point.
  - Creates the three columns.
  - Instantiates `InputsPanel`, `ChecklistView`, and `PatternCanvas`.
  - Wires everything together through `createController(...)`.

- [app/styles.css](/Users/emredayangac/Documents/AKDE/app/styles.css)
  - Global styling and panel layout.
  - Encodes the visual legend for polygon faces, molecules, folds, and cuts.
  - Current rendering is DETC-style: yellow face fills, translucent gray molecule fills, black outline, gray cuts/folds.

### Model layer

- [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
  - Core data contracts:
    - `KirigamiInputs`
    - `KirigamiDerived`
    - `KirigamiState`
    - `ConstraintState`
  - Also contains display helpers like `formatMm(...)` and `formatAngleDeg(...)`.
  - This file is the best place to start when learning the domain vocabulary.

- [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)
  - Pure geometry functions for the mathematical pipeline.
  - Computes `R`, `s`, `psi`, `kappa`, `eta`, `deltaApex`, `theta`, `tau`, `w`, `gamma`, `rApex`, the edge-molecule end leg `moleculeEndLeg` (`computeMoleculeEndLeg` = `2·s·tan(θ/2)`), and the active minor-cut length `minorCutLength` (`computeFoldReach` = `hypot(w/2, rApex)`).
  - `computeMinorCutLength(γ, w, T, θ, rApex)` selects among the `MINOR_CUT_FORMULA` family (`tuck-flap`, `lie-flat`, `fold-bound`, `strip-removal`, `end-leg`, `fold-clearance`, `fold-reach`); `fold-reach` is the active default (`computeFoldReach`, `computeFoldClearance`).
  - `computeDerived(...)` is the main stateless aggregator.
  - `computeState(...)` wraps inputs plus derived values into the flat state object used by the app.
  - `defaultInputs()` defines the canonical starting case.

- [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)
  - Encodes C1-C6 from the plan: C1-C4 are DETC Eqs. (1)-(4); C5 (fold overlap, `w ≤ L`) and C6 (cut vs dihedral, `T·tan(γ/2) ≤ s − r_apex`) are AKDE geometric-validity proxies.
  - Each constraint returns a structured `ConstraintState` (with an optional `message`).
  - `evaluateConstraints(...)` is the single collection point used by the controller.

- [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)
  - Input validation only.
  - Separates field validity from the mathematical checklist.
  - Current rules:
    - `H > 0`
    - `T > 0`

- [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)
  - Converts state into renderable SVG path geometry.
  - Builds the apex-centered fan layout described in the plan.
  - Produces a `PatternNet` with:
    - `viewBox`
    - ordered `segments`
  - Face polygons are currently rendered as triangles whose tips sit on the major-cut boundary; molecule outlines remain trapezoids.
  - Also contains helper functions for:
    - molecule apex recovery
    - inner/outer vertex classification
    - valley folds
    - minor-cut endpoints
    - clipped molecule fill polygons
  - This file is the rendering geometry boundary: it should consume derived state, not recalculate the theory independently.

- [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)
  - Cricut export. Splits the net into a **cut** layer (`boundary` + `cut`, black) and a **score** layer (`fold` valley creases + each polygon's two slant side edges, blue).
  - `buildCricutSvgFiles(net)` → two mm-sized SVGs sharing one `viewBox`; `buildCricutZip(net)` packs them under a folder into a `.zip`; `buildCricutPreviews(net)` → cut/score/both thumbnails; `buildExportPayload(net)` bundles previews + archive.

- [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)
  - Tiny dependency-free ZIP writer (STORE / no compression) with CRC32. Pure: returns `Uint8Array`.

- [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)
  - Barrel export for the model layer.
  - Keeps imports simpler for tests and app code.

### View layer

- [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)
  - Renders input controls and derived readouts.
  - Normalizes raw values into a `KirigamiInputs` object.
  - Shows inline validation messages.
  - Owns five current user inputs:
    - `edgeCount` (`N`)
    - `edgeLength` (`L`)
    - `outerEdgeLength` (`L_o`, optional; defaults to `L`)
    - `totalCurvature` (`H`)
    - `materialThickness` (`T`)
  - Exposes:
    - `onChange(...)`
    - `getInputs()`
    - `setInputs(...)`
    - `render(...)`

- [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)
  - Read-only rendering for the constraint list.
  - Displays checkbox state and residuals.
  - Escapes text before injecting HTML.

- [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)
  - Renders the SVG pattern from `PatternNet`.
  - Applies role-based CSS classes such as `stroke-polygon` and `stroke-fold`.
  - Contains no geometry math.

- [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)
  - The header **Export** button and its modal overlay.
  - On open, renders the cut/score/both previews from the provider's `ExportPayload`; the single action downloads the `.zip` archive. DOM only — no geometry.

- [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)
  - Barrel export for the view layer.

### Controller layer

- [kirigami/controller/kirigami-controller.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/kirigami-controller.ts)
  - The application coordinator.
  - Owns transient runtime state:
    - current `KirigamiState`
    - current `ConstraintState[]`
    - debounce timer
  - Flow:
    - listen to view changes
    - validate
    - compute state
    - evaluate constraints
    - build net
    - push results to views

### Tests

- [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts)
  - Golden-case geometry checks.
  - Verifies the canonical square pyramid row, `rApex`, dihedral `gamma`, minor-cut positivity, and angle closure.

- [tests/constraints.test.ts](/Users/emredayangac/Documents/AKDE/tests/constraints.test.ts)
  - Confirms the app exposes C1-C6, that they all pass for the canonical square pyramid, and that C5 fails for a tall pyramid (κ=2) and C6 for very thick material.

- [tests/pattern.test.ts](/Users/emredayangac/Documents/AKDE/tests/pattern.test.ts)
  - Structural checks for the generated SVG geometry.
  - Verifies counts, lengths, adjacency, fold placement, major/minor cut behavior, fill clipping, and support for multiple `N` values.

- [tests/validation.test.ts](/Users/emredayangac/Documents/AKDE/tests/validation.test.ts)
  - Guards field validation behavior and failure modes.

## 7. Design patterns in use

This project is intentionally conservative. The patterns are simple and explicit.

### MVC

The main architectural pattern is Model-View-Controller:

- model = equations and geometry
- view = DOM and SVG rendering
- controller = event orchestration

This keeps math changes isolated from UI changes and makes the model easy to test in Node.

### Functional core, imperative shell

The model is mostly a functional core:

- same input gives same output
- no DOM access
- no hidden mutable state

The imperative shell is the controller and the views, where DOM events and rendering happen.

### Data transfer objects

The app passes strongly typed plain objects between layers:

- `KirigamiInputs`
- `KirigamiDerived`
- `KirigamiState`
- `ConstraintState`
- `PatternNet`

This keeps boundaries explicit and reduces accidental coupling.

### Layered validation

The code deliberately separates:

- input validation in `validation.ts`
- mathematical constraints in `constraints.ts`

That distinction matters. Invalid user input clears the computed output before the constraint checklist is even relevant.

### Barrel exports

`kirigami/model/index.ts` and `kirigami/view/index.ts` are barrel files. They reduce import noise and give contributors a stable public surface for each layer.

### Single source of truth

Mathematical derivation is centralized in `geometry.ts`. Rendering logic should consume that derived state rather than duplicating equations locally.

## 8. Reproducibility practices

Reproducibility matters here because small formula drift can silently break the geometry.

### What currently helps

- Deterministic pure model functions
- Strict TypeScript
- Golden numeric tests
- Centralized formulas
- One defined unit system: `mm`
- One defined angle system internally: radians
- Fixed default inputs
- Plan document as mathematical authority
- Tests that check geometry and rendered pattern structure separately

### How to preserve it

When you change the code:

1. Update the plan first if the math contract changes.
2. Change `geometry.ts` or `pattern.ts`, not both with duplicate formulas unless there is a clear reason.
3. Add or update tests with exact target behavior.
4. Run `npm run test`.
5. Run `npm run build`.
6. Manually inspect the pattern in the browser if the SVG output changed.

### What to avoid

- Hidden unit conversions
- Recomputing `theta`, `w`, or `eta` separately inside views
- Recomputing `gamma`, `rApex`, or minor-cut geometry in the view layer
- Browser-only logic in the model
- Silent fallback formulas
- Unbounded refactors mixed into formula changes

## 9. How to add a feature safely

Use this sequence.

1. Check whether the change affects the math contract in [plan/plan.md](/Users/emredayangac/Documents/AKDE/plan/plan.md).
2. Add or update types in [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts).
3. Implement core math in the model first.
4. Add or update tests in `tests/`.
5. Expose the new output through the controller.
6. Render it in the appropriate view.
7. Run build and test again.

For UI-only work, keep the model untouched unless the UI truly requires a new computed value.

## 10. How to add a new constraint

1. Add a new evaluator in [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts).
2. Return a structured `ConstraintState`.
3. Include it in `evaluateConstraints(...)`.
4. Add a corresponding test.
5. Do not add checklist-only logic to the view.

## 11. How to add a new input

1. Extend `KirigamiInputs` in [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts).
2. Add validation rules in [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts) if needed.
3. Thread the value through `InputsPanel.getInputs()`.
4. Update `computeDerived(...)` and `computeState(...)` if the input affects geometry.
5. Add tests before wiring the new view output.

## 12. How to add a new template

The current code assumes the regular `N`-gon pyramid fan. A new template should be treated as a model extension, not a quick UI toggle.

Recommended approach:

1. Add a template discriminator type.
2. Keep shared scalar math in `geometry.ts` where possible.
3. Branch pattern generation inside `pattern.ts` by template.
4. Add template-specific tests.
5. Only then expose template selection in the inputs panel.

Do not overload existing pyramid helpers with template-specific behavior until the abstraction is clear.

## 13. Review checklist for contributors

Before opening a change, check:

- Are all new lengths still in `mm`?
- Are all internal angles still in radians?
- Does the model remain browser-independent?
- Did you avoid adding business logic to the views?
- Did you update tests for changed math or SVG structure?
- Does `npm run build` pass?
- Does `npm run test` pass?

## 14. Files you should usually not edit casually

- `app/dist/`
  - Build output, not source.

- `node_modules/`
  - Installed dependencies, not source.

- [plan/plan.md](/Users/emredayangac/Documents/AKDE/plan/plan.md)
  - Edit only when the actual mathematical or product contract changes.

## 15. Recommended first tasks for a new developer

Good starter tasks:

- improve or extend test coverage
- add missing doc comments to model functions
- add read-only derived values to the inputs panel
- tighten SVG rendering semantics without changing geometry
- refactor repeated test helpers in `tests/pattern.test.ts`

Less safe first tasks:

- redefining `K_tot`
- changing units
- changing the apex-centered pattern topology
- mixing template work with constraint changes

## 16. Current known boundaries

The current implementation is intentionally v1-scoped:

- only the regular `N`-gon pyramid template is implemented (default N = 6)
- C1-C6 are exposed as constraints (C5 fold overlap and C6 cut-vs-dihedral are AKDE proxies, not exact fold-collision simulation; C8 still omitted)
- the app includes material-thickness-driven major-cut sizing and the `fold-reach` minor cut (penetration tied to `rApex`), plus an `outerEdgeLength` net control
- export is Cricut-only: a `.zip` of two registered SVGs (cut + score) via a built-in STORE-method ZIP writer; no other machine targets or gcode
- there is no framework state manager, router, or persistence layer

That simplicity is useful. Preserve it unless a change clearly earns the extra complexity.
