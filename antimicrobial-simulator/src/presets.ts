import type { Regimen, Target } from "./pk";
export interface Preset {
  id: string;
  name: string;
  example: string;
  index: string;
  note: string;
  regimens: [Regimen, Regimen];
  target: Target;
}
const meropenem: Regimen = {
  dose: 1000,
  interval: 8,
  infusion: 0.5,
  clearance: 10,
  volume: 20,
  binding: 2,
  mic: 4,
};
const vancomycin: Regimen = {
  dose: 1000,
  interval: 12,
  infusion: 1,
  clearance: 4,
  volume: 50,
  binding: 50,
  mic: 1,
};
const gentamicin: Regimen = {
  dose: 400,
  interval: 24,
  infusion: 0.5,
  clearance: 4,
  volume: 20,
  binding: 10,
  mic: 2,
};
export const presets: Preset[] = [
  {
    id: "beta",
    name: "Beta-lactam",
    example: "Meropenem example",
    index: "%fT > MIC",
    note: "Time-dependent activity. Explore how a longer infusion changes the time that unbound concentration exceeds MIC. The 40% threshold is an illustrative carbapenem target; targets differ by agent, organism, and context.",
    regimens: [meropenem, { ...meropenem, infusion: 3 }],
    target: { index: "time", basis: "free", minimum: 40, maximum: null },
  },
  {
    id: "vanco",
    name: "Vancomycin",
    example: "Vancomycin example",
    index: "AUC₂₄ / MIC",
    note: "Exposure-dependent activity. The consensus total AUC24/MIC range of 400–600 applies to serious MRSA infections with an assumed broth-microdilution MIC of 1 mg/L. This simplified model cannot guide clinical monitoring or assess nephrotoxicity.",
    regimens: [vancomycin, { ...vancomycin, dose: 1250 }],
    target: { index: "auc", basis: "total", minimum: 400, maximum: 600 },
  },
  {
    id: "amino",
    name: "Aminoglycoside",
    example: "Gentamicin example",
    index: "Cmax / MIC",
    note: "Concentration-dependent activity. A total peak/MIC threshold of 8 is an illustrative teaching target. End-of-infusion model peaks differ from clinically timed post-distribution samples; toxicity and post-antibiotic effects are not modeled.",
    regimens: [gentamicin, { ...gentamicin, dose: 320 }],
    target: { index: "peak", basis: "total", minimum: 8, maximum: null },
  },
];
