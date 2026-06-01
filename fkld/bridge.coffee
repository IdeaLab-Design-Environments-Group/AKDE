# FKLD bridge — convert AKDE's internal FoldNet + KirigamiState to the
# FKLD JSON shape registered in `spec.coffee` (Steps 1–3).
#
# AKDE keeps two representations of the same pyramid pattern:
#   • `FoldNet` (kirigami/sim/foldnet.ts) — topology + per-edge assignment,
#     used by the bar-and-hinge solver. Vertex coordinates are normalized
#     to a bounding-sphere radius of 1 so the solver's stiffness scales are
#     numerically well-conditioned.
#   • `KirigamiState` (kirigami/model/types.ts) — the user inputs (N, L, H,
#     T) and every derived scalar (θ, w, γ, rApex, …) in real-world mm.
#
# FKLD wants both: vertex coords in mm (so external CAD tools see real
# dimensions) and per-edge molecule scalars (θ, w from KirigamiState). This
# module is the one place that joins them. Downstream code only sees a
# plain FKLD object — the FoldNet/state coupling stops here.
#
# What this writes today:
#   • Standard FOLD: vertices_coords (2D, mm), edges_vertices,
#     edges_assignment, faces_vertices, file_classes/_creator/_spec.
#   • FKLD Step 2: fkld:edges_cutType for every "C" edge, classified as
#     "major" (apex-hole rim) or "minor" (molecule dart-mouth slit).
#   • FKLD Step 3: fkld:edges_moleculeTheta / moleculeWidth on each "V"
#     edge (the valley crease of each molecule carries the uniform-pyramid
#     scalars from KirigamiState); fkld:edges_dihedralTarget on every
#     crease ("M"/"V"/"F") so the simulator has a fold-angle goal.
#   • FKLD Step 6: a minimal fkld:meta_architecture block recording the
#     real-world scale and the source material thickness.
#
# What this deliberately omits (registered keys with no Step-4/5 module
# yet): vertex curvature classification, face material/role/panel
# assignments, full architecture metadata (loads, site, material
# library). Those land when their per-step modules ship.

import { KEYS } from "./spec.coffee"

# A "C" edge in the AKDE pyramid is either part of the apex-hole rim
# (major cut absorbing positive curvature) or a molecule dart-mouth slit
# (minor cut letting the molecule tuck flat). `buildFoldNet` already used
# the same distance test internally to tag the rim edges as cuts; we
# re-apply it here so the FKLD subtype matches the topology that produced
# the assignment in the first place. Same threshold (1.4 · rApex) and same
# "both endpoints inside the rim" rule keep the two classifications in
# lockstep — if the FoldNet builder changes its threshold the bridge must
# follow.
classifyCutEdge = (net, edge) ->
  rApex = net.meta?.rApex ? 0
  return "minor" unless rApex > 0
  threshold = rApex * 1.4
  a = net.vertices[edge.a]
  b = net.vertices[edge.b]
  return "minor" unless a? and b?
  distA = Math.hypot a.x, a.y
  distB = Math.hypot b.x, b.y
  if distA <= threshold and distB <= threshold then "major" else "minor"

# Per-assignment fold target. The simulator wants a rest dihedral on each
# crease; the pyramid's geometry sets unambiguous targets for every kind:
#   • M (mountain): the interior dihedral γ between adjacent lateral
#     faces at a base vertex — exactly what brings the pyramid up.
#   • V (valley): 0 rad — the molecule folds onto itself, mating the two
#     halves of the trapezoid (Tachi 2010 §3 tuck).
#   • F (facet) / B (boundary) / C (cut): null. Facet creases stay flat
#     by virtue of carrying no molecule (no target ⇒ flat by default in
#     the bar-and-hinge solver); boundary and cut edges have no crease
#     to drive at all. molecule.coffee's isValidDihedral range is the
#     strict open interval (−π, π), which excludes the literal π we'd
#     otherwise emit for a "flat" facet, so null is also the only value
#     that round-trips cleanly through validateMoleculeArrays.
dihedralTargetFor = (assignment, gamma) ->
  switch assignment
    when "M" then gamma
    when "V" then 0
    else null

# Build the FKLD JSON object for the given FoldNet + KirigamiState pair.
# Returns a plain object (not stringified) — `serializeFkld` in io.coffee
# handles the JSON encoding. Keeping the two split lets tests assert on
# the object shape without re-parsing.
#
# `creator` defaults to "AKDE" so files written by the app are
# self-identifying when opened in external FOLD viewers; pass a different
# value (e.g. a test fixture name) to override.
export foldNetToFkld = (net, state, options = {}) ->
  throw new TypeError("foldNetToFkld: net is required") unless net?
  throw new TypeError("foldNetToFkld: state is required") unless state?

  creator = options.creator ? "AKDE"

  # FoldNet coordinates were divided by the bounding-sphere radius
  # (= 1/scale, where scale ≈ 1/maxR) to keep the solver well-conditioned.
  # Undo that here so the exported coords are in mm — external CAD tools
  # don't know about AKDE's internal normalization.
  scale = net.meta?.scale ? 1
  invScale = if scale > 0 then 1 / scale else 1

  # FOLD spec accepts 2D or 3D vertex coordinates; the AKDE pattern is
  # flat (z = 0) so emit 2D to keep the file compact and unambiguous.
  vertices_coords = net.vertices.map (v) -> [v.x * invScale, v.y * invScale]
  edges_vertices = net.edges.map (e) -> [e.a, e.b]
  edges_assignment = net.edges.map (e) -> e.assignment
  faces_vertices = net.faces.map (f) -> [f[0], f[1], f[2]]

  cutType = net.edges.map (e) ->
    if e.assignment is "C" then classifyCutEdge(net, e) else null

  # Uniform-pyramid pattern: every molecule shares the same (θ, w). FKLD
  # stores those on the valley crease of each molecule — the "V" edges —
  # so that future per-edge variation (freeform meshes in AtoK Part II)
  # only changes the per-edge value, not the storage layout. molecule.coffee
  # enforces the pair rule (theta and width must both be present or both
  # null on a given edge); writing them in lockstep here satisfies that
  # rule by construction.
  theta = net.edges.map (e) -> if e.assignment is "V" then state.theta else null
  width = net.edges.map (e) -> if e.assignment is "V" then state.w else null

  dihedralTarget = net.edges.map (e) -> dihedralTargetFor(e.assignment, state.gamma)

  out =
    # Standard FOLD metadata. file_classes lets viewers know this is a
    # crease pattern (flat 2D) rather than a folded form; file_spec 1.2
    # is the version of the FOLD spec these field names follow.
    file_spec:    1.2
    file_creator: creator
    file_classes: ["creasePattern"]
    # Mesh primaries.
    vertices_coords: vertices_coords
    edges_vertices:  edges_vertices
    edges_assignment: edges_assignment
    faces_vertices:  faces_vertices

  # FKLD extension keys, dynamically keyed off the spec registry so a
  # future rename in spec.coffee propagates here without code changes.
  out[KEYS.edges.cutType]        = cutType
  out[KEYS.edges.moleculeTheta]  = theta
  out[KEYS.edges.moleculeWidth]  = width
  out[KEYS.edges.dihedralTarget] = dihedralTarget

  # Minimum fkld:meta_architecture block — enough to round-trip the
  # scale + material thickness that external tools need to interpret the
  # millimetre coords and the score-line strategy. The full block (loads,
  # site, material library, build method) lands when Step 6's dedicated
  # module ships; unknown architecture fields are preserved on round-trip
  # by serializeFkld's pass-through behaviour.
  out[KEYS.meta.architecture] =
    scaleMeters:       0.001
    materialThickness: state.inputs.materialThickness
    sourcePyramid:
      edgeCount:    state.inputs.edgeCount
      edgeLength:   state.inputs.edgeLength
      apexHeight:   state.H
      slantLength:  state.s

  out
