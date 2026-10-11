# PK/PD references and illustrative presets

These references explain the concepts. The application does not reproduce a validated clinical dosing model.

1. Craig WA. Pharmacokinetic/pharmacodynamic parameters: rationale for antibacterial dosing of mice and men. **Clinical Infectious Diseases.** 1998;26(1):1–10. [doi:10.1086/516284](https://doi.org/10.1086/516284). Foundational time- and concentration-dependent antibacterial exposure concepts.
2. Drusano GL. Antimicrobial pharmacodynamics: critical interactions of “bug and drug”. **Nature Reviews Microbiology.** 2004;2:289–300. [doi:10.1038/nrmicro862](https://doi.org/10.1038/nrmicro862). Exposure–response relationships and target-attainment context.
3. Rybak MJ, Le J, Lodise TP, et al. Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections: a revised consensus guideline and review by ASHP, IDSA, PIDS, and SIDP. **American Journal of Health-System Pharmacy.** 2020;77(11):835–864. [doi:10.1093/ajhp/zxaa036](https://doi.org/10.1093/ajhp/zxaa036). Total vancomycin AUC24/MIC target 400–600 for serious MRSA infections, assuming broth-microdilution MIC 1 mg/L; this is not a universal target for all infections or MIC methods.
4. Moore RD, Lietman PS, Smith CR. Clinical response to aminoglycoside therapy: importance of the ratio of peak concentration to minimal inhibitory concentration. **Journal of Infectious Diseases.** 1987;155(1):93–99. [doi:10.1093/infdis/155.1.93](https://doi.org/10.1093/infdis/155.1.93). Aminoglycoside peak/MIC and clinical response.

## Examples supplied with the application

**Every numerical parameter below is an illustrative teaching input. Do not prescribe from this table.** There is no underlying patient or clinical recommendation.

| Example                    | Dose A / B (mg) | τ (h) | Infusion A / B (h) | CL (L/h) | V (L) | Bound (%) | MIC (mg/L) | Selected teaching target  |
| -------------------------- | --------------- | ----- | ------------------ | -------- | ----- | --------- | ---------- | ------------------------- |
| Meropenem, beta-lactam     | 1000 / 1000     | 8     | 0.5 / 3            | 10       | 20    | 2         | 4          | ≥40% fT>MIC               |
| Vancomycin                 | 1000 / 1250     | 12    | 1 / 1              | 4        | 50    | 50        | 1          | Total AUC24/MIC 400–600 h |
| Gentamicin, aminoglycoside | 400 / 320       | 24    | 0.5 / 0.5          | 4        | 20    | 10        | 2          | Total Cmax/MIC ≥8         |

Beta-lactam targets depend on drug class, agent, organism, endpoint, and clinical context. The 40% example illustrates carbapenem time-dependent activity; it is not a universal beta-lactam target. More intensive free-time targets may be considered in some settings but cannot be derived or recommended by this application.

Aminoglycoside peak/MIC targets often discussed as 8–10 vary with agent and context. The illustrative lower bound of 8 is configurable. No toxicity, dosing-weight, distribution-phase, drug-level timing, or post-antibiotic-effect model is present.

The vancomycin guideline's target includes efficacy and safety context; the simulator's upper-bound flag does not itself predict nephrotoxicity. This model cannot implement clinical AUC-guided monitoring or generalize the target to different organisms, assays, or infection settings.
