import React from "react";
import { Button, Collapse, Input, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { TextArea } = Input;

interface UICanvasDescriptionPanelProps {
  activeKey: string | string[];
  onChangeCollapse: (key: string | string[]) => void;
  description: string;
  setDescription: (val: string) => void;
  setIsOpenUICanvasCreateDescriptionModal: (val: boolean) => void;
  readOnly?: boolean;
}

const UICanvasDescriptionPanel: React.FC<UICanvasDescriptionPanelProps> = ({
  activeKey,
  onChangeCollapse,
  description,
  setDescription,
  setIsOpenUICanvasCreateDescriptionModal,
  readOnly = false,
}) => {
  const items = [
    {
      key: "description",
      className: "bg-white",
      collapsible: "icon" as const,
      label: (
        <Space className="flex justify-between items-center w-full">
          <span className="font-medium text-black">Description</span>
          {!readOnly && (
            <Button
              icon={<SaveOutlined className="text-[18px] text-[#1677ff]" />}
              type="text"
              onClick={() => setIsOpenUICanvasCreateDescriptionModal(true)}
            />
          )}
        </Space>
      ),
      children: (
        <TextArea
          rows={5}
          placeholder="Enter description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          readOnly
        />
      ),
    },
  ];

  return (
    <Collapse
      activeKey={activeKey}
      onChange={onChangeCollapse}
      className="ui-description-collapse"
      items={items}
    />
  );
};

export default UICanvasDescriptionPanel;
