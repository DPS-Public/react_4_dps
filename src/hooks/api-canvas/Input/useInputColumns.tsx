import {Button, Space} from 'antd';
import {EditOutlined,} from "@ant-design/icons";

export default function useInputColumns({
                                            selectedEndpoint,
                                            editInput,
                                            readOnly = false
                                        }: {
    selectedEndpoint: any,
    editInput?: any,
    readOnly?: boolean
}) {
    const inputColumns = [

        readOnly ? null : {
            title: '',
            key: 'drag',
            width: 50,
            className: "transition-opacity opacity-0 group-hover:opacity-100",
            render: () => null // This will be replaced by our DraggableRow
        },
        {
            title: '#',
            dataIndex: 'index',
            width: 80,
            render: (_: any, __: any, index: number) => index + 1
        },
        {title: 'Name', dataIndex: 'name', key: 'name'},
        {title: 'Description', dataIndex: 'description', key: 'description'},

        (editInput ? {
            title: '',
            key: 'actions',
            width: 120,
            render: (_: any, record: any, index: number) => {
                const operationId = Object.keys(selectedEndpoint?.input || {})[0] || '';
                const keys = selectedEndpoint?.input?.[operationId] ? Object.keys(selectedEndpoint.input[operationId]) : [];
                const key = keys[index];
                return (
                    <Space className="flex items-center justify-end">
                        <Button
                            size="small"
                            icon={<EditOutlined/>}
                            className="outline-none border-none !bg-transparent shadow-none transition-opacity opacity-0 group-hover:opacity-100"
                            onClick={() => editInput(operationId, key, record)}
                        />
                    </Space>
                );
            }
        } : null)
    ].filter(Boolean);
    return inputColumns
}
