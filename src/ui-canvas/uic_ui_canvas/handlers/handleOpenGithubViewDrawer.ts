import { ActionsDrawerState } from "../types/ActionsDrawerState.interface";
import { GithubUrl } from "../types/GithubUrl.interface";

interface HandleOpenGithubViewDrawerParams {
  githubUrl: GithubUrl;
  setDrawerState: (state: ActionsDrawerState) => void;
}

export const handleOpenGithubViewDrawer = ({
  githubUrl,
  setDrawerState,
}: HandleOpenGithubViewDrawerParams): void => {
  setDrawerState({
    open: true,
    mode: "view",
    parentId: null,
    targetGithubUrl: githubUrl,
  });
};
