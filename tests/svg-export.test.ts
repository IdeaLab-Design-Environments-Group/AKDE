import { describe, expect, it } from "vitest";
import {
  computeState,
  buildPatternNet,
  buildCricutSvgFiles,
  buildCombinedCricutSvg,
  buildCricutZip,
  buildCricutPreviews,
  buildExportPayload,
  CUT_COLOR,
  SCORE_COLOR,
  LINE_STROKE_WIDTH,
} from "@kirigami/model/index.js";

const STATE = computeState({
  edgeCount: 6,
  edgeLength: 100,
  totalCurvature: 100,
  materialThickness: 1,
});

function pts(d: string): { x: number; y: number }[] {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g)?.map(Number) ?? [];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i], y: nums[i + 1] });
  return out;
}

describe("buildCricutSvgFiles", () => {
  const net = buildPatternNet(STATE);

  it("emits two separate files: cut and score", () => {
    const files = buildCricutSvgFiles(net);
    expect(files.map((f) => f.filename)).toEqual([
      "akde-kirigami-cut.svg",
      "akde-kirigami-score.svg",
    ]);
    for (const f of files) {
      expect(f.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(f.svg).toMatch(/width="[\d.]+mm" height="[\d.]+mm"/);
    }
  });

  it("cut file = filled body in <g id='cut'> with NO stroke halo around the fill edge", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const cutSegs = net.segments.filter(
      (s) => s.role === "boundary" || s.role === "cut" || s.role === "minor-cut",
    );
    const closedCount = cutSegs.filter((s) => /[zZ]\s*$/.test(s.d.trim())).length;
    const openCount = cutSegs.length - closedCount;
    const scoreCount = net.segments.filter((s) => s.role === "fold").length;

    // wrapped in one <g id="cut">; the body path is always emitted, a stroked sibling only
    // when there are open cuts. pattern.ts currently emits all minor cuts as closed triangles,
    // so the real net only needs the body path — and crucially that path has stroke="none",
    // killing the previous halo around the silhouette / apex-hole edge.
    expect(cut.svg).toContain('id="cut"');
    const paths = cut.svg.match(/<path [^>]*\/>/g) ?? [];
    expect(paths.length).toBe(openCount > 0 ? 2 : 1);

    const body = paths.find((p) => p.includes(`fill="${CUT_COLOR}"`))!;
    expect(body).toContain('fill-rule="evenodd"');
    expect(body).toContain('stroke="none"'); // ← the artifact fix
    expect((body.match(/M/g) ?? []).length).toBe(closedCount);

    if (openCount > 0) {
      const minor = paths.find((p) => p.includes('fill="none"'))!;
      expect(minor).toContain(`stroke="${CUT_COLOR}"`);
      expect(minor).toContain(`stroke-width="${LINE_STROKE_WIDTH}"`);
      expect((minor.match(/M/g) ?? []).length).toBe(openCount);
    }

    // score stays as stroked lines, blue, folds only — no polygon slants
    expect((score.svg.match(/<path /g) ?? []).length).toBe(scoreCount);
    expect(score.svg).toContain('id="score"');
    expect(score.svg).toContain(SCORE_COLOR);

    // layers don't bleed into each other
    expect(cut.svg).not.toContain("score");
    expect(cut.svg).not.toContain("molecule");
    expect(score.svg).not.toContain('id="cut"');
  });

  it("minor cuts are SEPARATE lines: no slit endpoint touches the outer boundary", () => {
    const minorCuts = net.segments.filter((s) => s.role === "minor-cut");
    const boundary = net.segments.find((s) => s.role === "boundary")!;
    expect(minorCuts.length).toBeGreaterThan(0);
    const boundaryPts = pts(boundary.d);

    let minGap = Infinity;
    for (const mc of minorCuts) {
      for (const end of pts(mc.d)) {
        for (const b of boundaryPts) {
          minGap = Math.min(minGap, Math.hypot(end.x - b.x, end.y - b.y));
        }
      }
    }
    // every minor-cut endpoint is held clear of every boundary vertex (a real gap, not shared)
    expect(minGap).toBeGreaterThan(0.5);
  });

  it("both files share the same viewBox so they stay registered", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const vb = (svg: string) => svg.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(cut.svg)).toBe(vb(score.svg));
  });

  it("triangle slant edges are NOT exported (neither cut nor score) — only the outer base", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const polygons = net.segments.filter((s) => s.role === "polygon");
    expect(polygons.length).toBeGreaterThan(0);

    // each triangle's tip↔outerL and tip↔outerR endpoints should not appear in either layer
    // (the outer base is on the boundary anyway, just check the slant-specific endpoints)
    for (const poly of polygons) {
      const [tip, outerL, outerR] = pts(poly.d);
      for (const corner of [outerL, outerR]) {
        const slantLineD = `${tip.x} ${tip.y} L ${corner.x} ${corner.y}`;
        const slantLineDRev = `${corner.x} ${corner.y} L ${tip.x} ${tip.y}`;
        expect(score.svg).not.toContain(slantLineD);
        expect(score.svg).not.toContain(slantLineDRev);
        expect(cut.svg).not.toContain(slantLineD);
        expect(cut.svg).not.toContain(slantLineDRev);
      }
    }
  });
});

describe("buildCombinedCricutSvg", () => {
  const net = buildPatternNet(STATE);

  it("emits one mm-sized SVG with a filled cut unibody and a stroked score layer", () => {
    const file = buildCombinedCricutSvg(net);
    expect(file).not.toBeNull();
    expect(file!.filename).toBe("akde-kirigami-combined.svg");
    expect(file!.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(file!.svg).toMatch(/width="[\d.]+mm" height="[\d.]+mm"/);
    expect(file!.svg).toContain('id="cut"');
    expect(file!.svg).toContain('id="score"');
    // cut layer is filled (unibody with holes), score layer is stroked lines
    expect(file!.svg).toContain(`fill="${CUT_COLOR}"`);
    expect(file!.svg).toContain('fill-rule="evenodd"');
    expect(file!.svg).toContain(`stroke="${SCORE_COLOR}"`);
  });

  it("holds the same paths as the two separate files combined", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const combined = buildCombinedCricutSvg(net)!;
    const count = (svg: string) => (svg.match(/<path /g) ?? []).length;
    expect(count(combined.svg)).toBe(count(cut.svg) + count(score.svg));
  });

  it("shares the viewBox of the two-file export", () => {
    const [cut] = buildCricutSvgFiles(net);
    const combined = buildCombinedCricutSvg(net)!;
    const vb = (svg: string) => svg.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(combined.svg)).toBe(vb(cut.svg));
  });
});

describe("cut layer: filled body + stroked minor cuts in one group (no fill-edge halo)", () => {
  const fakeNet = {
    viewBox: [0, 0, 20, 20] as [number, number, number, number],
    segments: [
      { role: "boundary" as const, d: "M 0 0 L 20 0 L 20 20 L 0 20 Z" },
      { role: "cut" as const, d: "M 5 5 L 15 5 L 15 15 L 5 15 Z" }, // major-cut hole
      { role: "minor-cut" as const, d: "M 6 10 L 9 10" }, // single-line slit
      { role: "minor-cut" as const, d: "M 11 10 L 14 10" },
    ],
  };

  it("splits into two paths: filled body (no stroke = no halo) and stroked minor cuts", () => {
    const [cut] = buildCricutSvgFiles(fakeNet);
    const paths = cut.svg.match(/<path [^>]*\/>/g) ?? [];
    expect(paths).toHaveLength(2);

    const body = paths.find((p) => p.includes(`fill="${CUT_COLOR}"`))!;
    expect(body).toContain('fill-rule="evenodd"');
    expect(body).toContain('stroke="none"'); // critical: no stroke around the fill edge
    // body holds exactly the two closed cut segments
    expect(body).toContain("M 0 0 L 20 0 L 20 20 L 0 20 Z");
    expect(body).toContain("M 5 5 L 15 5 L 15 15 L 5 15 Z");
    // and does NOT hold the open minor-cut lines
    expect(body).not.toContain("M 6 10 L 9 10");
    expect(body).not.toContain("M 11 10 L 14 10");

    const minor = paths.find((p) => p.includes('fill="none"'))!;
    expect(minor).toContain(`stroke="${CUT_COLOR}"`);
    expect(minor).toContain("M 6 10 L 9 10");
    expect(minor).toContain("M 11 10 L 14 10");
  });

  it("minor cuts have no perpendicular back-end caps (open lines, not closed rectangles)", () => {
    const [cut] = buildCricutSvgFiles(fakeNet);
    const minor = (cut.svg.match(/<path [^>]*\/>/g) ?? []).find((p) =>
      p.includes('fill="none"'),
    )!;
    const minorD = minor.match(/ d="([^"]*)"/)?.[1] ?? "";
    expect(minorD).not.toMatch(/[zZ]/); // never closed = no caps
    const subs = minorD.split(/(?=M )/).map((s) => s.trim()).filter(Boolean);
    expect(subs).toHaveLength(2);
    for (const sub of subs) expect(pts(sub)).toHaveLength(2);
  });
});

describe("buildCricutZip", () => {
  const net = buildPatternNet(STATE);

  it("packs both SVGs into one zip under a single folder", () => {
    const archive = buildCricutZip(net);
    expect(archive).not.toBeNull();
    expect(archive!.filename).toBe("akde-kirigami.zip");

    const bytes = archive!.bytes;
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("akde-kirigami/akde-kirigami-cut.svg");
    expect(text).toContain("akde-kirigami/akde-kirigami-score.svg");
    expect(text).toContain('id="cut"');
    expect(text).toContain('id="score"');
  });
});

describe("buildCricutPreviews", () => {
  const net = buildPatternNet(STATE);

  it("cut/score/both previews carry the right colours and share an origin", () => {
    const p = buildCricutPreviews(net);
    expect(p.cut).toContain(CUT_COLOR);
    expect(p.cut).not.toContain(SCORE_COLOR);
    expect(p.score).toContain(SCORE_COLOR);
    expect(p.score).not.toContain(CUT_COLOR);
    expect(p.both).toContain(CUT_COLOR);
    expect(p.both).toContain(SCORE_COLOR);

    const vb = (s: string) => s.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(p.cut)).toBe(vb(p.both));
    expect(vb(p.score)).toBe(vb(p.both));
    expect(p.both).toContain("non-scaling-stroke");
  });

  it("buildExportPayload bundles previews, the zip archive, and the combined SVG", () => {
    const payload = buildExportPayload(net);
    expect(payload).not.toBeNull();
    expect(payload!.archive.filename).toBe("akde-kirigami.zip");
    expect(payload!.combined?.filename).toBe("akde-kirigami-combined.svg");
    expect(payload!.combined?.svg).toContain("<svg");
    expect(payload!.previews.cut).toContain("<svg");
    expect(payload!.previews.both).toContain("<svg");
  });
});
