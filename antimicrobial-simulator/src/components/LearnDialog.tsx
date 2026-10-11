import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
export const references = [
  {
    authors: "Craig WA",
    title:
      "Pharmacokinetic/pharmacodynamic parameters: rationale for antibacterial dosing of mice and men.",
    journal: "Clinical Infectious Diseases. 1998;26:1–10.",
    url: "https://doi.org/10.1086/516284",
  },
  {
    authors: "Drusano GL",
    title:
      "Antimicrobial pharmacodynamics: critical interactions of “bug and drug”.",
    journal: "Nature Reviews Microbiology. 2004;2:289–300.",
    url: "https://doi.org/10.1038/nrmicro862",
  },
  {
    authors: "Rybak MJ et al.",
    title:
      "Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections: a revised consensus guideline.",
    journal: "American Journal of Health-System Pharmacy. 2020;77:835–864.",
    url: "https://doi.org/10.1093/ajhp/zxaa036",
  },
  {
    authors: "Moore RD, Lietman PS, Smith CR",
    title:
      "Clinical response to aminoglycoside therapy: importance of the ratio of peak concentration to minimal inhibitory concentration.",
    journal: "Journal of Infectious Diseases. 1987;155:93–99.",
    url: "https://doi.org/10.1093/infdis/155.1.93",
  },
];
export default function LearnDialog({
  kind,
  onClose,
}: {
  kind: "model" | "indices" | "references";
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="learn-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="learn-title"
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">EXPOSURE LAB / LEARNING NOTES</span>
          <h2 id="learn-title">
            {kind === "references"
              ? "References & context"
              : kind === "indices"
                ? "Understanding the indices"
                : "The model behind the curves"}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close learning notes"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {kind === "model" && (
        <div className="learning-content">
          <p>
            A linear, one-compartment model assumes instantaneous mixing,
            constant clearance and volume, and first-order elimination. It
            describes plasma exposure, not infection-site exposure.
          </p>
          <h3>Elimination</h3>
          <div className="equation">
            k = CL / V &nbsp; · &nbsp; t½ = ln(2) / k<br />
            dC/dt = R(t) / V − kC
          </div>
          <p>
            CL is clearance (L/h), V is volume (L), and R is infusion rate
            (mg/h). For an IV bolus, concentration jumps by dose/V.
          </p>
          <h3>During and after an infusion</h3>
          <div className="equation">
            C(t) = C₀e⁻ᵏᵗ + (R/CL)(1 − e⁻ᵏᵗ)
            <br />
            C(t &gt; T) = C(T)e⁻ᵏ⁽ᵗ⁻ᵀ⁾
          </div>
          <p>
            T is infusion duration. Doses repeat every τ hours; T must be ≤ τ.
            Setting T = τ creates back-to-back infusions. Setting T = 0 creates
            IV boluses.
          </p>
          <h3>Analytical steady state</h3>
          <div className="equation">
            Cmax,ss = (R/CL)(1 − e⁻ᵏᵀ) / (1 − e⁻ᵏτ)
            <br />
            Cmin,ss = Cmax,ss e⁻ᵏ⁽τ⁻ᵀ⁾
          </div>
          <p>
            Steady state includes the residual concentration from all preceding
            doses. First-dose mode starts from zero, with subsequent doses still
            scheduled. Unbound concentration equals total concentration × (1 −
            protein binding/100).
          </p>
          <h3>What this model leaves out</h3>
          <p>
            No distribution phase, saturable elimination or binding, patient
            variability, changing renal function, active metabolites, tissue
            penetration, bacterial dynamics, resistance, post-antibiotic effect,
            or toxicity. The model assumes IV bioavailability of 100%.
            Parameters do not estimate renal function or recommend doses.
          </p>
          <p>
            Exact segment integrals and analytical MIC crossings determine the
            metrics; plotted samples only draw the curves. Full equations, edge
            cases, and implementation details are included in the source
            documentation.
          </p>
        </div>
      )}
      {kind === "indices" && (
        <div className="learning-content">
          <dl className="index-definitions">
            <dt>%fT &gt; MIC</dt>
            <dd>
              Percentage of one dosing interval when unbound concentration is
              strictly greater than MIC. Usually relevant to beta-lactams.
              Always uses free concentration.
            </dd>
            <dt>AUC₂₄</dt>
            <dd>
              Area under the concentration–time curve from 0 to 24 hours
              (mg·h/L), including repeated doses. Both total and free values are
              shown. At steady state, if τ divides 24 h, total AUC₂₄ = dose ×
              (24/τ) / CL. Otherwise this exact 24 h window can differ from the
              average daily exposure.
            </dd>
            <dt>Cmax and Cmin</dt>
            <dd>
              Peak at infusion end (or immediately after a bolus) and trough
              immediately before the next dose, in the first displayed interval.
              Cmin does not mean the lowest concentration since treatment began.
              Both total and free concentrations are shown in mg/L.
            </dd>
            <dt>Cmax / MIC</dt>
            <dd>
              Peak concentration divided by MIC; a unitless ratio associated
              with concentration-dependent activity, such as aminoglycosides.
            </dd>
            <dt>AUC₂₄ / MIC</dt>
            <dd>
              24 h exposure divided by MIC; units are hours. Vancomycin targets
              generally use total-drug AUC, while other agents may use free-drug
              AUC. Choose the appropriate basis.
            </dd>
            <dt>Elimination half-life</dt>
            <dd>
              Time for concentration to halve during elimination without ongoing
              infusion: ln(2) × V / CL, in hours.
            </dd>
          </dl>
          <h3>Interpreting the target</h3>
          <p>
            “Within target” means the simulated value meets the lower threshold
            and, if configured, is no greater than the upper threshold. It does
            not establish efficacy, safety, or the probability of attainment.
            Thresholds are configurable teaching inputs, and a pass/fail display
            is not a clinical recommendation.
          </p>
        </div>
      )}
      {kind === "references" && (
        <div className="learning-content">
          <p>
            These sources describe the PK/PD concepts illustrated here. Preset
            doses, intervals, PK parameters, binding fractions, and MICs are
            examples, not patient-specific recommendations.
          </p>
          <ol className="reference-list">
            {references.map((r) => (
              <li key={r.url}>
                <strong>{r.authors}</strong>
                <p>{r.title}</p>
                <span>{r.journal}</span>
                <a href={r.url} target="_blank" rel="noreferrer">
                  Read reference <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ol>
          <p>
            The vancomycin 400–600 target range has a specific serious-MRSA and
            MIC-assay context. Beta-lactam and aminoglycoside teaching
            thresholds are not universal across agents, organisms, or clinical
            settings.
          </p>
        </div>
      )}
      <div className="dialog-footer">
        Educational use only. Do not use to prescribe or adjust treatment.
      </div>
    </dialog>
  );
}
