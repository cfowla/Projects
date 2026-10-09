/** Pure one-compartment IV PK engine. All times h, dose mg, CL L/h, V L, concentration mg/L. */
export interface Regimen {
  dose: number;
  interval: number;
  infusion: number;
  clearance: number;
  volume: number;
  binding: number;
  mic: number;
}
export type Mode = "first" | "steady";
export type Index = "time" | "auc" | "peak";
export interface Target {
  index: Index;
  basis: "total" | "free";
  minimum: number;
  maximum: number | null;
}
export interface Metrics {
  timeAboveMIC: number;
  auc24: number;
  freeAuc24: number;
  cmax: number;
  cmin: number;
  freeCmax: number;
  freeCmin: number;
  peakMIC: number;
  aucMIC: number;
  halfLife: number;
}
export const limits: Record<keyof Regimen, [number, number]> = {
  dose: [0.001, 100000],
  interval: [0.1, 168],
  infusion: [0, 168],
  clearance: [0.001, 1000],
  volume: [0.1, 1000],
  binding: [0, 100],
  mic: [0.001, 1024],
};
export function validate(r: Regimen): Partial<Record<keyof Regimen, string>> {
  const errors: Partial<Record<keyof Regimen, string>> = {};
  for (const key of Object.keys(limits) as (keyof Regimen)[]) {
    const [min, max] = limits[key];
    if (!Number.isFinite(r[key]) || r[key] < min || r[key] > max)
      errors[key] = `Enter a value from ${min} to ${max}.`;
  }
  if (r.infusion > r.interval)
    errors.infusion = "Infusion must not exceed the dosing interval.";
  return errors;
}
function assertValid(r: Regimen) {
  if (Object.keys(validate(r)).length)
    throw new RangeError("Invalid regimen: " + JSON.stringify(validate(r)));
}
const decayIntegral = (k: number, t: number) => -Math.expm1(-k * t) / k;
// Stable integral of (1 - exp(-k*t)); avoid cancellation for slow elimination.
function riseIntegral(k: number, t: number) {
  const x = k * t;
  return Math.abs(x) < 1e-3
    ? t * (x / 2 - (x * x) / 6 + x ** 3 / 24 - x ** 4 / 120 + x ** 5 / 720)
    : t - decayIntegral(k, t);
}
function firstPeak(r: Regimen) {
  return r.infusion === 0
    ? r.dose / r.volume
    : (r.dose / (r.infusion * r.clearance)) *
        -Math.expm1((-r.clearance / r.volume) * r.infusion);
}
function baseline(r: Regimen, mode: Mode, n: number) {
  const k = r.clearance / r.volume;
  const residual = firstPeak(r) * Math.exp(-k * (r.interval - r.infusion));
  const denominator = -Math.expm1(-k * r.interval);
  return (
    (residual / denominator) *
    (mode === "steady" ? 1 : -Math.expm1(-k * r.interval * n))
  );
}
function within(r: Regimen, c0: number, s: number) {
  const k = r.clearance / r.volume;
  if (r.infusion === 0) return (c0 + r.dose / r.volume) * Math.exp(-k * s);
  const input = r.dose / (r.infusion * r.clearance);
  if (s <= r.infusion)
    return c0 * Math.exp(-k * s) + input * -Math.expm1(-k * s);
  const peak = c0 * Math.exp(-k * r.infusion) + firstPeak(r);
  return peak * Math.exp(-k * (s - r.infusion));
}
// Decimal intervals can divide to 42.99999999999999 at the exact 43rd dose.
// Snap only within floating-point roundoff; genuine predose times stay predose.
function cycleIndex(t: number, interval: number) {
  const cycles = t / interval;
  if (!Number.isFinite(cycles))
    throw new RangeError("Time exceeds numeric range.");
  const nearest = Math.round(cycles);
  return Math.abs(cycles - nearest) <=
    4 * Number.EPSILON * Math.max(1, Math.abs(cycles))
    ? nearest
    : Math.floor(cycles);
}
/** Right-continuous at bolus dose times; at t=0 SS includes residual from prior doses. */
export function concentration(
  r: Regimen,
  t: number,
  mode: Mode = "steady",
): number {
  assertValid(r);
  if (!Number.isFinite(t) || t < 0)
    throw new RangeError("Time must be finite and nonnegative.");
  const n = cycleIndex(t, r.interval),
    s = Math.max(0, t - n * r.interval);
  return within(r, baseline(r, mode, n), s);
}
function segmentArea(r: Regimen, c0: number, start: number, end: number) {
  const k = r.clearance / r.volume;
  if (r.infusion === 0)
    return (
      (c0 + r.dose / r.volume) *
      Math.exp(-k * start) *
      decayIntegral(k, end - start)
    );
  let area = 0;
  if (start < r.infusion) {
    const b = Math.min(end, r.infusion),
      dt = b - start;
    area +=
      within(r, c0, start) * decayIntegral(k, dt) +
      (r.dose / (r.infusion * r.clearance)) * riseIntegral(k, dt);
  }
  if (end > r.infusion) {
    const a = Math.max(start, r.infusion);
    area += within(r, c0, a) * decayIntegral(k, end - a);
  }
  return area;
}
/** Exact integration across dose and infusion boundaries. */
export function integrate(
  r: Regimen,
  start: number,
  end: number,
  mode: Mode = "steady",
): number {
  assertValid(r);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    end - start > 10000
  )
    throw new RangeError("Invalid integration window (maximum 10000 h).");
  let area = 0,
    t = start;
  while (t < end) {
    const n = cycleIndex(t, r.interval),
      origin = n * r.interval;
    const next = Math.min(end, (n + 1) * r.interval);
    if (next <= t)
      throw new RangeError("Integration exceeds numeric time resolution.");
    area += segmentArea(
      r,
      baseline(r, mode, n),
      Math.max(0, t - origin),
      Math.max(0, next - origin),
    );
    t = next;
  }
  return area;
}
/** Exact fraction of the first displayed interval strictly above MIC, using monotone crossings. */
function timeAbove(r: Regimen, mode: Mode) {
  const fu = 1 - r.binding / 100;
  if (fu === 0) return 0;
  const threshold = r.mic / fu,
    k = r.clearance / r.volume,
    c0 = baseline(r, mode, 0);
  const peak = within(r, c0, r.infusion);
  if (peak <= threshold) return 0;
  let rising = 0;
  if (r.infusion > 0) {
    if (c0 >= threshold) rising = r.infusion;
    else {
      const input = r.dose / (r.infusion * r.clearance);
      const crossing = -Math.log1p((c0 - threshold) / (input - c0)) / k;
      rising = Math.max(0, r.infusion - crossing);
    }
  }
  const falling = Math.min(
    r.interval - r.infusion,
    Math.max(0, Math.log(peak / threshold) / k),
  );
  return Math.min(100, Math.max(0, (100 * (rising + falling)) / r.interval));
}
export function metrics(r: Regimen, mode: Mode): Metrics {
  assertValid(r);
  const c0 = baseline(r, mode, 0),
    cmax = within(r, c0, r.infusion),
    cmin = within(r, c0, r.interval),
    fu = 1 - r.binding / 100;
  const auc24 = integrate(r, 0, 24, mode);
  return {
    timeAboveMIC: timeAbove(r, mode),
    auc24,
    freeAuc24: auc24 * fu,
    cmax,
    cmin,
    freeCmax: cmax * fu,
    freeCmin: cmin * fu,
    peakMIC: cmax / r.mic,
    aucMIC: auc24 / r.mic,
    halfLife: (Math.LN2 * r.volume) / r.clearance,
  };
}
export function targetValue(m: Metrics, r: Regimen, t: Target) {
  return t.index === "time"
    ? m.timeAboveMIC
    : t.index === "auc"
      ? (t.basis === "free" ? m.freeAuc24 : m.auc24) / r.mic
      : (t.basis === "free" ? m.freeCmax : m.cmax) / r.mic;
}
export function targetStatus(
  value: number,
  t: Target,
): "met" | "below" | "above" {
  return value < t.minimum
    ? "below"
    : t.maximum !== null && value > t.maximum
      ? "above"
      : "met";
}
/** Independent trapezoidal integrator for continuous samples (not bolus discontinuities). */
export function trapezoid(
  points: ReadonlyArray<{ time: number; value: number }>,
): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    if (!Number.isFinite(points[i].time) || !Number.isFinite(points[i].value))
      throw new RangeError("Samples must be finite.");
    if (i > 0) {
      const dt = points[i].time - points[i - 1].time;
      if (dt < 0) throw new RangeError("Samples must be sorted.");
      area += (dt * (points[i].value + points[i - 1].value)) / 2;
    }
  }
  return area;
}
export function sampleTimes(regimens: Regimen[], hours: number) {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 10000)
    throw new RangeError("Invalid sample window.");
  regimens.forEach(assertValid);
  const times = new Set<number>(
    Array.from({ length: 601 }, (_, i) => (i * hours) / 600),
  );
  regimens.forEach((r) => {
    for (let n = 0; n * r.interval <= hours; n++) {
      const t = n * r.interval;
      times.add(t);
      if (t + r.infusion <= hours) times.add(t + r.infusion);
      if (r.infusion === 0 && t > 0) times.add(t - 1e-7);
    }
  });
  return [...times].sort((a, b) => a - b);
}
