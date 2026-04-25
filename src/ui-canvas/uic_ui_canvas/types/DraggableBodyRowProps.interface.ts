export interface DraggableBodyRowProps {
  index: number;
  rowId: string;
  moveRow: (dragRowId: string, hoverRowId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
