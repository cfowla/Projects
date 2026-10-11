import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Download,
  FlaskConical,
  Info,
  Library,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { metrics, sampleTimes, concentration, validate } from "./pk";
import type { Index, Mode, Target } from "./pk";
import { presets } from "./presets";
import RegimenForm, { parseDraft, toDraft } from "./components/RegimenForm";
import type { Draft } from "./components/RegimenForm";
import ExposureChart from "./components/ExposureChart";
import Results, { indexLabel } from "./components/Results";
import LearnDialog from "./components/LearnDialog";
function downloadCSV(rows: (string | number)[][]) {
  const content = rows
    .map((row) =>
      row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "exposure-lab-simulation.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [presetId, setPresetId] = useState("beta"),
    [drafts, setDrafts] = useState<[Draft, Draft]>(
      () => presets[0].regimens.map(toDraft) as [Draft, Draft],
    );
  const [mode, setMode] = useState<Mode>("steady"),
    [comparison, setComparison] = useState(true),
    [active, setActive] = useState(0),
    [hours, setHours] = useState(24);
  const [targetIndex, setTargetIndex] = useState<Index>("time"),
    [basis, setBasis] = useState<"free" | "total">("free"),
    [min, setMin] = useState("40"),
    [max, setMax] = useState("");
  const [dialog, setDialog] = useState<
      "model" | "indices" | "references" | null
    >(null),
    [notice, setNotice] = useState(true),
    [toast, setToast] = useState("");
  const preset = presets.find((p) => p.id === presetId)!;
  const regimens = useMemo(
    () => drafts.slice(0, comparison ? 2 : 1).map(parseDraft),
    [drafts, comparison],
  );
  const invalid = regimens
    .map((r, i) =>
      Object.keys(validate(r)).length ? `Regimen ${i === 0 ? "A" : "B"}` : null,
    )
    .filter(Boolean);
  const results = useMemo(
    () =>
      regimens.map((r) =>
        Object.keys(validate(r)).length ? null : metrics(r, mode),
      ),
    [regimens, mode],
  );
  const target: Target = {
    index: targetIndex,
    basis: targetIndex === "time" ? "free" : basis,
    minimum: Number(min),
    maximum: max.trim() === "" ? null : Number(max),
  };
  const targetError =
    min.trim() === "" ||
    !Number.isFinite(target.minimum) ||
    target.minimum < 0 ||
    (targetIndex === "time" && target.minimum > 100) ||
    (target.maximum !== null &&
      (!Number.isFinite(target.maximum) ||
        target.maximum < target.minimum ||
        (targetIndex === "time" && target.maximum > 100)));
  const dirty = drafts.some(
    (d, i) => JSON.stringify(d) !== JSON.stringify(toDraft(preset.regimens[i])),
  );
  function loadPreset(id: string) {
    const p = presets.find((p) => p.id === id)!;
    setPresetId(id);
    setDrafts(p.regimens.map(toDraft) as [Draft, Draft]);
    setTargetIndex(p.target.index);
    setBasis(p.target.basis);
    setMin(String(p.target.minimum));
    setMax(p.target.maximum === null ? "" : String(p.target.maximum));
  }
  function exportCSV() {
    const rows: (string | number)[][] = [
      ["Exposure Lab — educational use only, not for clinical dosing"],
      ["Mode", mode],
      [
        "Metrics window",
        "First displayed dosing interval; AUC24 uses 0–24 h with repeated doses",
      ],
      [
        "Target",
        indexLabel(target),
        "Concentration basis",
        target.basis,
        "Minimum",
        target.minimum,
        "Maximum",
        target.maximum ?? "None",
      ],
    ];
    regimens.forEach((r, i) => {
      rows.push(["Regimen", i === 0 ? "A" : "B"]);
      Object.entries(r).forEach(([key, v]) =>
        rows.push([
          key +
            " (" +
            (
              {
                dose: "mg",
                interval: "h",
                infusion: "h",
                clearance: "L/h",
                volume: "L",
                binding: "%",
                mic: "mg/L",
              } as Record<string, string>
            )[key] +
            ")",
          v,
        ]),
      );
      Object.entries(results[i]!).forEach(([key, v]) =>
        rows.push([
          key +
            " (" +
            (
              {
                timeAboveMIC: "%",
                auc24: "mg·h/L",
                freeAuc24: "mg·h/L",
                cmax: "mg/L",
                cmin: "mg/L",
                freeCmax: "mg/L",
                freeCmin: "mg/L",
                peakMIC: "unitless",
                aucMIC: "h",
                halfLife: "h",
              } as Record<string, string>
            )[key] +
            ")",
          v,
        ]),
      );
    });
    rows.push([
      "Time (h)",
      ...regimens.flatMap((_, i) => [
        `Total ${i === 0 ? "A" : "B"} (mg/L)`,
        `Free ${i === 0 ? "A" : "B"} (mg/L)`,
      ]),
    ]);
    sampleTimes(regimens, hours).forEach((time) =>
      rows.push([
        time,
        ...regimens.flatMap((r) => {
          const c = concentration(r, time, mode);
          return [c, c * (1 - r.binding / 100)];
        }),
      ]),
    );
    downloadCSV(rows);
    setToast("Simulation exported as CSV.");
    setTimeout(() => setToast(""), 3000);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          <span>
            Exposure<span className="brand-lab">lab</span>
            <small>ANTIMICROBIAL PK/PD</small>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button className="nav-item current" aria-current="page">
            <SlidersHorizontal size={18} /> Simulator
            <span className="nav-dot" />
          </button>
          <button className="nav-item" onClick={() => setDialog("model")}>
            <BookOpen size={18} /> Model & equations
          </button>
          <button className="nav-item" onClick={() => setDialog("references")}>
            <Library size={18} /> References
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-icon">
            <FlaskConical size={23} />
          </span>
          <h3>A space to explore.</h3>
          <p>
            Change a parameter.
            <br />
            See the exposure shift.
            <br />
            Build your PK/PD intuition.
          </p>
          <div className="local-label">
            <span className="dot a" /> Runs entirely in your browser
          </div>
          <span className="version">EDUCATIONAL MODEL · V1.0</span>
        </div>
      </aside>
      <main className="main">
        <header className="page-header">
          <div>
            <div className="eyebrow breadcrumb">
              CLINICAL LEARNING <span>/</span> INTERACTIVE SIMULATOR
            </div>
            <h1>
              Antimicrobial PK/PD simulator<span className="title-dot">.</span>
            </h1>
            <p>
              Explore how dosing strategies shape exposure and target
              attainment.
            </p>
          </div>
          <div className="header-actions">
            <button
              className="icon-button reset-all"
              aria-label="Reset all simulation settings"
              title="Reset all simulation settings"
              onClick={() => {
                loadPreset("beta");
                setMode("steady");
                setComparison(true);
                setActive(0);
                setHours(24);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="export-button"
              disabled={invalid.length > 0 || targetError}
              onClick={exportCSV}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>
        {notice && (
          <div className="education-notice">
            <ShieldCheck size={18} />
            <p>
              <strong>For learning, not prescribing.</strong> A simplified
              educational model. Example parameters are not clinical dosing
              recommendations.
            </p>
            <button
              className="icon-button"
              aria-label="Dismiss educational notice"
              onClick={() => setNotice(false)}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <section
          className="preset-section"
          aria-label="Illustrative antimicrobial presets"
        >
          <div className="section-overline">
            <span>START WITH AN EXAMPLE</span>
            <span className="example-label">
              {dirty ? "Customized parameters" : "Illustrative parameters"}
            </span>
          </div>
          <div className="preset-grid">
            {presets.map((p) => (
              <button
                key={p.id}
                className={
                  "preset-card " + (p.id === presetId ? "selected" : "")
                }
                aria-label={`${p.name}: ${p.example}, ${p.index}`}
                aria-pressed={p.id === presetId}
                onClick={() => loadPreset(p.id)}
              >
                <span className="preset-symbol">
                  {p.id === "beta" ? (
                    <Activity size={19} />
                  ) : p.id === "vanco" ? (
                    <FlaskConical size={19} />
                  ) : (
                    <ArrowRight size={19} />
                  )}
                </span>
                <span className="preset-text">
                  <strong>{p.name}</strong>
                  <small>{p.example}</small>
                </span>
                <span className="index-tag">{p.index}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="simulation-toolbar">
          <div className="mode-tabs" role="group" aria-label="Simulation state">
            <button
              className={mode === "first" ? "active" : ""}
              aria-pressed={mode === "first"}
              onClick={() => setMode("first")}
            >
              First dose
            </button>
            <button
              className={mode === "steady" ? "active" : ""}
              aria-pressed={mode === "steady"}
              onClick={() => setMode("steady")}
            >
              Steady state
            </button>
          </div>
          <label className="compare-control">
            <span>Compare two regimens</span>
            <input
              role="switch"
              type="checkbox"
              checked={comparison}
              onChange={(e) => {
                setComparison(e.target.checked);
                setActive(0);
              }}
            />
            <span className="switch-track" />
          </label>
        </div>
        <div className="workspace-grid">
          <div className="controls-column">
            <RegimenForm
              draft={drafts[active]}
              active={active}
              comparison={comparison}
              onActive={setActive}
              onChange={(d) =>
                setDrafts(
                  (current) =>
                    current.map((x, i) => (i === active ? d : x)) as [
                      Draft,
                      Draft,
                    ],
                )
              }
              onCopy={() => {
                setDrafts((current) => [current[0], { ...current[0] }]);
                setActive(1);
              }}
              onReset={() =>
                setDrafts(
                  (current) =>
                    current.map((x, i) =>
                      i === active ? toDraft(preset.regimens[i]) : x,
                    ) as [Draft, Draft],
                )
              }
            />
            <section
              className="panel target-panel"
              aria-labelledby="target-title"
            >
              <div className="panel-heading">
                <h2 id="target-title">PK/PD target</h2>
                <button
                  className="icon-button"
                  aria-label="Explain target indices"
                  onClick={() => setDialog("indices")}
                >
                  <Info size={16} />
                </button>
              </div>
              <label className="field">
                <span className="field-label">Target index</span>
                <select
                  value={targetIndex}
                  onChange={(e) => {
                    const index = e.target.value as Index;
                    setTargetIndex(index);
                    const example = presets.find(
                      (p) => p.target.index === index,
                    )!.target;
                    setMin(String(example.minimum));
                    setMax(
                      example.maximum === null ? "" : String(example.maximum),
                    );
                    setBasis(example.basis);
                  }}
                >
                  <option value="time">%fT &gt; MIC</option>
                  <option value="auc">AUC24 / MIC</option>
                  <option value="peak">Cmax / MIC</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Concentration basis</span>
                <select
                  aria-label="Target concentration basis"
                  value={targetIndex === "time" ? "free" : basis}
                  disabled={targetIndex === "time"}
                  onChange={(e) => setBasis(e.target.value as "total" | "free")}
                >
                  <option value="free">Free (unbound)</option>
                  <option value="total">Total</option>
                </select>
              </label>
              <div className="target-thresholds">
                <label className="field">
                  <span className="field-label">
                    Minimum{" "}
                    {targetIndex === "time"
                      ? "(%)"
                      : targetIndex === "auc"
                        ? "(h)"
                        : ""}
                  </span>
                  <input
                    aria-label="Minimum target threshold"
                    type="number"
                    min="0"
                    max={targetIndex === "time" ? 100 : undefined}
                    step="any"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    aria-invalid={targetError}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Maximum (optional)</span>
                  <input
                    aria-label="Maximum target threshold"
                    type="number"
                    min={Number(min) || 0}
                    max={targetIndex === "time" ? 100 : undefined}
                    step="any"
                    placeholder="No upper limit"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    aria-invalid={targetError}
                  />
                </label>
              </div>
              {targetError && (
                <p className="field-error" role="alert">
                  Use finite, nonnegative thresholds. Maximum must be ≥ minimum;
                  time targets must be ≤ 100%.
                </p>
              )}
              <p className="small muted target-help">
                Thresholds are teaching inputs, not treatment recommendations.
              </p>
            </section>
          </div>
          <div className="analysis-column">
            {invalid.length > 0 ? (
              <section className="panel error-panel" role="alert">
                <Info size={26} />
                <h2>Check your parameters</h2>
                <p>
                  {invalid.join(" and ")} contains an invalid input. Select that
                  regimen and correct the highlighted fields to resume the
                  simulation.
                </p>
              </section>
            ) : (
              <>
                <ExposureChart
                  regimens={regimens}
                  mode={mode}
                  hours={hours}
                  onHours={setHours}
                />
                {targetError ? (
                  <div className="panel target-error" role="alert">
                    Correct the target thresholds to view the exposure summary
                    and target status.
                  </div>
                ) : (
                  <Results
                    regimens={regimens}
                    results={results.filter((r) => r !== null)}
                    target={target}
                    mode={mode}
                    onInfo={() => setDialog("indices")}
                  />
                )}
              </>
            )}
            <div className="context-card">
              <div className="context-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <h3>
                  {preset.name}: {preset.index}
                </h3>
                <p>{preset.note}</p>
                <button
                  className="text-button"
                  onClick={() => setDialog("references")}
                >
                  Explore the references <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <footer>
          <span>
            <Activity size={13} /> Exposure Lab
          </span>
          <p>
            Educational use only. Do not use for clinical dosing decisions.
            Verify clinical decisions against current guidance and
            patient-specific data.
          </p>
          <button onClick={() => setDialog("model")}>
            Model assumptions <ArrowRight size={12} />
          </button>
        </footer>
      </main>
      {dialog && <LearnDialog kind={dialog} onClose={() => setDialog(null)} />}
      <div aria-live="polite" className={toast ? "toast visible" : "toast"}>
        {toast}
      </div>
    </div>
  );
}
