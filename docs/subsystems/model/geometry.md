# Model Geometry

## Files

- [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
- [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)

## `types.ts`

This file defines the cross-layer vocabulary:

- `KirigamiInputs`
- `KirigamiDerived`
- `KirigamiState`
- `ConstraintState`

Everything else in the app assumes these shapes, which is why `types.ts` is one of the least rewriteable files in the repo.

## `geometry.ts`

This is the main mathematical pipeline.

### Inputs

The geometric pipeline starts from:

- `N`
- `L`
- optional `L_o`
- `H = totalCurvature`
- `T`

### Derived chain

The main derivation order is:

1. `R = L / (2 sin(pi/N))`
2. `s = sqrt(R^2 + H^2)`
3. `psi = atan2(H, R)`
4. `kappa = H / R`
5. `eta`
6. `deltaApex = 2pi - N eta`
7. `theta = deltaApex / N`
8. `tau = 2pi / N`
9. `w = 2 s sin(theta/2)`
10. `gamma`
11. `rApex`
12. `moleculeEndLeg`
13. `minorCutLength`

### Important implementation choices

- `H` is vertical apex height, not slant height.
- `rApex` is physically derived but visually clamped.
- `MINOR_CUT_FORMULA` exists as a strategy switch, but the active branch is currently `fold-reach`.
- `defaultInputs()` is product behavior, not just a test helper.

### State assembly

`computeDerived(...)` builds the scalar bundle.

`computeState(inputs)` adds the original inputs and throws if apex height is invalid. That throw is not UI behavior by itself; the controller prevents the invalid path in normal use.
