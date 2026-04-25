import React, { useEffect, useMemo, useState } from "react";
import {
  BarChartOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DashboardOutlined,
  FundProjectionScreenOutlined,
  LoadingOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Col, Modal, Progress, Row, Space, Statistic, Typography, Button, Popover, message } from "antd";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { db } from "@/config/firebase";
import { generateVertexJsonPayload } from "@/components/ui-canvas/UICanvasAIDrawer/vertexAIGeminiClient";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { selectProjectPermissions } from "@/store/slices/permissions";
import { useAppSelector } from "@/store";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { calculateUICanvasBacklogMetrics, mergeUICanvasAnalytics } from "@/ui-canvas/uic_ui_canvas/services/uICanvasAnalyticsService";

const { Title, Text } = Typography;

interface ProductManagementMetricsProps {
  currentProject: any;
  statistics: Record<string, any>;
  allBacklogIssues?: any[];
  canvasses?: Array<{ id: string; label?: string }>;
  snapshotExtra?: React.ReactNode;
}

type ProjectAnalyticsTotals = {
  estimatedHours: number;
  estimatedHoursCount: number;
  spentHours: number;
  estimatedCodeLines: number;
  estimatedCodeLinesCount: number;
  developedCodeLines: number;
  alignmentRateTotal: number;
  alignmentRateCount: number;
};

type CompletionCheckMetadata = {
  estimatedFinishDate: string | null;
  remainDays: number | null;
  checkedAt: string | null;
  checkedBy: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  } | null;
  weeklyCapacityHours: number;
  activeDevelopers: number;
  rationale?: string;
  factors?: string[];
};

type AlignmentEvaluationProgress = {
  total: number;
  completed: number;
  success: number;
  skipped: number;
  failed: number;
  currentCanvasName: string;
  currentStatus: string;
  isRunning: boolean;
};

const initialTotals: ProjectAnalyticsTotals = {
  estimatedHours: 0,
  estimatedHoursCount: 0,
  spentHours: 0,
  estimatedCodeLines: 0,
  estimatedCodeLinesCount: 0,
  developedCodeLines: 0,
  alignmentRateTotal: 0,
  alignmentRateCount: 0,
};

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const roundValue = (value: number, precision = 2) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const buildAlignmentPrompt = (selectedUI: any, backlogIssues: any[]) =>
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

const formatMetric = (value: number | null, suffix = "") => {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${roundValue(value)}${suffix}`;
};

const formatDate = (value: Date | null) => {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString();
};

const formatLongDate = (value: Date | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
};

const formatLongDateTime = (value: Date | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
};

const parseStoredDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const nextDate = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
};

const getDaysBetween = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const normalizeProjectJsonCount = (value: unknown) => {
  if (!value) {
    return 0;
  }

  let parsedValue = value;
  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value);
    } catch (error) {
      console.error("Failed to parse project JSON", error);
      return 0;
    }
  }

  if (Array.isArray(parsedValue)) {
    return parsedValue.length;
  }

  if (parsedValue && typeof parsedValue === "object") {
    return Object.keys(parsedValue as Record<string, unknown>).length;
  }

  return 0;
};

const sectionCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "none",
  boxShadow: "none",
  height: "100%",
  background: "#f5f5f5",
  fontFamily: '"TT Fors", sans-serif',
};

const metricCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #edf2f7",
  height: "100%",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
  fontFamily: '"TT Fors", sans-serif',
};

const dashboardFontStyle: React.CSSProperties = {
  fontFamily: '"TT Fors", sans-serif',
};

const snapshotBadgeStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #edf2f7",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  padding: 18,
  height: "100%",
  fontFamily: '"TT Fors", sans-serif',
};

const codeLinesChartWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: 320,
  height: 320,
  maxWidth: "100%",
};

const RADIAN = Math.PI / 180;

const renderCodeLinesPieLabel = (props: any) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    fill,
  } = props;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const displayPercent = `${Math.round((percent || 0) * 100)}%`;

  return (
    <text
      x={x}
      y={y}
      fill={fill === "#78aef0" ? "#ffffff" : "#5f7193"}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontFamily: '"TT Fors", sans-serif',
        fontSize: 20,
        fontWeight: 700,
        pointerEvents: "none",
      }}
    >
      {displayPercent}
    </text>
  );
};

const iconBadgeStyle = (background: string, color: string): React.CSSProperties => ({
  width: 48,
  height: 48,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  fontSize: 22,
  flexShrink: 0,
});

const ProductManagementMetrics: React.FC<ProductManagementMetricsProps> = ({
  currentProject,
  statistics = {},
  allBacklogIssues = [],
  canvasses = [],
  snapshotExtra,
}) => {
  useProjectPermissions();
  const { projectUsers } = useProjectUsers();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const allUsers = useAppSelector((state) => state.auth.users);
  const cachedPermissions = useAppSelector((state) =>
    selectProjectPermissions(state as any, currentProject?.id || ""),
  );
  const [apiCanvasCount, setApiCanvasCount] = useState(0);
  const [analyticsTotals, setAnalyticsTotals] = useState<ProjectAnalyticsTotals>(initialTotals);
  const [loadingProjectTotals, setLoadingProjectTotals] = useState(false);
  const [lastCompletionCheckAt, setLastCompletionCheckAt] = useState<Date | null>(null);
  const [completionCheckMetadata, setCompletionCheckMetadata] = useState<CompletionCheckMetadata | null>(null);
  const [completionCheckLoading, setCompletionCheckLoading] = useState(false);
  const [alignmentModalOpen, setAlignmentModalOpen] = useState(false);
  const [alignmentEvaluationProgress, setAlignmentEvaluationProgress] = useState<AlignmentEvaluationProgress>({
    total: 0,
    completed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    currentCanvasName: "",
    currentStatus: "Ready to evaluate",
    isRunning: false,
  });

  const storedUserData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userData") || "{}");
    } catch {
      return {};
    }
  }, []);

  const currentUserProfile = useMemo(() => {
    const matchedUser = allUsers?.find((user: any) => user?.uid === (currentUser?.uid || storedUserData?.uid));
    const displayName =
      matchedUser?.displayName ||
      storedUserData?.displayName ||
      storedUserData?.name ||
      currentUser?.displayName ||
      currentUser?.email ||
      storedUserData?.email ||
      "Unknown User";

    return {
      uid: matchedUser?.uid || currentUser?.uid || storedUserData?.uid || "",
      displayName,
      email: matchedUser?.email || currentUser?.email || storedUserData?.email || "",
      photoURL: matchedUser?.photoURL || storedUserData?.photoURL || currentUser?.photoURL || "",
    };
  }, [allUsers, currentUser, storedUserData]);

  const isAdmin = Boolean(cachedPermissions?.isAdmin);

  useEffect(() => {
    let active = true;

    const loadProjectTotals = async () => {
      if (!currentProject?.id) {
        setApiCanvasCount(0);
        setAnalyticsTotals(initialTotals);
        setCompletionCheckMetadata(null);
        setLastCompletionCheckAt(null);
        return;
      }

      setLoadingProjectTotals(true);
      try {
        const projectRef = doc(db, "projects", currentProject.id);
        const projectSnap = await getDoc(projectRef);

        let nextApiCanvasCount = 0;
        let nextCompletionMetadata: CompletionCheckMetadata | null = null;
        if (projectSnap.exists()) {
          nextApiCanvasCount = normalizeProjectJsonCount(projectSnap.data()?.api_json);
          const storedCompletion = projectSnap.data()?.dashboard_completion_check;
          if (storedCompletion) {
            nextCompletionMetadata = {
              estimatedFinishDate: storedCompletion?.estimatedFinishDate || null,
              remainDays: typeof storedCompletion?.remainDays === "number" ? storedCompletion.remainDays : null,
              checkedAt: storedCompletion?.checkedAt || null,
              checkedBy: storedCompletion?.checkedBy || null,
              weeklyCapacityHours: Number(storedCompletion?.weeklyCapacityHours) || 0,
              activeDevelopers: Number(storedCompletion?.activeDevelopers) || 0,
              rationale: storedCompletion?.rationale || "",
              factors: Array.isArray(storedCompletion?.factors) ? storedCompletion.factors : [],
            };
          }
        }

        const totals = { ...initialTotals };
        await Promise.all(
          canvasses.map(async (canvas) => {
            const canvasRef = doc(db, "ui_canvas", canvas.id);
            const canvasSnap = await getDoc(canvasRef);
            if (!canvasSnap.exists()) {
              return;
            }

            const analytics = canvasSnap.data()?.analytics || {};

            if (analytics.estimatedHours !== null && analytics.estimatedHours !== undefined) {
              totals.estimatedHours += toNumber(analytics.estimatedHours);
              totals.estimatedHoursCount += 1;
            }

            totals.spentHours += toNumber(analytics.spentHours);

            if (analytics.estimatedCodeLines !== null && analytics.estimatedCodeLines !== undefined) {
              totals.estimatedCodeLines += toNumber(analytics.estimatedCodeLines);
              totals.estimatedCodeLinesCount += 1;
            }

            totals.developedCodeLines += toNumber(analytics.developedCodeLines);

            if (
              analytics.businessRequirementsAlignmentRate !== null &&
              analytics.businessRequirementsAlignmentRate !== undefined
            ) {
              totals.alignmentRateTotal += toNumber(analytics.businessRequirementsAlignmentRate);
              totals.alignmentRateCount += 1;
            }
          }),
        );

        if (!active) {
          return;
        }

        setApiCanvasCount(nextApiCanvasCount);
        setAnalyticsTotals(totals);
        setCompletionCheckMetadata(nextCompletionMetadata);
        setLastCompletionCheckAt(parseStoredDate(nextCompletionMetadata?.checkedAt));
      } catch (error) {
        console.error("Failed to load project dashboard totals", error);
      } finally {
        if (active) {
          setLoadingProjectTotals(false);
        }
      }
    };

    loadProjectTotals();

    return () => {
      active = false;
    };
  }, [canvasses, currentProject?.id]);

  const validIssues = useMemo(
    () =>
      allBacklogIssues.filter((issue: any) => !(issue.status === "canceled" && issue.requestType === "Backlog")),
    [allBacklogIssues],
  );

  const projectCompletionInputs = useMemo(() => {
    const taskStatuses = validIssues.reduce(
      (acc, issue: any) => {
        const normalizedStatus = String(issue?.status || "").toLowerCase();
        if (normalizedStatus === "closed") {
          acc.closed += 1;
        } else if (normalizedStatus === "new") {
          acc.new += 1;
        } else {
          acc.inProgress += 1;
        }
        return acc;
      },
      { new: 0, inProgress: 0, closed: 0 },
    );

    const canvasStatusCounts = Object.values(statistics || {}).reduce(
      (acc: Record<string, number>, item: any) => {
        const status = String(item?.canvas_status || "").trim() || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { not_started: 0, in_progress: 0, closed: 0 } as Record<string, number>,
    );

    const assignedTasks = validIssues.filter((issue: any) => String(issue?.assignee || issue?.assigneeId || "").trim());
    const tasksWithoutAssignee = Math.max(0, validIssues.length - assignedTasks.length);
    const developerIds = new Set<string>();

    assignedTasks.forEach((issue: any) => {
      const assigneeId = String(issue?.assignee || issue?.assigneeId || "").trim();
      if (assigneeId) {
        developerIds.add(assigneeId);
      }
    });

    validIssues.forEach((issue: any) => {
      const commitAuthor = String(issue?.commitAuthor || "").trim();
      if (commitAuthor) {
        developerIds.add(commitAuthor);
      }
    });

    const activeDevelopers = Math.max(1, developerIds.size || projectUsers.length || 1);
    const weeklyCapacityHours = activeDevelopers * 30;
    const developedCodeLines = Math.round(analyticsTotals.developedCodeLines);
    const estimatedCodeLines = analyticsTotals.estimatedCodeLinesCount > 0 ? Math.round(analyticsTotals.estimatedCodeLines) : null;
    const remainingCodeLines = estimatedCodeLines !== null ? Math.max(0, estimatedCodeLines - developedCodeLines) : null;
    const spentHours = roundValue(analyticsTotals.spentHours);
    const estimatedHours = analyticsTotals.estimatedHoursCount > 0 ? roundValue(analyticsTotals.estimatedHours) : null;
    const remainingHours = estimatedHours !== null ? Math.max(0, roundValue(estimatedHours - spentHours)) : null;

    return {
      totalUICanvases: canvasses.length,
      totalAPICanvases: apiCanvasCount,
      totalActiveUsers: projectUsers.length,
      activeDevelopers,
      weeklyCapacityHours,
      totalTasks: validIssues.length,
      tasksWithAssignee: assignedTasks.length,
      tasksWithoutAssignee,
      taskStatuses,
      canvasStatusCounts,
      developedCodeLines,
      estimatedCodeLines,
      remainingCodeLines,
      spentHours,
      estimatedHours,
      remainingHours,
    };
  }, [analyticsTotals, apiCanvasCount, canvasses.length, projectUsers.length, statistics, validIssues]);

  const dashboardMetrics = useMemo(() => {
    const totalUICanvases = canvasses.length;
    const totalActiveUsers = projectUsers.length;

    const contributorIds = new Set<string>();
    validIssues.forEach((issue: any) => {
      const assigneeId = String(issue?.assignee || issue?.assigneeId || "").trim();
      const commitAuthor = String(issue?.commitAuthor || "").trim();

      if (assigneeId) {
        contributorIds.add(assigneeId);
      }

      if (commitAuthor) {
        contributorIds.add(commitAuthor);
      }
    });

    const totalContributors = contributorIds.size;
    const spentHours = roundValue(analyticsTotals.spentHours);
    const estimatedHours = analyticsTotals.estimatedHoursCount > 0 ? roundValue(analyticsTotals.estimatedHours) : null;
    const remainingHours = estimatedHours !== null ? Math.max(0, roundValue(estimatedHours - spentHours)) : null;

    const developedCodeLines = Math.round(analyticsTotals.developedCodeLines);
    const estimatedCodeLines =
      analyticsTotals.estimatedCodeLinesCount > 0 ? Math.round(analyticsTotals.estimatedCodeLines) : null;
    const remainCodeLines =
      estimatedCodeLines !== null ? Math.max(0, Math.round(estimatedCodeLines - developedCodeLines)) : null;

    const businessRequirementsAlignment =
      analyticsTotals.alignmentRateCount > 0
        ? roundValue(analyticsTotals.alignmentRateTotal / analyticsTotals.alignmentRateCount)
        : null;

    const createdDates = validIssues
      .map((issue: any) => issue?.createdAt || issue?.created_at || issue?.updatedAt || issue?.updated_at)
      .filter(Boolean)
      .map((value: string) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());

    let estimatedFinishDate: Date | null = parseStoredDate(completionCheckMetadata?.estimatedFinishDate);
    let remainDays: number | null =
      typeof completionCheckMetadata?.remainDays === "number" ? completionCheckMetadata.remainDays : null;

    if (!estimatedFinishDate && estimatedHours !== null && remainingHours !== null) {
      const projectStartDate = createdDates[0] || lastCompletionCheckAt || new Date();
      const elapsedDays = Math.max(1, getDaysBetween(projectStartDate, new Date()) || 1);
      const velocityPerDay = spentHours > 0 ? spentHours / elapsedDays : 0;

      if (velocityPerDay > 0) {
        const finishInDays = Math.ceil(remainingHours / velocityPerDay);
        estimatedFinishDate = new Date();
        estimatedFinishDate.setDate(estimatedFinishDate.getDate() + finishInDays);
        remainDays = finishInDays;
      }
    }

    const codeCompletionPercent =
      estimatedCodeLines && estimatedCodeLines > 0
        ? Math.min(100, Math.round((developedCodeLines / estimatedCodeLines) * 100))
        : 0;

    const hoursCompletionPercent =
      estimatedHours && estimatedHours > 0 ? Math.min(100, Math.round((spentHours / estimatedHours) * 100)) : 0;

    return {
      overall: {
        totalUICanvases,
        totalAPICanvases: apiCanvasCount,
        totalActiveUsers,
        totalContributors,
      },
      projectCompletion: {
        estimatedFinishDate,
        remainDays,
        lastCheckDate: parseStoredDate(completionCheckMetadata?.checkedAt) || lastCompletionCheckAt,
      },
      snapshot: {
        spentHours,
        developedCodeLines,
        businessRequirementsAlignment,
      },
      codeLinesCompletion: {
        estimatedCodeLines,
        developedCodeLines,
        remainCodeLines,
        percent: codeCompletionPercent,
      },
      estimatedCompletion: {
        estimatedHours,
        spentHours,
        remainingHours,
        percent: hoursCompletionPercent,
      },
    };
  }, [analyticsTotals, apiCanvasCount, canvasses.length, completionCheckMetadata, lastCompletionCheckAt, projectUsers.length, validIssues]);

  const codeLinesChartData = useMemo(() => {
    const developed = Math.max(0, dashboardMetrics.codeLinesCompletion.developedCodeLines);
    const estimated = Math.max(0, dashboardMetrics.codeLinesCompletion.estimatedCodeLines ?? 0);
    const remaining = Math.max(0, estimated - developed);
    const isEmpty = developed === 0 && remaining === 0;
    const total = Math.max(estimated, developed + remaining, 1);
    const developedPercent = total > 0 ? Math.round((developed / total) * 100) : 0;
    const remainingPercent = total > 0 ? Math.max(0, 100 - developedPercent) : 0;

    return {
      developed,
      remaining,
      developedLabel: Math.round(developed).toLocaleString(),
      developedPercent,
      remainingPercent,
      slices: [
        {
          key: "developed",
          name: "Developed Code Lines",
          value: isEmpty ? 0 : developed,
          percentValue: developedPercent,
          color: "#78aef0",
          hoverTitle: `Developed Code Lines: ${Math.round(developed).toLocaleString()} (${developedPercent}%)`,
        },
        {
          key: "remaining",
          name: "Remaining Code Lines",
          value: isEmpty ? 1 : remaining,
          percentValue: remainingPercent,
          color: "#dbe7fb",
          hoverTitle: `Remaining Code Lines: ${Math.round(remaining).toLocaleString()} (${remainingPercent}%)`,
        },
      ].filter((slice) => slice.value > 0),
    };
  }, [dashboardMetrics.codeLinesCompletion]);

  const topSummaryCards = [
    {
      title: "Total Number of UI Canvases",
      value: dashboardMetrics.overall.totalUICanvases,
      icon: <DashboardOutlined />,
      background: "#dbeafe",
      color: "#2563eb",
    },
    {
      title: "Total Number of API Canvases",
      value: dashboardMetrics.overall.totalAPICanvases,
      icon: <CodeOutlined />,
      background: "#ede9fe",
      color: "#7c3aed",
    },
    {
      title: "Total Number of Active Users",
      value: dashboardMetrics.overall.totalActiveUsers,
      icon: <TeamOutlined />,
      background: "#dcfce7",
      color: "#16a34a",
    },
    {
      title: "Total Number of Contributors",
      value: dashboardMetrics.overall.totalContributors,
      icon: <UserSwitchOutlined />,
      background: "#fee2e2",
      color: "#dc2626",
    },
  ];

  const alignmentSummary = useMemo(() => {
    const alignmentPercent = Math.round(dashboardMetrics.snapshot.businessRequirementsAlignment ?? 0);
    const totalCanvases = Math.max(0, canvasses.length);
    const alignedCanvases = Math.round((alignmentPercent / 100) * totalCanvases);
    const needsReviewCanvases = Math.max(0, totalCanvases - alignedCanvases);

    const status =
      alignmentPercent >= 75
        ? {
            label: "Strong Alignment",
            chipBackground: "#dcfce7",
            chipColor: "#15803d",
            gaugeColor: "#22c55e",
            cardBackground: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
            cardBorder: "#bbf7d0",
          }
        : alignmentPercent >= 40
          ? {
              label: "Moderate Alignment",
              chipBackground: "#fef3c7",
              chipColor: "#b45309",
              gaugeColor: "#f59e0b",
              cardBackground: "linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)",
              cardBorder: "#fde68a",
            }
          : {
              label: "Needs Attention",
              chipBackground: "#fee2e2",
              chipColor: "#dc2626",
              gaugeColor: "#ef4444",
              cardBackground: "linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)",
              cardBorder: "#fecdd3",
            };

    return {
      alignmentPercent,
      alignedCanvases,
      needsReviewCanvases,
      totalCanvases,
      status,
      coverageBasis: `${totalCanvases} UI canvases`,
      summaryText:
        alignmentPercent >= 75
          ? "Most UI canvases are aligned with project expectations."
          : alignmentPercent >= 40
            ? "Alignment is improving, but several canvases still need review."
            : "Project alignment is low and should be reviewed soon.",
    };
  }, [canvasses.length, dashboardMetrics.snapshot.businessRequirementsAlignment]);

  const projectCompletionInfoItems = [
    "All UI canvases and their developed / remaining code lines",
    "Not started, in progress, and closed UI canvas counts",
    "Total active users and active developers",
    "Weekly active work capacity with 30 hours per active developer",
    "Tasks with assignee and tasks without assignee",
    "Estimated hours, spent hours, and remaining hours",
  ];

  const handleProjectCompletionCheck = async () => {
    if (!currentProject?.id || !isAdmin || completionCheckLoading) {
      return;
    }

    setCompletionCheckLoading(true);
    try {
      const today = new Date();
      const promptEnvelope = JSON.stringify(
        {
          task: "estimate_project_completion",
          instructions: [
            "Return only valid JSON.",
            "Estimate project finish date and remaining days for the whole project.",
            "Use the provided project metrics and approximate planning logic.",
            "Assume each active developer contributes 30 hours per week.",
            "Consider developed code lines, remaining code lines, estimated hours, remaining hours, UI canvas status counts, and assigned/unassigned task counts.",
            "Return estimatedFinishDate as ISO string date, remainDays as integer, rationale as short string, and factors as array of short strings.",
          ],
          projectContext: {
            projectId: currentProject.id,
            projectName: currentProject?.name || "",
            checkedAt: today.toISOString(),
            metrics: projectCompletionInputs,
          },
          responseSchema: {
            estimatedFinishDate: "ISO date string",
            remainDays: "integer",
            rationale: "short text",
            factors: ["string"],
          },
        },
        null,
        2,
      );

      const aiResponse = await generateVertexJsonPayload(promptEnvelope);
      const aiRemainDays = Number(aiResponse?.remainDays);
      const parsedFinishDate = parseStoredDate(aiResponse?.estimatedFinishDate);

      let nextRemainDays = Number.isFinite(aiRemainDays) ? Math.max(0, Math.round(aiRemainDays)) : null;
      let nextFinishDate = parsedFinishDate;

      if (!nextFinishDate || nextRemainDays === null) {
        const weeklyHours = Math.max(30, projectCompletionInputs.weeklyCapacityHours);
        const derivedRemainingHours =
          projectCompletionInputs.remainingHours ??
          (projectCompletionInputs.remainingCodeLines !== null
            ? roundValue(projectCompletionInputs.remainingCodeLines / 35, 2)
            : null);
        const fallbackDays =
          derivedRemainingHours !== null
            ? Math.max(1, Math.ceil((derivedRemainingHours / weeklyHours) * 7))
            : 0;

        nextRemainDays = nextRemainDays ?? fallbackDays;
        nextFinishDate = nextFinishDate ?? new Date(today.getTime() + nextRemainDays * 24 * 60 * 60 * 1000);
      }

      const nextMetadata: CompletionCheckMetadata = {
        estimatedFinishDate: nextFinishDate ? nextFinishDate.toISOString() : null,
        remainDays: nextRemainDays,
        checkedAt: today.toISOString(),
        checkedBy: {
          uid: currentUserProfile.uid,
          displayName: currentUserProfile.displayName,
          email: currentUserProfile.email,
          photoURL: currentUserProfile.photoURL,
        },
        weeklyCapacityHours: projectCompletionInputs.weeklyCapacityHours,
        activeDevelopers: projectCompletionInputs.activeDevelopers,
        rationale: String(aiResponse?.rationale || "").trim(),
        factors: Array.isArray(aiResponse?.factors)
          ? aiResponse.factors.map((item: unknown) => String(item).trim()).filter(Boolean)
          : projectCompletionInfoItems,
      };

      await setDoc(
        doc(db, "projects", currentProject.id),
        { dashboard_completion_check: nextMetadata },
        { merge: true },
      );

      setCompletionCheckMetadata(nextMetadata);
      setLastCompletionCheckAt(today);
      message.success("Project completion estimate updated.");
    } catch (error: any) {
      console.error("Failed to check project completion", error);
      message.error(error?.message || "Failed to check project completion");
    } finally {
      setCompletionCheckLoading(false);
    }
  };

  const handleEvaluateAllCanvasesWithAI = async () => {
    if (!currentProject?.id || !isAdmin || !canvasses.length || alignmentEvaluationProgress.isRunning) {
      return;
    }

    setAlignmentModalOpen(true);
    setAlignmentEvaluationProgress({
      total: canvasses.length,
      completed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      currentCanvasName: "",
      currentStatus: "Preparing UI canvases for AI evaluation...",
      isRunning: true,
    });

    message.warning({
      content: "Please do not close or refresh this page while AI evaluation is running.",
      duration: 4,
    });

    let success = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (let index = 0; index < canvasses.length; index += 1) {
        const canvas = canvasses[index];
        const canvasName = canvas?.label || `UI Canvas ${index + 1}`;

        setAlignmentEvaluationProgress((prev) => ({
          ...prev,
          currentCanvasName: canvasName,
          currentStatus: `Evaluating ${canvasName} (${index + 1}/${canvasses.length})`,
        }));

        try {
          const canvasSnapshot = await getDoc(doc(db, "ui_canvas", canvas.id));
          if (!canvasSnapshot.exists()) {
            skipped += 1;
            setAlignmentEvaluationProgress((prev) => ({
              ...prev,
              completed: index + 1,
              skipped,
              currentCanvasName: canvasName,
              currentStatus: `${canvasName} skipped: UI canvas document not found.`,
            }));
            continue;
          }

          const canvasData = { id: canvas.id, ...canvasSnapshot.data() };
          const { issues } = await calculateUICanvasBacklogMetrics(currentProject.id, canvas.id);

          if (!issues.length) {
            skipped += 1;
            await mergeUICanvasAnalytics(canvas.id, {
              businessRequirementsAlignmentLastCheckedAt: new Date().toISOString(),
              businessRequirementsAlignmentNote: "Skipped during bulk evaluation because no related backlog issues were found.",
            });

            setAlignmentEvaluationProgress((prev) => ({
              ...prev,
              completed: index + 1,
              skipped,
              currentCanvasName: canvasName,
              currentStatus: `${canvasName} skipped: no related backlog issues found.`,
            }));
            continue;
          }

          const response = await generateVertexJsonPayload(buildAlignmentPrompt(canvasData, issues));
          const checkedAt = new Date().toISOString();
          const alignmentRate = Math.max(0, Math.min(100, Math.round(toNumber((response as any)?.alignmentRate))));
          const note = String((response as any)?.note || "").trim();

          await mergeUICanvasAnalytics(canvas.id, {
            businessRequirementsAlignmentRate: alignmentRate,
            businessRequirementsAlignmentLastCheckedAt: checkedAt,
            businessRequirementsAlignmentNote: note,
          });

          success += 1;
          setAlignmentEvaluationProgress((prev) => ({
            ...prev,
            completed: index + 1,
            success,
            currentCanvasName: canvasName,
            currentStatus: `${canvasName} evaluated successfully.`,
          }));
        } catch (canvasError: any) {
          failed += 1;
          console.error("Failed to evaluate canvas alignment", canvas?.id, canvasError);
          setAlignmentEvaluationProgress((prev) => ({
            ...prev,
            completed: index + 1,
            failed,
            currentCanvasName: canvasName,
            currentStatus: `${canvasName} failed: ${canvasError?.message || "Unknown error"}`,
          }));
        }
      }

      setAlignmentEvaluationProgress((prev) => ({
        ...prev,
        isRunning: false,
        currentStatus: "AI evaluation completed for all UI canvases.",
      }));

      message.success(`AI evaluation finished. Success: ${success}, skipped: ${skipped}, failed: ${failed}.`);
    } catch (error: any) {
      console.error("Bulk AI evaluation failed", error);
      setAlignmentEvaluationProgress((prev) => ({
        ...prev,
        isRunning: false,
        currentStatus: error?.message || "Bulk AI evaluation failed.",
      }));
      message.error(error?.message || "Bulk AI evaluation failed.");
    }
  };

  return (
    <>
      <Card style={sectionCardStyle} styles={{ body: { padding: 0, fontFamily: '"TT Fors", sans-serif' } }}>
      <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 24, ...dashboardFontStyle }}>
        <Title level={2} style={{ margin: 0, ...dashboardFontStyle }}>
          Product Management and Execution Metrics
        </Title>
        <Text type="secondary" style={{ fontSize: 16, ...dashboardFontStyle }}>
          Track total project execution progress across all UI canvases, API canvases, users, and delivery signals.
        </Text>
      </Space>

      <Row gutter={[18, 18]} style={{ marginBottom: 18 }}>
        {topSummaryCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.title}>
            <Card style={metricCardStyle} styles={{ body: { padding: 18, fontFamily: '"TT Fors", sans-serif' } }}>
              <Space align="start" size={14}>
                <div style={iconBadgeStyle(card.background, card.color)}>{card.icon}</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, ...dashboardFontStyle }}>
                    {card.title}
                  </Text>
                  <div style={{ marginTop: 6, fontSize: 30, fontWeight: 700, lineHeight: 1, ...dashboardFontStyle }}>
                    {card.value}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={12}>
              <Card style={metricCardStyle} styles={{ body: { padding: 22, fontFamily: '"TT Fors", sans-serif' } }}>
                <Space direction="vertical" size={18} style={{ width: "100%", ...dashboardFontStyle }}>
                  <Space size={10}>
                    <div style={iconBadgeStyle("#dbeafe", "#2563eb")}>
                      <CodeOutlined />
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0, ...dashboardFontStyle }}>
                        Code Lines Completion (All UI Canvas)
                      </Title>
                      <Text type="secondary" style={dashboardFontStyle}>Total estimated vs developed code lines across the project.</Text>
                    </div>
                  </Space>

                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={12} style={{ display: "flex", justifyContent: "center" }}>
                      <div style={codeLinesChartWrapperStyle}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              formatter={(value: any, name: any, item: any) => [`${Math.round(Number(value) || 0).toLocaleString()}`, item?.payload?.name]}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.hoverTitle || ""}
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #dbe7fb",
                                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                                fontFamily: '"TT Fors", sans-serif',
                              }}
                            />
                            <Pie
                              data={codeLinesChartData.slices}
                              dataKey="value"
                              cx="50%"
                              cy="50%"
                              innerRadius={78}
                              outerRadius={136}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={3}
                              stroke="#ffffff"
                              strokeWidth={4}
                              labelLine={false}
                              label={renderCodeLinesPieLabel}
                            >
                              {codeLinesChartData.slices.map((slice) => (
                                <Cell key={slice.key} fill={slice.color} title={slice.hoverTitle} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>

                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, ...dashboardFontStyle }}>
                            <span style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, color: "#111827", ...dashboardFontStyle }}>
                              {codeLinesChartData.developedPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <Row gutter={[12, 12]}>
                        <Col span={24}>
                          <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                            <Statistic title="Estimated Code Lines" value={dashboardMetrics.codeLinesCompletion.estimatedCodeLines ?? "-"} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
                          </Card>
                        </Col>
                        <Col span={24}>
                          <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                            <Statistic title="Developed Code Lines" value={dashboardMetrics.codeLinesCompletion.developedCodeLines} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
                          </Card>
                        </Col>
                        <Col span={24}>
                          <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                            <Statistic title="Remain Code Lines" value={dashboardMetrics.codeLinesCompletion.remainCodeLines ?? "-"} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
                          </Card>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Space>
              </Card>
        </Col>

        <Col xs={24} xl={12}>
              <Card style={metricCardStyle} styles={{ body: { padding: 22, fontFamily: '"TT Fors", sans-serif' } }}>
                <Space direction="vertical" size={18} style={{ width: "100%", ...dashboardFontStyle }}>
                  <Space size={10}>
                    <div style={iconBadgeStyle("#ede9fe", "#7c3aed")}>
                      <FundProjectionScreenOutlined />
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0, ...dashboardFontStyle }}>
                        Estimated Completion
                      </Title>
                      <Text type="secondary" style={dashboardFontStyle}>Project-wide hour completion and remaining effort.</Text>
                    </div>
                  </Space>

                  <div
                    style={{
                      borderRadius: 16,
                      padding: 18,
                      background: "linear-gradient(90deg, #f5f3ff 0%, #eef2ff 100%)",
                      border: "1px solid #e9d5ff",
                      ...dashboardFontStyle,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <Text strong style={dashboardFontStyle}>Now</Text>
                      <Text strong style={dashboardFontStyle}>{formatDate(dashboardMetrics.projectCompletion.estimatedFinishDate)}</Text>
                    </div>
                    <Progress
                      percent={dashboardMetrics.estimatedCompletion.percent}
                      showInfo={false}
                      strokeColor={{ "0%": "#c4b5fd", "100%": "#7c3aed" }}
                      trailColor="#e9d5ff"
                      style={{ marginBlock: 14 }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <Text type="secondary" style={dashboardFontStyle}>{formatMetric(dashboardMetrics.estimatedCompletion.estimatedHours, " h")} estimated</Text>
                      <Text type="secondary" style={dashboardFontStyle}>{formatMetric(dashboardMetrics.estimatedCompletion.remainingHours, " h")} remaining</Text>
                    </div>
                  </div>

                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic
                          title="Estimated Hours"
                          value={dashboardMetrics.estimatedCompletion.estimatedHours ?? "-"}
                          suffix={dashboardMetrics.estimatedCompletion.estimatedHours !== null ? "h" : ""}
                          formatter={(value) => <span style={dashboardFontStyle}>{value}</span>}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic title="Spent Hours" value={dashboardMetrics.estimatedCompletion.spentHours} suffix="h" formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic
                          title="Remaining Hours"
                          value={dashboardMetrics.estimatedCompletion.remainingHours ?? "-"}
                          suffix={dashboardMetrics.estimatedCompletion.remainingHours !== null ? "h" : ""}
                          formatter={(value) => <span style={dashboardFontStyle}>{value}</span>}
                        />
                      </Card>
                    </Col>
                  </Row>
                </Space>
              </Card>
        </Col>

        <Col xs={24} xl={12}>
              <Card style={metricCardStyle} styles={{ body: { padding: 22, fontFamily: '"TT Fors", sans-serif' } }}>
                <Space direction="vertical" size={16} style={{ width: "100%", ...dashboardFontStyle }}>
                  <Space size={10}>
                    <div style={iconBadgeStyle("#ede9fe", "#7c3aed")}>
                      <CalendarOutlined />
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0, ...dashboardFontStyle }}>
                        Project Completion
                      </Title>
                      <Text type="secondary" style={dashboardFontStyle}>Estimated finish projection for the whole project.</Text>
                    </div>
                    <Popover
                      trigger="click"
                      content={
                        <div style={{ maxWidth: 320, ...dashboardFontStyle }}>
                          <Text strong style={dashboardFontStyle}>What is included in this check?</Text>
                          <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                            {projectCompletionInfoItems.map((item) => (
                              <li key={item} style={{ marginBottom: 6 }}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      }
                    >
                      <Button type="text" icon={<InfoCircleOutlined />} />
                    </Popover>
                  </Space>

                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic
                          title="Estimated Finish Date"
                          value={formatLongDate(dashboardMetrics.projectCompletion.estimatedFinishDate)}
                          formatter={(value) => <span style={dashboardFontStyle}>{value}</span>}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic title="Remain Days" value={dashboardMetrics.projectCompletion.remainDays ?? "-"} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                        <Statistic
                          title="Last Check Date"
                          value={formatLongDateTime(dashboardMetrics.projectCompletion.lastCheckDate)}
                          formatter={(value) => (
                            <span style={{ ...dashboardFontStyle, whiteSpace: "nowrap", fontSize: 18 }}>
                              {value}
                            </span>
                          )}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={metricCardStyle} styles={{ body: { padding: 14, fontFamily: '"TT Fors", sans-serif' } }}>
                        <Space align="start" size={12}>
                          <Avatar size={42} src={completionCheckMetadata?.checkedBy?.photoURL}>
                            {String(completionCheckMetadata?.checkedBy?.displayName || currentUserProfile.displayName || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            <Text type="secondary" style={dashboardFontStyle}>Last Checked By</Text>
                            <Text
                              strong
                              style={{
                                ...dashboardFontStyle,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                              }}
                            >
                              {completionCheckMetadata?.checkedBy?.displayName || currentUserProfile.displayName || "-"}
                            </Text>
                            <Text
                              style={{
                                ...dashboardFontStyle,
                                color: "#595959",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                              }}
                            >
                              {completionCheckMetadata?.checkedBy?.email || currentUserProfile.email || "-"}
                            </Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  </Row>

                  <Space size={10} wrap>
                    {isAdmin ? (
                      <Button
                        icon={<ClockCircleOutlined />}
                        onClick={handleProjectCompletionCheck}
                        loading={completionCheckLoading}
                        style={{ width: "fit-content", ...dashboardFontStyle }}
                        title="Calculate with AI Assistant"
                      >
                        Calculate with AI Assistant
                      </Button>
                    ) : null}
                    <Popover
                      trigger={["hover", "click"]}
                      content={
                        <div style={{ maxWidth: 360, ...dashboardFontStyle }}>
                          <Space direction="vertical" size={8} style={{ width: "100%" }}>
                            <Text strong style={dashboardFontStyle}>Estimation AI feedback</Text>
                            <Text style={dashboardFontStyle}>
                              {completionCheckMetadata?.rationale || "Estimated based on total remaining hours and team weekly capacity, assuming consistent productivity."}
                            </Text>
                            <Text type="secondary" style={dashboardFontStyle}>
                              Active developers: {completionCheckMetadata?.activeDevelopers || projectCompletionInputs.activeDevelopers} | Weekly capacity: {completionCheckMetadata?.weeklyCapacityHours || projectCompletionInputs.weeklyCapacityHours}h
                            </Text>
                            <div style={{ paddingLeft: 16 }}>
                              <ul style={{ margin: 0, padding: 0 }}>
                                {(
                                  completionCheckMetadata?.factors?.length
                                    ? completionCheckMetadata.factors
                                    : [
                                        `Remaining estimated hours (${projectCompletionInputs.remainingHours ?? "-"})`,
                                        `Active developers (${projectCompletionInputs.activeDevelopers})`,
                                        "Developer weekly contribution (30 hours/developer)",
                                        "Standard 5-day work week",
                                      ]
                                )
                                  .slice(0, 6)
                                  .map((factor) => (
                                    <li key={factor} style={{ marginBottom: 4 }}>
                                      <Text style={dashboardFontStyle}>{factor}</Text>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          </Space>
                        </div>
                      }
                    >
                      <Button
                        type="text"
                        style={{ paddingInline: 4, color: "#6b7280", ...dashboardFontStyle }}
                        title="Estimation AI feedback"
                      >
                        Estimation AI feedback
                      </Button>
                    </Popover>
                  </Space>
                </Space>
              </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            style={{
              ...metricCardStyle,
              background: alignmentSummary.status.cardBackground,
              border: `1px solid ${alignmentSummary.status.cardBorder}`,
              overflow: "hidden",
            }}
            styles={{ body: { padding: 22, fontFamily: '"TT Fors", sans-serif' } }}
          >
            <Space direction="vertical" size={18} style={{ width: "100%", ...dashboardFontStyle }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <Space size={10}>
                  <div style={iconBadgeStyle("#fee2e2", "#dc2626")}>
                    <CheckCircleOutlined />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0, ...dashboardFontStyle }}>
                      Project Requirement Alignment
                    </Title>
                    <Text type="secondary" style={dashboardFontStyle}>Average alignment across all UI canvases.</Text>
                  </div>
                </Space>
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: alignmentSummary.status.chipBackground,
                    color: alignmentSummary.status.chipColor,
                    fontSize: 13,
                    fontWeight: 700,
                    ...dashboardFontStyle,
                  }}
                >
                  {alignmentSummary.status.label}
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 18,
                  background: "#ffffffcc",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <Text strong style={{ color: "#111827", ...dashboardFontStyle }}>Alignment pulse</Text>
                  <Text style={{ color: alignmentSummary.status.chipColor, fontWeight: 700, ...dashboardFontStyle }}>
                    {alignmentSummary.alignmentPercent}% match
                  </Text>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(148, 163, 184, 0.18)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${alignmentSummary.alignmentPercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${alignmentSummary.status.gaugeColor} 0%, ${alignmentSummary.status.chipColor} 100%)`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <Text style={{ marginTop: 10, display: "block", color: "#64748b", ...dashboardFontStyle }}>
                  {alignmentSummary.summaryText}
                </Text>
              </div>

              <Row gutter={[18, 18]} align="middle">
                <Col xs={24} md={11}>
                  <div
                    style={{
                      borderRadius: 24,
                      padding: "18px 12px 12px",
                      background: "rgba(255,255,255,0.72)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      minHeight: 320,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Progress
                        type="dashboard"
                        size={230}
                        percent={alignmentSummary.alignmentPercent}
                        strokeColor={alignmentSummary.status.gaugeColor}
                        trailColor="#ececec"
                        strokeLinecap="round"
                        format={(percent) => (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...dashboardFontStyle }}>
                            <span style={{ fontSize: 40, fontWeight: 700, color: "#111827", lineHeight: 1, ...dashboardFontStyle }}>{percent || 0}%</span>
                            <span style={{ fontSize: 14, color: "#64748b", ...dashboardFontStyle }}>Aligned</span>
                          </div>
                        )}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div
                        style={{
                          borderRadius: 16,
                          padding: "12px 14px",
                          background: "#ffffffd9",
                          border: "1px solid #eef2f7",
                        }}
                      >
                        <Text type="secondary" style={dashboardFontStyle}>Aligned</Text>
                        <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: alignmentSummary.status.gaugeColor, ...dashboardFontStyle }}>
                          {alignmentSummary.alignedCanvases}
                        </div>
                      </div>
                      <div
                        style={{
                          borderRadius: 16,
                          padding: "12px 14px",
                          background: "#ffffffd9",
                          border: "1px solid #eef2f7",
                        }}
                      >
                        <Text type="secondary" style={dashboardFontStyle}>Review</Text>
                        <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                          {alignmentSummary.needsReviewCanvases}
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>

                <Col xs={24} md={13}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div
                      style={{
                        ...snapshotBadgeStyle,
                        background: "#ffffffd9",
                        border: "1px solid #eef2f7",
                        boxShadow: "none",
                      }}
                    >
                      <Text type="secondary" style={dashboardFontStyle}>Alignment Score</Text>
                      <div style={{ marginTop: 8, fontSize: 32, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                        {alignmentSummary.alignmentPercent}%
                      </div>
                      <Text style={{ marginTop: 6, display: "block", color: "#6b7280", ...dashboardFontStyle }}>
                        Project-wide average
                      </Text>
                    </div>

                    <div
                      style={{
                        ...snapshotBadgeStyle,
                        background: "#ffffffd9",
                        border: "1px solid #eef2f7",
                        boxShadow: "none",
                      }}
                    >
                      <Text type="secondary" style={dashboardFontStyle}>Coverage Basis</Text>
                      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                        {alignmentSummary.totalCanvases}
                      </div>
                      <Text style={{ marginTop: 6, display: "block", color: "#6b7280", ...dashboardFontStyle }}>
                        Total UI canvases measured
                      </Text>
                    </div>

                    <div
                      style={{
                        ...snapshotBadgeStyle,
                        background: "#ffffffd9",
                        border: "1px solid #eef2f7",
                        boxShadow: "none",
                      }}
                    >
                      <Text type="secondary" style={dashboardFontStyle}>Aligned Canvases</Text>
                      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: alignmentSummary.status.gaugeColor, ...dashboardFontStyle }}>
                        {alignmentSummary.alignedCanvases}
                      </div>
                      <Text style={{ marginTop: 6, display: "block", color: "#6b7280", ...dashboardFontStyle }}>
                        Estimated aligned set
                      </Text>
                    </div>

                    <div
                      style={{
                        ...snapshotBadgeStyle,
                        background: "#ffffffd9",
                        border: "1px solid #eef2f7",
                        boxShadow: "none",
                      }}
                    >
                      <Text type="secondary" style={dashboardFontStyle}>Needs Review</Text>
                      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                        {alignmentSummary.needsReviewCanvases}
                      </div>
                      <Text style={{ marginTop: 6, display: "block", color: "#6b7280", ...dashboardFontStyle }}>
                        Canvases needing attention
                      </Text>
                    </div>

                    <div
                      style={{
                        ...snapshotBadgeStyle,
                        gridColumn: "1 / -1",
                        background: "#ffffffd9",
                        border: `1px solid ${alignmentSummary.status.cardBorder}`,
                        boxShadow: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <Text type="secondary" style={dashboardFontStyle}>Last review snapshot</Text>
                          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                            {alignmentSummary.coverageBasis}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            background: alignmentSummary.status.chipBackground,
                            color: alignmentSummary.status.chipColor,
                            fontWeight: 700,
                            ...dashboardFontStyle,
                          }}
                        >
                          {formatLongDateTime(dashboardMetrics.projectCompletion.lastCheckDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              {isAdmin ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: "14px 16px",
                    borderRadius: 18,
                    background: "#ffffffcc",
                    border: "1px dashed rgba(239, 68, 68, 0.28)",
                  }}
                >
                  <div style={{ minWidth: 240 }}>
                    <Text strong style={{ display: "block", color: "#111827", ...dashboardFontStyle }}>
                      AI bulk evaluation
                    </Text>
                    <Text style={{ color: "#6b7280", ...dashboardFontStyle }}>
                      Evaluate every UI canvas one by one and track live progress in a popup.
                    </Text>
                  </div>
                  <Button
                    icon={alignmentEvaluationProgress.isRunning ? <LoadingOutlined /> : <CheckCircleOutlined />}
                    onClick={handleEvaluateAllCanvasesWithAI}
                    loading={alignmentEvaluationProgress.isRunning}
                    disabled={!canvasses.length}
                    style={{ ...dashboardFontStyle }}
                    title="Evaluate All Canvases with AI Assistant"
                  >
                    Evaluate All Canvases with AI Assistant
                  </Button>
                </div>
              ) : null}
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Row gutter={[18, 18]}>
            <Col xs={24} xl={snapshotExtra ? 12 : 24}>
              <Card style={metricCardStyle} styles={{ body: { padding: 22, fontFamily: '"TT Fors", sans-serif' } }}>
                <Space direction="vertical" size={18} style={{ width: "100%", ...dashboardFontStyle }}>
                  <Space size={10}>
                    <div style={iconBadgeStyle("#dcfce7", "#16a34a")}>
                      <BarChartOutlined />
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0, ...dashboardFontStyle }}>
                        Snap Shot
                      </Title>
                      <Text type="secondary" style={dashboardFontStyle}>Current total status of execution and delivery.</Text>
                    </div>
                  </Space>

                  <Row gutter={[12, 12]}>
                    <Col span={24}>
                      <div style={snapshotBadgeStyle}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 14, color: "#8c8c8c", ...dashboardFontStyle }}>Spent Hours</span>
                            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "#111827", ...dashboardFontStyle }}>
                              {dashboardMetrics.snapshot.spentHours}
                            </span>
                          </div>
                          <div
                            style={{
                              minWidth: 104,
                              height: 56,
                              borderRadius: 14,
                              background: "#dcfce7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#16a34a",
                              fontSize: 14,
                              fontWeight: 700,
                              ...dashboardFontStyle,
                            }}
                          >
                            Hours
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={24}>
                      <div style={snapshotBadgeStyle}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 14, color: "#8c8c8c", ...dashboardFontStyle }}>Developed Code Lines</span>
                            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "#111827", ...dashboardFontStyle }}>
                              {Math.round(dashboardMetrics.snapshot.developedCodeLines).toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              minWidth: 104,
                              height: 56,
                              borderRadius: 14,
                              background: "#ede9fe",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#7c3aed",
                              fontSize: 14,
                              fontWeight: 700,
                              ...dashboardFontStyle,
                            }}
                          >
                            Lines
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={24}>
                      <div style={snapshotBadgeStyle}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 14, color: "#8c8c8c", ...dashboardFontStyle }}>Project Requirements Alignment</span>
                            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "#111827", ...dashboardFontStyle }}>
                              {dashboardMetrics.snapshot.businessRequirementsAlignment !== null
                                ? formatMetric(dashboardMetrics.snapshot.businessRequirementsAlignment, "%")
                                : "-"}
                            </span>
                          </div>
                          <div
                            style={{
                              minWidth: 104,
                              height: 56,
                              borderRadius: 14,
                              background: "#fee2e2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#dc2626",
                              fontSize: 14,
                              fontWeight: 700,
                              ...dashboardFontStyle,
                            }}
                          >
                            Align
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Space>
              </Card>
            </Col>

            {snapshotExtra ? (
              <Col xs={24} xl={12}>
                {snapshotExtra}
              </Col>
            ) : null}
          </Row>
        </Col>
      </Row>
      </Card>

      <Modal
        open={alignmentModalOpen}
        onCancel={() => {
          if (!alignmentEvaluationProgress.isRunning) {
            setAlignmentModalOpen(false);
          }
        }}
        footer={
          alignmentEvaluationProgress.isRunning
            ? null
            : [
                <Button key="close" onClick={() => setAlignmentModalOpen(false)} style={dashboardFontStyle}>
                  Close
                </Button>,
              ]
        }
        maskClosable={!alignmentEvaluationProgress.isRunning}
        closable={!alignmentEvaluationProgress.isRunning}
        centered
        width={720}
        title={<span style={dashboardFontStyle}>Evaluate All Canvases with AI Assistant</span>}
      >
        <Space direction="vertical" size={18} style={{ width: "100%", ...dashboardFontStyle }}>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 16,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            <Text strong style={{ display: "block", color: "#9a3412", ...dashboardFontStyle }}>
              Do not close this page while the evaluation is running.
            </Text>
            <Text style={{ color: "#7c2d12", ...dashboardFontStyle }}>
              The assistant checks each UI canvas one by one and updates alignment analytics progressively.
            </Text>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <Text strong style={dashboardFontStyle}>{alignmentEvaluationProgress.currentStatus}</Text>
              <Text style={{ color: "#6b7280", ...dashboardFontStyle }}>
                {alignmentEvaluationProgress.completed}/{Math.max(alignmentEvaluationProgress.total, 0)} completed
              </Text>
            </div>
            <Progress
              percent={
                alignmentEvaluationProgress.total > 0
                  ? Math.round((alignmentEvaluationProgress.completed / alignmentEvaluationProgress.total) * 100)
                  : 0
              }
              status={alignmentEvaluationProgress.failed > 0 ? "exception" : alignmentEvaluationProgress.isRunning ? "active" : "success"}
              strokeColor="#ef4444"
            />
          </div>

          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                <Statistic title="Successful" value={alignmentEvaluationProgress.success} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                <Statistic title="Skipped" value={alignmentEvaluationProgress.skipped} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                <Statistic title="Failed" value={alignmentEvaluationProgress.failed} formatter={(value) => <span style={dashboardFontStyle}>{value}</span>} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={metricCardStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
                <Text type="secondary" style={dashboardFontStyle}>Current canvas</Text>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: "#111827", ...dashboardFontStyle }}>
                  {alignmentEvaluationProgress.currentCanvasName || "-"}
                </div>
              </Card>
            </Col>
          </Row>
        </Space>
      </Modal>
    </>
  );
};

export default ProductManagementMetrics;
