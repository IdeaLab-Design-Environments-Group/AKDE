# Test Workflows

## Diagnostic scripts

The `_diag-*` files under `tests/` appear to be developer diagnostics rather than strict contract tests.

Use them for:

- geometry inspection
- edge-case probing
- visual debugging

## Suggested runs after changes

### If you changed math

Run:

- `npm run test -- geometry`
- `npm run test -- constraints`
- `npm run test -- validation`
- `npm run test -- pattern`
- `npm run test -- svg-export`

### If you changed simulation

Run:

- `npm run test -- sim`
- `npm run test -- vec3`

### If you changed export

Run:

- `npm run test -- svg-export`
- `npm run test -- zip`

### If you changed wiring or formatting

Run:

- `npm run test`
