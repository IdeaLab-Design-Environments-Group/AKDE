# Model File Catalog

This catalog documents the model source files in implementation detail. The
model layer owns math, validation, constraints, pattern geometry, SVG export,
and ZIP packaging. It should remain browser-independent except for APIs that
are already available in the browser and Node test environment.

## [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)

### Purpose

Defines the domain data contracts shared by controller, views, tests, export,
and simulation.

### Exports

- `KirigamiInputs`
- `KirigamiDerived`
- `KirigamiState`
- `ConstraintId`
- `ConstraintState`

### `KirigamiInputs`

User-facing input shape:

- `edgeCount`
  - Edge count `N`.
  - Dimensionless.
- `edgeLength`
  - Base edge length `L`.
  - Millimeters.
- `outerEdgeLength?`
  - Outer polygon-face edge length `L_o`.
  - Optional; defaults semantically to `edgeLength` when omitted.
  - Used by pattern construction and simulation topology layout.
- `totalCurvature`
  - UI field `K_tot`.
  - In this app it means vertical apex altitude `H` in millimeters.
  - It is explicitly not the slant edge and not `N * theta`.
- `materialThickness`
  - Material thickness `T` in millimeters.
  - Used in cut sizing and constraints.

### `KirigamiDerived`

Computed scalar values:

- `theta`: uniform molecule angle.
- `w`: uniform molecule width.
- `R`: base circumradius.
- `H`: vertical apex altitude copied from input semantics.
- `s`: slant edge.
- `psi`: apex elevation angle.
- `kappa`: rise ratio.
- `eta`: lateral face apex angle.
- `deltaApex`: discrete apex angle defect.
- `tau`: closure step.
- `gamma`: adjacent-face dihedral.
- `rApex`: major-cut radius after implementation clamp.
- `moleculeEndLeg`: edge-molecule end-leg length.
- `minorCutLength`: active fold-reach minor-cut length.

### `KirigamiState`

Flat state object used by the app:

- Contains `inputs`.
- Extends every field in `KirigamiDerived`.

The flat shape makes view binding simple but means renaming derived fields has
wide impact.

### `ConstraintId` And `ConstraintState`

Constraint IDs are fixed to:

- `C1`
- `C2`
- `C3`
- `C4`
- `C5`
- `C6`

`ConstraintState` carries:

- `id`
- `label`
- `satisfied`
- `residual`
- optional `message`

The checklist view renders this object directly, so labels and messages are
part of user-facing behavior.

### Cross-Subsystem Reach

`types.ts` is consumed by:

- controller code
- DOM views
- export code
- simulation builders
- tests

That is why shape changes here have such a wide blast radius.

## [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)

### Purpose

Pure scalar geometry for the implemented AKDE kirigami model. This is the main
mathematical authority in code form.

### Imports

- Type-only imports from `types.ts`.

### Constants And Internal Types

- `TAU`
  - `2 * Math.PI`.
- Local `Vec3`
  - Minimal local vector type for dihedral computation.
- Local helpers:
  - `sub3`
  - `cross3`
  - `len3`

The file keeps these 3D helpers local because they are only needed for one
dihedral formula and should not couple scalar model code to the simulation
vector library.

### Scalar Formula Exports

- `computeR(N, L)`
  - Returns `L / (2 * sin(pi / N))`.
  - No guard is applied; callers are expected to provide valid `N`.
- `computeS(R, H)`
  - Returns `sqrt(R^2 + H^2)`.
- `computePsi(H, R)`
  - Returns `atan2(H, R)`.
- `computeKappa(H, R)`
  - Returns `H / R`.
  - Returns `NaN` when `R === 0`.
- `computeEta(R, s, N)`
  - Returns `0` unless `s > 0` and `R > 0`.
  - Computes `2 * asin(arg)`.
  - Clamps `arg` to at most `1` before `asin`.
- `computeDeltaApex(N, eta)`
  - Returns `2pi - N * eta`.
- `computeTheta(deltaApex, N)`
  - Returns `deltaApex / N`.
- `computeTau(N)`
  - Returns `2pi / N`.
- `computeW(s, theta)`
  - Returns `2 * s * sin(theta / 2)`.
- `computeRApex(theta, T, s)`
  - Returns `0` unless `T > 0` and `theta > 0`.
  - Physical radius is `T / sin(theta / 2)`.
  - Returned value is clamped to `0.4 * s`.
- `computeMoleculeEndLeg(s, theta)`
  - Returns `0` unless `s > 0`, `theta > 0`, and `theta < pi`.
  - Otherwise returns `2 * s * tan(theta / 2)`.
- `computeFoldClearance(gamma, T)`
  - Uses `T * tan(gamma / 2)`.
  - Guards degenerate half-angle ranges.
- `computeFoldReach(rApex, w)`
  - Uses `hypot(w / 2, max(0, rApex))`.
  - If `w <= 0`, returns the non-negative depth only.

### Dihedral Computation

`computeDihedralGamma(R, H, N)` builds a local three-vertex neighborhood of the
pyramid:

- Base vertex at phase `-pi / 2`.
- Previous and next base vertices offset by `2pi / N`.
- Apex at `(0, 0, H)`.

It computes two adjacent face normals using cross products. Degenerate inputs or
near-zero normals return `pi`. Otherwise it computes the angle between normals,
clamps the dot-product ratio to `[-1, 1]`, and returns the interior convention
`pi - angleBetweenNormals`.

`computeDihedralGammaFromState(state)` is a convenience wrapper using `state.R`,
`state.H`, and `state.inputs.edgeCount`.

### Minor-Cut Strategy Surface

Exports:

- `MinorCutFormula`
- `MINOR_CUT_FORMULA`
- `computeMinorCutLength(...)`

Available formula keys:

- `tuck-flap`
- `lie-flat`
- `fold-bound`
- `strip-removal`
- `end-leg`
- `fold-clearance`
- `fold-reach`

Active constant:

- `MINOR_CUT_FORMULA = "fold-reach"`

`computeMinorCutLength(...)` dispatches based on that constant. The active path
uses `computeFoldReach(...)`, taking `rApex` when supplied or deriving a fallback
depth from `T / sin(theta / 2)`.

### Aggregation Functions

`computeDerived(N, L, H, T)` computes in this order:

1. `R`
2. `s`
3. `psi`
4. `kappa`
5. `eta`
6. `deltaApex`
7. `theta`
8. `tau`
9. `w`
10. `gamma`
11. `rApex`
12. `moleculeEndLeg`
13. `minorCutLength`

It returns a `KirigamiDerived` object.

`computeState(inputs)`:

- Reads `N`, `L`, `H`, and `T` from `KirigamiInputs`.
- Throws if `H <= 0`.
- Returns `{ inputs, ...computeDerived(...) }`.

`defaultInputs()`:

- Uses `N = 6`.
- Uses `L = 100`.
- Computes `R` from `N` and `L`.
- Sets `outerEdgeLength = L`.
- Sets `totalCurvature = R`, giving a 45-degree default pyramid.
- Sets `materialThickness = 1`.

### Important Contracts

- `H` is vertical apex height throughout the file.
- `outerEdgeLength` does not enter scalar derivation.
- `rApex` is clamped for implementation stability.
- `computeDerived(...)` uses the active fold-reach formula directly.

### High-Risk Change Zones

The most sensitive edits in this file are:

- changing the meaning of `totalCurvature`
- changing the active `MINOR_CUT_FORMULA`
- changing `defaultInputs()`
- changing the order or composition of fields returned by `computeDerived(...)`

## [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)

### Purpose

Creates residual-bearing checklist rows from an already valid
`KirigamiState`.

### Exports

- `CONSTRAINT_EPS`
- `evaluateC1`
- `evaluateC2`
- `evaluateC3`
- `evaluateC4`
- `evaluateC5`
- `evaluateC6`
- `evaluateConstraints`

### Evaluators

`evaluateC1(state)`:

- Uses `N = state.inputs.edgeCount`.
- Residual is `abs(N * theta + N * eta - 2pi)`.
- Satisfied when residual is below `CONSTRAINT_EPS`.

`evaluateC2(state)`:

- Uses `vectorClosureResidual(N, w, tau)`.
- Satisfied when residual is below `CONSTRAINT_EPS`.

`evaluateC3(state)`:

- Checks `abs(theta) < pi - CONSTRAINT_EPS`.
- Residual is excess beyond that range.

`evaluateC4(state)`:

- Checks `w >= -CONSTRAINT_EPS`.
- Residual is `-w` only when `w < 0`.

`evaluateC5(state)`:

- AKDE fold-overlap proxy.
- Checks `w <= L`.
- Residual is `max(0, w - L)`.
- Adds a message when width exceeds face edge length.

`evaluateC6(state)`:

- AKDE cut-vs-dihedral proxy.
- Computes relief as `T * tan(gamma / 2)` for valid half-angle range.
- Computes available distance as `s - rApex`.
- Residual is `max(0, reliefDepth - available)`.
- Adds a message when relief overshoots.

### Aggregate Order

`evaluateConstraints(state)` returns:

1. C1
2. C2
3. C3
4. C4
5. C5
6. C6

Checklist ordering in the UI depends on this order.

### Internal Helper

`vectorClosureResidual(N, w, tau)`:

- Loops from `0` to `N - 1`.
- Accumulates `w * cos(n * tau)` and `w * sin(n * tau)`.
- Returns `hypot(sumX, sumY)`.

### Boundary With Validation

This file assumes `KirigamiState` exists. It does not reject raw user inputs.
That is `validation.ts` and controller responsibility.

## [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)

### Purpose

Rejects raw input states before geometry is computed.

### Exports

- `APEX_HEIGHT_ERROR`
- `MATERIAL_THICKNESS_ERROR`
- `validateInputs(inputs)`

### Behavior

`validateInputs(inputs)` returns:

- `APEX_HEIGHT_ERROR` when `inputs.totalCurvature <= 0`.
- `MATERIAL_THICKNESS_ERROR` when `inputs.materialThickness <= 0`.
- `null` when both checks pass.

The function returns only one string, not a field map. The controller currently
knows how to map the two possible errors onto the two fields.

That makes the file intentionally simple, but it is not yet a general
validation framework.

## [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)

### Purpose

Builds the role-tagged SVG path geometry for the flat kirigami pattern.

### Imports

- `computeMinorCutLength`
- `MINOR_CUT_FORMULA`
- `KirigamiState`

### Exports

- Types:
  - `PatternStrokeRole`
  - `PatternSegment`
  - `PatternNet`
  - `CornerCutFoldSegments`
- Builders and helpers:
  - `buildPatternNet`
  - `cornerMoleculeTrapezoid`
  - `moleculeOuterVertices`
  - `moleculeTrapezoidFromOutlinePath`
  - `moleculeInnerVertices`
  - `moleculeSlantOuterVertices`
  - `moleculeTopEdgeMidpoint`
  - `moleculeMinorCutEndpoints`
  - `moleculeFillPolygon`
  - `moleculeFillInteriorPoint`
  - `moleculeOutlineSegments`
  - `cornerCutFoldSegments`
  - `minorCutEndpointOnValleyFold`
  - `valleyFoldPointAtPathLength`
  - `nearestInwardPointOnValleyFold`
  - `inwardFoldTarget`
  - `injectPolyTipsCW`

### `PatternStrokeRole`

Role vocabulary used by CSS, export, and tests:

- `polygon`
- `boundary`
- `molecule-fill`
- `molecule`
- `cut`
- `minor-cut`
- `fold`

### `buildPatternNet(state)`

Main construction algorithm:

1. Clamp/round `edgeCount` to valid integer `N`.
2. Read `s`, `eta`, `tau`, and `rApex`.
3. Define the fan phase so polygon 0 faces upward in screen coordinates.
4. Define angle helpers for polygon left ray, polygon right ray, and polygon outer bisector.
5. Resolve `outerEdgeLength`, defaulting to `edgeLength`.
6. Convert `outerEdgeLength` into `outerHalf`, clamped away from zero-span molecule cases.
7. Compute rendered molecule chord width from remaining angular span.
8. Build inner-left, inner-right, outer-left, and outer-right points for every polygon.
9. Build molecule quads between adjacent polygon slants.
10. Compute bounds and shift all points into a positive `viewBox`.
11. Emit polygon face segments.
12. Emit clipped molecule fill segments.
13. Emit molecule outline segments.
14. Emit the major-cut inner ring as a closed `cut`.
15. Emit each valley `fold`.
16. Emit each minor-cut relief as a closed `minor-cut` triangle with a small outer gap.
17. Emit outer `boundary` last.

### Paint-Order Dependency

The segment emission order is important:

- fills are emitted before crease/cut lines
- the outer boundary is emitted last

Tests assert this because both readability and export assumptions depend on
stable ordering.

### Molecule Helpers

- `moleculeOuterVertices(...)` compares distances to the fan apex and returns the farther chord.
- `moleculeInnerVertices(...)` returns the nearer chord.
- `moleculeSlantOuterVertices(...)` preserves DETC-style right/left slant semantics through `p2` and `p3`.
- `moleculeTopEdgeMidpoint(...)` returns the outer chord midpoint.
- `moleculeMinorCutEndpoints(...)` asks `cornerCutFoldSegments(...)` where cuts land.
- `moleculeFillPolygon(...)` removes the outer relief wedge from the molecule fill region.
- `moleculeFillInteriorPoint(...)` is a test/diagnostic sample point away from removed material.
- `moleculeOutlineSegments(...)` returns the original trapezoid edges.

### Minor Cut Helpers

- `cornerCutFoldSegments(...)` returns the valley crease and cuts. It dispatches to `stripRemovalCuts(...)` only when the global formula is `strip-removal`.
- `minorCutEndpointOnValleyFold(...)` collects candidate endpoints from path-length, circle/segment intersection, radial cap intersection, and inward projection, then picks the longest feasible inward cut.
- `longestFeasiblePointOnValleyFold(...)` samples the fold segment as a fallback when analytic candidates are inadequate.
- `stripRemovalCuts(...)` constructs three cut segments for strip-removal mode.

### Low-Level Geometry Helpers

Private helpers include:

- interpolation
- point equality
- consecutive-point deduplication
- vector subtraction
- distance
- unit vector
- dot product
- 2D cross product
- line intersection
- ray/segment intersection
- circle/segment intersection
- closed-segment membership
- nearest point on segment
- closed and open SVG polyline serialization
- bounds calculation

### Important Contracts

- Segment order is paint order.
- `minor-cut` is a distinct role from `cut` for screen styling and export handling.
- `outerEdgeLength` affects rendered polygon base span and molecule chord width.
- The returned viewBox is shifted to non-negative coordinates with margin.

## [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)

### Purpose

Serializes `PatternNet` into Cricut-oriented SVG assets, previews, and a ZIP
archive.

### Imports

- Pattern types from `pattern.ts`.
- `createZip` from `zip.ts`.

### Exports

- Constants:
  - `CUT_COLOR`
  - `SCORE_COLOR`
  - `LINE_STROKE_WIDTH`
- Types:
  - `CricutSvgFile`
  - `ExportArchive`
  - `CricutPreviews`
  - `ExportPayload`
- Builders:
  - `buildCricutSvgFiles`
  - `buildCombinedCricutSvg`
  - `buildCricutZip`
  - `buildCricutPreviews`
  - `buildExportPayload`

### Role Mapping

Cut roles:

- `boundary`
- `cut`
- `minor-cut`

Score roles:

- `fold`

Excluded visual roles:

- `polygon`
- `molecule`
- `molecule-fill`

### Export Builders

`buildCricutSvgFiles(net, baseName)`:

- Filters cut and score segments.
- Emits `<baseName>-cut.svg` when cut paths exist.
- Emits `<baseName>-score.svg` when score paths exist.
- Uses shared viewBox and mm dimensions.

`buildCombinedCricutSvg(net, baseName)`:

- Emits one color-coded SVG.
- Black paths represent cut.
- Blue paths represent score.
- Returns `null` when both segment groups are empty.

`buildCricutZip(net, baseName)`:

- Builds the two operation files.
- Encodes SVG strings with `TextEncoder`.
- Stores entries under `<baseName>/`.
- Returns archive filename and bytes.

`buildCricutPreviews(net)`:

- Produces inline SVG strings for cut, score, and both.
- Uses non-scaling strokes for thumbnail readability.

`buildExportPayload(net, baseName)`:

- Combines previews, ZIP archive, and combined SVG.
- Returns `null` if there is no archive to download.

### Internal Serialization Helpers

- `previewSvg(...)`: wraps preview groups into an inline, percentage-sized SVG.
- `svgWrap(...)`: wraps export body in an mm-sized SVG.
- `linesMarkup(...)`: emits separate stroked paths for score lines.
- `cutBodyMarkup(...)`: separates closed cut regions from open minor-cut strokes.
- `fmt(...)`: rounds finite numbers to three decimal places.
- `scoreSegments(...)`: filters score roles.
- `cutSegments(...)`: filters cut roles.

### Important Export Contract

Closed boundary and major-cut paths are combined into a filled even-odd body
with no stroke. This avoids stroke halos and double-cut behavior in downstream
cutting workflows. Minor cuts remain stroked interior paths.

## [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)

### Purpose

Minimal ZIP writer for browser downloads. It uses STORE mode, so it packages
files without compression.

### Exports

- `ZipEntry`
- `createZip(entries)`

### Internal Data

- `CRC_TABLE`
  - Precomputed lookup table for CRC-32.
- `crc32(bytes)`
  - Computes CRC for each entry.

### `createZip(entries)`

For each entry:

1. Encode the entry name.
2. Compute CRC-32.
3. Write a local file header.
4. Append file bytes.
5. Write a central directory record.
6. Track local-header offset.

After all entries:

1. Compute central directory size and offset.
2. Write end-of-central-directory record.
3. Allocate output `Uint8Array`.
4. Copy every part into the output.

### Constraints

- No compression.
- No ZIP64 support.
- No timestamps.
- No comments.

Those omissions are intentional because export archives contain only a few
small SVG files.

## [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)

### Purpose

Public barrel for model-layer imports.

### Re-exports

- Domain types from `types.ts`.
- Scalar geometry functions and minor-cut constants from `geometry.ts`.
- Pattern builders, helpers, and pattern types from `pattern.ts`.
- SVG export builders, constants, and export types from `svg-export.ts`.
- Constraint evaluators and `CONSTRAINT_EPS` from `constraints.ts`.
- Validation helpers and error strings from `validation.ts`.

### Contract

Tests and cross-layer code often import from this file. Removing or renaming
exports here can break callers even when the underlying implementation file is
unchanged.

This barrel is also what keeps higher-level imports short and stable during
refactors.
