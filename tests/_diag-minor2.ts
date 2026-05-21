import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import {
  buildPatternNet,
  cornerCutFoldSegments,
  moleculeSlantOuterVertices,
  moleculeTopEdgeMidpoint,
  moleculeInnerVertices,
  moleculeApex,
  minorCutEndpointOnValleyFold,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function parsePathPoints(d: string): Pt[] {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function dot(a: Pt, b: Pt): number {
  return a.x * b.x + a.y * b.y;
}

const N = 5;
const s = computeState({
  edgeCount: N,
  edgeLength: 100,
  totalCurvature: 71,
  materialThickness: 1,
});
const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness);
const net = buildPatternNet(s);
const mols = net.segments.filter((x) => x.role === "molecule");
const molPts = parsePathPoints(mols[0].d);
const mol: [Pt, Pt, Pt, Pt] = [molPts[0], molPts[1], molPts[2], molPts[molPts.length - 1]];
const apex = moleculeApex(mol);
const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
const topMid = moleculeTopEdgeMidpoint(mol, apex);
const [innerL, innerR] = moleculeInnerVertices(mol, apex);
const innerMid = {
  x: (innerL.x + innerR.x) / 2,
  y: (innerL.y + innerR.y) / 2,
};
const topEdge = sub(p2, p3);

console.log("N=5 L=100 H=71");
console.log("minorLen", minorLen, "w", s.w);
console.log("dist p2-topMid", dist(p2, topMid), "dist p2-innerMid", dist(p2, innerMid));
console.log("dist p2-apex", dist(p2, apex), "dist topMid-apex", dist(topMid, apex));

const cases: [string, Pt][] = [
  ["p2", p2],
  ["p3", p3],
];
for (const [name, start] of cases) {
  const end = minorCutEndpointOnValleyFold(
    start,
    topMid,
    innerMid,
    apex,
    topEdge,
    minorLen,
  );
  console.log(name, "end", end ? dist(start, end).toFixed(3) : "null");
  if (end) {
    const towardCenter = sub(apex, start);
    console.log(
      "  inward dot",
      dot(sub(end, start), towardCenter),
      "rEnd<=rStart",
      dist(end, apex) <= dist(start, apex) + 1e-9,
    );
  }
}

const { minorCuts } = cornerCutFoldSegments(mol, minorLen, apex);
console.log("cornerCutFoldSegments", minorCuts.map((c) => dist(c.start, c.end)));
