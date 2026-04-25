import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Select, Space } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import useUICanvasAPICallUpload from "@/hooks/ui-canvas/useUICanvasAPICallUpload.tsx";
import { configAPICallEventOptions } from "@/ui-canvas/uic_ui_canvas_actions_api_call_drawer/configs/configAPICallEventOptions";
import { handleUICanvasActionsAPICallUpdateDelete } from "./handlers/handleUICanvasActionsAPICallUpdateDelete";
import { handleUICanvasActionsAPICallUpdateSubmit } from "./handlers/handleUICanvasActionsAPICallUpdateSubmit";
import { useUICanvasActionsAPICallUpdateDrawerState } from "./hooks/useUICanvasActionsAPICallUpdateDrawerState";
import { serviceSortAPICallUpdateAPIOptions } from "./services/serviceSortAPICallUpdateAPIOptions";
import type { SelectedAPICallUpdateInput } from "./types/SelectedAPICallUpdateInput.interface";

const { TextArea } = Input;

function UICanvasActionsAPICallUpdateDrawer({
  open,
  onClose,
  selectedInput,
  updateAPICallRelation,
  deleteAPIRelation,
}: {
  open: boolean;
  onClose: () => void;
  selectedInput: SelectedAPICallUpdateInput | null;
  updateAPICallRelation?: (
    value: {
      event: string;
      description: string;
      api: string;
      apiName: string;
    },
    inputId: string,
  ) => Promise<boolean | void>;
  deleteAPIRelation?: (descriptionId: string, inputId: string) => Promise<boolean | void>;
}) {
  const { loadAPIList } = useUICanvasAPICallUpload();
  const loadAPIListRef = React.useRef(loadAPIList);
  const [apiList, setApiList] = useState<Array<{ id: string; name?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    apiCallValue,
    error,
    resetAPICallUpdateState,
    setAPICallApi,
    setAPICallDescription,
    setAPICallEvent,
    validateAPICallUpdate,
  } = useUICanvasActionsAPICallUpdateDrawerState({
    open,
    selectedInput,
  });

  useEffect(() => {
    loadAPIListRef.current = loadAPIList;
  }, [loadAPIList]);

  useEffect(() => {
    if (!open) {
      return;
    }

    loadAPIListRef.current().then((list) => {
      setApiList(Array.isArray(list) ? list : []);
    });
  }, [open]);

  const sortedAPIList = useMemo(() => serviceSortAPICallUpdateAPIOptions(apiList), [apiList]);
  const selectedInputId = selectedInput?.id ?? selectedInput?.inputId;

  const handleClose = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    resetAPICallUpdateState();
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    await handleUICanvasActionsAPICallUpdateSubmit({
      apiCallValue,
      selectedInputId,
      selectedInputInputId: selectedInput?.inputId,
      sortedAPIList,
      validateAPICallUpdate,
      updateAPICallRelation,
      onSuccess: () => {
        resetAPICallUpdateState();
        onClose();
      },
      setIsSubmitting,
    });
  };

  const handleDelete = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    handleUICanvasActionsAPICallUpdateDelete({
      deleteAPIRelation,
      relId: selectedInput?.relId,
      inputId: selectedInput?.inputId,
      onSuccess: () => {
        resetAPICallUpdateState();
        onClose();
      },
      setIsDeleting,
    });
  };

  return (
    <Drawer
      width={400}
      title="Update Event API Call"
      open={open}
      onClose={handleClose}
      destroyOnClose
      footer={
        <div className="flex justify-between">
          <Space direction="horizontal">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              disabled={isSubmitting || isDeleting || !selectedInputId}
              onClick={handleSubmit}
            >
              Update
            </Button>
            <Button disabled={isSubmitting || isDeleting} onClick={handleClose}>
              Cancel
            </Button>
          </Space>
          <Button type="link" danger disabled={isSubmitting || isDeleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      }
    >
      <Form layout="vertical">
        <Form.Item label="Action" validateStatus={error?.event ? "error" : ""} help={error?.event}>
          <Select
            placeholder="Select event action"
            value={apiCallValue.event || undefined}
            onChange={setAPICallEvent}
            options={configAPICallEventOptions}
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>

        <Form.Item label="API" validateStatus={error?.api ? "error" : ""} help={error?.api}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select API"
            value={apiCallValue.api || undefined}
            onChange={setAPICallApi}
            options={sortedAPIList.map((item) => ({
              value: item.id,
              label: item.name || item.id,
            }))}
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>

        <Form.Item
          label="Description"
          validateStatus={error?.description ? "error" : ""}
          help={error?.description}
        >
          <TextArea
            rows={5}
            placeholder="Enter Description"
            maxLength={1000}
            showCount
            value={apiCallValue.description}
            onChange={(event) => setAPICallDescription(event.target.value)}
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default React.memo(UICanvasActionsAPICallUpdateDrawer);
