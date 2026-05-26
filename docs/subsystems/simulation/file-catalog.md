# Simulation File Catalog

This catalog documents the forward-folding simulation files in implementation
detail. The simulation layer is downstream of the scalar kirigami model and is
kept mostly independent of DOM and Three.js so it can be tested in Node.

## [kirigami/sim/vec3.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/vec3.ts)

### Purpose

Minimal dependency-free 3D vector utility module.

### Exports

- `Vec3`
- `vec3(x = 0, y = 0, z = 0)`
- `clone(a)`
- `add(a, b)`
- `sub(a, b)`
- `scale(a, k)`
- `dot(a, b)`
- `cross(a, b)`
- `length(a)`
- `distance(a, b)`
- `normalize(a)`

### Behavior Notes

- Vectors are plain objects `{ x, y, z }`.
- `normalize` returns the zero vector when length is below `1e-12`.
- The file imports nothing, which keeps simulation tests independent of Three.js.

## [kirigami/sim/foldnet.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/foldnet.ts)

### Purpose

Builds the fold topology mesh that bridges flat pattern geometry to the
bar-and-hinge solver.

### Imports

- `KirigamiState`
- `computeMinorCutLength`
- `vec3` and `Vec3`

### Exports

- `EdgeAssignment`
- `FoldNetEdge`
- `FoldNet`
- `buildFoldNet(state)`
- `foldNetFromMesh(vertices, faces, interiorAssignment, meta)`

### Edge Assignments

- `M`: mountain crease.
- `V`: valley crease.
- `F`: facet triangulation crease.
- `B`: boundary edge.
- `C`: kirigami cut.

### `FoldNet`

Stores:

- `vertices`: flat-net vertex positions.
- `faces`: triangle faces.
- `edges`: unique edges with assignment, rest length, and adjacent faces.
- `base`: outer base-ring vertex indices.
- `basePairs`: outer corner pairs that merge during guided folding.
- `valleyOuter`: molecule valley-convergence nodes.
- `tips`: polygon apex-tip nodes.
- `meta`: normalized geometry values and scale.

### `buildFoldNet(state)`

Main algorithm:

1. Recreate the same fan geometry used by `pattern.ts`.
2. Resolve outer edge length and outer angular half-span.
3. Build polygon inner/outer points and tip points.
4. Use a coordinate-key registry to weld shared vertices.
5. Add lateral face triangles.
6. Mark polygon slants as mountain creases.
7. For each molecule:
   - identify inner endpoints
   - identify outer corner pair
   - compute minor-cut length
   - derive the valley convergence point
   - add valley crease key
   - add minor-cut keys
   - triangulate left and right molecule halves
8. Build an edge map from face adjacency.
9. Classify edges by adjacency and key sets.
10. Tag inner-rim boundary edges as major-cut edges.
11. Build `base`, `basePairs`, `valleyOuter`, and `tips`.
12. Normalize all vertex positions to approximately unit scale.
13. Scale edge rest lengths and metadata.

### `foldNetFromMesh(...)`

Generic helper for tests and external meshes:

- Derives edges from triangle adjacency.
- Assigns interior edges through the provided callback.
- Marks boundary edges as `B`.
- Fills missing metadata with defaults.

## [kirigami/sim/model.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/model.ts)

### Purpose

Converts `FoldNet` topology into struct-of-arrays simulation data.

### Imports

- `FoldNet`
- `EdgeAssignment`

### Exports

- `SolverParams`
- `DEFAULT_PARAMS`
- `BarHingeModel`
- `buildModel(net, params, cutRatio)`
- `setFixed(model, ids, pinned)`

### `SolverParams`

Material and solver controls:

- `EA`
- `kFold`
- `kFacet`
- `kFace`
- `zeta`
- `foldMountain`
- `foldValley`

### `BarHingeModel`

Node arrays:

- `position`
- `rest`
- `velocity`
- `force`
- `mass`
- `fixed`
- `goal`
- `driven`

Beam arrays:

- endpoint arrays `n0`, `n1`
- `rest`
- stiffness `k`

Crease arrays:

- wing vertices `n1`, `n2`
- crease edge vertices `n3`, `n4`
- adjacent face indices
- stiffness
- target fold angle
- assignment

Face arrays:

- triangle indices
- nominal interior angles
- scratch normals

### `buildModel(...)`

Assembly sequence:

1. Copy fold-net vertices into `position` and `rest`.
2. Initialize mass, fixed, goal, and driven arrays.
3. Create one beam per edge.
4. Compute beam stiffness as `EA / l0`.
5. Select interior edges for creases.
6. Find opposite wing vertices for each crease.
7. Compute crease stiffness from assignment and optional cut ratio.
8. Set crease target angles for `M`, `V`, and `F`.
9. Compute nominal interior angles for every face.
10. Return the full `BarHingeModel`.

### Internal Helpers

- `nodeP`
- `sub`
- `norm`
- `angleBetween`
- `oppositeVertex`

### `setFixed(...)`

Sets `model.fixed[i]` for an iterable of node IDs. Mass is left unchanged.

## [kirigami/sim/forces.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/forces.ts)

### Purpose

CPU reference implementation of the bar-and-hinge force passes.

### Exports

- `computeFaceNormals`
- `computeThetas`
- `accumulateForces`
- `integrate`
- `computeDt`

### `computeFaceNormals(model)`

For each face:

1. Load current node positions.
2. Compute `(b - a) x (c - a)`.
3. Normalize.
4. Store in `model.faces.normal`.

### `computeThetas(model, lastTheta)`

For each crease:

1. Load adjacent face normals.
2. Load crease edge vector.
3. Compute signed fold angle with `atan2`.
4. Unwrap relative to previous theta to avoid discontinuous jumps.
5. Store back into `lastTheta`.

### `accumulateForces(model, lastTheta, foldPercent)`

Force accumulation order:

1. Clear `model.force`.
2. Add axial spring forces for every beam.
3. Add viscous damping along beam connections.
4. Add crease torsional forces distributed over four crease nodes.
5. Add face interior-angle preservation forces.
6. Zero forces for fixed nodes.

### `integrate(model, dt)`

Forward Euler integration:

- Skip fixed nodes.
- Update velocity by `(F / mass) * dt`.
- Update position by `velocity * dt`.

### `computeDt(model)`

Finds maximum axial frequency from beam stiffness and mass, then returns a
stability-limited timestep with a safety factor.

## [kirigami/sim/solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/solver.ts)

### Purpose

Class wrapper for the CPU force passes.

### Imports

- `BarHingeModel`
- force-pass functions

### Exports

- `FoldSolver`
- `measureTheta`

### `FoldSolver`

Fields:

- `dt`
- `theta`
- `foldPercent`
- `model`

Constructor:

- Computes stable `dt`.
- Allocates persistent theta array.

### `step()`

Runs one simulation step:

1. `driveBoundary()`
2. `computeFaceNormals(...)`
3. `computeThetas(...)`
4. `accumulateForces(...)`
5. `integrate(...)`

### `driveBoundary()`

For driven nodes:

- Interpolates from `rest` to `goal` by `foldPercent`.
- Writes directly into `position`.

Driven nodes are also fixed, so force integration does not move them.

### Other Methods

- `solve(iters, targetFold)`
  - Eases fold percent toward target during repeated stepping.
- `thetaOf(i)`
  - Reads current measured crease theta.
- `positions()`
  - Copies current node positions into tuples.

### `measureTheta(...)`

Standalone helper for tests. It recomputes normals and measures signed dihedral
angle across a specified shared edge.

## [kirigami/sim/build.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/build.ts)

### Purpose

High-level scene assembly for the forward-folding simulation.

### Imports

- `KirigamiState`
- fold-net builders and types
- model builders and parameter types
- `FoldSolver`
- `vec3`

### Exports

- `FoldScene`
- `buildFoldScene`
- `setupGuidedFold`
- `singleHingeModel`

### `FoldScene`

Bundle of:

- `net`
- `model`
- `solver`

### `buildFoldScene(state, params)`

Pipeline:

1. Build fold net from model state.
2. Build bar-and-hinge model.
3. Configure guided fold goals.
4. Create CPU solver.
5. Return all three as `FoldScene`.

### `setupGuidedFold(model, net)`

Marks selected nodes as driven and fixed:

- Tips drive to the pyramid apex.
- Base corner pairs drive together on the base ring.
- Valley convergence nodes drive inside the pyramid to encourage molecule tuck.

Goal coordinates use normalized simulation units from `net.meta`.

### `singleHingeModel(target, kFold)`

Creates a four-node, two-triangle hinge for tests:

- shared edge `(0, 1)`
- two wing nodes
- one interior valley crease
- target fold angle overridden to the supplied value

## [kirigami/sim/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/index.ts)

### Purpose

Node-safe barrel for simulation core.

### Re-exports

- Fold-net builders and types.
- Model builders, defaults, and types.
- Force pass functions.
- CPU solver and theta measurement.
- Scene builders.
- Vector namespace and type.

### Important Omission

This barrel does not export:

- `SimCanvas`
- `GpuFoldSolver`
- Three.js imports

That keeps tests and non-browser code able to import `kirigami/sim/index.ts`.

## [kirigami/sim/gpu/pack.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/pack.ts)

### Purpose

Packs a `BarHingeModel` into float arrays for GPU texture uniforms.

### Exports

- `PackedModel`
- `texDim`
- `packModel`

### `PackedModel`

Contains:

- node texture dimensions and count
- position texture data
- velocity texture data
- mass/fixed/driven texture data
- goal texture data
- node incidence metadata
- beam incidence list
- crease incidence list
- face incidence list
- per-crease node and parameter textures
- per-face node and angle textures

### `texDim(n)`

Returns square-ish texture dimensions `[w, h]` such that `w * h >= n`.

### `packModel(model, zeta)`

Steps:

1. Allocate node-sized RGBA arrays.
2. Copy node positions, masses, fixed flags, driven flags, and goals.
3. Build per-node beam incidence.
4. Build per-node crease incidence with role IDs.
5. Build per-node face incidence with role IDs.
6. Allocate incidence textures.
7. Fill node metadata with start/count offsets.
8. Fill beam metadata with stiffness, other node, rest length, and damping.
9. Fill crease textures with node IDs, stiffness, target angle, and face winding.
10. Fill face textures with node IDs and nominal angles.

The layout lets each node shader gather all force contributions touching that
node.

## [kirigami/sim/gpu/gpu-solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/gpu-solver.ts)

### Purpose

Browser-only GPU implementation of the solver surface used by `SimCanvas`.

### Imports

- `three`
- `GPUComputationRenderer`
- `BarHingeModel`
- `computeDt`
- `packModel`
- shader strings

### Export

- `GpuFoldSolver`

### Constructor Work

1. Compute timestep.
2. Pack model into texture arrays.
3. Create `GPUComputationRenderer`.
4. Create initial position and velocity textures.
5. Add `texturePosition` and `textureVelocity` variables.
6. Set ping-pong dependencies.
7. Create static `DataTexture` uniforms.
8. Attach cloned uniform maps to both variable materials.
9. Initialize GPU computation.

The constructor is private; callers use `create(...)`.

### Public API

- `GpuFoldSolver.create(model, renderer)`
  - Returns a solver.
  - Catches setup failures and returns `null`.
- `step(n = 1)`
  - Updates fold percent uniform.
  - Runs GPU compute `n` times.
- `readInto(model = this.model)`
  - Reads current position render target.
  - Copies RGBA xyz values back into `model.position`.

### Internal Helper

- `structuredCloneUniforms(...)`
  - Gives each GPU variable material separate uniform wrapper objects while sharing texture values.

## [kirigami/sim/gpu/shaders.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/shaders.ts)

### Purpose

Contains GLSL source for the GPU solver.

### Exports

- `VELOCITY_SHADER`
- `POSITION_SHADER`

### Shared `COMMON` Block

Defines:

- Texture uniforms for node, beam, crease, and face data.
- `MAXDEG`
- texture fetch helper
- node position and velocity helpers
- face-normal helper
- `computeForce(self)`
- `selfIndex()`

### `computeForce(self)`

In shader code, gathers:

- axial beam forces
- damping forces
- crease torsional forces
- face interior-angle forces

It mirrors the CPU force logic but computes per node in a fragment shader.

### `VELOCITY_SHADER`

For each node texel:

- Return zero velocity for fixed nodes.
- Compute force.
- Update velocity by `(force / mass) * dt`.

### `POSITION_SHADER`

For each node texel:

- Driven nodes interpolate from rest to goal by `uFoldPercent`.
- Fixed nodes hold position.
- Free nodes compute force, update velocity, then update position using semi-implicit Euler.

### Contract With `pack.ts`

The shader assumes the exact texture layout produced by `packModel(...)`.
Changing packing order requires shader changes in the same commit.
