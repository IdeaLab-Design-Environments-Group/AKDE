# View Pattern And Export

## Files

- [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)
- [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)

## `pattern-canvas.ts`

This file turns a `PatternNet` into SVG DOM.

Responsibilities:

- map segment roles to SVG elements and classes
- render the latest pattern geometry
- clear output when the pattern is unavailable

This file is not the place to recalculate cut or fold positions. It trusts `pattern.ts`.

## `export-modal.ts`

This file is the UI for export previews and downloads.

Responsibilities:

- mount a trigger into the header
- open and close a modal
- request current export data from a provider
- render cut/score/both previews
- trigger archive download

The provider pattern keeps export logic outside the DOM layer.
