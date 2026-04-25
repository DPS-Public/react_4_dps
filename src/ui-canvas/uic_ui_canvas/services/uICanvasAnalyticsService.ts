import { db } from "@/config/firebase";
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

export interface UICanvasAnalytics {
  estimatedHours?: number | null;
  estimatedHoursLastEstimatedAt?: string | null;
  spentHours?: number;
  estimatedCodeLines?: number | null;
  estimatedCodeLinesLastEstimatedAt?: string | null;
  developedCodeLines?: number;
  businessRequirementsAlignmentRate?: number | null;
  businessRequirementsAlignmentLastCheckedAt?: string | null;
  businessRequirementsAlignmentNote?: string;
  updatedAt?: string;
}

const toSafeNumber = (value: unknown) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
};

const roundMetric = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const normalizeAnalytics = (value: any): UICanvasAnalytics => ({
  estimatedHours: value?.estimatedHours ?? null,
  estimatedHoursLastEstimatedAt: value?.estimatedHoursLastEstimatedAt || null,
  spentHours: toSafeNumber(value?.spentHours),
  estimatedCodeLines: value?.estimatedCodeLines ?? null,
  estimatedCodeLinesLastEstimatedAt: value?.estimatedCodeLinesLastEstimatedAt || null,
  developedCodeLines: toSafeNumber(value?.developedCodeLines),
  businessRequirementsAlignmentRate: value?.businessRequirementsAlignmentRate ?? null,
  businessRequirementsAlignmentLastCheckedAt: value?.businessRequirementsAlignmentLastCheckedAt || null,
  businessRequirementsAlignmentNote: value?.businessRequirementsAlignmentNote || "",
  updatedAt: value?.updatedAt || null,
});

export const subscribeUICanvasAnalytics = (
  uiCanvasId: string,
  onData: (analytics: UICanvasAnalytics) => void,
  onError?: (error: Error) => void,
) => {
  return onSnapshot(
    doc(db, "ui_canvas", uiCanvasId),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      onData(normalizeAnalytics(data?.analytics));
    },
    (error) => onError?.(error),
  );
};

export const mergeUICanvasAnalytics = async (
  uiCanvasId: string,
  patch: Partial<UICanvasAnalytics>,
) => {
  const canvasRef = doc(db, "ui_canvas", uiCanvasId);
  const canvasSnapshot = await getDoc(canvasRef);
  const currentAnalytics = normalizeAnalytics(canvasSnapshot.exists() ? canvasSnapshot.data()?.analytics : {});
  const nextAnalytics: UICanvasAnalytics = {
    ...currentAnalytics,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (canvasSnapshot.exists()) {
    await updateDoc(canvasRef, { analytics: nextAnalytics });
    return nextAnalytics;
  }

  await setDoc(canvasRef, { analytics: nextAnalytics }, { merge: true });
  return nextAnalytics;
};

export const getUICanvasBacklogIssues = async (projectId: string, uiCanvasId: string) => {
  const snapshot = await getDocs(collection(db, `backlog_${projectId}`));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((issue: any) => {
      const relatedCanvasId = String(
        issue?.uiCanvasId
        || issue?.ui_canvas_id
        || issue?.uiId
        || issue?.uiCanvas
        || "",
      ).trim();

      return relatedCanvasId === uiCanvasId;
    });
};

export const calculateUICanvasBacklogMetrics = async (projectId: string, uiCanvasId: string) => {
  const issues = await getUICanvasBacklogIssues(projectId, uiCanvasId);

  const spentHours = roundMetric(
    issues.reduce((total: number, issue: any) => total + toSafeNumber(issue?.sh), 0),
  );

  const developedCodeLines = Math.round(
    issues.reduce((total: number, issue: any) => {
      const issueCodeLine = toSafeNumber(
        issue?.codeLine
        ?? issue?.insertedLine
        ?? issue?.modifiedLine,
      );
      return total + issueCodeLine;
    }, 0),
  );

  return {
    spentHours,
    developedCodeLines,
    issueCount: issues.length,
    issues,
  };
};

export const syncUICanvasBacklogMetrics = async (projectId: string, uiCanvasId: string) => {
  if (!projectId || !uiCanvasId) {
    return null;
  }

  const metrics = await calculateUICanvasBacklogMetrics(projectId, uiCanvasId);
  const analytics = await mergeUICanvasAnalytics(uiCanvasId, {
    spentHours: metrics.spentHours,
    developedCodeLines: metrics.developedCodeLines,
  });

  return { ...metrics, analytics };
};
