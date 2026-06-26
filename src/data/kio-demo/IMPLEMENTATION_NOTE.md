# Kio Demo Data Integration

The legacy Kio PDF dummy data pack is imported as frontend fixture data under `src/data/kio-demo/`.

Primary runtime source:

- `kio_demo_seed.json`

Reference metadata:

- `asset_manifest.json`
- `README.md`
- `KIO_PDF_TO_PLATFORM_MAPPING.md`

Rendered legacy report pages are copied to:

- `public/demo-data/kio/page_renders/`

The app reads the seed through `repository.ts`. Add future demo cases by appending records to the seed arrays and adding matching page-render entries to `asset_manifest.json` when source thumbnails are available. PDF/page renders are used only as legacy references; structured JSON remains the platform source of truth.
