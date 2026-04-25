import type { IUIInput } from "./IUIInput.interface";

export interface IUACCriterion {
  id: string;
  title: string;
  description?: string;
  taskIds: string[];
}

export interface ISelectedUI {
  id: string;
  label: string;
  description: string;
  input: Record<string, IUIInput>;
  userAcceptanceCriteria?: IUACCriterion[];
}
