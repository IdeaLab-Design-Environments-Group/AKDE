/**
 * Ambient declaration: `.coffee` modules opt in to per-file typing via a
 * sibling `<file>.coffee.d.ts` that re-exports concrete shapes (see
 * `spec.coffee.d.ts`). Without this fallback, TypeScript flags every
 * CoffeeScript import as an unresolved module under bundler resolution.
 *
 * The sibling .d.ts files (one per .coffee module) provide the real types.
 */
declare module "*.coffee" {
  const value: unknown;
  export default value;
}
