# View Barrel

## File

- [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)

## Purpose

This is the view barrel re-export used by `app/main.ts`.

Its main purpose is import hygiene and a stable UI export surface.

The app shell expects to import:

- inputs panel
- checklist view
- pattern canvas
- export modal
- simulation modal

If you move those classes, update the barrel and the app shell together.
