import React, { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Collapse,
  Drawer,
  Empty,
  Input,
  List,
  Popconfirm,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { generateVertexJsonPayload } from "@/components/ui-canvas/UICanvasAIDrawer/vertexAIGeminiClient";
import AnalysisReportBlock from "./AnalysisReportBlock";
import type { APIEndpoint } from "@/hooks/api-canvas/types";
import { db } from "@/config/firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const { TextArea } = Input;
const { Paragraph, Text, Title } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface APICanvasAnalyzerDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedEndpoint: APIEndpoint | null | undefined;
  updateEndpoint: (endpoint: APIEndpoint) => Promise<void>;
}

interface APICanvasAnalysisFinding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  category: string;
  details: string;
  recommendation: string;
  affectedSections: string[];
}

interface APICanvasAnalysisRowReport {
  key: string;
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
}

interface APICanvasAnalysisNarrative {
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
}

interface APICanvasAnalysisSections {
  description: APICanvasAnalysisNarrative;
  input: APICanvasAnalysisNarrative & {
    rowReports: APICanvasAnalysisRowReport[];
  };
  requestBody: APICanvasAnalysisNarrative;
  operation: APICanvasAnalysisNarrative & {
    rowReports: APICanvasAnalysisRowReport[];
  };
  output: APICanvasAnalysisNarrative & {
    rowReports: APICanvasAnalysisRowReport[];
  };
  responseBody: APICanvasAnalysisNarrative;
}

interface APICanvasAnalysisRecord {
  id: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByImage?: string;
  endpointId: string;
  endpointName: string;
  focusPrompt?: string;
  sections: APICanvasAnalysisSections;
  summary: string;
  strengths: string[];
  blindSpots: string[];
  findings: APICanvasAnalysisFinding[];
}

type AnalysisSectionKey = keyof APICanvasAnalysisSections;

const EMPTY_ANALYSIS_OPTION = "__empty_analysis__";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRiskRate(value: unknown, fallback = 35) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeAnalysisPayload(payload: unknown, selectedEndpoint: APIEndpoint, focusPrompt: string): APICanvasAnalysisRecord {
  const source = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const findingsSource = Array.isArray(source.findings) ? source.findings : [];
  const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
  const currentUserEmail = normalizeText(currentUserData?.email);
  const currentUserDisplayName = normalizeText(
    currentUserData?.displayName
    || currentUserData?.name
    || `${currentUserData?.firstName || ""} ${currentUserData?.lastName || ""}`
    || (currentUserEmail ? currentUserEmail.split("@")[0] : "")
  );
  const currentUserPhoto = normalizeText(
    currentUserData?.photoURL || currentUserData?.image || currentUserData?.avatar || ""
  );

  const findings: APICanvasAnalysisFinding[] = findingsSource.map((item, index) => {
    const record = item as Record<string, unknown>;
    const severity = normalizeText(record.severity).toLowerCase();

    return {
      id: String(record.id || `${Date.now()}_finding_${index}`),
      title: normalizeText(record.title) || `Finding ${index + 1}`,
      severity: severity === "high" || severity === "medium" || severity === "low" ? severity : "medium",
      category: normalizeText(record.category) || "general",
      details: normalizeText(record.details),
      recommendation: normalizeText(record.recommendation),
      affectedSections: Array.isArray(record.affectedSections)
        ? record.affectedSections.map((entry) => normalizeText(entry)).filter(Boolean)
        : [],
    };
  });

  const normalizeRowReports = (value: unknown): APICanvasAnalysisRowReport[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        const record = item as Record<string, unknown>;

        return {
          key: normalizeText(record.key || record.name || record.fieldName || record.stepIndex || `row_${index + 1}`),
          currentState: normalizeText(record.currentState || record.status || record.current || record.report || record.analysis),
          threats: normalizeText(record.threats || record.risks || record.details),
          suggestions: normalizeText(record.suggestions || record.recommendation || record.proposal),
          riskRate: normalizeRiskRate(record.riskRate || record.riskScore, 40),
        };
      })
      .filter((item) => item.key && (item.currentState || item.threats || item.suggestions));
  };

  const normalizeSection = (key: keyof APICanvasAnalysisSections): APICanvasAnalysisSections[keyof APICanvasAnalysisSections] => {
    const section = (source[key] && typeof source[key] === "object" ? source[key] : {}) as Record<string, unknown>;
    const narrative = {
      currentState: normalizeText(section.currentState || section.status || section.current || section.report || section.summary || section.analysis),
      threats: normalizeText(section.threats || section.risks || section.details),
      suggestions: normalizeText(section.suggestions || section.recommendation || section.proposal),
      riskRate: normalizeRiskRate(section.riskRate || section.riskScore, 45),
    };

    if (key === "input" || key === "operation" || key === "output") {
      return {
        ...narrative,
        rowReports: normalizeRowReports(section.rowReports || section.rows || section.items),
      };
    }

    return narrative;
  };

  const getSectionFindings = (sectionKey: string) => findings
      .filter((item) => item.affectedSections.some((section) => section.toLowerCase() === sectionKey))
      .filter(Boolean);

  const sections: APICanvasAnalysisSections = {
    description: normalizeSection("description") as APICanvasAnalysisSections["description"],
    input: normalizeSection("input") as APICanvasAnalysisSections["input"],
    requestBody: normalizeSection("requestBody") as APICanvasAnalysisSections["requestBody"],
    operation: normalizeSection("operation") as APICanvasAnalysisSections["operation"],
    output: normalizeSection("output") as APICanvasAnalysisSections["output"],
    responseBody: normalizeSection("responseBody") as APICanvasAnalysisSections["responseBody"],
  };

  const applyFallbackNarrative = (sectionKey: string, section: APICanvasAnalysisNarrative) => {
    const sectionFindings = getSectionFindings(sectionKey);
    section.currentState ||= sectionFindings.map((item) => item.title).filter(Boolean).join(" ");
    section.threats ||= sectionFindings.map((item) => item.details).filter(Boolean).join(" ");
    section.suggestions ||= sectionFindings.map((item) => item.recommendation).filter(Boolean).join(" ");
  };

  applyFallbackNarrative("description", sections.description);
  applyFallbackNarrative("input", sections.input);
  applyFallbackNarrative("requestbody", sections.requestBody);
  applyFallbackNarrative("operation", sections.operation);
  applyFallbackNarrative("output", sections.output);
  applyFallbackNarrative("responsebody", sections.responseBody);

  const getSectionFallbackRiskRate = (sectionKey: string) => {
    const sectionFindings = findings.filter((item) => item.affectedSections.some((section) => section.toLowerCase() === sectionKey));

    if (!sectionFindings.length) {
      return 25;
    }

    const total = sectionFindings.reduce((sum, item) => {
      if (item.severity === "high") return sum + 90;
      if (item.severity === "medium") return sum + 65;
      return sum + 35;
    }, 0);

    return Math.round(total / sectionFindings.length);
  };

  sections.description.riskRate ||= getSectionFallbackRiskRate("description");
  sections.input.riskRate ||= getSectionFallbackRiskRate("input");
  sections.requestBody.riskRate ||= getSectionFallbackRiskRate("requestbody");
  sections.operation.riskRate ||= getSectionFallbackRiskRate("operation");
  sections.output.riskRate ||= getSectionFallbackRiskRate("output");
  sections.responseBody.riskRate ||= getSectionFallbackRiskRate("responsebody");

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    createdBy: currentUserEmail || "unknown",
    createdByName: currentUserDisplayName || "Unknown User",
    createdByEmail: currentUserEmail || "unknown",
    createdByImage: currentUserPhoto,
    endpointId: selectedEndpoint.id,
    endpointName: selectedEndpoint.name,
    focusPrompt: focusPrompt.trim(),
    sections,
    summary: normalizeText(source.summary),
    strengths: Array.isArray(source.strengths) ? source.strengths.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    blindSpots: Array.isArray(source.blindSpots) ? source.blindSpots.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    findings,
  };
}

function ensureAnalysisRecordShape(record: unknown, selectedEndpoint: APIEndpoint): APICanvasAnalysisRecord {
  const source = (record && typeof record === "object" ? record : {}) as Record<string, unknown> & Partial<APICanvasAnalysisRecord>;
  const normalized = normalizeAnalysisPayload(
    {
      ...source,
      description: source.sections?.description || source.description,
      input: source.sections?.input || source.input,
      requestBody: source.sections?.requestBody || source.requestBody,
      operation: source.sections?.operation || source.operation,
      output: source.sections?.output || source.output,
      responseBody: source.sections?.responseBody || source.responseBody,
      summary: source.summary,
      strengths: source.strengths,
      blindSpots: source.blindSpots,
      findings: source.findings,
    },
    selectedEndpoint,
    String(source.focusPrompt || ""),
  );

  return {
    ...normalized,
    id: String(source.id || normalized.id),
    createdAt: String(source.createdAt || normalized.createdAt),
    createdBy: source.createdBy || normalized.createdBy,
    createdByName: normalizeText(source.createdByName || source.createdBy),
    createdByEmail: normalizeText(source.createdByEmail || source.createdBy),
    createdByImage: normalizeText(source.createdByImage),
    endpointId: String(source.endpointId || normalized.endpointId),
    endpointName: String(source.endpointName || normalized.endpointName),
    focusPrompt: String(source.focusPrompt || normalized.focusPrompt || ""),
  };
}

function truncateText(value: string, maxLength = 150) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function stringifyJsonBlock(value: string) {
  const trimmed = normalizeText(value);

  if (!trimmed) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

function stringifyUnknown(value: unknown) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function detectLanguageFromPrompt(prompt: string): string {
  if (!prompt) return "English";
  
  const lowerPrompt = prompt.toLowerCase();
  
  // Explicit language mentions in prompt
  if (lowerPrompt.includes("azerba") || lowerPrompt.includes("azərb") || lowerPrompt.includes("azeri")) {
    return "Azerbaijani";
  }
  if (lowerPrompt.includes("english") || lowerPrompt.includes("ingiliz") || lowerPrompt.includes("ingilis")) {
    return "English";
  }
  if (lowerPrompt.includes("russian") || lowerPrompt.includes("rus") || lowerPrompt.includes("russkij")) {
    return "Russian";
  }
  if (lowerPrompt.includes("turkish") || lowerPrompt.includes("turk")) {
    return "Turkish";
  }
  
  // Character-based detection for Azerbaijani
  const hasAzerbaijaniChars = /[ƏəÖöÇçĞğıİŞş]/.test(prompt);
  if (hasAzerbaijaniChars) {
    return "Azerbaijani";
  }
  
  // Cyrillic (Russian)
  const hasCyrillicChars = /[А-Яа-яЁё]/.test(prompt);
  if (hasCyrillicChars) {
    return "Russian";
  }
  
  // Default to English
  return "English";
}

function getSectionSnapshot(selectedEndpoint: APIEndpoint, sectionKey: AnalysisSectionKey) {
  switch (sectionKey) {
    case "description":
      return selectedEndpoint.description || "";
    case "input":
      return selectedEndpoint.input || [];
    case "requestBody":
      return selectedEndpoint.requestBody || "";
    case "operation":
      return selectedEndpoint.operation || [];
    case "output":
      return selectedEndpoint.output || [];
    case "responseBody":
      return selectedEndpoint.responseBody || "";
    default:
      return "";
  }
}

function buildSectionApplyPromptEnvelope(
  selectedEndpoint: APIEndpoint,
  sectionKey: AnalysisSectionKey,
  sectionAnalysis: APICanvasAnalysisSections[AnalysisSectionKey],
  focusPrompt: string,
) {
  const detectedLanguage = detectLanguageFromPrompt(focusPrompt);
  const languageInstruction = `Provide response in ${detectedLanguage} language.`;

  return JSON.stringify(
    {
      task: "apply_api_canvas_section_fix",
      instructions: [
        "Return only valid JSON.",
        languageInstruction,
        "Update only the requested api canvas section.",
        "Apply the analysis report recommendations carefully.",
        "Keep the result practical, concise, and ready to save into the API canvas.",
        "Do not change unrelated sections.",
      ],
      sectionKey,
      focusPrompt: focusPrompt.trim() || null,
      endpointContext: selectedEndpoint,
      currentSectionValue: getSectionSnapshot(selectedEndpoint, sectionKey),
      sectionAnalysis,
      responseShape: {
        sectionKey,
        value:
          sectionKey === "description" ? "string" :
          sectionKey === "requestBody" || sectionKey === "responseBody" ? "string" :
          sectionKey === "input" || sectionKey === "output" ? [{ name: "string", description: "string" }] :
          [{ type: "common", description: "string" }],
      },
    },
    null,
    2,
  );
}

function buildRowApplyPromptEnvelope(
  selectedEndpoint: APIEndpoint,
  sectionKey: "input" | "operation" | "output",
  rowKey: string,
  rowValue: unknown,
  rowAnalysis: APICanvasAnalysisRowReport | undefined,
  focusPrompt: string,
) {
  const detectedLanguage = detectLanguageFromPrompt(focusPrompt);
  const languageInstruction = `Provide response in ${detectedLanguage} language.`;

  return JSON.stringify(
    {
      task: "apply_api_canvas_row_fix",
      instructions: [
        "Return only valid JSON.",
        languageInstruction,
        "Update only the requested row in the requested section.",
        "Apply the analysis report recommendations carefully.",
        "Do not modify unrelated rows.",
      ],
      sectionKey,
      rowKey,
      focusPrompt: focusPrompt.trim() || null,
      endpointContext: selectedEndpoint,
      currentRowValue: rowValue,
      rowAnalysis: rowAnalysis || null,
      responseShape: {
        sectionKey,
        rowKey,
        value: sectionKey === "operation"
          ? { type: "common", description: "string" }
          : { name: "string", description: "string" },
      },
    },
    null,
    2,
  );
}

function buildSectionReanalysisPromptEnvelope(
  selectedEndpoint: APIEndpoint,
  sectionKey: AnalysisSectionKey,
  focusPrompt: string,
) {
  const detectedLanguage = detectLanguageFromPrompt(focusPrompt);
  const languageInstruction = `Provide response in ${detectedLanguage} language.`;

  return JSON.stringify(
    {
      task: "reanalyze_single_api_canvas_section",
      instructions: [
        "Return only valid JSON.",
        languageInstruction,
        "Analyze only the requested section of the API canvas.",
        "Return one section object matching the provided response shape.",
        "Return currentState, threats, suggestions, and riskRate.",
        "For input, operation, and output also return rowReports with currentState, threats, suggestions, and riskRate.",
        "Do not include markdown.",
      ],
      sectionKey,
      focusPrompt: focusPrompt.trim() || null,
      endpointContext: selectedEndpoint,
      currentSectionValue: getSectionSnapshot(selectedEndpoint, sectionKey),
      responseShape: {
        [sectionKey]:
          sectionKey === "description" ? { currentState: "string", threats: "string", suggestions: "string", riskRate: 40 } :
          sectionKey === "requestBody" || sectionKey === "responseBody" ? { currentState: "string", threats: "string", suggestions: "string", riskRate: 40 } :
          { currentState: "string", threats: "string", suggestions: "string", riskRate: 40, rowReports: [{ key: "string", currentState: "string", threats: "string", suggestions: "string", riskRate: 40 }] },
      },
    },
    null,
    2,
  );
}

function normalizeSectionPayload(
  payload: unknown,
  sectionKey: AnalysisSectionKey,
  selectedEndpoint: APIEndpoint,
  focusPrompt: string,
): APICanvasAnalysisSections[AnalysisSectionKey] {
  const wrappedPayload = {
    [sectionKey]: (payload && typeof payload === "object" && sectionKey in (payload as Record<string, unknown>))
      ? (payload as Record<string, unknown>)[sectionKey]
      : payload,
  };

  return normalizeAnalysisPayload(wrappedPayload, selectedEndpoint, focusPrompt).sections[sectionKey];
}

function getAccuracyLevelColor(accuracyLevel: number) {
  if (accuracyLevel >= 80) return "#52c41a";
  if (accuracyLevel >= 60) return "#1677ff";
  if (accuracyLevel >= 40) return "#faad14";
  return "#ff4d4f";
}

function RiskRateBadge({ riskRate }: { riskRate: number }) {
  const safeRiskRate = normalizeRiskRate(riskRate, 25);
  const accuracyLevel = Math.max(0, Math.min(100, 100 - safeRiskRate));
  const color = getAccuracyLevelColor(accuracyLevel);
  const progressDegrees = Math.round((accuracyLevel / 100) * 360);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 150,
        padding: "6px 10px 8px",
        borderRadius: 14,
        border: `1px solid ${color}33`,
        background: `${color}14`,
        color,
        fontWeight: 600,
        animation: "riskPulse 1.8s ease-in-out infinite",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            position: "relative",
            width: 18,
            height: 18,
            minWidth: 18,
            borderRadius: "50%",
            background: `conic-gradient(${color} 0deg ${progressDegrees}deg, ${color}22 ${progressDegrees}deg 360deg)`,
            boxShadow: `0 0 0 0 ${color}66`,
            animation: "riskDotPulse 1.8s ease-in-out infinite",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              background: "#fff8",
            }}
          />
        </span>
        {`Accuracy Level: ${accuracyLevel}%`}
      </div>

      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 999,
          background: `${color}22`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${accuracyLevel}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${color}99 0%, ${color} 100%)`,
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}

function renderAnalysisReportGroup(
  currentState: string,
  threats: string,
  suggestions: string,
  riskRate: number,
  extra?: React.ReactNode,
  color: string = "#1677ff",
) {
  return (
    <AnalysisReportBlock
      currentState={currentState}
      threats={threats}
      suggestions={suggestions}
      riskRate={riskRate}
      extra={extra}
      color={color}
    />
  );
}

function buildAnalysisPromptEnvelope(selectedEndpoint: APIEndpoint, focusPrompt: string) {
  const detectedLanguage = detectLanguageFromPrompt(focusPrompt);
  const languageInstruction = `Provide all analysis content (currentState, threats, suggestions) in ${detectedLanguage} language.`;

  return JSON.stringify(
    {
      task: "analyze_api_canvas_risks_and_gaps",
      instructions: [
        "Return only valid JSON.",
        languageInstruction,
        "Analyze the current API canvas from multiple viewpoints: API design, validation, consistency, security, error handling, naming clarity, missing fields, and contract completeness.",
        "Use the actual current canvas structure as the primary source of truth.",
        "Produce analysis in six sections: description, input, requestBody, operation, output, responseBody.",
        "For every section and row report include riskRate as a number from 0 to 100.",
        "For every section return currentState, threats, suggestions, and riskRate.",
        "For input, operation, and output rowReports also return currentState, threats, suggestions, and riskRate.",
        "For input and output rowReports.key must match the exact field name.",
        "For operation rowReports.key must be the 1-based step number as string, for example '1', '2', '3'.",
        "Threats must contain risks, threats, or danger points.",
        "Suggestions must contain concrete fixes or improvements.",
        "Identify forgotten, risky, inconsistent, or underspecified points across the six blocks.",
        "Be concrete, practical, and critical when needed.",
        "Do not include markdown.",
      ],
      endpointContext: selectedEndpoint,
      focusPrompt: focusPrompt.trim() || null,
      responseShape: {
        description: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 72,
        },
        input: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 68,
          rowReports: [{ key: "firstName", currentState: "string", threats: "string", suggestions: "string", riskRate: 75 }],
        },
        requestBody: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 61,
        },
        operation: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 64,
          rowReports: [{ key: "1", currentState: "string", threats: "string", suggestions: "string", riskRate: 70 }],
        },
        output: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 37,
          rowReports: [{ key: "id", currentState: "string", threats: "string", suggestions: "string", riskRate: 28 }],
        },
        responseBody: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 58,
        },
      },
    },
    null,
    2,
  );
}

function buildAnalysisDiff(leftAnalysis: APICanvasAnalysisRecord | undefined, rightAnalysis: APICanvasAnalysisRecord | undefined) {
  if (!leftAnalysis || !rightAnalysis) {
    return null;
  }

  const leftTitles = new Set(leftAnalysis.findings.map((item) => item.title));
  const rightTitles = new Set(rightAnalysis.findings.map((item) => item.title));

  const addedFindings = rightAnalysis.findings.filter((item) => !leftTitles.has(item.title));
  const removedFindings = leftAnalysis.findings.filter((item) => !rightTitles.has(item.title));

  return {
    addedFindings,
    removedFindings,
    leftCount: leftAnalysis.findings.length,
    rightCount: rightAnalysis.findings.length,
  };
}

export default function APICanvasAnalyzerDrawer({
  open,
  onClose,
  selectedEndpoint,
  updateEndpoint,
}: APICanvasAnalyzerDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<APICanvasAnalysisRecord[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | undefined>();
  const [leftDiffAnalysisId, setLeftDiffAnalysisId] = useState<string | undefined>();
  const [rightDiffAnalysisId, setRightDiffAnalysisId] = useState<string | undefined>();
  const [applyingSectionKey, setApplyingSectionKey] = useState<AnalysisSectionKey | null>(null);
  const [applyingRowKey, setApplyingRowKey] = useState<string | null>(null);
  const selectedEndpointId = selectedEndpoint?.id;

  const selectedAnalysis = analyses.find((item) => item.id === selectedAnalysisId);
  const analysisDiff = useMemo(
    () => buildAnalysisDiff(
      analyses.find((item) => item.id === leftDiffAnalysisId),
      analyses.find((item) => item.id === rightDiffAnalysisId),
    ),
    [analyses, leftDiffAnalysisId, rightDiffAnalysisId],
  );

  React.useEffect(() => {
    if (!open || !selectedEndpointId || !selectedEndpoint) {
      return;
    }

    const loadAnalyses = async () => {
      setAnalysesLoading(true);

      try {
        const historyDocRef = doc(db, "api_canvas_history", selectedEndpointId);
        const historySnap = await getDoc(historyDocRef);
        const storedAnalyses = historySnap.exists() && Array.isArray(historySnap.data()?.aiAnalyses)
          ? (historySnap.data()?.aiAnalyses as unknown[]).map((item) => ensureAnalysisRecordShape(item, selectedEndpoint))
          : [];

        const sortedAnalyses = [...storedAnalyses].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        setAnalyses(sortedAnalyses);
        setSelectedAnalysisId(undefined);
        setLeftDiffAnalysisId(sortedAnalyses[1]?.id || sortedAnalyses[0]?.id);
        setRightDiffAnalysisId(sortedAnalyses[0]?.id);
      } catch (loadError) {
        console.error("Failed to load API canvas analyses:", loadError);
        setAnalyses([]);
      } finally {
        setAnalysesLoading(false);
      }
    };

    void loadAnalyses();
  }, [open, selectedEndpointId]);

  const persistAnalyses = React.useCallback(async (nextAnalyses: APICanvasAnalysisRecord[]) => {
    if (!selectedEndpoint?.id) {
      return;
    }

    const historyDocRef = doc(db, "api_canvas_history", selectedEndpoint.id);
    const historySnap = await getDoc(historyDocRef);

    if (historySnap.exists()) {
      await updateDoc(historyDocRef, {
        apiCanvasId: selectedEndpoint.id,
        apiCanvasName: selectedEndpoint.name,
        aiAnalyses: nextAnalyses,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await setDoc(historyDocRef, {
      apiCanvasId: selectedEndpoint.id,
      apiCanvasName: selectedEndpoint.name,
      aiAnalyses: nextAnalyses,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [selectedEndpoint?.id, selectedEndpoint?.name]);

  const handleAnalyze = async () => {
    if (!selectedEndpoint) {
      message.warning("Select an API canvas first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateVertexJsonPayload(
        buildAnalysisPromptEnvelope(selectedEndpoint, prompt),
        "Return only valid JSON for API canvas analysis. No markdown.",
      );

      const nextAnalysis = normalizeAnalysisPayload(response, selectedEndpoint, prompt);
      const nextAnalyses = [nextAnalysis, ...analyses];

      await persistAnalyses(nextAnalyses);
      setAnalyses(nextAnalyses);
      setSelectedAnalysisId(nextAnalysis.id);
      setRightDiffAnalysisId(nextAnalysis.id);
      if (!leftDiffAnalysisId) {
        setLeftDiffAnalysisId(nextAnalyses[1]?.id || nextAnalysis.id);
      }
      message.success("API canvas analysis saved.");
    } catch (analysisError) {
      console.error(analysisError);
      const nextError = analysisError instanceof Error ? analysisError.message : "Analysis failed.";
      setError(nextError);
      message.error("Failed to analyze current API canvas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    const nextAnalyses = analyses.filter((item) => item.id !== analysisId);
    try {
      await persistAnalyses(nextAnalyses);
      setAnalyses(nextAnalyses);
      if (selectedAnalysisId === analysisId) {
        setSelectedAnalysisId(undefined);
      }
      if (leftDiffAnalysisId === analysisId) {
        setLeftDiffAnalysisId(nextAnalyses[1]?.id || nextAnalyses[0]?.id);
      }
      if (rightDiffAnalysisId === analysisId) {
        setRightDiffAnalysisId(nextAnalyses[0]?.id);
      }
      message.success("Analysis deleted.");
    } catch (deleteError) {
      console.error(deleteError);
      message.error("Failed to delete analysis.");
    }
  };

  const handleApplySection = async (sectionKey: AnalysisSectionKey) => {
    if (!selectedEndpoint || !selectedAnalysis) {
      return;
    }

    setApplyingSectionKey(sectionKey);

    try {
      const applyResponse = await generateVertexJsonPayload(
        buildSectionApplyPromptEnvelope(selectedEndpoint, sectionKey, selectedAnalysis.sections[sectionKey], selectedAnalysis.focusPrompt || prompt),
        "Return only valid JSON for a single api canvas section update.",
      );

      const applySource = (applyResponse && typeof applyResponse === "object" ? applyResponse : {}) as Record<string, unknown>;
      const nextValue = applySource.value ?? applySource[sectionKey];

      const nextEndpoint: APIEndpoint = {
        ...selectedEndpoint,
        ...(sectionKey === "description" ? { description: normalizeText(nextValue) } : {}),
        ...(sectionKey === "input" ? { input: Array.isArray(nextValue) ? nextValue as APIEndpoint["input"] : selectedEndpoint.input } : {}),
        ...(sectionKey === "requestBody" ? { requestBody: typeof nextValue === "string" ? nextValue : stringifyUnknown(nextValue) } : {}),
        ...(sectionKey === "operation" ? { operation: Array.isArray(nextValue) ? nextValue as APIEndpoint["operation"] : selectedEndpoint.operation } : {}),
        ...(sectionKey === "output" ? { output: Array.isArray(nextValue) ? nextValue as APIEndpoint["output"] : selectedEndpoint.output } : {}),
        ...(sectionKey === "responseBody" ? { responseBody: typeof nextValue === "string" ? nextValue : stringifyUnknown(nextValue) } : {}),
      };

      await updateEndpoint(nextEndpoint);

      const reanalysisResponse = await generateVertexJsonPayload(
        buildSectionReanalysisPromptEnvelope(nextEndpoint, sectionKey, selectedAnalysis.focusPrompt || prompt),
        "Return only valid JSON for a single api canvas section analysis.",
      );

      const nextSectionAnalysis = normalizeSectionPayload(
        reanalysisResponse,
        sectionKey,
        nextEndpoint,
        selectedAnalysis.focusPrompt || prompt,
      );

      const nextAnalysis: APICanvasAnalysisRecord = {
        ...selectedAnalysis,
        endpointName: nextEndpoint.name,
        sections: {
          ...selectedAnalysis.sections,
          [sectionKey]: nextSectionAnalysis,
        },
      };

      const nextAnalyses = analyses.map((item) => (
        item.id === selectedAnalysis.id ? nextAnalysis : item
      ));
      await persistAnalyses(nextAnalyses);
      setAnalyses(nextAnalyses);
      setSelectedAnalysisId(selectedAnalysis.id);
      setRightDiffAnalysisId(selectedAnalysis.id);

      message.success(`${sectionKey} applied and re-analyzed.`);
    } catch (applyError) {
      console.error(applyError);
      message.error(`Failed to apply ${sectionKey}.`);
    } finally {
      setApplyingSectionKey(null);
    }
  };

  const handleApplyRow = async (sectionKey: "input" | "operation" | "output", rowKey: string) => {
    if (!selectedEndpoint || !selectedAnalysis) {
      return;
    }

    setApplyingRowKey(`${sectionKey}:${rowKey}`);

    try {
      const currentRows = selectedEndpoint[sectionKey];
      const rowIndex = sectionKey === "operation"
        ? Number(rowKey) - 1
        : currentRows.findIndex((item) => item.name === rowKey);

      if (rowIndex < 0 || !currentRows[rowIndex]) {
        message.error("Target row not found.");
        return;
      }

      const rowAnalysis = selectedAnalysis.sections[sectionKey].rowReports.find((entry) => entry.key === rowKey);
      const applyResponse = await generateVertexJsonPayload(
        buildRowApplyPromptEnvelope(
          selectedEndpoint,
          sectionKey,
          rowKey,
          currentRows[rowIndex],
          rowAnalysis,
          selectedAnalysis.focusPrompt || prompt,
        ),
        "Return only valid JSON for a single api canvas row update.",
      );

      const applySource = (applyResponse && typeof applyResponse === "object" ? applyResponse : {}) as Record<string, unknown>;
      const nextRowValue = (applySource.value ?? applySource[sectionKey]) as APIEndpoint["input"][number] | APIEndpoint["operation"][number];
      const nextRows = [...currentRows];
      nextRows[rowIndex] = nextRowValue as never;

      const nextEndpoint: APIEndpoint = {
        ...selectedEndpoint,
        [sectionKey]: nextRows,
      };

      await updateEndpoint(nextEndpoint);

      const reanalysisResponse = await generateVertexJsonPayload(
        buildSectionReanalysisPromptEnvelope(nextEndpoint, sectionKey, selectedAnalysis.focusPrompt || prompt),
        "Return only valid JSON for a single api canvas section analysis.",
      );

      const nextSectionAnalysis = normalizeSectionPayload(
        reanalysisResponse,
        sectionKey,
        nextEndpoint,
        selectedAnalysis.focusPrompt || prompt,
      );

      const nextAnalysis: APICanvasAnalysisRecord = {
        ...selectedAnalysis,
        endpointName: nextEndpoint.name,
        sections: {
          ...selectedAnalysis.sections,
          [sectionKey]: nextSectionAnalysis,
        },
      };

      const nextAnalyses = analyses.map((item) => (
        item.id === selectedAnalysis.id ? nextAnalysis : item
      ));
      await persistAnalyses(nextAnalyses);
      setAnalyses(nextAnalyses);
      setSelectedAnalysisId(selectedAnalysis.id);
      setRightDiffAnalysisId(selectedAnalysis.id);

      message.success(`${sectionKey} row applied and re-analyzed.`);
    } catch (applyError) {
      console.error(applyError);
      message.error(`Failed to apply ${sectionKey} row.`);
    } finally {
      setApplyingRowKey(null);
    }
  };

  return (
    <Drawer
      title={(
        <Space>
          <SearchOutlined />
          <span>API Canvas AI Analyzer</span>
        </Space>
      )}
      open={open}
      onClose={onClose}
      width="90%"
      destroyOnClose
    >
      <style>
        {`
          @keyframes riskPulse {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-1px); }
          }
          @keyframes riskDotPulse {
            0% { box-shadow: 0 0 0 0 currentColor; }
            70% { box-shadow: 0 0 0 8px transparent; }
            100% { box-shadow: 0 0 0 0 transparent; }
          }
        `}
      </style>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={5} style={{ marginBottom: 8 }}>
              Analysis Prompt
            </Title>
            <Text type="secondary">
              Endpoint: {selectedEndpoint?.name || "No API canvas selected"}
            </Text>
          </div>

          <TextArea
            rows={5}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Optional focus: check validation gaps, naming inconsistencies, security risks, missing output fields, forgotten edge cases..."
          />

          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={!selectedEndpoint?.id}
            >
              Analyze Current Canvas
            </Button>
            <Button onClick={() => setPrompt("")}>
              Clear Prompt
            </Button>
          </Space>
        </Space>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="AI analysis error"
            description={<div style={{ whiteSpace: "pre-wrap" }}>{error}</div>}
          />
        ) : null}

        {loading ? (
          <Card>
            <div style={{ display: "grid", placeItems: "center", minHeight: 220 }}>
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">Analyzing current API canvas...</Text>
              </Space>
            </div>
          </Card>
        ) : null}

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
            <Title level={5} style={{ margin: 0 }}>
              Analysis History
            </Title>
            {analyses.length ? <Tag color="blue">{analyses.length} saved</Tag> : null}
          </Space>

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space wrap align="start">
                <Text strong>Open analysis:</Text>
                <Select
                  value={selectedAnalysisId ?? EMPTY_ANALYSIS_OPTION}
                  style={{ minWidth: 420 }}
                  onChange={(value) => setSelectedAnalysisId(value === EMPTY_ANALYSIS_OPTION ? undefined : value)}
                  placeholder="Choose date of action"
                  optionLabelProp="label"
                  disabled={!analyses.length}
                >
                  <Option key={EMPTY_ANALYSIS_OPTION} value={EMPTY_ANALYSIS_OPTION} label="Choose date of action">
                    <span style={{ color: "#999" }}>Choose date of action</span>
                  </Option>
                  {analyses.map((item) => {
                    const optionLabel = `${new Date(item.createdAt).toLocaleString()} - ${item.createdByName || item.createdByEmail || "Unknown User"}`;

                    return (
                      <Option
                        key={item.id}
                        value={item.id}
                        label={optionLabel}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar size="small" src={item.createdByImage || undefined}>
                            {(item.createdByName || item.createdByEmail || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <Text strong>{new Date(item.createdAt).toLocaleString()}</Text>
                            <Text type="secondary" ellipsis>
                              {item.createdByName || "Unknown User"} {item.createdByEmail ? `• ${item.createdByEmail}` : ""}
                            </Text>
                          </div>
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </Space>

              <Popconfirm
                title="Are you sure?"
                description="This will permanently delete the selected analysis history record. This action cannot be undone."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => selectedAnalysis ? handleDeleteAnalysis(selectedAnalysis.id) : undefined}
                disabled={!selectedAnalysis}
              >
                <Button danger icon={<DeleteOutlined />} disabled={!selectedAnalysis}>
                  Delete Analysis
                </Button>
              </Popconfirm>
            </Space>

          {analysesLoading ? (
            <Card size="small" style={{ background: "#fafcff", border: "1px solid #d6e4ff" }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text strong>Loading analysis history...</Text>
                <Progress percent={85} status="active" showInfo={false} strokeColor="#1677ff" />
                <Text type="secondary">Saved analyses are being loaded for this API canvas.</Text>
              </Space>
            </Card>
          ) : null}

          {!analysesLoading && analyses.length ? (
            <>
              {selectedAnalysis && selectedAnalysis.focusPrompt && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16, background: "#f5f7fa", border: "1px solid #d9d9d9" }}
                  title={<Text strong>Analysis Prompt</Text>}
                >
                  <Text 
                    style={{ 
                      whiteSpace: "pre-wrap", 
                      lineHeight: 1.6,
                      padding: "8px 12px",
                      background: "#fff",
                      borderRadius: 4,
                      display: "block",
                      borderLeft: "4px solid #1677ff"
                    }}
                  >
                    {selectedAnalysis.focusPrompt}
                  </Text>
                </Card>
              )}

              {selectedAnalysis ? (
                <Collapse
                  bordered={false}
                  defaultActiveKey={["description", "input", "requestBody", "operation", "output", "responseBody"]}
                  style={{ background: "transparent" }}
                >
                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>1. Description</span>} key="description">
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <div
                        style={{
                          padding: 12,
                          border: "1px solid #f0f0f0",
                          borderRadius: 8,
                          background: "#fff",
                        }}
                      >
                        <Tooltip
                          title={selectedEndpoint?.description || "No description"}
                          placement="topLeft"
                        >
                          <Text>{truncateText(selectedEndpoint?.description || "", 150) || "No description"}</Text>
                        </Tooltip>
                      </div>
                      {renderAnalysisReportGroup(
                        selectedAnalysis.sections.description.currentState,
                        selectedAnalysis.sections.description.threats,
                        selectedAnalysis.sections.description.suggestions,
                        selectedAnalysis.sections.description.riskRate,
                        <Button
                          type="primary"
                          size="small"
                          loading={applyingSectionKey === "description"}
                          onClick={() => void handleApplySection("description")}
                        >
                          Apply
                        </Button>,
                      )}
                    </Space>
                  </Panel>

                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>2. Input Fields</span>} key="input">
                    <div style={{ padding: 24 }}>
                      <Table
                        pagination={false}
                        rowKey="name"
                        dataSource={(selectedEndpoint?.input || []).map((item, index) => ({
                          index: index + 1,
                          name: item.name,
                          description: item.description,
                          currentState: selectedAnalysis.sections.input.rowReports.find((entry) => entry.key === item.name)?.currentState || "",
                          threats: selectedAnalysis.sections.input.rowReports.find((entry) => entry.key === item.name)?.threats || "",
                          suggestions: selectedAnalysis.sections.input.rowReports.find((entry) => entry.key === item.name)?.suggestions || "",
                          riskRate: normalizeRiskRate(selectedAnalysis.sections.input.rowReports.find((entry) => entry.key === item.name)?.riskRate, 25),
                          applyKey: item.name,
                        }))}
                        columns={[
                          { title: "#", dataIndex: "index", width: 80 },
                          { title: "Name", dataIndex: "name", width: 240 },
                          {
                            title: "Description",
                            dataIndex: "description",
                            width: 420,
                            render: (value: string) => (
                              <div style={{ maxWidth: 420, whiteSpace: "normal", lineHeight: 1.6 }}>
                                {value || "-"}
                              </div>
                            ),
                          },
                          {
                            title: "Analysis Report",
                            dataIndex: "threats",
                            width: 360,
                            render: (_value: string, record: { currentState: string; threats: string; suggestions: string; riskRate: number; applyKey: string }) => (
                              <Space direction="vertical" size={6}>
                                {renderAnalysisReportGroup(
                                  record.currentState,
                                  record.threats,
                                  record.suggestions,
                                  record.riskRate,
                                  <Button
                                    type="primary"
                                    size="small"
                                    loading={applyingRowKey === `input:${record.applyKey}`}
                                    onClick={() => void handleApplyRow("input", record.applyKey)}
                                  >
                                    Apply
                                  </Button>,
                                )}
                              </Space>
                            ),
                          },
                        ]}
                      />
                      <div style={{ marginTop: 16 }}>
                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                          {renderAnalysisReportGroup(
                            selectedAnalysis.sections.input.currentState,
                            selectedAnalysis.sections.input.threats,
                            selectedAnalysis.sections.input.suggestions,
                            selectedAnalysis.sections.input.riskRate,
                            <Button
                              type="primary"
                              size="small"
                              loading={applyingSectionKey === "input"}
                              onClick={() => void handleApplySection("input")}
                            >
                              Apply
                            </Button>,
                          )}
                        </Space>
                      </div>
                    </div>
                  </Panel>

                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>3. Request Body</span>} key="requestBody">
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {stringifyJsonBlock(selectedEndpoint?.requestBody || "")}
                      </pre>
                      {renderAnalysisReportGroup(
                        selectedAnalysis.sections.requestBody.currentState,
                        selectedAnalysis.sections.requestBody.threats,
                        selectedAnalysis.sections.requestBody.suggestions,
                        selectedAnalysis.sections.requestBody.riskRate,
                        <Button
                          type="primary"
                          size="small"
                          loading={applyingSectionKey === "requestBody"}
                          onClick={() => void handleApplySection("requestBody")}
                        >
                          Apply
                        </Button>,
                      )}
                    </Space>
                  </Panel>

                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>4. Operation Description</span>} key="operation">
                    <div style={{ padding: 24 }}>
                      <Table
                        pagination={false}
                        rowKey="index"
                        dataSource={(selectedEndpoint?.operation || []).map((item, index) => ({
                          index: index + 1,
                          type: item.type,
                          description: item.description,
                          currentState: selectedAnalysis.sections.operation.rowReports.find((entry) => entry.key === String(index + 1))?.currentState || "",
                          threats: selectedAnalysis.sections.operation.rowReports.find((entry) => entry.key === String(index + 1))?.threats || "",
                          suggestions: selectedAnalysis.sections.operation.rowReports.find((entry) => entry.key === String(index + 1))?.suggestions || "",
                          riskRate: normalizeRiskRate(selectedAnalysis.sections.operation.rowReports.find((entry) => entry.key === String(index + 1))?.riskRate, 25),
                          applyKey: String(index + 1),
                        }))}
                        columns={[
                          { title: "#", dataIndex: "index", width: 80 },
                          {
                            title: "Type",
                            dataIndex: "type",
                            width: 180,
                            render: (value: string) => <Tag>{value}</Tag>,
                          },
                          {
                            title: "Description",
                            dataIndex: "description",
                            width: 420,
                            render: (value: string) => (
                              <div style={{ maxWidth: 420, whiteSpace: "normal", lineHeight: 1.6 }}>
                                {value || "-"}
                              </div>
                            ),
                          },
                          {
                            title: "Analysis Report",
                            dataIndex: "threats",
                            width: 360,
                            render: (_value: string, record: { currentState: string; threats: string; suggestions: string; riskRate: number; applyKey: string }) => (
                              <Space direction="vertical" size={6}>
                                {renderAnalysisReportGroup(
                                  record.currentState,
                                  record.threats,
                                  record.suggestions,
                                  record.riskRate,
                                  <Button
                                    type="primary"
                                    size="small"
                                    loading={applyingRowKey === `operation:${record.applyKey}`}
                                    onClick={() => void handleApplyRow("operation", record.applyKey)}
                                  >
                                    Apply
                                  </Button>,
                                )}
                              </Space>
                            ),
                          },
                        ]}
                      />
                      <div style={{ marginTop: 16 }}>
                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                          {renderAnalysisReportGroup(
                            selectedAnalysis.sections.operation.currentState,
                            selectedAnalysis.sections.operation.threats,
                            selectedAnalysis.sections.operation.suggestions,
                            selectedAnalysis.sections.operation.riskRate,
                            <Button
                              type="primary"
                              size="small"
                              loading={applyingSectionKey === "operation"}
                              onClick={() => void handleApplySection("operation")}
                            >
                              Apply
                            </Button>,
                          )}
                        </Space>
                      </div>
                    </div>
                  </Panel>

                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>5. Output Fields</span>} key="output">
                    <div style={{ padding: 24 }}>
                      <Table
                        pagination={false}
                        rowKey="name"
                        dataSource={(selectedEndpoint?.output || []).map((item, index) => ({
                          index: index + 1,
                          name: item.name,
                          description: item.description,
                          currentState: selectedAnalysis.sections.output.rowReports.find((entry) => entry.key === item.name)?.currentState || "",
                          threats: selectedAnalysis.sections.output.rowReports.find((entry) => entry.key === item.name)?.threats || "",
                          suggestions: selectedAnalysis.sections.output.rowReports.find((entry) => entry.key === item.name)?.suggestions || "",
                          riskRate: normalizeRiskRate(selectedAnalysis.sections.output.rowReports.find((entry) => entry.key === item.name)?.riskRate, 25),
                          applyKey: item.name,
                        }))}
                        columns={[
                          { title: "#", dataIndex: "index", width: 80 },
                          { title: "Name", dataIndex: "name", width: 240 },
                          {
                            title: "Description",
                            dataIndex: "description",
                            width: 420,
                            render: (value: string) => (
                              <div style={{ maxWidth: 420, whiteSpace: "normal", lineHeight: 1.6 }}>
                                {value || "-"}
                              </div>
                            ),
                          },
                          {
                            title: "Analysis Report",
                            dataIndex: "threats",
                            width: 360,
                            render: (_value: string, record: { currentState: string; threats: string; suggestions: string; riskRate: number; applyKey: string }) => (
                              <Space direction="vertical" size={6}>
                                {renderAnalysisReportGroup(
                                  record.currentState,
                                  record.threats,
                                  record.suggestions,
                                  record.riskRate,
                                  <Button
                                    type="primary"
                                    size="small"
                                    loading={applyingRowKey === `output:${record.applyKey}`}
                                    onClick={() => void handleApplyRow("output", record.applyKey)}
                                  >
                                    Apply
                                  </Button>,
                                )}
                              </Space>
                            ),
                          },
                        ]}
                      />
                      <div style={{ marginTop: 16 }}>
                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                          {renderAnalysisReportGroup(
                            selectedAnalysis.sections.output.currentState,
                            selectedAnalysis.sections.output.threats,
                            selectedAnalysis.sections.output.suggestions,
                            selectedAnalysis.sections.output.riskRate,
                            <Button
                              type="primary"
                              size="small"
                              loading={applyingSectionKey === "output"}
                              onClick={() => void handleApplySection("output")}
                            >
                              Apply
                            </Button>,
                          )}
                        </Space>
                      </div>
                    </div>
                  </Panel>

                  <Panel header={<span style={{ fontSize: 16, fontWeight: 700 }}>6. Response Body</span>} key="responseBody">
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {stringifyJsonBlock(selectedEndpoint?.responseBody || "")}
                      </pre>
                      {renderAnalysisReportGroup(
                        selectedAnalysis.sections.responseBody.currentState,
                        selectedAnalysis.sections.responseBody.threats,
                        selectedAnalysis.sections.responseBody.suggestions,
                        selectedAnalysis.sections.responseBody.riskRate,
                        <Button
                          type="primary"
                          size="small"
                          loading={applyingSectionKey === "responseBody"}
                          onClick={() => void handleApplySection("responseBody")}
                        >
                          Apply
                        </Button>,
                      )}
                    </Space>
                  </Panel>
                </Collapse>
              ) : null}
            </>
          ) : !analysesLoading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No saved analyses yet. Run AI analysis to create the first record."
            />
          ) : null}
          </Space>
        </Space>
      </Space>
    </Drawer>
  );
}
