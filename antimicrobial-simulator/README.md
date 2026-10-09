# Exposure Lab — Antimicrobial PK/PD Simulator

A complete educational, browser-based simulator for clinical pharmacists, pharmacy residents, and medical residents. Built with React, TypeScript, Vite, and Recharts. All calculations run locally. No accounts, backend, telemetry, paid APIs, or runtime font services are required.

**Educational use only. Do not use to prescribe, select, or adjust treatment.** A one-compartment model cannot establish clinical efficacy, safety, or patient-specific target attainment. All preset doses, PK parameters, protein binding, and MIC values are illustrative examples, not dosing recommendations.

## Run locally

Use Node.js 22.12+ or 24+ and npm (Node 24 was used for validation).

```sh
cd antimicrobial-simulator
npm ci
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. For a production preview:

```sh
npm test
npm run build
npm run preview
```

Open the printed preview URL, usually `http://localhost:4173`. Serve the `dist/` directory over HTTP; do not open `index.html` directly with a `file:` URL. The included lockfile makes installation reproducible.

## Features and use

- Seven adjustable inputs per regimen: dose (mg), interval (h), infusion duration (h), clearance (L/h), volume (L), protein binding (%), and MIC (mg/L).
- Intermittent IV infusions, instantaneous IV boluses (infusion = 0), and back-to-back infusions (infusion = interval).
- First-dose initiation from zero with repeated doses, or analytical steady state without a finite warm-up simulation.
- Two independently adjustable regimens with an overlaid comparison chart and side-by-side target cards and metrics table. Disable comparison for a single regimen.
- Interactive tooltip, 24/48/72 h chart windows, total/free visibility toggles, and a keyboard/touch-accessible time-inspection slider showing exact concentrations.
- %fT>MIC, total/free AUC24, total/free Cmax and Cmin, total Cmax/MIC and AUC24/MIC, and elimination half-life.
- Configurable index, concentration basis, lower threshold, and optional upper threshold. Values above a configured upper limit receive an **Above target** indication.
- Illustrative beta-lactam, vancomycin, and aminoglycoside presets, with explanations and literature references.
- CSV export of inputs, simulation mode, target configuration, metrics, and sampled curves. Exports retain full numerical precision; the interface rounds for display.
- In-app model equations, index definitions, and educational-use notes. Responsive layouts, visible keyboard focus, explicit input labels/units, error states, and modal-dialog keyboard support.

Select a preset, edit Regimen A or B, and observe the immediate results. Preset selection reloads both regimens and its target. Editing either regimen marks the inputs as customized. The small reset button in the regimen panel resets only that selected regimen; the header reset restores the entire default simulation. Changing the target index loads that index's illustrative threshold and basis.

## Metric conventions

These conventions are deliberate and also stated in the interface:

| Metric    | Definition                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| %fT>MIC   | Exact percentage of the first displayed dosing interval with free concentration **strictly greater than** MIC.        |
| Cmax      | End-of-infusion peak, or immediate post-bolus peak, in the first displayed interval.                                  |
| Cmin      | Concentration immediately **before the next dose**, not the absolute lowest concentration since treatment initiation. |
| AUC24     | Exact integral from 0 to 24 h. In first-dose mode it includes every subsequent scheduled dose in that window.         |
| AUC24/MIC | Units are hours; selectable target basis is total or free.                                                            |
| Cmax/MIC  | Unitless; selectable target basis is total or free.                                                                   |
| Half-life | ln(2) × V / CL, in hours.                                                                                             |

At steady state, AUC24 equals `dose × (24 / interval) / clearance` **when the interval divides 24 h**. For other intervals, this application reports the exact displayed 24 h window, which can differ from the normalized average daily exposure. AUC24 always uses 0–24 h regardless of the chart's 24/48/72 h setting.

Target status uses unrounded metrics and inclusive thresholds: `value >= minimum`, and, if configured, `value <= maximum`. %fT>MIC always uses free drug. Vancomycin's illustrative range uses **total-drug** AUC24/MIC. Do not confuse deterministic target status with population probability of target attainment.

## Equations, assumptions, and references

See [docs/MODEL.md](docs/MODEL.md) for equations, integration, analytical MIC crossings, input bounds, and limitations; see [docs/REFERENCES.md](docs/REFERENCES.md) for citations and preset context.

The PK engine is independent of React in `src/pk.ts`. Example data reside in `src/presets.ts`; UI components do not perform the underlying PK calculations. Fonts are bundled with the production assets.

## Validation

```sh
npm test          # Numerical and UI workflow tests
npm run build    # Strict TypeScript checks and production Vite build
npm run test:watch
```

Numerical tests cover independent bolus and infusion formulas, repeated-dose superposition, analytical steady state, convergence, half-life, continuous input, slow elimination, exact integration and mass balance, non-divisor intervals, trapezoidal numerical integration, free-drug MIC crossings, protein binding edge cases, target boundaries, and invalid inputs. An independent Runge–Kutta ODE solution validates repeated infusion exposure.

UI tests cover independent editing, preset loading, first-dose/steady-state switching, invalid regimen handling, target validation, upper-bound status, comparison, copy/reset, CSV export, rendered curves and visibility controls, and learning notes. They run in jsdom, which has no browser layout engine; the responsive chart wrapper is given a fixed size in these tests, while the real Recharts SVG rendering remains active. UI tests do **not** establish visual rendering or cross-browser compatibility. See `docs/VALIDATION.md` for the delivered check results and verification limits.

## Deploy to GitHub Pages

The repository workflow at `.github/workflows/antimicrobial-simulator.yml` tests and builds this subdirectory on pull requests to `master`, then deploys it after a push to `master`. No server or API secrets are needed.

1. In this repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
2. Merge the simulator branch into `master`, or run **Validate and deploy antimicrobial simulator** manually from `master`.
3. Open the URL reported by the deployment job, normally `https://cfowla.github.io/Projects/`.

Vite's `base: './'` makes assets work under repository subpaths and domain roots. There is no client-side router requiring a rewrite. The workflow uses GitHub's Pages artifact/deployment actions, scopes caching and build commands to `antimicrobial-simulator`, and tests pull requests without attempting deployment. Only `master` deployments receive Pages write permissions.

For a standalone repository, copy this directory to its root and adapt the repository workflow: remove `defaults.run.working-directory`, change the cache dependency path to `package-lock.json`, set the Pages artifact path to `dist`, and adjust the branch trigger to that repository's default branch.

For manual deployment, run `npm ci && npm test && npm run build`, then publish the **contents** of `dist/` to your Pages branch or any static host. GitHub Pages may require a public repository on a free account. The build contains only local assets; the reference links open external literature sites only when explicitly clicked.

## Source map

```text
src/pk.ts                       Pure analytical calculation engine
src/pk.test.ts                  Numerical/model tests
src/presets.ts                  Illustrative examples and teaching targets
src/App.tsx                     Application state and export workflow
src/App.test.tsx                UI workflow tests
src/components/RegimenForm.tsx   Inputs and validation
src/components/ExposureChart.tsx Curves, legends, tooltip, time inspector
src/components/Results.tsx       Target status and side-by-side metrics
src/components/LearnDialog.tsx   Mathematical and literature context
src/styles.css                  Responsive styling
../.github/workflows/antimicrobial-simulator.yml    Test/build/GitHub Pages deployment
```

## License

MIT; see [LICENSE](LICENSE). Bundled fonts use the SIL Open Font License; their license files are included in the dependency packages and delivery notices. The license does not imply validation for clinical use.
