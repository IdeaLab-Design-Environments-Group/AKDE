# Simulation Barrel And Support

## Files

- [kirigami/sim/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/index.ts)
- [kirigami/sim/vec3.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/vec3.ts)
- [theory/sim-ecs.md](/Users/emredayangac/Documents/AKDE/theory/sim-ecs.md)

## `index.ts`

This barrel intentionally re-exports only the Node-safe simulation API.

That means:

- topology builders
- model builders
- force and solver utilities
- scene construction
- vector helpers

It deliberately does not re-export the Three.js view or GPU-only browser pieces so tests can import the sim layer in Node.

## `vec3.ts`

Small vector helpers used throughout the sim subsystem.

This file is low drama but operationally important because many simulation files depend on it.

## `theory/sim-ecs.md`

This is the architecture reference for the simulation subsystem. Read it first before large sim rewrites.
