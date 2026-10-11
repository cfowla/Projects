# Mathematical model and limitations

## Scope and units

One homogeneous compartment; intravenous bioavailability 1; linear first-order elimination; constant clearance, volume, dose, interval, and binding. Inputs are independent for each regimen, including MIC. There is no patient data or estimated renal function.

- D: dose (mg); τ: interval (h); T: infusion duration (h), 0 ≤ T ≤ τ.
- CL: clearance (L/h); V: apparent volume (L).
- k = CL/V (h⁻¹); t½ = ln(2)/k (h).
- R = D/T (mg/h) if T > 0; B: percentage bound; fu = 1 − B/100.
- Ctotal in mg/L; Cfree = fu × Ctotal. MIC in mg/L.

The ODE is `dC/dt = R(t)/V − kC`. Infusion is active from nτ through nτ + T; other times input is zero. A bolus adds D/V instantaneously. Infusions do not overlap. If T = τ, input is uninterrupted.

## Within one cycle

Let C0 be the concentration just before a dose and let s be time in that cycle.

For T > 0, define Q = R/CL:

```text
During infusion, 0 ≤ s ≤ T:
C(s) = C0 exp(−ks) + Q [1 − exp(−ks)]

After infusion, T < s < τ:
C(s) = C(T) exp[−k(s − T)]
```

For T = 0:

```text
C(s) = (C0 + D/V) exp(−ks)
```

Bolus evaluation at a dose time is right-continuous (after the new dose). Trough metrics explicitly use the left-sided predose value. Samples immediately preceding repeat boluses draw the discontinuous jump, without affecting the metrics.

## Repeated dosing and steady state

Let q = exp(−kτ). The peak after one dose with C0 = 0 is

```text
P1 = Q [1 − exp(−kT)]     for T > 0
P1 = D/V                 for T = 0
```

The predose contribution remaining from one dose is `b = P1 exp[−k(τ − T)]`.

For first-dose initiation, cycle n starts at nτ with

```text
C0,n = b (1 − qⁿ) / (1 − q), n ≥ 0
```

At analytical steady state, the prior-dose residual is

```text
C0,ss = b / (1 − q)
Cmax,ss = P1 / (1 − q)
Cmin,ss = Cmax,ss exp[−k(τ − T)]
```

These expressions include all preceding doses without a finite simulated warm-up. `expm1` avoids cancellation in `1 − exp(−x)` for small x. For uninterrupted infusion, steady concentration is D/(τ CL). Half-life is unchanged by dose, interval, or infusion strategy.

**First-dose mode still schedules subsequent doses.** Its interval metrics refer to the first dosing cycle, while AUC24 integrates all scheduled doses over the first 24 hours. Steady-state display time begins immediately at a repeat dose, not at initiation.

## Exact AUC integration

AUC24 is ∫₀²⁴ C(t) dt, with units mg·h/L. Integrals split at every dose and infusion boundary. For a segment of length Δ, initial concentration c, and constant infusion rate R:

```text
J(Δ) = [1 − exp(−kΔ)] / k
AUCsegment = c J(Δ) + (R/CL) [Δ − J(Δ)]
```

For an elimination-only segment, R = 0. For boluses, the initial concentration is post-bolus; the instantaneous jump has zero area.

A Taylor expansion evaluates `Δ − J(Δ)` when kΔ is small:

```text
Δ − J(Δ) = Δ [x/2 − x²/6 + x³/24 − x⁴/120 + x⁵/720 + …], x = kΔ
```

This avoids subtracting almost equal numbers at slow elimination or very short infusion durations. Free AUC is fu × total AUC.

At steady state, the exact area of one complete cycle is D/CL. If 24/τ is an integer, AUC24 = (24/τ)D/CL. Otherwise the **exact displayed 24 h window**, not the long-run normalized daily exposure, is reported. This convention matters particularly when τ > 24 h. Changing the chart window does not change AUC24.

An independent trapezoidal integrator is available for validation. It integrates sorted continuous samples; it is not used for displayed metrics and should not be used across bolus jumps without separating the discontinuity.

## Exact %fT>MIC

If fu = 0, time above MIC is zero. Otherwise set total-drug crossing threshold H = MIC/fu. Within one interval, concentration increases monotonically during infusion and decreases monotonically afterward (constant at uninterrupted-infusion steady state).

For an infusion rising from C0 < H to a peak above H, the crossing is

```text
tup = −ln[(Q − H)/(Q − C0)] / k
```

The implementation uses `log1p` for numerical stability. If C0 ≥ H, the entire infusion phase counts, except equality at an isolated point of zero duration. If the peak is ≤ H, there is no time strictly above MIC.

After infusion, the time to cross from peak P down to H is

```text
tdown = ln(P/H) / k
```

Clip each duration to its phase and compute `100 × (rising duration + falling duration)/τ`. For a bolus, the rising phase has zero duration. Comparison is strictly greater than MIC; a constant concentration exactly equal to MIC has 0% time above. Metrics are computed analytically, independent of chart sampling.

## Peaks, troughs, ratios, and targets

Cmax is the first displayed cycle's end-of-infusion peak (postdose for bolus). Cmin is immediately before the next dose; it is **not** zero simply because first-dose initiation starts from zero. Both total and free values are displayed.

Cmax/MIC is unitless. AUC24/MIC has units h. The comparison table presents total-drug ratios and separately provides free peaks and AUC; the target card can use total or free ratios. %fT>MIC is always free. Target pass status uses full-precision values with inclusive configured lower/upper limits. An upper-limit exceedance is separate from a below-target result.

This is deterministic exposure for specified inputs. It is **not** a Monte Carlo simulation or probability of target attainment, and it does not translate exposure into a probability of efficacy or toxicity.

## Input constraints

These broad numerical limits are software bounds, not clinically recommended ranges:

| Parameter       | Supported input |
| --------------- | --------------- |
| Dose            | 0.001–100000 mg |
| Interval        | 0.1–168 h       |
| Infusion        | 0–interval h    |
| Clearance       | 0.001–1000 L/h  |
| Volume          | 0.1–1000 L      |
| Protein binding | 0–100%          |
| MIC             | 0.001–1024 mg/L |

Inputs must be finite. Zero clearance/volume/MIC and overlapping infusions are rejected, as are blanks, negative values, and nonfinite values. Zero dose is excluded to keep regimen teaching inputs nonzero. Target thresholds must be finite and nonnegative; upper ≥ lower, with a maximum of 100 for time-percentage targets. Integration windows must be finite, nonnegative, ascending, and no longer than 10000 h. Empty input is not silently converted to zero. Invalid parameters hide the affected comparison rather than retaining stale results.

## Limitations

No distribution phase or multicompartment behavior; saturable elimination or protein binding; variable clearance/volume over time; changing renal function; dialysis/ECMO; active metabolites; tissue-specific penetration; delayed mixing; oral absorption; patient/population variability; bacterial growth or kill dynamics; resistance; post-antibiotic effects; toxicity; loading-dose strategy; therapeutic drug monitoring; assay uncertainty; covariate models; or Bayesian estimation. In particular, aminoglycoside end-of-infusion peaks are not clinically timed post-distribution concentrations.

The displayed numerical precision does not imply clinical precision. Presets have no patient weight, renal function, infection site, severity, or susceptibility context. Real decisions require validated tools, clinical judgment, measured concentrations when appropriate, current guidelines, and patient-specific information.

Dose-cycle boundaries for fractional intervals are located using a tolerance of four scaled machine epsilons in the cycle quotient. This corrects binary floating-point representations such as `4.3 / 0.1 = 42.99999999999999` without shifting resolvable predose samples. Chart dose times are generated by integer-cycle multiplication. Regression tests check fractional-interval integration, bolus boundary sides, and first-dose mass balance. Sampling windows must be positive, finite, and no longer than 10000 h; unresolvable numerical time windows produce an explicit error.
