# AKDE Formulas

This document summarizes the formulas currently implemented in [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts) for the uniform-molecule regular `N`-gon pyramid model.

All lengths are in `mm`. All angles are in `rad` internally.

## Inputs

- `N`: edge count
- `L`: base edge length
- `H`: vertical apex altitude, exposed in the UI as `K_tot`
- `T`: material thickness

## Primary Derived Geometry

Base circumradius:

\[
R = \frac{L}{2\sin(\pi/N)}
\]

Slant edge:

\[
s = \sqrt{R^2 + H^2}
\]

Apex elevation angle:

\[
\psi = \arctan(H/R)
\]

Rise ratio:

\[
\kappa = H/R
\]

Face apex angle of each lateral triangle:

\[
\eta = 2\arcsin\left(\frac{R\sin(\pi/N)}{s}\right)
\]

Discrete angle defect at the 3D apex:

\[
\delta_{\mathrm{apex}} = 2\pi - N\eta
\]

Uniform molecule angle:

\[
\theta = \frac{\delta_{\mathrm{apex}}}{N}
\]

Closure step:

\[
\tau = \frac{2\pi}{N}
\]

Molecule width as the outer chord at slant radius `s`:

\[
w = 2s\sin(\theta/2)
\]

## Major Cut

Physical major-cut radius:

\[
r_{\mathrm{apex,physical}} = \frac{T}{\sin(\theta/2)}
\]

Implemented visualization clamp:

\[
r_{\mathrm{apex}} = \min\left(\frac{T}{\sin(\theta/2)},\ 0.4s\right)
\]

If `T <= 0` or `\theta <= 0`, the implementation returns `0`.

## Dihedral And Minor Cut

Interior dihedral angle between adjacent lateral faces at a base corner:

\[
\gamma = \pi - \angle(\mathbf{n}_1,\mathbf{n}_2)
\]

where `n1` and `n2` are outward face normals of the two adjacent lateral faces computed from the 3D pyramid geometry.

The code supports two minor-cut formulas:

1. `tuck-flap`

\[
\ell = w\tan\left(\frac{\pi-\gamma}{2}\right)
\]

2. `lie-flat`

\[
\ell = \frac{T}{\sin(\gamma/2)}
\]

The currently selected branch is:

\[
\boxed{\ell = \frac{T}{\sin(\gamma/2)}}
\]

If `T <= 0` or `\gamma/2` is degenerate, the implementation returns `0`.

## Derived Pipeline

\[
(N, L, H, T)
\rightarrow R
\rightarrow s
\rightarrow (\psi,\kappa)
\rightarrow \eta
\rightarrow \delta_{\mathrm{apex}}
\rightarrow \theta
\rightarrow (\tau, w)
\rightarrow (\gamma, r_{\mathrm{apex}})
\]

## Golden Example

For the test-backed default case:

- `N = 4`
- `L = 100`
- `H = 100 / \sqrt{2} \approx 70.7107`
- `T = 1`

the implemented formulas give approximately:

- `R = 70.7107`
- `s = 100`
- `\psi = \pi/4`
- `\kappa = 1`
- `\eta = \pi/3`
- `\delta_apex = 2\pi/3`
- `\theta = \pi/6`
- `\tau = \pi/2`
- `w = 2(100)\sin(\pi/12) \approx 51.7638`
- `\gamma = \arccos(-1/3) \approx 1.9106`
- `r_apex = 1/\sin(\pi/12) \approx 3.8637`
- `\ell = 1/\sin(\gamma/2) \approx 1.2247` for the active `lie-flat` minor-cut branch

## Source Of Truth

- Implementation: [kirigami/model/geometry.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/geometry.ts)
- Types: [kirigami/model/types.ts](/Users/emredayangac/Documents/AKDE/kirigami/model/types.ts)
- Golden checks: [tests/geometry.test.ts](/Users/emredayangac/Documents/AKDE/tests/geometry.test.ts)
- Theory and product contract: [plan/plan.md](/Users/emredayangac/Documents/AKDE/plan/plan.md)
