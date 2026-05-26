# View Inputs And Checklist

## Files

- [kirigami/view/inputs-panel.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/inputs-panel.ts)
- [kirigami/view/checklist-view.ts](/Users/emredayangac/Documents/AKDE/kirigami/view/checklist-view.ts)

## `inputs-panel.ts`

This is the heaviest view file because it is both form UI and derived-value display.

Responsibilities:

- render and normalize the user-editable fields
- expose `getInputs()`
- expose `setInputs(...)`
- emit `onChange(...)`
- display inline validation messages
- render the derived field list from the controller

The key design choice is that normalization happens here, but actual mathematical validation does not.

## `checklist-view.ts`

This is a read-only renderer for `ConstraintState[]`.

Responsibilities:

- render current pass/fail state
- render residuals and optional messages
- keep output safe when injecting text

It is intentionally simple. If it becomes logic-heavy, constraint semantics are likely leaking out of the model layer.
