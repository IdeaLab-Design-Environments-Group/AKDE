# Controller File Catalog

This catalog documents the controller files as implementation surfaces. The
controller subsystem is small, but it is the app's coordination spine.

## [kirigami/controller/formatters.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/formatters.ts)

### Purpose

Presentation-only numeric formatting helpers.

### Exports

- `radToDeg(rad: number): number`
- `formatAngleDeg(rad: number, digits = 2): string`
- `formatMm(value: number, digits = 2): string`

### Function Behavior

- `radToDeg` multiplies by `180 / Math.PI`.
- `formatAngleDeg` converts radians to degrees, formats with `toFixed(digits)`, and appends the `°` symbol.
- `formatMm` formats with `toFixed(digits)` and appends ` mm`.

### Dependencies

No imports. The file is pure and deterministic.

### Callers

- `kirigami/controller/kirigami-controller.ts`
- `tests/formatters.test.ts`

### Contract

Formatting belongs here instead of `kirigami/model/` because the model should
return numbers, not UI strings. It also does not belong in views because the
controller owns the derived-field render model.

## [kirigami/controller/kirigami-controller.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/kirigami-controller.ts)

### Purpose

Coordinates inputs, validation, model computation, constraints, pattern
generation, and view rendering.

### Imports

- From model geometry:
  - `computeState`
  - `defaultInputs`
- From constraints:
  - `evaluateConstraints`
- From pattern generation:
  - `buildPatternNet`
- From SVG export:
  - `buildExportPayload`
  - `ExportPayload`
- From validation:
  - `APEX_HEIGHT_ERROR`
  - `MATERIAL_THICKNESS_ERROR`
  - `validateInputs`
- From model types:
  - `ConstraintState`
  - `KirigamiInputs`
  - `KirigamiState`
- From formatters:
  - `formatAngleDeg`
  - `formatMm`
- From views:
  - `InputsPanel`
  - `InputsPanelDerivedField`
  - `InputsPanelRenderModel`
  - `ChecklistView`
  - `PatternCanvas`

### Exports

- `KirigamiControllerOptions`
- `KirigamiController`
- `createController(options)`
- Type re-exports:
  - `KirigamiInputs`
  - `KirigamiState`
  - `ConstraintState`

### `KirigamiControllerOptions`

Dependency bundle required by the controller:

- `inputsPanel`: source of input values and destination for derived/error display.
- `checklistView`: destination for constraint rows.
- `patternCanvas`: destination for SVG net rendering.
- `debounceMs`: optional debounce delay, defaulting to 80 ms.

This object keeps construction explicit. The controller does not query the DOM
for these views.

### Internal State

- `state: KirigamiState | null`
  - Last successfully computed state.
  - `null` means the current inputs are invalid.
- `constraints: ConstraintState[]`
  - Last evaluated checklist rows.
  - Empty when inputs are invalid.
- `debounceTimer`
  - Tracks scheduled recompute.
- `debounceMs`
  - Stored debounce duration.

### Constructor Sequence

1. Store `debounceMs`.
2. Seed the input view with `defaultInputs()`.
3. Register `inputsPanel.onChange(...)`.
4. Run `recompute()` immediately.

Because of this, the UI starts populated with a valid model state and rendered
pattern.

### Public Methods

- `getState()`
  - Returns current state or `null`.
  - Used by `SimModal`.
- `getConstraints()`
  - Returns current checklist data.
  - Useful for tests or future diagnostics.
- `getExportPayload()`
  - Returns `null` when no valid state exists.
  - Otherwise builds a fresh `PatternNet` and export payload from current state.
- `recompute()`
  - Main pipeline entry point.

### `recompute()` Pipeline

1. Pull inputs from `inputsPanel.getInputs()`.
2. Run `validateInputs(inputs)`.
3. If validation fails:
   - clear `state`
   - clear `constraints`
   - call `pushToViews(inputs)`
   - return
4. Compute state with `computeState(inputs)`.
5. Evaluate constraints with `evaluateConstraints(state)`.
6. Call `pushToViews(inputs)`.

Validation precedes `computeState` so the UI can show field-level errors without
attempting invalid geometry.

### `scheduleRecompute()`

Debounces recomputation after input changes:

- clears a pending timer when one exists
- schedules `recompute()`
- clears the timer reference when the scheduled recompute fires

This avoids recomputing on every raw input event while a user is typing.

### `pushToViews(inputs)`

Fan-out point to concrete views:

- `inputsPanel.render(...)`
- `checklistView.render(...)`
- `patternCanvas.render(...)`

Pattern generation happens here through `buildPatternNet(this.state)` only when
`state` is non-null. Invalid inputs render a null pattern.

### `buildInputsPanelModel(inputs)`

Builds the input-panel render model:

- `derived`: full derived field list when state is valid, empty list otherwise.
- `apexHeightError`: message when `inputs.totalCurvature <= 0`.
- `materialThicknessError`: message when `inputs.materialThickness <= 0`.

The function intentionally mirrors the current two validation checks instead of
asking `validateInputs` which field failed.

### `buildDerivedFields(state)`

Defines the visible derived row order and labels:

- `R`
- `s (slant)`
- `psi`
- `kappa`
- `eta`
- `delta_apex`
- `theta`
- `w`
- `tau`
- `r_apex (major cut)`
- `minor cut`

The model owns the values; the controller owns this display ordering.

### MVC Boundary

This file may orchestrate model and view calls, but it should not:

- implement formulas
- query low-level DOM nodes directly
- decide SVG path geometry
- duplicate export serialization
- run simulation stepping
