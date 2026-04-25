import UIEditorCanvas from "@/ui-canvas/ui-editor/UIEditorCanvas";

export default function DataFlowPage() {
  return <UIEditorCanvas initialViewMode="flow" flowOnly={true} />;
}
