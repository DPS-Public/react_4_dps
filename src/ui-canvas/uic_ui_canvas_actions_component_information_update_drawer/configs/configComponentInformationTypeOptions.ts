import type { ComponentType } from "@/ui-canvas/uic_ui_canvas/types/ComponentType.enum";
import {
  ApartmentOutlined,
  BarsOutlined,
  BorderOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DownSquareOutlined,
  EditOutlined,
  FileImageOutlined,
  FileTextOutlined,
  LinkOutlined,
  PaperClipOutlined,
  PlaySquareOutlined,
  TableOutlined,
} from "@ant-design/icons";

export const configComponentInformationTypeOptions: Array<{
  value: ComponentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "txt" as ComponentType, label: "Edit Line", icon: EditOutlined },
  { value: "cmb" as ComponentType, label: "Select Box", icon: DownSquareOutlined },
  { value: "btn" as ComponentType, label: "Button", icon: BorderOutlined },
  { value: "txa" as ComponentType, label: "Textarea", icon: BarsOutlined },
  { value: "rbtn" as ComponentType, label: "Radio", icon: CheckCircleOutlined },
  { value: "cbox" as ComponentType, label: "Check Box", icon: CheckSquareOutlined },
  { value: "icbox" as ComponentType, label: "Inner Check", icon: CheckSquareOutlined },
  { value: "date" as ComponentType, label: "Date", icon: CalendarOutlined },
  { value: "time" as ComponentType, label: "Time", icon: ClockCircleOutlined },
  { value: "lbl" as ComponentType, label: "Label", icon: FileTextOutlined },
  { value: "file" as ComponentType, label: "File", icon: PaperClipOutlined },
  { value: "hlink" as ComponentType, label: "Link", icon: LinkOutlined },
  { value: "img" as ComponentType, label: "Image", icon: FileImageOutlined },
  { value: "tbl" as ComponentType, label: "Table", icon: TableOutlined },
  { value: "grp" as ComponentType, label: "Group", icon: ApartmentOutlined },
  { value: "ytube" as ComponentType, label: "YouTube", icon: PlaySquareOutlined },
];
