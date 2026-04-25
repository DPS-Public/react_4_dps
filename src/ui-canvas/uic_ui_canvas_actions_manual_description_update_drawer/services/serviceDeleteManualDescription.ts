import { message } from "antd";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import { serviceUpsertManualDescriptionHistory } from "./serviceUpsertManualDescriptionHistory";

const getCurrentUserData = () => {
  try {
    return JSON.parse(localStorage.getItem("userData") || "{}");
  } catch (error) {
    console.error("Error reading userData from localStorage:", error);
    return {};
  }
};

const createHistoryRecordId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const serviceDeleteManualDescription = async ({
  selectedUICanvasId,
  descriptionId,
  inputId,
}: {
  selectedUICanvasId: string;
  descriptionId: string;
  inputId: string;
}) => {
  if (!selectedUICanvasId || !descriptionId || !inputId) {
    console.warn("selectedUICanvasId, inputId or descriptionId is not set");
    return false;
  }

  const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

  try {
    const docSnap = await getDoc(uiCanvasDocRef);
    let deletedDescriptionData: Record<string, unknown> | null = null;
    let inputName = "";

    if (docSnap.exists()) {
      deletedDescriptionData =
        docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.manualDescription?.[descriptionId] || null;
      inputName = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId]?.inputName || "";
    }

    await updateDoc(uiCanvasDocRef, {
      [`input.${selectedUICanvasId}.${inputId}.manualDescription.${descriptionId}`]: deleteField(),
    });

    const userData = getCurrentUserData();
    await serviceUpsertManualDescriptionHistory({
      uiCanvasId: selectedUICanvasId,
      historyRecord: {
        id: createHistoryRecordId(),
        userId: userData?.uid || "unknown",
        userName: userData?.name || userData?.email || "Unknown User",
        userEmail: userData?.email || "Unknown Email",
        actionType: "MANUAL_DESCRIPTION_DELETE",
        fieldName: "manual_descriptions",
        inputId,
        inputName,
        manualDescriptionId: descriptionId,
        deletedDescriptionData,
        timestamp: new Date().toISOString(),
      },
    });

    message.success("Manual Description deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting Manual Description:", error);
    message.error("Failed to delete Manual Description");
    return false;
  }
};
