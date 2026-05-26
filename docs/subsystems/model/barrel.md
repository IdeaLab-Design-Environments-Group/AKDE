# Model Barrel

## File

- [kirigami/model/index.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/index.ts)

## Purpose

This is the model barrel.

It re-exports:

- shared types
- geometry helpers
- pattern helpers
- export helpers
- constraint helpers
- validation helpers

It is not mathematically important by itself, but it is operationally important because tests and other subsystems rely on the export surface staying stable.

## Practical risk

Broken barrel exports create wide but shallow failures:

- imports still look valid at call sites
- but tests and app code break across multiple files at once

When moving model functions, update this file in the same change.
