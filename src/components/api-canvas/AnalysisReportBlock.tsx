import React from "react";
import { Space, Typography } from "antd";
import type { CSSProperties } from "react";
import { ArrowRightOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface AnalysisReportBlockProps {
  currentState: string;
  threats: string;
  suggestions: string;
  riskRate: number;
  extra?: React.ReactNode;
  color?: string; // e.g., "#1677ff", "#52c41a"
}

function enhanceSuggestionsAction(action: React.ReactNode, accentColor: string) {
  if (!React.isValidElement(action)) {
    return action;
  }

  const element = action as React.ReactElement<Record<string, unknown>>;
  const existingStyle = (element.props.style as CSSProperties | undefined) || {};

  return React.cloneElement(element, {
    icon: <ArrowRightOutlined />,
    className: [element.props.className, "analysis-apply-button"].filter(Boolean).join(" "),
    style: {
      ...existingStyle,
      height: 34,
      padding: "0 14px",
      borderRadius: 999,
      border: "none",
      background: `linear-gradient(135deg, ${accentColor} 0%, #4096ff 100%)`,
      boxShadow: "0 10px 24px rgba(22, 119, 255, 0.24)",
      color: "#fff",
      fontWeight: 700,
      letterSpacing: "0.2px",
    },
  });
}

function getAccuracyLevelColor(accuracyLevel: number) {
  if (accuracyLevel >= 80) return "#52c41a";
  if (accuracyLevel >= 60) return "#1677ff";
  if (accuracyLevel >= 40) return "#faad14";
  return "#ff4d4f";
}

function RiskRateBadge({ riskRate }: { riskRate: number }) {
  const safeRiskRate = Math.max(0, Math.min(100, Math.round(riskRate ?? 25)));
  const accuracyLevel = Math.max(0, Math.min(100, 100 - safeRiskRate));
  const color = getAccuracyLevelColor(accuracyLevel);
  const progressDegrees = Math.round((accuracyLevel / 100) * 360);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 150,
        padding: "6px 10px 8px",
        borderRadius: 14,
        border: `1px solid ${color}33`,
        background: `${color}14`,
        color,
        fontWeight: 600,
        animation: "riskPulse 1.8s ease-in-out infinite",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            position: "relative",
            width: 18,
            height: 18,
            minWidth: 18,
            borderRadius: "50%",
            background: `conic-gradient(${color} 0deg ${progressDegrees}deg, ${color}22 ${progressDegrees}deg 360deg)`,
            boxShadow: `0 0 0 0 ${color}66`,
            animation: "riskDotPulse 1.8s ease-in-out infinite",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              background: "#fff8",
            }}
          />
        </span>
        {`Accuracy Level: ${accuracyLevel}%`}
      </div>

      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 999,
          background: `${color}22`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${accuracyLevel}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${color}99 0%, ${color} 100%)`,
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}

function AnalysisBox({
  label,
  content,
  color,
  extra,
  isSuggestions = false,
}: {
  label: string;
  content: string;
  color: string;
  extra?: React.ReactNode;
  isSuggestions?: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        border: `1px solid ${color}44`,
        borderRadius: 8,
        background: `${color}08`,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <Text
          strong
          style={{
            color: color,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </Text>
        {extra && !isSuggestions && extra}
      </div>
      
      {isSuggestions ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 14,
          }}
        >
          <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#333", display: "block" }}>
            {content || "—"}
          </Text>
          {extra && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {extra}
            </div>
          )}
        </div>
      ) : (
        <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#333" }}>
          {content || "—"}
        </Text>
      )}
    </div>
  );
}

export default function AnalysisReportBlock({
  currentState,
  threats,
  suggestions,
  riskRate,
  extra,
  color = "#1677ff",
}: AnalysisReportBlockProps) {
  const boxColors = {
    current: color,
    risks: "#ff4d4f",
    suggestions: "#52c41a",
  };
  const suggestionsAction = enhanceSuggestionsAction(extra, color);

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `2px solid #f0f0f0`,
        background: "#fafafa",
      }}
    >
      {/* ANALYSIS REPORT Header */}
      <div
        style={{
          padding: "12px 16px",
          background: color,
          textAlign: "center",
        }}
      >
        <Text
          strong
          style={{
            color: "#fff",
            fontSize: 14,
            letterSpacing: "1px",
            textTransform: "uppercase",
            display: "block",
          }}
        >
          ANALYSIS REPORT
        </Text>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <AnalysisBox
            label="Current Status"
            content={currentState}
            color={boxColors.current}
          />

          <AnalysisBox
            label="Risks / Threats"
            content={threats}
            color={boxColors.risks}
            extra={<RiskRateBadge riskRate={riskRate} />}
          />

          <AnalysisBox
            label="Suggestions"
            content={suggestions}
            color={boxColors.suggestions}
            isSuggestions={true}
            extra={suggestionsAction}
          />
        </Space>
      </div>

      <style>{`
        @keyframes riskPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes riskDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 0 4px currentColor; }
        }
        @keyframes applyButtonFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        .analysis-apply-button {
          animation: applyButtonFloat 2.4s ease-in-out infinite;
        }
        .analysis-apply-button:hover,
        .analysis-apply-button:focus {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 14px 28px rgba(22, 119, 255, 0.32) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
