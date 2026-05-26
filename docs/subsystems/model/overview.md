# Model Overview

## Files

- [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
- [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)
- [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)
- [kirigami/model/validation.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/validation.ts)
- [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)
- [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)
- [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)
- [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)

## Purpose

The model layer owns everything that should be deterministic without a browser:

- typed inputs and outputs
- geometric derivation
- validity checks
- renderable net geometry
- export transformation
- archive generation

If a function in this subsystem needs DOM access, it is probably in the wrong layer.

## Documents in this folder

- [geometry.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/model/geometry.md)
- [constraints-and-validation.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/model/constraints-and-validation.md)
- [pattern-and-export.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/model/pattern-and-export.md)
- [barrel.md](/Users/emredayangac/Documents/AKDE/docs/subsystems/model/barrel.md)

## Cross-layer contract

The model layer is the source of truth for:

- physical units
- symbol meanings
- net structure
- export semantics

If model meaning changes, update:

1. model code
2. tests
3. [theory/current-formulas.tex](/Users/emredayangac/Documents/AKDE/theory/current-formulas.tex)
4. relevant subsystem docs
