import {Space, Table} from 'antd'
import {DraggableRow} from "@/hooks/api-canvas/DraggableRow.tsx";

export default function InputParameters({
                                            selectedEndpoint,
                                            moveRow,
                                            inputColumns,
                                        }: { selectedEndpoint: any, moveRow?: any, inputColumns: any }) {

    return (
        <Space direction="vertical" style={{width: "100%"}} className="p-5">
            <div className="border ">
                <Table
                    key="input-table"
                    columns={inputColumns}
                    rowClassName={"group"}
                    dataSource={selectedEndpoint?.input?.length > 0 ? selectedEndpoint.input.map((item, idx) => ({
                        ...item,
                        key: idx,
                    })) : []}
                    components={moveRow ? {
                        body: {
                            row: DraggableRow,
                        }
                    } : undefined}
                    onRow={moveRow ? (record, index) => ({
                        index,
                        type: "input",
                        moveRow: (type: string, _, dragIndex: number, hoverIndex: number) => moveRow(type, dragIndex, hoverIndex), // type parametresi eklendi
                    }) : undefined}
                    size="small"
                    pagination={false}
                />
            </div>

        </Space>
    )
}
