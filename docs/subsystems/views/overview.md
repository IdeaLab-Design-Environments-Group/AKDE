# View Overview

## Files

- [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)
- [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)
- [kirigami/view/pattern-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/pattern-canvas.ts)
- [kirigami/view/export-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/export-modal.ts)
- [kirigami/view/sim-modal.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-modal.ts)
- [kirigami/view/sim-canvas.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/sim-canvas.ts)
- [kirigami/view/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/index.ts)

## Purpose

The view layer owns DOM rendering and user interaction widgets.

It should:

- render data provided by the controller
- collect input values
- open and close modals
- convert `PatternNet` or simulation state into visual output

It should not:

- derive kirigami formulas
- decide physical validity rules
- mutate core model state on its own
