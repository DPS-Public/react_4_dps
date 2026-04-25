import { SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Radio, Space } from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useState } from "react";
import { configComponentInformationTypeOptions } from "./configs/configComponentInformationTypeOptions";
import { useUICanvasActionsComponentInformationUpdateDrawerState } from "./hooks/useUICanvasActionsComponentInformationUpdateDrawerState";
import type { ComponentInformationValue } from "./types/ComponentInformationValue.interface";
import type { SelectedComponentInformationInput } from "./types/SelectedComponentInformationInput.interface";

function UICanvasActionsComponentInformationUpdateDrawer({
  open,
  selectedUICanvasId,
  selectedInput,
  updateComponentInformation,
  onClose,
}: {
  open: boolean;
  selectedUICanvasId: string;
  selectedInput: SelectedComponentInformationInput | null;
  updateComponentInformation: (
    value: ComponentInformationValue,
    inputId: string,
  ) => Promise<boolean>;
  onClose: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    componentInformationValue,
    componentWidthOptions,
    error,
    inputNameRef,
    isLoadingComponentInformation,
    focusInputName,
    resetComponentInformationState,
    setCellNo,
    setComponentType,
    setContent,
    setInputName,
    validateInputName,
  } = useUICanvasActionsComponentInformationUpdateDrawerState({
    open,
    selectedUICanvasId,
    selectedInput,
  });

  const handleClose = () => {
    if (isUpdating) {
      return;
    }

    resetComponentInformationState();
    onClose();
  };

  const handleUpdateClick = async () => {
    if (isUpdating || isLoadingComponentInformation || !selectedInput?.id) {
      return;
    }

    const isInputNameValid = validateInputName(componentInformationValue.inputName);

    if (!isInputNameValid) {
      return;
    }

    setIsUpdating(true);

    try {
      const isSuccess = await updateComponentInformation(
        componentInformationValue,
        selectedInput.id,
      );

      if (!isSuccess) {
        return;
      }

      resetComponentInformationState();
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Drawer
      width={600}
      title="Component Information"
      open={open}
      onClose={handleClose}
      afterOpenChange={(isOpen) => {
        if (!isOpen) {
          return;
        }

        window.requestAnimationFrame(() => {
          focusInputName();
        });
      }}
      footer={
        <Space direction="horizontal">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isUpdating || isLoadingComponentInformation}
            disabled={isUpdating || isLoadingComponentInformation || !selectedInput?.id}
            onClick={handleUpdateClick}
          >
            Update
          </Button>
          <Button disabled={isUpdating} onClick={handleClose}>
            Cancel
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item
          label="Input Name"
          validateStatus={error?.inputName ? "error" : ""}
          help={error?.inputName}
        >
          <Input
            ref={inputNameRef}
            placeholder="Input Name"
            disabled={isUpdating || isLoadingComponentInformation}
            value={componentInformationValue.inputName}
            onChange={(event) => {
              setInputName(event.target.value);
            }}
            onBlur={(event) => {
              validateInputName(event.target.value);
            }}
          />
        </Form.Item>
        <Form.Item label="Component Type">
          <Radio.Group
            value={componentInformationValue.componentType}
            onChange={(event) => {
              setComponentType(event.target.value);
            }}
            disabled={isUpdating || isLoadingComponentInformation}
            className="w-full"
          >
            <div className="grid grid-cols-7 gap-2">
              {configComponentInformationTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = componentInformationValue.componentType === option.value;

                return (
                  <Radio.Button
                    key={option.value}
                    value={option.value}
                    style={{
                      width: "100%",
                      height: 64,
                      paddingInline: 6,
                      backgroundColor: isSelected ? "#e6f4ff" : "#fff",
                      borderColor: isSelected ? "#1677ff" : "#d9d9d9",
                      color: isSelected ? "#1677ff" : "inherit",
                    }}
                    className="!rounded-md !border before:!hidden"
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                      <Icon className="text-base" />
                      <span className="text-[11px] leading-3">{option.label}</span>
                    </div>
                  </Radio.Button>
                );
              })}
            </div>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Component Width (Cell)">
          <Radio.Group
            value={componentInformationValue.cellNo}
            onChange={(event) => {
              setCellNo(event.target.value);
            }}
            disabled={isUpdating || isLoadingComponentInformation}
            className="w-full"
          >
            <div className="grid grid-cols-6 gap-2">
              {componentWidthOptions.map((option) => (
                <Radio.Button
                  key={option.value}
                  value={option.value}
                  style={{
                    width: "100%",
                    paddingInline: 8,
                    backgroundColor:
                      componentInformationValue.cellNo === option.value ? "#e6f4ff" : "#fff",
                    borderColor:
                      componentInformationValue.cellNo === option.value ? "#1677ff" : "#d9d9d9",
                    color:
                      componentInformationValue.cellNo === option.value ? "#1677ff" : "inherit",
                  }}
                  className="!h-9 !rounded-md !border text-center leading-[34px] before:!hidden"
                >
                  {option.label}
                </Radio.Button>
              ))}
            </div>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Content">
          <TextArea
            rows={5}
            placeholder="Enter content..."
            disabled={isUpdating || isLoadingComponentInformation}
            value={componentInformationValue.content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default React.memo(UICanvasActionsComponentInformationUpdateDrawer);
