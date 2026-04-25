interface HandleCloseHistoryDrawerParams {
  setHistoryDrawerOpen: (open: boolean) => void;
  setHistoryDocument: (data: any) => void;
  setHistoryError: (value: string | null) => void;
}

export const handleCloseHistoryDrawer = ({
  setHistoryDrawerOpen,
  setHistoryDocument,
  setHistoryError,
}: HandleCloseHistoryDrawerParams): void => {
  setHistoryDrawerOpen(false);
  setHistoryDocument(null);
  setHistoryError(null);
};
