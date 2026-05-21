import { computeState } from "@kirigami/model/index.js";
import type { KirigamiState } from "@kirigami/model/index.js";
import {
  buildPatternNet,
  moleculeSlantOuterVertices,
  moleculeApex,
} from "@kirigami/model/pattern.js";

type Pt = { x: number; y: number };
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function pointOnSegment(p: Pt, a: Pt, b: Pt, tol = 1e-4): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return dist(p, a) <= tol;
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  if (t < -1e-6 || t > 1 + 1e-6) return false;
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t }) <= tol;
}

const rp = (r: number, a: number): Pt => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
const phase = (s: KirigamiState): number => -Math.PI / 2 - s.eta / 2;

for (const N of [3, 4, 5, 6, 7]) {
  const s = computeState({
    edgeCount: N,
    edgeLength: 100,
    totalCurvature: 71,
    materialThickness: 1,
  });
  const net = buildPatternNet(s);
  const cuts = net.segments.filter((x) => x.role === "cut").slice(1);
  let onChord = 0;
  let short = 0;
  for (let k = 0; k < N; k++) {
    const al = (kk: number): number => kk * s.tau + phase(s);
    const ar = (kk: number): number => kk * s.tau + s.eta + phase(s);
    const mol: [Pt, Pt, Pt, Pt] = [
      rp(s.rApex, ar(k)),
      rp(s.rApex, al((k + 1) % N)),
      rp(s.s, al((k + 1) % N)),
      rp(s.s, ar(k)),
    ];
    const apex = moleculeApex(mol);
    const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
    for (let i = 0; i < 2; i++) {
      const seg = cuts[2 * k + i];
      const n = seg.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      const a = { x: n[0], y: n[1] };
      const b = { x: n[2], y: n[3] };
      const len = dist(a, b);
      if (len < 0.5) short++;
      if (pointOnSegment(b, p2, p3) || pointOnSegment(a, p2, p3)) {
        // entire segment on chord?
        if (pointOnSegment(b, p2, p3) && pointOnSegment(a, p2, p3)) onChord++;
      }
    }
  }
  console.log(`N=${N} onOuterChord=${onChord} short=${short}`);
}
