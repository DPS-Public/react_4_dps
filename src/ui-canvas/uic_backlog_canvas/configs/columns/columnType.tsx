import { BugOutlined } from "@ant-design/icons";
import { Space } from "antd";
import React from "react";

export const columnType = () => ({
    title: "Type",
    dataIndex: "type",
    render: (_: any, r: any) => {
        if (r.type === "Bug") {
            return <div className="flex items-center gap-2"><BugOutlined className="text-red-500 text-[10px]" /> Bug</div>;
        }
        if (r.type === "Backlog") {
            return <div className="flex items-center gap-2">Backlog</div>;
        }
        return <Space>{r.type}</Space>;
    },
});
