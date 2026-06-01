# App Shell File Catalog

This catalog documents the app-shell files as code, not as architecture
overview. The app shell is thin, but it is still important because it defines
the runtime mount points and the one place where controller and views are
assembled.

## [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)

### Purpose

Static browser entry document consumed by Vite. It provides anchors for the
runtime TypeScript app and loads the app stylesheet and entry module.

### Contents

- Document language: `en`.
- UTF-8 charset and responsive viewport meta.
- Title: `AKDE - Uniform kirigami`.
- Stylesheet: `./styles.css`.
- Header element with class `.app-header`.
- Main mount element: `<main id="app" class="app-grid"></main>`.
- Footer legend with visual labels for polygons, molecules, outline, folds, and cuts.
- Module script: `./main.ts`.

### Runtime Contract

- `#app` is required. `app/main.ts` calls `document.getElementById("app")` and throws if it cannot find it.
- `.app-header` is optional in code but expected in the normal shell. If present, `main.ts` appends the `3D Sim` and `Export` controls there.
- The footer is static explanatory markup. It is not read by TypeScript.

### Why The HTML Is So Small

The file deliberately avoids pre-rendering any data-driven panels. All
state-bearing UI is created from TypeScript so:

- controller wiring is centralized
- the app does not depend on prewritten DOM fragments staying in sync
- refactors only need to preserve a few stable anchors

### What Belongs Here

- Stable page metadata.
- Static shell anchors.
- Static copy that does not depend on current model state.

### What Does Not Belong Here

- Geometry defaults.
- Derived values.
- Constraint rows.
- Export or simulation state.
- Runtime UI composition beyond the static anchors.

## [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts)

### Purpose

Runtime composition root. It creates concrete DOM mount nodes, instantiates
views, creates the controller, and wires modal providers.

### Imports

- `createController` from `@kirigami/controller/kirigami-controller.js`.
- `ChecklistView`, `ExportModal`, `InputsPanel`, `PatternCanvas`, and `SimModal` from `@kirigami/view/index.js`.

### Execution Flow

1. Read `#app`.
2. Throw `Missing #app root` if the mount point is absent.
3. Create three column `<div>` elements.
4. Assign column classes:
   - `column inputs-column`
   - `column constraints-column`
   - `column pattern-column`
5. Append the columns into `#app`.
6. Instantiate the three always-visible views:
   - `new InputsPanel(inputsMount)`
   - `new ChecklistView(checklistMount)`
   - `new PatternCanvas(patternMount)`
7. Create the controller with those concrete view instances.
8. Instantiate modal controllers:
   - `new ExportModal()`
   - `new SimModal()`
9. Find `.app-header`.
10. Create `.header-actions` if the header exists.
11. Mount the simulation trigger into `.header-actions`.
12. Mount the export trigger into `.header-actions`.
13. Append `.header-actions` to `.app-header`.
14. Set modal providers:
   - Export modal pulls `controller.getExportPayload()`.
   - Simulation modal pulls `controller.getState()`.

### Objects Created Here

Persistent startup objects:

- `InputsPanel`
- `ChecklistView`
- `PatternCanvas`
- `KirigamiController`
- `ExportModal`
- `SimModal`

There is no global service locator; `main.ts` creates and connects everything
explicitly.

### Important Details

- View construction happens before controller construction because the controller needs concrete view objects.
- Modal provider wiring happens after controller construction because both providers close over the controller instance.
- The modals are pull-based. The controller does not push into modals and does not know when they open.
- `main.ts` does not call model functions directly. Model access flows through the controller.

### Bundle-Level Implication

`main.ts` statically imports the controller and base views, but the 3D viewer
still lazy-loads because `SimModal` dynamically imports `sim-canvas.ts` only
when opened.

### Change Risks

- Renaming column classes affects layout CSS.
- Removing `#app` breaks startup.
- Moving provider setup before controller construction is invalid.
- Creating geometry or export state here would weaken the MVC split.

## [app/styles.css](/Users/emredayangac/Documents/AKDE/app/styles.css)

### Purpose

Global stylesheet for the whole browser app. The project does not use
component-scoped CSS, so class names emitted by view classes are coordinated
with this file.

### Major Style Areas

- Page shell:
  - body defaults
  - `.app-header`
  - `.app-legend`
- Layout:
  - `.app-grid`
  - `.column`
  - panel sizing and spacing
- Panels:
  - `.panel`
  - headings
  - form layout
- Inputs:
  - `.inputs-panel`
  - `.inputs-form`
  - `.hint`
  - `.input-error`
  - invalid input styling through `[aria-invalid="true"]`
- Derived display:
  - `.derived`
  - `.derived-list`
  - `dt` and `dd` formatting
- Constraints:
  - `.constraint-list`
  - `.constraint-row`
  - `.constraint-ok`
  - `.constraint-fail`
  - `.constraint-id`
  - `.constraint-label`
  - `.constraint-residual`
- Pattern canvas:
  - `.pattern-panel`
  - `.pattern-wrap`
  - `.pattern-svg`
  - `.legend`
  - `.legend-item`
- Pattern role classes:
  - `.stroke-polygon`
  - `.stroke-boundary`
  - `.stroke-molecule-fill`
  - `.stroke-molecule`
  - `.stroke-cut`
  - `.stroke-minor-cut`
  - `.stroke-fold`
- Header actions:
  - `.header-actions`
  - `.export-trigger`
  - `.sim-trigger`
- Export modal:
  - `.export-overlay`
  - `.export-modal`
  - `.export-modal-header`
  - `.export-modal-body`
  - `.export-modal-footer`
  - `.export-square`
  - `.export-svg-btn`
- Simulation modal:
  - `.sim-overlay`
  - `.sim-modal`
  - `.sim-modal-header`
  - `.sim-modal-body`
  - `.sim-canvas-mount`
  - `.sim-modal-footer`
  - `.sim-fold-control`

### Code Contracts

- `PatternCanvas` emits path classes as `stroke-${role}`. Any new `PatternStrokeRole` needs corresponding CSS if it should be visible.
- `InputsPanel` relies on hidden error elements becoming visible when `hidden` is removed.
- `ChecklistView` relies on `constraint-ok` and `constraint-fail` to communicate pass/fail state visually.
- `ExportModal` and `SimModal` append overlays to `document.body`, so overlay styles cannot be scoped under `#app`.

### Relationship To Runtime Views

This stylesheet is the visual contract for:

- layout classes created by `main.ts`
- class names emitted by the form and checklist views
- role-based SVG classes emitted by `PatternCanvas`
- modal class names created by `ExportModal` and `SimModal`

### Safe Changes

- Color palette.
- Spacing.
- Grid breakpoints.
- Modal visual design.
- Stroke widths, if export SVG behavior is not confused with on-screen SVG styling.

### Risky Changes

- Removing emitted class names.
- Styling hidden modal overlays incorrectly.
- Making `.pattern-svg` unable to honor its viewBox.
- Using CSS that changes SVG path geometry rather than presentation.
