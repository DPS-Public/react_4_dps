import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Modal, Select, Space } from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useEffect, useState } from "react";
import { configManualDescriptionEventOptions } from "./configs/configManualDescriptionEventOptions";
import { useUICanvasActionsManualDescriptionUpdateDrawerState } from "./hooks/useUICanvasActionsManualDescriptionUpdateDrawerState";
import type { ManualDescriptionValue } from "./types/ManualDescriptionValue.interface";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";

function UICanvasActionsManualDescriptionUpdateDrawer({
  open,
  selectedUICanvasId,
  selectedAction,
  updateManualDescription,
  deleteManualDescription,
  onClose,
}: {
  open: boolean;
  selectedUICanvasId: string;
  selectedAction: SelectedManualDescriptionAction | null;
  updateManualDescription: (value: ManualDescriptionValue, inputId: string) => Promise<boolean>;
  deleteManualDescription: (descriptionId: string, inputId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    error,
    isLoadingManualDescription,
    manualDescriptionValue,
    selectRef,
    focusActionSelect,
    setManualDescriptionEvent,
    setManualDescriptionDescription,
    validateManualDescriptionDescription,
    resetManualDescriptionState,
  } = useUICanvasActionsManualDescriptionUpdateDrawerState({
    open,
    selectedUICanvasId,
    selectedAction,
  });

  useEffect(() => {
    if (open) {
      focusActionSelect();
    }
  }, [focusActionSelect, open]);

  const handleUpdateClick = async () => {
    if (isUpdating || isDeleting || isLoadingManualDescription) {
      return;
    }

    const isDescriptionValid = validateManualDescriptionDescription(
      manualDescriptionValue.description,
    );

    if (!isDescriptionValid || !selectedAction?.inputId) {
      return;
    }

    setIsUpdating(true);

    try {
      const isSuccess = await updateManualDescription(
        manualDescriptionValue,
        selectedAction.inputId,
      );

      if (!isSuccess) {
        return;
      }

      resetManualDescriptionState();
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    if (isUpdating || isDeleting || isLoadingManualDescription || !selectedAction?.id || !selectedAction.inputId) {
      return;
    }

    Modal.confirm({
      content: "Are you sure to delete this description?",
      okText: "OK",
      cancelText: "Cancel",
      onOk: async () => {
        setIsDeleting(true);

        try {
          const isSuccess = await deleteManualDescription(
            selectedAction.id,
            selectedAction.inputId,
          );

          if (!isSuccess) {
            return;
          }

          resetManualDescriptionState();
          onClose();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleClose = () => {
    if (isUpdating || isDeleting) {
      return;
    }

    resetManualDescriptionState();
    onClose();
  };

  return (
    <Drawer
      width={400}
      title="Update Manual Description"
      open={open}
      onClose={handleClose}
      footer={
        <div className="flex justify-between">
          <Space direction="horizontal">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isUpdating || isLoadingManualDescription}
              disabled={
                isUpdating || isDeleting || isLoadingManualDescription || !selectedAction?.inputId
              }
              onClick={handleUpdateClick}
            >
              Update
            </Button>
            <Button
              disabled={isUpdating || isDeleting}
              onClick={handleClose}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
          </Space>
          <Button
            disabled={isUpdating || isDeleting || isLoadingManualDescription}
            type="link"
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
        </div>
      }
    >
      <Form layout="vertical">
        <Form.Item label="Action">
          <Select
            ref={selectRef}
            loading={isLoadingManualDescription}
            disabled={isUpdating || isDeleting || isLoadingManualDescription}
            onChange={setManualDescriptionEvent}
            value={manualDescriptionValue.event}
            options={configManualDescriptionEventOptions}
          />
        </Form.Item>
        <Form.Item label="Description">
          <TextArea
            rows={5}
            placeholder="Enter Description"
            disabled={isUpdating || isDeleting || isLoadingManualDescription}
            value={manualDescriptionValue.description}
            onChange={(event) => {
              setManualDescriptionDescription(event.target.value);
            }}
            onBlur={(event) => {
              validateManualDescriptionDescription(event.target.value);
            }}
          />
          {error?.description && (
            <p
              id="input-name-error"
              role="alert"
              aria-live="assertive"
              className="mt-2 flex items-center gap-2 text-sm text-red-600 transition-opacity duration-150"
            >
              <svg
                className="h-4 w-4 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-10.75a.75.75 0 10-1.5 0v4a.75.75 0 001.5 0v-4zM10 13a1 1 0 100 2 1 1 0 000-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error.description}</span>
            </p>
          )}
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default React.memo(UICanvasActionsManualDescriptionUpdateDrawer);
