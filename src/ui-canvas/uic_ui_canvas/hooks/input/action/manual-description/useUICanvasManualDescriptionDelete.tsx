import { useCallback } from "react";
import { serviceDeleteManualDescription } from "@/ui-canvas/uic_ui_canvas_actions_manual_description_update_drawer/services/serviceDeleteManualDescription";

export default function useUICanvasManualDescriptionDelete({
  selectedUICanvasId,
}: {
  selectedUICanvasId: string;
}) {
  const deleteManualDescription = useCallback(
    async (descriptionId: string, inputId: string) =>
      serviceDeleteManualDescription({
        selectedUICanvasId,
        descriptionId,
        inputId,
      }),
    [selectedUICanvasId],
  );

  return { deleteManualDescription };
}
