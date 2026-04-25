import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Select, Space } from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useEffect, useState } from "react";
import { configManualDescriptionEventOptions } from "./configs/configManualDescriptionEventOptions";
import { useUICanvasActionsManualDescriptionCreateDrawerState } from "./hooks/useUICanvasActionsManualDescriptionCreateDrawerState";
import type { ManualDescriptionValue } from "./types/ManualDescriptionValue.interface";
import type { SelectedManualDescriptionCreateInput } from "./types/SelectedManualDescriptionCreateInput.interface";

function UICCanvasActionsManualDescriptionCreateDrawer({
  open,
  selectedInput,
  createManualDescription,
  onClose,
}: {
  open: boolean;
  selectedInput: SelectedManualDescriptionCreateInput | null;
  createManualDescription: (value: ManualDescriptionValue) => Promise<boolean>;
  onClose: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const {
    error,
    manualDescriptionValue,
    selectRef,
    focusActionSelect,
    setManualDescriptionEvent,
    setManualDescriptionDescription,
    clearManualDescriptionDescription,
    validateManualDescriptionDescription,
    resetManualDescriptionState,
  } = useUICanvasActionsManualDescriptionCreateDrawerState();

  useEffect(() => {
    if (open) {
      resetManualDescriptionState();
      focusActionSelect();
    }
  }, [focusActionSelect, open, resetManualDescriptionState]);

  const handleClose = () => {
    if (isCreating) {
      return;
    }

    resetManualDescriptionState();
    onClose();
  };

  const handleCreateClick = async () => {
    if (isCreating) {
      return;
    }

    const isDescriptionValid = validateManualDescriptionDescription(
      manualDescriptionValue.description,
    );

    if (!isDescriptionValid || !selectedInput?.id) {
      return;
    }

    setIsCreating(true);

    try {
      const isSuccess = await createManualDescription(manualDescriptionValue);

      if (!isSuccess) {
        return;
      }

      clearManualDescriptionDescription();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Drawer
      width={400}
      title="Add Manual Description"
      open={open}
      onClose={handleClose}
      footer={
        <Space direction="horizontal">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isCreating}
            disabled={isCreating || !selectedInput?.id}
            onClick={handleCreateClick}
          >
            Create
          </Button>
          <Button disabled={isCreating} onClick={handleClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="Action">
          <Select
            ref={selectRef}
            onChange={setManualDescriptionEvent}
            value={manualDescriptionValue.event}
            options={configManualDescriptionEventOptions}
          />
        </Form.Item>
        <Form.Item label="Description">
          <TextArea
            rows={5}
            placeholder="Enter Description"
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

export default React.memo(UICCanvasActionsManualDescriptionCreateDrawer);
