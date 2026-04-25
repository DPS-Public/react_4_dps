import React from "react";
import { Card, Descriptions, Empty, Modal, Space, Tag, Typography } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import type { APIEndpoint } from "@/hooks/api-canvas/types";

const { Paragraph, Text, Title } = Typography;

interface APICanvasLivePreviewModalProps {
  open: boolean;
  onClose: () => void;
  selectedEndpoint: APIEndpoint | null | undefined;
}

function prettyPrint(value: unknown) {
  if (typeof value === "string") {
    return value || "{}";
  }

  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function renderKeyValueRows(items: Array<{ name: string; description: string }> | undefined, emptyLabel: string) {
  if (!items?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          style={{
            padding: 12,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            background: "#fafafa",
          }}
        >
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="blue">{index + 1}</Tag>
              <Text strong>{item.name || "-"}</Text>
            </Space>
            <Text>{item.description || "No description"}</Text>
          </Space>
        </div>
      ))}
    </div>
  );
}

function renderOperationRows(
  items: Array<{ type: string; description: string }> | undefined,
  emptyLabel: string,
) {
  if (!items?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item, index) => (
        <div
          key={`${item.type}-${index}`}
          style={{
            padding: 12,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            background: "#fafafa",
          }}
        >
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="purple">{item.type || "common"}</Tag>
              <Text strong>{`Step ${index + 1}`}</Text>
            </Space>
            <Text>{item.description || "No description"}</Text>
          </Space>
        </div>
      ))}
    </div>
  );
}

export default function APICanvasLivePreviewModal({
  open,
  onClose,
  selectedEndpoint,
}: APICanvasLivePreviewModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      title={
        <Space>
          <ApiOutlined />
          <span>API Canvas Live Preview</span>
        </Space>
      }
      destroyOnClose
    >
      {!selectedEndpoint ? (
        <Empty description="No API canvas selected" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card>
            <Descriptions column={2} size="middle">
              <Descriptions.Item label="Name">{selectedEndpoint.name}</Descriptions.Item>
              <Descriptions.Item label="Method">
                <Tag color="blue">{selectedEndpoint.config?.method || "-"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Local URL">
                <Text copyable>{selectedEndpoint.config?.localUrl || "-"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="File Path">
                <Text copyable>{selectedEndpoint.config?.filePath || "-"}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Description">
            {selectedEndpoint.description ? (
              <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                {selectedEndpoint.description}
              </Paragraph>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No description" />
            )}
          </Card>

          <Card title="Input Fields">
            {renderKeyValueRows(selectedEndpoint.input, "No input fields")}
          </Card>

          <Card title="Request Body">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {prettyPrint(selectedEndpoint.requestBody)}
            </pre>
          </Card>

          <Card title="Operation Description">
            {renderOperationRows(selectedEndpoint.operation, "No operations")}
          </Card>

          <Card title="Output Fields">
            {renderKeyValueRows(selectedEndpoint.output, "No output fields")}
          </Card>

          <Card title="Response Body">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {prettyPrint(selectedEndpoint.responseBody)}
            </pre>
          </Card>
        </Space>
      )}
    </Modal>
  );
}
