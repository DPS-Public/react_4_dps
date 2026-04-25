import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { HistoryRecord } from "../types/HistoryRecord.interface";

interface ServiceCreateGithubHistoryRecordParams {
  currentUserId: string;
  currentUserData: any;
  selectedUICanvasId: string;
  uiCanvasLabel?: string;
  historyData: Omit<HistoryRecord, "id" | "userId" | "userName" | "userEmail">;
}

const sanitizeFirestoreValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreValue(item));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce<Record<string, any>>((acc, [key, nestedValue]) => {
      if (nestedValue !== undefined) {
        acc[key] = sanitizeFirestoreValue(nestedValue);
      }

      return acc;
    }, {});
  }

  return value;
};

export const serviceCreateGithubHistoryRecord = async ({
  currentUserId,
  currentUserData,
  selectedUICanvasId,
  uiCanvasLabel,
  historyData,
}: ServiceCreateGithubHistoryRecordParams): Promise<void> => {
  const historyDocRef = doc(db, "ui_canvas_history", selectedUICanvasId);

  const change = sanitizeFirestoreValue({
    actionType: historyData.actionType,
    fieldName: historyData.fieldName,
    oldValue: historyData.oldValue,
    newValue: historyData.newValue,
    githubUrl: historyData.githubUrl,
    githubUrls: historyData.githubUrls,
    timestamp: historyData.timestamp,
    userId: currentUserId,
    userName: currentUserData.name || currentUserData.email || "Unknown User",
    userEmail: currentUserData.email || "Unknown Email",
  });

  const existingDoc = await getDoc(historyDocRef);

  if (existingDoc.exists()) {
    const existingChanges = existingDoc.data().allChanges || [];
    await updateDoc(historyDocRef, {
      allChanges: [change, ...existingChanges].slice(0, 50),
      lastUpdated: serverTimestamp(),
      uiCanvasId: selectedUICanvasId,
      uiCanvasLabel: uiCanvasLabel || "Unknown Canvas",
    });
    return;
  }

  await setDoc(historyDocRef, {
    allChanges: [change],
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    uiCanvasId: selectedUICanvasId,
    uiCanvasLabel: uiCanvasLabel || "Unknown Canvas",
  });
};
