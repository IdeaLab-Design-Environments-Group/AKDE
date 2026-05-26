# AKDE Formula Summary

This file is the short Markdown companion to `current-formulas.tex`. It
describes the formulas currently used by the active implementation in
[kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts).

For detailed references and per-formula sourcing, use
[current-formulas.tex](/Users/emredayangac/Documents/AKDE/theory/current-formulas.tex) or the
compiled PDF.

## Inputs

- `N`: edge count
- `L`: base edge length
- `L_o`: outer polygon-face edge length on the perimeter
- `H`: vertical apex altitude, exposed in the UI as `K_tot`
- `T`: material thickness

All lengths are in `mm`. All angles are in `rad` internally.

`L_o` affects pattern construction and export layout, but it does not enter the
scalar geometry derivation in `kirigami/model/geometry.ts`.

## Primary Derived Geometry

\[
R = \frac{L}{2\sin(\pi/N)}
\]

\[
s = \sqrt{R^2 + H^2}
\]

\[
\psi = \operatorname{atan2}(H, R)
\]

\[
\kappa = \frac{H}{R}
\]

\[
\eta =
\begin{cases}
2\arcsin\left(\min\left(1,\frac{R\sin(\pi/N)}{s}\right)\right), & s > 0 \text{ and } R > 0 \\
0, & \text{otherwise}
\end{cases}
\]

\[
\delta_{\mathrm{apex}} = 2\pi - N\eta
\]

\[
\theta = \frac{\delta_{\mathrm{apex}}}{N}
\]

\[
\tau = \frac{2\pi}{N}
\]

\[
w = 2s\sin(\theta/2)
\]

## Major Cut And Molecule Measures

\[
r_{\mathrm{phys}} = \frac{T}{\sin(\theta/2)}
\]

\[
r_{\mathrm{apex}} =
\begin{cases}
\min\left(\frac{T}{\sin(\theta/2)}, 0.4s\right), & T > 0 \text{ and } \theta > 0 \\
0, & \text{otherwise}
\end{cases}
\]

\[
D = 2s\tan(\theta/2) = \frac{w}{\cos(\theta/2)}
\]

The implementation exposes `moleculeEndLeg = D`.

## Dihedral And Active Minor Cut

The adjacent-face dihedral is computed from the face normals of the 3D pyramid:

\[
\gamma = \pi - \angle(\mathbf{n}_1,\mathbf{n}_2)
\]

If either normal degenerates, the code returns `\pi`.

The active minor-cut branch is `MINOR_CUT_FORMULA = "fold-reach"`.

Fold-clearance depth:

\[
d_{\mathrm{clear}} =
\begin{cases}
T\tan(\gamma/2), & T > 0 \text{ and } 0 < \gamma/2 < \pi/2 \\
0, & \text{otherwise}
\end{cases}
\]

Active minor-cut length:

\[
\ell = \sqrt{(w/2)^2 + r_{\mathrm{apex}}^2}
= \operatorname{hypot}(w/2, r_{\mathrm{apex}})
\]

The implementation exposes `minorCutLength = \ell`.

## Constraint Scalars

The code uses:

\[
\varepsilon = 10^{-10}
\]

\[
\rho_{C1} = \left|N\theta + N\eta - 2\pi\right|
\]

\[
\rho_{C2} = \sqrt{\left(\sum_{n=0}^{N-1} w\cos(n\tau)\right)^2 + \left(\sum_{n=0}^{N-1} w\sin(n\tau)\right)^2}
\]

\[
\rho_{C3} = \max(0, |\theta| - (\pi - \varepsilon))
\]

\[
\rho_{C4} =
\begin{cases}
-w, & w < 0 \\
0, & w \ge 0
\end{cases}
\]

\[
\rho_{C5} = \max(0, w - L)
\]

\[
d_{\mathrm{relief}} =
\begin{cases}
T\tan(\gamma/2), & 0 < \gamma/2 < \pi/2 - 10^{-12} \\
\infty, & \text{otherwise}
\end{cases}
\]

\[
d_{\mathrm{avail}} = s - r_{\mathrm{apex}}
\]

\[
\rho_{C6} = \max(0, d_{\mathrm{relief}} - d_{\mathrm{avail}})
\]

## Source Of Truth

- Implementation: [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)
- Constraints: [kirigami/model/constraints.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/constraints.ts)
- Types: [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
- Tests: [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts)
- Theory docs: [plan.md](/Users/emredayangac/Documents/AKDE/theory/plan.md)
