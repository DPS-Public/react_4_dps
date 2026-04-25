import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const { Paragraph, Text, Title } = Typography;

interface FirstCanvasSetupCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  onCreate: () => void;
  icon: React.ReactNode;
  helperText?: string;
  minHeight?: number;
}

export default function FirstCanvasSetupCard({
  title,
  description,
  buttonLabel,
  onCreate,
  icon,
  helperText = "After you create it, it will be selected automatically in the dropdown.",
  minHeight = 420,
}: FirstCanvasSetupCardProps) {
  return (
    <Card
      style={{
        borderRadius: 20,
        border: "1px solid #e5e7eb",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
      }}
      styles={{ body: { padding: 32 } }}
    >
      <div
        style={{
          minHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Space direction="vertical" size={18} style={{ maxWidth: 520, width: "100%" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eff6ff",
              color: "#1677ff",
              fontSize: 34,
            }}
          >
            {icon}
          </div>

          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              {title}
            </Title>
            <Paragraph style={{ margin: 0, color: "#64748b", fontSize: 15, lineHeight: 1.7 }}>
              {description}
            </Paragraph>
          </div>

          <div>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={onCreate}>
              {buttonLabel}
            </Button>
          </div>

          <Text type="secondary" style={{ fontSize: 13 }}>
            {helperText}
          </Text>
        </Space>
      </div>
    </Card>
  );
}
