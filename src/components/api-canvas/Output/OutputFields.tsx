import {Space, Table} from 'antd'
import {DraggableRow} from "@/hooks/api-canvas/DraggableRow.tsx";

export default function OutputFields({
                                         selectedEndpoint,
                                         moveRow,
                                         outputColumns
                                     }: { selectedEndpoint: any, moveRow?: any, outputColumns: any }) {
    return (
        <Space direction="vertical" style={{width: "100%"}} className="p-5">
            <Table
                key={"output-table"}
                columns={outputColumns}
                dataSource={
                    selectedEndpoint?.output?.length
                        ? selectedEndpoint?.output.map((item, idx) => ({
                            ...item,
                            key: idx,
                        }))
                        : []
                }
                components={moveRow ? {
                    body: {
                        row: DraggableRow,
                    }
                } : undefined}
                onRow={moveRow ? (record, index) => ({
                    index,
                    type: "output",
                    moveRow: (type: string, _, dragIndex: number, hoverIndex: number) => moveRow(type, dragIndex, hoverIndex),
                }) : undefined}
                size="small"
                pagination={false}
                rowClassName={"group"}
            />

        </Space>
    )
}
