import { useCallback } from "react";
import { RootState, useAppSelector } from "@/store";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";
import type { ManualDescriptionValue } from "@/ui-canvas/uic_ui_canvas_actions_manual_description_update_drawer/types/ManualDescriptionValue.interface";
import { serviceUpdateManualDescription } from "@/ui-canvas/uic_ui_canvas_actions_manual_description_update_drawer/services/serviceUpdateManualDescription";

export default function useUICanvasManualDescriptionUpdate({
  selectedUICanvasId,
  selectedInput,
}: {
  selectedUICanvasId: string;
  selectedInput: SelectedManualDescriptionAction | null;
}) {
  const { currentProject } = useAppSelector((state: RootState) => state.project);

  const updateManualDescription = useCallback(
    async (value: ManualDescriptionValue, inputId: string) =>
      serviceUpdateManualDescription({
        selectedUICanvasId,
        selectedInput,
        inputId,
        manualDescriptionValue: value,
        currentProjectId: currentProject?.id,
      }),
    [currentProject?.id, selectedInput, selectedUICanvasId],
  );

  return { updateManualDescription };
}
