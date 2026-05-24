import type { KirigamiState } from "../model/types.js";
import { buildFoldNet, foldNetFromMesh, type FoldNet } from "./foldnet.js";
import { buildModel, setFixed, DEFAULT_PARAMS, type BarHingeModel, type SolverParams } from "./model.js";
import { FoldSolver } from "./solver.js";
import { vec3 } from "./vec3.js";

/** A ready-to-run folding simulation: topology + bar-and-hinge model + solver. */
export interface FoldScene {
  net: FoldNet;
  model: BarHingeModel;
  solver: FoldSolver;
}

/**
 * Build the full forward-folding simulation from a computed kirigami state:
 * FoldNet (topology) → bar-and-hinge SoA model → Gershenfeld solver. One apex-tip node is
 * pinned to remove rigid-body translation; everything else folds freely as `foldPercent` ramps.
 */
export function buildFoldScene(state: KirigamiState, params: SolverParams = DEFAULT_PARAMS): FoldScene {
  const net = buildFoldNet(state);
  const model = buildModel(net, params);
  if (net.tips.length > 0) setFixed(model, [net.tips[0]]); // anchor to kill translational drift
  const solver = new FoldSolver(model);
  return { net, model, solver };
}

/**
 * Minimal two-triangle hinge model for unit-testing the crease force math: faces share the
 * edge (0,1) along x; nodes 2 and 3 are the wings of each face. The shared edge is driven to
 * `target` (signed fold angle). Returns the model with the crease already configured.
 */
export function singleHingeModel(target: number, kFold = 0.7): BarHingeModel {
  const vertices = [
    vec3(0, 0, 0), // 0 — crease node
    vec3(1, 0, 0), // 1 — crease node
    vec3(0.5, 1, 0), // 2 — wing of face 0
    vec3(0.5, -1, 0), // 3 — wing of face 1
  ];
  const faces: [number, number, number][] = [
    [0, 1, 2],
    [1, 0, 3],
  ];
  const net = foldNetFromMesh(vertices, faces, () => "V");
  const model = buildModel(net, { ...DEFAULT_PARAMS, kFold, kFace: 0 });
  // override the design target with the test's requested angle
  for (let i = 0; i < model.creases.count; i++) model.creases.targetTheta[i] = target;
  return model;
}
