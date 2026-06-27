import { useI18n } from "../i18n";
import { StatusChip } from "./ui";
import type { DemoCaseDetail, DemoCaseSummary } from "../data/kio-demo/types";

// Slim, sticky active-case switcher shared by the Radiologist and Physician panels.
export function CaseContextBar({
  summaries,
  detail,
  selectedCaseId,
  onSelectCase,
}: {
  summaries: DemoCaseSummary[];
  detail: DemoCaseDetail;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
}) {
  const { t, formatNumber } = useI18n();
  const name = (summary: Pick<DemoCaseSummary, "patient">) => summary.patient.name_fa || summary.patient.name;
  return (
    <section className="radiologist-case-context-bar" aria-label={t("Active imported case context")}>
      <span className="rccb-label">{t("Active imported case")}</span>
      <select className="rccb-select" aria-label={t("Active case")} value={selectedCaseId} onChange={(event) => onSelectCase(event.target.value)}>
        {summaries.map((summary) => (
          <option key={summary.caseRecord.case_id} value={summary.caseRecord.case_id}>
            {name(summary)} · {summary.caseRecord.case_id}
          </option>
        ))}
      </select>
      <StatusChip label={`${formatNumber(detail.outlierCount)} ${t("outliers")}`} tone={detail.outlierCount ? "attention" : "good"} />
    </section>
  );
}
