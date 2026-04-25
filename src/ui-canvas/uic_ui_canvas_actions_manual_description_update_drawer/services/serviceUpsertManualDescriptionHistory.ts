import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.ts";

export const serviceUpsertManualDescriptionHistory = async ({
  uiCanvasId,
  historyRecord,
}: {
  uiCanvasId: string;
  historyRecord: Record<string, unknown>;
}) => {
  const uiCanvasHistoryDocRef = doc(db, "ui_canvas_history", uiCanvasId);
  const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

  if (!historyDocSnap.exists()) {
    await setDoc(
      uiCanvasHistoryDocRef,
      {
        uiCanvasId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        manual_descriptions: [historyRecord],
        allChanges: [historyRecord],
      },
      { merge: true },
    );
    return;
  }

  await updateDoc(uiCanvasHistoryDocRef, {
    updatedAt: serverTimestamp(),
    manual_descriptions: arrayUnion(historyRecord),
    allChanges: arrayUnion(historyRecord),
  });
};
