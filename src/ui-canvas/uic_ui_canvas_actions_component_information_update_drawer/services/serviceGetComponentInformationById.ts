import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";
import type { ComponentInformationValue } from "../types/ComponentInformationValue.interface";

const defaultComponentInformationValue: ComponentInformationValue = {
  inputName: "",
  componentType: ComponentType.Txt,
  cellNo: "6",
  content: "",
  hasLabel: true,
};

export const serviceGetComponentInformationById = async ({
  selectedUICanvasId,
  inputId,
}: {
  selectedUICanvasId: string;
  inputId: string;
}) => {
  if (!selectedUICanvasId || !inputId) {
    return null;
  }

  const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
  const docSnap = await getDoc(uiCanvasDocRef);

  if (!docSnap.exists()) {
    return null;
  }

  const componentInformation = docSnap.data()?.input?.[selectedUICanvasId]?.[inputId];

  if (!componentInformation) {
    return null;
  }

  const componentType =
    (componentInformation.componentType as ComponentType | undefined) ?? ComponentType.Txt;

  return {
    inputName: componentInformation.inputName ?? defaultComponentInformationValue.inputName,
    componentType,
    cellNo: String(componentInformation.cellNo ?? defaultComponentInformationValue.cellNo),
    content: componentInformation.content ?? defaultComponentInformationValue.content,
    hasLabel:
      componentInformation.hasLabel !== undefined
        ? Boolean(componentInformation.hasLabel)
        : ![ComponentType.Btn, ComponentType.Hlink].includes(componentType),
  } satisfies ComponentInformationValue;
};
