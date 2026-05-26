# Controller Overview

The controller layer is the application spine.

It connects:

- raw inputs from the form view
- validated and computed model state
- rendered outputs in the checklist and pattern views
- export and simulation consumers that need access to the current state

## Pipeline

The controller owns this exact sequence:

1. collect current inputs
2. validate them
3. if invalid:
   - clear computed state
   - clear constraints
   - push error-only UI state
4. if valid:
   - compute `KirigamiState`
   - evaluate `ConstraintState[]`
   - render derived rows, checklist, and pattern

This ordering is a major architectural rule of the repo.
