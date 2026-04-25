import { message } from "antd";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";
import { serviceUpsertComponentInformationHistory } from "./serviceUpsertComponentInformationHistory";
import type { ComponentInformationValue } from "../types/ComponentInformationValue.interface";

export const serviceUpdateComponentInformation = async ({
  selectedUICanvasId,
  inputId,
  componentInformationValue,
}: {
  selectedUICanvasId: string;
  inputId: string;
  componentInformationValue: ComponentInformationValue;
}) => {
  if (!selectedUICanvasId || !inputId) {
    return false;
  }

  const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);

  try {
    const docSnap = await getDoc(uiCanvasDocRef);

    if (!docSnap.exists()) {
      message.error("UI Canvas document not found");
      return false;
    }

    const existingInput = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];

    if (!existingInput) {
      message.error("Input not found");
      return false;
    }

    const componentType =
      componentInformationValue.componentType ?? existingInput.componentType ?? ComponentType.Txt;
    const sanitizedComponentInformationValue: ComponentInformationValue = {
      inputName: componentInformationValue.inputName.trim(),
      componentType,
      cellNo: String(componentInformationValue.cellNo ?? existingInput.cellNo ?? "6"),
      content: componentInformationValue.content ?? "",
      hasLabel:
        componentInformationValue.hasLabel !== undefined
          ? componentInformationValue.hasLabel
          : ![ComponentType.Btn, ComponentType.Hlink].includes(componentType),
    };

    const updatedInput = {
      ...existingInput,
      ...sanitizedComponentInformationValue,
    };

    await updateDoc(uiCanvasDocRef, {
      [`input.${selectedUICanvasId}.${inputId}`]: updatedInput,
    });

    await serviceUpsertComponentInformationHistory({
      selectedUICanvasId,
      inputId,
      inputName: sanitizedComponentInformationValue.inputName,
      oldComponentInformation: {
        inputName: existingInput.inputName ?? "",
        componentType: existingInput.componentType ?? ComponentType.Txt,
        cellNo: String(existingInput.cellNo ?? "6"),
        content: existingInput.content ?? "",
        hasLabel:
          existingInput.hasLabel !== undefined
            ? Boolean(existingInput.hasLabel)
            : ![ComponentType.Btn, ComponentType.Hlink].includes(
                existingInput.componentType ?? ComponentType.Txt,
              ),
      },
      newComponentInformation: sanitizedComponentInformationValue,
    });

    message.success("Component Information updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating Component Information:", error);
    message.error("Failed to update Component Information");
    return false;
  }
};
