import { message } from "antd";
import { serviceCreateGithubHistoryRecord } from "../services/serviceCreateGithubHistoryRecord";
import { serviceUpdateGithubUrl } from "../services/serviceUpdateGithubUrl";
import { GithubUrl } from "../types/GithubUrl.interface";
import { utilFindGithubUrlIndex } from "../utils/utilFindGithubUrlIndex";

interface HandleLinkGithubFileParams {
  selectedUICanvasId: string | null;
  currentUserId: string;
  currentUserData: any;
  uiCanvasLabel?: string;
  githubUrls: GithubUrl[];
  targetGithubUrl?: GithubUrl | null;
  payload: {
    repoId: string;
    repoFullName: string;
    branch: string;
    defaultBranch?: string;
    sourceBranch?: string;
    filePath: string;
    fileName?: string;
  };
}

export const handleLinkGithubFile = async ({
  selectedUICanvasId,
  currentUserId,
  currentUserData,
  uiCanvasLabel,
  githubUrls,
  targetGithubUrl,
  payload,
}: HandleLinkGithubFileParams): Promise<boolean> => {
  if (!selectedUICanvasId || !targetGithubUrl) {
    message.error("No UI Canvas selected or GitHub URL not found");
    return false;
  }

  const index = utilFindGithubUrlIndex(githubUrls, targetGithubUrl);

  if (index === -1) {
    message.error("Target GitHub URL not found");
    return false;
  }

  const updatedGithubUrls = [...githubUrls];
  const oldUrl = updatedGithubUrls[index];
  const updatedUrl: GithubUrl = {
    ...oldUrl,
    repoId: payload.repoId,
    repoFullName: payload.repoFullName,
    branch: payload.branch,
    defaultBranch: payload.defaultBranch || payload.branch,
    sourceBranch: payload.sourceBranch || payload.branch,
    filePath: payload.filePath,
    fileName: payload.fileName || payload.filePath.split("/").pop(),
    addedAt: oldUrl.addedAt,
  };

  updatedGithubUrls[index] = updatedUrl;

  try {
    await serviceUpdateGithubUrl({
      selectedUICanvasId,
      currentUserId,
      updatedGithubUrls,
      updatedUrl,
    });

    await serviceCreateGithubHistoryRecord({
      currentUserId,
      currentUserData,
      selectedUICanvasId,
      uiCanvasLabel,
      historyData: {
        uiCanvasId: selectedUICanvasId,
        actionType: "GITHUB_URL_UPDATE",
        fieldName: "github_url",
        oldValue: oldUrl,
        newValue: updatedUrl,
        githubUrl: updatedUrl,
        timestamp: new Date(),
      },
    });

    message.success("GitHub file updated successfully!");
    return true;
  } catch (error: any) {
    message.error(`Failed to link GitHub file: ${error.message}`);
    return false;
  }
};
