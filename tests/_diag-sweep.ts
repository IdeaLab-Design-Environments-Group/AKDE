import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import { buildPatternNet } from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

for (const N of [3, 4, 5, 6, 7, 8]) {
  for (const H of [30, 50, 71, 100, 150, 200]) {
    const s = computeState({
      edgeCount: N,
      edgeLength: 100,
      totalCurvature: H,
      materialThickness: 1,
    });
    if (computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness) <= 0) continue;
    const net = buildPatternNet(s);
    const cuts = net.segments.filter((x) => x.role === "cut").slice(1);
    const lens = cuts.map((seg) => {
      const n = seg.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      return dist({ x: n[0], y: n[1] }, { x: n[2], y: n[3] });
    });
    const min = Math.min(...lens);
    if (min < 0.5) {
      console.log(`SHORT N=${N} H=${H} min=${min.toFixed(4)}`);
    }
  }
}
