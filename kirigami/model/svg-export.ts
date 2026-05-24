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
 * **Each cut/score is its own line path.** Every segment is emitted as a separate stroked
 * `<path>` (fill `none`) — the outer boundary, the major cut, each minor slit, each crease — so
 * Cricut imports them as distinct, individually selectable cut/score lines rather than one
 * welded compound shape. Attributes are set per-path (not only on the group) so the strokes
 * survive import even if the group wrapper is flattened.
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
/** Stroke width (mm) for the exported cut/score lines. */
export const LINE_STROKE_WIDTH = 0.25;

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

/** Everything the export modal needs: thumbnails to show and the downloads to offer. */
export interface ExportPayload {
  previews: CricutPreviews;
  /** Two separate SVGs (cut, score) packed in one zip folder. */
  archive: ExportArchive;
  /** One combined SVG where stroke colour denotes the operation, or null when empty. */
  combined: CricutSvgFile | null;
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
      svg: svgWrap(net, linesMarkup(cuts, "cut", CUT_COLOR, "  ")),
    });
  }
  if (scores.length > 0) {
    files.push({
      filename: `${baseName}-score.svg`,
      svg: svgWrap(net, linesMarkup(scores, "score", SCORE_COLOR, "  ")),
    });
  }
  return files;
}

/**
 * Single-file export: one SVG containing **both** operations, where the stroke colour
 * denotes the operation — cut paths in {@link CUT_COLOR} (black), score paths in
 * {@link SCORE_COLOR} (blue). This is the slicebug `plan` / Cricut "one import,
 * colour-coded layers" flow: feed this one file to slicebug with
 * `--map 000000:fine_point_blade --map 0000ff:scoring_stylus`, or import it into Design
 * Space and assign Cut to the black layer and Score to the blue layer.
 *
 * Same `viewBox` and mm size as the two-file export, so it imports at real size and the
 * two operations stay registered. Returns null when there is nothing to export.
 */
export function buildCombinedCricutSvg(
  net: PatternNet,
  baseName = "akde-kirigami",
): CricutSvgFile | null {
  const cuts = net.segments.filter((s) => CUT_ROLES.includes(s.role));
  const scores = scoreSegments(net);
  if (cuts.length === 0 && scores.length === 0) return null;
  const body = [
    cuts.length > 0 ? linesMarkup(cuts, "cut", CUT_COLOR, "  ") : "",
    scores.length > 0 ? linesMarkup(scores, "score", SCORE_COLOR, "  ") : "",
  ]
    .filter((m) => m.length > 0)
    .join("\n");
  return {
    filename: `${baseName}-combined.svg`,
    svg: svgWrap(net, body),
  };
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
  return {
    previews: buildCricutPreviews(net),
    archive,
    combined: buildCombinedCricutSvg(net, baseName),
  };
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

/** Wrap inner markup in an mm-sized SVG sharing the net's viewBox (so layers stay registered). */
function svgWrap(net: PatternNet, body: string): string {
  const [x, y, w, h] = net.viewBox;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${fmt(w)}mm" height="${fmt(h)}mm" ` +
    `viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}">\n` +
    `${body}\n` +
    `</svg>\n`
  );
}

/**
 * Emit each segment as its own stroked line `<path>` (fill `none`) inside an identified group.
 * Per-path `fill`/`stroke`/`stroke-width` are set explicitly (not only on the group) so each cut
 * or score line imports into Cricut as a distinct, individually selectable line — never welded
 * into one compound shape, and robust to the group wrapper being flattened.
 */
function linesMarkup(
  segs: PatternSegment[],
  id: string,
  color: string,
  indent = "",
): string {
  const paths = segs
    .map(
      (s) =>
        `${indent}  <path d="${s.d}" fill="none" stroke="${color}" ` +
        `stroke-width="${LINE_STROKE_WIDTH}" />`,
    )
    .join("\n");
  return (
    `${indent}<g id="${id}" fill="none" stroke="${color}" ` +
    `stroke-width="${LINE_STROKE_WIDTH}">\n` +
    `${paths}\n` +
    `${indent}</g>`
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
