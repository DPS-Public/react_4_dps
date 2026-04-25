import type { ComponentType } from "./ComponentType.enum";

export interface ComponentJson {
  id: string;
  componentType: ComponentType;
  hasLabel: boolean;
  content?: string;
  inputName?: string;
  cellNo?: number;
  fkTableId?: string | null;
  fkGroupId?: string | null;
  order?: number;
  css?: {
    container?: string;
    component?: string;
  };
}
