import { ComponentType } from "./ComponentType.enum";

export const ComponentTypesObj: Record<ComponentType, { id: ComponentType; label: string }> = {
  [ComponentType.Txt]: { id: ComponentType.Txt, label: "Edit Line" },
  [ComponentType.Btn]: { id: ComponentType.Btn, label: "Button" },
  [ComponentType.Img]: { id: ComponentType.Img, label: "Image" },
  [ComponentType.Cbox]: { id: ComponentType.Cbox, label: "Checkbox" },
  [ComponentType.Icbox]: { id: ComponentType.Icbox, label: "Inner Checkbox" },
  [ComponentType.Cmb]: { id: ComponentType.Cmb, label: "Select" },
  [ComponentType.Rbtn]: { id: ComponentType.Rbtn, label: "Radio" },
  [ComponentType.IRbtn]: { id: ComponentType.IRbtn, label: "Inner Radio" },
  [ComponentType.Txa]: { id: ComponentType.Txa, label: "Textarea" },
  [ComponentType.Tbl]: { id: ComponentType.Tbl, label: "Table" },
  [ComponentType.Grp]: { id: ComponentType.Grp, label: "Group" },
  [ComponentType.Date]: { id: ComponentType.Date, label: "Date Picker" },
  [ComponentType.Time]: { id: ComponentType.Time, label: "Time Picker" },
  [ComponentType.File]: { id: ComponentType.File, label: "File Picker" },
  [ComponentType.Hlink]: { id: ComponentType.Hlink, label: "Hyperlink" },
  [ComponentType.Lbl]: { id: ComponentType.Lbl, label: "Label" },
  [ComponentType.Ytube]: { id: ComponentType.Ytube, label: "YouTube" },
};
