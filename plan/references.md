# References (AKDE kirigami planner)

Bibliography for the restart plan. **DETC2019-97557** is the sole implementation authority for edge-molecule geometry and Eqs. (1)–(4). Other entries are background only.

---

## Primary (implementation)

**Liu, Chuang, Sang, Sabin (2019)** — *Programmable Kirigami: Cutting and Folding in Science, Technology and Architecture.*  
ASME IDETC/CIE 2019, **DETC2019-97557**, Anaheim, CA.  
Local PDF: `/Users/emredayangac/Desktop/DETC2019-97557.pdf`

- Inverse process: polyhedral mesh \(M_0\) → isometric 2D pattern \(M_1\)
- Edge molecule parameters \(\theta(i,j)\), \(w(i,j)\) (paper also uses \(W\))
- Equalities (1)–(2), inequalities (3)–(4)
- Major/minor cuts; Figures 1–4 (vertex unfold, molecule parameterization)

---

## Secondary (background only — not in v1 scope)

**Liu et al. (2018) — “L18”** — *Responsive Kirigami: Context-Actuated Hinges in Folded Sheet Systems.*  
SIMAUD 2018 (cited in DETC abstract as prior kirigami surface / simulation context).

**Tan & Wang** — Use as **literature context** for polyhedral kirigami / deployable nets and angle-defect budgeting. Confirm exact bibliographic record in project `.bib` when available; do not import their workflow (Blockly, multi-phase tooling, etc.) into AKDE v1.

**Related (optional reading, not cited in plan logic)**

- Tachi (2010) — origamizing polyhedral surfaces  
- Castle et al. (2014) — lattice kirigami rules  
- Schenk & Guest (2011) — structural origami (forward-process truss, DETC §3.2)

---

## Notation alignment with DETC

| Symbol | Meaning | AKDE units (v1) |
|--------|---------|-----------------|
| \(\theta(i,j)\) | Edge-molecule angle (two edges of quadrilateral trapezoid molecule) | rad (internal); UI may show ° |
| \(w(i,j)\) | Edge-molecule width | **mm** |
| \(L\) | Base edge length (pyramid template) | **mm** (user input) |
| \(R\) | Base circumradius | **mm** (derived) |
| \(H\) | **Vertical pyramid altitude** above base/ground plane (= \(K_{\mathrm{tot}}\) in UI); perpendicular to base — **not** slant \(s\) | **mm** (user input) |
| \(s\) | **Slant edge** apex → base vertex along a lateral face; \(s=\sqrt{R^2+H^2}\); appears in \(\eta=2\arcsin(R\sin(\pi/N)/s)\) — **not** in place of \(H\) | **mm** (derived) |
| \(\beta(i,j)\) | Corner angle of polygon face at vertex \(i\) in goal mesh \(M_0\) | rad |
| \(N\) or \(n_i\) | Number of edges/molecules around vertex \(i\) in cyclic order | dimensionless |
| \(\kappa\) | Rise ratio \(H/R = \tan\psi\) | dimensionless |
| Angle defect at vertex | \(\delta_i = 2\pi - \sum_j \beta(i,j)\); Gauss–Bonnet: \(\sum_i \delta_i = 2\pi\chi\) (closed genus-0: \(4\pi\)) | rad |
| \(K_{\mathrm{tot}}\) (AKDE UI) | **Project-specific:** **vertical** altitude \(H\) above base plane (same as \(H\) row); \(s=\sqrt{R^2+H^2}\); \(R = L/(2\sin(\pi/N))\); \(\eta=2\arcsin(R\sin(\pi/N)/s)\); read-only \(\psi = \arctan(H/R)\), \(\kappa = H/R\). See §1.1.1 and §2.6 in [plan.md](plan.md). **Not** a DETC symbol — do not equate to \(\sum \theta\), slant \(s\), or input \(\delta_{\mathrm{apex}}\) | **mm** for \(H\); no cm/m/in conversion in v1 |

**Length units:** AKDE v1 fixes **millimeters (mm)** for all physical lengths. DETC uses generic length symbols; AKDE does not reinterpret paper formulas — only the numeric I/O and display scale.
