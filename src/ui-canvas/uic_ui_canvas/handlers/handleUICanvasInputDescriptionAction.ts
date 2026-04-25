import { Modal } from "antd";

export function handleUICanvasInputDescriptionAction(
  action: string,
  selectedUICanvasInputRows: Array<{ id: string }>,
  deleteInput: (ids: string[]) => void,
  setSelectedUICanvasInputRows: (rows: Array<{ id: string }>) => void,
  descriptionsBulkDelete: () => void,
  openUICanvasCreateIssueDrawer: () => void,
) {
  switch (action) {
    case "remove_selected_inputs":
      Modal.confirm({
        cancelText: "Cancel",
        content: "Are you sure to delete selected inputs?",
        okText: "Ok",
        onOk: async () => {
          const ids = selectedUICanvasInputRows.map((item) => item.id);
          deleteInput(ids);
          setSelectedUICanvasInputRows([]);
        },
      });
      break;
    case "remove_selected_descriptions":
      Modal.confirm({
        cancelText: "Cancel",
        content: "Are you sure you want to delete these descriptions?",
        okText: "OK",
        onOk: () => {
          descriptionsBulkDelete();
        },
      });
      break;
    case "add_selected_descriptions_to_issue":
      openUICanvasCreateIssueDrawer();
      break;
    default:
      break;
  }
}
