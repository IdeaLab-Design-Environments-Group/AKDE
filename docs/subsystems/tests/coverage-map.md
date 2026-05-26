# Test Coverage Map

## Main tests

- [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts)
- [tests/geometry-functions.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry-functions.test.ts)
- [tests/constraints.test.ts](/Users/emredayangac/Documents/AKDE/tests/constraints.test.ts)
- [tests/validation.test.ts](/Users/emredayangac/Documents/AKDE/tests/validation.test.ts)
- [tests/pattern.test.ts](/Users/emredayangac/Documents/AKDE/tests/pattern.test.ts)
- [tests/svg-export.test.ts](/Users/emredayangac/Documents/AKDE/tests/svg-export.test.ts)
- [tests/zip.test.ts](/Users/emredayangac/Documents/AKDE/tests/zip.test.ts)
- [tests/formatters.test.ts](/Users/emredayangac/Documents/AKDE/tests/formatters.test.ts)
- [tests/vec3.test.ts](/Users/emredayangac/Documents/AKDE/tests/vec3.test.ts)
- [tests/sim.test.ts](/Users/emredayangac/Documents/AKDE/tests/sim.test.ts)

## What they protect

Geometry tests protect:

- formula outputs
- default-case values
- helper-level computations

Constraint and validation tests protect:

- invalid-input vs failing-constraint separation
- residual definitions
- stable checklist semantics

Pattern tests protect:

- renderable net contract
- segment roles
- cut/fold structure
- viewBox sanity

Export and ZIP tests protect:

- cut/score split
- archive structure
- filename and registration assumptions

Simulation tests protect:

- fold-net topology
- crease and cut classification
- bar-and-hinge model assembly
- GPU packing consistency
- single-hinge fold behavior
- full-net guided folding behavior
