import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import type { KirigamiState } from "@kirigami/model/index.js";
import {
  cornerCutFoldSegments,
  moleculeSlantOuterVertices,
  moleculeOuterVertices,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const phaseOffset = (s: KirigamiState): number => -Math.PI / 2 - s.eta / 2;
const ringPoint = (r: number, a: number): Pt => ({ x: r * Math.cos(a), y: r * Math.sin(a) });

for (const N of [3, 4, 5, 6, 7]) {
  const s = computeState({
    edgeCount: N,
    edgeLength: 100,
    totalCurvature: 71,
    materialThickness: 1,
  });
  const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness);
  let issues = 0;
  for (let k = 0; k < N; k++) {
    const al = (kk: number): number => kk * s.tau + phaseOffset(s);
    const ar = (kk: number): number => kk * s.tau + s.eta + phaseOffset(s);
    const mol: [Pt, Pt, Pt, Pt] = [
      ringPoint(s.rApex, ar(k)),
      ringPoint(s.rApex, al((k + 1) % N)),
      ringPoint(s.s, al((k + 1) % N)),
      ringPoint(s.s, ar(k)),
    ];
    const apex: Pt = { x: 0, y: 0 };
    moleculeSlantOuterVertices(mol, apex);
    const outer = moleculeOuterVertices(mol, apex);
    const { minorCuts } = cornerCutFoldSegments(mol, minorLen, apex);
    const lens = minorCuts.map((c) => dist(c.start, c.end));
    if (Math.min(...lens) < 0.5) issues++;
    const matchOuter =
      (dist(minorCuts[0].start, outer[0]) < 1e-6 ||
        dist(minorCuts[0].start, outer[1]) < 1e-6) &&
      (dist(minorCuts[1].start, outer[0]) < 1e-6 ||
        dist(minorCuts[1].start, outer[1]) < 1e-6);
    if (!matchOuter) issues++;
  }
  console.log(`N=${N} issues=${issues}`);
}
