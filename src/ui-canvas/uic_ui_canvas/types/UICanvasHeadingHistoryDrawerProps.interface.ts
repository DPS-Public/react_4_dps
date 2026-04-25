import { UICanvasData } from './UICanvasData.interface';

export default interface UICanvasHeadingHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  uiData: UICanvasData | null;
  historyDocument: any;
  historyError: string | null;
  historyLoading?: boolean;
}
