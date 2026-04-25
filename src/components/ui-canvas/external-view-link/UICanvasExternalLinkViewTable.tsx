import {Button, Modal, Space, Table, Tag} from "antd";
import React, {useEffect, useState} from "react";
import useUICanvasExternalLinkSetDefault from "@/hooks/ui-canvas/external-link/useUICanvasExternalLinkSetDefault.tsx";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import UICanvasExternalLinkUpdateModal
    from "@/components/ui-canvas/external-view-link/UICanvasExternalLinkUpdateModal.tsx";
import useUICanvasExternalLinkUpdate from "@/hooks/ui-canvas/external-link/useUICanvasExternalLinkUpdate.tsx";
import useUICanvasExternalLinkDelete from "@/hooks/ui-canvas/external-link/useUICanvasExternalLinkDelete.tsx";

const getStaticTypeLabel = (type: string) => {
    if (type === "image") return "image";
    if (type === "embedded" || type === "embedded_code" || type === "embed") return "embed";
    return type || "";
};

const truncateText = (value: string, maxLength = 100) => {
    if (!value) return "";
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const truncateEmbedPreview = (value: string, maxLength = 100) => {
    if (!value) return "";
    return `${value.slice(0, maxLength)}...`;
};

const formatDateTime = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString();
};
// hook yolunu öz strukturuna görə dəyiş

export default function UICanvasExternalLinkViewTable({tableData}) {
    const [isOpenExternalLinkUpdateModal, setIsOpenExternalLinkUpdateModal] = useState(false);
    const [selectedLink, setSelectedLink] = useState(null);
    const [rows, setRows] = useState(tableData || []);
    // 🔄 Firestore listener
    const {setDefault} = useUICanvasExternalLinkSetDefault();
    const {updateExternalLink} = useUICanvasExternalLinkUpdate();
    const {deleteExternalLink} = useUICanvasExternalLinkDelete();

    useEffect(() => {
        setRows(tableData || []);
    }, [tableData]);

    const columns = [
        {
            title: "#",
            dataIndex: "order",
            width: 50,
        },
        {
            title: "Title",
            dataIndex: "title",
            width: 150,
        },
        {
            title: "File Name",
            dataIndex: "file_name",
            width: 100,
        },
        {
            title: "URL Content",
            dataIndex: "url",
            render: (_, record) => {

                return record.type === 'image' ? <img src={record?.image || record?.url} alt="image"
                                                      className="w-[100px] h-[100px] object-cover"/> : (
                    record.type === "embed" || record.type === "embedded_code"
                    ? <span title={record.code || record.url || ""}>{truncateEmbedPreview(record.code || record.url || "", 100)}</span>
                        : record.url
                )

            }
        },
        {
            title: "Type",
            dataIndex: "type",
            width: 120,
            render: (_, record) => (
                <Tag color={record.type === "image" ? "blue" : "geekblue"}>
                    {getStaticTypeLabel(record.type)}
                </Tag>
            ),
        },
        {
            title: "Last Update",
            dataIndex: "lastUpdated",
            width: 180,
            render: (value) => formatDateTime(value),
        },
        {
            title: "",
            dataIndex: "defaultView",
            width: 120,
            align: "center",
            render: (_, record) =>
                <Space direction="horizontal">
                    {record?.defaultView ? (
                        <strong>Default View</strong>
                    ) : (
                        <Button
                            type="default"
                            onClick={() => setDefault(record.id)}
                            size="small"
                        >
                            Set as Default
                        </Button>
                    )}
                    <Button
                        type="text"
                        icon={<EditOutlined/>}
                        onClick={() => handleEdit(record)}
                        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <Button
                        type="text"
                        icon={<DeleteOutlined/>}
                        onClick={() => handleDelete(record?.id)}
                        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                </Space>
            ,
        },
        // {
        //     title: "",
        //     key: "action",
        //     width: 80,
        //     align: "center",
        //     render: (_, record) => (
        //         <Space direction="horizontal">
        //             <Button
        //                 type="text"
        //                 icon={<EditOutlined/>}
        //                 onClick={() => handleEdit(record)}
        //             />
        //             <Button
        //                 type="text"
        //                 icon={<DeleteOutlined/>}
        //                 onClick={() => handleDelete(record?.id)}
        //             />
        //
        //         </Space>
        //     ),
        // },
    ];

    function handleEdit(record) {
        setSelectedLink(record);
        setIsOpenExternalLinkUpdateModal(true);
    }

    async function handleUpdate(id: string, values: any) {
        const isUpdated = await updateExternalLink(id, values);
        if (!isUpdated) {
            return false;
        }

        setRows((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        ...values,
                        lastUpdated: new Date().toISOString(),
                    }
                    : item
            )
        );

        return true;
    }

    function handleDelete(id?: string) {
        const targetId = id || selectedLink?.id;
        if (!targetId) {
            Modal.error({
                title: "Delete failed",
                content: "Link id was not found.",
            });
            return;
        }

        Modal.confirm({
            content: "Are you sure to delete this link?",
            okText: "OK",
            cancelText: "Cancel",
            onOk: async () => {
                const isDeleted = await deleteExternalLink(targetId);

                if (isDeleted) {
                    setRows((prev) => prev.filter((item) => item.id !== targetId));
                }

                setIsOpenExternalLinkUpdateModal(false);
            }
        })
    }

    return (
        <>
            <Table
                dataSource={rows}
                columns={columns}
                pagination={false}
                size="middle"
                rowClassName="group"
                bordered
            />
            <UICanvasExternalLinkUpdateModal
                open={isOpenExternalLinkUpdateModal}
                onClose={() => setIsOpenExternalLinkUpdateModal(false)}
                selectedLink={selectedLink}
                onUpdate={handleUpdate}
                onDelete={() => handleDelete(selectedLink?.id)}
            />
        </>
    );
}
