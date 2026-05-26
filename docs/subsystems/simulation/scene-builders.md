# Simulation Scene Builders

## File

- [kirigami/sim/build.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/build.ts)

## Purpose

This is the highest-level simulation entry.

It exposes:

- `buildFoldScene(state, params)`
- `setupGuidedFold(model, net)`
- `singleHingeModel(...)`

## Guided fold logic

`setupGuidedFold(...)` encodes the target-shape interpretation:

- apex tips drive toward the apex point
- base pairs drive toward merged base-ring positions
- molecule valley-convergence nodes are driven inward so the material tucks inside the volume

This file is where abstract simulation structures become "fold this specific kirigami into the intended pyramid."

## Test utility role

`singleHingeModel(...)` is also the simplest test-facing entry for validating crease force behavior on a minimal setup.
