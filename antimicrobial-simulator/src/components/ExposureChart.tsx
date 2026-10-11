import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Crosshair, TrendingUp } from "lucide-react";
import { concentration, sampleTimes } from "../pk";
import type { Mode, Regimen } from "../pk";
const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });
export default function ExposureChart({
  regimens,
  mode,
  hours,
  onHours,
}: {
  regimens: Regimen[];
  mode: Mode;
  hours: number;
  onHours: (n: number) => void;
}) {
  const [total, setTotal] = useState(true),
    [free, setFree] = useState(true),
    [inspect, setInspect] = useState(4);
  const data = useMemo(
    () =>
      sampleTimes(regimens, hours).map((time) => ({
        time,
        ...Object.fromEntries(
          regimens.flatMap((r, i) => {
            const c = concentration(r, time, mode);
            return [
              [`total${i}`, c],
              [`free${i}`, c * (1 - r.binding / 100)],
            ];
          }),
        ),
      })),
    [regimens, mode, hours],
  );
  const yMax = Math.max(
    ...data.flatMap((p) =>
      regimens.map((_, i) =>
        Number((p as Record<string, number>)[`total${i}`]),
      ),
    ),
  );
  const micOffScale = regimens.some((r) => r.mic > yMax * 1.3);
  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <h2 id="chart-title">
            <TrendingUp size={18} /> Concentration over time
          </h2>
          <p className="small muted">
            {mode === "steady"
              ? "At analytical steady state"
              : "Repeated doses from zero initial concentration"}{" "}
            · IV one-compartment model
          </p>
        </div>
        <select
          aria-label="Chart time window"
          value={hours}
          onChange={(e) => onHours(Number(e.target.value))}
        >
          {[24, 48, 72].map((h) => (
            <option key={h} value={h}>
              {h} hours
            </option>
          ))}
        </select>
      </div>
      <div className="chart-toolbar">
        <div className="legend">
          {regimens.map((_, i) => (
            <span key={i}>
              <span className={"dot " + (i === 0 ? "a" : "b")} /> Regimen{" "}
              {i === 0 ? "A" : "B"}
            </span>
          ))}
          <span>
            <span className="dash mic" /> MIC
          </span>
        </div>
        <div className="line-options">
          <label>
            <input
              type="checkbox"
              checked={free}
              onChange={(e) => setFree(e.target.checked)}
            />
            <span className="dash solid" /> Free
          </label>
          <label>
            <input
              type="checkbox"
              checked={total}
              onChange={(e) => setTotal(e.target.checked)}
            />
            <span className="dash" /> Total
          </label>
        </div>
      </div>
      <div className="axis-caption">Plasma concentration (mg/L)</div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 14, right: 30, left: 0, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="#e7ece8"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, hours]}
              ticks={Array.from({ length: 7 }, (_, i) => (hours * i) / 6)}
              tick={{ fill: "#7b8884", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#7b8884", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
              domain={[0, "auto"]}
              tickFormatter={(n) => fmt(n)}
            />
            <Tooltip
              labelFormatter={(label) => `Time: ${fmt(Number(label))} h`}
              formatter={(value, name) => [`${fmt(Number(value))} mg/L`, name]}
              contentStyle={{
                border: "1px solid #dde7e1",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "0 8px 25px #213e3312",
              }}
            />
            {regimens
              .filter((r, i) => i === 0 || r.mic !== regimens[0].mic)
              .map((r, i) => (
                <ReferenceLine
                  key={i}
                  y={r.mic}
                  stroke={i === 0 ? "#b87c39" : "#c79965"}
                  strokeDasharray="5 5"
                  label={{
                    value: `MIC${regimens.length === 2 && regimens[0].mic !== regimens[1].mic ? " " + (i === 0 ? "A" : "B") : ""} · ${fmt(r.mic)} mg/L`,
                    position: "insideTopRight",
                    fill: "#9c6b32",
                    fontSize: 10,
                  }}
                  ifOverflow="extendDomain"
                />
              ))}
            {regimens.flatMap((_, i) => {
              const color = i === 0 ? "#228672" : "#6688c1";
              return [
                total && (
                  <Line
                    key={"t" + i}
                    name={`Total ${i === 0 ? "A" : "B"}`}
                    dataKey={"total" + i}
                    type="linear"
                    stroke={color}
                    strokeWidth={1.7}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                ),
                free && (
                  <Line
                    key={"f" + i}
                    name={`Free ${i === 0 ? "A" : "B"}`}
                    dataKey={"free" + i}
                    type="linear"
                    stroke={color}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ),
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="x-caption">Time since first displayed dose (h)</div>
      {!total && !free && (
        <p className="chart-note">
          Select Free or Total to display concentration curves.
        </p>
      )}
      {micOffScale && (
        <p className="chart-note">
          MIC exceeds the concentration peaks; the vertical axis expands to
          include it.
        </p>
      )}
      <div className="point-inspector">
        <label htmlFor="inspect-time">
          <Crosshair size={14} /> Inspect at{" "}
          <strong>{fmt(Math.min(inspect, hours))} h</strong>
        </label>
        <input
          id="inspect-time"
          aria-label="Inspect concentration at time"
          type="range"
          min="0"
          max={hours}
          step="0.1"
          value={Math.min(inspect, hours)}
          onChange={(e) => setInspect(Number(e.target.value))}
        />
        <div className="point-values">
          {regimens.map((r, i) => (
            <span key={i}>
              <b className={i === 0 ? "text-a" : "text-b"}>
                {i === 0 ? "A" : "B"}
              </b>{" "}
              {fmt(
                concentration(r, Math.min(inspect, hours), mode) *
                  (1 - r.binding / 100),
              )}{" "}
              free{" "}
              <span className="muted">
                / {fmt(concentration(r, Math.min(inspect, hours), mode))} total
                mg/L
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
