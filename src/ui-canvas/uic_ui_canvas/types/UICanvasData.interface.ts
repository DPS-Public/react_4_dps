import { GithubUrl } from "./GithubUrl.interface";
import type { IUACCriterion } from "./ISelectedUI.interface";

export interface UICanvasData {
  id: string;
  label: string;
  description?: string;
  githubUrls?: GithubUrl[];
  userAcceptanceCriteria?: IUACCriterion[];
  [key: string]: any;
}
