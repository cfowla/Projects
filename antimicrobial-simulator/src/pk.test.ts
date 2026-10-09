import { describe, expect, it } from "vitest";
import {
  concentration,
  integrate,
  metrics,
  sampleTimes,
  targetStatus,
  targetValue,
  trapezoid,
  validate,
} from "./pk";
import type { Regimen } from "./pk";
const r: Regimen = {
  dose: 1000,
  interval: 8,
  infusion: 1,
  clearance: 5,
  volume: 20,
  binding: 20,
  mic: 8,
};
const k = r.clearance / r.volume;
function near(a: number, b: number, tol = 1e-8) {
  expect(Math.abs(a - b)).toBeLessThan(tol * Math.max(1, Math.abs(b)));
}
describe("IV bolus and elimination", () => {
  it("matches D/V exp(-kt) after first bolus", () => {
    const b = { ...r, infusion: 0 };
    near(concentration(b, 0, "first"), 50);
    near(concentration(b, 4, "first"), 50 * Math.exp(-1));
  });
  it("half-life halves concentration", () => {
    const b = { ...r, infusion: 0 };
    near(concentration(b, metrics(b, "first").halfLife, "first"), 25);
  });
  it("superposes repeated boluses without a finite warm-up", () => {
    const b = { ...r, infusion: 0 };
    const t = 19;
    near(
      concentration(b, t, "first"),
      [0, 8, 16].reduce((sum, d) => sum + 50 * Math.exp(-k * (t - d)), 0),
    );
  });
  it("calculates analytical SS bolus peak and trough", () => {
    const b = { ...r, infusion: 0 };
    const m = metrics(b, "steady");
    near(m.cmax, 50 / (1 - Math.exp(-2)));
    near(m.cmin, m.cmax * Math.exp(-2));
  });
});
describe("intermittent infusion", () => {
  it("matches infusion equation and is continuous at infusion end", () => {
    near(concentration(r, 0.5, "first"), 200 * (1 - Math.exp(-k * 0.5)));
    near(concentration(r, 1, "first"), 200 * (1 - Math.exp(-k)));
    near(
      concentration(r, 1 - 1e-9, "first"),
      concentration(r, 1 + 1e-9, "first"),
    );
  });
  it("matches post-infusion elimination", () => {
    near(
      concentration(r, 4, "first"),
      200 * (1 - Math.exp(-k)) * Math.exp(-k * 3),
    );
  });
  it("matches sum of prior infusion doses", () => {
    const t = 17.4;
    const single = (s: number) =>
      200 * (1 - Math.exp(-k)) * Math.exp(-k * (s - 1));
    near(
      concentration(r, t, "first"),
      single(t) + single(t - 8) + single(t - 16),
    );
  });
  it("matches independent Runge-Kutta ODE solution over repeated doses", () => {
    const step = 0.002;
    let c = 0;
    for (let i = 0; i < 10000; i++) {
      const t = i * step;
      const on = t % 8 < 1 - 1e-8;
      const rate = on ? 50 : 0;
      const f = (v: number) => rate - k * v;
      const a = f(c),
        b = f(c + (step * a) / 2),
        d = f(c + (step * b) / 2),
        e = f(c + step * d);
      c += (step * (a + 2 * b + 2 * d + e)) / 6;
    }
    near(concentration(r, 20, "first"), c, 1e-7);
  });
  it("has periodic analytical steady state, including infusion boundary", () => {
    for (const t of [0, 0.5, 1, 7.9])
      near(concentration(r, t, "steady"), concentration(r, t + 8, "steady"));
  });
  it("converges to analytical steady state after many doses", () =>
    near(
      concentration(r, 80 * r.interval + 0.6, "first"),
      concentration(r, 0.6, "steady"),
    ));
  it("remains stable with very slow elimination", () => {
    const slow = { ...r, clearance: 0.001, volume: 1000 };
    const expected = slow.dose / slow.clearance;
    near(integrate(slow, 0, slow.interval, "steady"), expected, 1e-8);
    expect(Number.isFinite(metrics(slow, "first").auc24)).toBe(true);
  });
  it("supports back-to-back infusions as continuous input", () => {
    const c = { ...r, infusion: r.interval };
    for (const t of [0, 1, 8, 24])
      near(concentration(c, t, "steady"), c.dose / c.interval / c.clearance);
    near(metrics(c, "steady").timeAboveMIC, 100);
  });
});
describe("integration and exposure", () => {
  it("SS interval AUC equals dose / clearance for bolus and infusion", () => {
    for (const infusion of [0, 0.001, 1, 4, 8])
      near(integrate({ ...r, infusion }, 0, 8, "steady"), 200);
  });
  it("SS AUC24 equals daily dose / clearance for a divisor of 24", () =>
    near(metrics(r, "steady").auc24, 600));
  it("first interval follows mass balance, not SS AUC", () => {
    const end = concentration(r, 8 - 1e-9, "first");
    near(integrate(r, 0, 8, "first"), (r.dose - r.volume * end) / r.clearance);
  });
  it("AUC24 includes subsequent doses after initiation", () => {
    const m = metrics(r, "first");
    expect(m.auc24).toBeGreaterThan(integrate(r, 0, 8, "first"));
    near(
      m.auc24,
      (3 * r.dose - r.volume * concentration(r, 24, "first")) / r.clearance,
    );
  });
  it("integrates an arbitrary subwindow and non-divisor intervals", () => {
    const x = { ...r, interval: 7 };
    const parts = integrate(x, 0, 3, "steady") + integrate(x, 3, 24, "steady");
    near(parts, integrate(x, 0, 24, "steady"));
    expect(
      Math.abs(
        metrics(x, "steady").auc24 - (24 * x.dose) / x.interval / x.clearance,
      ),
    ).toBeGreaterThan(1);
  });
  it("numerical trapezoids converge to exact infusion AUC", () => {
    const points = Array.from({ length: 24001 }, (_, i) => ({
      time: i / 1000,
      value: concentration(r, i / 1000, "first"),
    }));
    near(trapezoid(points), integrate(r, 0, 24, "first"), 1e-6);
  });
  it("integrates a known polynomial with expected accuracy", () => {
    near(
      trapezoid([
        { time: 0, value: 2 },
        { time: 1, value: 4 },
        { time: 3, value: 8 },
      ]),
      15,
    );
    expect(() =>
      trapezoid([
        { time: 2, value: 1 },
        { time: 1, value: 1 },
      ]),
    ).toThrow();
  });
});
describe("free drug and target attainment", () => {
  it("scales free AUC and peaks by fraction unbound", () => {
    const m = metrics(r, "steady");
    near(m.freeAuc24, m.auc24 * 0.8);
    near(m.freeCmax, m.cmax * 0.8);
  });
  it("matches exact bolus MIC crossing", () => {
    const b = { ...r, infusion: 0 };
    near(
      metrics(b, "first").timeAboveMIC,
      (100 * Math.log((50 * 0.8) / 8)) / k / 8,
    );
  });
  it("matches independent fine-grid time above MIC during infusion", () => {
    for (const mode of ["first", "steady"] as const) {
      let count = 0;
      const n = 80000;
      for (let i = 0; i < n; i++)
        if (concentration(r, ((i + 0.5) * 8) / n, mode) * 0.8 > 8) count++;
      near(metrics(r, mode).timeAboveMIC, (count * 100) / n, 0.00003);
    }
  });
  it("handles all bound drug, unreachable MIC, and full interval attainment", () => {
    near(metrics({ ...r, binding: 100 }, "steady").timeAboveMIC, 0);
    near(metrics({ ...r, mic: 1000 }, "steady").timeAboveMIC, 0);
    near(metrics({ ...r, mic: 0.001 }, "steady").timeAboveMIC, 100);
  });
  it("treats exact equality as not strictly above MIC for continuous infusion", () => {
    const x = { ...r, infusion: 8, binding: 0, mic: 25 };
    near(metrics(x, "steady").timeAboveMIC, 0);
  });
  it("distinguishes free / total targets and both target limits", () => {
    const m = metrics(r, "steady");
    near(
      targetValue(m, r, {
        index: "auc",
        basis: "free",
        minimum: 0,
        maximum: null,
      }),
      60,
    );
    expect(
      targetStatus(500, {
        index: "auc",
        basis: "total",
        minimum: 400,
        maximum: 600,
      }),
    ).toBe("met");
    expect(
      targetStatus(601, {
        index: "auc",
        basis: "total",
        minimum: 400,
        maximum: 600,
      }),
    ).toBe("above");
    expect(
      targetStatus(399, {
        index: "auc",
        basis: "total",
        minimum: 400,
        maximum: null,
      }),
    ).toBe("below");
  });
});
describe("validation and plotting", () => {
  it("rejects nonfinite, negative, zero, and overlapping infusions", () => {
    for (const x of [
      { ...r, dose: NaN },
      { ...r, clearance: 0 },
      { ...r, volume: -1 },
      { ...r, mic: 0 },
      { ...r, binding: 101 },
      { ...r, infusion: 9 },
    ]) {
      expect(Object.keys(validate(x)).length).toBeGreaterThan(0);
      expect(() => metrics(x, "first")).toThrow();
    }
  });
  it("rejects invalid integration windows and time", () => {
    expect(() => integrate(r, 3, 2)).toThrow();
    expect(() => concentration(r, -1)).toThrow();
    expect(() => integrate(r, 0, Infinity)).toThrow();
  });
  it("includes dose and infusion endpoints independent of plot resolution", () => {
    const times = sampleTimes([{ ...r, infusion: 0.37 }], 24);
    expect(times).toContain(8.37);
    expect(times).toContain(16);
    expect(times.at(-1)).toBe(24);
  });
});

describe("fractional interval boundaries", () => {
  it("integrates every cycle without stopping at a floating-point boundary", () => {
    for (const interval of [0.1, 0.3, 0.7, 2.4, 3.7]) {
      for (const infusion of [0, interval / 3]) {
        const x = { ...r, interval, infusion };
        near(
          integrate(x, 0, interval * 100, "steady"),
          (100 * x.dose) / x.clearance,
        );
      }
    }
  });
  it("uses the postdose side at an exact fractional bolus boundary", () => {
    const x = { ...r, interval: 0.1, infusion: 0 };
    const peak = metrics(x, "steady").cmax;
    near(concentration(x, 43 * 0.1, "steady"), peak);
    expect(concentration(x, 43 * 0.1 - 1e-7, "steady")).toBeLessThan(
      peak * 0.999,
    );
  });
  it("preserves first-dose mass balance for fractional repeat intervals", () => {
    const x = { ...r, interval: 0.1, infusion: 0.03 };
    near(
      integrate(x, 0, 24, "first"),
      (240 * x.dose - x.volume * concentration(x, 24, "first")) / x.clearance,
    );
  });
});
