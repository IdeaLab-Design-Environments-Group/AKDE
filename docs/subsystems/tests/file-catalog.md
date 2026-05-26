# Test File Catalog

This catalog documents what each test file protects and which source files it
is meant to constrain. Files ending in `.test.ts` are part of the normal Vitest
suite. Files beginning with `_diag` are manual diagnostics.

## [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts)

### Purpose

End-to-end scalar geometry checks for representative full states.

### Source Under Test

- `kirigami/model/geometry.ts`

### Main Coverage

- Canonical square-pyramid row.
- Agreement between `computeDerived(...)` and `computeState(...)`.
- Positive dihedral and minor-cut values for valid square-pyramid input.
- Angle closure identity `N theta + N eta = 2pi`.

### Contract Protected

The full scalar pipeline should continue to match the documented formulas for a
known hand-checkable case.

## [tests/geometry-functions.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry-functions.test.ts)

### Purpose

Helper-level unit tests for individual geometry functions.

### Source Under Test

- `kirigami/model/geometry.ts`

### Main Coverage

- `computeR` for hexagon, square, and scaling.
- `computeS`, `computePsi`, and `computeKappa`.
- `computeEta` clamps and degeneracy behavior.
- `computeDeltaApex`, `computeTheta`, and `computeTau`.
- `computeW` and `computeMoleculeEndLeg`.
- `computeRApex` physical value, clamp, and zero guards.
- `computeFoldClearance` and `computeFoldReach`.
- `computeDihedralGamma` known value and degeneracy behavior.
- Active `computeMinorCutLength` wiring.
- `computeState` error behavior and scale invariance.
- `defaultInputs` shape.

### Contract Protected

Low-level formulas remain individually correct even if the aggregate pipeline is
refactored.

## [tests/constraints.test.ts](/Users/emredayangac/Documents/AKDE/tests/constraints.test.ts)

### Purpose

Checks C1-C6 residuals and pass/fail semantics.

### Source Under Test

- `kirigami/model/constraints.ts`
- `kirigami/model/geometry.ts`

### Main Coverage

- C1-C6 are returned in the expected order.
- Canonical square pyramid passes all constraints.
- C5 fails for a tall pyramid where `w > L`.
- C6 fails for thick material where relief overshoots available slant.
- Crafted states test individual evaluator residual behavior.

### Contract Protected

Constraint rows are stable UI-facing diagnostics, not just booleans.

## [tests/validation.test.ts](/Users/emredayangac/Documents/AKDE/tests/validation.test.ts)

### Purpose

Protects raw input validation and its separation from constraints.

### Source Under Test

- `kirigami/model/validation.ts`
- `kirigami/model/geometry.ts`

### Main Coverage

- Valid `H > 0` and `T > 0` return `null`.
- `H = 0` and `H < 0` return apex-height error.
- `T = 0` and `T < 0` return material-thickness error.
- `computeState(...)` throws when `H <= 0`.

### Contract Protected

Invalid input should short-circuit before pattern generation, while computed
constraint failures remain separate.

## [tests/pattern.test.ts](/Users/emredayangac/Documents/AKDE/tests/pattern.test.ts)

### Purpose

Broad geometry contract for `PatternNet`.

### Source Under Test

- `kirigami/model/pattern.ts`
- `kirigami/model/geometry.ts`

### Main Coverage

- Segment counts by role.
- Polygon triangles and major-cut tip placement.
- Molecule outer chord length.
- `outerEdgeLength` effect on polygon outer base length.
- Shared vertices between adjacent polygon and molecule geometry.
- Boundary alternation between polygon bases and molecule chords.
- Fold placement from outer chord midpoint to inner chord midpoint.
- Valid pattern generation for `N = 3`, `N = 4`, and `N = 6`.
- Minor-cut geometry across several `N` values.
- Minor-cut relief triangle gap from the boundary.
- Inward minor-cut endpoint behavior.
- Molecule fill excludes removed wedge.
- Positive fill area.
- Paint order.
- `cornerMoleculeTrapezoid(...)` helper behavior.

### Contract Protected

The rendered SVG net has stable topology, role ordering, and geometric meaning.
Export and visual rendering depend on this.

## [tests/svg-export.test.ts](/Users/emredayangac/Documents/AKDE/tests/svg-export.test.ts)

### Purpose

Tests export serialization and Cricut-oriented operation splitting.

### Source Under Test

- `kirigami/model/svg-export.ts`
- `kirigami/model/pattern.ts`
- `kirigami/model/zip.ts`

### Main Coverage

- Two-file cut/score export.
- Cut file uses a filled body inside `g#cut`.
- No stroke halo around filled cut body.
- Minor cuts remain separate interior lines.
- Cut and score files share viewBox.
- Triangle slant edges are not exported as operations.
- Combined SVG contains both color-coded operation layers.
- Combined SVG path content matches separate exports.
- ZIP packs files under one folder.
- Modal previews use expected colors and registration.
- Full `buildExportPayload(...)` output.

### Contract Protected

Exported files remain machine-oriented, registered, and separated by operation.

## [tests/zip.test.ts](/Users/emredayangac/Documents/AKDE/tests/zip.test.ts)

### Purpose

Low-level tests for the dependency-free ZIP writer.

### Source Under Test

- `kirigami/model/zip.ts`

### Main Coverage

- Empty archive shape.
- ZIP signatures.
- CRC-32 using a known ISO test vector.
- Multi-entry round trip.
- Folder paths.
- Binary byte preservation.
- Central directory counts and offsets.

### Contract Protected

The export archive does not depend on text-only assumptions or external ZIP
libraries.

## [tests/formatters.test.ts](/Users/emredayangac/Documents/AKDE/tests/formatters.test.ts)

### Purpose

Tests controller display formatting helpers.

### Source Under Test

- `kirigami/controller/formatters.ts`

### Main Coverage

- Radian-to-degree conversion.
- Default and custom digit formatting for angles.
- Default and custom digit formatting for millimeter values.
- Rounding behavior.

### Contract Protected

Derived field display strings remain stable.

## [tests/vec3.test.ts](/Users/emredayangac/Documents/AKDE/tests/vec3.test.ts)

### Purpose

Tests dependency-free simulation vector helpers.

### Source Under Test

- `kirigami/sim/vec3.ts`

### Main Coverage

- Constructor defaults.
- Clone independence.
- Add, subtract, and scale.
- Dot product.
- Cross product orientation.
- Length and distance.
- Unit normalization.
- Zero-vector normalization guard.

### Contract Protected

The simulation core can rely on vector helpers without importing Three.js.

## [tests/sim.test.ts](/Users/emredayangac/Documents/AKDE/tests/sim.test.ts)

### Purpose

Broad simulation contract test suite.

### Source Under Test

- `kirigami/sim/foldnet.ts`
- `kirigami/sim/model.ts`
- `kirigami/sim/forces.ts`
- `kirigami/sim/solver.ts`
- `kirigami/sim/build.ts`
- `kirigami/sim/gpu/pack.ts`

### Main Coverage

- Fold-net topology and connectivity.
- Crease and cut classification.
- Guided molecule tuck behavior.
- Beam stiffness mapping.
- Interior edge to crease mapping.
- Kirigami coupling through hinge softening.
- GPU packing consistency with model incidence.
- Single-hinge fold convergence.
- Full-net guided fold toward designed pyramid target.

### Contract Protected

Simulation topology, CPU force math, and GPU packing remain aligned.

## Diagnostic Scripts

Diagnostic files are not part of the normal Vitest contract. They are used for
manual geometry investigations and print values to stdout.

### [tests/_diag-chord.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-chord.ts)

Checks whether generated minor cuts accidentally lie on the outer chord or are
too short across several `N` values.

### [tests/_diag-minor2.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-minor2.ts)

Prints detailed endpoint and inwardness measurements for a representative
minor-cut case.

### [tests/_diag-minor3.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-minor3.ts)

Compares net-emitted minor cuts with reconstructed molecule geometry for
debugging endpoint placement.

### [tests/_diag-null.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-null.ts)

Investigates null or zero-length minor-cut endpoints across parameter sweeps.

### [tests/_diag-null2.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-null2.ts)

Secondary null-endpoint diagnostic for alternate sweep conditions.

### [tests/_diag-outer.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-outer.ts)

Checks whether minor-cut starts match molecule outer vertices and whether cuts
stay above a minimum visible length.

### [tests/_diag-overlap.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-overlap.ts)

Measures endpoint distance to outer chords for overlap debugging.

### [tests/_diag-sweep.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-sweep.ts)

Sweeps `N` and `H` values looking for short minor-cut paths.

### [tests/_diag-viewbox.ts](/Users/emredayangac/Documents/AKDE/tests/_diag-viewbox.ts)

Checks whether cut points lie inside the emitted viewBox.
