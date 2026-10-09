import { Check, ArrowDown, ArrowUp, Info } from "lucide-react";
import type { Metrics, Mode, Regimen, Target } from "../pk";
import { targetStatus, targetValue } from "../pk";
export const format = (n: number, d = 1) =>
  Math.abs(n) >= 100000 || (n !== 0 && Math.abs(n) < 0.01)
    ? n.toExponential(2)
    : n.toLocaleString("en-US", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
const threshold = (n: number) =>
  Math.abs(n) >= 100000 || (n !== 0 && Math.abs(n) < 0.01)
    ? n.toExponential(2)
    : n.toLocaleString("en-US", { maximumFractionDigits: 6 });
export function indexLabel(t: Target) {
  return t.index === "time"
    ? "%fT > MIC"
    : t.index === "auc"
      ? `${t.basis === "free" ? "f" : ""}AUC₂₄ / MIC`
      : `${t.basis === "free" ? "f" : ""}Cmax / MIC`;
}
export default function Results({
  regimens,
  results,
  target,
  mode,
  onInfo,
}: {
  regimens: Regimen[];
  results: Metrics[];
  target: Target;
  mode: Mode;
  onInfo: () => void;
}) {
  return (
    <>
      <div
        className={"attainment-grid " + (regimens.length === 1 ? "single" : "")}
      >
        {results.map((m, i) => {
          const value = targetValue(m, regimens[i], target),
            status = targetStatus(value, target);
          const statusLabel =
            status === "met"
              ? "Within target"
              : status === "below"
                ? "Below target"
                : "Above target";
          const Icon =
            status === "met" ? Check : status === "below" ? ArrowDown : ArrowUp;
          return (
            <section
              key={i}
              className={
                "attainment-card " + (i === 0 ? "regimen-a" : "regimen-b")
              }
            >
              <div className="attainment-top">
                <span className="eyebrow">REGIMEN {i === 0 ? "A" : "B"}</span>
                <span className={"status " + status}>
                  <Icon size={12} /> {statusLabel}
                </span>
              </div>
              <div className="attainment-value">
                {format(value)}
                {target.index === "time" ? (
                  <span>%</span>
                ) : target.index === "auc" ? (
                  <span> h</span>
                ) : null}
                <span className="metric-name">{indexLabel(target)}</span>
              </div>
              <div className="target-track">
                <div
                  style={{
                    width:
                      Math.min(
                        100,
                        (value /
                          Math.max(target.maximum ?? target.minimum, 0.001)) *
                          100,
                      ) + "%",
                  }}
                  className={status}
                />
              </div>
              <div className="attainment-bottom">
                <span>
                  {format(regimens[i].dose, 0)} mg every{" "}
                  {format(regimens[i].interval, 1)} h
                </span>
                <span>
                  Target {target.maximum === null ? "≥ " : ""}
                  {threshold(target.minimum)}
                  {target.maximum !== null
                    ? "–" + threshold(target.maximum)
                    : ""}
                  {target.index === "time" ? "%" : ""}
                </span>
              </div>
            </section>
          );
        })}
      </div>
      <section className="panel results-panel" aria-labelledby="results-title">
        <div className="panel-heading">
          <h2 id="results-title">Exposure summary</h2>
          <button className="text-button" onClick={onInfo}>
            <Info size={14} /> About these indices
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PK/PD index</th>
                {results.map((_, i) => (
                  <th key={i}>
                    <span className={"dot " + (i === 0 ? "a" : "b")} /> Regimen{" "}
                    {i === 0 ? "A" : "B"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "%fT > MIC",
                  "% of first displayed dosing interval",
                  (m: Metrics) => format(m.timeAboveMIC) + "%",
                ],
                [
                  "AUC₂₄",
                  "Total · mg·h/L · 0–24 h",
                  (m: Metrics) => format(m.auc24),
                ],
                [
                  "Free AUC₂₄",
                  "Unbound · mg·h/L · 0–24 h",
                  (m: Metrics) => format(m.freeAuc24),
                ],
                [
                  "Cmax / Cmin",
                  "Total · mg/L · first displayed interval",
                  (m: Metrics) => format(m.cmax) + " / " + format(m.cmin),
                ],
                [
                  "Free Cmax / Cmin",
                  "Unbound · mg/L · first displayed interval",
                  (m: Metrics) =>
                    format(m.freeCmax) + " / " + format(m.freeCmin),
                ],
                [
                  "Cmax / MIC",
                  "Total peak-to-MIC ratio · unitless",
                  (m: Metrics) => format(m.peakMIC),
                ],
                [
                  "AUC₂₄ / MIC",
                  "Total exposure-to-MIC ratio · h",
                  (m: Metrics) => format(m.aucMIC),
                ],
                [
                  "Elimination half-life",
                  "t½ · h",
                  (m: Metrics) => format(m.halfLife, 2),
                ],
              ].map(([label, detail, get]) => (
                <tr key={String(label)}>
                  <td>
                    <strong>{String(label)}</strong>
                    <span>{String(detail)}</span>
                  </td>
                  {results.map((m, i) => (
                    <td key={i} className={i === 0 ? "text-a" : "text-b"}>
                      {(get as (m: Metrics) => string)(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="results-footnote">
          {mode === "first"
            ? "First-dose mode: interval metrics describe the first dose; AUC₂₄ includes all scheduled doses during the first 24 h."
            : "Steady state: interval metrics describe one repeating cycle; AUC₂₄ is the exact area in the displayed 0–24 h window."}{" "}
          Cmin is immediately before the next dose. These deterministic results
          are not a probability of target attainment.
        </p>
      </section>
    </>
  );
}
