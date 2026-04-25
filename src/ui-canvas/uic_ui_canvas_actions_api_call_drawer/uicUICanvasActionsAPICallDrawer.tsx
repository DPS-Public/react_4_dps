import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Modal, Select, Space } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import useUICanvasAPICallUpload from "@/hooks/ui-canvas/useUICanvasAPICallUpload.tsx";
import { configAPICallEventOptions } from "./configs/configAPICallEventOptions";
import { useUICanvasActionsAPICallDrawerState } from "./hooks/useUICanvasActionsAPICallDrawerState";
import type { APICallValue } from "./types/APICallValue.interface";
import type { SelectedAPICallInput } from "./types/SelectedAPICallInput.interface";

const { TextArea } = Input;

function UICanvasActionsAPICallDrawer({
  mode,
  open,
  onClose,
  selectedInput,
  createAPICallRelation,
  updateAPICallRelation,
  deleteAPIRelation,
}: {
  mode: "create" | "update";
  open: boolean;
  onClose: () => void;
  selectedInput: SelectedAPICallInput | null;
  createAPICallRelation?: (value: {
    event: string;
    description: string;
    api: string;
    apiName: string;
  }) => Promise<boolean | void>;
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
    focusActionSelect,
    resetAPICallState,
    selectRef,
    setAPICallApi,
    setAPICallDescription,
    setAPICallEvent,
    validateAPICall,
  } = useUICanvasActionsAPICallDrawerState({
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
      focusActionSelect();
    });
  }, [focusActionSelect, open]);

  const sortedAPIList = useMemo(
    () =>
      [...apiList]
        .filter((item) => item.name && item.name !== item.id && item.name.trim() !== "")
        .sort((left, right) => (left.name || "").localeCompare(right.name || "")),
    [apiList],
  );

  const isUpdateMode = mode === "update";
  const title = isUpdateMode ? "Update Event API Call" : "Event API Call";
  const submitLabel = isUpdateMode ? "Update" : "Create";
  const selectedInputId = selectedInput?.id ?? selectedInput?.inputId;

  const handleClose = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    resetAPICallState();
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting || isDeleting || !selectedInputId) {
      return;
    }

    const sanitizedValue: APICallValue = {
      event: apiCallValue.event.trim(),
      api: apiCallValue.api.trim(),
      description: apiCallValue.description.trim(),
    };

    if (!validateAPICall(sanitizedValue)) {
      return;
    }

    const selectedAPI = sortedAPIList.find((item) => item.id === sanitizedValue.api);
    const payload = {
      ...sanitizedValue,
      apiName: selectedAPI?.name || selectedAPI?.id || sanitizedValue.api,
    };

    setIsSubmitting(true);

    try {
      if (isUpdateMode) {
        if (!updateAPICallRelation || !selectedInput?.inputId) {
          return;
        }

        const isSuccess = await updateAPICallRelation(payload, selectedInput.inputId);
        if (isSuccess === false) {
          return;
        }
      } else {
        if (!createAPICallRelation) {
          return;
        }

        const isSuccess = await createAPICallRelation(payload);
        if (isSuccess === false) {
          return;
        }
      }

      resetAPICallState();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isUpdateMode || !deleteAPIRelation || !selectedInput?.relId || !selectedInput?.inputId) {
      return;
    }

    Modal.confirm({
      content: "Are you sure to delete this API call?",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsDeleting(true);

        try {
          const isSuccess = await deleteAPIRelation(selectedInput.relId!, selectedInput.inputId!);
          if (isSuccess === false) {
            return;
          }

          resetAPICallState();
          onClose();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <Drawer
      width={400}
      title={title}
      open={open}
      onClose={handleClose}
      destroyOnClose
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
          label="Action"
          validateStatus={error?.event ? "error" : ""}
          help={error?.event}
        >
          <Select
            ref={selectRef}
            placeholder="Select event action"
            value={apiCallValue.event || undefined}
            onChange={setAPICallEvent}
            options={configAPICallEventOptions}
            disabled={isSubmitting || isDeleting}
          />
        </Form.Item>

        <Form.Item
          label="API"
          validateStatus={error?.api ? "error" : ""}
          help={error?.api}
        >
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

export default React.memo(UICanvasActionsAPICallDrawer);
