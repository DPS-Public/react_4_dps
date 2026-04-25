import {Button, Space} from 'antd';
import {EditOutlined,} from "@ant-design/icons";

export default function useOutputColumns({
                                             selectedEndpoint,
                                             editOutput,
                                             readOnly = false
                                         }: {
    selectedEndpoint: any,
    editOutput?: any,
    readOnly?: boolean,
}) {
    const outputColumns = [
        readOnly ? null :
        {
            title: '',
            key: 'drag',
            width: 50,
            className:"transition-opacity opacity-0 group-hover:opacity-100",
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
        readOnly ? null :
        {
            title: '',
            key: 'actions',
            width: 120,
            render: (_: any, record: any, index: number) => {
                const operationId = Object.keys(selectedEndpoint?.output || {})[0] || '';
                const keys = selectedEndpoint?.output?.[operationId] ? Object.keys(selectedEndpoint.output[operationId]) : [];
                const key = keys[index];
                return (
                    <Space className="flex items-center justify-end">
                        <Button
                            size="small"
                            className="outline-none border-none !bg-transparent shadow-none transition-opacity opacity-0 group-hover:opacity-100"
                            icon={<EditOutlined/>}
                            onClick={() => editOutput(operationId, key, record)}
                        />
                    </Space>
                );
            }
        }
    ].filter(Boolean);
    return outputColumns

}
