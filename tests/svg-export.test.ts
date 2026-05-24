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

describe("buildCricutSvgFiles", () => {
  const state = computeState({
    edgeCount: 6,
    edgeLength: 100,
    totalCurvature: 100,
    materialThickness: 1,
  });
  const net = buildPatternNet(state);

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

  it("cut file = one stroked line <path> per cut segment (boundary + interior cuts), black", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const cutCount = net.segments.filter(
      (s) => s.role === "boundary" || s.role === "cut",
    ).length;
    const polygonCount = net.segments.filter((s) => s.role === "polygon").length;
    // valley creases + two slant side edges per polygon
    const scoreCount =
      net.segments.filter((s) => s.role === "fold").length + 2 * polygonCount;

    // each cut is its own line path — NOT one welded compound path
    expect((cut.svg.match(/<path /g) ?? []).length).toBe(cutCount);
    expect(cut.svg).toContain('id="cut"');
    expect(cut.svg).toContain(`stroke="${CUT_COLOR}"`);
    expect(cut.svg).not.toContain("fill-rule"); // not a filled compound shape
    // every cut path is explicitly fill:none stroked (survives Cricut group flattening)
    for (const p of cut.svg.match(/<path [^>]*\/>/g) ?? []) {
      expect(p).toContain('fill="none"');
      expect(p).toContain(`stroke="${CUT_COLOR}"`);
    }

    // score stays stroked lines, blue
    expect((score.svg.match(/<path /g) ?? []).length).toBe(scoreCount);
    expect(score.svg).toContain('id="score"');
    expect(score.svg).toContain('stroke="#0000ff"');

    // neither file mixes the other operation or the visual face geometry
    expect(cut.svg).not.toContain("score");
    expect(score.svg).not.toContain('id="cut"');
    expect(cut.svg).not.toContain("molecule");
  });

  it("both files share the same viewBox so they stay registered", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const vb = (svg: string) => svg.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(cut.svg)).toBe(vb(score.svg));
  });
});

describe("buildCombinedCricutSvg", () => {
  const net = buildPatternNet(
    computeState({ edgeCount: 6, edgeLength: 100, totalCurvature: 100, materialThickness: 1 }),
  );

  it("emits one mm-sized SVG with stroked cut and score line layers", () => {
    const file = buildCombinedCricutSvg(net);
    expect(file).not.toBeNull();
    expect(file!.filename).toBe("akde-kirigami-combined.svg");
    expect(file!.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(file!.svg).toMatch(/width="[\d.]+mm" height="[\d.]+mm"/);

    // both layers are stroked lines, colour-coded by operation
    expect(file!.svg).toContain('id="cut"');
    expect(file!.svg).toContain('id="score"');
    expect(file!.svg).toContain(`stroke="${CUT_COLOR}"`);
    expect(file!.svg).toContain(`stroke="${SCORE_COLOR}"`);
  });

  it("holds the same paths as the two separate files combined", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const combined = buildCombinedCricutSvg(net)!;
    const count = (svg: string) => (svg.match(/<path /g) ?? []).length;
    expect(count(combined.svg)).toBe(count(cut.svg) + count(score.svg));
  });

  it("shares the viewBox of the two-file export so it registers and sizes the same", () => {
    const [cut] = buildCricutSvgFiles(net);
    const combined = buildCombinedCricutSvg(net)!;
    const vb = (svg: string) => svg.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(combined.svg)).toBe(vb(cut.svg));
  });
});

describe("cuts export as separate line paths (not one compound path)", () => {
  it("each cut segment is its own <path> with its exact geometry preserved", () => {
    // boundary + major cut + two minor slits → four distinct line paths
    const fakeNet = {
      viewBox: [0, 0, 20, 20] as [number, number, number, number],
      segments: [
        { role: "boundary" as const, d: "M 0 0 L 20 0 L 20 20 L 0 20 Z" },
        { role: "cut" as const, d: "M 5 5 L 15 5 L 15 15 L 5 15 Z" }, // major cut
        { role: "cut" as const, d: "M 6 10 L 9 10" }, // minor slit
        { role: "cut" as const, d: "M 11 10 L 14 10" }, // minor slit
      ],
    };
    const [cut] = buildCricutSvgFiles(fakeNet);

    // one <path> element per cut segment — not merged
    const paths = cut.svg.match(/<path [^>]*\/>/g) ?? [];
    expect(paths.length).toBe(4);

    // each segment's exact `d` survives verbatim as its own path (open slits stay open lines)
    for (const seg of fakeNet.segments) {
      expect(cut.svg).toContain(`d="${seg.d}"`);
    }
    // and they are stroked lines, not a filled compound shape
    expect(cut.svg).not.toContain("fill-rule");
    expect(cut.svg).toContain(`stroke-width="${LINE_STROKE_WIDTH}"`);
  });
});

describe("buildCricutZip", () => {
  const net = buildPatternNet(
    computeState({ edgeCount: 6, edgeLength: 100, totalCurvature: 100, materialThickness: 1 }),
  );

  it("packs both SVGs into one zip under a single folder", () => {
    const archive = buildCricutZip(net);
    expect(archive).not.toBeNull();
    expect(archive!.filename).toBe("akde-kirigami.zip");

    const bytes = archive!.bytes;
    // ZIP local file header signature "PK\x03\x04"
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    // STORE (uncompressed) → entry names and SVG text are visible in the bytes
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("akde-kirigami/akde-kirigami-cut.svg");
    expect(text).toContain("akde-kirigami/akde-kirigami-score.svg");
    expect(text).toContain('id="cut"');
    expect(text).toContain('id="score"');
  });
});

describe("buildCricutPreviews", () => {
  const net = buildPatternNet(
    computeState({ edgeCount: 6, edgeLength: 100, totalCurvature: 100, materialThickness: 1 }),
  );

  it("cut/score/both previews carry the right colours and share an origin", () => {
    const p = buildCricutPreviews(net);
    expect(p.cut).toContain(CUT_COLOR);
    expect(p.cut).not.toContain(SCORE_COLOR);
    expect(p.score).toContain(SCORE_COLOR);
    expect(p.score).not.toContain(CUT_COLOR);
    expect(p.both).toContain(CUT_COLOR);
    expect(p.both).toContain(SCORE_COLOR);

    // same viewBox ⇒ same origin/scale, so the "both" overlay registers
    const vb = (s: string) => s.match(/viewBox="([^"]+)"/)?.[1];
    expect(vb(p.cut)).toBe(vb(p.both));
    expect(vb(p.score)).toBe(vb(p.both));
    // strokes stay visible at thumbnail size
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
