# Model Constraints And Validation

## Files

- [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)
- [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)

## `constraints.ts`

This file converts model state into checklist rows.

Current constraints:

- `C1`: angle closure
- `C2`: vector closure
- `C3`: angle range
- `C4`: non-negative width
- `C5`: fold overlap proxy
- `C6`: cut-vs-dihedral proxy

Each constraint has:

- a stable ID
- a label
- a boolean status
- a residual
- optional explanatory message

This is the exact structure consumed by the checklist view.

## `validation.ts`

This file is intentionally smaller than `constraints.ts`.

It handles field-level validity before geometry is computed. Right now it ensures:

- apex height is positive
- material thickness is positive

The separation from constraints is important because invalid inputs suppress pattern generation entirely instead of rendering a mathematically invalid state.

## Architectural split

Use validation for:

- malformed or forbidden raw input

Use constraints for:

- meaningful computed-state validity checks
- residual-bearing diagnostic output
