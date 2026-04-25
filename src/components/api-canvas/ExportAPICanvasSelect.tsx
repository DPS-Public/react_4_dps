import React, { useMemo, useRef, useState } from "react";
import { Button, Checkbox, Input, message, Modal, Select, Switch } from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  ExportOutlined,
  HistoryOutlined,
  ImportOutlined,
  EyeOutlined,
  RobotOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import useAPICanvasExport from "@/hooks/api-canvas/API/useAPICanvasExport.tsx";
import apiCanvasJsonTemplatePayload from "../../../api_canvas_test.json";
import APICanvasShareModal from "./APICanvasShareModal";

const { Option } = Select;
const { TextArea } = Input;

type ExportActionType =
  | "duplicate"
  | "history"
  | "preview"
  | "ai"
  | "share"
  | "import"
  | "json"
  | "json-template";

interface ExportAPICanvasSelectProps {
  targetRef?: React.RefObject<HTMLElement>;
  data?: Record<string, any>;
  showImportModal?: boolean;
  setShowImportModal?: (value: boolean) => void;
  importDPSFile?: (payload?: any) => void;
  handleImportCancel?: () => void;
  setFileContent?: (value: unknown) => void;
  importLoading?: boolean;
  onDuplicate?: () => void;
  disableDuplicate?: boolean;
  onHistory?: () => void;
  disableHistory?: boolean;
  onPreview?: () => void;
  disablePreview?: boolean;
  onAI?: () => void;
  disableAI?: boolean;
  onAddGithub?: () => void;
  disableAddGithub?: boolean;
}

export default function ExportAPICanvasSelect({
  targetRef,
  data,
  showImportModal,
  setShowImportModal,
  importDPSFile,
  handleImportCancel,
  setFileContent,
  importLoading,
  onDuplicate,
  disableDuplicate,
  onHistory,
  disableHistory,
  onPreview,
  disablePreview,
  onAI,
  disableAI,
}: ExportAPICanvasSelectProps) {
  const [exportType, setExportType] = useState<ExportActionType>();
  const [importJsonText, setImportJsonText] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [importReplaceModes, setImportReplaceModes] = useState({
    description: false,
    input: false,
    requestBody: false,
    operation: false,
    output: false,
    responseBody: false,
  });
  const [selectedExportSections, setSelectedExportSections] = useState<string[]>([
    "description",
    "input",
    "requestBody",
    "operation",
    "output",
    "responseBody",
  ]);
  const { exportCanvas, downloading } = useAPICanvasExport();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportSectionOptions = useMemo(() => ([
    { value: "description", label: "Description" },
    { value: "input", label: "Input Fields" },
    { value: "requestBody", label: "Request Body" },
    { value: "operation", label: "Operation Description" },
    { value: "output", label: "Output Fields" },
    { value: "responseBody", label: "Response Body" },
  ]), []);

  const sanitizedCanvasFileName = useMemo(() => {
    const rawName = String(data?.name || data?.label || "api-canvas").trim();
    const sanitizedName = rawName
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "_")
      .replace(/\.+$/g, "");

    return sanitizedName || "api-canvas";
  }, [data]);

  const handleJsonTextChange = (value: string) => {
    setImportJsonText(value);

    if (!value.trim()) {
      setFileContent?.(null);
      return;
    }

    try {
      const parsedContent = JSON.parse(value);
      setFileContent?.(parsedContent);
    } catch {
      setFileContent?.(null);
    }
  };

  const buildImportPayload = () => {
    if (!importJsonText.trim()) {
      return null;
    }

    try {
      const parsedContent = JSON.parse(importJsonText);

      return {
        ...parsedContent,
        __importModes: importReplaceModes,
      };
    } catch {
      return null;
    }
  };

  const handleDownloadJsonTemplate = () => {
    const jsonString = JSON.stringify(apiCanvasJsonTemplatePayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "DPS_API_Canvas_JSON_Template.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    message.success("JSON template downloaded");
  };

  const buildExportPayload = () => {
    const selectedData = data || {};
    const payload: Record<string, any> = {
      id: selectedData?.id || "",
      name: selectedData?.name || selectedData?.label || "",
      label: selectedData?.label || selectedData?.name || "",
      projectId: selectedData?.projectId || "",
      createdBy: selectedData?.createdBy || "",
      created_at: selectedData?.created_at || "",
      updated_at: selectedData?.updated_at || "",
      createdAt: selectedData?.createdAt || null,
      updatedAt: selectedData?.updatedAt || null,
      type: selectedData?.type || "api",
      apiUrl: selectedData?.apiUrl || selectedData?.url_link || "",
      url_link: selectedData?.url_link || selectedData?.apiUrl || "",
      config: selectedData?.config || {},
      params: selectedData?.params || {},
      created_by: selectedData?.created_by || "",
    };

    if (selectedExportSections.includes("description")) {
      payload.description = selectedData?.description || "";
    }

    if (selectedExportSections.includes("input")) {
      payload.input = selectedData?.input || [];
    }

    if (selectedExportSections.includes("requestBody")) {
      payload.requestBody = selectedData?.requestBody || "";
    }

    if (selectedExportSections.includes("operation")) {
      payload.operation = selectedData?.operation || [];
    }

    if (selectedExportSections.includes("output")) {
      payload.output = selectedData?.output || [];
    }

    if (selectedExportSections.includes("responseBody")) {
      payload.responseBody = selectedData?.responseBody || "";
    }

    return payload;
  };

  const handleExport = async () => {
    if (!selectedExportSections.length) {
      message.warning("Select at least one section to export");
      return;
    }

    await exportCanvas({
      exportType: "json",
      data: buildExportPayload(),
      targetRef,
      filename: `${sanitizedCanvasFileName}.json`,
    });
    setShowExportModal(false);
  };

  const handleChange = (value: ExportActionType) => {
    setExportType(value);

    if (value === "duplicate") {
      onDuplicate?.();
    } else if (value === "history") {
      onHistory?.();
    } else if (value === "preview") {
      onPreview?.();
    } else if (value === "ai") {
      onAI?.();
    } else if (value === "share") {
      setShowShareModal(true);
    } else if (value === "import") {
      setShowImportModal?.(true);
    } else if (value === "json") {
      setShowExportModal(true);
    } else if (value === "json-template") {
      handleDownloadJsonTemplate();
    }

    setTimeout(() => {
      setExportType(undefined);
    }, 300);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".dps,.json"
        onChange={(event) => {
          if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = (loadEvent) => {
              try {
                const content = loadEvent.target?.result;
                const parsedContent = JSON.parse(String(content || ""));
                const normalizedText = JSON.stringify(parsedContent, null, 2);
                handleJsonTextChange(normalizedText);
              } catch (error) {
                message.error("Invalid JSON file format");
                console.error("Error parsing JSON file:", error);
              }
            };

            reader.readAsText(file);
            event.target.value = "";
          }
        }}
      />

      <Select
        placeholder="Action"
        value={exportType}
        onChange={handleChange}
        style={{ width: "140px" }}
        loading={downloading || importLoading}
        suffixIcon={<ExportOutlined />}
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 220 }}
      >
        <Option value="duplicate" disabled={disableDuplicate}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CopyOutlined /> Duplicate
          </span>
        </Option>
        {onPreview && (
          <Option value="preview" disabled={disablePreview}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EyeOutlined /> Live Preview
            </span>
          </Option>
        )}
        {onAI && (
          <Option value="ai" disabled={disableAI}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RobotOutlined /> AI Assistant
            </span>
          </Option>
        )}
        <Option value="share" disabled={!data?.id}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShareAltOutlined /> Share API Canvas
          </span>
        </Option>
        <Option value="import">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ImportOutlined /> Import JSON
          </span>
        </Option>
        <Option value="json">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ExportOutlined /> Export JSON
          </span>
        </Option>
        <Option value="json-template">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DownloadOutlined /> Download JSON Template
          </span>
        </Option>
        <Option value="history" disabled={disableHistory}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HistoryOutlined /> History
          </span>
        </Option>
      </Select>

      <Modal
        title="Import API Canvas"
        open={showImportModal}
        onOk={() => {
          const importPayload = buildImportPayload();

          if (!importPayload) {
            message.error("Please provide valid JSON");
            return;
          }

          setFileContent?.(importPayload);
          importDPSFile?.(importPayload);
        }}
        onCancel={() => {
          handleImportCancel?.();
          setImportJsonText("");
        }}
        confirmLoading={importLoading}
        okText="Import"
        cancelText="Cancel"
        width={600}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ color: "#666" }}>
              Import target: <strong>{data?.name || data?.label || "Selected API Canvas"}</strong>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              Browse
            </Button>
          </div>
          <div style={{ color: "#666", fontSize: 12 }}>
            Supported API sections: `description`, `input`, `requestBody`, `operation`, `output`, `responseBody`
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
            <div style={{ fontWeight: 600 }}>Clean existing section before import</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Description</span>
              <Switch
                checked={importReplaceModes.description}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, description: checked }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Input Fields</span>
              <Switch
                checked={importReplaceModes.input}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, input: checked }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Request Body</span>
              <Switch
                checked={importReplaceModes.requestBody}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, requestBody: checked }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Operation Description</span>
              <Switch
                checked={importReplaceModes.operation}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, operation: checked }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Output Fields</span>
              <Switch
                checked={importReplaceModes.output}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, output: checked }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Response Body</span>
              <Switch
                checked={importReplaceModes.responseBody}
                onChange={(checked) => setImportReplaceModes((prev) => ({ ...prev, responseBody: checked }))}
              />
            </div>
          </div>
          <TextArea
            rows={15}
            value={importJsonText}
            onChange={(event) => handleJsonTextChange(event.target.value)}
            placeholder="Paste or load API canvas JSON here..."
          />
        </div>
      </Modal>

      <Modal
        title="Export API Canvas JSON"
        open={showExportModal}
        onOk={handleExport}
        onCancel={() => setShowExportModal(false)}
        okText="Export"
        cancelText="Cancel"
        confirmLoading={downloading}
      >
        <div style={{ color: "#666", marginBottom: 12 }}>
          File name: <strong>{sanitizedCanvasFileName}.json</strong>
        </div>
        <Checkbox.Group
          value={selectedExportSections}
          onChange={(checkedValues) => setSelectedExportSections(checkedValues as string[])}
          style={{ width: "100%" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {exportSectionOptions.map((item) => (
              <Checkbox key={item.value} value={item.value}>
                {item.label}
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      </Modal>

      {/* Share API Canvas Modal */}
      <APICanvasShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        canvasId={data?.id || ""}
        canvasTitle={data?.name || data?.label || "API Canvas"}
        currentIsShared={(data as any)?.isShared || false}
        currentShareToken={(data as any)?.shareToken || ""}
      />
    </>
  );
}
