import { message } from "antd";
import { serviceImportDPSFile } from "../services/serviceImportDPSFile";

interface HandleImportDPSFileParams {
  fileContent: any;
  currentProjectId?: string;
  targetUICanvasId?: string;
  importModes?: {
    description?: boolean;
    userAcceptanceCriteria?: boolean;
    externalViewLinks?: boolean;
    input?: boolean;
  };
  setImportLoading: (loading: boolean) => void;
  setShowImportModal: (open: boolean) => void;
  setFileContent: (data: any) => void;
  onChangeUI?: (id: string) => void;
}

export const handleImportDPSFile = async ({
  fileContent,
  currentProjectId,
  targetUICanvasId,
  importModes,
  setImportLoading,
  setShowImportModal,
  setFileContent,
  onChangeUI,
}: HandleImportDPSFileParams): Promise<void> => {
  if (!fileContent || !currentProjectId || !targetUICanvasId) {
    message.error("No JSON content, project, or selected UI Canvas");
    return;
  }

  setImportLoading(true);

  try {
    const result = await serviceImportDPSFile({
      fileContent,
      currentProjectId,
      targetUICanvasId,
      importModes,
    });

    message.success(`JSON imported into "${result.uiCanvasLabel}" successfully!`);
    setShowImportModal(false);
    setFileContent(null);
    if (onChangeUI) onChangeUI(result.uiCanvasId);
  } catch (error: any) {
    message.error(`Failed to import UI Canvas: ${error.message}`);
  } finally {
    setImportLoading(false);
  }
};
