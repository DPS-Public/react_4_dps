import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Divider,
  Drawer,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DownOutlined,
  HistoryOutlined,
  RobotOutlined,
  SearchOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { generateVertexJsonPayload } from "@/components/ui-canvas/UICanvasAIDrawer/vertexAIGeminiClient";
import type { APIEndpoint } from "@/hooks/api-canvas/types";

const { TextArea } = Input;
const { Paragraph, Text, Title } = Typography;
const { Panel } = Collapse;
const PROMPT_HISTORY_LIMIT = 10;
const DEFAULT_PREVIEW_ACTIVE_KEYS: DraftSectionKey[] = ["description", "input", "requestBody", "operation", "output", "responseBody"];

interface APICanvasAIDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenAnalyzer: () => void;
  selectedEndpoint: APIEndpoint | null | undefined;
  updateEndpoint: (endpoint: APIEndpoint) => Promise<void>;
}

interface GeneratedAPICanvasDraft {
  description: string;
  input: Array<{ name: string; description: string }>;
  requestBody: Record<string, unknown> | string;
  operation: Array<{ type: APIEndpoint["operation"][number]["type"]; description: string }>;
  output: Array<{ name: string; description: string }>;
  responseBody: Record<string, unknown> | string;
}

interface PromptHistoryItem {
  id: string;
  text: string;
  updatedAt: string;
  endpointId?: string;
  endpointName?: string;
}

type DraftSectionKey = "description" | "input" | "requestBody" | "operation" | "output" | "responseBody";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeObjectOrString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeArrayItems(items: unknown): Array<{ name: string; description: string }> {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: normalizeText((item as Record<string, unknown>)?.name),
      description: normalizeText((item as Record<string, unknown>)?.description),
    }))
    .filter((item) => item.name || item.description);
}

function normalizeOperationItems(items: unknown): GeneratedAPICanvasDraft["operation"] {
  if (!Array.isArray(items)) {
    return [];
  }

  const allowedTypes = new Set([
    "selectdata",
    "insertdata",
    "updatedata",
    "deletedata",
    "json",
    "common",
  ]);

  return items
    .map((item) => {
      const rawType = normalizeText((item as Record<string, unknown>)?.type).toLowerCase();
      const type = allowedTypes.has(rawType) ? rawType : "common";
      const description = normalizeText((item as Record<string, unknown>)?.description);

      return {
        type: type as GeneratedAPICanvasDraft["operation"][number]["type"],
        description,
      };
    })
    .filter((item) => item.description);
}

function normalizeDraft(payload: unknown): GeneratedAPICanvasDraft {
  const source = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  return {
    description: normalizeText(source.description),
    input: normalizeArrayItems(source.input),
    requestBody: normalizeObjectOrString(source.requestBody),
    operation: normalizeOperationItems(source.operation),
    output: normalizeArrayItems(source.output),
    responseBody: normalizeObjectOrString(source.responseBody),
  };
}

function stringifySection(value: unknown) {
  if (typeof value === "string") {
    return value || "{}";
  }

  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function getPromptHistoryStorageKey() {
  return "api_canvas_ai_prompt_history";
}

function normalizePromptHistoryItems(items: unknown): PromptHistoryItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;

      return {
        id: String(record.id || `api_prompt_${index}`),
        text: normalizeText(record.text),
        updatedAt: normalizeText(record.updatedAt),
        endpointId: normalizeText(record.endpointId),
        endpointName: normalizeText(record.endpointName),
      };
    })
    .filter((item) => item.text)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, PROMPT_HISTORY_LIMIT);
}

function truncatePromptHistoryText(text: string, limit = 180) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}...`;
}

function buildPromptEnvelope(selectedEndpoint: APIEndpoint, prompt: string) {
  return JSON.stringify(
    {
      task: "generate_api_canvas_six_blocks",
      instructions: [
        "Return only valid JSON.",
        "Generate exactly these keys: description, input, requestBody, operation, output, responseBody.",
        "Input and output must be arrays of objects with name and description.",
        "Operation must be an array of objects with type and description.",
        "Allowed operation.type values: selectdata, insertdata, updatedata, deletedata, json, common.",
        "requestBody and responseBody may be JSON objects or strings.",
        "Keep the answer practical and ready to apply into an API canvas.",
      ],
      endpointContext: {
        id: selectedEndpoint.id,
        name: selectedEndpoint.name,
        config: selectedEndpoint.config,
        description: selectedEndpoint.description || "",
        input: selectedEndpoint.input || [],
        operation: selectedEndpoint.operation || [],
        output: selectedEndpoint.output || [],
        requestBody: selectedEndpoint.requestBody || "",
        responseBody: selectedEndpoint.responseBody || "",
      },
      userPrompt: prompt,
      responseShape: {
        description: "string",
        input: [{ name: "string", description: "string" }],
        requestBody: {},
        operation: [{ type: "common", description: "string" }],
        output: [{ name: "string", description: "string" }],
        responseBody: {},
      },
    },
    null,
    2,
  );
}

export default function APICanvasAIDrawer({
  open,
  onClose,
  onOpenAnalyzer,
  selectedEndpoint,
  updateEndpoint,
}: APICanvasAIDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<"all" | DraftSectionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedAPICanvasDraft | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [includeCurrentCanvasJson, setIncludeCurrentCanvasJson] = useState(true);
  const [relatedCanvasJson, setRelatedCanvasJson] = useState("");
  const [previewActiveKeys, setPreviewActiveKeys] = useState<DraftSectionKey[]>(DEFAULT_PREVIEW_ACTIVE_KEYS);

  const canGenerate = Boolean(selectedEndpoint?.id) && Boolean(prompt.trim()) && !loading;

  const sectionCount = useMemo(() => {
    if (!draft) {
      return 0;
    }

    return [
      draft.description ? 1 : 0,
      draft.input.length ? 1 : 0,
      draft.requestBody ? 1 : 0,
      draft.operation.length ? 1 : 0,
      draft.output.length ? 1 : 0,
      draft.responseBody ? 1 : 0,
    ].reduce((sum, item) => sum + item, 0);
  }, [draft]);

  const resetState = () => {
    setPrompt("");
    setLoading(false);
    setApplyingTarget(null);
    setError(null);
    setDraft(null);
    setIsHistoryOpen(false);
    setIsAssistantOpen(false);
    setIncludeCurrentCanvasJson(true);
    setRelatedCanvasJson("");
    setPreviewActiveKeys(DEFAULT_PREVIEW_ACTIVE_KEYS);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleOpenAnalyzer = () => {
    resetState();
    onClose();
    onOpenAnalyzer();
  };

  React.useEffect(() => {
    if (!open) {
      return;
    }

    try {
      const rawValue = localStorage.getItem(getPromptHistoryStorageKey());
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];
      setPromptHistory(normalizePromptHistoryItems(parsedValue));
    } catch (historyError) {
      console.error("Failed to load API canvas AI prompt history:", historyError);
      setPromptHistory([]);
    }
  }, [open]);

  const persistPromptHistory = React.useCallback((promptText: string) => {
    const normalizedPrompt = normalizeText(promptText);

    if (!normalizedPrompt) {
      return;
    }

    const historyItem: PromptHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: normalizedPrompt,
      updatedAt: new Date().toISOString(),
      endpointId: selectedEndpoint?.id || "",
      endpointName: selectedEndpoint?.name || "",
    };

    const nextHistory = [
      historyItem,
      ...promptHistory.filter((item) => item.text !== normalizedPrompt),
    ].slice(0, PROMPT_HISTORY_LIMIT);

    setPromptHistory(nextHistory);
    localStorage.setItem(getPromptHistoryStorageKey(), JSON.stringify(nextHistory));
  }, [promptHistory, selectedEndpoint?.id, selectedEndpoint?.name]);

  const clearPromptHistory = React.useCallback(() => {
    localStorage.removeItem(getPromptHistoryStorageKey());
    setPromptHistory([]);
    message.success("Prompt history cleared.");
  }, []);

  const deletePromptHistoryItem = React.useCallback((historyId: string) => {
    const nextHistory = promptHistory.filter((item) => item.id !== historyId);
    setPromptHistory(nextHistory);
    localStorage.setItem(getPromptHistoryStorageKey(), JSON.stringify(nextHistory));
    message.success("Prompt removed from history.");
  }, [promptHistory]);

  const appendAssistantCommand = React.useCallback((command: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev}\n${command}` : command));
  }, []);

  const handleGenerate = async () => {
    if (!selectedEndpoint) {
      message.warning("Select an API canvas first.");
      return;
    }

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      message.warning("Write a prompt first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateVertexJsonPayload(
        JSON.stringify(
          {
            ...JSON.parse(buildPromptEnvelope(selectedEndpoint, normalizedPrompt)),
            assistantContext: {
              includeCurrentCanvasJson,
              currentApiCanvasJson: includeCurrentCanvasJson ? selectedEndpoint : null,
              relatedApiCanvasJson: relatedCanvasJson.trim() || null,
              intent:
                "Interpret the prompt as an update request for the current API canvas when applicable. If the user asks to add, remove, or update a field, reflect that change consistently across description, input, requestBody, operation, output, and responseBody.",
            },
          },
          null,
          2,
        ),
        "Return only valid JSON for an API canvas draft with these keys: description, input, requestBody, operation, output, responseBody.",
      );

      setDraft(normalizeDraft(response));
      persistPromptHistory(normalizedPrompt);
      message.success("AI draft generated.");
    } catch (generationError) {
      const nextError = generationError instanceof Error ? generationError.message : "AI generation failed.";
      setError(nextError);
      message.error("Failed to generate API canvas draft.");
    } finally {
      setLoading(false);
    }
  };

  const hasSectionContent = React.useCallback((sectionKey: DraftSectionKey) => {
    if (!draft) {
      return false;
    }

    switch (sectionKey) {
      case "description":
        return Boolean(draft.description?.trim());
      case "input":
        return draft.input.length > 0;
      case "requestBody":
        return Boolean(stringifySection(draft.requestBody).trim());
      case "operation":
        return draft.operation.length > 0;
      case "output":
        return draft.output.length > 0;
      case "responseBody":
        return Boolean(stringifySection(draft.responseBody).trim());
      default:
        return false;
    }
  }, [draft]);

  const buildEndpointWithDraftSection = React.useCallback((sectionKey: DraftSectionKey) => {
    if (!selectedEndpoint || !draft) {
      return null;
    }

    return {
      ...selectedEndpoint,
      ...(sectionKey === "description" ? { description: draft.description || selectedEndpoint.description || "" } : {}),
      ...(sectionKey === "input" ? { input: draft.input } : {}),
      ...(sectionKey === "requestBody" ? { requestBody: stringifySection(draft.requestBody) } : {}),
      ...(sectionKey === "operation" ? { operation: draft.operation } : {}),
      ...(sectionKey === "output" ? { output: draft.output } : {}),
      ...(sectionKey === "responseBody" ? { responseBody: stringifySection(draft.responseBody) } : {}),
    };
  }, [draft, selectedEndpoint]);

  const getApplyButtonLabel = React.useCallback((sectionKey: DraftSectionKey | "all") => {
    switch (sectionKey) {
      case "description":
        return "Apply to Description";
      case "input":
        return "Apply to Input";
      case "requestBody":
        return "Apply to Request Body";
      case "operation":
        return "Apply to Operation";
      case "output":
        return "Apply to Output";
      case "responseBody":
        return "Apply to Response Body";
      case "all":
      default:
        return "Apply to Canvas";
    }
  }, []);

  const renderApplyActionButton = React.useCallback((sectionKey: DraftSectionKey | "all") => {
    const isAll = sectionKey === "all";
    const isLoading = applyingTarget === sectionKey;
    const isDisabled = isAll
      ? !draft || !selectedEndpoint
      : !selectedEndpoint || !draft || !hasSectionContent(sectionKey);
    const background = isAll
      ? "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)"
      : "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)";
    const boxShadow = isAll
      ? "0 10px 24px rgba(20, 184, 166, 0.28)"
      : "0 10px 24px rgba(22, 119, 255, 0.24)";
    const width = isAll ? undefined : 210;

    const handleClick = (event?: React.MouseEvent<HTMLElement>) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (isAll) {
        void handleApply();
        return;
      }

      void handleApplySection(sectionKey);
    };

    return (
      <div
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          onClick={handleClick}
          onMouseDown={(event) => event.stopPropagation()}
          loading={isLoading}
          disabled={isDisabled}
          style={{
            height: 34,
            padding: "0 14px",
            width,
            borderRadius: 999,
            border: "none",
            background,
            boxShadow,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: "0.2px",
          }}
        >
          {getApplyButtonLabel(sectionKey)}
        </Button>
      </div>
    );
  }, [applyingTarget, draft, getApplyButtonLabel, hasSectionContent, selectedEndpoint]);

  const handleApplySection = async (sectionKey: DraftSectionKey) => {
    if (!selectedEndpoint || !draft) {
      return;
    }

    const nextEndpoint = buildEndpointWithDraftSection(sectionKey);

    if (!nextEndpoint) {
      return;
    }

    setApplyingTarget(sectionKey);

    try {
      await updateEndpoint(nextEndpoint);
      message.success(`${getApplyButtonLabel(sectionKey)} completed.`);
    } catch (saveError) {
      console.error(saveError);
      message.error(`Failed to apply ${sectionKey}.`);
    } finally {
      setApplyingTarget(null);
    }
  };

  const handleApply = async () => {
    if (!selectedEndpoint || !draft) {
      return;
    }

    setApplyingTarget("all");

    try {
      await updateEndpoint({
        ...selectedEndpoint,
        description: draft.description || selectedEndpoint.description || "",
        input: draft.input,
        requestBody: stringifySection(draft.requestBody),
        operation: draft.operation,
        output: draft.output,
        responseBody: stringifySection(draft.responseBody),
      });

      message.success("AI draft applied to API canvas.");
      handleClose();
    } catch (saveError) {
      console.error(saveError);
      message.error("Failed to apply AI draft.");
    } finally {
      setApplyingTarget(null);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>API Canvas AI Assistant</span>
        </Space>
      }
      open={open}
      onClose={handleClose}
      width="90%"
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
                <Title level={5} style={{ marginBottom: 0 }}>
                  Prompt
                </Title>

                <Button icon={<SearchOutlined />} onClick={handleOpenAnalyzer}>
                  Open AI Analyzer
                </Button>
              </div>

              <Text type="secondary">
                Endpoint: {selectedEndpoint?.name || "No API canvas selected"}
              </Text>
            </div>

            <div>
              <Space size={12} wrap>
                <Button
                  type="link"
                  icon={<RobotOutlined />}
                  style={{ padding: 0, height: "auto", fontWeight: 500 }}
                  onClick={() => setIsAssistantOpen((prev) => !prev)}
                >
                  AI Assistant
                </Button>
                <Text type="secondary">
                  {isAssistantOpen ? <UpOutlined /> : <DownOutlined />}
                </Text>
              </Space>

              {isAssistantOpen ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    border: "1px solid #f0f0f0",
                    borderRadius: 12,
                    background: "#fafafa",
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Text strong>Quick assistant commands</Text>
                    <Space wrap>
                      <Button size="small" onClick={() => appendAssistantCommand(`"id" inputu elave et`)}>
                        Add `id` input
                      </Button>
                      <Button size="small" onClick={() => appendAssistantCommand("requestBody-ni yeni input-lara gore yenile")}>
                        Update requestBody
                      </Button>
                      <Button size="small" onClick={() => appendAssistantCommand("responseBody-ye yeni field elave et")}>
                        Update responseBody
                      </Button>
                      <Button size="small" onClick={() => appendAssistantCommand("validation-lari operation hissesinde ayriliqda yaz")}>
                        Improve operations
                      </Button>
                    </Space>

                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input
                          type="checkbox"
                          checked={includeCurrentCanvasJson}
                          onChange={(event) => setIncludeCurrentCanvasJson(event.target.checked)}
                        />
                        <Text>Send current API canvas JSON automatically</Text>
                      </label>
                      <Text type="secondary">
                        Bu aktiv olanda Gemini cari canvas strukturunu context kimi alır və `id inputu elave et` kimi prompt-ları update əmri kimi başa düşür.
                      </Text>
                    </div>

                    <div>
                      <Text strong>Related API canvas JSON</Text>
                      <TextArea
                        rows={5}
                        value={relatedCanvasJson}
                        onChange={(event) => setRelatedCanvasJson(event.target.value)}
                        placeholder="Paste related API canvas JSON here. Gemini will use it as additional context."
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </Space>
                </div>
              ) : null}
            </div>

            <TextArea
              rows={6}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Build a purchase execution remove API. Include required identifiers in input, explain validation, generate request/response JSON, and describe business operations."
            />

            <Space>
              <Button type="primary" icon={<RobotOutlined />} onClick={handleGenerate} loading={loading} disabled={!canGenerate}>
                Generate 6 Blocks
              </Button>
              <Button onClick={() => setDraft(null)}>Clear Preview</Button>
            </Space>
        </Space>

        <div>
          <Space size={12} wrap>
            <Button
              type="link"
              icon={<HistoryOutlined />}
              style={{ padding: 0, height: "auto", fontWeight: 500 }}
              onClick={() => setIsHistoryOpen((prev) => !prev)}
            >
              Local Prompt History ({promptHistory.length})
            </Button>
            <Text type="secondary">
              {isHistoryOpen ? <UpOutlined /> : <DownOutlined />}
            </Text>
          </Space>

          {isHistoryOpen ? (
            <div
              style={{
                marginTop: 12,
                padding: 16,
                border: "1px solid #f0f0f0",
                borderRadius: 12,
                background: "#fafafa",
              }}
            >
              {promptHistory.length ? (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={clearPromptHistory}>
                    Clear All
                  </Button>
                </div>
              ) : null}
              {promptHistory.length ? (
                <List
                  dataSource={promptHistory}
                  itemLayout="vertical"
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button key={`use-${item.id}`} type="link" onClick={() => setPrompt(item.text)}>
                          Use
                        </Button>,
                        <Button key={`append-${item.id}`} type="link" onClick={() => setPrompt((prev) => (prev ? `${prev}\n\n${item.text}` : item.text))}>
                          Append
                        </Button>,
                        <Button
                          key={`delete-${item.id}`}
                          type="link"
                          danger
                          onClick={() => deletePromptHistoryItem(item.id)}
                        >
                          Delete
                        </Button>,
                      ]}
                    >
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space wrap>
                          <Text strong>{item.endpointName || "API Canvas Prompt"}</Text>
                          {item.endpointId ? <Tag color="blue">{item.endpointId}</Tag> : null}
                          <Text type="secondary">
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}
                          </Text>
                        </Space>
                        <Text style={{ whiteSpace: "pre-wrap" }}>{truncatePromptHistoryText(item.text)}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No local prompt history yet."
                />
              )}
            </div>
          ) : null}
          <Divider style={{ margin: "16px 0 0" }} />
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="AI generation error"
            description={<div style={{ whiteSpace: "pre-wrap" }}>{error}</div>}
          />
        ) : null}

        {loading ? (
          <Card>
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">Generating API canvas draft...</Text>
              </Space>
            </div>
          </Card>
        ) : null}

        {!loading && draft ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  Preview
                </Title>
                <Tag color="blue">{sectionCount}/6 filled</Tag>
              </Space>
              {renderApplyActionButton("all")}
            </div>

            <Collapse
              activeKey={previewActiveKeys}
              onChange={(keys) => setPreviewActiveKeys(Array.isArray(keys) ? keys as DraftSectionKey[] : [keys as DraftSectionKey])}
              style={{ background: "transparent" }}
              className="api-assistant-preview-collapse"
            >
              <Panel header="1. Description" key="description" extra={renderApplyActionButton("description")}>
                {draft.description ? (
                  <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{draft.description}</Paragraph>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No description generated" />
                )}
              </Panel>

              <Panel header="2. Input Fields" key="input" extra={renderApplyActionButton("input")}>
                {draft.input.length ? (
                  <List
                    dataSource={draft.input}
                    renderItem={(item, index) => (
                      <List.Item key={`${item.name}-${index}`}>
                        <List.Item.Meta
                          avatar={<Tag color="blue">{index + 1}</Tag>}
                          title={item.name || "-"}
                          description={item.description || "No description"}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No input fields generated" />
                )}
              </Panel>

              <Panel header="3. Request Body" key="requestBody" extra={renderApplyActionButton("requestBody")}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {stringifySection(draft.requestBody)}
                </pre>
              </Panel>

              <Panel header="4. Operation Description" key="operation" extra={renderApplyActionButton("operation")}>
                {draft.operation.length ? (
                  <List
                    dataSource={draft.operation}
                    renderItem={(item, index) => (
                      <List.Item key={`${item.type}-${index}`}>
                        <List.Item.Meta
                          avatar={<Tag color="purple">{item.type}</Tag>}
                          title={`Step ${index + 1}`}
                          description={item.description || "No description"}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No operations generated" />
                )}
              </Panel>

              <Panel header="5. Output Fields" key="output" extra={renderApplyActionButton("output")}>
                {draft.output.length ? (
                  <List
                    dataSource={draft.output}
                    renderItem={(item, index) => (
                      <List.Item key={`${item.name}-${index}`}>
                        <List.Item.Meta
                          avatar={<Tag color="green">{index + 1}</Tag>}
                          title={item.name || "-"}
                          description={item.description || "No description"}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No output fields generated" />
                )}
              </Panel>

              <Panel header="6. Response Body" key="responseBody" extra={renderApplyActionButton("responseBody")}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {stringifySection(draft.responseBody)}
                </pre>
              </Panel>
            </Collapse>
          </Space>
        ) : null}

        {!loading && !draft ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No AI draft yet. Write a prompt and generate the 6 blocks."
            />
          </Card>
        ) : null}
      </Space>

      <style>{`
        .api-assistant-preview-collapse {
          background: transparent !important;
          border: none !important;
        }

        .api-assistant-preview-collapse .ant-collapse-item {
          margin-bottom: 20px !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 12px !important;
          overflow: hidden;
          background: #fff;
        }

        .api-assistant-preview-collapse .ant-collapse-item:last-child {
          margin-bottom: 0;
        }

        .api-assistant-preview-collapse .ant-collapse-header {
          background: #fff !important;
        }

        .api-assistant-preview-collapse .ant-collapse-header-text {
          font-size: 16px;
          font-weight: 700;
        }

        .api-assistant-preview-collapse .ant-collapse-content-box {
          padding-top: 20px !important;
          padding-bottom: 20px !important;
        }

        .api-assistant-preview-collapse .ant-collapse-content {
          border-top: 1px solid #94a3b8 !important;
        }
      `}</style>
    </Drawer>
  );
}
