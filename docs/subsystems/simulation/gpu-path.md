# Simulation GPU Path

## Files

- [kirigami/sim/gpu/pack.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/pack.ts)
- [kirigami/sim/gpu/gpu-solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/gpu-solver.ts)
- [kirigami/sim/gpu/shaders.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/gpu/shaders.ts)

## `pack.ts`

Packs the CPU-side bar-and-hinge model into GPU-friendly arrays and textures.

## `gpu-solver.ts`

Runs the accelerated solver path in the browser.

## `shaders.ts`

Holds shader source and shader-side data conventions.

## Position in the architecture

The GPU path is an optimization and visualization path. The CPU-side model and tests remain the canonical correctness baseline.
