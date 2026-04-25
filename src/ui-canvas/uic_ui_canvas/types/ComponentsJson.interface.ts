import type { ComponentsJsonValue } from "./ComponentsJsonValue.type";

export interface ComponentsJson {
  css?: string;
  [componentId: string]: ComponentsJsonValue;
}
