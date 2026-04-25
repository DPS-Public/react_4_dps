import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";

export const serviceListenUICanvasHistory = (
  selectedUICanvasId: string,
  onData: (data: any | null) => void,
  onError: (error: Error) => void
) => {
  return onSnapshot(
    doc(db, "ui_canvas_history", selectedUICanvasId),
    (docSnapshot) => onData(docSnapshot.exists() ? docSnapshot.data() : null),
    (error) => onError(error)
  );
};
