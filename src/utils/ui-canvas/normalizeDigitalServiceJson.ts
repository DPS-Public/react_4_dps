type UICanvasListItem = {
  id: string;
  label: string;
};

const normalizeObjectEntry = (id: string, value: unknown): UICanvasListItem | null => {
  if (!id) {
    return null;
  }

  if (typeof value === "string") {
    return { id, label: value };
  }

  if (value && typeof value === "object") {
    const typedValue = value as { id?: string; label?: string; name?: string };

    return {
      id: typedValue.id || id,
      label: typedValue.label || typedValue.name || id,
    };
  }

  return { id, label: id };
};

export const normalizeDigitalServiceJson = (digitalServiceJson: unknown): UICanvasListItem[] => {
  if (!digitalServiceJson) {
    return [];
  }

  let parsedValue = digitalServiceJson;

  if (typeof digitalServiceJson === "string") {
    try {
      parsedValue = JSON.parse(digitalServiceJson);
    } catch (error) {
      console.error("Failed to parse digital_service_json", error);
      return [];
    }
  }

  if (Array.isArray(parsedValue)) {
    return parsedValue
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const typedItem = item as { id?: string; label?: string; name?: string };
        const id = typedItem.id || "";

        if (!id) {
          return null;
        }

        return {
          id,
          label: typedItem.label || typedItem.name || id,
        };
      })
      .filter((item): item is UICanvasListItem => Boolean(item));
  }

  if (parsedValue && typeof parsedValue === "object") {
    return Object.entries(parsedValue)
      .map(([id, value]) => normalizeObjectEntry(id, value))
      .filter((item): item is UICanvasListItem => Boolean(item));
  }

  return [];
};
