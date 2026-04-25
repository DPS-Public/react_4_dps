import { message } from "antd";
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  serviceDuplicateUICanvasWithProgress,
  type DuplicateStep,
} from "../../services/serviceDuplicateUICanvasWithProgress";

export default function useUICanvasDuplicate({ selectedUI, uiList, selectedUICanvasId }) {
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const [steps, setSteps] = useState<DuplicateStep[]>([]);

  const duplicateUICanvas = async (name: string) => {
    if (!currentProject?.id) {
      message.error("Project not found");
      return null;
    }

    try {
      const newId = await serviceDuplicateUICanvasWithProgress(
        selectedUICanvasId,
        name,
        currentProject.id,
        userData,
        (updatedSteps) => {
          setSteps(updatedSteps);
        }
      );

      if (newId) {
        message.success("UI Canvas duplicated successfully");
        return newId;
      } else {
        message.error("Something went wrong while duplicating");
        return null;
      }
    } catch (e) {
      console.error(e);
      localStorage.removeItem("currentUI");
      message.error("Something went wrong while duplicating");
      return null;
    }
  };

  return { duplicateUICanvas, steps, setSteps };
}
