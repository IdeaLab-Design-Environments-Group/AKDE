# View Simulation UI

## Files

- [kirigami/view/sim-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-modal.ts)
- [kirigami/view/sim-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-canvas.ts)

## `sim-modal.ts`

This file is the modal shell for simulation.

Responsibilities:

- mount a trigger
- request the latest `KirigamiState`
- own modal lifecycle
- hand state to `sim-canvas.ts`

It does not own solver math. It owns the interaction wrapper around the simulation.

## `sim-canvas.ts`

This is the visual simulation bridge.

Responsibilities:

- turn state into a fold scene
- connect Three.js or GPU-backed rendering pieces to the DOM
- drive animation and update lifecycle

This file sits between UI and simulation internals, so it is more coupled than the plain pattern canvas.
