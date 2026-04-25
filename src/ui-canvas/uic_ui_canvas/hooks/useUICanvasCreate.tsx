import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { v4 as uuidv4 } from "uuid";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { message } from "antd";
import { normalizeDigitalServiceJson } from "@/utils/ui-canvas/normalizeDigitalServiceJson";

export default function useUICanvasCreate() {
  const currentProject = useSelector(
    (state: RootState) => state.project.currentProject
  );

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");

  const createUICanvas = async (
    name: string,
    options?: {
      selectAfterCreate?: boolean;
    },
  ) => {
    const { selectAfterCreate = true } = options ?? {};

    if (!userData?.uid) {
      message.error("User not authenticated");
      return null;
    }

    if (!currentProject?.id) {
      message.error("Project not selected");
      return null;
    }

    const id = uuidv4();
    const uiCanvasRef = doc(db, "ui_canvas", id);
    const projectRef = doc(db, "projects", currentProject.id);

    try {
      await setDoc(uiCanvasRef, {
        id,
        name,
        label: name,
        input: {},
        description: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.uid,
        projectId: currentProject.id,
      });

      if (selectAfterCreate) {
        localStorage.setItem("currentUI", id);
      }

      const projectSnap = await getDoc(projectRef);
      let dsJson: Array<{ id: string; label: string }> = [];

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        dsJson = normalizeDigitalServiceJson(projectData.digital_service_json);

        const existingIndex = dsJson.findIndex((item) => item.id === id);
        if (existingIndex === -1) {
          dsJson.push({ id, label: name });
        } else {
          dsJson[existingIndex] = { id, label: name };
        }

        await updateDoc(projectRef, {
          digital_service_json: JSON.stringify(dsJson),
        });
      } else {
        await updateDoc(projectRef, {
          digital_service_json: JSON.stringify([{ id, label: name }]),
        });
      }

      await createHistoryRecord({
        uiCanvasId: id,
        userId: userData.uid,
        userName: userData.name || userData.email || "Unknown User",
        userEmail: userData.email || "Unknown Email",
        actionType: "CANVAS_CREATE",
        fieldName: "canvas_name",
        oldValue: null,
        newValue: name,
      });

      message.success("UI Canvas created successfully");
      return { id, label: name };
    } catch (error) {
      console.error("Error creating UI Canvas:", error);
      if (selectAfterCreate) {
        localStorage.removeItem("currentUI");
      }
      message.error("Something went wrong");
      return null;
    }
  };

  const createHistoryRecord = async ({
    uiCanvasId,
    userId,
    userName,
    userEmail,
    actionType,
    fieldName,
    oldValue,
    newValue,
  }: {
    uiCanvasId: string;
    userId: string;
    userName: string;
    userEmail: string;
    actionType: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string;
  }) => {
    const historyRef = collection(db, "ui_canvas_history");

    await addDoc(historyRef, {
      uiCanvasId,
      userId,
      userName,
      userEmail,
      actionType,
      fieldName,
      oldValue,
      newValue,
      timestamp: serverTimestamp(),
    });
  };

  return { createUICanvas };
}
