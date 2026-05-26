# App Shell

This document covers the files that boot the browser app and assemble the top-level UI.

## Files

- [app/index.html](/Users/emredayangac/Documents/AKDE/app/index.html)
- [app/main.ts](/Users/emredayangac/Documents/AKDE/app/main.ts)
- [app/styles.css](/Users/emredayangac/Documents/AKDE/app/styles.css)

## Purpose

The app shell does not own kirigami math. Its job is to provide:

- a static HTML mount point
- the header/footer shell
- column mounts for the main UI
- top-level wiring between views, controller, and modal features

The shell should stay thin. If geometry or constraint logic appears here, the separation has already drifted.

## `app/index.html`

This is the browser entry HTML used by Vite.

Important anchors:

- `#app`
  - Main mount target. `app/main.ts` throws if it does not exist.

- `.app-header`
  - The header action container is appended here at runtime.

- footer legend
  - Purely explanatory. It mirrors the stroke/fill roles rendered by the SVG view.

The file deliberately does not embed app state. It just provides stable DOM anchors.

## `app/main.ts`

This is the composition root of the UI.

It does the following:

1. Looks up `#app`.
2. Creates three column mounts.
3. Instantiates `InputsPanel`, `ChecklistView`, and `PatternCanvas`.
4. Instantiates `KirigamiController` through `createController(...)`.
5. Instantiates `ExportModal` and `SimModal`.
6. Adds header action buttons for those modals.
7. Connects modal providers back to controller state.

### Why this matters

`main.ts` is where the app becomes an application instead of a library. It is the one place where the view layer, controller layer, export flow, and simulation entry all meet.

### Provider pattern

Two provider callbacks are mounted after controller creation:

- `exportModal.setProvider(() => controller.getExportPayload())`
- `simModal.setProvider(() => controller.getState())`

This keeps the modals pull-based instead of push-subscribed. The controller does not need to know modal lifecycle details.

## `app/styles.css`

This is global CSS, not component-scoped CSS.

It owns:

- grid layout
- panel styling
- header/footer treatment
- pattern-role visual language
- modal presentation styling

### Important contract

The CSS class names are part of the view contract. The rendering code in the views assumes specific classes exist for roles and layout. The style system can be redesigned, but class-name expectations need coordination.

## Data flow at shell level

At shell level the flow is:

1. HTML provides anchors.
2. `main.ts` creates views and controller.
3. Controller computes state and tells views what to render.
4. Modals request export/state data on demand.

The shell never computes kirigami geometry directly.

## What can change safely

- Page layout
- Header/footer copy
- CSS system
- Exact column DOM wrappers
- Modal button placement

## What should not move casually

- `#app` mount contract
- `.app-header` assumption used by `main.ts`
- The overall boot order: views first, controller second, modal providers after controller exists
