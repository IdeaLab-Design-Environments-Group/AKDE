# Simulation FoldNet And Model

## Files

- [kirigami/sim/foldnet.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/foldnet.ts)
- [kirigami/sim/model.ts](/Users/emredayangac/Documents/AKDE/kirigami/sim/model.ts)

## `foldnet.ts`

This file creates the topological representation of the folding structure.

It answers questions like:

- what are the vertices?
- which triangles and faces exist?
- which edges are mountains, valleys, cuts, or boundaries?
- which nodes correspond to apex tips or base-pair merges?

The fold net is the bridge between geometric net design and physical-style solver structures.

## `model.ts`

This file turns fold topology into the bar-and-hinge simulation model.

Key ideas:

- struct-of-arrays layout
- beam data
- crease data
- face data
- fixed/driven node flags
- default solver/material parameters

This is the simulation equivalent of a typed physical model plus model assembly.
