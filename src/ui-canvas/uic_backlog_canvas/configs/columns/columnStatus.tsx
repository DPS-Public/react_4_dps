import {
    ArrowDownOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    LockOutlined,
    PlayCircleOutlined,
    RocketOutlined,
} from "@ant-design/icons";
import { Dropdown, Menu, message, Tag } from "antd";
import React from "react";

interface ColumnStatusParams {
    checkColor: (arg: string) => string;
    onStatusChange: (recordId: string, newStatus: string, oldStatus: string) => void;
}

export const columnStatus = ({ checkColor, onStatusChange }: ColumnStatusParams) => ({
    title: <span className="whitespace-nowrap">Status</span>,
    dataIndex: "status",
    width: "fit-content",
    align: "left" as const,
    onCell: () => ({ style: { whiteSpace: "nowrap", textAlign: "left" } }),
    onHeaderCell: () => ({ style: { whiteSpace: "nowrap", textAlign: "left" } }),
    render: (status: string, record: any) => {
        const items = [
            { key: "canceled", label: "Canceled", icon: <CloseCircleOutlined /> },
            { key: "ongoing",  label: "Ongoing",  icon: <PlayCircleOutlined /> },
            { key: "waiting",  label: "Waiting",  icon: <ClockCircleOutlined /> },
            { key: "closed",   label: "Closed",   icon: <LockOutlined /> },
            { key: "draft",    label: "Draft",    icon: <EditOutlined /> },
            { key: "new",      label: "New",      icon: <RocketOutlined /> },
        ];

        const menu = (
            <Menu
                className="w-40"
                theme="dark"
                onClick={async ({ key }) => {
                    if (key !== status) {
                        await onStatusChange(record.id, key, record.status);
                        message.success(`Status updated to "${key}"`);
                    }
                }}
                items={items.map((i) => ({
                    key: i.key,
                    label: (
                        <span className={`inline-block px-2.5 ${checkColor(i.key)} w-max rounded capitalize`}>
                            {i.icon} {i.label}
                        </span>
                    ),
                }))}
            />
        );

        return (
            <div className="inline-flex justify-start">
                <Dropdown overlay={menu} trigger={["click"]}>
                    <Tag className={`uppercase cursor-pointer w-max pl-2 pr-0 text-[10px] font-semibold flex items-center gap-1 ${checkColor(status)} dropdown-tag`}>
                        {status}
                        <ArrowDownOutlined className="dropdown-arrow" />
                    </Tag>
                </Dropdown>
            </div>
        );
    },
});
