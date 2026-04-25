import React from "react";
import { Button, Input } from "antd";
import { CaretRightOutlined, SaveOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const iconClassName = "text-[18px] text-[#1677ff]";

interface UICApiCanvasDescriptionPanelProps {
  activeKey: string | string[];
  onChangeCollapse: (key: string | string[]) => void;
  description: string;
  setDescription: (value: string) => void;
  setIsOpenDescriptionDrawer: (value: boolean) => void;
}

const UICApiCanvasDescriptionPanel: React.FC<UICApiCanvasDescriptionPanelProps> = ({
  activeKey,
  onChangeCollapse,
  description,
  setDescription,
  setIsOpenDescriptionDrawer,
}) => {
  const actionButtonStyle = {
    width: 32,
    height: 32,
    minWidth: 32,
    maxWidth: 32,
    minHeight: 32,
    maxHeight: 32,
    padding: 0,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const renderHeaderIconButton = (icon: React.ReactNode, onClick: (event: React.MouseEvent<HTMLElement>) => void) => (
    <Button
      type="text"
      icon={icon}
      onClick={onClick}
      style={actionButtonStyle}
    />
  );

  const isDescriptionOpen = Array.isArray(activeKey)
    ? activeKey.includes("description")
    : activeKey === "description";

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #f0f0f0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => onChangeCollapse(isDescriptionOpen ? [] : ["description"])}
        style={{
          minHeight: 68,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          background: "#ffffff",
        }}
      >
        <div className="flex items-center min-h-6">
          <div className="flex items-center justify-center w-5 h-5 mr-3">
            <CaretRightOutlined rotate={isDescriptionOpen ? 90 : 0} style={{ lineHeight: 1 }} />
          </div>
          <span className="font-medium text-black leading-none">Description</span>
        </div>
        <div className="flex items-center min-h-6">
          {renderHeaderIconButton(
            <SaveOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              setIsOpenDescriptionDrawer(true);
            },
          )}
        </div>
      </div>

      {isDescriptionOpen ? (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f0f0f0", background: "#ffffff" }}>
          <TextArea
            rows={5}
            placeholder="Enter description..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            readOnly
          />
        </div>
      ) : null}
    </div>
  );
};

export default UICApiCanvasDescriptionPanel;
