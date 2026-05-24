import { describe, expect, it } from "vitest";
import { computeState } from "@kirigami/model/index.js";
import { computeMinorCutLength } from "@kirigami/model/index.js";
import {
  buildPatternNet,
  cornerCutFoldSegments,
  cornerMoleculeTrapezoid,
  injectPolyTipsCW,
  moleculeApex,
  moleculeFillInteriorPoint,
  moleculeFillPolygon,
  moleculeInnerVertices,
  moleculeMinorCutEndpoints,
  moleculeSlantOuterVertices,
  moleculeTopEdgeMidpoint,
  moleculeTrapezoidFromOutlinePath,
} from "@kirigami/model/pattern.js";

function parsePathPoints(d: string): { x: number; y: number }[] {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPt(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function eqPt(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tol = 1e-4,
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= tol;
}

function pointOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  tol = 1e-3,
): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) {
    return eqPt(p, a, tol);
  }
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  if (t < -1e-6 || t > 1 + 1e-6) {
    return false;
  }
  const px = a.x + abx * t;
  const py = a.y + aby * t;
  return Math.hypot(p.x - px, p.y - py) <= tol;
}

function dot(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return a.x * b.x + a.y * b.y;
}

/** Ray-casting point-in-polygon (simple polygon, consistent winding). */
function pointInPolygon(
  p: { x: number; y: number },
  verts: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x;
    const yi = verts[i].y;
    const xj = verts[j].x;
    const yj = verts[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 0) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function trapezoidFromPath(pts: { x: number; y: number }[]) {
  return moleculeTrapezoidFromOutlinePath(pts);
}

describe("buildPatternNet (Figure 2 apex-centered fan)", () => {
  const state = computeState({
    edgeCount: 4,
    edgeLength: 100,
    totalCurvature: 100 / Math.SQRT2,
    materialThickness: 1,
  });

  it("produces N polygons + N molecules + N folds + major + minor cuts + boundary", () => {
    const net = buildPatternNet(state);
    const polygons = net.segments.filter((s) => s.role === "polygon");
    const molecules = net.segments.filter((s) => s.role === "molecule");
    const folds = net.segments.filter((s) => s.role === "fold");
    const cuts = net.segments.filter((s) => s.role === "cut");
    const minorCuts = net.segments.filter((s) => s.role === "minor-cut");
    const boundaries = net.segments.filter((s) => s.role === "boundary");
    const N = 4;

    expect(polygons.length).toBe(N);
    expect(molecules.length).toBe(N);
    expect(folds.length).toBe(N);
    expect(cuts.length).toBe(1); // the single major (apex-hole) cut
    expect(minorCuts.length).toBe(N); // one triangular minor cut (relief wedge) per molecule
    expect(boundaries.length).toBe(1);
    expect(net.viewBox[2]).toBeGreaterThan(0);
    expect(net.viewBox[3]).toBeGreaterThan(0);
  });

  it("polygons are triangles with tip on the major-cut boundary; outer base has length L", () => {
    const net = buildPatternNet(state);
    const polygons = net.segments.filter((s) => s.role === "polygon");
    const tips: { x: number; y: number }[] = [];
    for (const poly of polygons) {
      const pts = parsePathPoints(poly.d);
      expect(pts.length).toBe(3);
      tips.push(pts[0]);
      const outerBaseLen = dist(pts[1], pts[2]);
      expect(outerBaseLen).toBeCloseTo(100, 3);
    }
    const centroid = {
      x: tips.reduce((a, p) => a + p.x, 0) / tips.length,
      y: tips.reduce((a, p) => a + p.y, 0) / tips.length,
    };
    const r0 = dist(centroid, tips[0]);
    for (const tip of tips) {
      expect(dist(centroid, tip)).toBeCloseTo(r0, 4);
    }
  });

  it("molecule outer-chord length equals state.w", () => {
    const net = buildPatternNet(state);
    const molecules = net.segments.filter((s) => s.role === "molecule");
    for (const mol of molecules) {
      const pts = parsePathPoints(mol.d);
      const [_, __, p2, p3] = trapezoidFromPath(pts);
      const outerChord = dist(p2, p3);
      expect(outerChord).toBeCloseTo(state.w, 3);
    }
  });

  it("outerEdgeLength sets each polygon's outer-base length (default L unchanged)", () => {
    const base = buildPatternNet(state).segments.filter((x) => x.role === "polygon");
    for (const poly of base) {
      const pts = parsePathPoints(poly.d);
      expect(dist(pts[1], pts[2])).toBeCloseTo(100, 3); // default L_o = L = 100
    }

    const wide = computeState({
      edgeCount: 4,
      edgeLength: 100,
      outerEdgeLength: 60,
      totalCurvature: 100 / Math.SQRT2,
      materialThickness: 1,
    });
    const net = buildPatternNet(wide);
    for (const poly of net.segments.filter((x) => x.role === "polygon")) {
      const pts = parsePathPoints(poly.d);
      expect(dist(pts[1], pts[2])).toBeCloseTo(60, 3);
    }
    // Outer 2N-gon still closes: molecule chords absorb the difference and grow past w.
    const molecules = net.segments.filter((x) => x.role === "molecule");
    for (const mol of molecules) {
      const [, , p2, p3] = trapezoidFromPath(parsePathPoints(mol.d));
      expect(dist(p2, p3)).toBeGreaterThan(wide.w);
    }
  });

  it("molecule outer corners coincide with adjacent polygons' outer base vertices", () => {
    const net = buildPatternNet(state);
    const polygons = net.segments.filter((s) => s.role === "polygon");
    const molecules = net.segments.filter((s) => s.role === "molecule");
    const N = polygons.length;
    const polyOuterR = polygons.map((p) => parsePathPoints(p.d)[2]);
    const polyOuterL = polygons.map((p) => parsePathPoints(p.d)[1]);

    for (let k = 0; k < N; k++) {
      const molPts = parsePathPoints(molecules[k].d);
      const [_, __, p2, p3] = trapezoidFromPath(molPts);
      expect(eqPt(p2, polyOuterL[(k + 1) % N], 1e-6)).toBe(true);
      expect(eqPt(p3, polyOuterR[k], 1e-6)).toBe(true);
    }
  });

  it("boundary is a 2N-gon alternating polygon bases (L) and molecule chords (w)", () => {
    const net = buildPatternNet(state);
    const boundary = net.segments.find((s) => s.role === "boundary");
    expect(boundary).toBeDefined();
    const pts = parsePathPoints(boundary!.d);
    const N = 4;
    expect(pts.length).toBe(2 * N);

    for (let k = 0; k < N; k++) {
      const triLeft = pts[2 * k];
      const triRight = pts[2 * k + 1];
      const nextTriLeft = pts[(2 * k + 2) % (2 * N)];
      expect(dist(triLeft, triRight)).toBeCloseTo(100, 2);
      expect(dist(triRight, nextTriLeft)).toBeCloseTo(state.w, 2);
    }
  });

  it("folds run from outer-chord midpoint to inner-chord midpoint of each molecule", () => {
    const net = buildPatternNet(state);
    const molecules = net.segments.filter((s) => s.role === "molecule");
    const folds = net.segments.filter((s) => s.role === "fold");

    expect(folds.length).toBe(molecules.length);
    for (let k = 0; k < folds.length; k++) {
      const foldPts = parsePathPoints(folds[k].d);
      expect(foldPts.length).toBe(2);
      const molPts = trapezoidFromPath(parsePathPoints(molecules[k].d));
      const outerMid = moleculeTopEdgeMidpoint(molPts);
      const innerMid = {
        x: (molPts[0].x + molPts[1].x) / 2,
        y: (molPts[0].y + molPts[1].y) / 2,
      };
      const matchesA =
        eqPt(foldPts[0], outerMid, 1e-6) && eqPt(foldPts[1], innerMid, 1e-6);
      const matchesB =
        eqPt(foldPts[1], outerMid, 1e-6) && eqPt(foldPts[0], innerMid, 1e-6);
      expect(matchesA || matchesB).toBe(true);
    }
  });

  it("works for N=3 and N=6", () => {
    for (const N of [3, 6]) {
      const s = computeState({
        edgeCount: N,
        edgeLength: 100,
        totalCurvature: 100,
        materialThickness: 1,
      });
      const net = buildPatternNet(s);
      expect(net.segments.filter((x) => x.role === "polygon").length).toBe(N);
      expect(net.segments.filter((x) => x.role === "molecule").length).toBe(N);
      expect(net.segments.filter((x) => x.role === "fold").length).toBe(N);
      expect(net.segments.filter((x) => x.role === "cut").length).toBe(1);
      expect(net.segments.filter((x) => x.role === "minor-cut").length).toBe(N);
      expect(net.segments.filter((x) => x.role === "boundary").length).toBe(1);
    }
  });

  it("minor cuts and clipped fill for N=3..8 with valid L,H", () => {
    const L = 100;
    const T = 1;

    function polygonArea(verts: { x: number; y: number }[]) {
      let a = 0;
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
      }
      return Math.abs(a) / 2;
    }

    for (const N of [3, 4, 5, 6, 7, 8]) {
      const H = L / Math.SQRT2;
      const s = computeState({
        edgeCount: N,
        edgeLength: L,
        totalCurvature: H,
        materialThickness: T,
      });
      const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness, s.theta, s.rApex);
      const net = buildPatternNet(s);
      const molecules = net.segments.filter((x) => x.role === "molecule");
      const fills = net.segments.filter((x) => x.role === "molecule-fill");
      const minorCutSegs = net.segments.filter((x) => x.role === "minor-cut");

      expect(molecules.length).toBe(N);
      expect(minorCutSegs.length).toBe(N); // one triangular minor cut per molecule

      for (let k = 0; k < N; k++) {
        const mol = trapezoidFromPath(parsePathPoints(molecules[k].d));
        const apex = moleculeApex(mol);
        const topMid = moleculeTopEdgeMidpoint(mol, apex);
        const [innerL, innerR] = moleculeInnerVertices(mol, apex);
        const innerMid = lerpPt(innerL, innerR, 0.5);
        const { minorCuts } = cornerCutFoldSegments(mol, minorLen, apex);
        expect(minorCuts.length).toBe(2);
        for (const minorCut of minorCuts) {
          const cutLen = dist(minorCut.start, minorCut.end);
          expect(cutLen).toBeGreaterThan(0.5);
          // Cut equals the dihedral-derived target ℓ = w·tan((π−γ)/2). When
          // ℓ ≥ w/2 the endpoint sits on the topMid→innerMid valley fold;
          // when ℓ < w/2 it sits along start→innerMid (inside the molecule),
          // so the slit is visible rather than buried on the outer chord.
          expect(cutLen).toBeLessThanOrEqual(minorLen + 1e-6);
          const onFold = pointOnSegment(minorCut.end, topMid, innerMid, 1e-4);
          const onAimLine = pointOnSegment(
            minorCut.end,
            minorCut.start,
            innerMid,
            1e-4,
          );
          expect(onFold || onAimLine).toBe(true);
        }

        const fillVerts = parsePathPoints(fills[k].d);
        const bodyPt = moleculeFillInteriorPoint(mol, minorLen, apex);

        expect(polygonArea(fillVerts)).toBeGreaterThan(1);
        expect(pointInPolygon(bodyPt, fillVerts)).toBe(true);
      }
    }
  });

  it("each molecule's minor cut is a closed relief triangle gapped inside its outer corners", () => {
    const net = buildPatternNet(state);
    const molecules = net.segments.filter((s) => s.role === "molecule");
    const expectedLen = computeMinorCutLength(state.gamma, state.w, state.inputs.materialThickness, state.theta, state.rApex);
    const N = molecules.length;

    expect(expectedLen).toBeGreaterThan(0);

    const minorCuts = net.segments.filter((s) => s.role === "minor-cut");
    expect(minorCuts.length).toBe(N); // one triangular wedge per molecule

    for (let k = 0; k < N; k++) {
      const molPts = trapezoidFromPath(parsePathPoints(molecules[k].d));
      const apex = moleculeApex(molPts);
      const { p2, p3 } = moleculeSlantOuterVertices(molPts, apex);

      const tri = parsePathPoints(minorCuts[k].d);
      expect(tri.length).toBe(3); // a closed triangle (three vertices)
      expect(minorCuts[k].d.trimEnd().endsWith("Z")).toBe(true); // closed path

      // two vertices sit a small gap INSIDE the outer corners p2/p3 (near them, not on them),
      // so the triangle is a separate hole, clear of the outer boundary cut
      expect(tri.some((v) => !eqPt(v, p2, 1e-6) && dist(v, p2) <= 2.5)).toBe(true);
      expect(tri.some((v) => !eqPt(v, p3, 1e-6) && dist(v, p3) <= 2.5)).toBe(true);
      expect(tri.every((v) => !eqPt(v, p2, 1e-6) && !eqPt(v, p3, 1e-6))).toBe(true);

      // a real triangular hole: positive area
      const area =
        Math.abs(
          (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) -
            (tri[2].x - tri[0].x) * (tri[1].y - tri[0].y),
        ) / 2;
      expect(area).toBeGreaterThan(0.5);

      // the wedge's inner apex points toward the fan centre (closer than the two outer vertices)
      const byApex = [...tri].sort((a, b) => dist(a, apex) - dist(b, apex));
      expect(dist(byApex[0], apex)).toBeLessThan(dist(byApex[2], apex));
    }
  });

  it("cornerCutFoldSegments: two minor cuts from p2/p3 move inward without exceeding the cap", () => {
    const net = buildPatternNet(state);
    const molecules = net.segments.filter((s) => s.role === "molecule");
    const minorLen = computeMinorCutLength(state.gamma, state.w, state.inputs.materialThickness, state.theta, state.rApex);

    for (let k = 0; k < molecules.length; k++) {
      const mol = trapezoidFromPath(parsePathPoints(molecules[k].d));
      const apex = moleculeApex(mol);
      const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
      const { minorCuts, valleyFold } = cornerCutFoldSegments(mol, minorLen, apex);
      const topMid = moleculeTopEdgeMidpoint(mol, apex);
      const [innerL, innerR] = moleculeInnerVertices(mol, apex);
      const innerMid = lerpPt(innerL, innerR, 0.5);

      expect(eqPt(valleyFold.start, topMid, 1e-9)).toBe(true);
      expect(eqPt(valleyFold.end, innerMid, 1e-6)).toBe(true);
      expect(minorCuts.length).toBe(2);

      const starts = minorCuts.map((c) => c.start);
      expect(starts.some((s) => eqPt(s, p2, 1e-9))).toBe(true);
      expect(starts.some((s) => eqPt(s, p3, 1e-9))).toBe(true);
      for (const minorCut of minorCuts) {
        const cutLen = dist(minorCut.start, minorCut.end);
        expect(cutLen).toBeGreaterThan(0);
        expect(cutLen).toBeLessThanOrEqual(minorLen + 1e-6);
        const inward = {
          x: minorCut.end.x - minorCut.start.x,
          y: minorCut.end.y - minorCut.start.y,
        };
        const toCenter = {
          x: apex.x - minorCut.start.x,
          y: apex.y - minorCut.start.y,
        };
        expect(dot(inward, toCenter)).toBeGreaterThan(0);
        expect(dist(minorCut.end, apex)).toBeLessThanOrEqual(
          dist(minorCut.start, apex) + 1e-6,
        );
        expect(pointOnSegment(minorCut.end, p3, p2, 1e-4)).toBe(false);
      }
    }
  });

  it("minor-cut triangle sits in the outer molecule region, beyond the inner chord (N=3,5,6,7)", () => {
    for (const N of [3, 5, 6, 7]) {
      const s = computeState({
        edgeCount: N,
        edgeLength: 100,
        totalCurvature: 100 / Math.SQRT2,
        materialThickness: 1,
      });
      const net = buildPatternNet(s);
      const molecules = net.segments.filter((x) => x.role === "molecule");
      const minorCutSegs = net.segments.filter((x) => x.role === "minor-cut");
      expect(minorCutSegs.length).toBe(N);

      for (let k = 0; k < N; k++) {
        const mol = trapezoidFromPath(parsePathPoints(molecules[k].d));
        const apex = moleculeApex(mol);
        const [innerL, innerR] = moleculeInnerVertices(mol, apex);
        const innerMid = lerpPt(innerL, innerR, 0.5);
        const dInner = dist(innerMid, apex);

        // every vertex of the relief triangle is farther from the fan apex than the inner chord
        const tri = parsePathPoints(minorCutSegs[k].d);
        expect(tri.length).toBe(3);
        for (const v of tri) {
          expect(dist(v, apex)).toBeGreaterThan(dInner + 1e-6);
        }

        const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
        expect(dist(p2, apex)).toBeGreaterThan(dInner + 1e-6);
        expect(dist(p3, apex)).toBeGreaterThan(dInner + 1e-6);
      }
    }
  });

  it("molecule fill excludes wedge between top chord and minor cuts", () => {
    const net = buildPatternNet(state);
    const outlines = net.segments.filter((s) => s.role === "molecule");
    const fills = net.segments.filter((s) => s.role === "molecule-fill");
    const minorLen = computeMinorCutLength(state.gamma, state.w, state.inputs.materialThickness, state.theta, state.rApex);
    expect(minorLen).toBeGreaterThan(0);

    for (let k = 0; k < outlines.length; k++) {
      const mol = trapezoidFromPath(parsePathPoints(outlines[k].d));
      const fillVerts = parsePathPoints(fills[k].d);
      const apex = moleculeApex(mol);
      const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
      const { foldAtP2, foldAtP3 } = moleculeMinorCutEndpoints(mol, minorLen, apex);
      const wedgePt = {
        x: (p2.x + p3.x + foldAtP2.x + foldAtP3.x) / 4,
        y: (p2.y + p3.y + foldAtP2.y + foldAtP3.y) / 4,
      };
      const bodyPt = moleculeFillInteriorPoint(mol, minorLen, apex);

      expect(pointInPolygon(wedgePt, fillVerts)).toBe(false);
      expect(pointInPolygon(bodyPt, fillVerts)).toBe(true);

      const outlinePts = parsePathPoints(outlines[k].d);
      const polyTipR = outlinePts[2];
      const polyTipL = outlinePts[outlinePts.length - 1];
      const expected = injectPolyTipsCW(
        moleculeFillPolygon(mol, minorLen),
        polyTipL,
        polyTipR,
      );
      expect(fillVerts.length).toBe(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(eqPt(fillVerts[i], expected[i], 1e-6)).toBe(true);
      }
    }
  });

  it("molecule fill has positive area between major and minor cuts for N=3,4 at H=70.7", () => {
    function polygonArea(verts: { x: number; y: number }[]) {
      let a = 0;
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
      }
      return Math.abs(a) / 2;
    }

    for (const N of [3, 4]) {
      const s = computeState({
        edgeCount: N,
        edgeLength: 100,
        totalCurvature: 70.7,
        materialThickness: 1,
      });
      const net = buildPatternNet(s);
      const outlines = net.segments.filter((x) => x.role === "molecule");
      const fills = net.segments.filter((x) => x.role === "molecule-fill");
      const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness, s.theta, s.rApex);

      for (let k = 0; k < N; k++) {
        const mol = trapezoidFromPath(parsePathPoints(outlines[k].d));
        const fillVerts = parsePathPoints(fills[k].d);
        const apex = moleculeApex(mol);
        const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);
        const { foldAtP2, foldAtP3 } = moleculeMinorCutEndpoints(
          mol,
          minorLen,
          apex,
        );
        const wedgePt = {
          x: (p2.x + p3.x + foldAtP2.x + foldAtP3.x) / 4,
          y: (p2.y + p3.y + foldAtP2.y + foldAtP3.y) / 4,
        };

        expect(polygonArea(fillVerts)).toBeGreaterThan(1);
        expect(pointInPolygon(wedgePt, fillVerts)).toBe(false);
        if (dist(foldAtP2, foldAtP3) > 1e-6) {
          expect(
            pointInPolygon(
              moleculeFillInteriorPoint(mol, minorLen, apex),
              fillVerts,
            ),
          ).toBe(true);
        }
      }
    }
  });

  it("SVG minor-cut triangles have positive area for N=3..8 at L=100, H≈70.7", () => {
    const L = 100;
    const H = L / Math.SQRT2;

    for (const N of [3, 4, 5, 6, 7, 8]) {
      const s = computeState({
        edgeCount: N,
        edgeLength: L,
        totalCurvature: H,
        materialThickness: 1,
      });
      const minorLen = computeMinorCutLength(s.gamma, s.w, s.inputs.materialThickness, s.theta, s.rApex);
      expect(minorLen).toBeGreaterThan(0);

      const net = buildPatternNet(s);
      const molecules = net.segments.filter((x) => x.role === "molecule");
      const minorCutSegs = net.segments.filter((x) => x.role === "minor-cut");

      expect(minorCutSegs.length).toBe(N);

      for (let k = 0; k < N; k++) {
        const mol = trapezoidFromPath(parsePathPoints(molecules[k].d));
        const apex = moleculeApex(mol);
        const { p2, p3 } = moleculeSlantOuterVertices(mol, apex);

        const tri = parsePathPoints(minorCutSegs[k].d);
        expect(tri.length).toBe(3); // closed relief triangle
        // gapped inside the outer corners (separate from the boundary), not on them
        expect(tri.some((v) => !eqPt(v, p2, 1e-6) && dist(v, p2) <= 2.5)).toBe(true);
        expect(tri.some((v) => !eqPt(v, p3, 1e-6) && dist(v, p3) <= 2.5)).toBe(true);
        // positive area: a real triangular hole
        const area =
          Math.abs(
            (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) -
              (tri[2].x - tri[0].x) * (tri[1].y - tri[0].y),
          ) / 2;
        expect(area).toBeGreaterThan(0);
      }
    }
  });

  it("paint order: polygons, then molecules, then creases (fold/cut), then boundary", () => {
    const net = buildPatternNet(state);
    const roles = net.segments.map((s) => s.role);
    const firstMolecule = roles.indexOf("molecule");
    const lastPolygon = roles.lastIndexOf("polygon");
    const firstFoldOrCut = roles.findIndex(
      (r) => r === "fold" || r === "cut" || r === "minor-cut",
    );
    const boundary = roles.indexOf("boundary");

    expect(firstMolecule).toBeGreaterThan(lastPolygon);
    expect(firstFoldOrCut).toBeGreaterThan(firstMolecule);
    expect(boundary).toBeGreaterThan(firstFoldOrCut);
  });
});

function nearestOnFold(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-24) {
    return a;
  }
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2),
  );
  return { x: a.x + abx * t, y: a.y + aby * t };
}

describe("cornerMoleculeTrapezoid", () => {
  it("places all vertices on the two slants from b; outer corners coincide with the provided outer endpoints", () => {
    const b = { x: 0, y: 0 };
    const outerLeft = { x: -100, y: 150 };
    const outerRight = { x: 100, y: 150 };
    const [innerL, innerR, oR, oL] = cornerMoleculeTrapezoid(b, outerLeft, outerRight, 0.2);

    expect(eqPt(oL, outerLeft)).toBe(true);
    expect(eqPt(oR, outerRight)).toBe(true);
    expect(pointOnSegment(innerL, b, outerLeft)).toBe(true);
    expect(pointOnSegment(innerR, b, outerRight)).toBe(true);
    expect(dist(b, innerL)).toBeLessThan(dist(b, oL));
    expect(dist(b, innerR)).toBeLessThan(dist(b, oR));
  });

  it("inner-corner distance scales with innerFraction", () => {
    const b = { x: 0, y: 0 };
    const outerLeft = { x: -100, y: 150 };
    const outerRight = { x: 100, y: 150 };
    const slantLen = dist(b, outerLeft);
    const [innerL] = cornerMoleculeTrapezoid(b, outerLeft, outerRight, 0.3);
    expect(dist(b, innerL)).toBeCloseTo(0.3 * slantLen, 3);
  });
});
