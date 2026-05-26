# Model Pattern And Export

## Files

- [kirigami/model/pattern.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/pattern.ts)
- [kirigami/model/svg-export.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/svg-export.ts)
- [kirigami/model/zip.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/zip.ts)

## `pattern.ts`

This file converts state into SVG-ready geometry.

### Output shape

The main output is `PatternNet`:

- `viewBox`
- ordered `segments`

Each segment carries a role such as:

- `polygon`
- `boundary`
- `molecule-fill`
- `molecule`
- `cut`
- `fold`

### Construction summary

The pattern is built as an apex-centered fan:

- polygon faces are laid out around the origin
- molecules occupy the wedge gaps between polygons
- the major cut becomes the inner 2N-gon
- minor cuts and valley folds are added per molecule
- the outer boundary becomes the perimeter cut path

The helper set exists because this file solves several local geometric subproblems:

- outer/inner vertex identification
- molecule trapezoid recovery
- fold midpoint logic
- minor cut endpoint construction
- clipped fill polygon assembly

## `svg-export.ts`

This file transforms a `PatternNet` into Cricut-oriented exports.

### Public products

- separate cut and score SVG files
- combined color-coded SVG
- modal preview SVGs
- ZIP archive

### Important design decisions

- cut and score are separated by operation
- all exports share one `viewBox`
- dimensions are emitted in `mm`
- the cut layer is emitted as a unibody even-odd shape
- minor-cut slits are widened into real slots for cut import reliability

This is where application geometry becomes machine-oriented file output.

## `zip.ts`

This is a small, dependency-free archive writer.

It exists because the app needs a browser-downloadable ZIP without pulling in a larger packaging dependency just to bundle a few generated SVG files.
