# AKDE — Kirigami pattern planner

Uniform edge-molecule kirigami patterns from **edge count** \(N\), **edge length** \(L\) (mm), **outer edge length** \(L_o\) (mm), **vertical apex altitude** \(K_{\mathrm{tot}} = H\) (mm), and **material thickness** \(T\) (mm). The default template is a hexagonal pyramid (N = 6). See [plan/plan.md](plan/plan.md) for theory and architecture.

For project structure, design patterns, reproducibility rules, and onboarding, see [CONTRIBUTING.md](CONTRIBUTING.md).
For an implementation-focused formula sheet, see [current-formulas.tex](current-formulas.tex) and the compiled [current-formulas.pdf](current-formulas.pdf).

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Edit **N**, **L**, **L₀**, **H**, and **T** in the inputs panel; derived values, constraints (C1–C6), and the SVG pyramid fan update live.

**Export:** the header **Export** button opens a modal with cut / score / both previews and **Export as SVG**, which downloads a `.zip` containing two registered, mm-sized SVGs in one folder — `…-cut.svg` (outline + cuts, black) and `…-score.svg` (valley creases + polygon slant edges, blue) — ready for a Cricut (set the blue layer to *Score*, black to *Cut*).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (`app/`) |
| `npm run build` | Typecheck + production build |
| `npm run test` | Vitest (geometry, constraints, validation, pattern structure) |
| `npm run preview` | Preview production build |

## Documentation

- [plan/plan.md](plan/plan.md): project theory, geometry contract, and architecture
- [plan/references.md](plan/references.md): bibliography and source papers
- [current-formulas.tex](current-formulas.tex): implementation-synchronized LaTeX formula reference
- [current-formulas.pdf](current-formulas.pdf): compiled formula sheet with per-formula references
- [CONTRIBUTING.md](CONTRIBUTING.md): repo structure, workflow, and onboarding notes

## Layout (MVC, no `src/`)

```
kirigami/model/       — geometry, constraints, types
kirigami/view/        — inputs, checklist, pattern SVG
kirigami/controller/  — recompute pipeline
app/                  — HTML, CSS, bootstrap
tests/                — vitest coverage for model and pattern behavior
```

**Plan:** [plan/plan.md](plan/plan.md) · **References:** [plan/references.md](plan/references.md) · **Formula sheet:** [current-formulas.pdf](current-formulas.pdf)
