# App Shell Overview

The app shell is the browser-facing composition layer.

It owns:

- static HTML anchors
- top-level column layout
- creation of concrete views
- creation of controller and modal objects
- visual styling shared across the whole page

It does not own:

- geometry derivation
- constraint semantics
- export file generation
- simulation physics

## Runtime composition

The shell-level boot sequence is:

1. Vite serves [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html).
2. [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts) creates mount nodes under `#app`.
3. It instantiates the three main views:
   - inputs
   - constraints
   - pattern
4. It instantiates the controller.
5. It instantiates the export and simulation modals.
6. It mounts modal triggers into the header.
7. It connects modal providers back to controller state.

## Why this layer stays thin

If logic here becomes mathematically aware, the rest of the architecture becomes much harder to reason about:

- the controller loses its role as the single orchestration spine
- the model stops being the only source of mathematical truth
- tests have to start caring about DOM details to validate geometry
