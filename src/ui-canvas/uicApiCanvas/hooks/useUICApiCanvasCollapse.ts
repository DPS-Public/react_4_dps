import { useState } from "react";

const STORAGE_KEY = "uiApiCanvasCollapseActiveKey";
const DEFAULT_ACTIVE_KEYS = [
  "description",
  "input-fields",
  "request-body",
  "operation-description",
  "output-fields",
  "response-body",
];

export const useUICApiCanvasCollapse = () => {
  const normalizeKeys = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }

    if (typeof value === "string" && value) {
      return [value];
    }

    return [];
  };

  const [activeKey, setActiveKey] = useState<string[]>(() => {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (!savedValue) {
      return DEFAULT_ACTIVE_KEYS;
    }

    try {
      const parsedValue = JSON.parse(savedValue);
      const normalizedValue = normalizeKeys(parsedValue);

      return normalizedValue.length ? normalizedValue : DEFAULT_ACTIVE_KEYS;
    } catch {
      return DEFAULT_ACTIVE_KEYS;
    }
  });

  const onChangeCollapse = (key: string | string[]) => {
    const normalizedKey = normalizeKeys(key);

    setActiveKey(normalizedKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedKey));
  };

  return {
    activeKey,
    onChangeCollapse,
  };
};
