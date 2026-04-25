import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spin, Empty, Alert, Layout } from "antd";
import { query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import UICanvas from "@/ui-canvas/uic_ui_canvas/uicUICanvas";

const { Header, Content } = Layout;

/**
 * Public read-only view for shared UI Canvas
 * Route: /share-canvas/:shareToken
 */
export default function SharedCanvasView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [canvas, setCanvas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    loadSharedCanvas();
  }, [shareToken]);

  const loadSharedCanvas = async () => {
    try {
      setLoading(true);

      // Query to find canvas by shareToken
      const q = query(
        collection(db, "ui_canvas"),
        where("shareToken", "==", shareToken),
        where("isShared", "==", true)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Canvas not found or no longer shared");
        return;
      }

      const canvasDoc = querySnapshot.docs[0];
      const canvasData = canvasDoc.data();

      setCanvas({
        id: canvasDoc.id,
        ...canvasData,
      });
    } catch (err) {
      console.error("❌ Error loading shared canvas:", err);
      setError("Failed to load canvas. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Spin size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />
    );
  }

  if (error || !canvas) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Header style={{ backgroundColor: "#001529" }} />
        <Content style={{ padding: "50px 20px" }}>
          <Empty
            description={error || "Canvas not found"}
            style={{ marginTop: 100 }}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ backgroundColor: "#001529", color: "white", padding: "0 20px", display: "flex", alignItems: "center" }}>
        <h2 style={{ color: "white", margin: 0 }}>📖 {canvas.name || canvas.title || "Shared Canvas"}</h2>
      </Header>

      <Content style={{ padding: "20px", height: "calc(100vh - 64px)", overflowY: "auto" }}>
        <Alert
          message="Read-only Mode"
          description="This is a read-only preview of a shared canvas. You cannot make changes."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <div
          style={{
            backgroundColor: "white",
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #f0f0f0",
            minHeight: "500px",
          }}
        >
          <UICanvas
            previewMode={true}
            forcedCanvasId={canvas.id}
          />
        </div>

        {canvas.sharedAt && (
          <p style={{ marginTop: 20, fontSize: 12, color: "#999" }}>
            Shared on: {new Date(canvas.sharedAt).toLocaleString()}
          </p>
        )}
      </Content>
    </Layout>
  );
}
