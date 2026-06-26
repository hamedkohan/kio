# Kio Clickable Product Prototype

High-fidelity React + Vite + TypeScript prototype based on the current Kio product documentation.

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Vite, typically `http://127.0.0.1:5173/`.

Production build check:

```bash
npm run build
```

## Language And RTL Support

The prototype supports English and Persian from the in-app language selector.

Locale-prefixed routes are used:

* `/en`
* `/fa`
* `/en/operations`
* `/fa/operations`
* `/en/radiologist`
* `/fa/radiologist`
* `/en/neurologist`
* `/fa/neurologist`
* `/en/patient`
* `/fa/patient`
* `/en/research`
* `/fa/research`

If no locale is present, the app normalizes to the saved language from `localStorage`, or English by default. The URL is the source of truth for the current page; changing language keeps the same logical panel and updates the route prefix.

Translations live in `src/i18n.tsx`. Add new visible UI copy to the locale dictionary rather than hardcoding text in components. Keep internal identifiers, state keys, IDs, and technical values in English.

Persian mode sets `lang="fa"`, `dir="rtl"`, and uses Vazirmatn via `@fontsource/vazirmatn`. English mode keeps the Latin UI stack. CSS uses shared tokens and logical properties where practical; the lifecycle strip visually flows left-to-right in English and right-to-left in Persian while preserving the canonical workflow order in data.

Technical strings intentionally remain stable in English where readability matters: `AI`, `MRI`, `PACS`, `PDF`, `DICOM`, case IDs, anonymized IDs, versions, file names, units, and dense clinical metric values.

## Panels

* **Operations / Case Management:** work queue, case status, blockers, MRI inbox, assignments, release status, and follow-up coordination.
* **Radiologist Review:** imaging review queue, review room with Snapshot / Evidence / Report tabs, image placeholders, quantitative findings, AI-generated indications, comments, and reprocess actions.
* **Neurologist / Physician Review:** clinical snapshot, reviewed imaging summary, cognitive intake, timeline, physician notes, finalization, and patient-safe release approval.
* **Patient / Caregiver Portal:** safe case status, forms, uploads, consent, and follow-up reminder without raw AI or unreviewed clinical interpretation.
* **Research Workspace:** anonymized dataset, cohort filters, longitudinal metrics, quality context, and governed CSV export placeholder.

## High-fidelity Design Direction

The current visual pass keeps the prototype product logic unchanged and refines the stable core screens into a calm clinical product UI.

Design principles:

* Calm, precise, trustworthy, and low-drama.
* White/light clinical surfaces with restrained teal, blue, indigo, sage, and slate role accents.
* Color is used mainly for role identity, status, ownership, blockers, and review state.
* AI output is always visually framed as draft/evidence/review prompt, never diagnosis.
* Patient/Caregiver screens stay simpler and safer than clinical workspaces.
* Research screens remain anonymized, consent-aware, risk-aware, and cohort-oriented.
* Placeholder states remain visibly provisional for unresolved flows.

Visual system elements live in:

* `src/design-tokens.css` for color, spacing, radius, typography, status, and shadow tokens.
* `src/styles.css` for the high-fidelity component layer: cards, tables, chips, lifecycle strip, review panels, report object, patient-safe states, research risk states, empty states, and placeholder/read-only styling.

## Cross-panel Demo

0. In Operations, click **Create Case** to open a minimal **Create Case Shell**. Submit required operational fields to add a new case shell at the top of the Operations Case Queue.
1. In Operations, select case `K-2045` and click **Mark MRI received**. It appears in the Radiologist queue.
2. In Radiologist Review, approve an imaging review. The case appears ready in the Physician worklist.
3. In Physician Review, finalize the clinical review. The Patient Portal shows a safe status update.
4. Research Workspace always shows anonymized research-style IDs and approved fields only.

## Assumptions

* Mock actions simulate downstream processing so cross-panel relationships can be evaluated quickly.
* Create Case is a local prototype shell flow, not full patient registration.
* Report sign-off and exact patient-release policy remain open in the source documentation; the prototype labels release as separate from finalization.
* Imaging surfaces are visual placeholders only and are explicitly marked as non-diagnostic.
* Caregiver permission management, PDF download, amendment history, export approval, consent withdrawal handling, follow-up scheduling, Admin/Settings, multi-case patient switching, full production case registration, and real DICOM viewing remain intentionally low-detail or placeholder states.
* Data resets on page refresh.
* No backend, authentication, persistence, PACS integration, medical image rendering, or clinical calculation is included.
