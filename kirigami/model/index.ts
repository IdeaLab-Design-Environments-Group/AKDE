export type {
  ConstraintId,
  ConstraintState,
  KirigamiDerived,
  KirigamiInputs,
  KirigamiState,
} from "./types.js";

export {
  computeDeltaApex,
  computeDerived,
  computeDihedralGamma,
  computeDihedralGammaFromState,
  computeEta,
  computeFoldClearance,
  computeFoldReach,
  computeKappa,
  computeMinorCutLength,
  computeMoleculeEndLeg,
  computePsi,
  computeR,
  computeRApex,
  computeS,
  computeState,
  computeTau,
  computeTheta,
  computeW,
  defaultInputs,
  MINOR_CUT_FORMULA,
} from "./geometry.js";

export type { MinorCutFormula } from "./geometry.js";

export {
  buildPatternNet,
  cornerCutFoldSegments,
  cornerMoleculeTrapezoid,
  injectPolyTipsCW,
  moleculeFillPolygon,
  moleculeInnerVertices,
  moleculeMinorCutEndpoints,
  moleculeOuterVertices,
  moleculeOutlineSegments,
  moleculeSlantOuterVertices,
  moleculeTopEdgeMidpoint,
  moleculeTrapezoidFromOutlinePath,
} from "./pattern.js";

export type {
  CornerCutFoldSegments,
  PatternNet,
  PatternSegment,
  PatternStrokeRole,
} from "./pattern.js";

export {
  CONSTRAINT_EPS,
  evaluateC1,
  evaluateC2,
  evaluateC3,
  evaluateC4,
  evaluateC5,
  evaluateC6,
  evaluateConstraints,
} from "./constraints.js";

export {
  validateInputs,
  APEX_HEIGHT_ERROR,
  MATERIAL_THICKNESS_ERROR,
} from "./validation.js";
