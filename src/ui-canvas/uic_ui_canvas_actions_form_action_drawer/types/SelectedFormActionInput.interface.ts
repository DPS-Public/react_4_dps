export interface SelectedFormActionInput {
  id?: string;
  inputId?: string;
  inputName?: string;
  uiName?: string;
  formAction?: {
    action?: string;
    uiId?: string;
    ui_canvas_id?: string;
    condition?: string;
  };
  action?: string;
  uiId?: string;
  ui_canvas_id?: string;
  condition?: string;
}
