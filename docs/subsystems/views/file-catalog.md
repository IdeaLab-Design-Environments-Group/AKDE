# View File Catalog

This catalog documents the DOM-facing files in implementation detail. The view
layer owns markup creation, DOM event wiring, modal lifecycle, and rendering of
controller-provided data. It should not own formulas or model validity rules.

## [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)

### Purpose

Left-column input and derived-value view.

### Imports

- `KirigamiInputs` type from `../model/types.js`.

### Exports

- `InputsChangeHandler`
- `InputsPanelDerivedField`
- `InputsPanelRenderModel`
- `InputsPanel`

### Render Model Types

`InputsPanelDerivedField`:

- `termHtml`
  - Raw HTML label for math terms such as `delta<sub>apex</sub>`.
- `valueText`
  - Plain display text for the derived value.

`InputsPanelRenderModel`:

- `derived`
  - Array of rows to render.
  - Empty array clears the derived panel.
- `apexHeightError`
  - Error string or `null`.
- `materialThicknessError`
  - Error string or `null`.

### Class-Owned DOM References

`InputsPanel` caches:

- `root`
- `edgeCountInput`
- `edgeLengthInput`
- `outerEdgeLengthInput`
- `totalCurvatureInput`
- `materialThicknessInput`
- `apexHeightErrorEl`
- `materialThicknessErrorEl`
- `derivedEl`

It also stores `changeHandlers`, an array of callbacks registered by the
controller.

### Constructor

The constructor:

1. Creates a `<section>`.
2. Assigns `panel inputs-panel`.
3. Appends it to the provided container.
4. Calls `build()`.

### `build()`

Creates the static form markup and binds DOM references.

Form fields:

- Edge count `N`.
- Edge length `L`.
- Outer edge length `L_o`.
- Apex height `K_tot = H`.
- Material thickness `T`.

The method also:

- Replaces `.derived-mount` with a real `.derived` element.
- Registers both `input` and `change` listeners.
- Emits every registered handler on either event.

### `getInputs()`

Reads DOM values and returns `KirigamiInputs`.

Coercion rules:

- `edgeCount`: numeric, rounded, minimum 3.
- `edgeLength`: numeric, minimum 0.
- `outerEdgeLength`: numeric, minimum 0.
- `totalCurvature`: numeric, invalid/empty becomes 0.
- `materialThickness`: numeric, invalid/empty becomes 0.

The method intentionally preserves invalid zero values for `H` and `T` so the
controller can show validation errors.

### `setInputs(inputs)`

Writes supplied values into the form.

Important details:

- `outerEdgeLength` falls back to `edgeLength`.
- `totalCurvature` is formatted with two decimal places.
- Other values use string conversion.

### `render(model)`

Updates:

- Derived rows.
- Apex-height field error.
- Material-thickness field error.

When no derived rows exist, the derived container is emptied. Otherwise it
renders a `<h3>` plus a definition list.

### `applyFieldError(...)`

Private helper that:

- Sets error text.
- Toggles `hidden`.
- Sets or removes `aria-invalid`.

This is the only accessibility state mutation in the file.

## [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)

### Purpose

Center-column read-only constraint checklist.

### Imports

- `ConstraintState` from `../model/types.js`.

### Exports

- `ChecklistView`

### Constructor

Creates:

- `<section class="panel checklist-panel">`
- `<h2>Constraints</h2>`
- `<ul class="constraint-list" role="list" aria-label="Constraint checklist">`

The list element is cached as `listEl`.

### `render(constraints)`

Replaces `listEl.innerHTML` with one row per constraint.

For each constraint:

- `checked` attribute is present when `satisfied` is true.
- Row class is either `constraint-row constraint-ok` or `constraint-row constraint-fail`.
- `data-id` receives the constraint ID.
- `title` receives the escaped message when present.
- Checkbox is disabled and read-only.
- Label and residual are rendered as spans.

### Internal Helpers

- `formatResidual(c)`
  - Returns empty string for residuals below `1e-12`.
  - Otherwise emits exponential notation.
- `escapeAttr(s)`
  - Escapes `&`, `"`, and `<`.
- `escapeHtml(s)`
  - Uses `escapeAttr`.

### Contract

The view does not decide whether a constraint passes. It only renders the
`ConstraintState[]` from the model/controller pipeline.

## [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)

### Purpose

Right-column SVG renderer for the flat pattern.

### Imports

- `KirigamiState` type.
- `PatternNet` type.

### Exports

- `PatternCanvas`
- Re-exported `PatternNet`
- Re-exported `PatternSegment`
- Re-exported `PatternStrokeRole`

### Constructor

Creates:

- `<section class="panel pattern-panel">`
- `<h2>Pattern</h2>`
- `.pattern-wrap`
- `<svg class="pattern-svg">`
- A role legend for polygons, molecules, outline, fold, major cut, and minor cut.

The SVG element is cached as `svgEl`.

### `render(_state, net)`

Behavior:

- If `net` is `null`, clears the SVG.
- Otherwise sets the SVG `viewBox`.
- Maps every `PatternSegment` into a `<path>`.
- Uses CSS class `stroke-${seg.role}`.
- Adds `fill-rule="evenodd"` for `molecule-fill`.
- Adds `vector-effect="non-scaling-stroke"` to every path.

The first parameter is currently unused. It keeps room for state-aware rendering
without changing the controller/view interface.

### Contract

The view trusts `PatternNet` ordering. It does not sort segments, compute
geometry, or decide stroke roles.

## [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)

### Purpose

Header export trigger plus modal UI for previewing and downloading generated
SVG assets.

### Imports

Types from `../model/svg-export.js`:

- `CricutSvgFile`
- `ExportArchive`
- `ExportPayload`

### Exports

- `ExportProvider`
- `ExportModal`

### `ExportProvider`

Function type:

- `() => ExportPayload | null`

The provider is called when the modal opens, so export data is always current.

### Class-Owned State

- `overlay`
- `trigger`
- `provider`
- `archive`
- `combined`

### Constructor

Creates:

- Export trigger button.
- Hidden overlay appended to `document.body`.
- Dialog structure with header, close button, preview body, and footer buttons.
- Three preview mounts:
  - `cut`
  - `score`
  - `both`
- ZIP download button.
- Single SVG download button.

Event wiring:

- Trigger opens the modal.
- Close button closes.
- ZIP button calls `exportSvg()`.
- Single SVG button calls `exportCombined()`.
- Overlay click closes when clicking outside the modal.
- Escape key closes when overlay is visible.

### Public Methods

- `mountTrigger(container)`
  - Appends the trigger button.
- `setProvider(provider)`
  - Stores payload callback.
- `open()`
  - Calls provider.
  - Renders previews.
  - Shows overlay.
- `close()`
  - Hides overlay.

### Private Methods

- `renderPreviews(payload)`
  - Writes inline preview SVG into preview squares.
  - Stores archive and combined SVG payloads.
  - Disables buttons when payloads are missing.
- `exportSvg()`
  - Downloads ZIP archive and closes.
- `exportCombined()`
  - Downloads combined SVG and closes.

### `downloadBlob(...)`

Creates a `Blob`, object URL, temporary anchor, triggers download, removes the
anchor, and revokes the URL.

### Contract

The modal consumes `ExportPayload`. It does not call `buildPatternNet` or
serialize SVG itself.

## [kirigami/view/sim-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-modal.ts)

### Purpose

Header simulation trigger plus modal wrapper around the 3D simulation canvas.

### Imports

- `KirigamiState` type.
- `buildFoldScene` from `../sim/index.js`.
- `SimCanvas` type for the private field.

### Exports

- `SimStateProvider`
- `SimModal`

### `SimStateProvider`

Function type:

- `() => KirigamiState | null`

The modal pulls the latest state when opening or resetting.

### Class-Owned DOM And State

- `overlay`
- `trigger`
- `mount`
- `statusEl`
- `foldSlider`
- `foldValue`
- `provider`
- `canvas`

### Constructor

Creates:

- `3D Sim` trigger.
- Hidden modal overlay appended to `document.body`.
- Dialog with canvas mount.
- Status area.
- Fold slider.
- Reset button.

Event wiring:

- Trigger calls async `open()`.
- Slider input calls `applyFold()`.
- Close button calls `close()`.
- Reset button calls `loadWorld()`.
- Overlay click closes when clicking outside the modal.
- Escape closes when overlay is visible.

### `open()`

Behavior:

1. Shows overlay.
2. If no canvas exists, sets loading text.
3. Dynamically imports `./sim-canvas.js`.
4. Creates `new SimCanvas(this.mount)`.
5. Calls `loadWorld()`.

Lazy import keeps Three.js out of initial app load.

### `loadWorld()`

Behavior:

- Pulls state from provider.
- If state is invalid, shows status and stops existing canvas.
- Builds a fold scene with `buildFoldScene(state)`.
- Sends it to `canvas.setScene(...)`.
- Applies current fold slider value.
- Starts the canvas loop.
- Updates status with `N` and `H`.

### `applyFold()`

- Reads slider percent.
- Updates visible percent text.
- Sends normalized value to `canvas.setFoldPercent(...)`.

## [kirigami/view/sim-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-canvas.ts)

### Purpose

Three.js rendering surface and animation loop for the fold simulation.

### Imports

- `three`
- `OrbitControls`
- `FoldScene`
- `FoldSolver` type
- `GpuFoldSolver`

### Constants

- `COLOR_FACE`
- `COLOR_MOUNTAIN`
- `COLOR_VALLEY`
- `COLOR_BOUNDARY`
- `COLOR_CUT`
- `STEPS_PER_FRAME`
- `FOLD_EASE`

### Class-Owned Rendering State

- `scene`
- `camera`
- `renderer`
- `controls`
- `group`
- `fold`
- `gpu`
- `cpu`
- `geo`
- `posAttr`
- `foldPercent`
- `targetFold`
- `running`

### Constructor

Initializes:

- WebGL renderer.
- Pixel ratio and clear color.
- Z-up camera.
- Orbit controls with damping.
- Ambient, key, and fill lights.
- Scene group.
- Bound animation loop.

The renderer is appended to the supplied container.

### `setScene(scene)`

Main setup method:

1. Dispose old geometry.
2. Store the new `FoldScene`.
3. Create a `BufferAttribute` directly over `model.position`.
4. Build face mesh geometry from `net.faces`.
5. Add a double-sided mesh material.
6. Group edges by assignment:
   - `B`
   - `M`
   - `V`
   - `C`
7. Add `LineSegments` for each visible edge group.
8. Try to create a GPU solver.
9. Fall back to the CPU solver if GPU creation fails.
10. Reset eased fold percent.
11. Frame the camera around the model.

### Solver Loop

`advance()`:

- Eases `foldPercent` toward `targetFold`.
- In GPU mode:
  - updates GPU fold percent
  - steps several times
  - reads positions back into the model
- In CPU mode:
  - updates solver fold percent
  - steps several times
- Marks position attribute dirty.
- Recomputes normals.

`loop()`:

- Stops if `running` is false.
- Calls `advance()`.
- Updates controls.
- Renders scene.
- Schedules next frame.

### Public Control Methods

- `backend()`
- `setFoldPercent(p)`
- `getFoldPercent()`
- `start()`
- `stop()`
- `dispose()`

### Resource Cleanup

`disposeGeo()` clears the scene group, disposes current geometry, clears solver
references, and resets buffer references. `dispose()` additionally disposes
controls and renderer and removes the canvas element.

## [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)

### Purpose

View-layer barrel used by `app/main.ts`.

### Re-exports

- `InputsPanel`
- `InputsChangeHandler`
- `ChecklistView`
- `PatternCanvas`
- Pattern-related types from `pattern-canvas.ts`
- `ExportModal`
- `ExportProvider`
- `SimModal`
- `SimStateProvider`

### Contract

This file is the public view surface for the app shell. Keeping top-level
imports here avoids making `app/main.ts` know individual view file paths.
