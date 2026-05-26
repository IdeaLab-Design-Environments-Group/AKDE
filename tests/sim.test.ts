import { describe, expect, it } from "vitest";
import { computeState } from "@kirigami/model/index.js";
import {
  buildFoldNet,
  buildModel,
  buildFoldScene,
  singleHingeModel,
  FoldSolver,
  measureTheta,
  DEFAULT_PARAMS,
} from "@kirigami/sim/index.js";
import { packModel } from "@kirigami/sim/gpu/pack.js";

const STATE = computeState({
  edgeCount: 6,
  edgeLength: 100,
  totalCurvature: 100,
  materialThickness: 1,
});

describe("FoldNet topology", () => {
  it("builds a connected mesh with the kirigami cut structure", () => {
    const net = buildFoldNet(STATE);
    const N = 6;
    // 1 lateral triangle per polygon (anchored at the midpoint tip) + 6 molecule tris per
    // molecule = N + 6N = 7N faces. The single inner node per polygon keeps the integrator
    // stable as all N tips converge at the apex (no load-bearing inner edge to resist).
    expect(net.faces.length).toBe(7 * N);
    // every vertex is referenced by some face
    const used = new Set<number>();
    for (const f of net.faces) f.forEach((v) => used.add(v));
    expect(used.size).toBe(net.vertices.length);
    // the apex tips are DISTINCT nodes (major cut keeps them separate = kirigami, not a cone point)
    expect(net.tips.length).toBe(N);
    expect(new Set(net.tips).size).toBe(N);
  });

  it("classifies creases and cuts: mountains, valleys, minor cuts + major-cut rim", () => {
    const net = buildFoldNet(STATE);
    const count = (a: string) => net.edges.filter((e) => e.assignment === a).length;
    expect(count("V")).toBe(6); // one valley per molecule
    expect(count("M")).toBe(12); // two slants per molecule (shared with the polygons)
    expect(count("B")).toBeGreaterThan(0); // free boundary edges (base perimeter)
    // cuts: 2 minor cuts per molecule (12) + the major-cut hole rim → all "C", carrying no crease
    expect(count("C")).toBeGreaterThanOrEqual(12);
    for (const e of net.edges) {
      if (e.assignment === "C") expect(e.faces.length).toBe(1); // cuts are free boundaries
    }
  });

  it("the molecule tucks via its minor cuts — guided fold stays near-isometric", () => {
    // With the minor cuts opening the molecule dart, the guided fold to the goal mesh tucks the
    // excess material instead of stretching it: mean bar strain stays small (the kirigami premise).
    const { model, solver } = buildFoldScene(STATE);
    solver.solve(16000, 1);
    let s = 0;
    for (let i = 0; i < model.beams.count; i++) {
      const a = model.beams.n0[i];
      const b = model.beams.n1[i];
      const l = Math.hypot(
        model.position[3 * a] - model.position[3 * b],
        model.position[3 * a + 1] - model.position[3 * b + 1],
        model.position[3 * a + 2] - model.position[3 * b + 2],
      );
      s += Math.abs(l / model.beams.rest[i] - 1);
    }
    expect(s / model.beams.count).toBeLessThan(0.1);
  });
});

describe("bar-and-hinge model", () => {
  it("maps edges→beams with k_axial = EA/l0 and interior edges→creases", () => {
    const net = buildFoldNet(STATE);
    const model = buildModel(net);
    expect(model.beams.count).toBe(net.edges.length);
    const interior = net.edges.filter((e) => e.faces.length >= 2).length;
    expect(model.creases.count).toBe(interior);
    // k_axial = EA / l0
    expect(model.beams.k[0]).toBeCloseTo(DEFAULT_PARAMS.EA / model.beams.rest[0], 6);
  });

  it("kirigami coupling: a cut ligament loss softens the hinge (DETC Eq 6)", () => {
    const net = buildFoldNet(STATE);
    const full = buildModel(net);
    const halfCut = buildModel(net, DEFAULT_PARAMS, (e) => (e.assignment === "V" ? 0.5 : 0));
    // find a valley crease index and compare stiffness
    const interior = net.edges.filter((e) => e.faces.length >= 2);
    const vi = interior.findIndex((e) => e.assignment === "V");
    expect(vi).toBeGreaterThanOrEqual(0);
    expect(halfCut.creases.k[vi]).toBeCloseTo(0.5 * full.creases.k[vi], 6);
  });
});

describe("GPU packing (data layout for the shaders)", () => {
  it("packs node/beam/crease/face incidence consistently with the model", () => {
    const net = buildFoldNet(STATE);
    const model = buildModel(net);
    const p = packModel(model, model.params.zeta);

    // node texture holds all nodes
    expect(p.dim[0] * p.dim[1]).toBeGreaterThanOrEqual(model.numNodes);
    // each beam contributes 2 incidence entries (one per endpoint)
    let beamEntries = 0;
    for (let i = 0; i < model.numNodes; i++) beamEntries += p.nodeMeta[4 * i + 1];
    expect(beamEntries).toBe(2 * model.beams.count);
    // each crease contributes 4 incidence entries (n1..n4)
    let creaseEntries = 0;
    for (let i = 0; i < model.numNodes; i++) creaseEntries += p.nodeMeta[4 * i + 3];
    expect(creaseEntries).toBe(4 * model.creases.count);
    // each face contributes 3 incidence entries (a,b,c)
    let faceEntries = 0;
    for (let i = 0; i < model.numNodes; i++) faceEntries += p.nodeMeta2[4 * i + 1];
    expect(faceEntries).toBe(3 * model.faces.count);
    // crease params carry the kirigami-coupled stiffness + target
    expect(p.creaseParams[0]).toBeCloseTo(model.creases.k[0], 6);
    expect(p.creaseParams[1]).toBeCloseTo(model.creases.targetTheta[0], 6);
  });
});

describe("crease force (Gershenfeld §2.3–2.6) — single hinge", () => {
  it("folds a two-triangle hinge to its target dihedral angle", () => {
    const target = 1.2; // rad
    const model = singleHingeModel(target);
    // pin the crease edge (0,1) and one wing (2); the other wing (3) folds up
    model.fixed[0] = 1;
    model.fixed[1] = 1;
    model.fixed[2] = 1;
    const solver = new FoldSolver(model);
    solver.foldPercent = 1;
    solver.solve(4000, 1);

    const theta = measureTheta(model, 0, 1, 0, 1);
    expect(Math.abs(theta)).toBeCloseTo(Math.abs(target), 1); // within ~0.05 rad
  });
});

describe("full-net forward fold (DETC forward process → goal mesh)", () => {
  it("folds the flat net crisply into the designed pyramid: apex closes, height = H, low strain", () => {
    const { net, model, solver } = buildFoldScene(STATE);
    solver.solve(16000, 1);

    // no NaNs
    for (let i = 0; i < model.position.length; i++) {
      expect(Number.isFinite(model.position[i])).toBe(true);
    }

    const meanZ = (ids: number[]) => ids.reduce((a, i) => a + model.position[3 * i + 2], 0) / ids.length;
    const meanR = (ids: number[]) =>
      ids.reduce((a, i) => a + Math.hypot(model.position[3 * i], model.position[3 * i + 1]), 0) / ids.length;

    // apex tips driven to the axis (major cut closes — kirigami apex), base spread to radius R
    expect(meanR(net.tips)).toBeLessThan(0.05 * net.meta.R);
    expect(meanR(net.base)).toBeCloseTo(net.meta.R, 1);

    // cone height = the designed apex altitude H (normalized as net.meta.H = STATE.H · scale)
    const height = Math.abs(meanZ(net.base) - meanZ(net.tips));
    expect(height).toBeCloseTo(net.meta.H, 1);

    // near-isometric: the molecules tuck via their cuts, so mean bar strain is small
    let strain = 0;
    for (let i = 0; i < model.beams.count; i++) {
      const a = model.beams.n0[i];
      const b = model.beams.n1[i];
      const l = Math.hypot(
        model.position[3 * a] - model.position[3 * b],
        model.position[3 * a + 1] - model.position[3 * b + 1],
        model.position[3 * a + 2] - model.position[3 * b + 2],
      );
      strain += Math.abs(l / model.beams.rest[i] - 1);
    }
    strain /= model.beams.count;
    expect(strain).toBeLessThan(0.1);

    // molecules tuck INSIDE the pyramid (no node protrudes beyond the cone surface z = H(1−r/R))
    const driven = new Set<number>([
      ...net.tips,
      ...net.basePairs.flat(),
      ...net.valleyOuter,
    ]);
    for (let i = 0; i < model.numNodes; i++) {
      if (driven.has(i)) continue;
      const r = Math.hypot(model.position[3 * i], model.position[3 * i + 1]);
      const zSurface = net.meta.H * (1 - Math.min(1, r / net.meta.R));
      expect(model.position[3 * i + 2]).toBeLessThan(zSurface + 0.05 * net.meta.H);
    }
  });
});
