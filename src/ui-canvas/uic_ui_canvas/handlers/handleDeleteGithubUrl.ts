import { message } from "antd";
import { serviceCreateGithubHistoryRecord } from "../services/serviceCreateGithubHistoryRecord";
import { serviceDeleteGithubUrl } from "../services/serviceDeleteGithubUrl";
import { GithubUrl } from "../types/GithubUrl.interface";

interface HandleDeleteGithubUrlParams {
  selectedUICanvasId: string | null;
  githubUrl: GithubUrl;
  currentUserId: string;
  currentUserData: any;
  uiCanvasLabel?: string;
}

export const handleDeleteGithubUrl = async ({
  selectedUICanvasId,
  githubUrl,
  currentUserId,
  currentUserData,
  uiCanvasLabel,
}: HandleDeleteGithubUrlParams): Promise<void> => {
  if (!selectedUICanvasId) {
    message.error("No UI Canvas selected");
    return;
  }

  try {
    const result = await serviceDeleteGithubUrl({ selectedUICanvasId, githubUrl });

    await serviceCreateGithubHistoryRecord({
      currentUserId,
      currentUserData,
      selectedUICanvasId,
      uiCanvasLabel,
      historyData: {
        uiCanvasId: selectedUICanvasId,
        actionType: "GITHUB_URL_DELETE",
        fieldName: "github_urls",
        oldValue: result.currentGithubUrls,
        newValue: result.updatedGithubUrls,
        githubUrl: result.removedUrl,
        timestamp: new Date(),
      },
    });

    message.success("GitHub file removed successfully");
  } catch (error: any) {
    message.error(`Failed to delete: ${error.message}`);
  }
};
