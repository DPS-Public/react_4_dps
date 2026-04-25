import { v4 as uuidv4 } from "uuid";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/config/firebase.ts";

export interface DuplicateStep {
  id: string;
  label: string;
  status: "pending" | "in-progress" | "completed" | "error";
  errorMessage?: string;
}

export type OnProgressCallback = (steps: DuplicateStep[]) => void;

export const serviceDuplicateUICanvasWithProgress = async (
  selectedUICanvasId: string,
  newCanvasName: string,
  currentProjectId: string,
  userData: any,
  onProgress: OnProgressCallback
): Promise<string | null> => {
  const newId = uuidv4();
  const sourceDocRef = doc(db, "ui_canvas", selectedUICanvasId);
  const newDocRef = doc(db, "ui_canvas", newId);
  const projectDocRef = doc(db, "projects", currentProjectId);
  const externalLinksDocRef = doc(db, "external_links", currentProjectId);

  // Initialize steps
  const steps: DuplicateStep[] = [
    { id: "1", label: "UI Canvas created", status: "pending" },
    { id: "2", label: "Description copied", status: "pending" },
    { id: "3", label: "Inputs copied", status: "pending" },
    { id: "4", label: "User Acceptance Criteria copied", status: "pending" },
    { id: "5", label: "GitHub URLs & External Views copied", status: "pending" },
    { id: "6", label: "History record created", status: "pending" },
    { id: "7", label: "Project list updated", status: "pending" },
    { id: "8", label: "Duplication completed", status: "pending" },
  ];

  // Call onProgress immediately with initial steps
  onProgress(steps);

  let currentSteps = [...steps];

  const updateSteps = (stepId: string, status: "in-progress" | "completed" | "error", errorMessage?: string) => {
    currentSteps = currentSteps.map((s) =>
      s.id === stepId ? { ...s, status, errorMessage } : s
    );
    onProgress(currentSteps);
  };

  try {
    // Step 1: Fetch source document
    updateSteps("1", "in-progress");
    const sourceSnap = await getDoc(sourceDocRef);
    if (!sourceSnap.exists()) {
      updateSteps("1", "error", "Source UI Canvas not found");
      return null;
    }
    const sourceData = sourceSnap.data();
    updateSteps("1", "completed");

    // Step 2: Copy description
    updateSteps("2", "in-progress");
    const description = sourceData.description || "";
    updateSteps("2", "completed");

    // Step 3: Copy inputs
    updateSteps("3", "in-progress");
    let sourceInput = {};
    if (sourceData.input) {
      if (typeof sourceData.input === "object" && sourceData.input !== null) {
        if (sourceData.input[selectedUICanvasId] !== undefined) {
          sourceInput = sourceData.input[selectedUICanvasId];
        } else {
          sourceInput = sourceData.input;
        }
      }
    }
    updateSteps("3", "completed");

    // Step 4: Copy User Acceptance Criteria
    updateSteps("4", "in-progress");
    const userAcceptanceCriteria = sourceData.userAcceptanceCriteria || [];
    updateSteps("4", "completed");

    // Step 5: Copy GitHub URLs
    updateSteps("5", "in-progress");
    const githubUrls = sourceData.githubUrls || [];

    // External views are stored in `external_links/{projectId}` under `links[canvasId]`.
    const externalLinksSnap = await getDoc(externalLinksDocRef);
    if (externalLinksSnap.exists()) {
      const externalLinksData = externalLinksSnap.data();
      const projectLinks = externalLinksData?.links || {};
      const sourceCanvasExternalLinks = projectLinks?.[selectedUICanvasId];

      if (sourceCanvasExternalLinks && typeof sourceCanvasExternalLinks === "object") {
        await setDoc(
          externalLinksDocRef,
          {
            links: {
              ...projectLinks,
              [newId]: sourceCanvasExternalLinks,
            },
          },
          { merge: true }
        );
      }
    }

    updateSteps("5", "completed");

    // Step 6: Create history record
    updateSteps("6", "in-progress");
    const newCanvasData: any = {
      ...sourceData,
      id: newId,
      name: newCanvasName,
      label: newCanvasName,
      description: description,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userData?.uid || "",
      createdByName: userData?.name || userData?.email || "Unknown User",
      createdByEmail: userData?.email || "Unknown Email",
      duplicatedFrom: selectedUICanvasId,
      duplicatedFromName: sourceData.name || sourceData.label || "",
      userAcceptanceCriteria: userAcceptanceCriteria,
      githubUrls: githubUrls,
    };

    // input field-ini təhlükəsiz şəkildə əlavə et
    if (Object.keys(sourceInput).length > 0) {
      newCanvasData.input = { [newId]: sourceInput };
    } else {
      newCanvasData.input = {};
    }

    // undefined dəyərləri təmizlə
    Object.keys(newCanvasData).forEach((key) => {
      if (newCanvasData[key] === undefined) {
        delete newCanvasData[key];
      }
    });

    await setDoc(newDocRef, newCanvasData);
    updateSteps("6", "completed");

    // Step 7: Update project list
    updateSteps("7", "in-progress");
    await createUICanvasHistoryForDuplicate(newId, newCanvasName, selectedUICanvasId, sourceData, userData);

    const projectSnap = await getDoc(projectDocRef);
    if (projectSnap.exists()) {
      const projectData = projectSnap.data();
      let dsJson = [];

      try {
        const uiListObject = JSON.parse(projectData.digital_service_json || "{}");
        dsJson = Array.isArray(uiListObject)
          ? uiListObject
          : Object.keys(uiListObject).map((item) => ({ id: item, label: uiListObject[item] }));
      } catch (err) {
        console.warn("digital_service_json parse error:", err);
        dsJson = [];
      }

      // yeni öğeyi ekle
      dsJson.push({
        label: newCanvasName,
        id: newId,
      });

      // güncelle
      await updateDoc(projectDocRef, {
        digital_service_json: JSON.stringify(dsJson),
      });
    }
    updateSteps("7", "completed");

    // Step 8: Completion
    updateSteps("8", "in-progress");
    // Small delay to ensure all operations complete
    await new Promise((resolve) => setTimeout(resolve, 300));
    updateSteps("8", "completed");

    return newId;
  } catch (e) {
    console.error("Duplication error:", e);
    // Find which step is marked as in-progress and mark it as error
    const inProgressStep = steps.find((s) => s.status === "in-progress");
    if (inProgressStep) {
      updateSteps(
        inProgressStep.id,
        "error",
        (e as Error)?.message || "An error occurred"
      );
    } else {
      updateSteps("8", "error", "Duplication failed: " + ((e as Error)?.message || "Unknown error"));
    }
    return null;
  }
};

// Create ui_canvas_history for duplicated canvas
const createUICanvasHistoryForDuplicate = async (
  newCanvasId: string,
  name: string,
  sourceCanvasId: string,
  sourceData: any,
  userData: any
) => {
  try {
    const uiCanvasHistoryDocRef = doc(db, "ui_canvas_history", newCanvasId);

    const duplicateRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: userData?.uid || "unknown",
      userName: userData?.name || userData?.email || "Unknown User",
      userEmail: userData?.email || "Unknown Email",
      actionType: "CANVAS_DUPLICATE",
      fieldName: "canvas",
      oldValue: null,
      newValue: name,
      sourceCanvasId: sourceCanvasId,
      sourceCanvasName: sourceData.name || sourceData.label || "",
      timestamp: new Date().toISOString(),
    };

    // Create new history document for duplicated canvas
    await setDoc(uiCanvasHistoryDocRef, {
      uiCanvasId: newCanvasId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      canvas_duplicate: [duplicateRecord],
      name: [
        {
          ...duplicateRecord,
          actionType: "FIELD_CREATE",
          fieldName: "name",
        },
      ],
      allChanges: [duplicateRecord],
      createdBy: userData?.uid || "",
      createdByName: userData?.name || userData?.email || "Unknown User",
      createdByEmail: userData?.email || "Unknown Email",
    });

    // Also add to source canvas history if it exists
    await addDuplicateHistoryToSource(sourceCanvasId, newCanvasId, name, userData);  } catch (error) {
    console.error("Error creating UI Canvas duplicate history:", error);
  }
};

// Add duplicate record to source canvas history
const addDuplicateHistoryToSource = async (
  sourceCanvasId: string,
  newCanvasId: string,
  newCanvasName: string,
  userData: any
) => {
  try {
    const sourceHistoryDocRef = doc(db, "ui_canvas_history", sourceCanvasId);

    const sourceDuplicateRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: userData?.uid || "unknown",
      userName: userData?.name || userData?.email || "Unknown User",
      userEmail: userData?.email || "Unknown Email",
      actionType: "CANVAS_DUPLICATED_FROM",
      fieldName: "canvas",
      oldValue: null,
      newValue: newCanvasName,
      duplicatedCanvasId: newCanvasId,
      duplicatedCanvasName: newCanvasName,
      timestamp: new Date().toISOString(),
    };

    // Check if source history document exists
    const historyDocSnap = await getDoc(sourceHistoryDocRef);

    if (historyDocSnap.exists()) {
      // Update existing document with arrayUnion
      await updateDoc(sourceHistoryDocRef, {
        updatedAt: serverTimestamp(),
        canvas_duplicated_from: arrayUnion(sourceDuplicateRecord),
        allChanges: arrayUnion(sourceDuplicateRecord),
      });
    }  } catch (error) {
    console.error("Error adding source canvas duplicate history:", error);
  }
};
