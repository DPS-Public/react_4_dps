import {Button, Tag} from 'antd';
import {EditOutlined,} from "@ant-design/icons";
import {operationTypes} from "@/hooks/api-canvas/types.ts";
import React from "react";


export default function useOperationColumns({
                                                selectedEndpoint,
                                                editOperation,
                                                readOnly = false,
                                            }: { selectedEndpoint: any, editOperation?: any, readOnly?: boolean }) {
    const operationColumns = [
        readOnly ? null :
        {
            title: '',
            key: 'drag',
            width: 50,
            className: "transition-opacity opacity-0 group-hover:opacity-100 drag-handle-cell",
            render: () => null // This will be replaced by our DraggableRow
        },
        {
            title: "",
            dataIndex: "key",
            key: "key",
            width: 50,
            align: "center",
            className: "align-text-top",
            render: (text) => <div style={{fontWeight: "bold"}}>{text + 1}</div>,
        },
        {
            title: "",
            dataIndex: "description",
            key: Date.now(),
            render: (_, record) => {
                const {bgColor, textColor, label} = operationTypes[record.type] ?? {}
                return <div>
                    {/* Tag */}
                    {bgColor && <Tag
                        className="px-3 py-1 rounded-[6px] leading-[22px] mb-1"
                        color={bgColor}

                        style={{
                            // marginBottom: 6,
                            color: textColor,
                        }}
                    >
                        {label}
                    </Tag>}


                    {/* Description */}
                    <div className="flex items-center h-full">
                        <textarea
                            className="flex items-center h-full w-full outline-none bg-transparent text-[#555]" rows={2}
                            readOnly={true}
                        >{record.description}</textarea>
                    </div>
                </div>
            },
        },
        readOnly ? null :
        {
            title: '',
            key: 'edit',
            width: 50,
            className: 'text-center !align-text-center cursor-pointer',
            render: (_: any, record: any, index: number) => {
                const operationId = Object.keys(selectedEndpoint?.operation || {})[0] || '';
                const keys = selectedEndpoint?.operation?.[operationId] ? Object.keys(selectedEndpoint.operation[operationId]) : [];
                const key = keys[index];
                return <Button size="small" icon={<EditOutlined/>}
                               onClick={() => editOperation(operationId, key, record)}
                               className="border-none !bg-transparent shadow-none transition-opacity opacity-0 group-hover:opacity-100 "/>
            }
        },
    ].filter(Boolean);
    return operationColumns
}
