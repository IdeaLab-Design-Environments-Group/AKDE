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
function distPointToSegment(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

const rp = (r: number, a: number): Pt => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
const phase = (s: KirigamiState): number => -Math.PI / 2 - s.eta / 2;

for (const N of [4, 5]) {
  const s = computeState({ edgeCount: N, edgeLength: 100, totalCurvature: 71, materialThickness: 1 });
  const net = buildPatternNet(s);
  const cuts = net.segments.filter((x) => x.role === "cut").slice(1);
  let maxDistToChord = 0;
  for (let k = 0; k < N; k++) {
    const al = (kk: number): number => kk * s.tau + phase(s);
    const ar = (kk: number): number => kk * s.tau + s.eta + phase(s);
    const mol: [Pt, Pt, Pt, Pt] = [
      rp(s.rApex, ar(k)),
      rp(s.rApex, al((k + 1) % N)),
      rp(s.s, al((k + 1) % N)),
      rp(s.s, ar(k)),
    ];
    const { p2, p3 } = moleculeSlantOuterVertices(mol, moleculeApex(mol));
    for (let i = 0; i < 2; i++) {
      const n = cuts[2 * k + i].d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      const a = { x: n[0], y: n[1] };
      const b = { x: n[2], y: n[3] };
      const d1 = distPointToSegment(b, p2, p3);
      const d2 = distPointToSegment(a, p2, p3);
      maxDistToChord = Math.max(maxDistToChord, d1, d2);
    }
  }
  console.log(`N=${N} max endpoint dist to outer chord`, maxDistToChord.toFixed(4));
}
