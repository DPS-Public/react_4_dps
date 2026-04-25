import {Space, Table} from 'antd';
import {DraggableRow} from "@/hooks/api-canvas/DraggableRow.tsx";


export default function OperationDescription({
                                                 selectedEndpoint,
                                                 moveRow,
                                                 operationColumns
                                             }: { selectedEndpoint: any, moveRow?: any, operationColumns: any }) {
    return (
        <Space direction="vertical" style={{width: "100%"}} className="p-5">
            <div className="border border-[c2c2c2]">

                <Table
                    rowKey={"operation-table"}
                    key={"operation-table"}
                    columns={operationColumns}
                    dataSource={
                        selectedEndpoint?.operation?.length > 0
                            ? selectedEndpoint?.operation.map(
                                (item, idx) => ({...item, key: idx})
                            )
                            : []
                    }
                    components={moveRow ? {
                        body: {
                            row: DraggableRow,
                        }
                    } : undefined}
                    onRow={moveRow ? (record, index) => ({
                        index,
                        type: "operation",
                        moveRow: (type: string, _, dragIndex: number, hoverIndex: number) => moveRow(type, dragIndex, hoverIndex), // type parametresi eklendi
                    }) : undefined}
                    size="small"
                    pagination={false}
                    showHeader={false}
                    bordered={false}
                    style={{
                        borderCollapse: "collapse",
                    }}
                    rowClassName={() => "custom-operation-row group"}
                />
            </div>
        </Space>
    )
}
