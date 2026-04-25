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

export default function useUICanvasCreate() {
  const currentProject = useSelector(
    (state: RootState) => state.project.currentProject
  );

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");

  const createUICanvas = async (name: string) => {
    if (!userData?.uid) {
      message.error("User not authenticated");
      return;
    }

    if (!currentProject?.id) {
      message.error("Project not selected");
      return;
    }

    const id = uuidv4();
    const uiCanvasRef = doc(db, "ui_canvas", id);
    const projectRef = doc(db, "projects", currentProject.id);

    try {
      // 1️⃣ Create canvas
      await setDoc(uiCanvasRef, {
        id,
        name,
        input: {},
        description: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.uid,
        projectId: currentProject.id,
      });

      localStorage.setItem("currentUI", id);

      // 2️⃣ Update project digital_service_json - FIXED TO PRESERVE EXISTING DATA
      const projectSnap = await getDoc(projectRef);
      let dsJson: any[] = [];

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const digitalServiceJson = projectData.digital_service_json;        
        // Safely parse digital_service_json
        if (digitalServiceJson) {
          try {
            if (typeof digitalServiceJson === 'string') {
              // If it's a string, try to parse it
              const parsed = JSON.parse(digitalServiceJson);              
              // Ensure it's an array
              if (Array.isArray(parsed)) {
                dsJson = parsed;              } else if (parsed && typeof parsed === 'object') {                dsJson = Object.entries(parsed).map(([key, value]) => ({
                  id: key,
                  ...(value as any)
                }));
              }
            } else if (Array.isArray(digitalServiceJson)) {              dsJson = digitalServiceJson;
            } else if (digitalServiceJson && typeof digitalServiceJson === 'object') {              dsJson = Object.entries(digitalServiceJson).map(([key, value]) => ({
                id: key,
                ...(value as any)
              }));
            }
          } catch (error) {
            console.error("Error parsing digital_service_json:", error);
            console.error("Problematic JSON:", digitalServiceJson);
            dsJson = []; // Reset to empty array on error
          }
        } else {
          dsJson = [];
        }
        // Check if canvas already exists to avoid duplicates
        const existingIndex = dsJson.findIndex(item => item.id === id);
        if (existingIndex === -1) {
          dsJson.push({ id, label: name });
        } else {
          dsJson[existingIndex] = { id, label: name };
        }        await updateDoc(projectRef, {
          digital_service_json: JSON.stringify(dsJson),
        });      } else {        // If project doesn't exist, create the field
        await updateDoc(projectRef, {
          digital_service_json: JSON.stringify([{ id, label: name }]),
        });
      }

      // 3️⃣ History
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
    } catch (error) {
      console.error("Error creating UI Canvas:", error);
      localStorage.removeItem("currentUI");
      message.error("Something went wrong");
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
