import type { PatternNet, PatternSegment, PatternStrokeRole } from "./pattern.js";
import { createZip } from "./zip.js";

/**
 * Cricut-ready SVG export, as **two separate files** packed into one folder:
 * - `…-cut.svg`   — everything to cut, black, in one layer: the outer outline + the major
 *   (apex-hole) cut + the minor relief slits (`boundary`, `cut`, `minor-cut` roles)
 * - `…-score.svg` — the lines to crease, not cut, blue: the valley creases (`fold` role)
 *   only. The polygon triangle slant sides are NOT exported (neither cut nor scored).
 *
 * `buildCricutZip` bundles both into a single `.zip` whose contents sit in one folder
 * (`<baseName>/…`), since a browser download can't create a folder on disk directly.
 *
 * Both files share the same `viewBox` and mm size, so they stay registered (aligned) when
 * loaded into Cricut Design Space. Coords are mm, so they import at real size.
 *
 * **Cut layer = one `<g id="cut">` with two sibling paths; score stays per-line.**
 * The smoothest Cricut workflow uploads a kirigami net as one body whose perimeter, apex
 * hole, and relief slits all get cut together. So the cut layer is a single group with two
 * paths inside it:
 *   - a **filled, even-odd path** for the closed cuts — `boundary` (silhouette) + major
 *     (apex-hole) `cut` (hole) — with `stroke="none"` so the fill edge has no outline halo
 *     and Cricut doesn't double-cut along it;
 *   - a **stroked path** for the open `minor-cut` slits — `fill="none"`, single-pass lines,
 *     no closing kerf rectangle and no perpendicular caps on their back ends.
 * Minor cuts are held a small gap inside the boundary (`MINOR_CUT_GAP` in `pattern.ts`) so
 * they remain interior slits and never share a vertex with the outline. Score lines stay
 * per-segment stroked `<path>`s (Cricut scores *along* a line, so they import fine that way).
 *
 * Face fills (`polygon` interiors, `molecule`, `molecule-fill`) are visual only and excluded;
 * the polygon outer base edges stay on the cut layer via the `boundary` outline.
 */

/** Everything cut, in one layer: outer outline + major (apex-hole) cut + minor relief slits. */
const CUT_ROLES: readonly PatternStrokeRole[] = ["boundary", "cut", "minor-cut"];
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
  const cuts = cutSegments(net);
  const scores = scoreSegments(net);

  const files: CricutSvgFile[] = [];
  if (cuts.length > 0) {
    files.push({
      filename: `${baseName}-cut.svg`,
      svg: svgWrap(net, cutBodyMarkup(cuts, "  ")),
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
  const cuts = cutSegments(net);
  const scores = scoreSegments(net);
  if (cuts.length === 0 && scores.length === 0) return null;
  const body = [
    cuts.length > 0 ? cutBodyMarkup(cuts, "  ") : "",
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
  const cuts = cutSegments(net);
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

/**
 * Cut layer = one `<g id="cut">` with two sibling paths inside it:
 *   - a filled, even-odd path for the closed cuts (`boundary` + major `cut`) — no stroke, so
 *     the silhouette and the apex hole render cleanly with no outline ringing the fill edge
 *     (a fill+stroke compound otherwise paints a thin line halo and double-cuts in Cricut);
 *   - a stroked path for the open `minor-cut` slits — fill `none`, single-pass lines, no
 *     closing Z and no perpendicular caps on the slit's back ends.
 * Keeping both in the same group keeps the cut content together as one drag in Cricut.
 */
function cutBodyMarkup(cuts: PatternSegment[], indent = ""): string {
  const closed: string[] = [];
  const open: string[] = [];
  for (const seg of cuts) {
    const d = seg.d.trim();
    if (/[zZ]\s*$/.test(d)) closed.push(d);
    else open.push(d);
  }
  const parts: string[] = [];
  if (closed.length > 0) {
    parts.push(
      `${indent}  <path fill="${CUT_COLOR}" fill-rule="evenodd" stroke="none" ` +
        `d="${closed.join(" ")}" />`,
    );
  }
  if (open.length > 0) {
    parts.push(
      `${indent}  <path fill="none" stroke="${CUT_COLOR}" ` +
        `stroke-width="${LINE_STROKE_WIDTH}" d="${open.join(" ")}" />`,
    );
  }
  return `${indent}<g id="cut">\n${parts.join("\n")}\n${indent}</g>`;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0";
}

/** Score lines: only the valley creases (`fold`). Polygon slants are not exported at all. */
function scoreSegments(net: PatternNet): PatternSegment[] {
  return net.segments.filter((s) => SCORE_ROLES.includes(s.role));
}

/** Cut segments: only the explicit `boundary`, `cut`, and `minor-cut` roles from the net. */
function cutSegments(net: PatternNet): PatternSegment[] {
  return net.segments.filter((s) => CUT_ROLES.includes(s.role));
}

