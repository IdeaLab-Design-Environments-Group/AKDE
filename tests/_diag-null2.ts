import { computeState, computeMinorCutLength } from "@kirigami/model/index.js";
import type { KirigamiState } from "@kirigami/model/index.js";
import {
  minorCutEndpointOnValleyFold,
  moleculeSlantOuterVertices,
  moleculeTopEdgeMidpoint,
  moleculeInnerVertices,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const phase = (s: KirigamiState): number => -Math.PI / 2 - s.eta / 2;
const rp = (r: number, a: number): Pt => ({ x: r * Math.cos(a), y: r * Math.sin(a) });

let nullCount = 0;
for (const N of [3, 4, 5, 6, 7, 8, 10, 12]) {
  for (const H of [10, 20, 30, 50, 71, 100, 150, 250, 400]) {
    const s = computeState({
      edgeCount: N,
      edgeLength: 100,
      totalCurvature: H,
      materialThickness: 1,
    });
    const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness);
    if (minorLen <= 0) continue;
    for (let k = 0; k < N; k++) {
      const al = (kk: number): number => kk * s.tau + phase(s);
      const ar = (kk: number): number => kk * s.tau + s.eta + phase(s);
      const mol: [Pt, Pt, Pt, Pt] = [
        rp(s.rApex, ar(k)),
        rp(s.rApex, al((k + 1) % N)),
        rp(s.s, al((k + 1) % N)),
        rp(s.s, ar(k)),
      ];
      const apex: Pt = { x: 0, y: 0 };
      const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
      const topMid = moleculeTopEdgeMidpoint(mol, apex);
      const [iL, iR] = moleculeInnerVertices(mol, apex);
      const innerMid = {
        x: (iL.x + iR.x) / 2,
        y: (iL.y + iR.y) / 2,
      };
      for (const start of [p2, p3]) {
        const end = minorCutEndpointOnValleyFold(
          start,
          topMid,
          innerMid,
          apex,
          sub(p2, p3),
          minorLen,
        );
        if (!end || dist(start, end) < 1e-9) {
          console.log(`NULL N=${N} H=${H} k=${k} minorLen=${minorLen.toFixed(3)}`);
          nullCount++;
        }
      }
    }
  }
}
console.log("total null/zero", nullCount);
