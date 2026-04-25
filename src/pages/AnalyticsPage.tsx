import React, { useEffect, useState } from "react";
import { Alert, Card, Empty, Spin } from "antd";
import { doc, getDoc } from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "@/config/firebase";
import type { RootState } from "@/store";
import UICanvasAnalyticsPanel from "@/ui-canvas/uic_ui_canvas/components/UICanvasAnalyticsPanel";
import { normalizeDigitalServiceJson } from "@/utils/ui-canvas/normalizeDigitalServiceJson";
import type { UICanvasData } from "@/ui-canvas/uic_ui_canvas/types/UICanvasData.interface";

type AnalyticsViewKey = "general" | "reports" | "assignee";

interface AnalyticsPageProps {
  view: AnalyticsViewKey;
}

export default function AnalyticsPage({ view }: AnalyticsPageProps) {
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [uiList, setUiList] = useState<UICanvasData[]>([]);
  const [selectedUI, setSelectedUI] = useState<UICanvasData | null>(null);
  const [selectedUICanvasId, setSelectedUICanvasId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalyticsContext = async () => {
      if (!currentProject?.id) {
        setUiList([]);
        setSelectedUI(null);
        setSelectedUICanvasId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(undefined);

        const projectDocRef = doc(db, "projects", currentProject.id);
        const projectSnapshot = await getDoc(projectDocRef);
        const digitalServiceJson = projectSnapshot.get("digital_service_json");
        const nextUiList = normalizeDigitalServiceJson(digitalServiceJson) as UICanvasData[];
        const storedCanvasId = localStorage.getItem("currentUI");
        const nextSelectedId =
          (storedCanvasId && nextUiList.find((item) => item.id === storedCanvasId)?.id) ||
          nextUiList[0]?.id ||
          "";

        if (cancelled) {
          return;
        }

        setUiList(nextUiList);
        setSelectedUICanvasId(nextSelectedId || null);

        if (!nextSelectedId) {
          setSelectedUI(null);
          return;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", nextSelectedId);
        const uiCanvasSnapshot = await getDoc(uiCanvasDocRef);

        if (cancelled) {
          return;
        }

        if (!uiCanvasSnapshot.exists()) {
          setSelectedUI(null);
          return;
        }

        const uiCanvasData = uiCanvasSnapshot.data();
        setSelectedUI({
          ...uiCanvasData,
          id: nextSelectedId,
          input: uiCanvasData?.input?.[nextSelectedId] ?? {},
          label: uiCanvasData?.label || nextUiList.find((item) => item.id === nextSelectedId)?.label || nextSelectedId,
        } as UICanvasData);
      } catch (nextError: any) {
        if (!cancelled) {
          setError(nextError?.message || "Failed to load analytics page");
          setSelectedUI(null);
          setSelectedUICanvasId(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalyticsContext();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id]);

  const emptyStateCopy = {
    general: {
      title: "No UI canvas analytics yet",
      message: "Create your first UI canvas to start seeing analytics and project insights here.",
    },
    reports: {
      title: "No reports available yet",
      message: "UI Canvas Reports will appear here after you create at least one UI canvas in this project.",
    },
    assignee: {
      title: "No assignee analytics yet",
      message: "Assign backlog work to team members and link it to UI canvases to see assignee analytics here.",
    },
  } as const;

  const currentEmptyState = emptyStateCopy[view];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100%" }}>
      <Card
        style={{ borderRadius: 16, background: "#eef1f5", border: "0px solid transparent", boxShadow: "none" }}
        styles={{ body: { padding: 20 } }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Spin />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} />
        ) : !currentProject?.id ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a project to view analytics" />
        ) : uiList.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Alert
              type="info"
              showIcon
              message={currentEmptyState.title}
              description={currentEmptyState.message}
            />
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={currentEmptyState.title} />
          </div>
        ) : (
          <UICanvasAnalyticsPanel
            selectedUICanvasId={selectedUICanvasId}
            selectedUI={selectedUI}
            uiList={uiList}
            projectId={currentProject.id}
            fixedView={view}
          />
        )}
      </Card>
    </div>
  );
}
