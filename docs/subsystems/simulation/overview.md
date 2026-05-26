# Simulation Overview

## Files

- [kirigami/sim/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/index.ts)
- [kirigami/sim/foldnet.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/foldnet.ts)
- [kirigami/sim/model.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/model.ts)
- [kirigami/sim/forces.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/forces.ts)
- [kirigami/sim/solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/solver.ts)
- [kirigami/sim/build.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/build.ts)
- [kirigami/sim/vec3.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/vec3.ts)
- [kirigami/sim/gpu/gpu-solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/gpu-solver.ts)
- [kirigami/sim/gpu/pack.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/pack.ts)
- [kirigami/sim/gpu/shaders.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/shaders.ts)
- [theory/sim-ecs.md](/Users/emredayangac/Documents/AKDE/theory/sim-ecs.md)

## Purpose

The simulation subsystem takes a flat kirigami net and simulates folding toward the designed 3D pyramid target.

It is a forward process layered on top of the inverse geometry planner:

- the model layer computes the net
- the sim layer builds fold topology and physical-like dynamics on that net
- the view layer visualizes the result

## Architectural position

The simulation layer is downstream of kirigami geometry.

It depends on:

- the meaning of `KirigamiState`
- pattern-derived topology conventions
- target-shape semantics from the current geometry model

It is mostly independent of:

- HTML structure
- export UI
- checklist UI
