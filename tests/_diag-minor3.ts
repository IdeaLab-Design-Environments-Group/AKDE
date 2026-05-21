import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import {
  buildPatternNet,
  cornerCutFoldSegments,
  moleculeSlantOuterVertices,
  moleculeTopEdgeMidpoint,
  moleculeInnerVertices,
  minorCutEndpointOnValleyFold,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
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

// Use shifted apex from net (first segment uses shifted O)
const cutSegs = net.segments.filter((x) => x.role === "cut").slice(1);
console.log("N=5 net minor cuts (first 2):");
for (let i = 0; i < 2; i++) {
  const nums = cutSegs[i].d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const a = { x: nums[0], y: nums[1] };
  const b = { x: nums[2], y: nums[3] };
  console.log(" ", i, "len", dist(a, b).toFixed(3), "d", cutSegs[i].d.slice(0, 60));
}

// Rebuild first molecule like buildPatternNet (approximate - need state vars)
const tau = s.tau;
const eta = s.eta;
const rApex = s.rApex;
const phaseOffset = -Math.PI / 2 - eta / 2;
const ringPoint = (radius: number, angle: number): Pt => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});
const k = 0;
const angleLeft = (kk: number): number => kk * tau + phaseOffset;
const angleRight = (kk: number): number => kk * tau + eta + phaseOffset;
const innerL = ringPoint(rApex, angleRight(k));
const innerR = ringPoint(rApex, angleLeft((k + 1) % N));
const outerR = ringPoint(s.s, angleLeft((k + 1) % N));
const outerL = ringPoint(s.s, angleRight(k));
const mol: [Pt, Pt, Pt, Pt] = [innerL, innerR, outerR, outerL];
const apex: Pt = { x: 0, y: 0 };
const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
const topMid = moleculeTopEdgeMidpoint(mol, apex);
const [iL, iR] = moleculeInnerVertices(mol, apex);
const innerMid = { x: (iL.x + iR.x) / 2, y: (iL.y + iR.y) / 2 };

console.log("\nUnshifted mol0:");
console.log("dist p2-apex", dist(p2, apex).toFixed(2), "dist p2-topMid", dist(p2, topMid).toFixed(2));
console.log("minorLen", minorLen.toFixed(2));
const { minorCuts } = cornerCutFoldSegments(mol, minorLen, apex);
console.log(
  "cuts",
  minorCuts.map((c) => dist(c.start, c.end).toFixed(2)),
);

const end = minorCutEndpointOnValleyFold(p2, topMid, innerMid, apex, sub(p2, p3), minorLen);
console.log("endpoint dist", end ? dist(p2, end).toFixed(2) : "null");

for (const M of [3, 4, 5, 6, 7]) {
  const st = computeState({
    edgeCount: M,
    edgeLength: 100,
    totalCurvature: 71,
    materialThickness: 1,
  });
  const nnet = buildPatternNet(st);
  const cuts = nnet.segments.filter((x) => x.role === "cut").slice(1);
  const lens = cuts.map((seg) => {
    const n = seg.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    return dist({ x: n[0], y: n[1] }, { x: n[2], y: n[3] });
  });
  console.log(
    `N=${M} cut len min=${Math.min(...lens).toFixed(2)} max=${Math.max(...lens).toFixed(2)} zero=${lens.filter((l) => l < 0.5).length}`,
  );
}
