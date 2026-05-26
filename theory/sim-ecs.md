# AKDE — Kirigami folding simulation (GPU bar-and-hinge)

**Status:** Working. CPU reference solver verified by tests (single hinge folds to its exact
target dihedral; full net folds into a pyramid whose height tracks `H`); GPU solver
(`GPUComputationRenderer`) built + packing tested; Three.js view renders lit faces + creases and
drives the GPU path with a CPU fallback; wired to the app via the **3D Sim** button.

**Goal:** *Forward* simulation — fold the flat DETC kirigami net into the 3D pyramid, physically
demonstrating the closure that C1/C2 assert algebraically (`theory/plan.md`). Complements the
static planner; does not change v1 geometry, constraints, or SVG export.

## Method (combines two papers)

- **Geometry / design — DETC2019-97557 (Liu, Sabin et al.).** The edge-molecule net (θ, w, major
  cut, minor cuts, valley creases) is already AKDE's `geometry.ts` + `pattern.ts`; C1–C4 are the
  paper's closure Eqs (1)–(4). The dihedral γ (paper Eq 5 / the screenshot) is `computeDihedralGamma`.
- **Forward solver — Ghassaei, Demaine, Gershenfeld ("Fast, Interactive Origami Simulation using
  GPU Computation").** Bar-and-hinge: every edge is an axial spring (`k=EA/l0`), every interior
  edge a torsional crease spring (`−k(θ−θ_target)·∂θ/∂p`, Eqs 2–6), every triangle an
  interior-angle spring (§2.4); explicit forward-Euler integration (§2.5) with viscous damping.
- **Kirigami coupling — DETC §3.2 / Eq 6 (`Kd=Fx`).** A cut weakens a hinge:
  `k_crease = (1 − cutRatio)·l0·k_fold`. Cuts themselves are **absent edges** in the topology, so
  the major-cut hole opens and the apex tips never weld into a cone point.

## Architecture (ECS = struct-of-arrays, mirroring the paper's GPU textures)

```
kirigami/sim/                 # dependency-free core (runs in Node tests)
  vec3.ts                     # {x,y,z} math
  foldnet.ts                  # buildFoldNet(state): analytic topology — vertices/faces/edges(M/V/F/B)
  model.ts                    # buildModel(net): SoA bar-and-hinge arrays + kirigami k_crease coupling
  forces.ts                   # Gershenfeld force math (CPU reference; the testable oracle)
  solver.ts                   # FoldSolver: normals→thetas→forces→Euler; measureTheta helper
  build.ts                    # buildFoldScene(state) -> {net, model, solver}; singleHingeModel (tests)
  index.ts                    # barrel (core only — no three, no gpu)
  gpu/
    pack.ts                   # model -> flat texture arrays (no three; testable)
    shaders.ts                # GLSL: per-node force gather + Euler, transcribed from forces.ts
    gpu-solver.ts             # GpuFoldSolver: GPUComputationRenderer ping-pong float textures
kirigami/view/
    sim-canvas.ts             # Three.js viewport: lit faces + M/V/B creases; GPU solver, CPU fallback
    sim-modal.ts              # "3D Sim" button + modal; lazy-loads the viewer
tests/sim.test.ts            # topology, model, kirigami coupling, packing, single-hinge, full-net fold
```

**Systems = the paper's 5 GPU passes.** Per step: face normals → crease fold angles → force
accumulation (axial+crease+face+damping) → Euler position/velocity. The CPU `forces.ts` and the
`gpu/shaders.ts` compute the *same equations*; the CPU path is the unit-tested reference (WebGL
can't run in vitest's node env), the GPU path is the product. `pack.ts` lays out the SoA exactly
like Gershenfeld's `dynamicSolver.initTypedArrays` so the GPU port is a 1:1 transcription.

## Cuts (kirigami integration)

The cuts are real free boundaries in the topology — that, plus distinct apex-tip nodes, is what
makes this kirigami rather than origami:

- **Major cut** — the apex hole: no faces cover the centre (inside `rApex`), and the N tips are
  separate nodes, so the hole opens/closes as the tips converge (they never weld to a cone point).
- **Minor cut** — each molecule **dart mouth**: the two molecule halves join only down the valley,
  so the mouth opens as the dart folds out of plane (no bar bridges the two base corners).

Cut edges (`"C"`) still carry their face-boundary bar (so faces stay rigid — removing the bars
makes them floppy and *worse*), but couple no crease across them. They render as black cut lines.

## Two fixes that made it fold instead of crumple

1. **Normalization (the big one).** The model must be scaled to ~unit size (Gershenfeld scales to
   bounding-sphere radius 1). In raw mm, `k_crease = k_fold·l0 ≈ 70` swamps `k_axial = EA/l0 ≈ 0.2`
   — the inverse of the paper's required `k_axial ≫ k_crease` — so the explicit integrator blew up
   into the crumple. `foldnet` now scales coordinates by `1/outerRadius` (stored in `meta.scale`).
2. **Overdamping** (`ζ = 1.0`). The flat→cone fold is a buckling problem; ζ≈1 reliably damps the
   chaotic buckle (ζ past ~1.5 hits explicit-damping instability).

## Folding: DETC forward process (guided to the goal mesh)

The fold follows DETC §3.2 / Figure 6–7: drive the structure to the **goal mesh M0** while the
bar-and-hinge interior relaxes. Concretely (`setupGuidedFold` in `build.ts`), the **boundary** is
kinematically driven rest→goal by `foldPercent`:

- apex tips → the apex point `(0, 0, H)` (the major-cut hole closes), and
- each molecule's outer-corner **merge pair** (`net.basePairs`) → its single cone base vertex at
  radius `R` (the molecule between them tucks).

The interior molecules tuck through their **valley creases and minor cuts** (no guessed crease
angles). **Inside-tuck:** the out-of-plane buckle of a molecule is a symmetric bifurcation (it can
fold in or out, and sign/force biases were not reliable across N), so each molecule's valley node
(`net.valleyOuter`, the `foldPt`) is also driven to an **inside goal** (radius ≈ 0.7·R, z ≈ 0.1·H —
below the cone surface), guaranteeing the molecules tuck *into* the volume rather than protruding
outward. The apex-region nodes stay free and relax around it. Result: a crisp pyramid with the
molecules hidden inside, apex closed, height exactly `H`, base radius `R`, mean bar strain ≈ 0.05–0.1
across N=4…8 — not the earlier outward-buckled flaps.
`foldPercent` is still eased quasi-statically and exposed to the view's scrubber. The dihedral
relationship (fold angle = π − γ, DETC Eq 5 = `computeDihedralGamma`) is the measured quantity; the
goal positions come straight from the geometry formulas (`R`, `H`).

Crease targets (`foldMountain`/`foldValley`) remain as a fallback for **un-guided** free folding
(e.g. exploring without a goal shape); guided mode overrides them via the driven boundary.

## Validation (tests/sim.test.ts)

- **Single hinge** folds to its exact target dihedral (rigorous check of the crease force math).
- **Full net** folds out of plane: apex tips converge to the axis (major cut closes — kirigami),
  cone height tracks `H`, mean axial strain bounded.
- **Topology / model / packing**: face & crease counts, `k=EA/l0`, kirigami `(1−cut)` softening,
  and GPU incidence layout (2 entries/beam, 4/crease, 3/face).

## Roadmap

| Phase | Deliverable | State |
|---|---|---|
| S1 | FoldNet topology (cuts = absent edges, distinct apex tips) | ✅ |
| S2 | SoA bar-and-hinge model + kirigami k_crease coupling | ✅ |
| S3 | Gershenfeld force math + CPU solver (tested) | ✅ |
| S4 | GPU solver via GPUComputationRenderer (packing tested) | ✅ |
| S5 | Three.js view (lit faces + creases) + app wiring | ✅ |
| S6 | DETC forward process: guided fold to goal mesh (crisp, ~2% strain) | ✅ |
| S7 | Strain colormap (paper §3.1) + fold-% scrubber UI | ⏳ |
| S8 | Cross-check folded apex defect / closure vs C1/C2 | ⏳ |

## Notes

- **Units:** mm and the plan's coordinate conventions; no conversion.
- **GPU θ:** measured with branch-safe `atan2` but **not** unwrapped across steps (valid for
  |θ|<π, which our targets respect); the CPU reference does unwrap. Add a lastTheta texture if a
  fold needs to cross ±π.
- **Self-intersection:** expected as molecules tuck; the paper has no collision handling (§4.1).
- **No core dependency on three:** enforced by keeping `gpu/` and the view out of `sim/index.ts`.
```
