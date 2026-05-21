# AKDE — Kirigami pattern planner

Uniform edge-molecule kirigami patterns from **edge count** \(N\), **edge length** \(L\) (mm), **outer edge length** \(L_o\) (mm), **vertical apex altitude** \(K_{\mathrm{tot}} = H\) (mm), and **material thickness** \(T\) (mm). The default template is a hexagonal pyramid (N = 6). See [plan/plan.md](plan/plan.md) for theory and architecture.

For project structure, design patterns, reproducibility rules, and onboarding, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Edit **N**, **L**, **L₀**, **H**, and **T** in the inputs panel; derived values, constraints (C1–C6), and the SVG pyramid fan update live.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (`app/`) |
| `npm run build` | Typecheck + production build |
| `npm run test` | Vitest (geometry, constraints, validation, pattern structure) |
| `npm run preview` | Preview production build |

## Layout (MVC, no `src/`)

```
kirigami/model/       — geometry, constraints, types
kirigami/view/        — inputs, checklist, pattern SVG
kirigami/controller/  — recompute pipeline
app/                  — HTML, CSS, bootstrap
tests/                — vitest coverage for model and pattern behavior
```

**Plan:** [plan/plan.md](plan/plan.md) · **References:** [plan/references.md](plan/references.md)
