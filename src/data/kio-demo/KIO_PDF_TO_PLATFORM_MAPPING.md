# Kio PDF-to-Platform Mapping

## 1. Strategic principle

The previous sold output was a PDF report. The Kio platform should preserve everything valuable in those PDFs, but turn it into a structured, interactive, role-aware clinical workspace. The PDF becomes a source/import artifact and optional export, not the source of truth.

## 2. Source report types represented in the dummy data

| Legacy PDF type | Platform report module | Key data to preserve | Better platform experience |
|---|---|---|---|
| Visual MRI dementia protocol | `visual_mri_dementia_protocol` | Narrative findings, GCA, Koedam, GCA-F, PPA, MTA, Fazekas, hippocampal volume, midbrain diameter, exclusions | Structured visual score cards, evidence notes, age-normal badges, radiologist sign-off, physician-safe summary |
| Single-time volumetry | `ai_volumetry_single` | CSF/Brain/ICV, left/right/total volumes, percentiles, red outlier rule, centile curves, 3D percentile map | Interactive biomarker table, outlier filter, key biomarker cards, structure search, chart drill-down |
| Longitudinal volumetry | `ai_volumetry_longitudinal` | Two study dates, current/previous values, percentiles, change %, total/left/right tables, centile curves, color spectrum maps | Timeline header, change cards, hemisphere tabs, clinical relevance filters, QC gate before release |
| Longitudinal corticometry | `ai_corticometry_longitudinal` | Cortical thickness values, percentiles, change %, left/right surface maps, centile curves | Thickness map review, low-percentile filter, linked volumetry context, trend and hemisphere comparison |

## 3. Workspace behavior

### Operations / Case Coordination

Show case intake and operational state only:

- Patient name, age, sex, source patient ID/accession, study date, report modules available.
- Current state: `case_state`, `ai_processing_status`, `qc_state`, `report_state`, `publication_state`.
- Source PDF imported badge and report count.
- Assignee and next task.
- No clinical interpretation authoring.

Operations can create/import a case, attach legacy PDF, assign reviewers, and monitor completion. They cannot validate AI outputs or publish clinical meaning.

### Radiologist Review

Show imaging and structured report objects:

- For visual MRI: GCA, Koedam, GCA-F, PPA, MTA, Fazekas cards with side, score, age-normal context, and evidence note.
- For volumetry/corticometry: key AI findings, outlier metrics, AI QC state, segmentation/validity status, source page render.
- Allow radiologist to accept, annotate limitation, request reprocess/QC, or sign imaging handoff.
- Keep diagnosis wording controlled: AI/quantitative output is decision support, not final diagnosis.

### MRI Scientist / AI QA

Show AI validity workbench:

- AI module version, study dates, source PDF, report metrics count.
- Outlier queue: percentile < 5 or > 95.
- QC checklist: scan adequacy, segmentation plausibility, side consistency, longitudinal comparability.
- Actions: pass QC, fail QC, request reprocess, add internal AI limitation note.

### Physician / Neurologist Review

Show clinical synthesis workspace:

- Key biomarker cards: hippocampus, temporal, parietal, ventricles, HOC, CSF/Brain/ICV, Fazekas/MTA if present.
- Longitudinal trend cards: current vs previous, change %, clinical relevance note.
- Structured radiologist handoff and AI validity status.
- Allow physician summary, care-team note, external guest review request, and patient-safe publication approval.

### Patient / Caregiver Portal

Show only approved, calm, limited, patient-safe information:

- Case status and study/report date.
- Physician-approved summary in plain language.
- “This report supports your clinician’s assessment and is not a diagnosis by itself.”
- No raw percentiles, segmentation maps, full tables, internal notes, or unreviewed findings.

### Research Workspace

Show only de-identified, governed data:

- Case ID pseudonym, age band, sex, study dates, module types, eligibility flags.
- Quantitative metrics after clinical governance gates.
- No patient names, contact info, accession number, operational comments, or patient portal text.

## 4. Component model

Recommended components:

- `CaseQueueTable`
- `CaseStatusRail`
- `ReportModuleTabs`
- `LegacyPdfSourcePreview`
- `VisualScoreCardGrid`
- `BiomarkerSummaryCards`
- `OutlierMetricTable`
- `HemisphereComparisonTable`
- `LongitudinalChangeCards`
- `CentileCurveGallery`
- `PatientSafeSummaryPanel`
- `AIQualityGatePanel`
- `ResearchEligibilityPanel`

## 5. Critical UX upgrades over PDF

1. Replace 20+ PDF pages of tables with progressive disclosure: summary cards first, detailed tables on demand.
2. Separate clinical responsibility by workspace.
3. Make outliers searchable and filterable.
4. Keep original PDF page previews as reference, but avoid using them as the primary user experience.
5. Use publication gates so patient/caregiver never sees unreviewed or raw AI output.
6. Make every sign-off, reprocess request, and publication action auditable.
