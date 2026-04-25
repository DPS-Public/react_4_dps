import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spin, Empty, Alert, Layout, Descriptions, Tag, Typography, Collapse } from "antd";
import { query, collection, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/config/firebase";
import { ApiOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Panel } = Collapse;

/**
 * Public read-only view for shared API Canvas
 * Route: /api-canvas/share/:shareToken
 */
export default function SharedAPICanvasView() {
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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlHeight = html.style.height;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyHeight = body.style.height;
    const previousRootOverflow = root?.style.overflow ?? "";
    const previousRootHeight = root?.style.height ?? "";

    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "auto";
    body.style.height = "auto";

    if (root) {
      root.style.overflow = "visible";
      root.style.height = "auto";
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.height = previousHtmlHeight;
      body.style.overflow = previousBodyOverflow;
      body.style.height = previousBodyHeight;

      if (root) {
        root.style.overflow = previousRootOverflow;
        root.style.height = previousRootHeight;
      }
    };
  }, []);

  const loadSharedCanvas = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "api_canvas"),
        where("shareToken", "==", shareToken),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("API Canvas not found or no longer shared");
        return;
      }

      const canvasDoc = querySnapshot.docs[0];
      const canvasData = canvasDoc.data();

      // Check if the canvas is actually shared
      if (!canvasData?.isShared) {
        setError("API Canvas not found or no longer shared");
        return;
      }

      setCanvas({ id: canvasDoc.id, ...canvasData });
    } catch (err) {
      console.error("❌ Error loading shared API canvas:", err);
      setError(`Failed to load API canvas. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Header style={{ backgroundColor: "#001529" }} />
        <Content style={{ padding: "50px 20px" }}>
          <Empty description={error || "API Canvas not found"} style={{ marginTop: 100 }} />
        </Content>
      </Layout>
    );
  }

  const methodColors: Record<string, string> = {
    GET: "green",
    POST: "blue",
    PUT: "orange",
    PATCH: "geekblue",
    DELETE: "red",
  };

  const method = canvas?.config?.method || canvas?.method || "";

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#f5f7fa" }}>
      <Header
        style={{
          backgroundColor: "#001529",
          color: "white",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ApiOutlined style={{ fontSize: 20, color: "#1890ff" }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>
          {canvas.name || canvas.label || "API Canvas"}
        </span>
        {method && (
          <Tag color={methodColors[method] || "default"} style={{ marginLeft: 8, fontWeight: 600 }}>
            {method}
          </Tag>
        )}
      </Header>

      <Content
        style={{
          padding: "24px",
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Alert
          message="Read-only Mode"
          description="This is a read-only view of a shared API canvas. You cannot make changes."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Collapse defaultActiveKey={["overview", "input", "output", "operation", "requestBody", "responseBody"]} bordered={false}>

          {/* Overview */}
          <Panel header={<strong>Overview</strong>} key="overview">
            <Descriptions column={1} bordered size="small">
              {canvas.name && <Descriptions.Item label="Name">{canvas.name}</Descriptions.Item>}
              {canvas.description && <Descriptions.Item label="Description">{canvas.description}</Descriptions.Item>}
              {(canvas.apiUrl || canvas.url_link) && (
                <Descriptions.Item label="URL">
                  <Text code copyable>{canvas.apiUrl || canvas.url_link}</Text>
                </Descriptions.Item>
              )}
              {method && (
                <Descriptions.Item label="Method">
                  <Tag color={methodColors[method] || "default"}>{method}</Tag>
                </Descriptions.Item>
              )}
              {canvas.config?.localUrl && (
                <Descriptions.Item label="Local URL">
                  <Text code>{canvas.config.localUrl}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Panel>

          {/* Input Parameters */}
          {Array.isArray(canvas.input) && canvas.input.length > 0 && (
            <Panel header={<strong>Input Parameters ({canvas.input.length})</strong>} key="input">
              <Descriptions column={1} bordered size="small">
                {canvas.input.map((item: any, i: number) => (
                  <Descriptions.Item key={i} label={<Text code>{item.name}</Text>}>
                    {item.description || "-"}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Panel>
          )}

          {/* Output Fields */}
          {Array.isArray(canvas.output) && canvas.output.length > 0 && (
            <Panel header={<strong>Output Fields ({canvas.output.length})</strong>} key="output">
              <Descriptions column={1} bordered size="small">
                {canvas.output.map((item: any, i: number) => (
                  <Descriptions.Item key={i} label={<Text code>{item.name}</Text>}>
                    {item.description || "-"}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Panel>
          )}

          {/* Operations */}
          {Array.isArray(canvas.operation) && canvas.operation.length > 0 && (
            <Panel header={<strong>Operations ({canvas.operation.length})</strong>} key="operation">
              <Descriptions column={1} bordered size="small">
                {canvas.operation.map((item: any, i: number) => (
                  <Descriptions.Item key={i} label={<Tag>{item.type}</Tag>}>
                    {item.description || "-"}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Panel>
          )}

          {/* Request Body */}
          {canvas.requestBody && (
            <Panel header={<strong>Request Body</strong>} key="requestBody">
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 6,
                  overflowX: "auto",
                  fontSize: 13,
                }}
              >
                {canvas.requestBody}
              </pre>
            </Panel>
          )}

          {/* Response Body */}
          {canvas.responseBody && (
            <Panel header={<strong>Response Body</strong>} key="responseBody">
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 6,
                  overflowX: "auto",
                  fontSize: 13,
                }}
              >
                {canvas.responseBody}
              </pre>
            </Panel>
          )}
        </Collapse>

        {canvas.sharedAt && (
          <p style={{ marginTop: 20, fontSize: 12, color: "#999", textAlign: "right" }}>
            Shared on: {new Date(canvas.sharedAt).toLocaleString()}
          </p>
        )}
      </Content>
    </Layout>
  );
}
