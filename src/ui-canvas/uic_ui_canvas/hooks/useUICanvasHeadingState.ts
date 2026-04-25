import { useState } from "react";
import { ActionsDrawerState } from "../types/ActionsDrawerState.interface";

const initialDrawerState: ActionsDrawerState = {
  open: false,
  mode: "create",
  parentId: null,
  targetGithubUrl: null,
};

export const useUICanvasHeadingState = () => {
  const [drawerState, setDrawerState] = useState<ActionsDrawerState>(initialDrawerState);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [fileContent, setFileContent] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [addComponentDrawerOpen, setAddComponentDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  return {
    drawerState,
    setDrawerState,
    loading,
    setLoading,
    showImportModal,
    setShowImportModal,
    fileContent,
    setFileContent,
    importLoading,
    setImportLoading,
    addComponentDrawerOpen,
    setAddComponentDrawerOpen,
    historyDrawerOpen,
    setHistoryDrawerOpen,
  };
};
