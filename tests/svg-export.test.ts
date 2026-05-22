import { describe, expect, it } from "vitest";
import {
  computeState,
  buildPatternNet,
  buildCricutSvgFiles,
  buildCricutZip,
  buildCricutPreviews,
  buildExportPayload,
  CUT_COLOR,
  SCORE_COLOR,
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

  it("cut file = boundary + cut (black); score file = folds + polygon side edges (blue)", () => {
    const [cut, score] = buildCricutSvgFiles(net);
    const cutCount = net.segments.filter(
      (s) => s.role === "boundary" || s.role === "cut",
    ).length;
    const polygonCount = net.segments.filter((s) => s.role === "polygon").length;
    // valley creases + two slant side edges per polygon
    const scoreCount =
      net.segments.filter((s) => s.role === "fold").length + 2 * polygonCount;

    expect((cut.svg.match(/<path /g) ?? []).length).toBe(cutCount);
    expect(cut.svg).toContain('id="cut"');
    expect(cut.svg).toContain('stroke="#000000"');

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

  it("buildExportPayload bundles previews and the zip archive", () => {
    const payload = buildExportPayload(net);
    expect(payload).not.toBeNull();
    expect(payload!.archive.filename).toBe("akde-kirigami.zip");
    expect(payload!.previews.cut).toContain("<svg");
    expect(payload!.previews.both).toContain("<svg");
  });
});
