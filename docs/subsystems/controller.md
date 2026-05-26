# Controller

This document covers the controller subsystem that connects validated inputs to computed geometry and rendered output.

## Files

- [kirigami/controller/kirigami-controller.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/kirigami-controller.ts)
- [kirigami/controller/formatters.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/formatters.ts)

## Responsibility

The controller is the orchestration layer. It is responsible for:

- reading user inputs from the input view
- validating those inputs
- computing model state
- evaluating constraints
- building pattern/export render inputs
- pushing the resulting view models into the view layer

It should not own low-level DOM rendering or low-level geometry derivation.

## Main pipeline

The runtime sequence in `KirigamiController` is:

1. seed default inputs via `defaultInputs()`
2. subscribe to `InputsPanel` changes
3. debounce recomputation
4. call `validateInputs(inputs)`
5. if invalid:
   - clear controller state
   - clear constraints
   - push error-only view state
6. if valid:
   - compute `KirigamiState` with `computeState(inputs)`
   - evaluate `ConstraintState[]` with `evaluateConstraints(state)`
   - render derived values, checklist, and pattern

This ordering matters. Validation is intentionally separate from constraints.

## Why validation is separate from constraints

The app treats some failures as input-invalid and others as geometry-validity failures:

- invalid input examples:
  - `H <= 0`
  - `T <= 0`

- constraint failures:
  - closure residuals
  - `w <= L`
  - cut-vs-dihedral validity

This separation keeps the UI behavior predictable. Invalid inputs short-circuit the whole geometry pipeline instead of rendering half-broken state.

## Derived field assembly

`buildDerivedFields(...)` in `kirigami-controller.ts` is where model scalars become user-facing rows.

Current derived fields include:

- `R`
- `s`
- `psi`
- `kappa`
- `eta`
- `deltaApex`
- `theta`
- `w`
- `tau`
- `rApex`
- `minorCutLength`

This is not the source of truth for the formulas. It is the source of truth for display ordering and wording.

## Export integration

`getExportPayload()` is intentionally a pull API:

- if state is invalid, it returns `null`
- otherwise it builds a pattern net and converts it to export payload

This keeps export generation consistent with the same geometry currently shown on screen.

## Formatting helpers

`formatters.ts` exists so the controller can decide presentation strings without pushing formatting concerns down into the model or up into the DOM views.

Typical examples:

- angle display in degrees
- millimeter formatting

## Important contracts

- `getState()` returns the latest computed state or `null`
- `getConstraints()` returns the latest checklist data
- `getExportPayload()` returns modal-ready export data or `null`
- the controller owns debounce timing
- the controller is the only layer that knows all three of:
  - inputs
  - computed state
  - views

## Typical refactor boundaries

Safe controller changes:

- debounce tuning
- render-model assembly cleanup
- extraction of helper methods
- additional derived display rows

Risky controller changes:

- moving validation into views
- moving compute logic into views
- bypassing the `KirigamiState` pipeline
- making export use a different geometry path than the on-screen pattern
