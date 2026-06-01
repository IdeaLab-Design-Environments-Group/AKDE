# FKLD — Flexible Kirigami list Datastructure

**Version:** 0.1 (draft)
**Status:** under active development — Part I of `AtoK.md`
**Base format:** FOLD 1.2 ([edemaine/fold](https://github.com/edemaine/fold))

FKLD is a JSON file format for kirigami architecture models. It is a strict
superset of FOLD: every FKLD file is a valid FOLD file with extra keys under
the `fkld:` namespace. Origami tools that understand FOLD can open an FKLD
file and render the crease pattern correctly; they will simply ignore the
kirigami- and architecture-specific extensions. AKDE writes and reads FKLD
end-to-end; external CAD/CAM tools can consume the embedded standard-FOLD
subset.

The reference implementation is written in **CoffeeScript**, matching the
FOLD reference library, so the source reads as a direct extension of FOLD's
own code.

## Why "Flexible Kirigami list Datastructure"

The acronym mirrors FOLD. **F**lexible — like FOLD, the format is intentionally
extensible. **K**irigami — cuts are first-class, not afterthoughts. **L**ist —
data lives in parallel arrays indexed by vertex/edge/face number, exactly as
in FOLD. **D**atastructure — the file format and the in-memory representation
are the same JSON shape; no impedance mismatch between parser and model.

## Compatibility with FOLD

FKLD inherits every FOLD field unchanged. In particular:

| FOLD field | Meaning in FKLD |
|------------|-----------------|
| `vertices_coords` | 2D or 3D vertex positions. Frame 0 = flat pattern (z=0); other frames may be 3D. |
| `edges_vertices` | Edge → (a, b) vertex indices. |
| `edges_assignment` | `M`/`V`/`B`/`U`/`F`/`C` exactly as in FOLD. `C` (cut) is subdivided by `fkld:edges_cutType` (see Step 2). |
| `faces_vertices` | Face → ordered vertex indices (triangle, quad, or N-gon). |
| `faceOrders` | Stacking order for overlapping faces (used when molecules tuck). |
| `file_frames` | Multiple states of the same mesh (flat pattern, target, folded, ...). |

FOLD's `filter.splitCuts` will downgrade FKLD `C` edges to `B` (boundary)
edges for tools that can't model open cuts. This is lossy but legal — the
FKLD-specific `fkld:edges_cutType` annotation is preserved on the resulting
boundary edges.

## Namespace prefix

Every FKLD-only property name starts with the reserved prefix `fkld:` and
uses snake_case for the rest, paralleling FOLD's existing naming convention
(`vertices_coords`, `edges_assignment`, `faces_vertices`).

The single source of truth for the registry is
[`fkld/spec.coffee`](fkld/spec.coffee). Adding a key means:

1. Add its name to `KEYS` in `spec.coffee` (grouped by edges/vertices/faces/meta).
2. Append it to `KEY_LIST`.
3. Update the corresponding `.d.ts` shape.
4. Document the semantics in this file (a new section below).
5. Add validators to the relevant per-step module (`cut-types.coffee`,
   `molecule.coffee`, etc.).

## Registered keys (v0.1)

### Per-edge keys (Step 2–3 of the AtoK plan)

| Key | Type | Purpose |
|-----|------|---------|
| `fkld:edges_cutType` | `string[]` | Subtype for each `C`-assigned edge: one of `major`, `minor`, `seam`, `dart`, `auxetic`, `vent`, `tab`. Defined in Step 2. |
| `fkld:edges_moleculeTheta` | `number[]` | Per-edge molecule angle θ(i,j) in radians (Tachi 2010). Defined in Step 3. |
| `fkld:edges_moleculeWidth` | `number[]` | Per-edge molecule chord width w(i,j) in mm. Defined in Step 3. |
| `fkld:edges_moleculeDepth` | `number[]` | Tuck depth behind the adjacent face in mm. Defined in Step 3. |
| `fkld:edges_dihedralTarget` | `number[]` | Target dihedral angle in the folded state, in radians. Defined in Step 3. |

### Per-vertex keys (Step 4)

| Key | Type | Purpose |
|-----|------|---------|
| `fkld:vertices_curvatureClass` | `string[]` | One of `positive`, `negative`, `flat`, `boundary`. Defined in Step 4. |
| `fkld:vertices_angleDefect` | `number[]` | Signed Gaussian angle defect G_v = 2π − Σθ in radians. Defined in Step 4. |
| `fkld:vertices_reliefStrategy` | `string[]` | One of `molecule`, `cut`, `hybrid`, `none`. Defined in Step 4. |

### Per-face keys (Step 5)

| Key | Type | Purpose |
|-----|------|---------|
| `fkld:faces_materialId` | `string[]` | Key into the architecture material library. Defined in Step 5. |
| `fkld:faces_thickness` | `number[]` | Override material thickness for this face (mm). Defined in Step 5. |
| `fkld:faces_structuralRole` | `string[]` | One of `skin`, `rib`, `reinforcement`, `sacrificial`. Defined in Step 5. |
| `fkld:faces_panelId` | `(number\|null)[]` | Fabrication panel grouping (which sheet a face is cut from). Defined in Step 5. |

### Top-level metadata (later steps)

| Key | Type | Purpose |
|-----|------|---------|
| `fkld:meta_architecture` | `object` | Site location, design loads, material library, real-world scale, build method. Defined in Step 6. |

## Validation rules

Validation is performed by `fkld/validate.coffee` (Step 17 in `AtoK.md`).
The Step 1 spec module only provides the registry; later modules layer the
semantic checks on top.

A FKLD file is **valid** iff it is valid as a FOLD file and:

- Every parallel array's length matches the corresponding FOLD primary array.
- Every `fkld:edges_cutType` entry corresponds to an `edges_assignment` of `C`.
- Every `fkld:vertices_curvatureClass` is one of the four registered classes.
- Every `fkld:faces_structuralRole` is one of the four registered roles.
- (Later steps add geometric constraints — angle/vector closure, tuck depth,
  etc.)

Unknown `fkld:`-prefixed keys are preserved on round-trip but are not
validated. This lets downstream consumers add custom annotations without
forking the spec.

## License

FKLD spec text and reference implementation: MIT, matching FOLD.

## References

- Demaine, Ku & Lang, "FOLD" — file format and reference library.
- Tachi, "Origamizing polyhedral surfaces" (IEEE TVCG 2010) — tucking molecules.
- Demaine & Tachi, "Origamizer: A Practical Algorithm for Folding Any Polyhedron" (SoCG 2017, CC-BY).
- Liu, Chuang, Sang & Sabin, "Programmable Kirigami" (DETC2019-97557).
