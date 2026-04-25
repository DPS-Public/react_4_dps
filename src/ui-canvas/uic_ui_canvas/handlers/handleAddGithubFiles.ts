import { message } from "antd";
import { serviceAddGithubFiles } from "../services/serviceAddGithubFiles";
import { serviceCreateGithubHistoryRecord } from "../services/serviceCreateGithubHistoryRecord";
import { AddGithubFilePayload } from "../types/AddGithubFilePayload.interface";

interface HandleAddGithubFilesParams {
  selectedUICanvasId: string | null;
  currentUserId: string;
  currentUserData: any;
  uiCanvasLabel?: string;
  parentId: string | null;
  files: AddGithubFilePayload[];
}

export const handleAddGithubFiles = async ({
  selectedUICanvasId,
  currentUserId,
  currentUserData,
  uiCanvasLabel,
  parentId,
  files,
}: HandleAddGithubFilesParams): Promise<string[]> => {
  if (!selectedUICanvasId) {
    message.error("No UI Canvas selected. Please select a UI Canvas first.");
    return [];
  }

  try {
    const result = await serviceAddGithubFiles({
      selectedUICanvasId,
      currentUserId,
      parentId,
      files,
    });

    if (result.uniqueNewUrls.length === 0) {
      message.warning("All files are already added");
      return [];
    }

    await serviceCreateGithubHistoryRecord({
      currentUserId,
      currentUserData,
      selectedUICanvasId,
      uiCanvasLabel,
      historyData: {
        uiCanvasId: selectedUICanvasId,
        actionType: "GITHUB_URLS_ADD",
        fieldName: "github_urls",
        oldValue: result.existingGithubUrls,
        newValue: result.allGithubUrls,
        githubUrls: result.uniqueNewUrls,
        timestamp: new Date(),
      },
    });

    message.success(`Added ${result.uniqueNewUrls.length} file(s) successfully`);

    return result.uniqueNewUrls.map((url) => `github-${url.repoId}-${Date.now()}`);
  } catch (error: any) {
    message.error(`Failed to add GitHub files: ${error.message}`);
    return [];
  }
};
