import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";

export async function serviceSaveAIGeneratedCanvas(
  aiResult: {
    Api?: unknown;
    CollectionCanvas?: unknown;
    Database?: unknown;
    FormCard?: {
      Config?: Record<string, { description?: string }>;
      Input?: Record<string, unknown>;
    };
  },
  selectedUICanvasId: string,
  description: string,
) {
  if (selectedUICanvasId) {
    const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
    const formInputs = aiResult?.FormCard?.Input ?? {};

    if (Object.keys(formInputs).length) {
      await updateDoc(uiCanvasDocRef, {
        [`input.${selectedUICanvasId}`]: formInputs[selectedUICanvasId] ?? formInputs,
        description: aiResult?.FormCard?.Config?.[selectedUICanvasId]?.description ?? description,
      });
    }
  }

  if (aiResult?.Api) {
    await addDoc(collection(db, "api"), aiResult.Api);
  }

  if (aiResult?.CollectionCanvas) {
    await addDoc(collection(db, "collection_canvas"), aiResult.CollectionCanvas);
  }

  if (aiResult?.Database) {
    await addDoc(collection(db, "database"), aiResult.Database);
  }
}
