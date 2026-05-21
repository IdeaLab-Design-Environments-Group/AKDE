import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import {
  buildPatternNet,
  cornerCutFoldSegments,
  moleculeApex,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moleculeFromOutline(d: string): [Pt, Pt, Pt, Pt] {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return [pts[0], pts[1], pts[2], pts[pts.length - 1]];
}

for (const N of [3, 4, 5, 6, 7]) {
  const s = computeState({
    edgeCount: N,
    edgeLength: 100,
    totalCurvature: 71,
    materialThickness: 1,
  });
  const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness);
  const net = buildPatternNet(s);
  const mols = net.segments.filter((x) => x.role === "molecule");

  let nullViaWrongApex = 0;
  let zeroInNet = 0;
  for (let k = 0; k < N; k++) {
    const molWrong = moleculeFromOutline(mols[k].d);
    const apexWrong = moleculeApex(molWrong);
    const { minorCuts: bad } = cornerCutFoldSegments(molWrong, minorLen, apexWrong);
    for (const c of bad) {
      if (dist(c.start, c.end) < 0.5) nullViaWrongApex++;
    }

    const nums = net.segments.filter((x) => x.role === "cut").slice(1);
    for (let i = 2 * k; i < 2 * k + 2; i++) {
      const n = nums[i].d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      if (dist({ x: n[0], y: n[1] }, { x: n[2], y: n[3] }) < 0.5) zeroInNet++;
    }
  }
  console.log(`N=${N} zeroInNet=${zeroInNet} shortIfWrongApex=${nullViaWrongApex}`);
}
