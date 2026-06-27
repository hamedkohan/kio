import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import {
  aiProcessingJobs,
  biomarkerOutputs,
  imageQualityAssessments,
  initialCases,
  mriStudyReferences,
  patientSafeSummaryDrafts,
  patientReleasePackages,
  patientReleaseSafetyChecks,
  physicianClinicalSyntheses,
  physicianEvidenceReviews,
  publicationApprovals,
  protocolCompletenessAssessments,
  radiologistImagingHandoffs,
  roleDefinitions,
  structuredReports,
  structuredVisualAssessments,
} from "./data";
import { I18nProvider, getDirection, getStoredLocale, isLocale, roleToSlug, slugToRole, storeLocale, type Locale, type RoleSlug, useI18n } from "./i18n";
import type { CreateCaseFormValues, KioCase, RoleId } from "./types";
import { OperationsPanel, operationsNav } from "./panels/OperationsPanel";
import { RadiologistPanel, radiologistNav } from "./panels/RadiologistPanel";
import { PhysicianPanel, physicianNav } from "./panels/PhysicianPanel";
import { PatientPanel, patientNav } from "./panels/PatientPanel";
import { CaregiverPanel, caregiverNav } from "./panels/CaregiverPanel";
import { ResearchPanel, researchNav } from "./panels/ResearchPanel";
import { applyPatientReleaseAction, applyPublicationApprovalAction, canPerformCaseAction, getLatestPatientReleasePackageForCase, getLatestPublicationApprovalForCase, getOperationsCaseCoordinationViews, getPatientPortalReleaseView, getPhysicianCaseReviewView, getRadiologistCaseReviewView, getReleaseSafetyCheckForPackage, guardCaseAction, guardCaseActionSequence, guardCreateCase, withDerivedCaseFields, type CaseAction, type ClinicalEvidenceCollections, type GuardedCaseActionContext, type GuardedTransitionResult } from "./domain";
import { getNextPossibleStates } from "./domain/caseStateSelectors";
import { toPatientSafeCaseView, toResearchSafeCaseView } from "./selectors/visibility";

const defaultViews: Record<RoleId, string> = {
  operations: "dashboard",
  radiologist: "queue",
  physician: "cases",
  patient: "status",
  caregiver: "overview",
  research: "cohort",
};

const navByRole = {
  operations: operationsNav,
  radiologist: radiologistNav,
  physician: physicianNav,
  patient: patientNav,
  caregiver: caregiverNav,
  research: researchNav,
};

type RouteState = {
  locale: Locale;
  role: RoleId | null;
};

export default function App() {
  const initialRoute = getInitialRoute();
  const [locale, setLocaleState] = useState<Locale>(initialRoute.locale);
  const [role, setRole] = useState<RoleId | null>(initialRoute.role);
  const [activeViews, setActiveViews] = useState<Record<RoleId, string>>(defaultViews);
  const [cases, setCases] = useState<KioCase[]>(initialCases);
  const [selectedCaseId, setSelectedCaseId] = useState("K-2041");
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
    document.body.dataset.locale = locale;
    document.body.dataset.dir = getDirection(locale);
    storeLocale(locale);
    normalizeRoute(locale, role, true);
  }, [locale, role]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      setLocaleState(route.locale);
      setRole(route.role);
      if (route.role) {
        setSelectedCaseId(defaultCaseForRole(route.role));
        setActiveViews((current) => ({ ...current, [route.role!]: defaultViews[route.role!] }));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  });

  const switchLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    storeLocale(nextLocale);
    normalizeRoute(nextLocale, role, false);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const showDeniedToast = (result: GuardedTransitionResult<KioCase> | undefined) => {
    showToast(result?.denialReason ?? result?.blockers.map((item) => item.message).join("; ") ?? "Case not found.");
  };

  const updateCase = (id: string, updater: (item: KioCase) => KioCase) => {
    setCases((current) => current.map((item) => item.id === id ? withDerivedCaseFields(updater(item)) : item));
  };

  const addTimeline = (item: KioCase, label: string, detail: string, patientSafe = false): KioCase => ({
    ...item,
    timeline: [...item.timeline, { label, detail, date: "Now", tone: "good", patientSafe }],
  });

  const addTimelineEvents = (item: KioCase, events: Array<{ label: string; detail: string; patientSafe?: boolean }>): KioCase => ({
    ...item,
    timeline: [
      ...item.timeline,
      ...events.map((event) => ({ label: event.label, detail: event.detail, date: "Now", tone: "good" as const, patientSafe: event.patientSafe })),
    ],
  });

  const createCaseShell = (values: CreateCaseFormValues) => {
    const permission = guardCreateCase({ role: "operations" });
    if (!permission.success) {
      showToast(permission.denialReason ?? "Action not allowed for this role.");
      return;
    }

    const nextNumber = Math.max(...cases.map((item) => Number(item.id.replace("K-", ""))).filter(Number.isFinite)) + 1;
    const nextResearchNumber = Math.max(...cases.map((item) => Number(item.anonymizedId.replace("R-", ""))).filter(Number.isFinite)) + 1;
    const id = `K-${nextNumber}`;
    const hasPacsStudy = values.mriSource === "PACS";
    const intakeComplete = values.intakeStatus === "Completed";
    const consentComplete = values.consentStatus === "Completed";
    const missingItems = [
      !intakeComplete ? `Intake ${values.intakeStatus.toLowerCase()}` : "",
      !consentComplete ? `Consent ${values.consentStatus.toLowerCase()}` : "",
      !hasPacsStudy ? values.mriSource === "Patient upload link" ? "MRI awaiting patient upload" : "MRI not available yet" : "",
    ].filter(Boolean);
    const nextAction = !intakeComplete
      ? "Request patient intake"
      : !consentComplete
        ? "Request consent"
        : !hasPacsStudy
          ? "Wait for MRI"
          : "Send to MRI intake / quality check";
    const patientSafeStatus = !intakeComplete
      ? "Please complete your information"
      : !consentComplete
        ? "Consent is needed for the next step"
        : hasPacsStudy
          ? "MRI received"
          : "Case created";

    const blockers = missingItems.map((message) => ({
      code: message.toUpperCase().replaceAll(" ", "_"),
      message,
      ownerRole: "OPERATIONS" as const,
      blocking: true,
    }));

    const newCase: KioCase = withDerivedCaseFields({
      id,
      state: "CASE_CREATED",
      stateEnteredAt: new Date().toISOString(),
      blockers,
      auditEvents: [],
      anonymizedId: `R-${nextResearchNumber}`,
      patientName: values.patientName,
      age: values.age,
      ageGroup: toAgeGroup(values.age),
      sex: values.sex,
      scanDate: hasPacsStudy ? "Pending quality check" : "Not received",
      caseStatus: "Case Created",
      mriStatus: hasPacsStudy ? "Received" : values.mriSource === "Patient upload link" ? "Awaiting patient upload" : "Missing",
      intakeStatus: intakeComplete ? "Complete" : values.intakeStatus,
      aiStatus: "Not started",
      radiologistStatus: "Not ready",
      neurologistStatus: "Not ready",
      reportStatus: "Not generated",
      patientSummaryStatus: "Not prepared",
      pdfReleaseStatus: "Not approved",
      releaseStatus: "Not released",
      followUpStatus: "Not scheduled",
      nextAction,
      currentOwnerRole: "Operations",
      blocker: missingItems.length ? missingItems.join("; ") : undefined,
      referralSource: values.referralSource,
      mriSource: values.mriSource,
      caregiverName: values.caregiverName,
      caregiverContact: values.caregiverContact,
      priorImagingAvailable: values.priorImagingAvailable,
      operationsNote: values.operationsNote,
      assignedRadiologist: values.assignedRadiologist,
      assignedNeurologist: values.assignedNeurologist,
      imageQuality: hasPacsStudy ? "Not checked" : "Not available",
      memoryComplaint: "Not collected in case shell.",
      cognitiveHistory: intakeComplete ? "Intake marked completed at shell creation." : "Structured intake is not complete.",
      cognitiveScore: "Not added",
      caregiverObservation: values.caregiverName ? "Caregiver information recorded in shell." : "Not added",
      keyFindings: [],
      findings: [],
      timeline: [
        { label: "Case created", detail: `Operational shell created from ${values.referralSource}`, date: "Now", tone: "good", patientSafe: true },
      ],
      outputVersion: "No AI output",
      reportVersion: "No report",
      amendmentStatus: "Not available",
      researchEligible: false,
      researchConsent: "Not requested",
      consentScope: "Not available",
      anonymizationStatus: "Not prepared",
      anonymizationMethod: "Not available",
      researchTimepoint: "Not available",
      datasetVersion: "Not prepared",
      exportVersion: "Blocked",
      withdrawalStatus: "Not applicable",
      longitudinal: values.priorImagingAvailable === "Yes",
      patientSafeStatus,
      patientNextAction: nextAction === "Request patient intake"
        ? "Complete the requested information when your clinic sends the link."
        : nextAction === "Request consent"
          ? "Review the requested consent when it becomes available."
          : nextAction === "Wait for MRI"
            ? "Your clinic will let you know if an MRI upload is needed."
            : "No action is needed from you right now.",
      patientFormProgress: intakeComplete ? 100 : 0,
      consentStatus: consentComplete ? "Complete" : values.consentStatus,
      radiologistComment: "",
      physicianNote: "",
    });

    setCases((current) => [newCase, ...current]);
    setSelectedCaseId(id);
    setActiveViews((current) => ({ ...current, operations: "queue" }));
    showToast(`${id} case shell created and selected in Operations.`);
  };

  const handleOperationsAction = (action: string, caseId?: string) => {
    if (action === "create") {
      showToast("Create case flow opened in prototype mode.");
      return;
    }
    if (!caseId) return;
    if (action === "advance-demo") {
      updateCase(caseId, (item) => {
        const next = getNextPossibleStates(item)[0];
        if (!next) return item;
        return addTimeline({ ...item, state: next, stateEnteredAt: "Now" }, "Advanced (demo)", `Case moved to ${next}`);
      });
      showToast("Demo case advanced to the next lifecycle state.");
      return;
    }
    if (action === "reset-demo") {
      updateCase(caseId, (item) => addTimeline({ ...item, state: "CASE_CREATED", stateEnteredAt: "Now" }, "Reset (demo)", "Case returned to Case Created"));
      showToast("Demo case reset to the start of the journey.");
      return;
    }
    if (action === "receive-mri") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "RECEIVE_MRI", {
        role: "operations",
        hasMri: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, (item) => addTimelineEvents({
        ...result.caseRecord,
        mriStatus: "Received",
        scanDate: "2026-06-15",
        blocker: undefined,
        assignedRadiologist: "Dr. N. Azadi",
        patientSafeStatus: "MRI received",
        patientNextAction: "No action is needed from you right now.",
      }, [
        { label: "MRI received", detail: "Study received and matched to the case", patientSafe: true },
        { label: "MRI intake review pending", detail: "Canonical state machine now requires intake review before image QC and AI processing" },
      ]));
      showToast(`${caseId} moved to MRI Received. AI processing was not skipped.`);
    } else if (action === "request-intake") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "REQUEST_PATIENT_INFORMATION", {
        role: "operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, patientSafeStatus: "Please complete your information", patientNextAction: "Complete the requested information to continue." }));
      showToast("Patient-safe intake request prepared.");
    } else if (action === "request-consent") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "REQUEST_CONSENT", {
        role: "operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, patientSafeStatus: "Consent is needed for the next step", patientNextAction: "Review the requested consent when it becomes available." }));
      showToast("Consent request prepared.");
    } else if (action === "request-mri") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "REQUEST_MRI", {
        role: "operations",
        reason: "Prototype MRI request from Operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, patientSafeStatus: "MRI is still needed", patientNextAction: "Your clinic will let you know if an MRI upload is needed." }));
      showToast("MRI request recorded.");
    } else if (action === "assign-rad") {
      const result = applyPermittedDomainSequence(cases.find((item) => item.id === caseId), [
        ["START_MRI_INTAKE_REVIEW", { role: "operations" }],
        ["COMPLETE_MRI_INTAKE_REVIEW", { role: "operations", mriIntakeReviewed: true }],
      ]);
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, assignedRadiologist: "Dr. N. Azadi" }));
      showToast("MRI intake review completed and case is ready for protocol check.");
    } else if (action === "start-mri-intake") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "START_MRI_INTAKE_REVIEW", {
        role: "operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => result.caseRecord);
      showToast("MRI intake review started.");
    } else if (action === "complete-mri-intake") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "COMPLETE_MRI_INTAKE_REVIEW", {
        role: "operations",
        mriIntakeReviewed: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => result.caseRecord);
      showToast("MRI intake review completed.");
    } else if (action === "publish") {
      const caseRecord = cases.find((item) => item.id === caseId);
      if (!caseRecord) {
        showToast("Case not found.");
        return;
      }
      const publicationContext = getPublicationContextForCase(caseId);
      const publicationResult = applyPatientReleaseAction({
        caseRecord,
        ...publicationContext,
        context: { role: "operations" },
        releasedAt: new Date().toISOString(),
      });
      if (!publicationResult.allowed) {
        showToast(publicationResult.reason ?? "Patient-safe release is not allowed.");
        return;
      }
      const result = applyPermittedDomainTransition(caseRecord, "PUBLISH_TO_PATIENT_PORTAL", {
        role: "operations",
        publicationApproved: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => addTimeline({ ...result.caseRecord, patientSafeStatus: "Report available", patientNextAction: "Your specialist-reviewed summary is available.", patientApprovedSummary: publicationResult.releasePackage?.plainLanguageSummary ?? "Your specialist-reviewed summary is available. Please review it with your clinic or specialist team if you have questions about your care." }, "Report available", "Specialist-reviewed summary released", true));
      showToast("Patient-safe summary released.");
    } else if (action === "close-case") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "CLOSE_CASE", {
        role: "operations",
        reason: "Prototype close case action from Operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => result.caseRecord);
      showToast("Case closed.");
    } else if (action === "schedule-followup") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "START_FOLLOW_UP_COORDINATION", {
        role: "operations",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => addTimeline({ ...result.caseRecord, patientSafeStatus: "Follow-up scheduled", patientNextAction: "Your follow-up review is scheduled for December 2026." }, "Follow-up scheduled", "Physician-defined review point coordinated", true));
      showToast("Follow-up coordination recorded.");
    }
  };

  const handleRadiologistAction = (action: string, caseId: string, value?: string) => {
    if (action === "approve-rad") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "COMPLETE_RADIOLOGIST_REVIEW", {
        role: "radiologist",
        radiologistHandoffComplete: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, (item) => addTimeline({ ...result.caseRecord, radiologistComment: item.radiologistComment || "Imaging output reviewed and ready for clinical interpretation." }, "Radiologist reviewed", "Imaging review completed and handed off to Physician Review"));
      showToast(`${caseId} is now ready in the Physician Review worklist.`);
    } else if (action === "reprocess") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "REQUEST_REPROCESSING", {
        role: "radiologist",
        reason: "Prototype reprocess request from imaging review",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => addTimeline(result.caseRecord, "Reprocess requested", "Reason recorded by Radiologist; previous output version preserved"));
      showToast("Reprocess request recorded with version history.");
    } else if (action === "quality-issue") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "FAIL_IMAGE_QUALITY", {
        role: "radiologist",
        reason: "Prototype image quality issue from Radiologist Review",
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, imageQuality: "Needs review", blocker: "Radiologist flagged an image quality issue" }));
      showToast("Image quality issue flagged.");
    } else if (action === "rad-comment") {
      updateCase(caseId, (item) => ({ ...item, radiologistComment: value ?? "" }));
      showToast("Radiology comment saved.");
    }
  };

  const handlePhysicianAction = (action: string, caseId: string, value?: string) => {
    if (action === "save-note") {
      const notePermission = canSavePhysicianNote(cases.find((item) => item.id === caseId));
      if (!notePermission.allowed) {
        showToast(notePermission.reason);
        return;
      }
      updateCase(caseId, (item) => ({ ...item, physicianNote: value ?? "" }));
      showToast("Physician interpretation draft saved.");
    } else if (action === "finalize") {
      const result = applyPermittedDomainSequence(cases.find((item) => item.id === caseId), [
        ["START_PHYSICIAN_SYNTHESIS", { role: "physician" }],
        ["START_PHYSICIAN_REVIEW", { role: "physician", physicianSynthesisStarted: true }],
        ["DRAFT_FINAL_REPORT", { role: "physician", finalReportDrafted: true }],
        ["DRAFT_PATIENT_SAFE_SUMMARY", { role: "physician", patientSafeSummaryDrafted: true }],
      ]);
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, (item) => addTimeline({ ...result.caseRecord, physicianNote: value || item.physicianNote || "Reviewed in clinical context.", reportVersion: "Final report v1.0 · pending release", patientSafeStatus: "Report being prepared", patientNextAction: "No action is needed from you right now. Your approved summary will appear here after release." }, "Physician review completed", "Clinical review completed; release remains separate", true));
      showToast(`${caseId} finalized. Patient Portal now shows safe pending-release status.`);
    } else if (action === "approve-summary") {
      const result = applyPermittedDomainTransition(cases.find((item) => item.id === caseId), "SUBMIT_FINAL_CLINICAL_APPROVAL", {
        role: "physician",
        finalClinicalApprovalComplete: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => ({ ...result.caseRecord, patientSafeStatus: "Report being prepared", patientNextAction: "No action is needed from you right now. Your approved summary will appear here after release." }));
      showToast("Patient-safe summary approved. PDF release remains separate.");
    } else if (action === "approve-pdf") {
      const caseRecord = cases.find((item) => item.id === caseId);
      if (!caseRecord) {
        showToast("Case not found.");
        return;
      }
      const publicationContext = getPublicationContextForCase(caseId);
      const publicationResult = applyPublicationApprovalAction({
        caseRecord,
        approval: publicationContext.approval,
        summaryDraft: publicationContext.summaryDraft,
        context: { role: "physician" },
        approvedAt: new Date().toISOString(),
        approvalNotes: "Physician approved patient-safe publication content. PDF remains rendering metadata only.",
      });
      if (!publicationResult.allowed) {
        showToast(publicationResult.reason ?? "Patient-safe publication approval is not allowed.");
        return;
      }
      const result = applyPermittedDomainTransition(caseRecord, "APPROVE_PUBLICATION", {
        role: "physician",
        publicationApproved: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => result.caseRecord);
      showToast("Patient-safe publication approved. PDF remains rendering metadata only.");
    } else if (action === "release") {
      const caseRecord = cases.find((item) => item.id === caseId);
      if (!caseRecord) {
        showToast("Case not found.");
        return;
      }
      const publicationContext = getPublicationContextForCase(caseId);
      const publicationResult = applyPatientReleaseAction({
        caseRecord,
        ...publicationContext,
        context: { role: "physician" },
        releasedAt: new Date().toISOString(),
      });
      if (!publicationResult.allowed) {
        showToast(publicationResult.reason ?? "Patient portal release is not allowed for this role or state.");
        return;
      }
      const result = applyPermittedDomainTransition(caseRecord, "PUBLISH_TO_PATIENT_PORTAL", {
        role: "physician",
        publicationApproved: true,
      });
      if (!result?.success) {
        showDeniedToast(result);
        return;
      }
      updateCase(caseId, () => addTimeline({ ...result.caseRecord, patientSafeStatus: "Report available", patientNextAction: "Your specialist-reviewed summary is available.", patientApprovedSummary: publicationResult.releasePackage?.plainLanguageSummary ?? "Your specialist-reviewed summary is available. Please review it with your clinic or specialist team if you have questions about your care." }, "Report available", "Specialist-reviewed summary released", true));
      showToast("Patient-safe summary released.");
    } else if (action === "clarification") {
      updateCase(caseId, (item) => ({ ...item, caseStatus: "Radiologist clarification requested", nextAction: "Radiologist clarification" }));
      showToast("Radiologist clarification requested.");
    }
  };

  const handlePatientAction = (action: string, caseId: string) => {
    if (action === "complete-form") updateCase(caseId, (item) => ({ ...item, patientFormProgress: 100, intakeStatus: "Complete" }));
    if (action === "consent") updateCase(caseId, (item) => ({ ...item, consentStatus: "Complete" }));
    showToast(action === "support" ? "Support request prepared." : "Your action was recorded.");
  };

  const roleCounts = useMemo(() => ({
    operations: cases.filter((item) => item.blocker || /pending|waiting|issue/i.test(item.caseStatus)).length,
    radiologist: cases.filter((item) => (item.mriStatus === "Received" || /quality review/i.test(item.radiologistStatus)) && /review pending|needs quality review/i.test(item.radiologistStatus)).length,
    physician: cases.filter((item) => /reviewed/i.test(item.radiologistStatus) && (!/physician reviewed/i.test(item.neurologistStatus) || /release approval pending|patient summary approved|ready for release|pdf pending/i.test(`${item.reportStatus} ${item.releaseStatus}`))).length,
    patient: 1,
    caregiver: 1,
    research: cases.filter((item) => item.researchEligible && item.anonymizationStatus === "Anonymized").length,
  }), [cases]);

  const clinicalEvidence = useMemo<ClinicalEvidenceCollections>(() => ({
    biomarkerOutputs,
    aiProcessingJobs,
    mriStudies: mriStudyReferences,
    protocolAssessments: protocolCompletenessAssessments,
    imageQualityAssessments,
    structuredVisualAssessments,
    radiologistHandoffs: radiologistImagingHandoffs,
    structuredReports,
    physicianSyntheses: physicianClinicalSyntheses,
    physicianEvidenceReviews,
    patientSafeSummaryDrafts,
  }), []);

  const radiologistCaseViews = useMemo(
    () => cases.map((item) => getRadiologistCaseReviewView(item, clinicalEvidence)),
    [cases, clinicalEvidence],
  );

  const operationsCaseViews = useMemo(
    () => getOperationsCaseCoordinationViews(cases, { role: "operations" }),
    [cases],
  );

  const physicianCaseViews = useMemo(
    () => cases.map((item) => getPhysicianCaseReviewView(item, clinicalEvidence)),
    [cases, clinicalEvidence],
  );

  const getPatientSafeView = (caseRecord: KioCase) => toPatientSafeCaseView(
    caseRecord,
    { role: "patient", isSelfPatientCase: true },
    getPatientPortalReleaseView(caseRecord.id, patientReleasePackages, publicationApprovals, patientReleaseSafetyChecks),
  );

  const getPublicationContextForCase = (caseId: string) => {
    const approval = getLatestPublicationApprovalForCase(caseId, publicationApprovals);
    const releasePackage = getLatestPatientReleasePackageForCase(caseId, patientReleasePackages);
    const safetyCheck = releasePackage ? getReleaseSafetyCheckForPackage(releasePackage.id, patientReleaseSafetyChecks) : undefined;
    const summaryDraft = patientSafeSummaryDrafts.find((summary) => summary.caseId === caseId && (!approval || approval.sourcePatientSafeSummaryDraftId === summary.id));
    return { approval, releasePackage, safetyCheck, summaryDraft };
  };

  const defaultCaseForRole = (nextRole: RoleId) => {
    if (nextRole === "operations") return cases.find((item) => item.blocker || /pending|waiting|issue/i.test(item.caseStatus))?.id ?? cases[0].id;
    if (nextRole === "radiologist") return cases.find((item) => (item.mriStatus === "Received" || /quality review/i.test(item.radiologistStatus)) && /review pending|needs quality review/i.test(item.radiologistStatus))?.id ?? cases[0].id;
    if (nextRole === "physician") return cases.find((item) => /reviewed/i.test(item.radiologistStatus) && (!/physician reviewed/i.test(item.neurologistStatus) || /release approval pending|patient summary approved|ready for release|pdf pending/i.test(`${item.reportStatus} ${item.releaseStatus}`)))?.id ?? cases.find((item) => /reviewed/i.test(item.radiologistStatus))?.id ?? cases[0].id;
    return cases[0].id;
  };

  if (!role) return (
    <I18nProvider locale={locale} setLocale={switchLocale}>
      <RoleSelector counts={roleCounts} onSelect={(nextRole) => { setRole(nextRole); setSelectedCaseId(defaultCaseForRole(nextRole)); setActiveViews((current) => ({ ...current, [nextRole]: defaultViews[nextRole] })); normalizeRoute(locale, nextRole, false); }} />
    </I18nProvider>
  );

  const activeView = activeViews[role];
  const setView = (view: string) => setActiveViews((current) => ({ ...current, [role]: view }));

  return (
    <I18nProvider locale={locale} setLocale={switchLocale}>
    <AppShell role={role} activeView={activeView} navItems={navByRole[role].map((item) => ({ ...item, count: item.id === defaultViews[role] ? roleCounts[role] : undefined }))} onNavigate={setView} onRoleHome={() => { setRole(null); normalizeRoute(locale, null, false); }} toast={toast}>
      {role === "operations" ? <OperationsPanel caseViews={operationsCaseViews} activeView={activeView} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onAction={handleOperationsAction} onCreateCase={createCaseShell} /> : null}
      {role === "radiologist" ? <RadiologistPanel caseViews={radiologistCaseViews} activeView={activeView} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onAction={handleRadiologistAction} /> : null}
      {role === "physician" ? <PhysicianPanel caseViews={physicianCaseViews} activeView={activeView} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onAction={handlePhysicianAction} /> : null}
      {role === "patient" ? <PatientPanel item={getPatientSafeView(cases.find((item) => item.id === "K-2041") ?? cases[0])} activeView={activeView} onAction={handlePatientAction} /> : null}
      {role === "caregiver" ? <CaregiverPanel item={getPatientSafeView(cases.find((item) => item.id === "K-2041") ?? cases[0])} activeView={activeView} onAction={handlePatientAction} /> : null}
      {role === "research" ? <ResearchPanel cases={cases.map((item) => toResearchSafeCaseView(item, { role: "researcher", researchPurposeApproved: true }))} activeView={activeView} onAction={() => showToast("Anonymized CSV export placeholder generated.")} /> : null}
    </AppShell>
    </I18nProvider>
  );
}

function toAgeGroup(age: number) {
  const start = Math.floor(age / 5) * 5;
  return `${start}–${start + 4}`;
}

function applyPermittedDomainTransition(caseRecord: KioCase | undefined, action: CaseAction, context: GuardedCaseActionContext) {
  if (!caseRecord) return undefined;
  const result = guardCaseAction(caseRecord, action, context);
  return {
    ...result,
    caseRecord: withDerivedCaseFields(result.caseRecord),
  };
}

function applyPermittedDomainSequence(caseRecord: KioCase | undefined, steps: Array<[CaseAction, GuardedCaseActionContext]>) {
  if (!caseRecord) return undefined;
  const result = guardCaseActionSequence(caseRecord, steps);
  if (!result) return undefined;
  return {
    ...result,
    caseRecord: withDerivedCaseFields(result.caseRecord),
  };
}

function canSavePhysicianNote(caseRecord: KioCase | undefined) {
  if (!caseRecord) return { allowed: false, reason: "Case not found." };
  const actionByState: Partial<Record<KioCase["state"], CaseAction>> = {
    RADIOLOGIST_REVIEW_COMPLETED: "START_PHYSICIAN_SYNTHESIS",
    PHYSICIAN_CLINICAL_SYNTHESIS_PENDING: "START_PHYSICIAN_REVIEW",
    PHYSICIAN_REVIEW_IN_PROGRESS: "DRAFT_FINAL_REPORT",
  };
  const action = actionByState[caseRecord.state];
  if (!action) return { allowed: false, reason: "This action is not available in the current case state." };
  const decision = canPerformCaseAction(caseRecord, action, { role: "physician" });
  return { allowed: decision.allowed, reason: decision.reason ?? "Action not allowed for this role." };
}

function RoleSelector({ counts, onSelect }: { counts: Record<RoleId, number>; onSelect: (role: RoleId) => void }) {
  const { locale, dir, setLocale, t, tv, formatNumber } = useI18n();
  return (
    <main className="role-selector" lang={locale} dir={dir}>
      <header className="selector-header">
        <div className="selector-topline">
          <div className="selector-brand"><span>K</span><strong>{t("Kio")}</strong></div>
          <label className="language-switcher selector-language">
            <span>{t("Language")}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </label>
        </div>
        <p className="eyebrow">{t("Clickable product prototype")}</p><h1>{t("Choose a role-based workspace")}</h1><p>{t("Kio is an AI-assisted neuroimaging decision-support workflow. Each role sees the same case through a different permission-aware experience.")}</p></header>
      <section className="role-grid">
        {(Object.keys(roleDefinitions) as RoleId[]).map((role) => {
          const definition = roleDefinitions[role];
          return (
            <button key={role} type="button" className={`role-card accent-${definition.accent}`} onClick={() => onSelect(role)}>
              <span className="role-icon">{tv(definition.shortLabel).slice(0, 2)}</span>
              <div><p>{tv(definition.shortLabel)}</p><h2>{tv(definition.label)}</h2><span>{tv(definition.purpose)}</span></div>
              <div className="role-card-bottom"><strong>{formatNumber(counts[role])}</strong><span>{t(role === "patient" || role === "caregiver" ? "active case" : role === "research" ? "eligible records" : "items needing attention")}</span><em>{t("Open workspace →")}</em></div>
            </button>
          );
        })}
      </section>
      <footer className="selector-footer"><span>{t("Mock data only")}</span><span>{t("No diagnosis or treatment recommendation")}</span><span>{t("No real medical image processing")}</span></footer>
    </main>
  );
}

function getInitialRoute(): RouteState {
  const route = parseRoute();
  normalizeRoute(route.locale, route.role, true);
  return route;
}

function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL; // "/" in dev, "/kio/" on GitHub Pages
  return pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
}

function parseRoute(): RouteState {
  const segments = stripBase(window.location.pathname).split("/").filter(Boolean);
  const storedLocale = getStoredLocale();
  const firstSegment = segments[0];
  const firstIsRole = firstSegment && firstSegment in slugToRole;
  const locale = isLocale(firstSegment) ? firstSegment : firstIsRole ? storedLocale ?? "en" : "en";
  const roleSegment = isLocale(firstSegment) ? segments[1] : firstIsRole ? firstSegment : segments[1];
  const role = roleSegment && roleSegment in slugToRole ? slugToRole[roleSegment as RoleSlug] : null;
  return { locale, role };
}

function normalizeRoute(locale: Locale, role: RoleId | null, replace: boolean) {
  const base = import.meta.env.BASE_URL; // ends with "/"
  const target = `${base}${locale}${role ? `/${roleToSlug[role]}` : ""}`;
  if (window.location.pathname === target) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", target);
}
