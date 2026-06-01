/**
 * Minimal CoffeeScript loader for Vite + Vitest.
 *
 * Lets the app and test runner import `.coffee` files directly, the same way
 * the FOLD reference library (which is also CoffeeScript) is consumed from
 * JavaScript projects. We compile each module on demand with `bare: true` so
 * the output is plain ESM-compatible JS, with inline source maps for stack
 * traces. No precompile step, no `dist/` directory to keep in sync.
 *
 * Why a custom plugin instead of `vite-plugin-coffee`: the community plugin
 * is ESM-incompatible with Vitest's resolver. Twenty lines of our own is
 * easier to maintain than diagnosing that.
 */
import { readFileSync } from "node:fs";
// @ts-expect-error — CoffeeScript ships its own types via the package but
// they aren't re-exported under the bundler moduleResolution we use here.
import CoffeeScript from "coffeescript";
import type { Plugin } from "vite";

export function coffeePlugin(): Plugin {
  return {
    name: "akde-coffee",
    enforce: "pre",
    resolveId(id, importer) {
      if (id.endsWith(".coffee")) return null; // let default resolver handle absolute/relative
      // Bare-extension imports: try `<id>.coffee` next to the importer.
      return null;
    },
    load(id) {
      if (!id.endsWith(".coffee")) return null;
      const source = readFileSync(id, "utf8");
      const compiled = CoffeeScript.compile(source, {
        bare: true,
        sourceMap: true,
        filename: id,
        inlineMap: false,
      }) as { js: string; v3SourceMap: string } | string;
      // `compile` returns a string when sourceMap=false, an object when true.
      if (typeof compiled === "string") return { code: compiled, map: null };
      return { code: compiled.js, map: JSON.parse(compiled.v3SourceMap) };
    },
  };
}
