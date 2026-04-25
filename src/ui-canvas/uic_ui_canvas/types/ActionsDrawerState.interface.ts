import { GithubUrl } from "./GithubUrl.interface";

export interface ActionsDrawerState {
  open: boolean;
  mode: "create" | "view" | "edit" | string;
  parentId: string | null;
  targetGithubUrl?: GithubUrl | null;
}
