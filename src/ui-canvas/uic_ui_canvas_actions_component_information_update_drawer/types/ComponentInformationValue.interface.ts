import type { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";

export interface ComponentInformationValue {
  inputName: string;
  componentType: ComponentType;
  cellNo: string;
  content: string;
  hasLabel: boolean;
}
