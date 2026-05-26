# File-Level Code Reference

This document describes what each source and test file contains at code level.
Use it when the overview docs are too broad and you need to understand what a
file exports, what state it owns, and what other files depend on.

## App Shell

### [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)

The Vite HTML entry file. It declares the browser document metadata, loads
`./styles.css`, and provides the DOM anchors used by the TypeScript app.

Important elements:

- `.app-header`: top-level header. `app/main.ts` appends the simulation and export action buttons here.
- `#app.app-grid`: the only required mount point for the runtime UI. `main.ts` throws if it is missing.
- `.app-legend`: static fallback legend that mirrors the SVG role styling used by `PatternCanvas`.
- `<script type="module" src="./main.ts">`: Vite resolves this TypeScript module from the `app/` root.

This file contains no application state and no kirigami formulas. Its contract
is stable DOM structure for the composition root.

### [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts)

The browser composition root. It is the only file that directly wires together
the app shell, views, controller, export modal, and simulation modal.

Execution order:

1. Read `#app` and fail fast when the HTML shell is malformed.
2. Create three mount containers with column classes: inputs, constraints, and pattern.
3. Instantiate `InputsPanel`, `ChecklistView`, and `PatternCanvas`.
4. Create the `KirigamiController`, passing those three view instances.
5. Instantiate `ExportModal` and `SimModal`.
6. Append modal trigger buttons to `.app-header` through a `.header-actions` wrapper.
7. Connect modal providers to the controller with pull callbacks.

The provider callbacks are deliberately lazy:

- `ExportModal` calls `controller.getExportPayload()` only when export UI needs current files.
- `SimModal` calls `controller.getState()` only when opening or resetting the 3D simulation.

This keeps modal lifecycle out of the controller and keeps `main.ts` as the
single place where all top-level dependencies meet.

### [app/styles.css](/Users/emredayangac/Documents/AKDE/app/styles.css)

Global stylesheet for layout, panels, SVG roles, modals, form states, and the
simulation/export UI. The CSS class names are part of the view contract because
view classes emit these names directly.

Important class groups:

- Layout: `.app-grid`, `.column`, `.panel`, `.header-actions`
- Inputs: `.inputs-panel`, `.inputs-form`, `.hint`, `.input-error`, `.derived-list`
- Constraints: `.constraint-list`, `.constraint-row`, `.constraint-ok`, `.constraint-fail`
- Pattern SVG: `.pattern-wrap`, `.pattern-svg`, `.stroke-polygon`, `.stroke-boundary`, `.stroke-molecule-fill`, `.stroke-molecule`, `.stroke-cut`, `.stroke-minor-cut`, `.stroke-fold`
- Export modal: `.export-overlay`, `.export-modal`, `.export-square`, `.export-svg-btn`
- Simulation modal: `.sim-overlay`, `.sim-modal`, `.sim-canvas-mount`, `.sim-fold-control`

Changing visual design is low-risk if these emitted classes are either preserved
or updated together with the view files.

## Controller

### [kirigami/controller/kirigami-controller.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/kirigami-controller.ts)

The orchestration layer between DOM views and pure model functions.

Exports:

- `KirigamiControllerOptions`: view dependencies and optional `debounceMs`.
- `KirigamiController`: stateful controller class.
- `createController(...)`: thin factory used by `app/main.ts`.
- Re-exported controller-facing types: `KirigamiInputs`, `KirigamiState`, `ConstraintState`.

Owned state:

- `state`: latest valid `KirigamiState`, or `null` when inputs are invalid.
- `constraints`: latest `ConstraintState[]`, empty when inputs are invalid.
- `debounceTimer`: pending recompute timeout.
- `debounceMs`: defaults to 80 ms unless supplied in options.

Constructor behavior:

1. Stores debounce timing.
2. Seeds the `InputsPanel` with `defaultInputs()`.
3. Registers a change handler that schedules recomputation.
4. Runs an immediate recompute so the UI starts populated.

Main pipeline in `recompute()`:

1. Pull raw/coerced inputs from `inputsPanel.getInputs()`.
2. Run `validateInputs(inputs)`.
3. If validation fails, clear model state and constraints, then render error state.
4. If validation passes, call `computeState(inputs)`.
5. Evaluate C1-C6 with `evaluateConstraints(state)`.
6. Push derived fields, checklist rows, and `PatternNet` to views.

Display shaping:

- `buildInputsPanelModel(...)` translates validation state into field-level errors.
- `buildDerivedFields(...)` chooses display ordering and labels for `R`, `s`, `psi`, `kappa`, `eta`, `deltaApex`, `theta`, `w`, `tau`, `rApex`, and `minorCutLength`.
- `formatAngleDeg(...)` and `formatMm(...)` keep display formatting out of the model.

Export path:

- `getExportPayload()` returns `null` if `state` is invalid.
- Otherwise it rebuilds the current `PatternNet` from the same state used on screen and passes it to `buildExportPayload(...)`.

Important contract: the controller is the only layer that knows the input view,
computed model state, checklist view, pattern view, and export generation path.
Views should not call model formulas directly.

### [kirigami/controller/formatters.ts](/Users/emredayangac/Documents/AKDE/kirigami/controller/formatters.ts)

Small display-formatting helpers used by the controller and tests.

Exports:

- `radToDeg(rad)`: converts radians to degrees.
- `formatAngleDeg(rad, digits = 2)`: formats degrees with a degree suffix.
- `formatMm(value, digits = 2)`: formats millimeters with ` mm`.

This file intentionally does not know about kirigami state. It only formats
numbers for UI display.

## Model Layer

### [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)

The cross-layer type contract. Most files import these interfaces either
directly or through the model barrel.

Exports:

- `KirigamiInputs`: user-facing values. Lengths are millimeters. `totalCurvature` means vertical apex height `H`, not slant length and not an angle budget. `outerEdgeLength` is optional and defaults to `edgeLength` behavior.
- `KirigamiDerived`: computed scalar geometry. It includes molecule parameters, pyramid measurements, dihedral angle, major cut radius, molecule end-leg length, and active minor-cut length.
- `KirigamiState`: flat combination of original `inputs` plus all `KirigamiDerived` values.
- `ConstraintId`: stable checklist IDs `C1` through `C6`.
- `ConstraintState`: checklist row shape with `id`, `label`, `satisfied`, `residual`, and optional `message`.

Changing these shapes has high blast radius: controller rendering, views, tests,
export code, and simulation all assume the current names.

### [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)

Pure scalar geometry for the uniform edge-molecule model.

Primary exported helpers:

- `computeR(N, L)`: base circumradius.
- `computeS(R, H)`: slant edge length.
- `computePsi(H, R)`: apex elevation angle using `atan2`.
- `computeKappa(H, R)`: rise ratio, returning `NaN` when `R` is zero.
- `computeEta(R, s, N)`: lateral face apex angle, with non-positive guards and arcsine clamping.
- `computeDeltaApex(N, eta)`: discrete apex angle defect.
- `computeTheta(deltaApex, N)`: uniform molecule angle.
- `computeTau(N)`: closure step.
- `computeW(s, theta)`: molecule width as an outer chord.
- `computeRApex(theta, T, s)`: major-cut radius with zero guards and `0.4 * s` visualization clamp.
- `computeMoleculeEndLeg(s, theta)`: DETC-style molecule end leg `D`.
- `computeFoldClearance(gamma, T)`: thickness-scaled fold-clearance depth.
- `computeFoldReach(rApex, w)`: active fold-reaching minor-cut length.
- `computeDihedralGamma(R, H, N)`: adjacent-face interior dihedral from 3D face normals.
- `computeMinorCutLength(...)`: strategy switch for candidate minor-cut formulas.
- `computeDerived(N, L, H, T)`: canonical scalar aggregation.
- `computeState(inputs)`: validates positive `H` at model level, then returns `KirigamiState`.
- `defaultInputs()`: product defaults, currently a hexagonal 45-degree pyramid.

Internal structures:

- `TAU` stores `2 * Math.PI`.
- Local `Vec3`, `sub3`, `cross3`, and `len3` support the dihedral computation without importing the simulation vector library.
- `MINOR_CUT_FORMULA` is currently `"fold-reach"`.

Formula sequencing in `computeDerived(...)`:

1. `R`, `s`, `psi`, `kappa`
2. `eta`, `deltaApex`, `theta`, `tau`, `w`
3. `gamma`, `rApex`, `moleculeEndLeg`, `minorCutLength`

Important nuance: `computeMinorCutLength(...)` exposes all candidate strategies,
but `computeDerived(...)` directly uses `computeFoldReach(rApex, w)` because that
is the active implementation. Tests assert this behavior.

### [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)

Transforms a valid `KirigamiState` into checklist rows.

Exports:

- `CONSTRAINT_EPS = 1e-10`
- `evaluateC1(state)`: angle closure residual `|N theta + N eta - 2pi|`.
- `evaluateC2(state)`: vector closure residual from equal phasors of length `w`.
- `evaluateC3(state)`: molecule angle range `|theta| < pi`.
- `evaluateC4(state)`: non-negative width `w >= 0`.
- `evaluateC5(state)`: AKDE fold-overlap proxy `w <= L`.
- `evaluateC6(state)`: AKDE cut-vs-dihedral proxy `T tan(gamma/2) <= s - rApex`.
- `evaluateConstraints(state)`: ordered C1-C6 list consumed by `ChecklistView`.

Internal helper:

- `vectorClosureResidual(N, w, tau)` accumulates `sumX` and `sumY` over `n * tau`, then returns `hypot(sumX, sumY)`.

Messages:

- C5 includes an explanatory message when molecule width exceeds face edge length.
- C6 includes an explanatory message when the relief depth exceeds available slant distance.

Validation is intentionally absent here. Field-invalid inputs are handled before
`KirigamiState` exists.

### [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)

Raw input validation before geometry computation.

Exports:

- `APEX_HEIGHT_ERROR`
- `MATERIAL_THICKNESS_ERROR`
- `validateInputs(inputs)`

Current checks:

- `totalCurvature > 0`
- `materialThickness > 0`

Return shape is simple: an error string or `null`. The controller maps these
messages onto specific fields. This keeps invalid input behavior separate from
residual-bearing constraints.

### [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)

Converts `KirigamiState` into SVG-ready 2D pattern geometry.

Exported types:

- `PatternStrokeRole`: `polygon`, `boundary`, `molecule-fill`, `molecule`, `cut`, `minor-cut`, or `fold`.
- `PatternSegment`: role plus SVG path `d`.
- `PatternNet`: `viewBox` and ordered `segments`.
- `CornerCutFoldSegments`: valley fold and minor-cut segment bundle.

Main export:

- `buildPatternNet(state)`: builds the apex-centered DETC fan used by the SVG view and exports.

`buildPatternNet(...)` sequence:

1. Coerce edge count to at least 3.
2. Read scalar geometry from state: `s`, `eta`, `tau`, and `rApex`.
3. Define ring-point helpers and angular functions for polygon spans.
4. Compute `outerHalf` from `outerEdgeLength`, clamped so molecule span remains positive.
5. Build inner and outer polygon vertices.
6. Build molecule quads between adjacent polygon slants.
7. Shift all geometry into a non-negative viewBox with margin.
8. Emit polygon face fills first.
9. Emit molecule fills and molecule outlines.
10. Emit the major-cut inner ring.
11. Emit one valley fold and one closed minor-cut relief triangle per molecule.
12. Emit the outer boundary last.

Key exported geometry helpers:

- `cornerMoleculeTrapezoid(...)`: constructs a simple trapezoid from apex and two outer points.
- `moleculeOuterVertices(...)`: identifies the farther chord from an apex.
- `moleculeInnerVertices(...)`: identifies the nearer chord from an apex.
- `moleculeSlantOuterVertices(...)`: returns DETC-style `p2` and `p3`.
- `moleculeTopEdgeMidpoint(...)`: midpoint of the molecule outer chord.
- `moleculeMinorCutEndpoints(...)`: resolves minor-cut endpoints on the fold.
- `moleculeFillPolygon(...)`: returns the material fill polygon after minor-cut wedge removal.
- `moleculeFillInteriorPoint(...)`: test helper for sampling inside molecule fill.
- `moleculeOutlineSegments(...)`: full trapezoid edge list.
- `cornerCutFoldSegments(...)`: computes valley crease and minor cuts.
- `minorCutEndpointOnValleyFold(...)`: chooses a feasible endpoint on the valley fold.
- `valleyFoldPointAtPathLength(...)`: path-distance helper from outer vertex to fold.
- `nearestInwardPointOnValleyFold(...)`: inward projection helper.
- `inwardFoldTarget(...)`: deprecated compatibility helper used by tests.
- `injectPolyTipsCW(...)`: turns molecule quads into clipped hexagon paths.

Internal numerical helpers cover interpolation, equality with tolerance, line
intersection, ray/segment intersection, circle/segment intersection, segment
membership, nearest point on segment, path generation, and bounds.

Important rendering contract: `segments` are ordered for paint order. Tests
check that polygons render before molecules, creases/cuts render after fills,
and boundary renders last.

### [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)

Transforms a `PatternNet` into Cricut-oriented SVG assets and modal previews.

Exports:

- Constants: `CUT_COLOR`, `SCORE_COLOR`, `LINE_STROKE_WIDTH`.
- Types: `CricutSvgFile`, `ExportArchive`, `CricutPreviews`, `ExportPayload`.
- `buildCricutSvgFiles(net, baseName)`: two operation files, cut and score.
- `buildCombinedCricutSvg(net, baseName)`: one color-coded SVG.
- `buildCricutZip(net, baseName)`: ZIP containing operation files in one folder.
- `buildCricutPreviews(net)`: inline cut, score, and combined preview SVGs.
- `buildExportPayload(net, baseName)`: modal-ready previews plus archive plus combined SVG.

Role mapping:

- Cut roles: `boundary`, `cut`, `minor-cut`.
- Score roles: `fold`.
- Visual-only roles are excluded: `polygon`, `molecule`, `molecule-fill`.

Internal markup helpers:

- `previewSvg(...)`: thumbnail SVGs with non-scaling strokes.
- `svgWrap(...)`: mm-sized export wrapper using the net viewBox.
- `linesMarkup(...)`: per-line stroked score paths.
- `cutBodyMarkup(...)`: one `g#cut` containing a filled even-odd body for closed cuts and a stroked path for open minor cuts.
- `fmt(...)`: finite numeric rounding for SVG attributes.
- `scoreSegments(...)` and `cutSegments(...)`: role filters.

Important export behavior: cut and score files share the same viewBox and mm
dimensions so they register correctly when imported into Cricut workflows.

### [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)

Dependency-free ZIP writer using STORE mode with no compression.

Exports:

- `ZipEntry`: archive path plus bytes.
- `createZip(entries)`: returns archive bytes as `Uint8Array`.

Implementation details:

- Builds a CRC-32 lookup table once.
- Writes one local file header per entry.
- Writes one central directory record per entry.
- Writes the end-of-central-directory record.
- Uses little-endian `DataView` writes for ZIP header fields.
- Preserves arbitrary binary data because it operates on `Uint8Array`.

This exists so the browser export path can bundle SVG files without adding a
third-party ZIP dependency.

### [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)

Model barrel. It re-exports the stable public model API used by tests and
cross-layer imports.

It includes:

- Core types from `types.ts`.
- Scalar geometry and default input functions from `geometry.ts`.
- Pattern builders and pattern helper functions from `pattern.ts`.
- Export builders and export constants from `svg-export.ts`.
- Constraint evaluators from `constraints.ts`.
- Input validation helpers from `validation.ts`.

The barrel intentionally does not export private geometry helpers from
`pattern.ts`, such as low-level point math.

## View Layer

### [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)

DOM view for user inputs and derived scalar readouts.

Exports:

- `InputsChangeHandler`
- `InputsPanelDerivedField`
- `InputsPanelRenderModel`
- `InputsPanel`

Owned DOM references:

- Form inputs for `edgeCount`, `edgeLength`, `outerEdgeLength`, `totalCurvature`, and `materialThickness`.
- Error elements for apex height and material thickness.
- Derived value mount.

Public methods:

- `onChange(handler)`: registers handlers called on form `input` and `change`.
- `getInputs()`: reads and coerces DOM values into `KirigamiInputs`.
- `setInputs(inputs)`: writes defaults or supplied values into the form.
- `render(model)`: renders derived rows and field-level errors.

Coercion behavior:

- Edge count is rounded and clamped to at least 3.
- Edge lengths are clamped to non-negative values.
- `totalCurvature` and `materialThickness` preserve invalid zero/negative states so validation can report them.

This view does not compute derived geometry. It only reads user input and
renders controller-provided display rows.

### [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)

Read-only constraint checklist.

Exports:

- `ChecklistView`

Behavior:

- Constructor creates a section with a list mount.
- `render(constraints)` replaces list HTML from `ConstraintState[]`.
- Satisfied constraints render checked disabled checkboxes and `constraint-ok`.
- Failing constraints render unchecked disabled checkboxes and `constraint-fail`.
- Residuals below `1e-12` are hidden; others render in exponential notation.
- Optional constraint messages become row `title` attributes.

Internal helpers:

- `formatResidual(...)`
- `escapeAttr(...)`
- `escapeHtml(...)`

This file is intentionally presentation-only. Constraint labels, IDs, residuals,
and messages are supplied by the model.

### [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)

SVG renderer for `PatternNet`.

Exports:

- `PatternCanvas`
- Re-exported `PatternNet`, `PatternSegment`, and `PatternStrokeRole` types.

Constructor output:

- Pattern panel section.
- Empty `<svg class="pattern-svg">`.
- Local legend for polygon, molecule, boundary, fold, major cut, and minor cut roles.

`render(state, net)` behavior:

- Clears SVG content when `net` is `null`.
- Sets SVG `viewBox` from `net.viewBox`.
- Converts each `PatternSegment` into a `<path>`.
- Adds CSS class `stroke-${role}`.
- Adds `fill-rule="evenodd"` only for `molecule-fill`.
- Uses `vector-effect="non-scaling-stroke"` so strokes remain readable at different scales.

The `_state` argument is accepted for interface consistency but is not used
currently.

### [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)

Header export button and modal.

Exports:

- `ExportProvider`: callback returning `ExportPayload | null`.
- `ExportModal`

Owned state:

- `overlay`: modal overlay DOM.
- `trigger`: header button.
- `provider`: callback supplied by `main.ts`.
- `archive`: latest ZIP payload.
- `combined`: latest single SVG payload.

Lifecycle:

- Constructor builds modal DOM, appends overlay to `document.body`, and wires close/download events.
- `mountTrigger(container)` appends the trigger button.
- `setProvider(provider)` stores the current payload provider.
- `open()` calls the provider, renders previews, and shows the overlay.
- `close()` hides the overlay.

Downloads:

- `exportSvg()` downloads the ZIP archive as `application/zip`.
- `exportCombined()` downloads the color-coded SVG as `image/svg+xml`.
- `downloadBlob(...)` creates an object URL, clicks a temporary anchor, and revokes the URL.

Invalid input path: when the provider returns `null`, previews are empty and
download buttons are disabled.

### [kirigami/view/sim-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-modal.ts)

Header simulation button and modal hosting the Three.js canvas.

Exports:

- `SimStateProvider`: callback returning `KirigamiState | null`.
- `SimModal`

Owned DOM/state:

- Trigger button.
- Overlay and canvas mount.
- Status text.
- Fold slider and percentage readout.
- Lazy-created `SimCanvas`.
- Current provider callback.

Lifecycle:

- Constructor builds the modal and wires close, reset, slider, overlay-click, and Escape behavior.
- `mountTrigger(container)` appends the `3D Sim` button.
- `setProvider(provider)` stores the state provider.
- `open()` shows the overlay, dynamically imports `./sim-canvas.js` on first use, then loads the world.
- `close()` hides the overlay and stops the render loop.
- `loadWorld()` pulls current state, builds a `FoldScene`, passes it to `SimCanvas`, and starts rendering.
- `applyFold()` maps slider percent to `0..1` and updates the canvas fold target.

This file intentionally lazy-loads Three.js through `SimCanvas` so the initial
app bundle does not include the 3D viewer.

### [kirigami/view/sim-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-canvas.ts)

Three.js viewport and render loop for the folding simulation.

Exports:

- `SimCanvas`

Major dependencies:

- `three`
- `OrbitControls`
- `FoldScene`
- `GpuFoldSolver`
- CPU `FoldSolver` type for fallback.

Constructor behavior:

- Creates a WebGL renderer sized to the container.
- Sets a z-up perspective camera.
- Adds orbit controls, ambient light, key light, fill light, and a scene group.
- Binds the animation loop.

`setScene(scene)` behavior:

1. Dispose old geometry.
2. Attach the simulation model position array as a live `BufferAttribute`.
3. Build a mesh from fold-net faces.
4. Build colored `LineSegments` by edge assignment: boundary, mountain, valley, and cut.
5. Prefer `GpuFoldSolver.create(...)`; fall back to the CPU solver in the scene.
6. Reset eased fold value.
7. Frame the camera around the model.

Animation behavior:

- `targetFold` is controlled by the modal slider.
- `foldPercent` eases toward `targetFold` each frame.
- GPU mode steps several times, reads positions back into the model, and marks the buffer dirty.
- CPU mode steps the solver several times directly.
- Normals are recomputed each frame.

Resource methods:

- `start()`, `stop()`, and `dispose()`
- `backend()` for status/debugging
- `setFoldPercent(...)` and `getFoldPercent()`

This is the only view file that imports Three.js. Simulation math remains in
`kirigami/sim/` so it can be tested in Node.

### [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)

View barrel. It re-exports:

- `InputsPanel`
- `ChecklistView`
- `PatternCanvas`
- `ExportModal`
- `SimModal`
- related view-facing types

`app/main.ts` imports from this barrel to keep top-level wiring compact.

## Simulation Layer

### [kirigami/sim/vec3.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/vec3.ts)

Dependency-free vector helpers for simulation code and tests.

Exports:

- `Vec3`
- `vec3(...)`
- `clone(...)`
- `add(...)`
- `sub(...)`
- `scale(...)`
- `dot(...)`
- `cross(...)`
- `length(...)`
- `distance(...)`
- `normalize(...)`

`normalize(...)` returns the zero vector unchanged when length is near zero,
which lets callers handle degenerate geometry without throwing.

### [kirigami/sim/foldnet.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/foldnet.ts)

Builds the topological fold mesh used by the simulation.

Exports:

- `EdgeAssignment`: `M`, `V`, `F`, `B`, or `C`.
- `FoldNetEdge`
- `FoldNet`
- `buildFoldNet(state)`
- `foldNetFromMesh(vertices, faces, interiorAssignment, meta)`

`buildFoldNet(...)` mirrors the pattern geometry analytically rather than
parsing SVG. It creates:

- One lateral triangle per polygon face.
- Edge molecules split along their valley crease.
- Shared slant edges tagged as mountain creases.
- Valley crease edges for molecule centerlines.
- Cut edges for minor-cut dart mouths and the major-cut apex rim.
- Boundary edges for free outer and inner edges.
- `basePairs` describing molecule outer corners that merge in the folded goal.
- `valleyOuter` nodes driven inward so molecules tuck into the pyramid volume.
- `tips` for polygon apex tips.
- Normalized coordinates and metadata for stable solver dynamics.

Important detail: cut assignment `C` represents a real kirigami separation and
does not carry a bar in the intended topology. Boundary assignment `B` is a free
edge but still participates as a bar edge.

`foldNetFromMesh(...)` is a generic mesh-to-fold-net helper used by tests such
as the single-hinge solver case.

### [kirigami/sim/model.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/model.ts)

Assembles a struct-of-arrays bar-and-hinge model from a `FoldNet`.

Exports:

- `SolverParams`
- `DEFAULT_PARAMS`
- `BarHingeModel`
- `buildModel(net, params, cutRatio)`
- `setFixed(model, ids, pinned)`

`BarHingeModel` stores:

- Node arrays: `position`, `rest`, `velocity`, `force`, `mass`, `fixed`, `goal`, `driven`.
- Beam arrays: edge endpoints, rest lengths, and axial stiffness.
- Crease arrays: wing nodes, crease nodes, face indices, stiffness, targets, and assignments.
- Face arrays: triangle indices, nominal interior angles, and scratch normals.
- Solver parameters and fold metadata.

`buildModel(...)` stages:

1. Copy flat fold-net vertices into `position` and `rest`.
2. Initialize masses, fixed flags, goal positions, and driven flags.
3. Create one beam per fold-net edge with `k = EA / l0`.
4. Create one crease per interior edge and identify wing vertices.
5. Apply kirigami coupling through `cutRatio`.
6. Assign fold targets by edge assignment.
7. Store nominal face interior angles from the flat state.

`setFixed(...)` toggles node fixed flags without changing mass.

### [kirigami/sim/forces.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/forces.ts)

CPU reference implementation of bar-and-hinge force math.

Exports:

- `computeFaceNormals(model)`
- `computeThetas(model, lastTheta)`
- `accumulateForces(model, lastTheta, foldPercent)`
- `integrate(model, dt)`
- `computeDt(model)`

Step responsibilities:

- `computeFaceNormals`: unit normals from current triangle positions.
- `computeThetas`: signed, unwrapped dihedral fold angle per crease.
- `accumulateForces`: clears force array, then adds axial, damping, crease torsion, and face-angle forces.
- `integrate`: forward Euler update for non-fixed nodes.
- `computeDt`: stable timestep estimate from maximum axial frequency.

This file is the Node-testable physics reference for the GPU shader path.

### [kirigami/sim/solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/solver.ts)

CPU solver wrapper around the force passes.

Exports:

- `FoldSolver`
- `measureTheta(...)`

`FoldSolver` owns:

- `dt`
- persistent per-crease `theta`
- `foldPercent`
- the `BarHingeModel`

`step()` sequence:

1. Drive boundary nodes from rest to goal by `foldPercent`.
2. Compute face normals.
3. Compute current crease angles.
4. Accumulate forces.
5. Integrate node positions.

`solve(iters, targetFold)` eases toward a target fold quasi-statically before
settling. `positions()` copies the flat position array into tuple form for
tests. `measureTheta(...)` is a standalone test helper for a specified shared
edge and face pair.

### [kirigami/sim/build.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/build.ts)

High-level simulation scene assembly.

Exports:

- `FoldScene`
- `buildFoldScene(state, params)`
- `setupGuidedFold(model, net)`
- `singleHingeModel(target, kFold)`

`buildFoldScene(...)` composes:

1. `buildFoldNet(state)`
2. `buildModel(net, params)`
3. `setupGuidedFold(model, net)`
4. `new FoldSolver(model)`

`setupGuidedFold(...)` marks boundary-related nodes as driven and stores their
folded goal positions:

- Apex tips drive to `(0, 0, H)`.
- Molecule outer-corner pairs drive together onto the cone base ring.
- Valley convergence nodes drive inside the pyramid volume to encourage tucking.

`singleHingeModel(...)` creates a minimal two-triangle model for solver tests.

### [kirigami/sim/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/index.ts)

Simulation barrel for Node-safe exports.

It re-exports:

- Fold-net builders and types.
- Model builders, parameters, and types.
- CPU force pass functions.
- CPU solver and measurement helper.
- Scene assembly helpers.
- The dependency-free vector namespace.

It deliberately does not export Three.js view code or GPU solver classes, so
tests can import the simulation core in a plain Node environment.

### [kirigami/sim/gpu/pack.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/pack.ts)

Packs a `BarHingeModel` into float arrays suitable for GPU textures.

Exports:

- `PackedModel`
- `texDim(n)`
- `packModel(model, zeta)`

Packed data includes:

- Node textures: position, velocity, mass/fixed/driven, goal, node metadata.
- Incident element lists: beams, creases, and faces per node.
- Per-crease textures: nodes, stiffness/target, and face winding.
- Per-face textures: node indices and nominal interior angles.

`texDim(...)` chooses square-ish dimensions with enough texels for a count.
`packModel(...)` builds incidence lists so one fragment shader invocation per
node can gather all forces touching that node.

### [kirigami/sim/gpu/gpu-solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/gpu-solver.ts)

Browser-only GPU solver using Three.js `GPUComputationRenderer`.

Exports:

- `GpuFoldSolver`

Construction:

- Packs the model with `packModel(...)`.
- Creates ping-pong position and velocity textures.
- Adds `texturePosition` and `textureVelocity` variables.
- Attaches static model data as `DataTexture` uniforms.
- Initializes the computation renderer.

Public behavior:

- `GpuFoldSolver.create(model, renderer)` returns a solver or `null` when GPU setup fails.
- `step(n)` advances the GPU compute pipeline `n` times at current `foldPercent`.
- `readInto(model)` reads the current position render target back into `model.position`.

The class mirrors the CPU solver surface closely enough for `SimCanvas` to use
GPU first and CPU as a fallback.

### [kirigami/sim/gpu/shaders.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/shaders.ts)

GLSL source strings for the GPU solver.

Exports:

- `VELOCITY_SHADER`
- `POSITION_SHADER`

Internal constant:

- `COMMON`: shared GLSL declarations, texture fetch helpers, node indexing, face-normal calculation, and `computeForce(...)`.

Shader behavior:

- `VELOCITY_SHADER` computes force for one node and updates velocity unless the node is fixed.
- `POSITION_SHADER` computes semi-implicit position updates. Driven nodes are set by interpolating rest to goal with `uFoldPercent`; fixed nodes hold position.

The shader path intentionally recomputes normals and fold angles inline per
node gather, trading some duplicated work for a simpler node-texture layout.

## Config And Tooling

### [package.json](/Users/emredayangac/Documents/AKDE/package.json)

NPM manifest and script contract.

Scripts:

- `dev`: Vite dev server.
- `build`: TypeScript typecheck followed by Vite production build.
- `preview`: preview production build.
- `test`: one-shot Vitest run.
- `test:watch`: Vitest watch mode.

Dependencies:

- Runtime: `three`.
- Development: TypeScript, Vite, Vitest, Node types, and Three types.

### [vite.config.ts](/Users/emredayangac/Documents/AKDE/vite.config.ts)

Vite application config.

Important settings:

- `root: "app"` means `app/index.html` is the browser entry.
- `publicDir: false` disables Vite's default public folder behavior.
- `base` is `/` in dev and `/AKDE/` for builds unless `VITE_BASE` overrides it.
- Alias `@kirigami` points at the repository `kirigami/` directory.
- Build output goes to repository-root `dist/`, matching the Pages workflow.
- Dev server opens a browser automatically.

### [vitest.config.ts](/Users/emredayangac/Documents/AKDE/vitest.config.ts)

Vitest config.

Important settings:

- `environment: "node"` keeps tests out of a browser runtime.
- `globals: false` requires explicit imports from `vitest`.
- Alias `@kirigami` matches Vite and TypeScript.

### [tsconfig.json](/Users/emredayangac/Documents/AKDE/tsconfig.json)

TypeScript compiler configuration.

Important settings:

- ES2022 target and ESNext modules.
- Bundler module resolution.
- Strict typechecking.
- `noEmit` because Vite handles build output.
- DOM and Node typings are both available.
- Path alias `@kirigami/*` maps to `kirigami/*`.
- Includes app, kirigami source, tests, and Vite/Vitest configs.

## Tests And Diagnostics

### Main test files

- [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts): golden square-pyramid row and end-to-end scalar invariants.
- [tests/geometry-functions.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry-functions.test.ts): individual geometry helper behavior, clamps, degeneracy guards, scale invariance, active minor-cut formula, and defaults.
- [tests/constraints.test.ts](/Users/emredayangac/Documents/AKDE/tests/constraints.test.ts): C1-C6 order, pass/fail behavior, residual definitions, and crafted failing states.
- [tests/validation.test.ts](/Users/emredayangac/Documents/AKDE/tests/validation.test.ts): raw input validation and model-level `H <= 0` throw.
- [tests/pattern.test.ts](/Users/emredayangac/Documents/AKDE/tests/pattern.test.ts): segment counts, polygon/molecule geometry, boundary alternation, fold placement, minor-cut wedge geometry, fill area, and paint order.
- [tests/svg-export.test.ts](/Users/emredayangac/Documents/AKDE/tests/svg-export.test.ts): cut/score export split, no fill-edge stroke halo, minor-cut separation, viewBox registration, combined SVG, ZIP output, and previews.
- [tests/zip.test.ts](/Users/emredayangac/Documents/AKDE/tests/zip.test.ts): ZIP signatures, CRC-32, binary preservation, folder paths, and central directory offsets.
- [tests/formatters.test.ts](/Users/emredayangac/Documents/AKDE/tests/formatters.test.ts): controller formatting helpers.
- [tests/vec3.test.ts](/Users/emredayangac/Documents/AKDE/tests/vec3.test.ts): simulation vector math.
- [tests/sim.test.ts](/Users/emredayangac/Documents/AKDE/tests/sim.test.ts): fold-net topology, crease/cut classification, bar-and-hinge assembly, GPU packing, single-hinge fold behavior, and full guided fold behavior.

### Diagnostic scripts

Files named `tests/_diag-*.ts` and `tests/_diag-sweep.ts` are manual diagnostic
scripts, not Vitest suites. They print geometry measurements for minor-cut,
chord, overlap, viewBox, and sweep investigations. They are useful when
debugging pattern topology but are not part of the normal `npm run test`
contract because their filenames do not match `*.test.ts`.
