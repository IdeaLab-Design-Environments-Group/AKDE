# AKDE — Kirigami pattern planner

Uniform edge-molecule kirigami patterns from **edge count** \(N\), **edge length** \(L\) (mm), **outer edge length** \(L_o\) (mm), **vertical apex altitude** \(K_{\mathrm{tot}} = H\) (mm), and **material thickness** \(T\) (mm). The default template is a hexagonal pyramid (N = 6). See [theory/plan.md](theory/plan.md) for theory and architecture.

For project structure, design patterns, reproducibility rules, and onboarding, see [CONTRIBUTING.md](CONTRIBUTING.md).
For an implementation-focused formula sheet, see [theory/current-formulas.tex](theory/current-formulas.tex) and the compiled [theory/current-formulas.pdf](theory/current-formulas.pdf).

## Live site

**▶ https://idealab-design-environments-group.github.io/AKDE/** — no install, runs in the browser.

Every push to `main` rebuilds and publishes via [GitHub Actions](.github/workflows/deploy.yml). **One-time setup:** in the repo's **Settings → Pages → Build and deployment**, set **Source = "GitHub Actions"** (then trigger the workflow by pushing to `main` or running it from the Actions tab).

## Quick start (local dev)

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

- [theory/README.md](theory/README.md): theory and formulas index
- [theory/plan.md](theory/plan.md): project theory, geometry contract, and architecture
- [theory/references.md](theory/references.md): bibliography and source papers
- [theory/formulas.md](theory/formulas.md): short implementation-synchronized formula summary
- [theory/current-formulas.tex](theory/current-formulas.tex): implementation-synchronized LaTeX formula reference
- [theory/current-formulas.pdf](theory/current-formulas.pdf): compiled formula sheet with per-formula references
- [docs/subsystems/README.md](docs/subsystems/README.md): subsystem-by-subsystem code documentation index
- [docs/subsystems/file-reference.md](docs/subsystems/file-reference.md): detailed file-by-file code reference
- [docs/subsystems/app-shell/README.md](docs/subsystems/app-shell/README.md): app-shell docs index
- [docs/subsystems/controller/README.md](docs/subsystems/controller/README.md): controller docs index
- [docs/subsystems/model/README.md](docs/subsystems/model/README.md): model docs index
- [docs/subsystems/views/README.md](docs/subsystems/views/README.md): view docs index
- [docs/subsystems/simulation/README.md](docs/subsystems/simulation/README.md): simulation docs index
- [docs/subsystems/deployment/README.md](docs/subsystems/deployment/README.md): deployment docs index
- [docs/subsystems/tests/README.md](docs/subsystems/tests/README.md): test docs index
- [REWRITEABILITY.md](REWRITEABILITY.md): file-by-file rewrite safety guide and contract map
- [CONTRIBUTING.md](CONTRIBUTING.md): repo structure, workflow, and onboarding notes

## Deployment

GitHub Pages publishes the production build from the repository-root `dist/` directory.

- Vite source root: `app/`
- Production build output: `dist/`
- Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- Production base path: `/AKDE/` by default, set in [vite.config.ts](vite.config.ts)

The build is repo-site aware: local dev runs at `/`, while `npm run build` emits asset URLs under `/AKDE/` so the site works at `https://idealab-design-environments-group.github.io/AKDE/`.

If the repository name changes or the site moves to a custom domain, override the production base path with `VITE_BASE` before building. Example:

```bash
VITE_BASE=/my-new-repo/ npm run build
```

## Layout (MVC, no `src/`)

```
kirigami/model/       — geometry, constraints, types
kirigami/view/        — inputs, checklist, pattern SVG
kirigami/controller/  — recompute pipeline
app/                  — HTML, CSS, bootstrap
tests/                — vitest coverage for model and pattern behavior
```

**Plan:** [theory/plan.md](theory/plan.md) · **References:** [theory/references.md](theory/references.md) · **Formula sheet:** [theory/current-formulas.pdf](theory/current-formulas.pdf)
