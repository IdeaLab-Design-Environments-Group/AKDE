# AtoK: Architecture to Kirigami

## From AKDE v1 to a Full Architectural Kirigamizer

### 120-Step Development Plan

**Goal:** Transform AKDE from a single-pyramid kirigami pattern generator into
an architecturally focused Kirigamizer — a design environment where architects
input a target 3D surface and receive a fabrication-ready kirigami crease+cut
pattern that folds from flat sheet into a structurally sound architectural
form.

**Not the goal:** A general-purpose computational-origami research tool.
Every feature earns its place by serving the architect's workflow: site →
surface → pattern → fabrication → assembly → performance.

**Foundation papers (cited throughout as [T], [DT], [LS]):**

- **[T]** Tachi, "Architectural Origami" lecture (L23) — Origamizer tucking
  molecules, freeform origami constraints, rigid origami simulation
- **[DT]** Demaine & Tachi, "Origamizer: A Practical Algorithm for Folding Any
  Polyhedron" (SoCG 2017, CC-BY) — tuck proxy, waffle, Voronoi layout,
  pocket squashing
- **[LS]** Liu, Chuang, Sang & Sabin, "Programmable Kirigami" (DETC2019-97557)
  — inverse/forward kirigami workflow, FEA feedback, auxetic cells,
  responsive modules
- **[FOLD]** Demaine, Ku & Lang, FOLD file format (MIT license) — mesh
  interchange for origami/kirigami

**Existing AKDE assets referenced by path:**

```
kirigami/model/types.ts       — KirigamiInputs, KirigamiDerived, KirigamiState
kirigami/model/geometry.ts    — computeR, computeS, computeEta, computeW, ...
kirigami/model/constraints.ts — C1–C6 constraint evaluation
kirigami/model/pattern.ts     — buildPatternNet (2D SVG pattern)
kirigami/model/svg-export.ts  — Cricut-ready SVG/ZIP export
kirigami/sim/foldnet.ts       — FoldNet mesh, EdgeAssignment (M/V/F/B/C)
kirigami/sim/model.ts         — bar-and-hinge struct-of-arrays
kirigami/sim/solver.ts        — explicit Euler integration
kirigami/sim/forces.ts        — axial + crease + face + damping forces
kirigami/sim/gpu/             — WebGL GPU solver
kirigami/view/                — InputsPanel, PatternCanvas, SimModal, ExportModal
kirigami/controller/          — KirigamiController reactive pipeline
```

---

## Part I — FKLD: Flexible Kirigami list Datastructure (Steps 1–20)

**FKLD** mirrors FOLD's naming and JSON-superset philosophy but extends it for
kirigami architecture. The FOLD format stores vertices, edges, faces, and edge
assignments (M/V/B/U/F/C); AKDE already uses the same assignment alphabet
internally. FKLD adds kirigami- and architecture-specific metadata under a
reserved `fkld:` key namespace, so every FKLD file is also a valid FOLD file
(origami tools ignore the extra keys). The reference implementation is written
in **CoffeeScript** like FOLD itself, for direct source-level interoperability
with the existing origami ecosystem.

### Step 1 — Define the FKLD namespace prefix

Create `fkld/spec.coffee`. All FKLD-specific keys use the prefix `fkld:`
following FOLD's extension convention (custom keys with a colon-separated
namespace are ignored by standard parsers). Document the namespace in a
`FKLD-SPEC.md` file alongside.

Keys to register: `fkld:edges_cutType`, `fkld:edges_moleculeTheta`,
`fkld:edges_moleculeWidth`, `fkld:vertices_curvatureClass`,
`fkld:faces_materialId`, `fkld:meta_architecture`.

### Step 2 — Define FKLD edge cut subtypes

FOLD has a single "C" assignment for cuts. Kirigami architecture needs to
distinguish cut *intent*:

```typescript
type FkldCutType =
  | "major"      // vertex hole (angle-defect relief at positive curvature)
  | "minor"      // molecule dart-mouth (tuck clearance slit)
  | "seam"       // layout seam (surface was split here to unfold without overlap)
  | "dart"       // negative-curvature dart (excess angle removed)
  | "auxetic"    // auxetic cell cut (mechanical property, not geometry relief)
  | "vent"       // ventilation/porosity cut (architectural performance)
  | "tab"        // alignment/assembly tab (cut that leaves a flap for glue/bolt)
```

Store in `fkld:edges_cutType` parallel to `edges_assignment`.

### Step 3 — Define FKLD molecule metadata per edge

For every edge with assignment "M" or "V" that belongs to a molecule, store:

```typescript
fkld:edges_moleculeTheta   // θ(i,j) molecule angle (rad)
fkld:edges_moleculeWidth   // w(i,j) molecule width (mm)
fkld:edges_moleculeDepth   // tuck depth behind the face (mm)
fkld:edges_dihedralTarget  // target dihedral angle when folded (rad)
```

These are Tachi's per-edge parameters [T, Lecture slide 16] generalized from
AKDE's current uniform θ and w.

### Step 4 — Define FKLD vertex curvature classification

For every vertex, store:

```typescript
fkld:vertices_curvatureClass  // "positive" | "negative" | "flat" | "boundary"
fkld:vertices_angleDefect     // G_v = 2π − Σθ_face (rad), signed
fkld:vertices_reliefStrategy  // "molecule" | "cut" | "hybrid" | "none"
```

This is the key divergence from origami: origami forces all vertices to use
molecules (tucking). Kirigami allows cuts at negative-curvature vertices [LS §3.1].

### Step 5 — Define FKLD face material and structural metadata

```typescript
fkld:faces_materialId        // index into the material library
fkld:faces_thickness         // T (mm) — can vary per panel
fkld:faces_structuralRole    // "skin" | "rib" | "reinforcement" | "sacrificial"
fkld:faces_panelId           // fabrication panel grouping (which sheet it's cut from)
```

Architecture needs heterogeneous materials — a roof panel might be 3mm aluminum
while a vent flap is 0.5mm polypropylene.

### Step 6 — Define FKLD architecture metadata block

Top-level metadata for the architectural context:

```typescript
fkld:meta_architecture: {
  targetUse: "roof" | "facade" | "pavilion" | "partition" | "canopy" | "furniture"
  siteLocation: { lat: number; lng: number; elevation: number }
  designLoads: {
    deadLoad: number       // kN/m² (self-weight)
    liveLoad: number       // kN/m² (occupancy/snow)
    windPressure: number   // kN/m² (design wind)
  }
  materialLibrary: MaterialDef[]
  scaleMeters: number      // real-world scale (1 unit = X meters)
  buildMethod: "laser" | "cnc" | "waterjet" | "cricut" | "manual"
}
```

### Step 7 — Implement FKLD TypeScript types

Create `fkld/types.ts` with full TypeScript interfaces mirroring the spec.
Use FOLD's JSON structure as the base type and intersect with FKLD extensions.

```typescript
interface FkldFile extends FoldFile {
  "fkld:edges_cutType"?: FkldCutType[]
  "fkld:edges_moleculeTheta"?: number[]
  "fkld:edges_moleculeWidth"?: number[]
  // ... all keys from Steps 2–6
}
```

### Step 8 — Implement FOLD parser/serializer

Create `fkld/io.ts`. Parse `.fold` / `.fkld` JSON files. Validate against
the FOLD spec (vertices_coords length matches, edges_vertices references valid
indices, etc.). Round-trip: parse → internal representation → serialize without
data loss.

Use the MIT-licensed `fold` npm package for baseline validation, but own the
FKLD extensions.

### Step 9 — Bridge FoldNet ↔ FKLD

Create `fkld/bridge.ts`. Two conversion functions:

- `foldNetToFkld(net: FoldNet, state: KirigamiState): FkldFile` — export the
  current AKDE internal mesh to a FKLD file
- `fkldToFoldNet(kf: FkldFile): FoldNet` — import an external FKLD/FOLD file
  into the simulation mesh

This is the adapter between AKDE's internal `FoldNet` (struct-of-arrays, `Vec3`)
and FOLD's JSON format (nested arrays, `[x,y,z]`).

### Step 10 — Map AKDE EdgeAssignment to FOLD edges_assignment

AKDE uses `"M"|"V"|"F"|"B"|"C"`. FOLD uses the same alphabet plus `"U"`
(unassigned). Map directly:

| AKDE | FOLD | FKLD extension |
|------|------|-----------------|
| "M"  | "M"  | — |
| "V"  | "V"  | — |
| "F"  | "F"  | — |
| "B"  | "B"  | — |
| "C"  | "C"  | `fkld:edges_cutType` distinguishes major/minor/seam/dart/... |

FOLD's `filter.splitCuts` converts "C"→"B" for tools that can't handle cuts.
FKLD preserves "C" with rich subtypes.

### Step 11 — Implement FKLD import in the UI

Add a "Load .fold / .fkld" button to the app header (next to Export). When a
file is loaded:

1. Parse JSON
2. Detect whether it has `fkld:` keys (FKLD) or just standard FOLD keys
3. Convert to FoldNet via `fkldToFoldNet`
4. Populate the pattern canvas with the 2D layout (if `vertices_coords` is 2D)
5. Populate the sim modal with the 3D folded state (if a folded frame exists)

### Step 12 — Implement FKLD export alongside SVG

Extend the ExportModal to offer `.fkld` download in addition to the existing
SVG/ZIP. The FKLD file captures everything the SVG does (cut vs score layers)
plus topology, molecule parameters, material assignments, and structural metadata.

### Step 13 — Add multi-frame support

FOLD supports multiple "frames" — different states of the same mesh (e.g.,
crease pattern, partially folded, fully folded). Implement frame storage:

- Frame 0: flat crease+cut pattern (2D coords)
- Frame 1: target 3D surface (the goal mesh)
- Frame 2: simulated folded state (from the bar-and-hinge solver)
- Frame 3+: intermediate fold states (animation keyframes)

This enables round-tripping between design and simulation.

### Step 14 — Define FKLD stacking order for kirigami

FOLD has `faceOrders` for overlapping faces in flat-folded states. Extend for
kirigami: when molecules tuck, faces stack. Add:

```typescript
fkld:faceOrders_tuckGroup  // which molecule tuck each overlap belongs to
```

This matters for fabrication: the stacking order determines which layers are
physically accessible for adhesive or mechanical fastening.

### Step 15 — Implement material library as a FKLD resource

Create `fkld/materials.ts` with built-in architectural materials:

```typescript
const MATERIALS: MaterialDef[] = [
  { id: "bristol-250", name: "Bristol Board 250gsm", E: 4500, sigmaY: 35,
    thickness: 0.31, density: 800, bendRadius: 1.5 },
  { id: "pp-0.8", name: "Polypropylene 0.8mm", E: 1500, sigmaY: 35,
    thickness: 0.8, density: 900, bendRadius: 3.0 },
  { id: "alu-1.0", name: "Aluminum 5052-H32 1mm", E: 70000, sigmaY: 193,
    thickness: 1.0, density: 2680, bendRadius: 2.0 },
  { id: "steel-0.5", name: "Galvanized Steel 0.5mm", E: 200000, sigmaY: 250,
    thickness: 0.5, density: 7850, bendRadius: 1.5 },
  { id: "ply-3", name: "Birch Plywood 3mm", E: 12000, sigmaY: 40,
    thickness: 3.0, density: 680, bendRadius: 15.0 },
  { id: "coroplast-4", name: "Corrugated PP 4mm", E: 1200, sigmaY: 20,
    thickness: 4.0, density: 450, bendRadius: 8.0 },
]
```

Each material carries Young's modulus E (MPa), yield stress σ_y (MPa), density
(kg/m³), and minimum bend radius (mm) — all needed for structural and
fabrication feasibility checks.

### Step 16 — Implement fabrication method profiles

Create `fkld/fabrication.ts` — profiles for each cutting method:

```typescript
interface FabProfile {
  id: string
  name: string
  kerf: number            // cut width (mm)
  minFeature: number      // smallest cut/slot (mm)
  maxSheetSize: [number, number]  // mm
  supportedMaterials: string[]
  cutFileFormat: "svg" | "dxf" | "gcode"
  scoreSupported: boolean
}
```

Profiles: Cricut (current), laser cutter, CNC router, waterjet, manual (knife).

### Step 17 — Add FKLD validation layer

Create `fkld/validate.ts`. Validate a FKLD file beyond FOLD's structural
rules:

- All `fkld:edges_cutType` entries match a "C"-assigned edge
- Molecule θ and w satisfy Tachi's Eqs (1)–(4) at every vertex [T]
- Material thickness is consistent with molecule geometry (r_apex ≤ 0.4·s)
- No face area is below the fabrication minimum feature size
- Stacking order is physically consistent (no impossible overlaps)

### Step 18 — Implement FKLD diff/merge for design iteration

Create `fkld/diff.ts`. When the architect adjusts the pattern (moves a vertex,
changes a cut), compute a minimal diff against the previous FKLD state. This
enables undo/redo and version history without storing full snapshots.

### Step 19 — Test FKLD round-trip with existing AKDE patterns

Write tests in `tests/fkld/`: generate a pyramid pattern (N=4, N=6) with the
current AKDE pipeline, export to FKLD, re-import, and verify the FoldNet is
identical (vertex positions, edge assignments, molecule parameters).

### Step 20 — Test FKLD interop with external FOLD files

Download example `.fold` files from the FOLD repo (`examples/`). Import them
into AKDE via `fkldToFoldNet`. Verify that:

- Standard FOLD files load without errors (FKLD keys are simply absent)
- Edge assignments render correctly on the pattern canvas
- The sim modal can fold the mesh (even without FKLD metadata, using defaults)

---

## Part II — Generalized Geometry Engine (Steps 21–40)

Replace AKDE's single-pyramid uniform-molecule geometry with a per-edge,
per-vertex system that handles arbitrary triangulated meshes. This is the
mathematical core that all later steps build on.

### Step 21 — Implement arbitrary mesh input type

In `kirigami/model/types.ts`, add:

```typescript
interface MeshInput {
  vertices: [number, number, number][]
  faces: [number, number, number][]
  edgeOverrides?: Map<string, { assignment?: EdgeAssignment; cutType?: FkldCutType }>
}
```

This coexists with `KirigamiInputs` — the pyramid inputs remain as a special
case (backwards compatibility).

### Step 22 — Implement discrete curvature computation

Create `kirigami/model/curvature.ts`:

```typescript
function computeAngleDefect(
  vertexIdx: number,
  vertices: [number,number,number][],
  faces: [number,number,number][]
): number
```

For each interior vertex, sum the face angles incident at that vertex and
return G_v = 2π − Σθ_i. This is classical discrete differential geometry
(Gauss-Bonnet), not Tachi-specific.

### Step 23 — Classify vertices by curvature

Create `kirigami/model/curvature-classify.ts`:

```typescript
function classifyVertices(mesh: MeshInput): VertexClassification[]

type VertexClassification = {
  index: number
  angleDefect: number       // G_v (rad)
  class: "positive" | "negative" | "flat" | "boundary"
  reliefNeeded: number      // |G_v| — how much angle must be absorbed
}
```

- G_v > ε → positive curvature → needs molecule tucking [T] or material removal
- G_v < −ε → negative curvature → needs kirigami cut (dart/slit)
- |G_v| ≤ ε → flat → no relief needed
- Boundary vertex → separate handling

### Step 24 — Implement per-edge dihedral angle computation

Generalize `computeDihedralGamma` from `geometry.ts` to work on any shared edge
between two triangular faces in an arbitrary mesh, not just adjacent lateral
faces of a pyramid. Use the cross-product method already in the codebase but
parameterized by vertex positions.

Source: [LS] Eq (5) — sin γ from nodal coordinates of two adjacent faces.

### Step 25 — Implement per-edge molecule angle θ(i,j)

For each interior edge shared by two faces with a positive-curvature vertex at
one or both ends, compute:

```
θ(i,j) = portion of angle defect at vertex i allocated to edge (i,j)
```

Default allocation: uniform — θ(i,j) = G_v(i) / degree(i) for all edges
incident at vertex i. This can be overridden by the designer.

Source: [T] Lecture slide 16 — per-edge molecule parameterization.

### Step 26 — Implement per-edge molecule width w(i,j)

Solve Tachi's vector-closure constraint [T, Eq (2)] for w(i,j):

```
Σ w(i, jₙ) · [cos(Σ Θₘ), sin(Σ Θₘ)]ᵀ = [0, 0]ᵀ
```

where Θₘ = ½θ(i,jₘ₋₁) + α(i,jₘ) + ½θ(i,jₘ).

Build the constraint matrix C_w (2·N_vert rows × N_edge columns) and solve:

```
w = C_w⁺ · b + (I − C_w⁺ C_w) · w₀
```

The solution space has dimension (N_edge − 2·N_vert), which is the designer's
freedom. The vector w₀ sets the "style" — uniform w₀ gives equal-width
molecules; architecturally, the designer might want wider molecules at
structural ridges and narrower ones at visual surfaces.

Source: [T] Lecture slide 17 — two-step linear mapping.

### Step 27 — Implement molecule inequality constraints

Generalize C3–C6 from `constraints.ts` to per-edge constraints:

- **C3 (angle range):** −π < θ(i,j) < π for every molecule edge
- **C4 (non-negative width):** w(i,j) ≥ 0 for every molecule edge
- **C5 (fold overlap):** w(i,j) ≤ min(edgeLen of adjacent faces) — molecule
  must not protrude beyond the face it tucks behind
- **C6 (cut vs dihedral):** T·tan(γ(i,j)/2) ≤ s(i,j) − r(i,j) — the relief
  cut must fit the slant edge

Add Tachi's 3D conditions [T, Lecture slide 18]:

- **C7 (tuck angle):** φ(i,j) − θ(i,j)/2 ≤ π − τ'(i,j) — molecule fits
  behind the face without poking through
- **C8 (tuck depth):** w(i,j) ≤ 2·sin(τ'(i,j) − α(i,j)/2)·d'(i) — molecule
  depth doesn't exceed available space behind the vertex

### Step 28 — Implement Gaussian-curvature-to-cut mapping

For negative-curvature vertices (G_v < 0), compute the cut parameters:

```typescript
function computeDartCut(vertex: VertexClassification, mesh: MeshInput): DartCut {
  const excess = Math.abs(vertex.angleDefect)  // radians to remove
  // Choose the edge with the shallowest dihedral (least structural impact)
  // and cut radially from the vertex along that edge
  return {
    edgeIndex: bestEdge,
    angularWidth: excess,
    cutLength: edgeLengthToNextVertex,
    cutType: "dart"
  }
}
```

This is the fundamental kirigami advantage over origami: where Demaine/Tachi
need a complex tuck proxy to handle negative curvature [DT §3–4], kirigami
simply removes a wedge of material. The cut width exactly equals the angle
excess |G_v|.

### Step 29 — Implement major-cut computation for arbitrary vertices

Generalize `computeRApex` to any positive-curvature vertex (not just a single
pyramid apex). At each vertex with G_v > 0, compute the major-cut hole radius:

```
r(i) = T / sin(θ_min(i) / 2)
```

where θ_min(i) is the smallest molecule angle at vertex i. Clamp to prevent the
hole from exceeding a fraction of the shortest incident edge.

### Step 30 — Implement minor-cut computation for arbitrary edges

Generalize `computeMinorCutLength` to any molecule edge. The minor cut allows
the molecule to tuck flat without self-intersection. Use the active
"fold-reach" formula:

```
ℓ(i,j) = √((w(i,j)/2)² + r(i)²)
```

where r(i) is the major-cut radius at the vertex that the molecule tucks toward.

### Step 31 — Implement face-angle computation for arbitrary meshes

Create `kirigami/model/mesh-geometry.ts`:

```typescript
function faceAngleAtVertex(
  vertexIdx: number,
  face: [number, number, number],
  vertices: [number,number,number][]
): number
```

Returns the interior angle of `face` at `vertexIdx`, computed from the law of
cosines on the three edge lengths. This replaces the pyramid-specific `computeEta`.

### Step 32 — Implement edge-length and face-area utilities

Add to `mesh-geometry.ts`:

```typescript
function edgeLength(a: [number,number,number], b: [number,number,number]): number
function faceArea(face: [number,number,number], vertices: ...): number
function faceNormal(face: [number,number,number], vertices: ...): [number,number,number]
```

These are used everywhere: curvature, dihedral angles, structural analysis,
pattern layout.

### Step 33 — Implement adjacency data structures

Create `kirigami/model/adjacency.ts`:

```typescript
interface MeshAdjacency {
  vertexToFaces: Map<number, number[]>
  vertexToEdges: Map<number, [number, number][]>
  edgeToFaces: Map<string, number[]>
  faceToFaces: Map<number, number[]>     // faces sharing an edge
  vertexValence: Map<number, number>     // number of edges at each vertex
  boundaryVertices: Set<number>
  boundaryEdges: Set<string>
}
function buildAdjacency(mesh: MeshInput): MeshAdjacency
```

This is the foundational structure for all traversals: unfolding, constraint
propagation, structural analysis, cut placement.

### Step 34 — Verify generalized engine reproduces pyramid results

Write tests: construct a regular N-gon pyramid as a `MeshInput`, run the
generalized per-edge geometry engine, and assert that θ(i,j), w(i,j), r, ℓ
match the current uniform `KirigamiDerived` values to within floating-point
tolerance. This is the regression gate before proceeding.

### Step 35 — Implement constraint Jacobian for the generalized system

Build the constraint Jacobian C (combining Eqs (1)–(2) and inequalities) for
the full per-edge system. This matrix is used in:

- Step 26 (solving for w via pseudo-inverse)
- Step 73 (sensitivity analysis: how does changing one θ affect all w's?)
- Step 78 (optimization: finding the pattern that best fits a target surface)

Source: [T] Lecture slide 40 — C·Ẋ = 0, where C = [∂G/∂X; ∂F/∂X; ∂H/∂X].

### Step 36 — Implement solution-space exploration

The under-determined system (N_edge > 2·N_vert) has a multi-dimensional
solution space [T, Lecture slide 38]. Implement:

```typescript
function exploreSolutionSpace(
  Cw: Matrix,       // constraint matrix
  b: Vector,        // RHS
  w0: Vector,       // initial guess / style vector
  direction: Vector  // exploration direction in null space
): Vector            // new w satisfying constraints
```

The architect drags a slider or control point; the system moves along the
null space of C_w to find a new valid w while keeping all constraints satisfied.

### Step 37 — Implement mesh subdivision for density control

Create `kirigami/model/subdivide.ts`. Liu [LS, Figure 9] shows that
tessellation density is a design parameter — finer mesh = smaller panels but
more cuts, coarser mesh = larger panels but stiffer.

Implement Loop subdivision and √3-subdivision for triangular meshes. Each
subdivision doubles the face count and introduces new vertices that inherit
curvature classification.

### Step 38 — Implement mesh simplification (edge collapse)

Create `kirigami/model/simplify.ts`. The inverse of subdivision — merge
vertices to reduce complexity. Use Hoppe's edge-collapse with quadric error
metrics.

For kirigami: when collapsing an edge, merge the molecule assignments according
to Maekawa's theorem (M − V = ±2) [T, Lecture slide 39] — the collapsed vertex
must still have a valid mountain/valley pattern.

### Step 39 — Implement boundary handling

Architectural surfaces are rarely closed — a roof has edges, a facade has
corners. Implement boundary-vertex handling:

- Boundary vertices have angle sum < 2π by definition (open fan, not closed)
- No molecule is placed at boundary vertices unless the architect wants a
  folded edge (e.g., a drip edge on a roof)
- Boundary edges get "B" assignment with optional reinforcement tabs

### Step 40 — Integration test: freeform mesh through the geometry engine

Load a non-trivial mesh (e.g., a saddle surface with both positive and negative
curvature) through the full pipeline: curvature classification → molecule
allocation → cut placement → constraint solving → per-edge θ, w, r, ℓ.

Verify: angle closure at every vertex, vector closure at every vertex, all
inequality constraints satisfied, all cuts correctly typed.

---

## Part III — Inverse Process: 3D Target → 2D Pattern (Steps 41–60)

Given an architectural target surface, generate the 2D kirigami crease+cut
pattern that folds into it. This is Liu's "inverse process" [LS §3.1],
powered by Tachi's molecule parameterization [T] and extended with
kirigami-specific cut placement.

### Step 41 — Implement 3D mesh import (OBJ/STL)

Create `kirigami/model/mesh-import.ts`. Parse Wavefront OBJ and binary/ASCII
STL files into `MeshInput`. Handle:

- Triangle meshes (native)
- Quad meshes (triangulate with shortest-diagonal heuristic)
- N-gon meshes (fan triangulation from centroid)
- Normals (use for consistent face orientation)

This is the architect's entry point: they model in Rhino/Blender/SketchUp,
export OBJ, and import into AKDE.

### Step 42 — Implement target-surface preprocessing

Create `kirigami/model/preprocess.ts`:

1. **Orient faces** consistently (all normals outward)
2. **Merge duplicate vertices** (weld by proximity threshold)
3. **Remove degenerate faces** (zero area, duplicate vertices)
4. **Compute bounding box** and center at origin
5. **Scale** to working units (mm) based on `fkld:meta_architecture.scaleMeters`

### Step 43 — Implement curvature-aware remeshing

Not all meshes from CAD software have good triangle quality. Remesh the target
surface to:

- Make all triangles close to equilateral (good for molecule layout)
- Align edges with principal curvature directions (structural alignment)
- Refine in high-curvature regions (more molecules where the surface bends more)
- Coarsen in flat regions (fewer cuts, larger panels)

Use centroidal Voronoi tessellation (CVT) or isotropic remeshing. This is
standard computational geometry, not origami-specific.

### Step 44 — Implement the vertex-unfolding step

For each vertex, unfold its one-ring neighborhood (the fan of faces around it)
into the plane. This is Tachi's local unfolding [T, Lecture slide 16] and Liu's
Figure 1 [LS]:

1. Pick a reference face, lay it flat
2. For each adjacent face (in order around the vertex), rotate it about the
   shared edge until it lies in the same plane
3. The gap (or overlap) between the first and last face is the angle defect G_v

### Step 45 — Implement molecule insertion between unfolded faces

At each interior edge between two adjacent unfolded faces, insert the symmetric
trapezoid edge molecule [LS §3.1, T Lecture slide 16]:

- The trapezoid has angular width θ(i,j) and chord width w(i,j) from Step 25–26
- The valley crease runs along the perpendicular bisector of the molecule
- The two end-legs (slant sides) connect to the adjacent faces as mountain creases

This is the 2D flat pattern of a single molecule — the same geometry AKDE
currently generates in `pattern.ts` `cornerMoleculeTrapezoid()`, but now
parameterized per edge.

### Step 46 — Implement cut insertion at vertices

At each vertex, insert cuts based on curvature classification (Step 23):

**Positive curvature (G_v > 0):**
- Major cut: a 2k-gon hole of radius r(i) centered at the vertex, where k is
  the vertex valence. The hole allows the molecules to tuck without colliding.
- This replaces the current single-apex 2N-gon in `pattern.ts`.

**Negative curvature (G_v < 0):**
- Dart cut: a wedge of angular width |G_v| is removed from the vertex fan.
  The dart closes when the surface folds into the target shape, bringing the
  excess material together.
- Choose the dart location along the edge with the largest dihedral angle
  (the sharpest fold absorbs the dart most naturally).

**Flat (G_v ≈ 0):**
- No vertex cut needed. The molecules at incident edges handle any residual
  curvature from numerical imprecision.

### Step 47 — Implement global unfolding (BFS tree)

Create `kirigami/model/unfold.ts`. Unfold the entire mesh to a single flat
sheet by breadth-first traversal:

1. Start from a seed face (user-selected or automatic: largest face, or face
   closest to the centroid)
2. BFS across edges, unfolding each face into the plane by rotating about the
   shared edge
3. At each step, check for overlaps between the newly placed face and all
   previously placed faces
4. If overlap detected: mark that edge as a **seam cut** (`fkld:edges_cutType = "seam"`)
   and do not unfold across it — the surface will be split there

The seam cuts are additional kirigami cuts beyond the geometric ones (major/minor/dart).
They exist purely because the surface can't unfold to a plane without self-intersection.

### Step 48 — Implement seam optimization

The BFS seed face and traversal order affect where seams fall. Implement
optimization:

1. Try multiple seed faces (sample 10–20 candidates)
2. For each, run the BFS unfolding and count seam cuts
3. Choose the seed that minimizes total seam cut length
4. Optionally: use simulated annealing to swap seam locations and minimize
   a combined objective (total cut length + structural impact)

Source: related to Sheffer (2002) and Wang (2004) from [LS] references, but
with kirigami-specific objectives (structural integrity, not just distortion).

### Step 49 — Implement multi-sheet layout

If the surface requires seam cuts (Step 47), it splits into multiple connected
components (panels). Each panel is a separate flat piece:

1. Identify connected components after seam cuts
2. Assign each to a fabrication sheet (respecting max sheet size from the
   fabrication profile, Step 16)
3. Add assembly alignment features:
   - **Tabs:** small rectangular flaps at seam edges for glue/rivet overlap
   - **Registration marks:** alignment holes or notches for positioning
   - **Panel IDs:** numbered labels engraved/printed on each panel

### Step 50 — Implement nesting (2D bin packing)

Pack all panels onto standard sheet sizes to minimize material waste:

1. Compute the convex hull of each panel
2. Use a bottom-left-fit with rotation (0°, 90°, 180°, 270°) heuristic
3. Respect kerf width (fabrication profile, Step 16)
4. Report material utilization percentage

This is standard CNC nesting, not origami-specific.

### Step 51 — Implement pattern-net SVG generation for arbitrary meshes

Extend `pattern.ts` `buildPatternNet` to handle the output of Steps 44–50:
multi-face layouts with per-edge molecules, heterogeneous cuts, assembly tabs,
and panel boundaries. The current single-fan SVG becomes a special case.

### Step 52 — Implement valley-crease routing

For each molecule, the valley crease connects the midpoint of the inner chord
to `foldPt` (the minor-cut convergence point). In the generalized case,
valley creases from multiple molecules at one vertex must not intersect:

1. Route valley creases radially outward from the vertex center
2. Check for intersections between adjacent molecule valleys
3. If intersection: adjust foldPt positions to resolve (shorten one or both)

### Step 53 — Implement cut-layer and score-layer separation for arbitrary patterns

Extend `svg-export.ts` to handle the generalized pattern:

- **Cut layer (black):** boundary outline + all cut edges (major, minor, dart, seam,
  auxetic, vent) with correct cut subtypes for fabrication
- **Score layer (blue):** all fold edges (mountain + valley) + assembly alignment
  marks
- **Engrave layer (red):** panel IDs, fold direction arrows, assembly instructions

Three layers instead of two — architectural fabrication often needs engraving.

### Step 54 — Implement Enneper surface test case

Reproduce Liu's Enneper surface example [LS, Figure 5]:

1. Generate an Enneper surface mesh (parametric: x = u − u³/3 + uv², etc.)
2. Discretize to a triangular mesh
3. Run the inverse process (Steps 41–53)
4. Compare the output pattern with Liu's published result
5. Fold the pattern in simulation and verify it approximates the Enneper surface

This is the first doubly-curved test — the surface has both positive and
negative curvature regions, exercising both molecule tucking and dart cuts.

### Step 55 — Implement polyhedral approximation quality metric

After unfolding and pattern generation, measure how well the pattern
approximates the target surface:

```typescript
function approximationError(
  targetMesh: MeshInput,
  patternNet: PatternNet,
  foldedState: FoldNet   // from simulation
): { hausdorff: number; rms: number; maxAngleError: number }
```

- **Hausdorff distance:** max distance from any point on the target to the
  nearest point on the folded pattern
- **RMS error:** average distance across all vertices
- **Max angle error:** largest dihedral angle deviation between target and folded

### Step 56 — Implement inverse-process UI workflow

Create a new view: `InverseSurfacePanel`:

1. **Import button** → load OBJ/STL (Step 41)
2. **3D preview** → show the target mesh with curvature coloring (red = positive,
   blue = negative, white = flat)
3. **Density slider** → control remeshing density (Step 43)
4. **Generate pattern** → run the inverse process (Steps 44–52)
5. **2D preview** → show the flat pattern on the PatternCanvas
6. **Simulate** → fold in SimModal and overlay on target for comparison

### Step 57 — Implement architectural shape primitives

Pre-built parametric shapes for common architectural forms:

```typescript
type ArchPrimitive =
  | { type: "vault"; span: number; rise: number; length: number }
  | { type: "dome"; radius: number; height: number; segments: number }
  | { type: "hyperpar"; spanX: number; spanY: number; rise: number; sag: number }
  | { type: "cone"; radius: number; height: number; aperture: number }
  | { type: "saddle"; span: number; curvature: number }
  | { type: "freeform"; controlPoints: [number,number,number][] }
```

Each generates a `MeshInput` directly, so the architect doesn't need external
CAD software for standard shapes.

### Step 58 — Implement parametric roof generator

For the most common architectural use case: a roof surface defined by:

- Building footprint (rectangle, L-shape, polygon)
- Ridge line(s)
- Eave height and ridge height
- Overhang distance

Generate the roof mesh, run the inverse process, output the kirigami pattern.
This is the end-to-end demo for "architect sketches a roof → gets a cut file."

### Step 59 — Implement edge-molecule style controls

Expose the null-space freedom (Step 36) as design controls:

- **Uniform:** all molecules equal width (default)
- **Structural:** wider molecules at load-bearing ridges, narrower at valleys
- **Visual:** molecule width follows a designer-specified gradient (e.g., wider
  at the top, tapering to narrow at the base)
- **Ventilation:** alternate wide (opaque) and narrow (transparent when folded)
  molecules for airflow control

These are architecture-specific design intents that origami tools don't offer.

### Step 60 — Integration test: full inverse process

Load an architectural mesh (saddle roof, 50 faces), run the complete inverse
process, verify:

1. All vertices correctly classified (positive/negative/flat/boundary)
2. All molecule parameters satisfy Eqs (1)–(4) and C3–C8
3. All cuts correctly placed and typed
4. Pattern unfolds without overlaps (or with minimal seam cuts)
5. Export to FKLD → re-import → identical FoldNet
6. Simulation folds to within 5% Hausdorff distance of target

---

## Part IV — Forward Process: Simulation + Structural Analysis (Steps 61–80)

The forward process validates and refines the pattern: does it fold correctly,
does it hold up under loads, can it be fabricated? This is Liu's forward
process [LS §3.2] built on AKDE's existing solver.

### Step 61 — Extend bar-and-hinge model for arbitrary meshes

Generalize `model.ts` (the struct-of-arrays physics representation) to handle
FoldNets from the inverse process (variable vertex count, variable edge count,
heterogeneous assignments). Currently it's hardcoded for N-gon pyramids.

### Step 62 — Implement per-edge fold-angle targets

Replace the uniform `foldMountain` / `foldValley` parameters in the solver
with per-edge target angles computed from the target mesh dihedral angles:

```typescript
edges_targetFoldAngle: number[]  // one per FoldNetEdge
```

Mountain creases target π − γ(i,j); valley creases target −(π − γ(i,j));
facet creases target 0 (flat); cuts have no target.

### Step 63 — Implement fold-sequence planning

Not all edges can fold simultaneously without self-intersection. Implement a
fold-sequence planner:

1. Compute the dependency graph: which folds must happen before others
   (a molecule can't tuck until its adjacent faces are partially raised)
2. Group folds into phases (similar to Liu's sequential folding [LS §3.2])
3. Within each phase, all folds proceed simultaneously
4. Between phases, the solver reaches equilibrium before advancing

This replaces the current simple `foldPercent` ramp with a multi-phase schedule.

### Step 64 — Implement self-intersection detection

During simulation, check for face-face penetrations:

1. Broad phase: bounding-box overlap test (AABB tree)
2. Narrow phase: triangle-triangle intersection (Moller's algorithm)
3. If intersection: flag the offending faces and suggest remediation
   (adjust fold sequence, add clearance cuts, increase material flexibility)

This is critical for architectural kirigami — at full scale, self-intersections
mean panels physically collide during deployment.

### Step 65 — Implement gravity loading

Add gravitational force to the solver:

```typescript
F_gravity[i] = [0, 0, -m_i * g]
```

where m_i is the lumped mass at vertex i (face area × thickness × density / 3,
summed over incident faces). This simulates how the folded structure sags under
its own weight — essential for architectural scale.

### Step 66 — Implement support conditions

Allow the architect to pin vertices as structural supports:

- **Fixed:** vertex position is constrained (bolted to a foundation)
- **Roller:** vertex moves along a line or plane (sliding connection)
- **Spring:** vertex is attached to ground by a spring (elastic support)

Store in FKLD: `fkld:vertices_support: ("free"|"fixed"|"roller"|"spring")[]`

### Step 67 — Implement external load application

Beyond gravity, add:

- **Distributed load:** force per unit area on selected faces (snow, wind pressure)
- **Point load:** force at a specific vertex (hanging load, attachment point)
- **Thermal load:** temperature change causing expansion/contraction (for SMA
  actuation [LS §4.3])

### Step 68 — Implement stress/strain extraction

After equilibrium under loads, extract:

```typescript
interface StructuralResult {
  edgeAxialStress: number[]     // σ = F/A for each beam
  edgeAxialStrain: number[]     // ε = ΔL/L₀
  creaseBendingMoment: number[] // M = k_crease · (θ − θ_target)
  faceVonMises: number[]        // von Mises equivalent stress per face
  maxStress: number
  maxStrain: number
  safetyFactor: number          // σ_yield / σ_max
}
```

Color-code the 3D model by stress level: green (safe) → yellow (marginal) →
red (overstressed).

### Step 69 — Implement structural adequacy check

Compare extracted stresses against material yield stress:

```typescript
function checkStructural(result: StructuralResult, material: MaterialDef): {
  adequate: boolean
  failedEdges: number[]       // edges exceeding yield
  failedFaces: number[]       // faces exceeding yield
  recommendations: string[]   // "Increase thickness to X mm", "Add diagonal bracing", etc.
}
```

### Step 70 — Implement deflection check

Compute maximum vertical deflection under load and compare to architectural
span/deflection limits (typically L/240 for roofs, L/360 for floors):

```typescript
function checkDeflection(
  vertices: Vec3[],           // original (unloaded) positions
  displaced: Vec3[],          // after loading
  span: number                // structural span (mm)
): { maxDeflection: number; ratio: number; acceptable: boolean }
```

### Step 71 — Implement hinge-stiffness computation

Each fold line is a hinge with stiffness K that depends on material,
thickness, and cut geometry [LS §3.2, Eq (6): Kd = Fx]:

```typescript
function hingeStiffness(
  material: MaterialDef,
  foldLength: number,        // length of the score line (mm)
  adjacentCutLength: number, // total cut length near this hinge
  method: "score" | "kerf" | "living"
): number  // K in N·mm/rad
```

Longer adjacent cuts weaken the hinge (Liu's observation: "increase of total
cut length decreases K"). This feeds into the structural model as crease
stiffness.

### Step 72 — Implement eigenvalue stability analysis

Compute the tangent stiffness matrix and find the lowest eigenvalue:

- Positive → structure is stable
- Zero → mechanism (can still deploy but won't hold load)
- Negative → buckling (structure collapses under load)

For kirigami architecture, the structure should be stable in the deployed state
and a mechanism in the folded/deploying state.

### Step 73 — Implement sensitivity analysis

How does each design parameter affect structural performance?

```typescript
function sensitivity(
  parameter: "thickness" | "meshDensity" | "moleculeWidth" | "cutLength",
  currentValue: number,
  structuralResult: StructuralResult
): { dStress_dParam: number; dDeflection_dParam: number }
```

This tells the architect: "Increasing thickness by 1mm reduces max stress by
X MPa and deflection by Y mm."

### Step 74 — Implement material-aware fold-angle limits

Each material has a maximum fold angle before yielding or fracturing:

```typescript
function maxFoldAngle(material: MaterialDef, scoreDepth: number): number {
  // Bending strain at outer fiber: ε = T / (2·R_bend)
  // R_bend = T / (2·sin(ρ/2)) for fold angle ρ
  // Yield: ε_yield = σ_y / E
  return 2 * Math.asin(material.E * material.thickness / (4 * material.sigmaY * bendRadius))
}
```

Flag any fold in the pattern that exceeds this limit for the assigned material.

### Step 75 — Implement the feedback loop

Connect forward analysis back to the inverse process:

1. Run forward simulation + structural analysis
2. Identify failures (overstress, excessive deflection, self-intersection,
   fold angle exceeded)
3. Automatically suggest pattern adjustments:
   - Overstress at edge → widen molecule (increase w) or add reinforcement
   - Excessive deflection → increase mesh density (add ribs)
   - Self-intersection → add clearance cut or adjust fold sequence
   - Fold angle exceeded → use thinner material or add a relief cut
4. Apply adjustments and re-run (iterate until all checks pass)

Source: [LS] Figure 6 — the reciprocal feedback loop between computational
modeling, FEA, and dynamic simulation.

### Step 76 — Implement deployment simulation

Simulate the full deployment sequence: flat pattern → intermediate states →
fully deployed 3D form. Track:

- Required deployment force at each phase
- Clearance envelope (bounding box of the structure during deployment)
- Lockout angle (the fold angle at which the structure locks into its final shape)

This is critical for architecture: the structure must deploy without hitting
the ground, walls, or other structures.

### Step 77 — Implement GPU solver for arbitrary meshes

Extend `gpu/gpu-solver.ts` and `gpu/shaders.ts` to handle variable-size meshes
(currently hardcoded for N-gon pyramid topology). Use dynamic texture sizes
based on vertex/edge/face counts.

### Step 78 — Implement target-surface fitting optimization

Instead of just unfolding a given mesh, allow the architect to specify a
**target surface** and optimize the pattern to match it:

```typescript
function optimizePattern(
  targetSurface: MeshInput,
  initialPattern: FkldFile,
  constraints: ConstraintSet
): FkldFile {
  // Minimize Hausdorff distance between folded pattern and target
  // subject to: Eqs (1)-(4), C3-C8, material limits, fabrication constraints
  // Using: gradient descent on molecule parameters θ(i,j), w(i,j)
}
```

### Step 79 — Implement real-time interactive form-finding

The architect drags control points on the 3D surface; the system adjusts
molecule parameters in real-time to maintain all constraints:

```
User drags vertex → ΔX₀
System projects: ΔX = −C⁺r + (I − C⁺C)ΔX₀
Update pattern + 2D layout + 3D sim simultaneously
```

Source: [T] Lecture slide 40 — freeform origami perturbation, adapted for
kirigami (cuts inject extra DOF, making the system more responsive).

### Step 80 — Integration test: forward process with structural validation

Load the saddle-roof pattern from Step 60. Apply:

1. Gravity (self-weight of 1mm aluminum panels)
2. Snow load (0.5 kN/m²)
3. Wind uplift (0.3 kN/m²)

Verify:
- Structure folds to target shape (Hausdorff < 5%)
- Safety factor > 1.5 under combined loading
- Max deflection < span/240
- No fold angle exceeds material limit
- FKLD file captures all analysis results

---

## Part V — Architectural Integration (Steps 81–100)

Features specific to architectural practice: site analysis, environmental
performance, building-code compliance, and design documentation.

### Step 81 — Implement site context import

Accept a site model:

- **Terrain mesh** (OBJ/STL) — the ground surface
- **Boundary polygon** — the building footprint
- **Orientation** — north arrow (for solar analysis)
- **Surrounding obstructions** — buildings/trees that cast shadows

Store in `fkld:meta_architecture.siteLocation` and a companion site-context
FKLD frame.

### Step 82 — Implement solar analysis

For a given site location and date/time:

1. Compute sun position (azimuth, altitude) using standard solar geometry
2. Ray-cast from sun direction through the kirigami surface
3. Compute shadow pattern on the ground plane
4. Compute solar heat gain through openings (cut voids, molecule gaps)

Show a heatmap overlay on the 3D model: red = direct sun, blue = shade.

### Step 83 — Implement ventilation analysis

Kirigami cuts create openings. Quantify:

- **Porosity:** ratio of cut area to total surface area (per face)
- **Effective open area:** how much the cuts open when folded (depends on
  fold angle and cut type)
- **Airflow direction:** normal to each opening, relative to prevailing wind

Visualize airflow paths through the structure.

### Step 84 — Implement rainwater management

For roof applications:

1. Compute the drainage pattern (water flows downhill along face surfaces)
2. Identify valleys (convergence lines) and ridges (divergence lines)
3. Check that molecules at valleys don't trap water (tuck direction matters)
4. Compute gutter locations (low edges of the roof boundary)
5. Size drainage openings (kirigami cuts can serve as weep holes)

### Step 85 — Implement acoustic analysis (simplified)

The folded surface geometry affects sound reflection/absorption:

- Compute the solid angle subtended by each face from listener positions
- Estimate reverberation time (Sabine's formula with effective absorption
  coefficients for the material)
- Map reflection patterns for key source/listener pairs

### Step 86 — Implement daylighting analysis

For interior spaces under a kirigami roof/canopy:

1. Model direct sunlight penetration through cuts
2. Estimate diffuse daylight (sky dome integration through openings)
3. Compute daylight factor at grid points on the floor plane
4. Check against building code minimums (typically 2% daylight factor)

### Step 87 — Implement thermal performance estimation

Compute U-value (thermal transmittance) of the kirigami surface:

- Solid panels: U = 1 / (R_si + T/k + R_se) where k is thermal conductivity
- Openings (cuts): U = ∞ (free air)
- Effective U of the surface: weighted average by area

Check against building energy code requirements.

### Step 88 — Implement structural connection details

At assembly seam cuts, design the physical connections:

- **Tab-and-slot:** one panel has a tab, the adjacent panel has a slot. Computed
  from material thickness and joint strength requirements.
- **Rivet pattern:** spacing and diameter for sheet-metal rivets
- **Bolt pattern:** hole diameter and edge distance for bolted connections
- **Adhesive joint:** overlap width and bond area for structural adhesives
- **Interlocking:** puzzle-piece edges that snap together (laser-cut specific)

Generate the connection geometry as part of the cut pattern.

### Step 89 — Implement foundation/support design

Where the kirigami structure meets the ground or an existing building:

1. Compute reaction forces at support points (from structural analysis, Step 68)
2. Size foundation pads or anchor bolts
3. Generate base-plate geometry (additional cut pattern for the base connection)
4. Check bearing capacity (reaction force / pad area < allowable soil pressure)

### Step 90 — Implement design documentation generator

Produce architectural drawings from the FKLD file:

- **Plan view:** top-down projection with panel IDs and dimensions
- **Elevations:** front/side/rear views with heights annotated
- **Sections:** cut-through views showing the fold geometry
- **Detail views:** zoomed-in views of connections, molecules, cuts
- **Material schedule:** table of panel areas, material types, quantities
- **Assembly sequence:** numbered steps with diagrams

Output as SVG (for further editing in Illustrator/Inkscape) or PDF.

### Step 91 — Implement BIM export (IFC)

Export the folded 3D structure as an IFC file for import into BIM software
(Revit, ArchiCAD). Map:

- Each face → IfcPlate
- Each fold → IfcMechanicalFastener (hinge)
- Each cut → IfcOpening
- Material assignments → IfcMaterial
- Structural results → IfcStructuralAnalysisModel

### Step 92 — Implement cost estimation

From the material schedule and fabrication profile:

```typescript
function estimateCost(fkld: FkldFile, fabrication: FabProfile): {
  materialCost: number     // sheet material × unit cost
  cuttingCost: number      // cut length × cost per meter
  scoringCost: number      // score length × cost per meter
  assemblyCost: number     // number of connections × cost per joint
  wasteCost: number        // unused material after nesting
  totalCost: number
}
```

### Step 93 — Implement design variant comparison

Allow the architect to compare multiple design options side by side:

- Same target surface with different mesh densities
- Same surface with different materials
- Different cut strategies (minimal cuts vs. generous ventilation)
- Different molecule styles (uniform vs. structural vs. visual)

Display a comparison table with: cost, weight, max stress, deflection,
porosity, daylight factor, material utilization.

### Step 94 — Implement responsive/adaptive kirigami modules

From Liu [LS §4.3]: kirigami modules that respond to environmental stimuli.
For architectural applications:

1. **Sun-tracking louvers:** molecules fold to shade interior when sun is high,
   open for daylight when sun is low. Fold angle = f(solar altitude).
2. **Temperature-responsive vents:** SMA springs actuate molecules to open vents
   when temperature exceeds threshold (Liu's 30°C → fold, <15°C → unfold).
3. **Rain shutters:** molecules close when moisture is detected.

Define actuation zones on the FKLD model:

```typescript
fkld:faces_actuationZone: number[]       // zone ID per face
fkld:meta_actuation: ActuationZone[]     // zone definitions with trigger + response
```

### Step 95 — Implement programmable fold-angle mapping

Map sensor inputs to fold angles using Liu's gradient-based algorithm [LS §4.3]:

```
V(i) = stimulus(i) / (σ₁ + σ₂ + σ₃)
```

where σ₁, σ₂, σ₃ are fold angles of the three hinges adjacent to face i.
Build a tree from local maximum → children, propagate fold angles from root
to leaves until distributed consensus.

### Step 96 — Implement scale-aware design rules

Architecture operates at scales where paper origami rules break down:

- **Panel weight:** at 1m panel size in 1mm aluminum, self-weight is ~2.7 kg/m².
  Fold forces must exceed gravity.
- **Thermal expansion:** at 5m span in steel, ΔT = 40°C causes ~2.4mm expansion.
  Molecule gaps must accommodate this.
- **Fabrication tolerance:** CNC kerf = 0.2mm, laser kerf = 0.1mm, waterjet
  kerf = 0.8mm. Molecule width must exceed kerf.
- **Assembly tolerance:** human assembly ±2mm. Tab geometry must be forgiving.

Implement these as per-scale validation rules that flag designs outside
practical limits.

### Step 97 — Implement deployability analysis

For structures that deploy from flat (e.g., emergency shelters, event canopies):

1. Compute the flat-packed volume (folded pattern bounding box × thickness
   × number of layers at thickest stack)
2. Compute deployment time estimate (number of fold phases × time per phase)
3. Compute maximum deployment force (sum of hinge stiffness × fold angle change)
4. Check that deployment is possible with available labor (1 person? 4 people?
   crane required?)

### Step 98 — Implement kirigami pattern catalog

A library of verified architectural kirigami patterns for common applications:

- **Barrel vault** (cylindrical) — Miura-ori based, 1-DOF deployment
- **Dome** (spherical) — Ron Resch based, multi-DOF
- **Hyperbolic paraboloid roof** — hybrid molecule + dart pattern
- **Folding partition** — accordion kirigami, flat storage
- **Canopy** — single-sheet, cable-supported
- **Facade panel** — auxetic, environment-responsive

Each catalog entry is a FKLD file with pre-validated structural and
fabrication parameters.

### Step 99 — Implement design-rule checker (DRC)

Before export, run a comprehensive check:

1. All constraints C1–C8 satisfied
2. All fold angles within material limits
3. All cuts exceed fabrication minimum feature size
4. All panels fit on available sheet sizes
5. All connections are structurally adequate
6. Drainage is viable (no trapped water)
7. Deflection within code limits
8. Safety factor adequate
9. Cost within budget (if budget specified)
10. Assembly sequence is physically possible (no step requires impossible reach)

Red/yellow/green summary. No export until all reds are resolved.

### Step 100 — Integration test: full architectural workflow

End-to-end test:

1. Import a site context (terrain + footprint + north arrow)
2. Generate a hyperbolic-paraboloid roof mesh (Step 57)
3. Run inverse process → kirigami pattern (Steps 41–60)
4. Run forward process → structural validation (Steps 61–80)
5. Run environmental analysis (solar, ventilation, drainage)
6. Export FKLD + DXF + assembly drawings
7. Verify all DRC checks pass
8. Compare total cost for 1mm aluminum vs. 3mm plywood

---

## Part VI — Fabrication Pipeline + Digital Twin (Steps 101–120)

The final mile: from validated FKLD to physical artifact, then from physical
artifact back to the digital model.

### Step 101 — Implement DXF export

Create `kirigami/model/dxf-export.ts`. DXF is the standard for CNC/laser/waterjet:

- Cut layer → DXF layer "CUT" (continuous linetype)
- Score layer → DXF layer "SCORE" (dashed linetype)
- Engrave layer → DXF layer "ENGRAVE"
- Panel IDs → DXF layer "TEXT" (MTEXT entities)
- Registration marks → DXF layer "REGISTRATION"
- Assembly tabs → DXF layer "CUT" (same as boundary cuts)

Use DXF R12 format for maximum compatibility with industrial controllers.

### Step 102 — Implement G-code export

For CNC routers and 3-axis mills:

- Convert cut paths to G-code toolpaths (G0 rapid, G1 linear cut)
- Add lead-in/lead-out moves at cut start/end
- Set feed rates based on material and bit diameter
- Handle tabs (small uncut bridges to hold panels in place during cutting)
- Score lines → shallow V-groove pass (partial-depth cut)

### Step 103 — Implement kerf compensation

Cutting removes material (kerf width). Compensate:

- Offset cut paths outward by kerf/2 for exterior cuts
- Offset cut paths inward by kerf/2 for interior cuts (holes)
- Adjust molecule width w(i,j) to account for material loss at the fold

Store kerf-compensated geometry as a separate FKLD frame.

### Step 104 — Implement score-line depth optimization

Score lines weaken the material to create a hinge. The score depth determines
hinge stiffness:

- Too shallow → hinge is too stiff to fold (requires excessive force)
- Too deep → hinge is too weak (fractures under load)
- Optimal: σ_bend at outer fiber = 80% of σ_yield when fully folded

Compute optimal score depth per fold line based on the target fold angle and
material properties.

### Step 105 — Implement living-hinge design for rigid materials

For materials that can't score (e.g., plywood, acetal):

- Generate a lattice-hinge pattern (parallel slits across the fold line)
- Slit length, spacing, and number-of-rows determine hinge flexibility
- This is standard kerf-bending — compute parameters from material E and T

The lattice hinge slits become additional "C" edges in the FKLD file with
`fkld:edges_cutType = "auxetic"`.

### Step 106 — Implement assembly instruction generator

From the fold sequence (Step 63) and connection details (Step 88):

1. Number all panels in assembly order
2. For each assembly step: which panels to join, which folds to make, which
   fasteners to use
3. Generate instruction sheets with:
   - Isometric views of each step
   - Highlighted active panels and joints
   - Required tools
   - Estimated time per step

Output as SVG/PDF (vector graphics, printable at any size).

### Step 107 — Implement QR-code panel tagging

Engrave a unique QR code on each panel that links to:

- Digital twin URL (the FKLD file hosted online)
- Panel ID and assembly position
- Material and fold-angle specifications
- Assembly instructions for that specific panel

### Step 108 — Implement prototype-scale testing workflow

For the architect's physical prototyping cycle:

1. Export pattern at reduced scale (e.g., 1:10) for desktop prototyping
2. Cut on Cricut/laser cutter
3. Fold and photograph
4. Import photo into AKDE for visual comparison with the 3D model
5. Note discrepancies and adjust pattern

Integrate with the existing Cricut SVG export (enhanced with scale options).

### Step 109 — Implement photogrammetry-based validation

After building a physical prototype:

1. Take photos from multiple angles
2. Use browser-based photogrammetry (or import point cloud from external tool)
3. Align the scanned geometry with the target mesh
4. Compute deviation map: where does the real structure differ from the design?
5. Feed deviations back into the pattern generator as corrections

### Step 110 — Implement IoT sensor integration

For responsive kirigami structures [LS §4.3]:

1. Define sensor attachment points in FKLD: `fkld:vertices_sensorType`
2. Implement WebSocket server in the AKDE web app
3. Receive sensor data (temperature, light, humidity, strain) from ESP32/Arduino
   via WiFi
4. Map sensor readings to fold-angle adjustments (Step 95)
5. Send actuation commands back to servo motors / SMA controllers

### Step 111 — Implement digital-twin real-time sync

Liu's cyber-physical coupling [LS, Figure 20]:

1. Physical structure has sensors at key vertices
2. AKDE receives sensor data in real-time
3. GPU solver runs with sensor-measured fold angles as boundary conditions
4. 3D visualization shows the current state of the physical structure
5. Predicted vs. actual comparison identifies structural issues (drift, fatigue,
   damage)

### Step 112 — Implement structural health monitoring

Over the life of the structure:

1. Track fold-angle drift over time (hinges creep under sustained load)
2. Detect anomalies (sudden angle change = possible hinge failure)
3. Predict remaining service life based on fatigue curves
4. Alert the architect/owner when maintenance is needed

### Step 113 — Implement weather-responsive simulation

Connect to weather API for the building's site location:

1. Fetch current temperature, wind speed/direction, solar irradiance
2. Update the structural simulation with current loads
3. Update the solar/ventilation analysis with current conditions
4. If the structure is responsive (Step 94), compute the optimal fold state
   for current weather

### Step 114 — Implement multi-material panel support

Architectural kirigami may combine materials within one structure:

- Aluminum panels at load-bearing zones
- Polycarbonate at daylight zones (transparent)
- Perforated panels at ventilation zones

Implement per-face material assignment in the FKLD file and update all
analyses (structural, thermal, optical) to use the correct properties per face.

### Step 115 — Implement connection-detail library

Standard architectural connection types as parametric templates:

- **Standing seam:** folded-edge lock (sheet metal roofing)
- **Clip system:** concealed clip at fold lines (facade panels)
- **Piano hinge:** continuous hinge at mountain creases (heavy-duty)
- **Living hinge:** scored or lattice hinge (light-duty)
- **Zip tie:** through-hole tie at seam edges (temporary/prototype)
- **Bolted flange:** L-angle brackets at panel edges (structural)

Each generates the required cut/hole geometry and adds it to the FKLD pattern.

### Step 116 — Implement full-scale fabrication planning

For structures too large for a single sheet:

1. Partition the pattern into panels that fit the cutting bed
2. Add splice connections between panels
3. Plan the cutting sequence (which panels to cut first)
4. Estimate total cutting time and machine usage
5. Generate a shop drawing set (panel layout per sheet, cut sequence, assembly
   map)

### Step 117 — Implement AR assembly guide

Using WebXR (browser-based augmented reality):

1. The builder views the partially assembled structure through their phone/tablet
2. AR overlay shows where the next panel goes (highlighted in green)
3. Fold lines are annotated with fold direction and target angle
4. Connection points are highlighted with fastener type and torque spec

### Step 118 — Implement project file format

Wrap everything into a single `.akde` project file (ZIP containing):

- `design.fkld` — the kirigami pattern with all metadata
- `site.json` — site context
- `analysis/` — structural, environmental, and cost analysis results
- `fabrication/` — DXF, G-code, SVG files for each cutting method
- `assembly/` — instruction PDFs, QR data
- `history/` — design version history (FKLD diffs)

### Step 119 — Implement cloud collaboration

For architectural teams:

1. Host AKDE project files on a server (or use existing cloud storage)
2. Allow multiple architects to view the same project simultaneously
3. Show live cursors and selections (like Figma)
4. Lock panels being edited by one user
5. Merge changes with conflict resolution

### Step 120 — Final integration: complete architectural workflow demo

Demonstrate the full pipeline on a real architectural project:

1. **Site:** Import terrain and footprint for a 6m × 4m pavilion
2. **Design:** Generate a hyperbolic-paraboloid canopy (Steps 57–58)
3. **Inverse:** Create kirigami pattern from the target surface (Steps 41–53)
4. **Validate:** Structural analysis under self-weight + 0.5 kN/m² snow + 0.3 kN/m²
   wind (Steps 61–80)
5. **Environmental:** Solar shading analysis for summer/winter solstice (Step 82)
6. **Material:** 1.5mm aluminum, laser-cut, pop-riveted assembly (Steps 15–16)
7. **Fabricate:** DXF export, kerf-compensated, nested on 1220×2440mm sheets (Steps 101–103)
8. **Prototype:** 1:10 scale in 0.3mm Bristol board on Cricut (Step 108)
9. **Assemble:** Full-scale with AR-guided assembly (Step 117)
10. **Monitor:** IoT sensors for structural health and weather response (Steps 110–113)

---

## Dependencies Between Steps

```
Part I (FKLD Format)     Steps 1–20   ← standalone, can start immediately
Part II (Geometry Engine) Steps 21–40  ← depends on Part I (types)
Part III (Inverse)        Steps 41–60  ← depends on Part II (geometry)
Part IV (Forward)         Steps 61–80  ← depends on Part III (patterns to simulate)
Part V (Architecture)     Steps 81–100 ← depends on Part IV (validated structures)
Part VI (Fabrication)     Steps 101–120 ← depends on Part V (complete designs)
```

Within each part, steps are largely sequential but some can be parallelized
(e.g., Steps 82–87 are independent environmental analyses).

## Citation Requirements

Every feature that uses published algorithms must cite the source:

- Tachi's molecule parameterization [T]: cite "Origamizing polyhedral surfaces"
  (IEEE TVCG 2010) and "3D Origami Design based on Tucking Molecule" (Origami4, 2009)
- Demaine/Tachi Origamizer [DT]: cite "Origamizer: A Practical Algorithm for
  Folding Any Polyhedron" (SoCG 2017) — CC-BY license
- Liu/Sabin kirigami framework [LS]: cite "Programmable Kirigami" (DETC2019-97557)
- FOLD format [FOLD]: cite "FOLD: A Computational Origami File Format" — MIT license
- Schenk/Guest bar-and-hinge: cite "Origami folding: A structural engineering
  approach" (Origami5, 2011)
- Kawasaki's theorem: cite Kawasaki (1989)
- Maekawa's theorem: cite Maekawa (1983)
- Ron Resch patterns: cite Resch (1970)
- Miura-ori: cite Miura (1970)
- Auxetic kirigami: cite Castle, Cho et al. (2014)
