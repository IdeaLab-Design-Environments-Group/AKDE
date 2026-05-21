import { computeState } from "@kirigami/model/index.js";
import { buildPatternNet } from "@kirigami/model/pattern.js";

for (const N of [4, 5]) {
  const s = computeState({
    edgeCount: N,
    edgeLength: 100,
    totalCurvature: 71,
    materialThickness: 1,
  });
  const net = buildPatternNet(s);
  const [vx, vy, vw, vh] = net.viewBox;
  const cuts = net.segments.filter((x) => x.role === "cut").slice(1);
  let outside = 0;
  for (const seg of cuts) {
    const n = seg.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < n.length; i += 2) {
      const x = n[i];
      const y = n[i + 1];
      if (x < vx || x > vx + vw || y < vy || y > vy + vh) outside++;
    }
  }
  console.log(`N=${N} viewBox`, net.viewBox, "points outside", outside);
}
