import { AppstoreOutlined } from "@ant-design/icons";
import { Space, Tooltip } from "antd";
import React from "react";

interface ColumnUiCanvasParams {
    onUiCanvasClick: (canvasId: string, canvasName: string) => void;
}

export const columnUiCanvas = ({ onUiCanvasClick }: ColumnUiCanvasParams) => ({
    title: "UI Canvas",
    dataIndex: "uiCanvas",
    width: 200,
    onCell: () => ({ style: { maxWidth: 200, width: 200 } }),
    onHeaderCell: () => ({ style: { maxWidth: 200, width: 200, whiteSpace: "nowrap" } }),
    render: (_: any, r: any) => (
        <Tooltip title={r.uiCanvas || ""}>
            <Space
                onClick={() => onUiCanvasClick(r.uiCanvasId, r.uiCanvas)}
                className="hover:text-blue-500 hover:underline cursor-pointer w-full min-w-0"
            >
                <AppstoreOutlined />
                <span className="inline-block max-w-[160px] truncate align-bottom">
                    {r.uiCanvas}
                </span>
            </Space>
        </Tooltip>
    ),
});
