# Delivery validation

Validated October 9, 2026, using Node.js 24.19.0 and npm 11.9.0.

- **41 tests passed**: 31 numerical/model tests and 10 UI workflow tests.
- **Production build passed**: strict TypeScript checks (`tsc -b`) and Vite static build.
- **GitHub Pages-style subpath check passed**: production HTML, JavaScript chunks, CSS, and bundled font assets resolve under `/simulator/` and match the built files.
- No backend, API credentials, remote runtime font requests, or accounts are used by the application.

The numerical tests include independent equations, dose superposition, Runge–Kutta ODE validation, mass balance, steady-state AUC, first-24-hour repeated exposure, exact and numerical integration, slow elimination, binding/MIC edge cases, and fractional-interval regressions. Fractional-cycle rounding is explicitly tested to prevent truncated integration and incorrect bolus boundary sides.

UI tests render the real Recharts curves with a fixed width/height supplied in place of responsive layout measurement. They check curve visibility controls, independent editing, simulation modes, validation/recovery, targets and upper-bound exceedance, preset loading, comparison/copy/reset, CSV content, and learning dialogs. jsdom supplies the DOM, but is not a graphical browser.

## Verification limits

The browser-control tool is unavailable in this session. Actual desktop/mobile visual inspection, pointer-tooltip behavior, browser dialog focus behavior, and cross-browser rendering have **not** been verified. No screenshot or browser compatibility claim is supplied.

A GitHub Pages workflow and deployment instructions are included. The workflow is adapted for this repository's `master` branch and `antimicrobial-simulator/` subdirectory. Pull requests run tests and builds; deployment happens only from `master` after Pages has been enabled. No live deployment was performed during local validation.

These checks validate the software calculations and tested workflows. They do not constitute clinical validation.
