export type ApiCanvasListItem = {
  id: string;
  name: string;
};

const normalizeObjectEntry = (id: string, value: unknown): ApiCanvasListItem | null => {
  if (!id) {
    return null;
  }

  if (typeof value === "string") {
    return { id, name: value };
  }

  if (value && typeof value === "object") {
    const typedValue = value as { id?: string; name?: string; label?: string };

    return {
      id: typedValue.id || id,
      name: typedValue.name || typedValue.label || id,
    };
  }

  return { id, name: id };
};

export const normalizeApiJson = (apiJson: unknown): ApiCanvasListItem[] => {
  if (!apiJson) {
    return [];
  }

  let parsedValue = apiJson;

  if (typeof apiJson === "string") {
    try {
      parsedValue = JSON.parse(apiJson);
    } catch (error) {
      console.error("Failed to parse api_json", error);
      return [];
    }
  }

  if (Array.isArray(parsedValue)) {
    return parsedValue
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const typedItem = item as { id?: string; name?: string; label?: string };
        const id = typedItem.id || "";

        if (!id) {
          return null;
        }

        return {
          id,
          name: typedItem.name || typedItem.label || id,
        };
      })
      .filter((item): item is ApiCanvasListItem => Boolean(item));
  }

  if (parsedValue && typeof parsedValue === "object") {
    return Object.entries(parsedValue)
      .map(([id, value]) => normalizeObjectEntry(id, value))
      .filter((item): item is ApiCanvasListItem => Boolean(item));
  }

  return [];
};
