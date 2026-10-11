import { Copy, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Regimen } from "../pk";
import { limits, validate } from "../pk";
export type Draft = Record<keyof Regimen, string>;
export const toDraft = (r: Regimen): Draft =>
  Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, String(v)]),
  ) as Draft;
export const parseDraft = (d: Draft): Regimen =>
  Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, v.trim() === "" ? NaN : Number(v)]),
  ) as unknown as Regimen;
const fields: {
  key: keyof Regimen;
  label: string;
  unit: string;
  step: string;
}[] = [
  { key: "dose", label: "Dose", unit: "mg", step: "50" },
  { key: "interval", label: "Dosing interval", unit: "h", step: "1" },
  { key: "infusion", label: "Infusion duration", unit: "h", step: "0.5" },
  { key: "clearance", label: "Clearance", unit: "L/h", step: "0.5" },
  { key: "volume", label: "Volume of distribution", unit: "L", step: "5" },
  { key: "binding", label: "Protein binding", unit: "%", step: "1" },
  { key: "mic", label: "MIC", unit: "mg/L", step: "0.5" },
];
interface Props {
  draft: Draft;
  active: number;
  onChange: (d: Draft) => void;
  onActive: (n: number) => void;
  onCopy: () => void;
  onReset: () => void;
  comparison: boolean;
}
export default function RegimenForm({
  draft,
  active,
  onChange,
  onActive,
  onCopy,
  onReset,
  comparison,
}: Props) {
  const r = parseDraft(draft),
    errors = validate(r);
  return (
    <section className="panel regimen-panel" aria-labelledby="regimen-title">
      <div className="panel-heading">
        <h2 id="regimen-title">
          <SlidersHorizontal size={17} /> Dosing regimen
        </h2>
        <button
          className="icon-button"
          title="Reset selected regimen to preset"
          aria-label="Reset selected regimen to preset"
          onClick={onReset}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div
        className="regimen-tabs"
        role="group"
        aria-label="Choose regimen to edit"
      >
        <button
          className={active === 0 ? "selected" : ""}
          aria-pressed={active === 0}
          onClick={() => onActive(0)}
        >
          <span className="dot a" /> Regimen A
        </button>
        {comparison && (
          <button
            className={active === 1 ? "selected b" : ""}
            aria-pressed={active === 1}
            onClick={() => onActive(1)}
          >
            <span className="dot b" /> Regimen B
          </button>
        )}
      </div>
      <div className="form-fields">
        {fields.map(({ key, label, unit, step }) => (
          <label
            key={key}
            className={"field " + (key === "mic" ? "wide" : "")}
            htmlFor={"input-" + key}
          >
            <span className="field-label" id={"label-" + key}>
              {label}
            </span>
            <span className={"input-wrap " + (errors[key] ? "invalid" : "")}>
              <input
                id={"input-" + key}
                aria-labelledby={"label-" + key + " unit-" + key}
                name={key}
                type="number"
                value={draft[key]}
                min={limits[key][0]}
                max={
                  key === "infusion" && Number.isFinite(r.interval)
                    ? r.interval
                    : limits[key][1]
                }
                step={step}
                onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? "error-" + key : undefined}
              />
              <span className="unit" id={"unit-" + key}>
                {unit}
              </span>
            </span>
            {errors[key] && (
              <span id={"error-" + key} className="field-error">
                {errors[key]}
              </span>
            )}
            {key === "mic" && (
              <span className="field-help">
                Minimum inhibitory concentration of the organism.
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="infusion-shortcuts">
        <span>Infusion strategy</span>
        <div>
          {[
            { label: "Bolus", v: 0 },
            { label: "30 min", v: 0.5 },
            { label: "3 h", v: 3 },
          ].map(({ label, v }) => (
            <button
              key={label}
              disabled={Number.isFinite(r.interval) && v > r.interval}
              className={r.infusion === v ? "active" : ""}
              onClick={() => onChange({ ...draft, infusion: String(v) })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted">
        0 h represents an instantaneous IV bolus. Infusions cannot overlap.
      </p>
      {comparison && (
        <button className="copy-button" onClick={onCopy}>
          <Copy size={14} /> Copy A parameters to B
        </button>
      )}
    </section>
  );
}
