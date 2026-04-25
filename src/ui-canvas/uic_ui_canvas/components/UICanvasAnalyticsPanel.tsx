import React, { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Button, Card, Col, Collapse, Empty, Input, Progress, Row, Space, Spin, Table, Typography, message } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileSearchOutlined,
  InfoCircleFilled,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import UICanvasPreviewDrawer from "@/components/ui-canvas/UICanvasPreviewDrawer";
import { generateVertexJsonPayload } from "@/components/ui-canvas/UICanvasAIDrawer/vertexAIGeminiClient";
import {
  calculateUICanvasBacklogMetrics,
  mergeUICanvasAnalytics,
  syncUICanvasBacklogMetrics,
  type UICanvasAnalytics,
} from "../services/uICanvasAnalyticsService";
import type { UICanvasData } from "../types/UICanvasData.interface";

const { Text } = Typography;

interface UICanvasAnalyticsPanelProps {
  selectedUICanvasId: string | null;
  selectedUI: UICanvasData | null;
  uiList?: UICanvasData[];
  projectId?: string;
  readOnly?: boolean;
  fixedView?: AnalyticsViewKey;
}

type AnalyticsActionKey =
  | "estimatedHours"
  | "estimatedCodeLines"
  | "alignment";

type AnalyticsViewKey =
  | "general"
  | "reports"
  | "assignee";

type AssigneeAnalyticsRow = {
  key: string;
  assigneeId: string;
  assigneeName: string;
  assigneePhotoUrl?: string;
  issueCount: number;
  canvasCount: number;
  spentHours: number;
  estimatedHours: number;
  developedCodeLines: number;
};

const EMPTY_ANALYTICS: UICanvasAnalytics = {
  estimatedHours: null,
  estimatedHoursLastEstimatedAt: null,
  spentHours: 0,
  estimatedCodeLines: null,
  estimatedCodeLinesLastEstimatedAt: null,
  developedCodeLines: 0,
  businessRequirementsAlignmentRate: null,
  businessRequirementsAlignmentLastCheckedAt: null,
  businessRequirementsAlignmentNote: "",
};

const normalizeAnalytics = (value: any): UICanvasAnalytics => ({
  estimatedHours: value?.estimatedHours ?? null,
  estimatedHoursLastEstimatedAt: value?.estimatedHoursLastEstimatedAt || null,
  spentHours: Number.isFinite(Number(value?.spentHours)) ? Number(value?.spentHours) : 0,
  estimatedCodeLines: value?.estimatedCodeLines ?? null,
  estimatedCodeLinesLastEstimatedAt: value?.estimatedCodeLinesLastEstimatedAt || null,
  developedCodeLines: Number.isFinite(Number(value?.developedCodeLines)) ? Number(value?.developedCodeLines) : 0,
  businessRequirementsAlignmentRate: value?.businessRequirementsAlignmentRate ?? null,
  businessRequirementsAlignmentLastCheckedAt: value?.businessRequirementsAlignmentLastCheckedAt || null,
  businessRequirementsAlignmentNote: value?.businessRequirementsAlignmentNote || "",
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const roundQuarter = (value: number) => Math.round(value * 4) / 4;

const roundMetric = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const resolveIssueCanvasId = (issue: any) =>
  String(issue?.uiCanvasId || issue?.ui_canvas_id || issue?.uiId || issue?.uiCanvas || "").trim();

const getMetricDisplayValue = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `${value}${suffix}`;
};

const buildEstimateHoursPrompt = (selectedUI: UICanvasData) =>
  JSON.stringify(
    {
      task: "estimate_ui_canvas_hours",
      instructions: [
        "Return only valid JSON.",
        "Estimate approximate implementation hours for this UI canvas.",
        "Consider UI complexity, number of inputs, business logic hints, descriptions, UAC, integrations, and likely frontend effort.",
        "Return estimatedHours as a positive number with at most 2 decimal places.",
        "Return concise summary and assumptions arrays.",
      ],
      canvas: selectedUI,
      responseShape: {
        estimatedHours: 24,
        summary: "string",
        assumptions: ["string"],
      },
    },
    null,
    2,
  );

const buildEstimateCodeLinesPrompt = (selectedUI: UICanvasData) =>
  JSON.stringify(
    {
      task: "estimate_ui_canvas_code_lines",
      instructions: [
        "Return only valid JSON.",
        "Estimate approximate developed code lines for implementing this UI canvas.",
        "Consider UI layout, components, form handling, validation, state, API integrations, drawer/modal complexity, and expected React/TypeScript structure.",
        "Return estimatedCodeLines as a positive integer.",
        "Return concise summary and assumptions arrays.",
      ],
      canvas: selectedUI,
      responseShape: {
        estimatedCodeLines: 1200,
        summary: "string",
        assumptions: ["string"],
      },
    },
    null,
    2,
  );

const buildAlignmentPrompt = (
  selectedUI: UICanvasData,
  backlogIssues: any[],
) =>
  JSON.stringify(
    {
      task: "check_ui_canvas_business_requirement_alignment",
      instructions: [
        "Return only valid JSON.",
        "Assess how well the linked backlog implementation aligns with the UI canvas business requirements.",
        "Use the UI canvas JSON as the source of business intent.",
        "Use the backlog issues and their linked GitHub commit metadata as the source of developed implementation evidence.",
        "Return alignmentRate as an integer from 0 to 100.",
        "Return a short note explaining the score.",
        "Mention whether the evidence is strong or limited based on available linked commits.",
      ],
      canvas: selectedUI,
      backlogEvidence: backlogIssues.map((issue: any) => ({
        id: issue.id,
        no: issue.no,
        title: issue.title || issue.summary || "",
        description: issue.description || "",
        spentHours: issue.sh || 0,
        estimatedHours: issue.eh || 0,
        codeLine: issue.codeLine || 0,
        commitSha: issue.commitSha || "",
        commitMessage: issue.commitMessage || "",
        commitAuthor: issue.commitAuthor || "",
        commitDate: issue.commitDate || "",
        commitUrl: issue.commitUrl || "",
        githubData: issue.githubData || null,
      })),
      responseShape: {
        alignmentRate: 78,
        note: "string",
        strengths: ["string"],
        gaps: ["string"],
      },
    },
    null,
    2,
  );

export default function UICanvasAnalyticsPanel({
  selectedUICanvasId,
  selectedUI,
  uiList = [],
  projectId,
  readOnly = false,
  fixedView = "general",
}: UICanvasAnalyticsPanelProps) {
  const [allAnalytics, setAllAnalytics] = useState<Record<string, UICanvasAnalytics>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<AnalyticsActionKey, boolean>>({
    estimatedHours: false,
    estimatedCodeLines: false,
    alignment: false,
  });
  const [assigneeRows, setAssigneeRows] = useState<AssigneeAnalyticsRow[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [reportNameFilter, setReportNameFilter] = useState("");
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [previewCanvas, setPreviewCanvas] = useState<{ id: string; name: string } | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [error, setError] = useState<string>();
  const emptyStateCopy = {
    general: {
      title: "No UI canvas selected",
      description: "Select a UI canvas to view summary analytics for this project.",
    },
    reports: {
      title: "No report data to show",
      description: "Create a UI canvas first. Report rows will appear here automatically.",
    },
    assignee: {
      title: "No assignee data to show",
      description: "Assignee analytics will appear after backlog items are linked to UI canvases.",
    },
  } as const;
  const canvasItems = useMemo(() => {
    const itemMap = new Map<string, UICanvasData>();

    uiList.forEach((item) => {
      if (item?.id) {
        itemMap.set(item.id, item);
      }
    });

    if (selectedUI?.id) {
      itemMap.set(selectedUI.id, selectedUI);
    }

    return Array.from(itemMap.values());
  }, [selectedUI, uiList]);

  const selectedAnalytics = selectedUICanvasId ? (allAnalytics[selectedUICanvasId] || EMPTY_ANALYTICS) : EMPTY_ANALYTICS;

  useEffect(() => {
    if (fixedView === "general") {
      setIsSummaryOpen(false);
    }
  }, [fixedView, selectedUICanvasId]);

  useEffect(() => {
    if (canvasItems.length === 0) {
      setAllAnalytics({});
      return;
    }

    setLoading(true);
    const unsubscribes = canvasItems.map((canvas) =>
      onSnapshot(
        doc(db, "ui_canvas", canvas.id),
        (snapshot) => {
          const nextAnalytics = normalizeAnalytics(snapshot.exists() ? snapshot.data()?.analytics : {});
          setAllAnalytics((prev) => ({ ...prev, [canvas.id]: nextAnalytics }));
          setLoading(false);
        },
        (nextError) => {
          setError(nextError.message || "Failed to load analytics");
          setLoading(false);
        },
      ),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [canvasItems]);

  useEffect(() => {
    if (!selectedUICanvasId || !projectId) {
      return;
    }

    syncUICanvasBacklogMetrics(projectId, selectedUICanvasId).catch((syncError) => {
      console.error("Failed to sync UI canvas analytics", syncError);
    });
  }, [projectId, selectedUICanvasId]);

  useEffect(() => {
    if (!projectId || canvasItems.length === 0) {
      setAssigneeRows([]);
      return;
    }

    let cancelled = false;
    const canvasIdSet = new Set(canvasItems.map((item) => item.id));

    const loadAssigneeAnalytics = async () => {
      setAssigneeLoading(true);

      try {
        const backlogSnapshot = await getDocs(collection(db, `backlog_${projectId}`));
        if (cancelled) {
          return;
        }

        const grouped = backlogSnapshot.docs.reduce((acc, documentItem) => {
          const issue = { id: documentItem.id, ...documentItem.data() };
          const uiCanvasId = resolveIssueCanvasId(issue);

          if (!canvasIdSet.has(uiCanvasId)) {
            return acc;
          }

          const assigneeId = String(issue?.assignee || issue?.assigneeId || "").trim() || "unassigned";
          const assigneeName = String(issue?.assigneeName || issue?.assignedToName || "").trim() || "Unassigned";

          if (!acc[assigneeId]) {
            acc[assigneeId] = {
              key: assigneeId,
              assigneeId,
              assigneeName,
              assigneePhotoUrl: String(issue?.assigneePhotoUrl || issue?.assignedToPhotoUrl || "").trim() || undefined,
              issueCount: 0,
              canvasIds: new Set<string>(),
              spentHours: 0,
              estimatedHours: 0,
              developedCodeLines: 0,
            };
          }

          acc[assigneeId].issueCount += 1;
          acc[assigneeId].canvasIds.add(uiCanvasId);
          acc[assigneeId].spentHours += toSafeNumber(issue?.sh);
          acc[assigneeId].estimatedHours += toSafeNumber(issue?.eh);
          acc[assigneeId].developedCodeLines += toSafeNumber(issue?.codeLine ?? issue?.insertedLine ?? issue?.modifiedLine);

          return acc;
        }, {} as Record<string, any>);

        const nextRows = Object.values(grouped)
          .map((item: any) => ({
            key: item.key,
            assigneeId: item.assigneeId,
            assigneeName: item.assigneeName,
            assigneePhotoUrl: item.assigneePhotoUrl,
            issueCount: item.issueCount,
            canvasCount: item.canvasIds.size,
            spentHours: roundMetric(item.spentHours),
            estimatedHours: roundMetric(item.estimatedHours),
            developedCodeLines: Math.round(item.developedCodeLines),
          }))
          .sort((left, right) => right.issueCount - left.issueCount);

        if (!cancelled) {
          setAssigneeRows(nextRows);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "Failed to load assignee analytics");
        }
      } finally {
        if (!cancelled) {
          setAssigneeLoading(false);
        }
      }
    };

    loadAssigneeAnalytics();

    return () => {
      cancelled = true;
    };
  }, [canvasItems, projectId]);

  const handleActionLoading = (key: AnalyticsActionKey, value: boolean) => {
    setActionLoading((prev) => ({ ...prev, [key]: value }));
  };

  const handleEstimateHours = async () => {
    if (!selectedUICanvasId || !selectedUI) {
      return;
    }

    handleActionLoading("estimatedHours", true);
    try {
      const response = await generateVertexJsonPayload(buildEstimateHoursPrompt(selectedUI));
      const estimatedHours = roundQuarter(toSafeNumber((response as any)?.estimatedHours));
      const estimatedAt = new Date().toISOString();

      await mergeUICanvasAnalytics(selectedUICanvasId, {
        estimatedHours,
        estimatedHoursLastEstimatedAt: estimatedAt,
      });

      message.success("Estimated hours updated");
    } catch (actionError: any) {
      console.error("Failed to estimate hours", actionError);
      message.error(actionError?.message || "Failed to estimate hours");
    } finally {
      handleActionLoading("estimatedHours", false);
    }
  };

  const handleEstimateCodeLines = async () => {
    if (!selectedUICanvasId || !selectedUI) {
      return;
    }

    handleActionLoading("estimatedCodeLines", true);
    try {
      const response = await generateVertexJsonPayload(buildEstimateCodeLinesPrompt(selectedUI));
      const estimatedCodeLines = Math.max(0, Math.round(toSafeNumber((response as any)?.estimatedCodeLines)));
      const estimatedAt = new Date().toISOString();

      await mergeUICanvasAnalytics(selectedUICanvasId, {
        estimatedCodeLines,
        estimatedCodeLinesLastEstimatedAt: estimatedAt,
      });

      message.success("Estimated code lines updated");
    } catch (actionError: any) {
      console.error("Failed to estimate code lines", actionError);
      message.error(actionError?.message || "Failed to estimate code lines");
    } finally {
      handleActionLoading("estimatedCodeLines", false);
    }
  };

  const handleCheckAlignment = async () => {
    if (!selectedUICanvasId || !selectedUI || !projectId) {
      return;
    }

    handleActionLoading("alignment", true);
    try {
      const { issues } = await calculateUICanvasBacklogMetrics(projectId, selectedUICanvasId);
      if (issues.length === 0) {
        message.warning("No related backlog issues found for this UI canvas");
        return;
      }

      const response = await generateVertexJsonPayload(buildAlignmentPrompt(selectedUI, issues));
      const checkedAt = new Date().toISOString();
      const alignmentRate = Math.max(0, Math.min(100, Math.round(toSafeNumber((response as any)?.alignmentRate))));
      const note = String((response as any)?.note || "").trim();

      await mergeUICanvasAnalytics(selectedUICanvasId, {
        businessRequirementsAlignmentRate: alignmentRate,
        businessRequirementsAlignmentLastCheckedAt: checkedAt,
        businessRequirementsAlignmentNote: note,
      });

      message.success("Alignment rate checked");
    } catch (actionError: any) {
      console.error("Failed to check alignment rate", actionError);
      message.error(actionError?.message || "Failed to check alignment rate");
    } finally {
      handleActionLoading("alignment", false);
    }
  };

  const metricRows = useMemo(
    () => [
      {
        key: "estimated-hours",
        icon: <FieldTimeOutlined style={{ color: "#ef4444" }} />,
        label: "Estimated Hours",
        value: selectedAnalytics.estimatedHours ?? "-",
        buttonLabel: "Estimate It",
        buttonAction: handleEstimateHours,
        buttonLoading: actionLoading.estimatedHours,
        lastLabel: "Last estimated date",
        lastValue: formatDateTime(selectedAnalytics.estimatedHoursLastEstimatedAt),
      },
      {
        key: "spent-hours",
        icon: <BarChartOutlined style={{ color: "#22c55e" }} />,
        label: "Spent Hours",
        value: selectedAnalytics.spentHours ?? 0,
        lastLabel: "Aggregated from backlog",
        lastValue: "Realtime sum of SH values",
      },
      {
        key: "estimated-code-lines",
        icon: <CalculatorOutlined style={{ color: "#1677ff" }} />,
        label: "Estimated Code Lines",
        value: selectedAnalytics.estimatedCodeLines ?? "-",
        buttonLabel: "Estimate It",
        buttonAction: handleEstimateCodeLines,
        buttonLoading: actionLoading.estimatedCodeLines,
        lastLabel: "Last estimated date",
        lastValue: formatDateTime(selectedAnalytics.estimatedCodeLinesLastEstimatedAt),
      },
      {
        key: "developed-code-lines",
        icon: <CodeOutlined style={{ color: "#7c3aed" }} />,
        label: "Developed Code Lines",
        value: selectedAnalytics.developedCodeLines ?? 0,
        lastLabel: "Aggregated from backlog",
        lastValue: "Realtime sum of linked commit code lines",
      },
      {
        key: "alignment-rate",
        icon: <CheckCircleOutlined style={{ color: "#f59e0b" }} />,
        label: "Project Requirements Alignment Rate",
        value:
          selectedAnalytics.businessRequirementsAlignmentRate === null || selectedAnalytics.businessRequirementsAlignmentRate === undefined
            ? "-"
            : `${selectedAnalytics.businessRequirementsAlignmentRate}%`,
        buttonLabel: "Check It",
        buttonAction: handleCheckAlignment,
        buttonLoading: actionLoading.alignment,
        lastLabel: "Last checked date",
        lastValue: formatDateTime(selectedAnalytics.businessRequirementsAlignmentLastCheckedAt),
      },
    ],
    [actionLoading.alignment, actionLoading.estimatedCodeLines, actionLoading.estimatedHours, selectedAnalytics],
  );

  const reportRows = useMemo(
    () =>
      canvasItems.map((canvas) => {
        const analytics = allAnalytics[canvas.id] || EMPTY_ANALYTICS;
        return {
          key: canvas.id,
          uiCanvasId: canvas.id,
          uiCanvasLabel: canvas.label || canvas.id,
          analytics,
        };
      })
        .sort((left, right) => left.uiCanvasLabel.localeCompare(right.uiCanvasLabel)),
    [allAnalytics, canvasItems],
  );

  const filteredReportRows = useMemo(() => {
    const normalizedFilter = reportNameFilter.trim().toLowerCase();

    if (!normalizedFilter) {
      return reportRows;
    }

    return reportRows.filter((item) => item.uiCanvasLabel.toLowerCase().includes(normalizedFilter));
  }, [reportNameFilter, reportRows]);

  const summaryItems = useMemo(() => {
    const totals = filteredReportRows.reduce(
      (acc, item) => {
        const { analytics } = item;

        if (analytics.estimatedHours !== null && analytics.estimatedHours !== undefined) {
          acc.estimatedHours += Number(analytics.estimatedHours);
          acc.hasEstimatedHours = true;
        }

        acc.spentHours += toSafeNumber(analytics.spentHours);

        if (analytics.estimatedCodeLines !== null && analytics.estimatedCodeLines !== undefined) {
          acc.estimatedCodeLines += Number(analytics.estimatedCodeLines);
          acc.hasEstimatedCodeLines = true;
        }

        acc.developedCodeLines += toSafeNumber(analytics.developedCodeLines);

        if (
          analytics.businessRequirementsAlignmentRate !== null &&
          analytics.businessRequirementsAlignmentRate !== undefined
        ) {
          acc.alignmentRate += Number(analytics.businessRequirementsAlignmentRate);
          acc.alignmentCount += 1;
        }

        return acc;
      },
      {
        estimatedHours: 0,
        hasEstimatedHours: false,
        spentHours: 0,
        estimatedCodeLines: 0,
        hasEstimatedCodeLines: false,
        developedCodeLines: 0,
        alignmentRate: 0,
        alignmentCount: 0,
      },
    );

    return [
      {
        key: "eh",
        label: "Estimated Hours",
        value: totals.hasEstimatedHours ? roundMetric(totals.estimatedHours) : "-",
      },
      {
        key: "sh",
        label: "Spent Hours",
        value: roundMetric(totals.spentHours),
      },
      {
        key: "ecl",
        label: "Estimated Code Lines",
        value: totals.hasEstimatedCodeLines ? Math.round(totals.estimatedCodeLines) : "-",
      },
      {
        key: "dcl",
        label: "Developed Code Lines",
        value: Math.round(totals.developedCodeLines),
      },
      {
        key: "bra",
        label: "Project Requirements Alignment Rate",
        value: totals.alignmentCount > 0 ? `${roundMetric(totals.alignmentRate / totals.alignmentCount)}%` : "-",
      },
    ];
  }, [filteredReportRows]);

  const assigneeSummaryItems = useMemo(
    () => [
      { key: "assignees", label: "Assignees", value: assigneeRows.length },
      { key: "issues", label: "Assigned Issues", value: assigneeRows.reduce((sum, item) => sum + item.issueCount, 0) },
      { key: "spent", label: "Spent Hours", value: roundMetric(assigneeRows.reduce((sum, item) => sum + item.spentHours, 0)) },
      { key: "code-lines", label: "Developed Code Lines", value: Math.round(assigneeRows.reduce((sum, item) => sum + item.developedCodeLines, 0)) },
    ],
    [assigneeRows],
  );

  const generalSummaryItems = useMemo(
    () => [
      { key: "eh", label: "eh", value: getMetricDisplayValue(selectedAnalytics.estimatedHours) },
      { key: "sh", label: "sh", value: getMetricDisplayValue(selectedAnalytics.spentHours) },
      { key: "ecl", label: "ecl", value: getMetricDisplayValue(selectedAnalytics.estimatedCodeLines) },
      { key: "dcl", label: "dcl", value: getMetricDisplayValue(selectedAnalytics.developedCodeLines) },
      { key: "bra", label: "bra", value: getMetricDisplayValue(selectedAnalytics.businessRequirementsAlignmentRate, "%") },
    ],
    [selectedAnalytics],
  );

  const reportColumns = useMemo(
    () => [
      {
        title: "UI Canvas",
        dataIndex: "uiCanvasLabel",
        key: "uiCanvasLabel",
        width: 260,
        sorter: (left: any, right: any) => left.uiCanvasLabel.localeCompare(right.uiCanvasLabel),
        render: (value: string, record: any) => (
          <Button
            type="link"
            onClick={() => {
              setPreviewCanvas({ id: record.uiCanvasId, name: value });
              setPreviewDrawerOpen(true);
            }}
            style={{
              padding: 0,
              height: "auto",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            title={`Open ${value} in UI canvas viewer`}
          >
            <EyeOutlined />
            <span
              style={{
                textDecoration: "underline",
                textDecorationColor: "transparent",
                textUnderlineOffset: 3,
                transition: "all 0.2s ease",
              }}
            >
              {value}
            </span>
          </Button>
        ),
      },
      {
        title: "Estimated Hours",
        key: "estimatedHours",
        render: (_: unknown, record: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{getMetricDisplayValue(record.analytics.estimatedHours)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last estimated: {formatDateTime(record.analytics.estimatedHoursLastEstimatedAt)}
            </Text>
          </div>
        ),
      },
      {
        title: "Spent Hours",
        key: "spentHours",
        render: (_: unknown, record: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{getMetricDisplayValue(record.analytics.spentHours)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Backlog aggregate</Text>
          </div>
        ),
      },
      {
        title: "Estimated Code Lines",
        key: "estimatedCodeLines",
        render: (_: unknown, record: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{getMetricDisplayValue(record.analytics.estimatedCodeLines)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last estimated: {formatDateTime(record.analytics.estimatedCodeLinesLastEstimatedAt)}
            </Text>
          </div>
        ),
      },
      {
        title: "Developed Code Lines",
        key: "developedCodeLines",
        render: (_: unknown, record: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{getMetricDisplayValue(record.analytics.developedCodeLines)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Linked commit aggregate</Text>
          </div>
        ),
      },
      {
        title: "Project Requirements Alignment Rate",
        key: "alignmentRate",
        render: (_: unknown, record: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Text strong>{getMetricDisplayValue(record.analytics.businessRequirementsAlignmentRate, "%")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last checked: {formatDateTime(record.analytics.businessRequirementsAlignmentLastCheckedAt)}
            </Text>
          </div>
        ),
      },
    ],
    [],
  );

  const assigneeColumns = useMemo(
    () => [
      {
        title: "Assignee",
        dataIndex: "assigneeName",
        key: "assigneeName",
        render: (value: string, record: AssigneeAnalyticsRow) => (
          <Space size={10}>
            <Avatar src={record.assigneePhotoUrl} icon={!record.assigneePhotoUrl ? <UserOutlined /> : undefined} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Text strong>{value}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.assigneeId}</Text>
            </div>
          </Space>
        ),
      },
      {
        title: "Assigned Issues",
        dataIndex: "issueCount",
        key: "issueCount",
      },
      {
        title: "UI Canvases",
        dataIndex: "canvasCount",
        key: "canvasCount",
      },
      {
        title: "Estimated Hours",
        dataIndex: "estimatedHours",
        key: "estimatedHours",
      },
      {
        title: "Spent Hours",
        dataIndex: "spentHours",
        key: "spentHours",
      },
      {
        title: "Developed Code Lines",
        dataIndex: "developedCodeLines",
        key: "developedCodeLines",
      },
    ],
    [],
  );

  const renderGeneralAnalytics = () => (
    <Collapse
      ghost
      activeKey={isSummaryOpen ? ["summary"] : []}
      onChange={(keys) => setIsSummaryOpen(Array.isArray(keys) ? keys.includes("summary") : keys === "summary")}
      items={[
        {
          key: "summary",
          label: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <Text strong style={{ fontSize: 15 }}>Summary</Text>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {generalSummaryItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "baseline",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#f5f5f5",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#8c8c8c",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#262626", lineHeight: 1 }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ),
          children: (
            <Space direction="vertical" size={12} style={{ width: "100%", paddingTop: 8 }}>
              {metricRows.map((metric) => (
                <Card
                  key={metric.key}
                  size="small"
                  style={{ borderRadius: 10, background: "#fafafa" }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} md={9}>
                      <Space size={10}>
                        {metric.icon}
                        <Text strong>{metric.label}</Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={5}>
                      {metric.key === "alignment-rate" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <Progress
                            type="circle"
                            size={64}
                            percent={selectedAnalytics.businessRequirementsAlignmentRate ?? 0}
                            format={(percent) => (
                              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                                {percent || 0}%
                              </span>
                            )}
                          />
                        </div>
                      ) : (
                        <Text strong style={{ fontSize: 22, lineHeight: 1.1 }}>
                          {String(metric.value)}
                        </Text>
                      )}
                    </Col>
                    <Col xs={24} md={6}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{metric.lastLabel}</Text>
                        <Text style={{ fontSize: 13 }}>{metric.lastValue}</Text>
                      </div>
                    </Col>
                    <Col xs={24} md={4} style={{ display: "flex", justifyContent: "flex-end" }}>
                      {metric.buttonAction ? (
                        <Button
                          type="primary"
                          ghost
                          onClick={metric.buttonAction}
                          loading={metric.buttonLoading}
                          disabled={readOnly}
                        >
                          {metric.buttonLabel}
                        </Button>
                      ) : null}
                    </Col>
                  </Row>

                  {metric.key === "alignment-rate" ? (
                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          borderRadius: 8,
                          fontSize: 12,
                          background: "#e6f4ff",
                          border: "1px solid #91caff",
                        }}
                      >
                        <InfoCircleFilled style={{ color: "#1677ff", fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Alignment Scope:</span>
                          <span style={{ fontSize: 12, lineHeight: 1.4, flex: 1, minWidth: 0 }}>
                            Alignment check is calculated based on the UI canvas JSON and the GitHub commits linked
                            through backlog issues related to this UI canvas.
                          </span>
                        </div>
                      </div>

                      {selectedAnalytics.businessRequirementsAlignmentNote ? (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background: "#fffaf0",
                            border: "1px solid #ffe58f",
                          }}
                        >
                          <Text strong style={{ display: "block", marginBottom: 6 }}>Alignment Note</Text>
                          <Text>{selectedAnalytics.businessRequirementsAlignmentNote}</Text>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              ))}
            </Space>
          ),
        },
      ]}
    />
  );

  const renderReports = () => (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        borderRadius: 16,
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          background: "#ffffff",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space size={10}>
            <FileSearchOutlined style={{ color: "#1677ff" }} />
            <Text strong style={{ fontSize: 18, lineHeight: 1.2 }}>UI Canvas Reports  </Text>
          </Space>
        </div>

        <Row gutter={[12, 12]}>
          {summaryItems.map((item) => (
            <Col xs={24} sm={12} xl={8} key={item.key}>
              <Card size="small" style={{ borderRadius: 10, height: "100%", background: "#fcfcfd" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background:
                        item.key === "eh"
                          ? "#fef3c7"
                          : item.key === "sh"
                            ? "#dcfce7"
                            : item.key === "ecl"
                              ? "#dbeafe"
                              : item.key === "dcl"
                                ? "#ede9fe"
                                : "#fee2e2",
                      color:
                        item.key === "eh"
                          ? "#d97706"
                          : item.key === "sh"
                            ? "#16a34a"
                            : item.key === "ecl"
                              ? "#2563eb"
                              : item.key === "dcl"
                                ? "#7c3aed"
                                : "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 24,
                    }}
                  >
                    {item.key === "eh" && <FieldTimeOutlined />}
                    {item.key === "sh" && <BarChartOutlined />}
                    {item.key === "ecl" && <CalculatorOutlined />}
                    {item.key === "dcl" && <CodeOutlined />}
                    {item.key === "bra" && <CheckCircleOutlined />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Text
                      type="secondary"
                      style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}
                    >
                      {item.label}
                    </Text>
                    <Text strong style={{ fontSize: 30, lineHeight: 1.1 }}>
                      {String(item.value)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Total across visible UI canvases
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <div
        style={{
          borderRadius: 14,
          background: "#ffffff",
          border: "0px solid transparent",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid #f0f0f0",
            background: "#ffffff",
            flexWrap: "wrap",
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Filter by UI canvas name"
            value={reportNameFilter}
            onChange={(event) => setReportNameFilter(event.target.value)}
            style={{ width: 280 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafcff",
            flexWrap: "wrap",
          }}
        >
          <Space size={10} wrap>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#e6f4ff",
                color: "#1677ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppstoreOutlined />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Text strong>Ordered by UI canvas name</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hover and click a UI canvas name to open its viewer.
              </Text>
            </div>
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredReportRows.length} of {reportRows.length} UI canvases
          </Text>
        </div>

        <Table
          columns={reportColumns}
          dataSource={filteredReportRows}
          pagination={false}
          scroll={{ x: 1280 }}
          locale={{ emptyText: "No UI canvas analytics available yet" }}
        />
      </div>
    </div>
  );

  const renderAssigneeAnalytics = () => (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {assigneeSummaryItems.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.key}>
            <Card size="small" style={{ borderRadius: 10, height: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                <Text strong style={{ fontSize: 24, lineHeight: 1 }}>{String(item.value)}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        size="small"
        title="Assignee Analytics"
        style={{ borderRadius: 10 }}
        styles={{ body: { padding: 0 } }}
      >
        {assigneeLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : assigneeRows.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No assignee analytics found for the current UI canvas set"
            style={{ padding: 24 }}
          />
        ) : (
          <Table
            columns={assigneeColumns}
            dataSource={assigneeRows}
            pagination={false}
            scroll={{ x: 980 }}
          />
        )}
      </Card>
    </Space>
  );

  if (!selectedUICanvasId) {
    return (
      <Alert
        type="info"
        showIcon
        message={emptyStateCopy[fixedView].title}
        description={emptyStateCopy[fixedView].description}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setError(undefined)}
        />
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center",  }}>
          <Spin />
        </div>
      ) : (
        <div style={{ minWidth: 0 }}>
          {fixedView === "general" && renderGeneralAnalytics()}
          {fixedView === "reports" && renderReports()}
          {fixedView === "assignee" && renderAssigneeAnalytics()}
        </div>
      )}

      <UICanvasPreviewDrawer
        open={previewDrawerOpen}
        onClose={() => {
          setPreviewDrawerOpen(false);
          setPreviewCanvas(null);
        }}
        data={previewCanvas ? { id: previewCanvas.id, name: previewCanvas.name } : undefined}
      />
    </div>
  );
}
