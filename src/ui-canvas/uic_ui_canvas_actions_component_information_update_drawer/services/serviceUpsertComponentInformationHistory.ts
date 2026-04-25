import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";
import type { ComponentInformationValue } from "../types/ComponentInformationValue.interface";

export const serviceUpsertComponentInformationHistory = async ({
  selectedUICanvasId,
  inputId,
  inputName,
  oldComponentInformation,
  newComponentInformation,
}: {
  selectedUICanvasId: string;
  inputId: string;
  inputName: string;
  oldComponentInformation: ComponentInformationValue;
  newComponentInformation: ComponentInformationValue;
}) => {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const uiCanvasHistoryDocRef = doc(db, "ui_canvas_history", selectedUICanvasId);
  const historyRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    userId: userData?.uid || "unknown",
    userName: userData?.name || userData?.email || "Unknown User",
    userEmail: userData?.email || "Unknown Email",
    actionType: "COMPONENT_INFORMATION_UPDATE",
    fieldName: "component_information",
    inputId,
    inputName,
    oldComponentInformation,
    newComponentInformation,
    timestamp: new Date().toISOString(),
  };

  const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

  if (!historyDocSnap.exists()) {
    await setDoc(uiCanvasHistoryDocRef, {
      uiCanvasId: selectedUICanvasId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      component_information: [historyRecord],
      allChanges: [historyRecord],
    });
    return;
  }

  await updateDoc(uiCanvasHistoryDocRef, {
    updatedAt: serverTimestamp(),
    component_information: arrayUnion(historyRecord),
    allChanges: arrayUnion(historyRecord),
  });
};
