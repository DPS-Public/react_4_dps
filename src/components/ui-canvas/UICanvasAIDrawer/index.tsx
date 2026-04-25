import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  RobotOutlined,
  SearchOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import UIPrototype from "@/hooks/ui-canvas/ui-prototype/UIPrototype.tsx";
import { db } from "@/config/firebase";
import { componentTypesObj, type ComponentType } from "@/components/ui-canvas/common/types";
import { utilBuildDisplayOrderData } from "@/ui-canvas/uic_ui_canvas/utils/utilBuildDisplayOrderData";
import { vertexAIGenerateCanvasPayload } from "./vertexAIGeminiClient";

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

const PROMPT_HISTORY_LIMIT = 10;
const PROMPT_HISTORY_PREVIEW_LIMIT = 300;
const PROTOTYPE_COMPONENT_LIMIT = 100;
const DEFAULT_PREVIEW_ACTIVE_KEYS: DraftSectionKey[] = ["description", "uac", "inputDescription", "uiPrototype"];

const FIELD_KEYWORD_RULES: Array<{ keys: string[]; label: string; componentType: string; isMandatory?: boolean }> = [
  { keys: ["ad", "name", "first name", "firstname"], label: "Ad", componentType: "txt", isMandatory: true },
  { keys: ["soyad", "surname", "last name", "lastname"], label: "Soyad", componentType: "txt", isMandatory: true },
  { keys: ["ata", "atasinin adi", "father name", "father's name", "middle name"], label: "Atasinin adi", componentType: "txt" },
  { keys: ["email", "e-mail", "mail"], label: "Email", componentType: "txt", isMandatory: true },
  { keys: ["telefon", "phone", "mobile", "nomre", "number"], label: "Telefon", componentType: "txt" },
  { keys: ["dogum", "dogum tarixi", "birth", "birth date"], label: "Dogum tarixi", componentType: "date" },
  { keys: ["unvan", "address", "adres"], label: "Unvan", componentType: "txa" },
  { keys: ["tesvir", "description", "qeyd", "note", "comment"], label: "Tesvir", componentType: "txa" },
  { keys: ["sifre", "password"], label: "Sifre", componentType: "txt", isMandatory: true },
];

interface UICanvasAIDrawerProps {
  open: boolean;
  onClose: () => void;
  canvasId: string;
  onOpenAnalyzer: () => void;
}

interface UACCriterion {
  id: string;
  title: string;
  description?: string;
  taskIds: string[];
}

interface PromptHistoryItem {
  id: string;
  text: string;
  updatedAt: string;
  canvasId?: string;
  canvasName?: string;
}

type DraftSectionKey = "description" | "uac" | "inputDescription" | "uiPrototype";

function getPromptHistoryStorageKey() {
  return "ai_canvas_prompt_history";
}

function normalizePromptHistoryItems(items: unknown): PromptHistoryItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;

      return {
        id: String(record.id || `ui_prompt_${index}`),
        text: String(record.text || "").trim(),
        updatedAt: String(record.updatedAt || ""),
        canvasId: String(record.canvasId || ""),
        canvasName: String(record.canvasName || "").trim(),
      };
    })
    .filter((item) => item.text)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, PROMPT_HISTORY_LIMIT);
}

function truncatePromptHistoryText(text: string) {
  const normalizedText = String(text || "").trim();

  if (normalizedText.length <= PROMPT_HISTORY_PREVIEW_LIMIT) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, PROMPT_HISTORY_PREVIEW_LIMIT)}...`;
}

function coerceBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "required", "mandatory", "1"].includes(normalized);
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function getComponentTypeLabel(componentType?: string) {
  if (!componentType) {
    return "-";
  }

  return componentTypesObj[componentType as ComponentType]?.label || componentType;
}

function extractManualDescriptionText(item: unknown) {
  const record = (item || {}) as Record<string, unknown>;
  const manualDescription = record.manualDescription;
  const manualDescriptions =
    manualDescription && typeof manualDescription === "object" && !Array.isArray(manualDescription)
      ? Object.values(manualDescription as Record<string, unknown>)
      : [];

  const firstManualDescription = manualDescriptions.find(
    (entry) => typeof (entry as { description?: unknown })?.description === "string" && String((entry as { description: string }).description).trim(),
  ) as { description?: string } | undefined;

  return firstManualDescription?.description?.trim() || String(record.description || record.content || "").trim() || "";
}

function extractAllManualDescriptions(inputMap: Record<string, unknown>) {
  return Object.values(inputMap || {}).flatMap((inputItem) => {
    const record = (inputItem || {}) as Record<string, unknown>;
    const manualDescription = record.manualDescription;
    const entries =
      manualDescription && typeof manualDescription === "object" && !Array.isArray(manualDescription)
        ? Object.values(manualDescription as Record<string, unknown>)
        : [];

    return entries.map((entry) => {
      const item = (entry || {}) as Record<string, unknown>;

      return {
        id: String(item.id || ""),
        inputId: String(item.inputId || record.id || ""),
        inputName: String(item.inputName || record.inputName || ""),
        event: String(item.event || ""),
        description: String(item.description || ""),
      };
    });
  });
}

function normalizeGeneratedInputItem(item: unknown, inputId: string, canvasId: string) {
  const source = (item || {}) as Record<string, unknown>;
  const componentType = String(source.componentType || "txt").trim() || "txt";
  const inputName = String(source.inputName || source.label || source.title || `Input ${inputId}`).trim();
  const description = String(source.description || source.content || "").trim();
  const isMandatory = coerceBoolean(source.isMandatory ?? source.required ?? source.mandatory);
  const existingManualDescription =
    source.manualDescription && typeof source.manualDescription === "object" && !Array.isArray(source.manualDescription)
      ? (source.manualDescription as Record<string, unknown>)
      : {};

  const normalizedDescriptionId = `${inputId}_manual_ai`;
  const normalizedManualDescription = description
    ? {
        ...existingManualDescription,
        [normalizedDescriptionId]: {
          id: normalizedDescriptionId,
          inputId,
          inputName,
          uiId: canvasId,
          event: "",
          description,
          order: 1,
        },
      }
    : existingManualDescription;

  return {
    ...source,
    id: inputId,
    inputName,
    componentType,
    content: String(source.content ?? "").trim(),
    cellNo: String(source.cellNo ?? (componentType === "txa" ? "12" : "6")),
    hasLabel: typeof source.hasLabel === "boolean" ? source.hasLabel : !["btn", "hlink"].includes(componentType),
    order: typeof source.order === "number" ? source.order : Number(source.order ?? 0),
    isMandatory,
    manualDescription: normalizedManualDescription,
  };
}

function isPrototypeComponentCandidate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Boolean(typeof record.id === "string" && typeof record.componentType === "string");
}

function sanitizeGeneratedInputs(candidate: unknown) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const entries = Object.entries(candidate).filter(([, value]) => isPrototypeComponentCandidate(value));

  if (entries.length === 0 || entries.length > PROTOTYPE_COMPONENT_LIMIT) {
    return null;
  }

  return Object.fromEntries(entries);
}

function upsertCssDeclaration(cssString: string, property: string, value: string) {
  const normalizeDeclarationSeparators = (rawCss: string) => {
    let nextCss = String(rawCss || "").trim();
    let previousCss = "";

    // Fix malformed declarations like: "color: red font-size: 24px"
    while (nextCss !== previousCss) {
      previousCss = nextCss;
      nextCss = nextCss.replace(/([a-z-]+\s*:\s*[^;{}]+?)\s+(?=[a-z-]+\s*:)/gi, "$1; ");
    }

    return nextCss;
  };

  const normalizedProperty = property.trim().toLowerCase();
  const declarations = normalizeDeclarationSeparators(String(cssString || ""))
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.toLowerCase().startsWith(`${normalizedProperty}:`))
    .map((part) => part.endsWith(";") ? part : `${part};`);

  if (String(value || "").trim()) {
    declarations.push(`${property}: ${value}`.trim().replace(/;$/, "") + ";");
  }

  return declarations.join(" ").trim();
}

function parsePromptStyleDirectives(promptText: string) {
  const normalized = String(promptText || "").toLowerCase();

  const widthRegex = /(?:ui\s*-?\s*canvas|canvas|ekran|form)[^\n\d]{0,40}?width\s*[:=]\s*(\d{2,4})(?:px)?/i;
  const heightRegex = /(?:ui\s*-?\s*canvas|canvas|ekran|form)[^\n\d]{0,40}?(?:height|hight)\s*[:=]\s*(\d{2,4})(?:px)?/i;
  const widthMatch = promptText.match(widthRegex);
  const heightMatch = promptText.match(heightRegex);
  const canvasWidthPx = widthMatch?.[1] ? `${widthMatch[1]}px` : null;
  const canvasHeightPx = heightMatch?.[1] ? `${heightMatch[1]}px` : null;

  const hasBackgroundRequest = /background|bg|fon|arxafon/.test(normalized);
  const wantsYellowBackground = hasBackgroundRequest && /yellow|sari|sarı/.test(normalized);
  const wantsContainerBackground = /(container|konteyner)/.test(normalized);

  const wantsRedComponentColor =
    /(component|komponent|reng|rəng|color)/.test(normalized)
    && /red|qirmizi|qırmızı/.test(normalized);

  const fontSizeRegex = /font\s*-?\s*size\s*(?:olsun|et|set|to|is|=|:)?\s*(\d{1,3})(?:px)?/i;
  const azFontSizeRegex = /(?:yazi|yazı|metn|mətn|text)\s*(?:olcusu|ölçüsü|size)\s*(?:olsun|et|set|to|is|=|:)?\s*(\d{1,3})(?:px)?/i;
  const genericPxRegex = /fontsize\s*(?:olsun|et|set|to|is|=|:)?\s*(\d{1,3})(?:px)?/i;
  const fontSizeMatch = promptText.match(fontSizeRegex) || promptText.match(azFontSizeRegex) || promptText.match(genericPxRegex);
  const componentFontSizePx = fontSizeMatch?.[1] ? `${fontSizeMatch[1]}px` : null;

  const excludeButton = /(button\s*xaric|button\s*haric|except\s*button|exclude\s*button|btn\s*xaric|btn\s*haric)/.test(normalized);

  return {
    canvasWidthPx,
    canvasHeightPx,
    inputBackground: wantsYellowBackground && !wantsContainerBackground ? "yellow" : null,
    containerBackground: wantsYellowBackground && wantsContainerBackground ? "yellow" : null,
    componentColor: wantsRedComponentColor ? "red" : null,
    componentFontSizePx,
    excludeButton,
  };
}

function applyPromptStyleDirectives(inputs: Record<string, any>, promptText: string) {
  const directives = parsePromptStyleDirectives(promptText);
  const nextInputs: Record<string, any> = { ...inputs };

  if (directives.canvasWidthPx) {
    nextInputs.css = upsertCssDeclaration(String(nextInputs.css || ""), "width", directives.canvasWidthPx);
    nextInputs.css = upsertCssDeclaration(String(nextInputs.css || ""), "max-width", directives.canvasWidthPx);

    // Ensure Canvas target shows a height value in CSS panel even when user only requests width.
    const nextHeight = directives.canvasHeightPx || "auto";
    nextInputs.css = upsertCssDeclaration(String(nextInputs.css || ""), "height", nextHeight);
  }

  if (!directives.canvasWidthPx && directives.canvasHeightPx) {
    nextInputs.css = upsertCssDeclaration(String(nextInputs.css || ""), "height", directives.canvasHeightPx);
  }

  if (directives.inputBackground) {
    Object.entries(nextInputs).forEach(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return;
      }

      if (key === "css") {
        return;
      }

      const item = value as Record<string, unknown>;
      const componentType = String(item.componentType || "").toLowerCase();
      const isButton = componentType === "btn" || componentType === "button";

      if (directives.excludeButton && isButton) {
        return;
      }

      const existingCss = item.css && typeof item.css === "object"
        ? (item.css as Record<string, unknown>)
        : {};
      const currentComponentCss = String(existingCss.componentCss || "");
      const nextComponentCss = upsertCssDeclaration(currentComponentCss, "background", directives.inputBackground);

      nextInputs[key] = {
        ...item,
        css: {
          ...existingCss,
          componentCss: nextComponentCss,
        },
      };
    });
  }

  if (directives.containerBackground || directives.componentColor || directives.componentFontSizePx) {
    Object.entries(nextInputs).forEach(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return;
      }

      if (key === "css") {
        return;
      }

      const item = value as Record<string, unknown>;
      const componentType = String(item.componentType || "").toLowerCase();
      const isButton = componentType === "btn" || componentType === "button";

      if (directives.excludeButton && isButton) {
        return;
      }

      const existingCss = item.css && typeof item.css === "object"
        ? (item.css as Record<string, unknown>)
        : {};

      let nextContainerCss = String(existingCss.containerCss || "");
      let nextComponentCss = String(existingCss.componentCss || "");

      if (directives.containerBackground) {
        nextContainerCss = upsertCssDeclaration(nextContainerCss, "background", directives.containerBackground);
      }

      if (directives.componentColor) {
        nextComponentCss = upsertCssDeclaration(nextComponentCss, "color", directives.componentColor);
      }

      if (directives.componentFontSizePx) {
        nextComponentCss = upsertCssDeclaration(nextComponentCss, "font-size", directives.componentFontSizePx);
      }

      nextInputs[key] = {
        ...item,
        css: {
          ...existingCss,
          containerCss: nextContainerCss,
          componentCss: nextComponentCss,
        },
      };
    });
  }

  return nextInputs;
}

function normalizeFieldToken(token: string) {
  return token
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function guessFieldRule(value: string) {
  const normalizedValue = normalizeFieldToken(value);
  return FIELD_KEYWORD_RULES.find((rule) => rule.keys.some((key) => normalizedValue.includes(key)));
}

function tokenizePromptFields(promptText: string) {
  const normalized = promptText
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+ve\s+/gi, ",")
    .replace(/\sand\s/gi, ",")
    .replace(/\s+ile\s+/gi, ",")
    .replace(/\s+with\s+/gi, ",")
    .replace(/[.;]/g, ",")
    .trim();

  return normalized
    .split(",")
    .map((item) => normalizeFieldToken(item))
    .filter(Boolean)
    .filter((item) => item.length > 1);
}

function normalizeLooseInputMap(candidate: unknown, canvasId: string) {
  if (!candidate) {
    return null;
  }

  const toEntries = () => {
    if (Array.isArray(candidate)) {
      return candidate.map((item, index) => [`${canvasId}_ai_${index + 1}`, item] as const);
    }

    if (typeof candidate === "object") {
      return Object.entries(candidate as Record<string, unknown>);
    }

    return [] as Array<readonly [string, unknown]>;
  };

  const normalizedEntries = toEntries()
    .map(([key, value], index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
      }

      const record = value as Record<string, unknown>;
      const rawName = String(record.inputName || record.label || record.title || "").trim();
      const fallbackName = key.replace(/[_-]+/g, " ").trim();
      const inputName = rawName || toTitleCase(fallbackName) || `Field ${index + 1}`;
      const guessedRule = guessFieldRule(inputName);
      const componentType = String(record.componentType || guessedRule?.componentType || "txt").trim() || "txt";
      const outputId = String(record.id || key || `${canvasId}_ai_${index + 1}`);

      const hasUsefulContent = Boolean(
        rawName
        || record.description
        || record.content
        || record.manualDescription
        || record.componentType,
      );

      if (!hasUsefulContent) {
        return null;
      }

      return [
        outputId,
        normalizeGeneratedInputItem(
          {
            ...record,
            id: outputId,
            inputName,
            componentType,
            isMandatory: record.isMandatory ?? guessedRule?.isMandatory ?? false,
          },
          outputId,
          canvasId,
        ),
      ] as const;
    })
    .filter(Boolean) as Array<readonly [string, ReturnType<typeof normalizeGeneratedInputItem>]>;

  if (!normalizedEntries.length || normalizedEntries.length > PROTOTYPE_COMPONENT_LIMIT) {
    return null;
  }

  return Object.fromEntries(normalizedEntries);
}

export default function UICanvasAIDrawer({ open, onClose, canvasId, onOpenAnalyzer }: UICanvasAIDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<"all" | DraftSectionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uiCanvasData, setUiCanvasData] = useState<Record<string, any>>({});
  const [generatedUAC, setGeneratedUAC] = useState<UACCriterion[]>([]);
  const [canvasDescriptionDraft, setCanvasDescriptionDraft] = useState("");
  const [previewCriterion, setPreviewCriterion] = useState<UACCriterion | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [includeCurrentCanvasJson, setIncludeCurrentCanvasJson] = useState(true);
  const [relatedCanvasJson, setRelatedCanvasJson] = useState("");
  const [currentCanvasContext, setCurrentCanvasContext] = useState<Record<string, unknown> | null>(null);
  const [previewActiveKeys, setPreviewActiveKeys] = useState<DraftSectionKey[]>(DEFAULT_PREVIEW_ACTIVE_KEYS);

  const canGenerate = Boolean(canvasId) && Boolean(prompt.trim()) && !loading;
  const canvasDisplayName = useMemo(() => {
    const nameValue = currentCanvasContext?.name;
    if (typeof nameValue === "string" && nameValue.trim()) {
      return nameValue.trim();
    }

    const labelValue = currentCanvasContext?.label;
    if (typeof labelValue === "string" && labelValue.trim()) {
      return labelValue.trim();
    }

    return "Unnamed Canvas";
  }, [currentCanvasContext]);

  const sectionCount = useMemo(() => {
    const sections = [
      canvasDescriptionDraft.trim() ? 1 : 0,
      generatedUAC.length ? 1 : 0,
      Object.keys(uiCanvasData || {}).length ? 1 : 0,
      Object.keys(uiCanvasData || {}).length ? 1 : 0,
    ];

    return sections.reduce((sum, item) => sum + item, 0);
  }, [canvasDescriptionDraft, generatedUAC.length, uiCanvasData]);

  const inputDescriptionItems = useMemo(
    () => utilBuildDisplayOrderData(Object.values(uiCanvasData || {}).filter((item: any) => item?.id && item?.componentType)),
    [uiCanvasData],
  );

  const resetState = () => {
    setPrompt("");
    setLoading(false);
    setApplyingTarget(null);
    setError(null);
    setUiCanvasData({});
    setGeneratedUAC([]);
    setCanvasDescriptionDraft("");
    setPreviewCriterion(null);
    setPromptHistory([]);
    setIsHistoryOpen(false);
    setIsAssistantOpen(false);
    setIncludeCurrentCanvasJson(true);
    setRelatedCanvasJson("");
    setCurrentCanvasContext(null);
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

  useEffect(() => {
    if (!open || !canvasId) {
      return;
    }

    const loadCurrentCanvasContext = async () => {
      try {
        const uiCanvasDocRef = doc(db, "ui_canvas", canvasId);
        const uiCanvasSnap = await getDoc(uiCanvasDocRef);
        setCurrentCanvasContext(uiCanvasSnap.exists() ? (uiCanvasSnap.data() as Record<string, unknown>) : null);
      } catch (contextError) {
        console.error("Failed to load current UI canvas context:", contextError);
        setCurrentCanvasContext(null);
      }
    };

    void loadCurrentCanvasContext();
  }, [open, canvasId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    try {
      const rawValue = localStorage.getItem(getPromptHistoryStorageKey());
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];
      setPromptHistory(normalizePromptHistoryItems(parsedValue));
    } catch (historyError) {
      console.error("Failed to load local UI canvas prompt history:", historyError);
      setPromptHistory([]);
    }
  }, [open]);

  const persistPromptHistory = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").trim();

    if (!normalizedPrompt) {
      return;
    }

    const historyItem: PromptHistoryItem = {
      id: uuidv4(),
      text: normalizedPrompt,
      updatedAt: new Date().toISOString(),
      canvasId,
      canvasName: canvasDisplayName,
    };

    const nextHistory = [
      historyItem,
      ...promptHistory.filter((item) => item.text !== normalizedPrompt),
    ].slice(0, PROMPT_HISTORY_LIMIT);

    setPromptHistory(nextHistory);
    localStorage.setItem(getPromptHistoryStorageKey(), JSON.stringify(nextHistory));
  }, [canvasDisplayName, canvasId, promptHistory]);

  const clearPromptHistory = useCallback(() => {
    localStorage.removeItem(getPromptHistoryStorageKey());
    setPromptHistory([]);
    message.success("Prompt history cleared.");
  }, []);

  const deletePromptHistoryItem = useCallback((promptId: string) => {
    const nextHistory = promptHistory.filter((item) => item.id !== promptId);
    setPromptHistory(nextHistory);
    localStorage.setItem(getPromptHistoryStorageKey(), JSON.stringify(nextHistory));
    message.success("Prompt removed from history.");
  }, [promptHistory]);

  const appendAssistantCommand = useCallback((command: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev}\n${command}` : command));
  }, []);

  const buildGeminiPromptEnvelope = useCallback((dynamicPrompt: string) => {
    const promptObject = {
      provider: "firebase-vertex-ai-gemini",
      task: "generate_ui_canvas_uac_and_input_descriptions",
      requiredTopLevelKeys: ["uiCanvas", "userAcceptanceCriteria", "description"],
      outputContract: {
        uiCanvasInput: "Record<string, UICanvasInput & { description: string; isMandatory: boolean }>",
        userAcceptanceCriteria: "Array<{id,title,description,taskIds: string[]}>",
      },
      rules: [
        "Return ONLY JSON object, no explanations.",
        "Top-level JSON must contain uiCanvas, userAcceptanceCriteria, description.",
        "uiCanvas must be an object map, not array. Example key format: <canvasId>_ai_1",
        "Every uiCanvas item must contain: id, inputName, componentType, cellNo, hasLabel, isMandatory, description.",
        "componentType must be one of txt, txa, date, btn, cbx, rdb, cmb.",
        "Return deterministic structured output",
        "Prefer concise acceptance criteria",
        "Input list must be prototype-friendly",
        "Every input must include a manual description string",
        "Every input must include isMandatory as a boolean",
        "Mark only genuinely required fields as mandatory",
        "Do not include markdown code fences",
      ],
      dynamic: {
        canvasId,
        requirements: dynamicPrompt,
      },
      outputExample: {
        uiCanvas: {
          [`${canvasId}_ai_1`]: {
            id: `${canvasId}_ai_1`,
            inputName: "Ad",
            componentType: "txt",
            cellNo: "6",
            hasLabel: true,
            isMandatory: true,
            description: "Istifadeci ad daxil edir.",
          },
          [`${canvasId}_ai_2`]: {
            id: `${canvasId}_ai_2`,
            inputName: "Email",
            componentType: "txt",
            cellNo: "6",
            hasLabel: true,
            isMandatory: true,
            description: "Istifadeci email unvanini daxil edir.",
          },
        },
        userAcceptanceCriteria: [
          {
            id: `${canvasId}-uac-1`,
            title: "Istifadeci teleb olunan saheni doldura bilir",
            description: "Ad, soyad ve email saheleri doldurulduqda forma dogru yoxlanilir.",
            taskIds: [],
          },
        ],
        description: "Telebe qeydiyyat formasi.",
      },
      assistantContext: {
        includeCurrentCanvasJson,
        currentUiCanvasJson: includeCurrentCanvasJson ? currentCanvasContext : null,
        relatedCanvasJson: String(relatedCanvasJson || "").trim() || null,
        intent:
          "Interpret prompt updates against the current UI canvas. If the user asks to add, remove, or update an input/component, reflect it consistently in generated UAC and input-description output.",
      },
    };

    return JSON.stringify(promptObject, null, 2);
  }, [canvasId, currentCanvasContext, includeCurrentCanvasJson, relatedCanvasJson]);

  const buildFallbackInputFromDescription = useCallback((descriptionText: string) => {
    const tokens = tokenizePromptFields(descriptionText);
    const uniqueLabels = new Set<string>();
    const source = tokens
      .map((token) => {
        const guessedRule = guessFieldRule(token);
        const label = guessedRule?.label || toTitleCase(token.replace(/\b(input|field|elave et|add)\b/g, "").trim()) || "";

        if (!label || uniqueLabels.has(label.toLowerCase())) {
          return null;
        }

        uniqueLabels.add(label.toLowerCase());

        return {
          key: token,
          type: guessedRule?.componentType || "txt",
          label,
          isMandatory: guessedRule?.isMandatory ?? false,
        };
      })
      .filter(Boolean) as Array<{ key: string; type: string; label: string; isMandatory: boolean }>;

    if (!source.length) {
      source.push(
        { key: "ad", type: "txt", label: "Ad", isMandatory: true },
        { key: "soyad", type: "txt", label: "Soyad", isMandatory: true },
        { key: "email", type: "txt", label: "Email", isMandatory: true },
      );
    }

    const inputMap: Record<string, any> = {};

    source.forEach((item, index) => {
      const id = `${canvasId}_ai_${index + 1}`;
      const isMandatory = item.type !== "btn" ? Boolean(item.isMandatory ?? true) : false;
      const description = item.type === "btn"
        ? `Triggers the ${item.label.toLowerCase()} action.`
        : `User enters ${item.label.toLowerCase()} here.${isMandatory ? " This field is mandatory." : ""}`;

      inputMap[id] = {
        id,
        inputName: item.label,
        inputType: "IN",
        fkTableId: null,
        componentType: item.type,
        fkUserStoryId: canvasId,
        content: item.type === "btn" ? item.label : "",
        fkGroupId: null,
        order: index + 1,
        cellNo: item.type === "txa" ? "12" : "6",
        hasLabel: item.type !== "btn",
        isMandatory,
        description,
        displayIndex: String(index + 1),
        css: { containerCss: "", componentCss: "" },
        manualDescription: {
          [`${id}_manual_ai`]: {
            id: `${id}_manual_ai`,
            inputId: id,
            inputName: item.label,
            uiId: canvasId,
            event: "",
            description,
            order: 1,
          },
        },
        databaseRelation: {},
        apiCall: {},
      };
    });

    return inputMap;
  }, [canvasId]);

  const buildFallbackUACFromDescription = useCallback((descriptionText: string): UACCriterion[] => {
    const lines = descriptionText
      .split(/\n|\.|;|\u2022|-/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (lines.length === 0) {
      return [
        {
          id: `${canvasId}-uac-1`,
          title: "System should satisfy the described business flow",
          description: descriptionText || "Generated from AI Canvas Generator",
          taskIds: [],
        },
      ];
    }

    return lines.map((line, index) => ({
      id: `${canvasId}-uac-${index + 1}`,
      title: line,
      description: line,
      taskIds: [],
    }));
  }, [canvasId]);

  const handleGenerate = async () => {
    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      message.warning("Write a prompt first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await vertexAIGenerateCanvasPayload(buildGeminiPromptEnvelope(normalizedPrompt));
      persistPromptHistory(normalizedPrompt);

      const parsed = response?.input?.[canvasId]
        || response?.inputs?.[canvasId]
        || response?.input
        || response?.inputs
        || response?.data?.input?.[canvasId]
        || response;

      if (!parsed || (typeof parsed === "object" && Object.keys(parsed).length === 0)) {
        setError("No canvas data found in generator response.");
        return;
      }

      const rawGeneratedInputs =
        parsed?.FormCard?.Input?.[canvasId]
        || parsed?.FormCard?.Input
        || parsed?.uiCanvas
        || parsed?.uiCanvasInput
        || parsed?.input?.[canvasId]
        || parsed?.input
        || null;

      const sanitizedGeneratedInputs =
        normalizeLooseInputMap(rawGeneratedInputs, canvasId)
        || sanitizeGeneratedInputs(rawGeneratedInputs)
        || normalizeLooseInputMap(parsed?.uiCanvasInput, canvasId)
        || normalizeLooseInputMap(parsed, canvasId)
        || sanitizeGeneratedInputs(parsed);

      const generatedInputs = sanitizedGeneratedInputs
        ? Object.fromEntries(
            Object.entries(sanitizedGeneratedInputs).map(([inputId, item]) => [
              inputId,
              normalizeGeneratedInputItem(item, inputId, canvasId),
            ]),
          )
        : buildFallbackInputFromDescription(normalizedPrompt);

      const styledInputs = applyPromptStyleDirectives(generatedInputs, normalizedPrompt);

      const parsedUAC = parsed?.userAcceptanceCriteria || parsed?.uac || parsed?.UAC;
      const normalizedUAC: UACCriterion[] = Array.isArray(parsedUAC)
        ? parsedUAC.map((item: any, index: number) => ({
            id: item?.id || `${canvasId}-uac-${index + 1}`,
            title: item?.title || item?.description || `Acceptance Criteria ${index + 1}`,
            description: item?.description || item?.title || "",
            taskIds: Array.isArray(item?.taskIds) ? item.taskIds : [],
          }))
        : buildFallbackUACFromDescription(normalizedPrompt);

      const suggestedDescription = parsed?.description || parsed?.canvasDescription || normalizedPrompt;

      setUiCanvasData(styledInputs);
      setGeneratedUAC(normalizedUAC);
      setCanvasDescriptionDraft(String(suggestedDescription || "").trim());
      message.success("AI draft generated.");
    } catch (generationError) {
      const nextError = generationError instanceof Error ? generationError.message : "AI generation failed.";
      setError(nextError);
      message.error("Failed to generate UI canvas draft.");
    } finally {
      setLoading(false);
    }
  };

  const hasSectionContent = useCallback((sectionKey: DraftSectionKey) => {
    switch (sectionKey) {
      case "description":
        return Boolean(canvasDescriptionDraft.trim());
      case "uac":
        return generatedUAC.length > 0;
      case "inputDescription":
      case "uiPrototype":
        return Object.keys(uiCanvasData || {}).length > 0;
      default:
        return false;
    }
  }, [canvasDescriptionDraft, generatedUAC, uiCanvasData]);

  const createHistoryRecord = useCallback(async ({
    actionType,
    fieldName,
    oldValue,
    newValue,
  }: {
    actionType: string;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
  }) => {
    const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
    const uiCanvasHistoryDocRef = doc(db, "ui_canvas_history", canvasId);

    const historyRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      userId: currentUserData?.uid || "unknown",
      userName: currentUserData?.name || currentUserData?.email || "Unknown User",
      userEmail: currentUserData?.email || "Unknown Email",
      actionType,
      fieldName,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    };

    const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

    if (!historyDocSnap.exists()) {
      await setDoc(uiCanvasHistoryDocRef, {
        uiCanvasId: canvasId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        [fieldName]: [historyRecord],
        allChanges: [historyRecord],
      });
      return;
    }

    await updateDoc(uiCanvasHistoryDocRef, {
      updatedAt: serverTimestamp(),
      [fieldName]: arrayUnion(historyRecord),
      allChanges: arrayUnion(historyRecord),
    });
  }, [canvasId]);

  const updateCanvasWithSection = useCallback(async (sectionKey: DraftSectionKey) => {
    const uiCanvasDocRef = doc(db, "ui_canvas", canvasId);
    const uiCanvasSnap = await getDoc(uiCanvasDocRef);
    const currentData = uiCanvasSnap.exists() ? uiCanvasSnap.data() : {};
    const currentInputs = (currentData?.input?.[canvasId] || {}) as Record<string, unknown>;

    if (sectionKey === "description") {
      await updateDoc(uiCanvasDocRef, {
        description: canvasDescriptionDraft,
      });

      await createHistoryRecord({
        actionType: "FIELD_UPDATE",
        fieldName: "description",
        oldValue: currentData?.description || "",
        newValue: canvasDescriptionDraft,
      });

      return;
    }

    if (sectionKey === "uac") {
      const existingUAC = Array.isArray(currentData?.userAcceptanceCriteria)
        ? currentData.userAcceptanceCriteria
        : [];

      await updateDoc(uiCanvasDocRef, {
        userAcceptanceCriteria: generatedUAC,
      });

      await createHistoryRecord({
        actionType: "UAC_UPDATE",
        fieldName: "user_acceptance_criteria",
        oldValue: existingUAC,
        newValue: generatedUAC,
      });

      return;
    }

    const oldManualDescriptions = extractAllManualDescriptions(currentInputs);
    const newManualDescriptions = extractAllManualDescriptions(uiCanvasData);

    await updateDoc(uiCanvasDocRef, {
      [`input.${canvasId}`]: uiCanvasData,
    });

    await createHistoryRecord({
      actionType: "INPUT_UPDATE",
      fieldName: "input",
      oldValue: currentInputs,
      newValue: uiCanvasData,
    });

    await createHistoryRecord({
      actionType: "MANUAL_DESCRIPTION_BATCH_UPDATE",
      fieldName: "manual_descriptions",
      oldValue: oldManualDescriptions,
      newValue: newManualDescriptions,
    });
  }, [canvasDescriptionDraft, canvasId, createHistoryRecord, generatedUAC, uiCanvasData]);

  const handleApplySection = async (sectionKey: DraftSectionKey) => {
    if (!canvasId || !hasSectionContent(sectionKey)) {
      return;
    }

    setApplyingTarget(sectionKey);

    try {
      await updateCanvasWithSection(sectionKey);
      message.success(`${getApplyButtonLabel(sectionKey)} completed.`);
    } catch (saveError) {
      console.error(saveError);
      message.error(`Failed to apply ${sectionKey}.`);
    } finally {
      setApplyingTarget(null);
    }
  };

  const handleApplyAll = async () => {
    if (!canvasId) {
      return;
    }

    setApplyingTarget("all");

    try {
      const uiCanvasDocRef = doc(db, "ui_canvas", canvasId);
      const uiCanvasSnap = await getDoc(uiCanvasDocRef);
      const currentData = uiCanvasSnap.exists() ? uiCanvasSnap.data() : {};
      const currentInputs = (currentData?.input?.[canvasId] || {}) as Record<string, unknown>;
      const existingUAC = Array.isArray(currentData?.userAcceptanceCriteria)
        ? currentData.userAcceptanceCriteria
        : [];
      const oldManualDescriptions = extractAllManualDescriptions(currentInputs);
      const newManualDescriptions = extractAllManualDescriptions(uiCanvasData);

      await updateDoc(uiCanvasDocRef, {
        [`input.${canvasId}`]: uiCanvasData,
        userAcceptanceCriteria: generatedUAC,
        description: canvasDescriptionDraft,
      });

      await createHistoryRecord({
        actionType: "FIELD_UPDATE",
        fieldName: "description",
        oldValue: currentData?.description || "",
        newValue: canvasDescriptionDraft,
      });

      await createHistoryRecord({
        actionType: "INPUT_UPDATE",
        fieldName: "input",
        oldValue: currentInputs,
        newValue: uiCanvasData,
      });

      await createHistoryRecord({
        actionType: "MANUAL_DESCRIPTION_BATCH_UPDATE",
        fieldName: "manual_descriptions",
        oldValue: oldManualDescriptions,
        newValue: newManualDescriptions,
      });

      await createHistoryRecord({
        actionType: "UAC_UPDATE",
        fieldName: "user_acceptance_criteria",
        oldValue: existingUAC,
        newValue: generatedUAC,
      });

      message.success("AI draft applied to UI canvas.");
      handleClose();
    } catch (saveError) {
      console.error(saveError);
      message.error("Failed to apply UI canvas draft.");
    } finally {
      setApplyingTarget(null);
    }
  };

  const getApplyButtonLabel = (sectionKey: DraftSectionKey | "all") => {
    switch (sectionKey) {
      case "description":
        return "Apply to Description";
      case "uac":
        return "Apply to UAC";
      case "inputDescription":
        return "Apply to Input List";
      case "uiPrototype":
        return "Apply to UI Prototype";
      case "all":
      default:
        return "Apply to Canvas";
    }
  };

  const renderApplyActionButton = (sectionKey: DraftSectionKey | "all") => {
    const isAll = sectionKey === "all";
    const isLoading = applyingTarget === sectionKey;
    const isDisabled = isAll
      ? !canvasId || (!canvasDescriptionDraft.trim() && generatedUAC.length === 0 && Object.keys(uiCanvasData || {}).length === 0)
      : !canvasId || !hasSectionContent(sectionKey);
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
        void handleApplyAll();
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
  };

  const uacTableColumns = [
    {
      title: "Criteria",
      dataIndex: "title",
      key: "title",
      render: (value: string, record: UACCriterion) => (
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPreviewCriterion(record);
          }}
        >
          {value}
        </a>
      ),
    },
    {
      title: "Related Issue(s)",
      dataIndex: "taskIds",
      key: "taskIds",
      render: () => <span />,
    },
    {
      title: "Status",
      key: "status",
      width: 160,
      render: () => <Tag color="default">Pending</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: UACCriterion) => (
        <Button
          type="text"
          icon={<FileTextOutlined />}
          onClick={() => setPreviewCriterion(record)}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>UI Canvas AI Assistant</span>
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
              Canvas: {canvasDisplayName}
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
                    <Button size="small" onClick={() => appendAssistantCommand("Add an email input to the current UI canvas")}>Add email input</Button>
                    <Button size="small" onClick={() => appendAssistantCommand("Add a submit button")}>Add submit button</Button>
                    <Button size="small" onClick={() => appendAssistantCommand("Improve validation rules and manual descriptions")}>Improve validations</Button>
                    <Button size="small" onClick={() => appendAssistantCommand("Add new input fields without breaking the current structure")}>Keep current structure</Button>
                  </Space>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={includeCurrentCanvasJson}
                        onChange={(event) => setIncludeCurrentCanvasJson(event.target.checked)}
                      />
                      <Text>Send current UI canvas JSON automatically</Text>
                    </label>
                    <Text type="secondary">
                      When enabled, Gemini receives current canvas structure as context and can treat your prompt as an update request.
                    </Text>
                  </div>

                  <div>
                    <Text strong>Related canvas JSON</Text>
                    <TextArea
                      rows={5}
                      value={relatedCanvasJson}
                      onChange={(event) => setRelatedCanvasJson(event.target.value)}
                      placeholder="Paste related UI or API canvas JSON here. Gemini will use it as additional context."
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
            placeholder="Example: Build onboarding form with name, email, role, and approval checkbox. Generate UAC and input-description list for prototype view."
          />

          <Space>
            <Button type="primary" icon={<RobotOutlined />} onClick={handleGenerate} loading={loading} disabled={!canGenerate}>
              Generate Draft
            </Button>
            <Button
              onClick={() => {
                setUiCanvasData({});
                setGeneratedUAC([]);
                setCanvasDescriptionDraft("");
                setError(null);
              }}
            >
              Clear Preview
            </Button>
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
                        <Button key={`delete-${item.id}`} type="link" danger onClick={() => deletePromptHistoryItem(item.id)}>
                          Delete
                        </Button>,
                      ]}
                    >
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space wrap>
                          <Text strong>{item.canvasName || (item.canvasId === canvasId ? canvasDisplayName : "UI Canvas Prompt")}</Text>
                          {item.canvasId ? <Tag color="blue">{item.canvasId}</Tag> : null}
                          <Text type="secondary">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}</Text>
                        </Space>
                        <Text style={{ whiteSpace: "pre-wrap" }}>{truncatePromptHistoryText(item.text)}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No local prompt history yet." />
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
                <Text type="secondary">Generating UI canvas draft...</Text>
              </Space>
            </div>
          </Card>
        ) : null}

        {!loading && (canvasDescriptionDraft.trim() || generatedUAC.length || Object.keys(uiCanvasData || {}).length) ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  Preview
                </Title>
                <Tag color="blue">{sectionCount}/4 filled</Tag>
              </Space>
              {renderApplyActionButton("all")}
            </div>

            <Collapse
              activeKey={previewActiveKeys}
              onChange={(keys) => setPreviewActiveKeys(Array.isArray(keys) ? (keys as DraftSectionKey[]) : [keys as DraftSectionKey])}
              style={{ background: "transparent" }}
              className="ui-assistant-preview-collapse"
            >
              <Panel header="1. Description" key="description" extra={renderApplyActionButton("description")}>
                <TextArea
                  rows={8}
                  placeholder="Canvas description"
                  value={canvasDescriptionDraft}
                  onChange={(event) => setCanvasDescriptionDraft(event.target.value)}
                />
              </Panel>

              <Panel header="2. User Acceptance Criteria" key="uac" extra={renderApplyActionButton("uac")}>
                <Table
                  rowKey="id"
                  columns={uacTableColumns}
                  dataSource={generatedUAC}
                  locale={{ emptyText: "No UAC generated yet" }}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 900 }}
                />
              </Panel>

              <Panel header="3. Input and Description" key="inputDescription" extra={renderApplyActionButton("inputDescription")}>
                <Table
                  rowKey="id"
                  pagination={false}
                  size="small"
                  bordered
                  dataSource={inputDescriptionItems}
                  locale={{ emptyText: "No input list generated yet" }}
                  rowClassName={(record: any) =>
                    ["table", "tbl"].includes(String(record?.componentType || "").toLowerCase())
                      ? "ai-preview-table-row"
                      : ["group", "grp"].includes(String(record?.componentType || "").toLowerCase())
                      ? "ai-preview-group-row"
                      : ""
                  }
                  columns={[
                    {
                      title: "#",
                      dataIndex: "displayIndex",
                      key: "displayIndex",
                      width: 80,
                      render: (value: string) => value || "-",
                    },
                    {
                      title: "Input",
                      dataIndex: "inputName",
                      key: "inputName",
                      render: (value: string) => <Text>{value || "-"}</Text>,
                    },
                    {
                      title: "Description",
                      key: "description",
                      render: (_: unknown, record: any) => {
                        const manualDescriptionText = extractManualDescriptionText(record);
                        const componentDescription = `Component Type: ${getComponentTypeLabel(record?.componentType)}${
                          record?.cellNo ? ` (Cell No: ${record.cellNo})` : ""
                        }`;

                        return (
                          <Space direction="vertical" size={4} style={{ width: "100%" }}>
                            <Text>{componentDescription}</Text>
                            <Space size={8} wrap>
                              {record?.isMandatory && <Tag color="gold">Required</Tag>}
                              {manualDescriptionText && <Text>{manualDescriptionText}</Text>}
                            </Space>
                            {!record?.isMandatory && !manualDescriptionText && (
                              <Text type="secondary">-</Text>
                            )}
                          </Space>
                        );
                      },
                    },
                  ]}
                />
              </Panel>

              <Panel header="4. UI Prototype" key="uiPrototype" extra={renderApplyActionButton("uiPrototype")}>
                <UIPrototype
                  preview={true}
                  componentsJson={(uiCanvasData || {}) as any}
                  selectedUICanvasId={canvasId}
                />
              </Panel>
            </Collapse>

            <style>
              {`
                .ai-preview-group-row > td {
                  background: #8fbc8f !important;
                }

                .ai-preview-table-row > td {
                  background: #f0e68c !important;
                }
              `}
            </style>
          </Space>
        ) : null}

        {!loading && !(canvasDescriptionDraft.trim() || generatedUAC.length || Object.keys(uiCanvasData || {}).length) ? (
          <Card>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No AI draft yet. Write a prompt and generate the preview blocks." />
          </Card>
        ) : null}

        <Modal
          title="Criterion Details"
          open={Boolean(previewCriterion)}
          onCancel={() => setPreviewCriterion(null)}
          footer={null}
          width={840}
          destroyOnClose
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text strong>Criteria</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{previewCriterion?.title || "-"}</Text>
              </div>
            </div>
            <div>
              <Text strong>Detailed Description</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {previewCriterion?.description?.trim() || "No detailed description generated yet."}
                </Text>
              </div>
            </div>
          </Space>
        </Modal>
      </Space>

      <style>{`
        .ui-assistant-preview-collapse {
          background: transparent !important;
          border: none !important;
        }

        .ui-assistant-preview-collapse .ant-collapse-item {
          margin-bottom: 20px !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 12px !important;
          overflow: hidden;
          background: #fff;
        }

        .ui-assistant-preview-collapse .ant-collapse-item:last-child {
          margin-bottom: 0;
        }

        .ui-assistant-preview-collapse .ant-collapse-header {
          background: #fff !important;
        }

        .ui-assistant-preview-collapse .ant-collapse-header-text {
          font-size: 16px;
          font-weight: 700;
        }

        .ui-assistant-preview-collapse .ant-collapse-content-box {
          padding-top: 20px !important;
          padding-bottom: 20px !important;
        }

        .ui-assistant-preview-collapse .ant-collapse-content {
          border-top: 1px solid #94a3b8 !important;
        }
      `}</style>
    </Drawer>
  );
}
