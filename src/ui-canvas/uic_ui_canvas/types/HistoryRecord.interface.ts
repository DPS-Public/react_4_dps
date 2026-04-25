import { GithubUrl } from "./GithubUrl.interface";

export interface HistoryRecord {
  id?: string;
  uiCanvasId: string;
  userId: string;
  userName: string;
  userEmail: string;
  actionType: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  githubUrls?: GithubUrl[];
  githubUrl?: GithubUrl | null;
  timestamp: any;
  uiCanvasDocument?: any;
  userDocument?: any;
  allChanges?: any[];
}
