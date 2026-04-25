import { db } from "@/config/firebase";
import { message } from "antd";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

interface UseUICApiCanvasDescriptionUpdateProps {
  selectedAPICanvasId?: string | null;
}

export const useUICApiCanvasDescriptionUpdate = ({
  selectedAPICanvasId,
}: UseUICApiCanvasDescriptionUpdateProps) => {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");

  const createDescription = async (description: string) => {
    if (!selectedAPICanvasId) {
      message.error("No API Canvas selected");
      return;
    }

    if (!userData?.uid) {
      message.error("User not authenticated");
      return;
    }

    const apiCanvasDocRef = doc(db, "api_canvas", selectedAPICanvasId);

    try {
      const docSnap = await getDoc(apiCanvasDocRef);

      if (!docSnap.exists()) {
        message.error("API Canvas not found");
        return;
      }

      const oldDescription = docSnap.data().description || "";

      await updateDoc(apiCanvasDocRef, {
        description,
        updated_at: new Date().toISOString(),
      });

      await createHistoryRecord({
        apiCanvasId: selectedAPICanvasId,
        userId: userData.uid,
        userName: userData.name || userData.email || "Unknown User",
        userEmail: userData.email || "Unknown Email",
        actionType: "FIELD_UPDATE",
        fieldName: "description",
        oldValue: oldDescription,
        newValue: description,
      });

      message.success("Description updated successfully");
    } catch (error) {
      console.error("Error updating API Canvas description:", error);
      message.error("Failed to update description");
    }
  };

  const createHistoryRecord = async ({
    apiCanvasId,
    userId,
    userName,
    userEmail,
    actionType,
    fieldName,
    oldValue,
    newValue,
  }: {
    apiCanvasId: string;
    userId: string;
    userName: string;
    userEmail: string;
    actionType: string;
    fieldName: string;
    oldValue: any;
    newValue: any;
  }) => {
    try {
      const historyDocRef = doc(db, "api_canvas_history", apiCanvasId);
      const historySnap = await getDoc(historyDocRef);

      const historyRecord = {
        id: crypto.randomUUID(),
        userId,
        userName,
        userEmail,
        actionType,
        fieldName,
        oldValue,
        newValue,
        timestamp: Timestamp.now(),
      };

      if (!historySnap.exists()) {
        await setDoc(historyDocRef, {
          apiCanvasId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          [fieldName]: [historyRecord],
          allChanges: [historyRecord],
        });
        return;
      }

      await updateDoc(historyDocRef, {
        updatedAt: serverTimestamp(),
        [fieldName]: arrayUnion(historyRecord),
        allChanges: arrayUnion(historyRecord),
      });
    } catch (error) {
      console.error("Error creating API Canvas history record:", error);
    }
  };

  return {
    createDescription,
  };
};
