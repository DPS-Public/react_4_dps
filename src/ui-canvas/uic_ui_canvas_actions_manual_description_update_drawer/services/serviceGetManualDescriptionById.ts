import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import type { ManualDescriptionValue } from "../types/ManualDescriptionValue.interface";

export interface ManualDescriptionRecord extends ManualDescriptionValue {
  id: string;
  inputId: string;
  inputName?: string;
  order?: number;
  uiId?: string;
  uiName?: string;
}

export const serviceGetManualDescriptionById = async ({
  selectedUICanvasId,
  inputId,
  manualDescriptionId,
}: {
  selectedUICanvasId: string;
  inputId: string;
  manualDescriptionId: string;
}): Promise<ManualDescriptionRecord | null> => {
  if (!selectedUICanvasId || !inputId || !manualDescriptionId) {
    return null;
  }

  try {
    const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
    const docSnap = await getDoc(uiCanvasDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const manualDescription = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.manualDescription?.[
      manualDescriptionId
    ];

    if (!manualDescription) {
      return null;
    }

    return {
      id: manualDescription.id ?? manualDescriptionId,
      inputId: manualDescription.inputId ?? inputId,
      event: manualDescription.event ?? "",
      description: manualDescription.description ?? "",
      inputName: manualDescription.inputName ?? "",
      order: manualDescription.order,
      uiId: manualDescription.uiId ?? selectedUICanvasId,
      uiName: manualDescription.uiName ?? "",
    };
  } catch (error) {
    console.error("Error loading Manual Description by id:", error);
    return null;
  }
};
