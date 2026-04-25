import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface ServiceImportDPSFileParams {
  fileContent: any;
  currentProjectId: string;
  targetUICanvasId: string;
  importModes?: {
    description?: boolean;
    userAcceptanceCriteria?: boolean;
    externalViewLinks?: boolean;
    input?: boolean;
  };
}

const normalizeExternalLinksForImport = (externalViewLinks: unknown) => {
  if (!externalViewLinks) {
    return {};
  }

  const items = Array.isArray(externalViewLinks)
    ? externalViewLinks
    : Object.values(externalViewLinks as Record<string, unknown>).flatMap((value) =>
        Array.isArray(value) ? value : [value],
      );

  return items.reduce((accumulator, item, index) => {
    if (!item || typeof item !== "object") {
      return accumulator;
    }

    const typedItem = item as Record<string, unknown>;
    const id = String(typedItem.id || `imported_external_link_${index + 1}`);

    accumulator[id] = {
      ...typedItem,
      id,
      title: String(typedItem.title || `Imported External Link ${index + 1}`),
      type: String(typedItem.type || "external_link"),
      order: Number(typedItem.order || index + 1),
      defaultView: Boolean(typedItem.defaultView),
    };

    return accumulator;
  }, {} as Record<string, Record<string, unknown>>);
};

export const serviceImportDPSFile = async ({
  fileContent,
  currentProjectId,
  targetUICanvasId,
  importModes,
}: ServiceImportDPSFileParams) => {
  if (!targetUICanvasId) {
    throw new Error("Target UI Canvas is missing");
  }

  if (!fileContent || typeof fileContent !== "object") {
    throw new Error("Invalid JSON content");
  }

  const uiCanvasRef = doc(db, "ui_canvas", targetUICanvasId);
  const uiCanvasSnap = await getDoc(uiCanvasRef);

  if (!uiCanvasSnap.exists()) {
    throw new Error("Selected UI Canvas was not found");
  }

  const existingCanvasData = uiCanvasSnap.data();
  const existingInputBlock = existingCanvasData?.input?.[targetUICanvasId] || {};
  const nextPayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    import_date: new Date().toISOString(),
    imported: true,
  };

  if (typeof fileContent.description === "string") {
    nextPayload.description = importModes?.description
      ? fileContent.description
      : [existingCanvasData.description, fileContent.description].filter(Boolean).join("\n\n");
  }

  if (Array.isArray(fileContent.userAcceptanceCriteria)) {
    if (importModes?.userAcceptanceCriteria) {
      nextPayload.userAcceptanceCriteria = fileContent.userAcceptanceCriteria;
    } else {
      const mergedUacMap = [
        ...(Array.isArray(existingCanvasData.userAcceptanceCriteria) ? existingCanvasData.userAcceptanceCriteria : []),
        ...fileContent.userAcceptanceCriteria,
      ].reduce((accumulator, item) => {
        if (!item || typeof item !== "object") {
          return accumulator;
        }

        const typedItem = item as Record<string, unknown>;
        const key = String(typedItem.id || `uac_${accumulator.size + 1}`);
        accumulator.set(key, typedItem);
        return accumulator;
      }, new Map<string, Record<string, unknown>>());

      nextPayload.userAcceptanceCriteria = Array.from(mergedUacMap.values());
    }
  }

  if (fileContent.input && typeof fileContent.input === "object") {
    nextPayload.input = {
      ...(existingCanvasData.input || {}),
      [targetUICanvasId]: importModes?.input
        ? fileContent.input
        : {
            ...existingInputBlock,
            ...fileContent.input,
          },
    };
  }

  await setDoc(uiCanvasRef, nextPayload, { merge: true });

  if (fileContent.externalViewLinks) {
    const externalLinksRef = doc(db, "external_links", currentProjectId);
    const externalLinksSnap = await getDoc(externalLinksRef);
    const existingExternalLinks = externalLinksSnap.exists()
      ? externalLinksSnap.data()?.links || {}
      : {};
    const importedExternalLinks = normalizeExternalLinksForImport(fileContent.externalViewLinks);
    const currentCanvasExternalLinks = existingExternalLinks[targetUICanvasId] || {};

    await setDoc(
      externalLinksRef,
      {
        links: {
          ...existingExternalLinks,
          [targetUICanvasId]: importModes?.externalViewLinks
            ? importedExternalLinks
            : {
                ...currentCanvasExternalLinks,
                ...importedExternalLinks,
              },
        },
      },
      { merge: true },
    );
  }

  return {
    uiCanvasId: targetUICanvasId,
    uiCanvasLabel:
      existingCanvasData.label || existingCanvasData.name || fileContent.label || "UI Canvas",
  };
};
