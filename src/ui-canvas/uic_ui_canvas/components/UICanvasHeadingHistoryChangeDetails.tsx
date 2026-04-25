import React, { useMemo, useState } from "react";
import { Avatar, Space, Tag, Typography } from "antd";
import { GithubOutlined, UserOutlined } from "@ant-design/icons";
import { utilFormatFieldName } from "../utils/utilFormatFieldName";
import UICanvasHeadingHistoryChangeDetailsProps from "../types/UICanvasHeadingHistoryChangeDetailsProps.interface";

const { Text } = Typography;



export default function UICanvasHeadingHistoryChangeDetails({
  change,
}: UICanvasHeadingHistoryChangeDetailsProps) {
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const changeKey = useMemo(() => {
    const timestampPart =
      change?.timestamp?.seconds ||
      change?.timestamp?._seconds ||
      change?.timestamp ||
      "";
    return `${change?.id || change?.fieldName || change?.actionType || "change"}-${timestampPart}`;
  }, [change]);

  const normalizeValue = (value: unknown): string => {
    if (value === undefined || value === null) {
      return "Empty";
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || "Empty";
    }

    if (typeof value === "object") {
      try {
        const serialized = JSON.stringify(value);
        return serialized?.trim() || "Empty";
      } catch {
        return String(value).trim() || "Empty";
      }
    }

    return String(value).trim() || "Empty";
  };

  const renderExpandableValue = (value: unknown, fieldKey: string, strong = false) => {
    const text = normalizeValue(value);
    const isLong = text.length > 300;
    const isExpanded = !!expandedFields[fieldKey];
    const displayText = isLong && !isExpanded ? `${text.slice(0, 300)}...` : text;

    return (
      <Text
        strong={strong}
        style={{
          fontSize: "12px",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {displayText}
        {isLong && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpandedFields((prev) => ({
                ...prev,
                [fieldKey]: !prev[fieldKey],
              }));
            }}
            style={{
              marginLeft: 6,
              color: "#1677ff",
              cursor: "pointer",
              userSelect: "none",
              fontWeight: 500,
            }}
          >
            {isExpanded ? "(less)" : "(more)"}
          </span>
        )}
      </Text>
    );
  };

  return (
    <Space direction="vertical" style={{ width: "100%", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar size="small" icon={<UserOutlined />} />
        <Text strong>{change.userName || "Unknown User"}</Text>
        {change.userEmail && <Text type="secondary">({change.userEmail})</Text>}
      </div>

      {change.fieldName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text type="secondary">Field:</Text>
          <Tag>{utilFormatFieldName(change.fieldName)}</Tag>
        </div>
      )}

      {change.githubUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GithubOutlined />
          <Text>{change.githubUrl.filePath}</Text>
        </div>
      )}

      {change.oldValue !== undefined && (
        <div>
          <Text type="secondary">Old Value:</Text>
          <div style={{ marginTop: 4 }}>
            {renderExpandableValue(change.oldValue, `${changeKey}-old`) }
          </div>
        </div>
      )}

      {change.newValue !== undefined && (
        <div>
          <Text type="secondary">New Value:</Text>
          <div style={{ marginTop: 4 }}>
            {renderExpandableValue(change.newValue, `${changeKey}-new`, true)}
          </div>
        </div>
      )}
    </Space>
  );
}
