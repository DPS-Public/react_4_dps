import { message } from "antd";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";
import type { ManualDescriptionValue } from "../types/ManualDescriptionValue.interface";
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

export const serviceUpdateManualDescription = async ({
  selectedUICanvasId,
  selectedInput,
  inputId,
  manualDescriptionValue,
  currentProjectId,
}: {
  selectedUICanvasId: string;
  selectedInput: SelectedManualDescriptionAction | null;
  inputId: string;
  manualDescriptionValue: ManualDescriptionValue;
  currentProjectId?: string;
}) => {
  if (!selectedUICanvasId || !inputId || !selectedInput?.id) {
    console.warn("selectedUICanvasId, inputId or selectedInput.id is not set");
    return false;
  }

  const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

  try {
    const docSnap = await getDoc(uiCanvasDocRef);

    if (!docSnap.exists()) {
      message.error("UI Canvas document not found");
      return false;
    }

    const manualDescriptionId = selectedInput.id;
    const inputBlock = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];
    const existingManualDescription =
      inputBlock?.manualDescription?.[manualDescriptionId];

    if (!existingManualDescription) {
      message.error("Manual Description not found");
      return false;
    }

    const sanitizedValue = {
      event: manualDescriptionValue.event ?? "",
      description: manualDescriptionValue.description ?? "",
    };

    const mergedManualDescription = {
      ...existingManualDescription,
      ...sanitizedValue,
    };

    await updateDoc(uiCanvasDocRef, {
      [`input.${selectedUICanvasId}.${inputId}.manualDescription.${manualDescriptionId}`]:
        mergedManualDescription,
    });

    const userData = getCurrentUserData();
    await serviceUpsertManualDescriptionHistory({
      uiCanvasId: selectedUICanvasId,
      historyRecord: {
        id: createHistoryRecordId(),
        userId: userData?.uid || "unknown",
        userName: userData?.name || userData?.email || "Unknown User",
        userEmail: userData?.email || "Unknown Email",
        actionType: "MANUAL_DESCRIPTION_UPDATE",
        fieldName: "manual_descriptions",
        inputId,
        inputName: inputBlock?.inputName || "",
        manualDescriptionId,
        oldValue: existingManualDescription,
        newValue: mergedManualDescription,
        timestamp: new Date().toISOString(),
      },
    });

    if (currentProjectId) {
      const descriptionText = mergedManualDescription.event
        ? `[${mergedManualDescription.event}] ${mergedManualDescription.description || ""}`
        : mergedManualDescription.description || "";

      await services.syncBacklogIssuesOnDescriptionUpdate(
        currentProjectId,
        selectedUICanvasId,
        inputId,
        manualDescriptionId,
        "manualDescription",
        {
          key: "manualDescription",
          event: mergedManualDescription.event ?? "",
          description: mergedManualDescription.description ?? "",
          inputName: inputBlock?.inputName || "",
        },
        descriptionText,
      );
    }

    message.success("Manual Description updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating Manual Description:", error);
    message.error("Failed to update Manual Description");
    return false;
  }
};
