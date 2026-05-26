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

  it("cut file = single filled body in <g id='cut'> with NO stroke halo around the fill edge", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const cutSegs = net.segments.filter(
      (s) => s.role === "boundary" || s.role === "cut",
    );
    const closedCount = cutSegs.filter((s) => /[zZ]\s*$/.test(s.d.trim())).length;
    // score = valley folds + 2 slant edges per polygon (the face↔molecule fold hinges)
    const polygonCount = net.segments.filter((s) => s.role === "polygon").length;
    const scoreCount =
      net.segments.filter((s) => s.role === "fold").length + 2 * polygonCount;

    // The V-notched boundary + the major-cut hole are both closed paths, so the cut layer is
    // just ONE filled-evenodd path with stroke="none" — no halo around the fill edge, no
    // separate slits, the relief wedges are already outside the silhouette.
    expect(cut.svg).toContain('id="cut"');
    const paths = cut.svg.match(/<path [^>]*\/>/g) ?? [];
    expect(paths.length).toBe(1);

    const body = paths[0]!;
    expect(body).toContain(`fill="${CUT_COLOR}"`);
    expect(body).toContain('fill-rule="evenodd"');
    expect(body).toContain('stroke="none"');
    expect((body.match(/M/g) ?? []).length).toBe(closedCount);

    // score stays as stroked lines, blue, folds only — no polygon slants
    expect((score.svg.match(/<path /g) ?? []).length).toBe(scoreCount);
    expect(score.svg).toContain('id="score"');
    expect(score.svg).toContain(SCORE_COLOR);

    // layers don't bleed into each other
    expect(cut.svg).not.toContain("score");
    expect(cut.svg).not.toContain("molecule");
    expect(score.svg).not.toContain('id="cut"');
  });

  it("the boundary V-notches inward at each molecule (wedges outside the silhouette)", () => {
    const boundary = net.segments.find((s) => s.role === "boundary")!;
    const bp = pts(boundary.d);
    // 3N vertices for N=6 → 18. Equivalently: vertex count is divisible by 3.
    expect(bp.length).toBe(18);
    expect(bp.length % 3).toBe(0);
  });

  it("both files share the same viewBox so they stay registered", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const vb = (svg: string) => svg.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(cut.svg)).toBe(vb(score.svg));
  });

  it("polygon slant edges ARE scored (face↔molecule fold hinges) but NOT cut", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const polygons = net.segments.filter((s) => s.role === "polygon");
    expect(polygons.length).toBeGreaterThan(0);

    // each polygon contributes two slants (tip→outerL, tip→outerR) as score paths
    for (const poly of polygons) {
      const [tip, outerL, outerR] = pts(poly.d);
      for (const corner of [outerL, outerR]) {
        const slantD = `M ${tip!.x} ${tip!.y} L ${corner!.x} ${corner!.y}`;
        expect(score.svg).toContain(slantD);
        // and definitely not cut
        expect(cut.svg).not.toContain(slantD);
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

describe("cut layer: single filled-evenodd body (silhouette + apex hole), no halo, no slits", () => {
  const fakeNet = {
    viewBox: [0, 0, 20, 20] as [number, number, number, number],
    segments: [
      { role: "boundary" as const, d: "M 0 0 L 20 0 L 20 20 L 0 20 Z" },
      { role: "cut" as const, d: "M 5 5 L 15 5 L 15 15 L 5 15 Z" }, // major-cut hole
    ],
  };

  it("emits exactly one filled-evenodd path with no stroke (no fill-edge halo, no slits)", () => {
    const [cut] = buildCricutSvgFiles(fakeNet);
    const paths = cut.svg.match(/<path [^>]*\/>/g) ?? [];
    expect(paths).toHaveLength(1);

    const body = paths[0];
    expect(body).toContain(`fill="${CUT_COLOR}"`);
    expect(body).toContain('fill-rule="evenodd"');
    expect(body).toContain('stroke="none"'); // critical: no stroke around the fill edge
    // body holds both closed cut segments concatenated into one path
    expect(body).toContain("M 0 0 L 20 0 L 20 20 L 0 20 Z");
    expect(body).toContain("M 5 5 L 15 5 L 15 15 L 5 15 Z");
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
