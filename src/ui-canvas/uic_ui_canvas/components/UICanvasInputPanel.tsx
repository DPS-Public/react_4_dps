import React from "react";
import { Button, Collapse, Modal, Space, Table } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import DraggableBodyRow from "./DraggableBodyRow";
import UICanvasInputPanelProps from "../types/UICanvasInputPanelProps.interface";


const UICanvasInputPanel: React.FC<UICanvasInputPanelProps> = ({
  activeKey,
  onChangeCollapse,
  inputDescriptionMainActions,
  handleActionInputDescription,
  setIsOpenUICanvasCreateInputModal,
  setIsShowIssueStats,
  selectedInputRows,
  inputsBulkDelete,
  selectedDescriptions,
  descriptionsBulkDelete,
  openUICanvasCreateIssueDrawer,
  inputColumns,
  inputTableData,
  moveRow,
  readOnly = false,
}) => {
  const [isDeletingInputs, setIsDeletingInputs] = React.useState(false);
  const [isDeletingDescriptions, setIsDeletingDescriptions] = React.useState(false);
  const items = [
    {
      key: "input-description",
      className: "bg-white",
      collapsible: "icon" as const,
      label: (
        <Space className="flex justify-between items-center w-full">
          <span className="font-medium text-black">Input &amp; Description</span>
          <div className="flex items-center gap-x-3">
            {!readOnly && (
              <Button
                icon={<PlusOutlined className="text-[20px] text-[#1677ff]" />}
                type="text"
                onClick={() => setIsOpenUICanvasCreateInputModal(true)}
              />
            )}
            {!readOnly && (selectedInputRows as unknown[]).length > 0 && (
              <Button
                icon={<DeleteOutlined className="text-[20px] text-[#ff4d4f]" />}
                type="text"
                title="Delete selected inputs"
                disabled={isDeletingInputs}
                onClick={() =>
                  Modal.confirm({
                    content: "Are you sure you want to delete the selected inputs?",
                    onOk: async () => {
                      setIsDeletingInputs(true);
                      try {
                        await inputsBulkDelete();
                      } finally {
                        setIsDeletingInputs(false);
                      }
                    },
                    cancelText: "Cancel",
                    okText: "OK",
                  })
                }
              />
            )}
            {!readOnly && (selectedDescriptions as unknown[]).length > 0 && (
              <Button
                icon={<DeleteOutlined className="text-[20px] text-[#1677ff]" />}
                type="text"
                title="Delete selected descriptions"
                disabled={isDeletingDescriptions}
                onClick={() =>
                  Modal.confirm({
                    content: "Are you sure you want to delete these descriptions?",
                    onOk: async () => {
                      setIsDeletingDescriptions(true);
                      try {
                        await descriptionsBulkDelete();
                      } finally {
                        setIsDeletingDescriptions(false);
                      }
                    },
                    cancelText: "Cancel",
                    okText: "OK",
                  })
                }
              />
            )}
          </div>
        </Space>
      ),
      children: (
        <Table
          columns={inputColumns as never[]}
          dataSource={(inputTableData as never[]).map((item, index) => ({
            ...(item as object),
            index,
          }))}
          rowKey="id"
          rowClassName={(record: { componentType?: string }) =>
            ["table", "tbl"].includes(record.componentType ?? "")
              ? "bg-[#f0e68c]"
              : ["group", "grp"].includes(record.componentType ?? "")
              ? "bg-[#8fbc8f]"
              : ""
          }
          pagination={false}
          bordered
          size="small"
          style={{ marginTop: 16 }}
          components={readOnly ? undefined : { body: { row: DraggableBodyRow } }}
          onRow={readOnly ? undefined : (record, index) =>
            ({ index, rowId: (record as { id: string }).id, moveRow } as never)
          }
        />
      ),
    },
  ];

  return (
    <Collapse
      activeKey={activeKey}
      onChange={onChangeCollapse}
      className="ui-input-collapse"
      items={items}
    />
  );
};

export default UICanvasInputPanel;
