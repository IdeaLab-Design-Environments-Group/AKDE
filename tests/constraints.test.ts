import { describe, expect, it } from "vitest";
import { evaluateConstraints } from "@kirigami/model/constraints.js";
import { computeState } from "@kirigami/model/geometry.js";

describe("evaluateConstraints", () => {
  it("returns C1–C6 and all pass for the canonical square pyramid", () => {
    const state = computeState({
      edgeCount: 4,
      edgeLength: 100,
      totalCurvature: 100 / Math.SQRT2,
      materialThickness: 1,
    });
    const cons = evaluateConstraints(state);
    expect(cons.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6"]);
    expect(cons.every((c) => c.satisfied)).toBe(true);
  });

  it("C5 fails for a tall pyramid (κ=2) where w > L", () => {
    const state = computeState({
      edgeCount: 6,
      edgeLength: 100,
      totalCurvature: 200, // R=100 → κ=2
      materialThickness: 1,
    });
    const c5 = evaluateConstraints(state).find((c) => c.id === "C5")!;
    expect(state.w).toBeGreaterThan(state.inputs.edgeLength);
    expect(c5.satisfied).toBe(false);
    expect(c5.residual).toBeGreaterThan(0);
  });

  it("C6 fails for very thick material where the relief overshoots the molecule", () => {
    const state = computeState({
      edgeCount: 6,
      edgeLength: 100,
      totalCurvature: 100, // κ=1
      materialThickness: 80,
    });
    const c6 = evaluateConstraints(state).find((c) => c.id === "C6")!;
    expect(c6.satisfied).toBe(false);
    expect(c6.residual).toBeGreaterThan(0);
  });
});
