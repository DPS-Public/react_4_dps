import React from "react";
import { UICanvasData } from "./UICanvasData.interface";

export interface UICanvasHeadingProps {
  selectedUI: UICanvasData | null;
  externalLinkData?: Array<Record<string, unknown>> | null;
  onChangeUI: (id: string) => void;
  uiList: UICanvasData[];
  openUICreateModal: () => void;
  openUIUpdateModal: (ui: UICanvasData) => void;
  setIsOpenUICanvasDuplicateModal: (open: boolean) => void;
  targetRef: React.RefObject<any>;
  selectedUICanvasId: string | null;
  setIsOpenAIDrawer: (open: boolean) => void;
  setIsOpenAnalyzerDrawer: (open: boolean) => void;
  readOnly?: boolean;
}
