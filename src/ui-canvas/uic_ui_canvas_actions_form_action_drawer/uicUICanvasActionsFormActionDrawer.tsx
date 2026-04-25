import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Modal, Select, Space } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { configFormActionOptions } from "./configs/configFormActionOptions";
import { useUICanvasActionsFormActionDrawerState } from "./hooks/useUICanvasActionsFormActionDrawerState";
import type { FormActionValue } from "./types/FormActionValue.interface";
import type { SelectedFormActionInput } from "./types/SelectedFormActionInput.interface";
import type { UIList } from "@/ui-canvas/uic_ui_canvas/types/UIList.interface";

const { TextArea } = Input;
const FORM_ACTION_DRAWER_WIDTH = "min(400px, calc(100vw - 16px))";

function UICanvasActionsFormActionDrawer({
  mode,
  open,
  onClose,
  uiList,
  selectedInput,
  createFormAction,
  updateFormAction,
  deleteFormAction,
}: {
  mode: "create" | "update";
  open: boolean;
  onClose: () => void;
  uiList: UIList[];
  selectedInput: SelectedFormActionInput | null;
  createFormAction?: (value: FormActionValue) => Promise<boolean>;
  updateFormAction?: (value: FormActionValue) => Promise<boolean>;
  deleteFormAction?: () => Promise<boolean>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    error,
    formActionValue,
    resetFormActionState,
    selectRef,
    focusActionSelect,
    setFormActionAction,
    setFormActionCondition,
    setFormActionUiId,
    validateFormAction,
  } = useUICanvasActionsFormActionDrawerState({
    open,
    selectedInput,
  });

  useEffect(() => {
    if (open) {
      focusActionSelect();
    }
  }, [focusActionSelect, open]);

  const sortedUIList = useMemo(
    () =>
      [...uiList].sort((left, right) =>
        String(left?.label || left?.id || "").localeCompare(String(right?.label || right?.id || "")),
      ),
    [uiList],
  );

  const isUpdateMode = mode === "update";
  const selectedInputId = selectedInput?.id ?? selectedInput?.inputId;
  const title = isUpdateMode ? "Update Form Action" : "Form Action";
  const submitLabel = isUpdateMode ? "Update" : "Create";
  const shouldShowRelatedUI =
    formActionValue.action === "show_form" || formActionValue.action === "redirect";

  const handleClose = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    resetFormActionState();
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    const sanitizedValue: FormActionValue = {
      action: formActionValue.action,
      uiId: shouldShowRelatedUI ? formActionValue.uiId : "",
      condition: formActionValue.condition.trim(),
    };

    if (!validateFormAction(sanitizedValue)) {
      return;
    }

    const actionHandler = isUpdateMode ? updateFormAction : createFormAction;

    if (!actionHandler) {
      return;
    }

    setIsSubmitting(true);

    try {
      const isSuccess = await actionHandler(sanitizedValue);

      if (!isSuccess) {
        return;
      }

      resetFormActionState();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isUpdateMode || !deleteFormAction || isSubmitting || isDeleting) {
      return;
    }

    Modal.confirm({
      content: "Are you sure to delete this form action?",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsDeleting(true);

        try {
          const isSuccess = await deleteFormAction();

          if (!isSuccess) {
            return;
          }

          resetFormActionState();
          onClose();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <Drawer
      placement="right"
      width={FORM_ACTION_DRAWER_WIDTH}
      title={title}
      open={open}
      onClose={handleClose}
      footer={
        <div className={isUpdateMode ? "flex justify-between" : undefined}>
          <Space direction="horizontal">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              disabled={isSubmitting || isDeleting || !selectedInputId}
              onClick={handleSubmit}
            >
              {submitLabel}
            </Button>
            <Button disabled={isSubmitting || isDeleting} onClick={handleClose}>
              Cancel
            </Button>
          </Space>
          {isUpdateMode && (
            <Button type="link" danger disabled={isSubmitting || isDeleting} onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      }
    >
      <Form layout="vertical">
        <Form.Item
          label="Action Type"
          validateStatus={error?.action ? "error" : ""}
          help={error?.action}
        >
          <Select
            ref={selectRef}
            placeholder="Select Action Type"
            value={formActionValue.action || undefined}
            onChange={setFormActionAction}
            options={configFormActionOptions}
            allowClear
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>

        {shouldShowRelatedUI && (
          <Form.Item
            label="Related UI Canvas"
            validateStatus={error?.uiId ? "error" : ""}
            help={error?.uiId}
          >
            <Select
              showSearch
              placeholder="Select Related UI Canvas"
              optionFilterProp="label"
              value={formActionValue.uiId || undefined}
              onChange={setFormActionUiId}
              options={sortedUIList.map((item) => ({
                value: item.id,
                label: item.label || item.id,
              }))}
              allowClear
              disabled={isSubmitting || isDeleting}
            />
          </Form.Item>
        )}

        <Form.Item
          label="Condition"
          validateStatus={error?.condition ? "error" : ""}
          help={error?.condition}
        >
          <TextArea
            rows={3}
            placeholder="Enter condition (optional)..."
            maxLength={1000}
            showCount
            value={formActionValue.condition}
            onChange={(event) => {
              setFormActionCondition(event.target.value);
            }}
            onBlur={() => {
              validateFormAction({
                ...formActionValue,
                uiId: shouldShowRelatedUI ? formActionValue.uiId : "",
                condition: formActionValue.condition.trim(),
              });
            }}
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default React.memo(UICanvasActionsFormActionDrawer);
