/**
 * Type declarations for `fkld/bridge.coffee`.
 *
 * The bridge joins AKDE's runtime FoldNet + KirigamiState into a single
 * FKLD JSON object. Consumers see only the resulting plain object — the
 * coupling to internal AKDE types stops at this boundary.
 */

import type { FoldNet } from "../kirigami/sim/foldnet.js";
import type { KirigamiState } from "../kirigami/model/types.js";

/**
 * Plain FKLD JSON object: a strict superset of FOLD 1.2. Standard FOLD
 * arrays are typed; the `fkld:*`-prefixed extensions are typed as
 * `unknown` in this signature because each Step's module defines and
 * validates its own shape. Cast through the per-step validators (e.g.
 * `validateEdgeCutTypes` in cut-types.coffee) when consuming.
 */
export interface FkldFile {
  file_spec?: number;
  file_creator?: string;
  file_classes?: string[];
  vertices_coords: number[][];
  edges_vertices: [number, number][];
  edges_assignment: string[];
  faces_vertices: number[][];
  [fkldKey: string]: unknown;
}

export interface FoldNetToFkldOptions {
  /** Overrides the default `file_creator = "AKDE"`. */
  creator?: string;
}

export function foldNetToFkld(
  net: FoldNet,
  state: KirigamiState,
  options?: FoldNetToFkldOptions,
): FkldFile;
