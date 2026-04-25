import type { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";

export interface SelectedComponentInformationInput {
  id: string;
  inputName?: string;
  componentType?: ComponentType;
  cellNo?: string;
  content?: string;
  hasLabel?: boolean;
}
