import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  RobotOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { generateVertexJsonPayload } from "@/components/ui-canvas/UICanvasAIDrawer/vertexAIGeminiClient";
import ApiAnalysisReportBlock from "@/components/api-canvas/AnalysisReportBlock";
import { componentTypeLabel, FormActionEventLabel } from "@/hooks/ui-canvas/types";
import useUICanvasDescriptionUpdate from "@/ui-canvas/uic_ui_canvas/hooks/description/useUICanvasDescriptionUpdate";
import type { ISelectedUI, IUACCriterion } from "@/ui-canvas/uic_ui_canvas/types/ISelectedUI.interface";
import type { IUIInput } from "@/ui-canvas/uic_ui_canvas/types/IUIInput.interface";
import { utilBuildDisplayOrderData } from "@/ui-canvas/uic_ui_canvas/utils/utilBuildDisplayOrderData";

const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;

type AnalyzerSectionKey = "description" | "uac" | "input";

interface AnalysisNarrative {
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
}

interface AnalysisRowReport {
  key: string;
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
}

type UIAnalyzerCriterion = IUACCriterion & { description?: string };
type UIAnalyzerInput = IUIInput & {
  description?: string;
  label?: string;
  displayIndex?: string;
  rowNumber?: number;
};

interface UIAnalysisSections {
  description: AnalysisNarrative;
  uac: AnalysisNarrative & { rowReports: AnalysisRowReport[] };
  input: AnalysisNarrative & { rowReports: AnalysisRowReport[] };
}

interface UIAnalysisFinding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  details: string;
  recommendation: string;
  affectedSections: string[];
}

interface UIAnalysisRecord {
  id: string;
  createdAt: string;
  canvasId: string;
  canvasName: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByImage?: string;
  focusPrompt: string;
  summary: string;
  strengths: string[];
  blindSpots: string[];
  findings: UIAnalysisFinding[];
  sections: UIAnalysisSections;
}

interface UICanvasAnalyzerDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedUI: ISelectedUI | null | undefined;
  inputTableData?: UIAnalyzerInput[];
}

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

function normalizeRowReports(items: unknown): AnalysisRowReport[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      return {
        key: normalizeText(record.key || record.name || `row_${index + 1}`),
        currentState: normalizeText(record.currentState || record.status || record.current),
        threats: normalizeText(record.threats || record.risks || record.details),
        suggestions: normalizeText(record.suggestions || record.recommendation),
        riskRate: normalizeRiskRate(record.riskRate || record.riskScore, 40),
      };
    })
    .filter((item) => item.key && (item.currentState || item.threats || item.suggestions));
}

function normalizeAnalysisPayload(payload: unknown, selectedUI: ISelectedUI, focusPrompt: string): UIAnalysisRecord {
  const source = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const sectionSource = (key: AnalyzerSectionKey) =>
    ((source[key] && typeof source[key] === "object" ? source[key] : {}) as Record<string, unknown>);

  // Capture current user data from localStorage
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

  const normalizeSection = (key: AnalyzerSectionKey) => {
    const section = sectionSource(key);
    const narrative = {
      currentState: normalizeText(section.currentState || section.status || section.current || section.summary),
      threats: normalizeText(section.threats || section.risks || section.details),
      suggestions: normalizeText(section.suggestions || section.recommendation),
      riskRate: normalizeRiskRate(section.riskRate || section.riskScore, 35),
    };

    if (key === "uac" || key === "input") {
      return {
        ...narrative,
        rowReports: normalizeRowReports(section.rowReports || section.rows || section.items),
      };
    }

    return narrative;
  };

  const findings = Array.isArray(source.findings)
    ? source.findings.map((item, index) => {
        const record = item as Record<string, unknown>;
        const severity = normalizeText(record.severity).toLowerCase();
        return {
          id: String(record.id || `finding_${index + 1}`),
          title: normalizeText(record.title) || `Finding ${index + 1}`,
          severity: severity === "high" || severity === "medium" || severity === "low" ? severity : "medium",
          details: normalizeText(record.details),
          recommendation: normalizeText(record.recommendation),
          affectedSections: Array.isArray(record.affectedSections)
            ? record.affectedSections.map((entry) => normalizeText(entry)).filter(Boolean)
            : [],
        };
      })
    : [];

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    canvasId: selectedUI.id,
    canvasName: selectedUI.label,
    createdBy: currentUserEmail || "unknown",
    createdByName: currentUserDisplayName || "Unknown User",
    createdByEmail: currentUserEmail || "unknown",
    createdByImage: currentUserPhoto,
    focusPrompt: focusPrompt.trim(),
    summary: normalizeText(source.summary),
    strengths: Array.isArray(source.strengths) ? source.strengths.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    blindSpots: Array.isArray(source.blindSpots) ? source.blindSpots.map((entry) => normalizeText(entry)).filter(Boolean) : [],
    findings,
    sections: {
      description: normalizeSection("description") as UIAnalysisSections["description"],
      uac: normalizeSection("uac") as UIAnalysisSections["uac"],
      input: normalizeSection("input") as UIAnalysisSections["input"],
    },
  };
}

function detectLanguage(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("azerba") || lower.includes("azeri")) return "Azerbaijani";
  if (lower.includes("turkish") || lower.includes("turk")) return "Turkish";
  if (lower.includes("russian")) return "Russian";
  return "English";
}

function buildAnalysisEnvelope(selectedUI: ISelectedUI, prompt: string, orderedInputs: UIAnalyzerInput[]) {
  const language = detectLanguage(prompt);

  return JSON.stringify(
    {
      task: "analyze_ui_canvas",
      instructions: [
        "Return only valid JSON.",
        `Provide all analysis text in ${language}.`,
        "Analyze the UI canvas in exactly three sections: description, uac, input.",
        "Each section must include currentState, threats, suggestions, riskRate.",
        "For uac and input, also return rowReports.",
        "For input rowReports, return exactly one row report for each input row from canvasContext.inputRows, in the same order.",
        "Set each input rowReports key to the input id from canvasContext.inputRows.",
        "For the input section, focus on input descriptions only: clarity, completeness, validation guidance, business meaning, and missing description details.",
        "For input rowReports, currentState, threats, and suggestions must describe the input description text, not the visual field itself.",
        "Return summary, strengths, blindSpots, and findings.",
      ],
      focusPrompt: prompt.trim() || null,
      canvasContext: {
        id: selectedUI.id,
        label: selectedUI.label,
        description: selectedUI.description || "",
        userAcceptanceCriteria: selectedUI.userAcceptanceCriteria || [],
        input: selectedUI.input || {},
        inputRows: orderedInputs.map((item, index) => ({
          key: item.id,
          rowNumber: index + 1,
          displayIndex: item.displayIndex || `${index + 1}`,
          inputName: item.inputName || item.label || item.id,
          componentType: item.componentType || "-",
          cellNo: (item as { cellNo?: string }).cellNo || "",
          description:
            String(item.description || "")
            || Object.values(item.manualDescription || {})[0]?.description
            || "",
        })),
      },
      responseShape: {
        summary: "string",
        strengths: ["string"],
        blindSpots: ["string"],
        findings: [
          {
            id: "string",
            title: "string",
            severity: "high",
            details: "string",
            recommendation: "string",
            affectedSections: ["description"],
          },
        ],
        description: { currentState: "string", threats: "string", suggestions: "string", riskRate: 40 },
        uac: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 40,
          rowReports: [{ key: "string", currentState: "string", threats: "string", suggestions: "string", riskRate: 40 }],
        },
        input: {
          currentState: "string",
          threats: "string",
          suggestions: "string",
          riskRate: 40,
          rowReports: [{ key: "string", currentState: "string", threats: "string", suggestions: "string", riskRate: 40 }],
        },
      },
    },
    null,
    2,
  );
}

function buildSectionApplyEnvelope(
  selectedUI: ISelectedUI,
  sectionKey: AnalyzerSectionKey,
  analysis: UIAnalysisRecord,
) {
  const language = detectLanguage(analysis.focusPrompt || "");

  return JSON.stringify(
    {
      task: "apply_ui_canvas_analysis_section",
      instructions: [
        "Return only valid JSON.",
        `Provide response in ${language}.`,
        "Update only the requested section of the UI canvas.",
        "Apply the analysis recommendations carefully.",
        "Do not modify unrelated sections.",
        ...(sectionKey === "input"
          ? [
              "For input, update input descriptions only.",
              "Do not rename inputs, do not change component types, and do not modify unrelated input properties.",
            ]
          : []),
      ],
      sectionKey,
      focusPrompt: analysis.focusPrompt || null,
      canvasContext: {
        id: selectedUI.id,
        label: selectedUI.label,
        description: selectedUI.description || "",
        userAcceptanceCriteria: selectedUI.userAcceptanceCriteria || [],
        input: selectedUI.input || {},
      },
      sectionAnalysis: analysis.sections[sectionKey],
      findings: analysis.findings.filter((item) => item.affectedSections.includes(sectionKey)),
      responseShape:
        sectionKey === "description"
          ? { description: "string" }
          : sectionKey === "uac"
          ? { userAcceptanceCriteria: [{ id: "string", title: "string", description: "string", taskIds: ["string"] }] }
          : { input: { input_id: { description: "string" } } },
    },
    null,
    2,
  );
}

function buildRowApplyEnvelope(
  selectedUI: ISelectedUI,
  sectionKey: "uac" | "input",
  rowKey: string,
  rowAnalysis: AnalysisRowReport,
) {
  const language = detectLanguage(rowAnalysis.suggestions || rowAnalysis.threats || rowAnalysis.currentState || "");

  return JSON.stringify(
    {
      task: "apply_ui_canvas_analysis_row",
      instructions: [
        "Return only valid JSON.",
        `Provide response in ${language}.`,
        "Update only the requested row in the requested section.",
        "Apply the analysis recommendations carefully.",
        "Do not modify unrelated rows.",
        ...(sectionKey === "input"
          ? [
              "For input rows, update only the input description.",
              "Threats and suggestions must be about the description quality and missing description details.",
              "Do not rename the input and do not change component type.",
            ]
          : []),
      ],
      sectionKey,
      rowKey,
      canvasContext: {
        id: selectedUI.id,
        label: selectedUI.label,
        description: selectedUI.description || "",
        userAcceptanceCriteria: selectedUI.userAcceptanceCriteria || [],
        input: selectedUI.input || {},
      },
      rowAnalysis,
      responseShape:
        sectionKey === "uac"
          ? { criterion: { id: "string", title: "string", description: "string", taskIds: ["string"] } }
          : { inputEntry: { description: "string" } },
    },
    null,
    2,
  );
}

function stringifyCurrentInputs(inputMap: Record<string, IUIInput> | undefined) {
  return utilBuildDisplayOrderData(inputMap || {}).map((item: UIAnalyzerInput, index: number) => ({
    ...item,
    key: item.id,
    rowNumber: index + 1,
    displayIndex: item.displayIndex || `${index + 1}`,
    inputName: item.inputName || item.label || item.id,
    componentType: item.componentType || "-",
    description:
      String(item.description || "")
      || Object.values(item.manualDescription || {})[0]?.description
      || "",
  }));
}

function resolveUACCriterionForReport(
  criteria: UIAnalyzerCriterion[],
  report: AnalysisRowReport,
  index: number,
) {
  return (
    criteria.find((criterion) => criterion.id === report.key)
    || criteria.find((criterion) => criterion.title === report.key)
    || criteria[index]
    || null
  );
}

function resolveInputForReport(
  inputs: UIAnalyzerInput[],
  report: AnalysisRowReport,
  index: number,
) {
  const normalizedKey = normalizeText(report.key).toLowerCase();
  return (
    inputs.find((input) => input.id === report.key)
    || inputs.find((input) => String(input.displayIndex || "").toLowerCase() === normalizedKey)
    || inputs.find((input) => String(input.rowNumber || "").toLowerCase() === normalizedKey)
    || inputs.find((input) => input.inputName === report.key)
    || inputs.find((input) => input.label === report.key)
    || inputs[index]
    || null
  );
}

function getComponentTypeDescription(input: UIAnalyzerInput | null) {
  const componentType = componentTypeLabel[(input?.componentType as keyof typeof componentTypeLabel)] ?? input?.componentType ?? "-";
  const cellNo = String((input as { cellNo?: string } | null)?.cellNo ?? "").trim();

  if (!cellNo) {
    return `Component Type: ${componentType}`;
  }

  return `Component Type: ${componentType} (Cell No: ${cellNo})`;
}

function renderInputDescriptionContent(input: UIAnalyzerInput | null) {
  if (!input) {
    return <Text type="secondary">No input details.</Text>;
  }

  const manualDescriptions = Object.values(((input as Record<string, unknown>).manualDescription || {}) as Record<string, { event?: string; description?: string }>);
  const templateDescriptions = Object.values(((input as Record<string, unknown>).templateDescription || {}) as Record<string, { event?: string; description?: string }>);
  const apiCalls = Object.values(((input as Record<string, unknown>).apiCall || {}) as Record<string, { event?: string; description?: string; api?: string }>);
  const formAction = (((input as Record<string, unknown>).formAction || null) as { action?: string; condition?: string; uiId?: string; uiName?: string } | null);

  return (
    <div style={{ lineHeight: 1.8 }}>
      <div style={{ marginBottom: 12, fontWeight: 500 }}>{getComponentTypeDescription(input)}</div>

      {manualDescriptions.map((item, index) => (
        <div key={`manual-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <Checkbox checked={false} disabled />
          {item.event ? <Tag color="gold">{item.event}</Tag> : null}
          <span>{item.description || "-"}</span>
        </div>
      ))}

      {templateDescriptions.map((item, index) => (
        <div key={`template-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <Checkbox checked={false} disabled />
          {item.event ? <Tag color="blue">{item.event}</Tag> : <Tag color="blue">template</Tag>}
          <span>{item.description || "-"}</span>
        </div>
      ))}

      {apiCalls.map((item, index) => (
        <div key={`api-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <Checkbox checked={false} disabled />
          {item.event ? <Tag color="geekblue">{item.event}</Tag> : <Tag color="geekblue">api</Tag>}
          <span>
            Call API{item.api ? ` ${item.api}` : ""}{item.description ? `, ${item.description}` : ""}
          </span>
        </div>
      ))}

      {formAction?.action ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <Checkbox checked={false} disabled />
          <Tag color="green">{FormActionEventLabel[formAction.action as keyof typeof FormActionEventLabel] ?? formAction.action}</Tag>
          <span>
            {formAction.uiName || formAction.uiId || "-"}
            {formAction.condition ? `, ${formAction.condition}` : ""}
          </span>
        </div>
      ) : null}

      {!manualDescriptions.length && !templateDescriptions.length && !apiCalls.length && !formAction?.action ? (
        <Text type="secondary">No detailed input description.</Text>
      ) : null}
    </div>
  );
}

function getAccuracyColor(riskRate: number) {
  const score = 100 - normalizeRiskRate(riskRate, 25);
  if (score >= 80) return "#52c41a";
  if (score >= 60) return "#1677ff";
  if (score >= 40) return "#faad14";
  return "#ff4d4f";
}

function truncateText(value: string, maxLength = 150) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function splitDescriptionIntoConditions(value: string) {
  const normalized = normalizeText(value)
    .replace(/\r/g, "\n")
    .replace(/[•-]\s+/g, "\n");

  const lineParts = normalized
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const ensureSentence = (text: string) => {
    const trimmed = text.trim().replace(/^["']|["']$/g, "");
    if (!trimmed) return "";
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  };

  const buildSVOSentence = (subject: string, clause: string, contextText = "") => {
    const trimmedClause = clause.trim().replace(/^["']|["']$/g, "");
    const lowerClause = trimmedClause.toLowerCase();
    const normalizedSubject = subject.trim() || "Bu sahə";

    if (!trimmedClause) {
      return "";
    }

    if (lowerClause.includes("minimum")) {
      return ensureSentence(`${normalizedSubject} minimum uzunluq qaydasını tətbiq edir: ${trimmedClause}`);
    }

    if (lowerClause.includes("maksimum") || lowerClause.includes("maximum")) {
      return ensureSentence(`${normalizedSubject} maksimum uzunluq qaydasını tətbiq edir: ${trimmedClause}`);
    }

    if (lowerClause.includes("yalnız") || lowerClause.includes("yalniz")) {
      return ensureSentence(`${normalizedSubject} bu qəbul qaydasını tətbiq edir: ${trimmedClause}`);
    }

    if (lowerClause.includes("format")) {
      return ensureSentence(`${normalizedSubject} bu format qaydasını tətbiq edir: ${trimmedClause}`);
    }

    if (lowerClause.includes("required") || lowerClause.includes("mandatory") || lowerClause.includes("məcburi") || lowerClause.includes("mecburi")) {
      return ensureSentence(`${normalizedSubject} məcburilik qaydasını tətbiq edir: ${trimmedClause}`);
    }

    if (contextText.toLowerCase().includes("validasiya") || contextText.toLowerCase().includes("validation")) {
      return ensureSentence(`${normalizedSubject} bu validasiya qaydasını tətbiq edir: ${trimmedClause}`);
    }

    return ensureSentence(`${normalizedSubject} bu davranışı yerinə yetirir: ${trimmedClause}`);
  };

  const splitClauseByValidationRules = (part: string) => {
    const trimmedPart = part.trim();
    const parenMatch = trimmedPart.match(/\(([^)]+)\)/);
    const beforeParen = trimmedPart.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
    const lowerBeforeParen = beforeParen.toLowerCase();

    const subjectMatch = beforeParen.match(/^(.+?)\s+üçün\b/i) || beforeParen.match(/^(.+?)\s+for\b/i);
    const subjectPrefix = subjectMatch ? `${subjectMatch[1].trim()} sahəsi` : "Bu sahə";

    const results: string[] = [];

    if (beforeParen) {
      results.push(buildSVOSentence(subjectPrefix, beforeParen, beforeParen));
    }

    if (parenMatch?.[1]) {
      const clauses = parenMatch[1]
        .split(/,\s*|;\s*|\s+və\s+|\s+ve\s+|\s+and\s+/iu)
        .map((entry) => entry.replace(/^məsələn[:,]?\s*/iu, "").replace(/^meselen[:,]?\s*/iu, "").trim())
        .filter(Boolean);

      clauses.forEach((clause) => {
        results.push(buildSVOSentence(subjectPrefix, clause, beforeParen));
      });
    }

    return results.filter(Boolean);
  };

  const sentenceParts = lineParts.flatMap((part) =>
    part
      .split(/(?<=[.!?])\s+(?=[A-ZA-ZƏÖÜÇŞĞİI])/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .flatMap(splitClauseByValidationRules),
  );

  return Array.from(new Set(sentenceParts));
}

function AnalysisReportBlock({
  currentState,
  threats,
  suggestions,
  riskRate,
  extra,
}: {
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
  extra?: React.ReactNode;
}) {
  const color = getAccuracyColor(riskRate);
  const accuracyScore = Math.max(0, 100 - normalizeRiskRate(riskRate, 25));

  return (
    <div style={{ 
      background: "#fff", 
      border: "1px solid #f0f0f0", 
      borderRadius: 8,
      overflow: "hidden"
    }}>
      <div style={{ 
        background: color + "20", 
        padding: "12px 16px", 
        borderBottom: `3px solid ${color}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <Text strong style={{ color }}>ANALYSIS REPORT</Text>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          background: color + "15",
          borderRadius: 4,
          color,
          fontSize: 12,
          fontWeight: 600
        }}>
          <span style={{ fontSize: 10 }}>●</span>
          Accuracy Level: {accuracyScore}%
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {currentState && (
            <div>
              <Text type="secondary" strong style={{ color: "#595959", fontSize: 12 }}>CURRENT STATUS</Text>
              <Paragraph style={{ marginBottom: 0, marginTop: 4, whiteSpace: "pre-wrap", color: "#262626" }}>
                {currentState}
              </Paragraph>
            </div>
          )}

          {threats && (
            <div>
              <Text type="secondary" strong style={{ color: "#d46a6a", fontSize: 12 }}>RISKS / THREATS</Text>
              <Paragraph style={{ marginBottom: 0, marginTop: 4, whiteSpace: "pre-wrap", color: "#262626" }}>
                {threats}
              </Paragraph>
            </div>
          )}

          {suggestions && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <Text type="secondary" strong style={{ color: "#52c41a", fontSize: 12 }}>SUGGESTIONS</Text>
              </div>
              <Paragraph style={{ marginBottom: 0, marginTop: 4, whiteSpace: "pre-wrap", color: "#262626" }}>
                {suggestions}
              </Paragraph>
              {extra ? (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  {extra}
                </div>
              ) : null}
            </div>
          )}
        </Space>
      </div>
    </div>
  );
}

function AnalysisBlock({
  title,
  report,
  action,
}: {
  title: string;
  report: AnalysisNarrative;
  action?: React.ReactNode;
}) {
  const color = getAccuracyColor(report.riskRate);

  return (
    <Card size="small" style={{ borderRadius: 12 }}>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <Text strong>{title}</Text>
          <Space size="middle">
            <Progress
              type="circle"
              size={44}
              percent={Math.max(0, 100 - normalizeRiskRate(report.riskRate, 25))}
              strokeColor={color}
              format={(value) => `${value}%`}
            />
            {action}
          </Space>
        </div>
        <div>
          <Text type="secondary">Current State</Text>
          <Paragraph style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>{report.currentState || "-"}</Paragraph>
        </div>
        <div>
          <Text type="secondary">Threats</Text>
          <Paragraph style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>{report.threats || "-"}</Paragraph>
        </div>
        <div>
          <Text type="secondary">Suggestions</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{report.suggestions || "-"}</Paragraph>
        </div>
      </Space>
    </Card>
  );
}

export default function UICanvasAnalyzerDrawer({
  open,
  onClose,
  selectedUI,
  inputTableData = [],
}: UICanvasAnalyzerDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<UIAnalysisRecord[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>(EMPTY_ANALYSIS_OPTION);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [applyingRowKey, setApplyingRowKey] = useState<string | null>(null);
  const [previewCriterion, setPreviewCriterion] = useState<UIAnalyzerCriterion | null>(null);
  const [previewInput, setPreviewInput] = useState<UIAnalyzerInput | null>(null);
  const { updateUICanvasField } = useUICanvasDescriptionUpdate({ selectedUICanvasId: selectedUI?.id });

  const selectedAnalysis = useMemo(
    () => analyses.find((item) => item.id === selectedAnalysisId) || analyses[0] || null,
    [analyses, selectedAnalysisId],
  );
  const orderedInputRows = useMemo(
    () =>
      Array.isArray(inputTableData) && inputTableData.length
        ? inputTableData.map((item, index) => ({
            ...item,
            key: item.id,
            rowNumber: index + 1,
            displayIndex: item.displayIndex || `${index + 1}`,
            inputName: item.inputName || item.label || item.id,
            componentType: item.componentType || "-",
            description:
              String(item.description || "")
              || Object.values(item.manualDescription || {})[0]?.description
              || "",
          }))
        : stringifyCurrentInputs(selectedUI?.input),
    [inputTableData, selectedUI?.input],
  );

  const appendInputManualDescription = async (inputId: string, nextDescription: string) => {
    if (!selectedUI?.id || !inputId) {
      throw new Error("UI canvas or input id is missing.");
    }

    const descriptionParts = splitDescriptionIntoConditions(nextDescription);
    if (!descriptionParts.length) {
      return false;
    }

    const uiCanvasDocRef = doc(db, "ui_canvas", selectedUI.id);
    const docSnap = await getDoc(uiCanvasDocRef);

    if (!docSnap.exists()) {
      throw new Error("UI Canvas document not found.");
    }

    const canvasData = docSnap.data() || {};
    const currentInputMap = (canvasData.input?.[selectedUI.id] || {}) as Record<string, Record<string, unknown>>;
    const currentInputItem = (currentInputMap[inputId] || {}) as Record<string, unknown>;
    const existingManualDescription = ((currentInputItem.manualDescription || {}) as Record<string, Record<string, unknown>>);
    const existingDescriptions = new Set(
      Object.values(existingManualDescription)
        .map((item) => normalizeText((item as { description?: string }).description))
        .filter(Boolean),
    );
    const baseInputName = String(currentInputItem.inputName || currentInputItem.label || inputId);
    const updatedManualDescription = { ...existingManualDescription };
    let nextIndex = Object.keys(existingManualDescription).length + 1;

    descriptionParts.forEach((descriptionPart) => {
      if (existingDescriptions.has(descriptionPart)) {
        return;
      }

      const manualDescriptionId = `${inputId}-ai-${Date.now()}-${nextIndex}`;
      updatedManualDescription[manualDescriptionId] = {
        description: descriptionPart,
        uiName: selectedUI.label || "",
        id: manualDescriptionId,
        event: "",
        uiId: selectedUI.id,
        inputName: baseInputName,
        inputId,
      };
      nextIndex += 1;
    });

    if (Object.keys(updatedManualDescription).length === Object.keys(existingManualDescription).length) {
      return false;
    }

    await updateDoc(uiCanvasDocRef, {
      [`input.${selectedUI.id}.${inputId}.manualDescription`]: updatedManualDescription,
      updatedAt: serverTimestamp(),
    });

    return true;
  };

  const loadAnalyses = async () => {
    if (!selectedUI?.id) {
      setAnalyses([]);
      setSelectedAnalysisId(EMPTY_ANALYSIS_OPTION);
      return;
    }

    setAnalysesLoading(true);

    try {
      const analysisRef = doc(db, "ui_canvas_analysis", selectedUI.id);
      const snap = await getDoc(analysisRef);
      if (!snap.exists()) {
        setAnalyses([]);
        setSelectedAnalysisId(EMPTY_ANALYSIS_OPTION);
        return;
      }

      const rawAnalyses = Array.isArray(snap.data()?.allAnalyses) ? snap.data()?.allAnalyses : [];
      const normalizedAnalyses = rawAnalyses as UIAnalysisRecord[];
      setAnalyses(normalizedAnalyses);
      setSelectedAnalysisId(normalizedAnalyses[0]?.id || EMPTY_ANALYSIS_OPTION);
    } catch (analysisError) {
      console.error(analysisError);
      const errorCode = (analysisError as { code?: string })?.code;
      setAnalyses([]);
      setSelectedAnalysisId(EMPTY_ANALYSIS_OPTION);

      if (errorCode === "permission-denied" || errorCode === "unauthenticated") {
        message.warning("Analysis history is unavailable for this account. You can still run a new analysis.");
        return;
      }

      message.error("Failed to load analysis history.");
    } finally {
      setAnalysesLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadAnalyses();
    }
  }, [open, selectedUI?.id]);

  const saveAnalysisHistory = async (record: UIAnalysisRecord) => {
    if (!selectedUI?.id) return;

    const analysisRef = doc(db, "ui_canvas_analysis", selectedUI.id);
    const nextAnalyses = [record, ...analyses].slice(0, 20);

    await setDoc(
      analysisRef,
      {
        canvasId: selectedUI.id,
        canvasName: selectedUI.label,
        updatedAt: serverTimestamp(),
        allAnalyses: nextAnalyses,
      },
      { merge: true },
    );

    setAnalyses(nextAnalyses);
    setSelectedAnalysisId(record.id);
  };

  const handleAnalyze = async () => {
    if (!selectedUI?.id) {
      message.warning("Select a UI canvas first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateVertexJsonPayload(
        buildAnalysisEnvelope(selectedUI, prompt, orderedInputRows),
        "Return only valid JSON for a UI canvas analysis.",
      );

      const analysisRecord = normalizeAnalysisPayload(response, selectedUI, prompt);
      await saveAnalysisHistory(analysisRecord);
      message.success("UI canvas analysis saved.");
    } catch (analysisError) {
      console.error(analysisError);
      const nextError = analysisError instanceof Error ? analysisError.message : "Analysis failed.";
      setError(nextError);
      message.error("UI analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!selectedUI?.id) return;

    const nextAnalyses = analyses.filter((item) => item.id !== analysisId);
    try {
      await updateDoc(doc(db, "ui_canvas_analysis", selectedUI.id), {
        allAnalyses: nextAnalyses,
        updatedAt: serverTimestamp(),
      });
      setAnalyses(nextAnalyses);
      setSelectedAnalysisId(nextAnalyses[0]?.id || EMPTY_ANALYSIS_OPTION);
      message.success("Analysis deleted.");
    } catch (deleteError) {
      console.error(deleteError);
      message.error("Failed to delete analysis.");
    }
  };

  const handleApplySection = async (sectionKey: AnalyzerSectionKey) => {
    if (!selectedUI || !selectedAnalysis) return;

    setApplyingKey(sectionKey);
    try {
      const response = await generateVertexJsonPayload(
        buildSectionApplyEnvelope(selectedUI, sectionKey, selectedAnalysis),
        "Return only valid JSON for a UI canvas section update.",
      );

      if (sectionKey === "description") {
        const nextDescription = normalizeText((response as Record<string, unknown>)?.description);
        await updateUICanvasField("description", nextDescription);
      }

      if (sectionKey === "uac") {
        const responseRecord = (response as Record<string, unknown>) || {};
        const nestedUacRecord =
          responseRecord.uac && typeof responseRecord.uac === "object" && !Array.isArray(responseRecord.uac)
            ? (responseRecord.uac as Record<string, unknown>)
            : null;

        const nextUACSource =
          (Array.isArray(responseRecord.userAcceptanceCriteria) && responseRecord.userAcceptanceCriteria)
          || (Array.isArray(responseRecord.criteria) && responseRecord.criteria)
          || (Array.isArray(responseRecord.uac) && responseRecord.uac)
          || (Array.isArray(nestedUacRecord?.userAcceptanceCriteria) && nestedUacRecord?.userAcceptanceCriteria)
          || (Array.isArray(nestedUacRecord?.criteria) && nestedUacRecord?.criteria)
          || [];

        if (!Array.isArray(nextUACSource) || !nextUACSource.length) {
          throw new Error("AI did not return a valid UAC list.");
        }

        const normalizedUAC = (nextUACSource as Record<string, unknown>[]).map((item, index) => ({
          id: String(item.id || `${selectedUI.id}_uac_${index + 1}`),
          title: normalizeText(item.title) || `Criterion ${index + 1}`,
          description: normalizeText(item.description),
          taskIds: Array.isArray(item.taskIds) ? item.taskIds.map((entry) => String(entry)) : [],
        }));

        await updateUICanvasField("userAcceptanceCriteria", normalizedUAC);
      }

      if (sectionKey === "input") {
        const nextInput = (response as Record<string, unknown>)?.input;
        if (!nextInput || typeof nextInput !== "object" || Array.isArray(nextInput)) {
          throw new Error("AI did not return a valid input object.");
        }
        const currentInput = selectedUI.input || {};
        for (const key of Object.keys(currentInput)) {
          const nextEntry = (nextInput as Record<string, unknown>)[key] as Record<string, unknown> | undefined;
          const nextDescription =
            nextEntry && typeof nextEntry === "object" && !Array.isArray(nextEntry)
              ? normalizeText(nextEntry.description)
              : "";

          if (nextDescription) {
            await appendInputManualDescription(key, nextDescription);
          }
        }
      }

      message.success(`Applied ${sectionKey} recommendations.`);
    } catch (applyError) {
      console.error(applyError);
      message.error(`Failed to apply ${sectionKey}.`);
    } finally {
      setApplyingKey(null);
    }
  };

  const handleApplyRow = async (sectionKey: "uac" | "input", rowReport: AnalysisRowReport, rowIndex?: number) => {
    if (!selectedUI || !selectedAnalysis) return;

    const actionKey = `${sectionKey}:${rowReport.key}`;
    setApplyingRowKey(actionKey);

    try {
      if (sectionKey === "uac") {
        const response = await generateVertexJsonPayload(
          buildRowApplyEnvelope(selectedUI, sectionKey, rowReport.key, rowReport),
          "Return only valid JSON for a UI canvas row update.",
        );
        const nextCriterion = ((response as Record<string, unknown>)?.criterion || {}) as Record<string, unknown>;
        const currentCriteria = Array.isArray(selectedUI.userAcceptanceCriteria) ? selectedUI.userAcceptanceCriteria : [];
        const updatedCriteria = currentCriteria.map((criterion, index) => {
          const matches =
            index === rowIndex
            || criterion.id === rowReport.key
            || normalizeText(criterion.title) === normalizeText(rowReport.key)
            || `Criterion ${index + 1}` === rowReport.key;

          if (!matches) {
            return criterion;
          }

          return {
            ...criterion,
            id: String(nextCriterion.id || criterion.id || `${selectedUI.id}_uac_${index + 1}`),
            title: normalizeText(nextCriterion.title) || criterion.title,
            description: normalizeText(nextCriterion.description) || normalizeText(criterion.description),
            taskIds: Array.isArray(nextCriterion.taskIds)
              ? nextCriterion.taskIds.map((entry) => String(entry))
              : criterion.taskIds || [],
          };
        });

        await updateUICanvasField("userAcceptanceCriteria", updatedCriteria);
      }

      if (sectionKey === "input") {
        const currentInput = selectedUI.input || {};
        const targetKey = Object.keys(currentInput).find((key) => {
          const item = currentInput[key];
          return key === rowReport.key || item?.id === rowReport.key || item?.inputName === rowReport.key || item?.label === rowReport.key;
        });

        if (!targetKey) {
          throw new Error("Target input row not found.");
        }
        const nextDescription =
          normalizeText(rowReport.suggestions)
          || normalizeText(rowReport.currentState);

        if (!nextDescription) {
          throw new Error("No input description text was produced for this row.");
        }

        await appendInputManualDescription(targetKey, nextDescription);
      }

      message.success(`Applied ${sectionKey} row recommendations.`);
    } catch (applyError) {
      console.error(applyError);
      message.error(`Failed to apply ${sectionKey} row.`);
    } finally {
      setApplyingRowKey(null);
    }
  };

  const uacRows = useMemo(() => {
    const criteria = (selectedUI?.userAcceptanceCriteria || []) as UIAnalyzerCriterion[];

    return selectedAnalysis?.sections.uac.rowReports.map((report, index) => ({
      ...report,
      criterion: resolveUACCriterionForReport(criteria, report, index),
    })) || [];
  }, [selectedAnalysis, selectedUI?.userAcceptanceCriteria]);
  const inputAnalysisRows = useMemo(() => {
    const rowReports = selectedAnalysis?.sections.input.rowReports || [];

    return orderedInputRows.map((inputItem, index) => {
      const matchedReport =
        rowReports.find((report) => report.key === inputItem.id)
        || rowReports.find((report) => normalizeText(report.key).toLowerCase() === normalizeText(inputItem.displayIndex).toLowerCase())
        || rowReports.find((report) => normalizeText(report.key).toLowerCase() === normalizeText(inputItem.inputName).toLowerCase())
        || rowReports[index]
        || null;

      return {
        key: inputItem.id,
        inputItem,
        currentState: matchedReport?.currentState || "",
        threats: matchedReport?.threats || "",
        suggestions: matchedReport?.suggestions || "",
        riskRate: matchedReport?.riskRate ?? 35,
      };
    });
  }, [orderedInputRows, selectedAnalysis]);

  return (
    <Drawer
      title={
        <Space>
          <SearchOutlined />
          <span>UI Canvas AI Analyzer</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width="90%"
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card size="small">
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <Title level={5} style={{ marginBottom: 4 }}>Analysis Prompt</Title>
                <Text type="secondary">Canvas: {selectedUI?.label || "No UI canvas selected"}</Text>
              </div>
              <Button type="primary" icon={<RobotOutlined />} onClick={() => void handleAnalyze()} loading={loading} disabled={!selectedUI?.id}>
                Run Analysis
              </Button>
            </div>

            <Input.TextArea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Review this UI canvas for missing validation, weak UAC coverage, and inconsistent inputs."
            />

            <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
              <Text strong>Open analysis</Text>
              <Select
                size="large"
                value={selectedAnalysisId}
                onChange={setSelectedAnalysisId}
                style={{ width: "fit-content", minWidth: 420, maxWidth: 760, height: 56, flex: "0 1 auto" }}
                placeholder="Choose date of action"
                optionLabelProp="label"
                disabled={!analyses.length}
              >
                <Select.Option key={EMPTY_ANALYSIS_OPTION} value={EMPTY_ANALYSIS_OPTION} label="Choose date of action">
                  Choose date of action
                </Select.Option>
                {analyses.map((item) => (
                  <Select.Option
                    key={item.id}
                    value={item.id}
                    label={
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Avatar size="small" src={item.createdByImage || undefined}>
                          {(item.createdByName || item.createdByEmail || "U").charAt(0).toUpperCase()}
                        </Avatar>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <Text strong ellipsis style={{ lineHeight: 1.3 }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </Text>
                          <Text type="secondary" ellipsis style={{ fontSize: 12, lineHeight: 1.3 }}>
                            {item.createdByName || "Unknown User"} {item.createdByEmail ? `• ${item.createdByEmail}` : ""}
                          </Text>
                        </div>
                      </div>
                    }
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
                  </Select.Option>
                ))}
              </Select>
              <Popconfirm
                title="Delete analysis?"
                description="This will permanently delete the selected analysis record."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => selectedAnalysis ? handleDeleteAnalysis(selectedAnalysis.id) : undefined}
                disabled={!selectedAnalysis}
              >
                <Button danger icon={<DeleteOutlined />} disabled={!selectedAnalysis} style={{ height: 56 }}>
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </Space>
        </Card>

        {error ? (
          <Alert type="error" showIcon message="AI analysis error" description={error} />
        ) : null}

        {loading ? (
          <Card>
            <div style={{ display: "grid", placeItems: "center", minHeight: 260 }}>
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">Analyzing UI canvas...</Text>
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

          {analysesLoading ? (
            <Card size="small" style={{ background: "#fafcff", border: "1px solid #d6e4ff" }}>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text strong>Loading analysis history...</Text>
                <Progress percent={85} status="active" showInfo={false} strokeColor="#1677ff" />
                <Text type="secondary">Saved analyses are being loaded for this UI canvas.</Text>
              </Space>
            </Card>
          ) : null}
        </Space>

        {!loading && selectedAnalysis ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {selectedAnalysis.focusPrompt && (
              <Card 
                size="small" 
                style={{ background: "#f5f7fa", border: "1px solid #d9d9d9" }}
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
            
            <Collapse defaultActiveKey={["description", "uac", "input"]} style={{ background: "transparent" }}>
              <Panel
                header="1. Description"
                key="description"
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div style={{ padding: 12, border: "1px solid #f0f0f0", borderRadius: 8, background: "#fff" }}>
                    <Text>{truncateText(selectedUI?.description || "No description", 150) || "No description"}</Text>
                  </div>
                  <ApiAnalysisReportBlock
                    currentState={selectedAnalysis.sections.description.currentState}
                    threats={selectedAnalysis.sections.description.threats}
                    suggestions={selectedAnalysis.sections.description.suggestions}
                    riskRate={selectedAnalysis.sections.description.riskRate}
                    extra={
                      <Button
                        type="primary"
                        loading={applyingKey === "description"}
                        onClick={() => void handleApplySection("description")}
                      >
                        Apply
                      </Button>
                    }
                  />
                </Space>
              </Panel>

              <Panel
                header="2. UAC"
                key="uac"
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {selectedAnalysis.sections.uac.rowReports.length ? (
                    <Table
                      pagination={false}
                      size="small"
                      rowKey="key"
                      dataSource={uacRows}
                      bordered
                      scroll={{ x: 780 }}
                      columns={[
                        { 
                          title: "#", 
                          render: (_, __, index) => index + 1,
                          width: 50
                        },
                        { 
                          title: "Criterion", 
                          dataIndex: "criterion", 
                          key: "key", 
                          width: 320,
                          render: (criterion: UIAnalyzerCriterion | null, record: AnalysisRowReport & { criterion?: UIAnalyzerCriterion | null }) => (
                            <Button
                              type="link"
                              style={{
                                padding: 0,
                                height: "auto",
                                textAlign: "left",
                                whiteSpace: "normal",
                                lineHeight: 1.6,
                              }}
                              onClick={() => criterion ? setPreviewCriterion(criterion) : undefined}
                            >
                              {criterion?.title || record.key}
                            </Button>
                          ),
                        },
                        {
                          title: "Analysis Report",
                          key: "analysis",
                          width: 520,
                          render: (_, record: AnalysisRowReport, index: number) => (
                            <ApiAnalysisReportBlock
                              currentState={record.currentState}
                              threats={record.threats}
                              suggestions={record.suggestions}
                              riskRate={record.riskRate}
                              extra={
                                <Button
                                  type="primary"
                                  loading={applyingRowKey === `uac:${record.key}`}
                                  onClick={() => void handleApplyRow("uac", record, index)}
                                >
                                  Apply
                                </Button>
                              }
                            />
                          )
                        },
                      ]}
                    />
                  ) : null}

                  {selectedAnalysis.sections.uac.currentState || selectedAnalysis.sections.uac.threats ? (
                    <>
                      <Divider style={{ margin: "16px 0", borderColor: "#f0f0f0" }} />
                      <Text strong style={{ fontSize: 14, color: "#262626" }}>Overall UAC Analysis</Text>
                      <ApiAnalysisReportBlock
                        currentState={selectedAnalysis.sections.uac.currentState}
                        threats={selectedAnalysis.sections.uac.threats}
                        suggestions={selectedAnalysis.sections.uac.suggestions}
                        riskRate={selectedAnalysis.sections.uac.riskRate}
                        extra={
                          <Button
                            type="primary"
                            loading={applyingKey === "uac"}
                            onClick={() => void handleApplySection("uac")}
                          >
                            Apply
                          </Button>
                        }
                      />
                    </>
                  ) : null}
                </Space>
              </Panel>

              <Panel
                header="3. Input and Description"
                key="input"
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {inputAnalysisRows.length ? (
                    <Table
                      pagination={false}
                      size="small"
                      rowKey="key"
                      dataSource={inputAnalysisRows}
                      bordered
                      scroll={{ x: 780 }}
                      columns={[
                        { 
                          title: "#", 
                          render: (_, __, index) => index + 1,
                          width: 50
                        },
                        { 
                          title: "Input", 
                          dataIndex: "inputItem", 
                          key: "key", 
                          width: 240,
                          render: (inputItem: UIAnalyzerInput | null, record: AnalysisRowReport & { inputItem?: UIAnalyzerInput | null }) => (
                            <Button
                              type="link"
                              style={{
                                padding: 0,
                                height: "auto",
                                textAlign: "left",
                                whiteSpace: "normal",
                                lineHeight: 1.6,
                              }}
                              onClick={() => inputItem ? setPreviewInput(inputItem) : undefined}
                            >
                              {inputItem?.inputName || inputItem?.label || record.key}
                            </Button>
                          ),
                        },
                        {
                          title: "Analysis Report",
                          key: "analysis",
                          width: 520,
                          render: (_, record: AnalysisRowReport) => (
                            <ApiAnalysisReportBlock
                              currentState={record.currentState}
                              threats={record.threats}
                              suggestions={record.suggestions}
                              riskRate={record.riskRate}
                              extra={
                                <Button
                                  type="primary"
                                  loading={applyingRowKey === `input:${record.key}`}
                                  onClick={() => void handleApplyRow("input", record)}
                                >
                                  Apply
                                </Button>
                              }
                            />
                          )
                        },
                      ]}
                    />
                  ) : null}

                  {selectedAnalysis.sections.input.currentState || selectedAnalysis.sections.input.threats ? (
                    <>
                      <Divider style={{ margin: "16px 0", borderColor: "#f0f0f0" }} />
                      <Text strong style={{ fontSize: 14, color: "#262626" }}>Overall Input Analysis</Text>
                      <ApiAnalysisReportBlock
                        currentState={selectedAnalysis.sections.input.currentState}
                        threats={selectedAnalysis.sections.input.threats}
                        suggestions={selectedAnalysis.sections.input.suggestions}
                        riskRate={selectedAnalysis.sections.input.riskRate}
                        extra={
                          <Button
                            type="primary"
                            loading={applyingKey === "input"}
                            onClick={() => void handleApplySection("input")}
                          >
                            Apply
                          </Button>
                        }
                      />
                    </>
                  ) : null}
                </Space>
              </Panel>

            </Collapse>

          </Space>
        ) : null}

        {!loading && !selectedAnalysis ? (
          <Card>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No saved analyses yet. Run AI analysis to create the first record." />
          </Card>
        ) : null}
      </Space>

      <Modal
        title="Criterion Details"
        open={Boolean(previewCriterion)}
        onCancel={() => setPreviewCriterion(null)}
        footer={null}
        width={900}
        style={{ top: 24 }}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Criteria</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{previewCriterion?.title || "-"}</Text>
            </div>
          </div>

          <div>
            <Text strong>Description</Text>
            <div style={{ marginTop: 8 }}>
              {previewCriterion?.description ? (
                <div
                  style={{
                    padding: 12,
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    background: "#fafafa",
                  }}
                >
                  <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {previewCriterion.description}
                  </Text>
                </div>
              ) : (
                <Text type="secondary">No detailed description.</Text>
              )}
            </div>
          </div>

          <div>
            <Text strong>Task IDs</Text>
            <div style={{ marginTop: 8 }}>
              {previewCriterion?.taskIds?.length ? (
                <Space wrap>
                  {previewCriterion.taskIds.map((taskId) => (
                    <Tag key={taskId}>{taskId}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No related tasks.</Text>
              )}
            </div>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Input Details"
        open={Boolean(previewInput)}
        onCancel={() => setPreviewInput(null)}
        footer={null}
        width={840}
        style={{ top: 24 }}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Input Name</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{previewInput?.inputName || previewInput?.label || "-"}</Text>
            </div>
          </div>

          <div>
            <Text strong>Input ID</Text>
            <div style={{ marginTop: 8 }}>
              <Text code>{previewInput?.id || "-"}</Text>
            </div>
          </div>

          <div>
            <Text strong>Description</Text>
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  padding: 12,
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  background: "#fafafa",
                }}
              >
                {renderInputDescriptionContent(previewInput)}
              </div>
            </div>
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
}
