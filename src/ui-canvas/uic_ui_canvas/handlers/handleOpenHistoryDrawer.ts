import { message } from "antd";

interface HandleOpenHistoryDrawerParams {
  selectedUICanvasId: string | null;
  setHistoryDrawerOpen: (open: boolean) => void;
}

export const handleOpenHistoryDrawer = ({
  selectedUICanvasId,
  setHistoryDrawerOpen,
}: HandleOpenHistoryDrawerParams): void => {
  if (!selectedUICanvasId) {
    message.warning("Please select a UI Canvas first");
    return;
  }

  setHistoryDrawerOpen(true);
};
