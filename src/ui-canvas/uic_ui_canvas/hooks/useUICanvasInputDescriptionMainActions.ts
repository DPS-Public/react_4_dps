import { useMemo } from "react";

export function useUICanvasInputDescriptionMainActions(selectedUICanvasInputRows: Array<{ id: string }>, selectedDescriptions: unknown[]) {
  return useMemo(() => {
    const mainActions = [
      { label: "Remove Inputs", value: "remove_selected_inputs" },
      { label: "Remove Descriptions", value: "remove_selected_descriptions" },
      { label: "Input & Description UI View", value: "add_selected_descriptions_to_issue" },
    ];

    return mainActions.filter((item) => {
      if (selectedUICanvasInputRows.length > 0 && item.value === "remove_selected_inputs") {
        return true;
      }

      if (selectedDescriptions.length > 0 && item.value === "remove_selected_descriptions") {
        return true;
      }

      return item.value === "add_selected_descriptions_to_issue";
    });
  }, [selectedDescriptions, selectedUICanvasInputRows]);
}
