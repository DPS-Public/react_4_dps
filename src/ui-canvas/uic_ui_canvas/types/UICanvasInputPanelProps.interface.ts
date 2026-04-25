export default interface UICanvasInputPanelProps {
  activeKey: string | string[];
  onChangeCollapse: (key: string | string[]) => void;
  inputDescriptionMainActions: { label: string; value: string }[];
  handleActionInputDescription: (val: string) => void;
  setIsOpenUICanvasCreateInputModal: (val: boolean) => void;
  setIsShowIssueStats: (val: boolean) => void;
  selectedInputRows: unknown[];
  inputsBulkDelete: () => void;
  selectedDescriptions: unknown[];
  descriptionsBulkDelete: () => void;
  openUICanvasCreateIssueDrawer: () => void;
  inputColumns: unknown[];
  inputTableData: unknown[];
  moveRow: (dragRowId: string, hoverRowId: string) => void;
  readOnly?: boolean;
}
