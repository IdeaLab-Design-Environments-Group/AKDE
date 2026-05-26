# Simulation Forces And Solver

## Files

- [kirigami/sim/forces.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/forces.ts)
- [kirigami/sim/solver.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/solver.ts)

## `forces.ts`

This file computes the actual solver ingredients:

- face normals
- fold angles
- accumulated forces
- integration-step pieces
- stable timestep estimates

It is where the solver gets its mechanical behavior, even if the UI never sees these details directly.

## `solver.ts`

This file owns the stepping logic.

Main responsibilities:

- hold solver state
- apply fold-percent progression
- advance the system for some number of steps
- expose helpers like `measureTheta`

If the simulation appears unstable or converges poorly, this file is usually one of the first places to inspect.
