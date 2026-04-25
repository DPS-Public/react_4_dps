import { serviceUpdateComponentInformation } from "@/ui-canvas/uic_ui_canvas_actions_component_information_update_drawer/services/serviceUpdateComponentInformation";
import type { ComponentInformationValue } from "@/ui-canvas/uic_ui_canvas_actions_component_information_update_drawer/types/ComponentInformationValue.interface";

export function useUICanvasComponentInformationUpdate({
  selectedUICanvasId,
}: {
  selectedUICanvasId: string;
}) {
  const updateComponentInformation = async (
    componentInformationValue: ComponentInformationValue,
    inputId: string,
  ) => {
    return serviceUpdateComponentInformation({
      selectedUICanvasId,
      inputId,
      componentInformationValue,
    });
  };

  return { updateComponentInformation };
}
