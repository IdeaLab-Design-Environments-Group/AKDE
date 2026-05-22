import type { PatternNet, PatternSegment, PatternStrokeRole } from "./pattern.js";
import { createZip } from "./zip.js";

/**
 * Cricut-ready SVG export, as **two separate files** packed into one folder:
 * - `…-cut.svg`   — the outer outline plus major/minor cuts (`boundary`, `cut` roles), black
 * - `…-score.svg` — the lines to crease, not cut, blue: the valley creases (`fold` role)
 *   **plus each polygon's two side/slant edges** (the face↔molecule hinges)
 *
 * `buildCricutZip` bundles both into a single `.zip` whose contents sit in one folder
 * (`<baseName>/…`), since a browser download can't create a folder on disk directly.
 *
 * Both files share the same `viewBox` and mm size, so they stay registered (aligned) when
 * loaded into Cricut Design Space — import the cut file as a Cut layer and the score file as
 * a Score layer at the same position. Coords are mm, so they import at real size.
 *
 * Face fills (`polygon` interiors, `molecule`, `molecule-fill`) are visual only and excluded;
 * the polygon outer base edges stay on the cut layer via the `boundary` outline.
 */

const CUT_ROLES: readonly PatternStrokeRole[] = ["boundary", "cut"];
const SCORE_ROLES: readonly PatternStrokeRole[] = ["fold"];

/** Cut layer colour — assign "Cut" in Cricut Design Space. */
export const CUT_COLOR = "#000000";
/** Score layer colour — assign "Score" in Cricut Design Space. */
export const SCORE_COLOR = "#0000ff";

export interface CricutSvgFile {
  filename: string;
  svg: string;
}

/** A single downloadable archive (zip) containing the cut + score SVGs in one folder. */
export interface ExportArchive {
  filename: string;
  bytes: Uint8Array;
}

/** Inline preview SVGs (fit-to-box, non-scaling strokes) for the export modal. */
export interface CricutPreviews {
  /** Cut layer only. */
  cut: string;
  /** Score layer only. */
  score: string;
  /** Cut + score overlaid, same origin. */
  both: string;
}

/** Everything the export modal needs: thumbnails to show and the archive to download. */
export interface ExportPayload {
  previews: CricutPreviews;
  archive: ExportArchive;
}

/** One file per operation (cut, score). Layers with no paths are omitted. */
export function buildCricutSvgFiles(
  net: PatternNet,
  baseName = "akde-kirigami",
): CricutSvgFile[] {
  const cuts = net.segments.filter((s) => CUT_ROLES.includes(s.role));
  const scores = scoreSegments(net);

  const files: CricutSvgFile[] = [];
  if (cuts.length > 0) {
    files.push({
      filename: `${baseName}-cut.svg`,
      svg: layerSvg(net, cuts, "cut", CUT_COLOR),
    });
  }
  if (scores.length > 0) {
    files.push({
      filename: `${baseName}-score.svg`,
      svg: layerSvg(net, scores, "score", SCORE_COLOR),
    });
  }
  return files;
}

/**
 * Bundle the cut + score SVGs into one zip whose files live in a single `<baseName>/`
 * folder. Returns null if there is nothing to export.
 */
export function buildCricutZip(
  net: PatternNet,
  baseName = "akde-kirigami",
): ExportArchive | null {
  const files = buildCricutSvgFiles(net, baseName);
  if (files.length === 0) return null;
  const enc = new TextEncoder();
  const entries = files.map((f) => ({
    name: `${baseName}/${f.filename}`,
    data: enc.encode(f.svg),
  }));
  return { filename: `${baseName}.zip`, bytes: createZip(entries) };
}

/**
 * Build the three modal previews from one net: cut only, score only, and both overlaid
 * (same viewBox ⇒ same origin/scale, so they register exactly). Strokes use
 * `vector-effect="non-scaling-stroke"` so they stay visible at thumbnail size.
 */
export function buildCricutPreviews(net: PatternNet): CricutPreviews {
  const cuts = net.segments.filter((s) => CUT_ROLES.includes(s.role));
  const scores = scoreSegments(net);
  return {
    cut: previewSvg(net, [{ segs: cuts, color: CUT_COLOR }]),
    score: previewSvg(net, [{ segs: scores, color: SCORE_COLOR }]),
    both: previewSvg(net, [
      { segs: cuts, color: CUT_COLOR },
      { segs: scores, color: SCORE_COLOR },
    ]),
  };
}

/** Net → full export payload (previews + zip), or null when there is nothing to export. */
export function buildExportPayload(
  net: PatternNet,
  baseName = "akde-kirigami",
): ExportPayload | null {
  const archive = buildCricutZip(net, baseName);
  if (!archive) return null;
  return { previews: buildCricutPreviews(net), archive };
}

function previewSvg(
  net: PatternNet,
  groups: { segs: PatternSegment[]; color: string }[],
): string {
  const [x, y, w, h] = net.viewBox;
  const body = groups
    .filter((g) => g.segs.length > 0)
    .map(
      (g) =>
        `<g fill="none" stroke="${g.color}">` +
        g.segs
          .map(
            (s) =>
              `<path d="${s.d}" vector-effect="non-scaling-stroke" stroke-width="1.2" />`,
          )
          .join("") +
        `</g>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" ` +
    `preserveAspectRatio="xMidYMid meet" width="100%" height="100%">${body}</svg>`
  );
}

function layerSvg(
  net: PatternNet,
  segs: PatternSegment[],
  id: string,
  color: string,
): string {
  const [x, y, w, h] = net.viewBox;
  const paths = segs.map((s) => `    <path d="${s.d}" />`).join("\n");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${fmt(w)}mm" height="${fmt(h)}mm" ` +
    `viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}">\n` +
    `  <g id="${id}" fill="none" stroke="${color}" stroke-width="0.1">\n` +
    `${paths}\n` +
    `  </g>\n` +
    `</svg>\n`
  );
}

function fmt(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0";
}

/** Score lines: the valley creases (`fold`) plus each polygon's two side (slant) edges. */
function scoreSegments(net: PatternNet): PatternSegment[] {
  const folds = net.segments.filter((s) => SCORE_ROLES.includes(s.role));
  return [...folds, ...polygonSideSegments(net)];
}

/**
 * The two non-base sides of every polygon triangle (tip→outerL, tip→outerR) as fold lines.
 * These are the slant hinges where each face meets its molecules; the outer base edge stays
 * a cut (it's on the perimeter). Relies on `closedPolyline([tip, outerL, outerR])`.
 */
function polygonSideSegments(net: PatternNet): PatternSegment[] {
  const out: PatternSegment[] = [];
  for (const seg of net.segments) {
    if (seg.role !== "polygon") continue;
    const pts = parsePathPoints(seg.d);
    if (pts.length < 3) continue;
    const [tip, outerL, outerR] = pts;
    out.push({ role: "fold", d: lineD(tip, outerL) });
    out.push({ role: "fold", d: lineD(tip, outerR) });
  }
  return out;
}

function parsePathPoints(d: string): { x: number; y: number }[] {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g)?.map(Number) ?? [];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
}

function lineD(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}
