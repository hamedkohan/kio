# Kio Dummy Data Pack - Legacy PDF Output Simulation

This package turns the uploaded legacy PDF outputs into importable demo data for the Kio prototype. It is intentionally structured around Kio's product direction: the structured report object is the source of truth, while PDF is only a legacy import/export artifact.

## What is inside

- `seed/kio_demo_seed.json` - complete nested seed for front-end or mock API loading.
- `seed/kio_demo_seed.sqlite` - the same data as a lightweight SQLite database.
- `seed/*.csv` - table-level CSV files for quick inspection.
- `schema/kio_demo_schema.sql` - relational schema used to build the SQLite file.
- `schema/kio_demo_seed.schema.json` - minimal JSON schema for validation.
- `src_reference/kioReportTypes.ts` - TypeScript interfaces and report module config.
- `docs/KIO_PDF_TO_PLATFORM_MAPPING.md` - product mapping from old PDF experience to platform UX.
- `docs/KIO_CODEX_PROMPTS.md` - copy-ready Codex prompts.
- `assets/page_renders/*.png` - rendered key pages from the PDFs for visual reference and placeholder image panels.

## Counts

- Users: 13
- Patients: 3
- Cases: 3
- Reports: 4
- Quantitative metrics: 339
- Visual scores: 6

## Important boundaries

- Do not expose raw AI output, segmentation details, or percentile tables to Patient/Caregiver by default.
- Radiologist and MRI Scientist/AI QA review the imaging/AI validity before clinical handoff.
- Physician/Neurologist owns clinical synthesis and patient-safe publication.
- Research workspace uses de-identified, governed, consent/eligibility-aware data only.

## Suggested import path

1. Load `kio_demo_seed.json` into a local mock API or client-side fixture.
2. Use `cases` for queues and routing.
3. Use `reports` + `quantitative_metrics` + `visual_scores` for report detail pages.
4. Use `report_modules` to decide which tabs/components to render.
5. Use `publication_state` and `workspace` to filter visibility per panel.
