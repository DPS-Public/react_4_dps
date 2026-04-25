import { Button, Drawer, Space, Table, TableColumnsType, Tag } from "antd"
import { useContext } from "react"
import { IssueContext } from "../../context/issueContext"
import { BugOutlined} from "@ant-design/icons"
import { useAppSelector } from "@/store"
const ParentTaskDrawer = () => {
    const { tasks, parentNo, parentNoFlag, setParentNoFlag, setCommentVisible } = useContext(IssueContext)
        const {canvasses, users} = useAppSelector(state => state.auth);

    const checkColor = (arg: string) =>
        arg === "draft" ? "bg-[#C8C8C8] text-black"
            : arg === "new" ? "bg-[#FFA500] text-black"
                : arg === "closed" ? "bg-blue-500 text-white"
                    : arg === "canceled" ? "bg-red-500 text-white"
                        : arg === "ongoing" ? "bg-[#008000] text-white"
                            : "bg-[#9ACD32] text-black";
    const parentTaskColumns: TableColumnsType<any> = [
        { title: "#", render: (_, __, i) => i + 1 },
        { title: "No", dataIndex: "no" },
        {
            title: "Status",
            dataIndex: "status",
            width: 100,
            render: (status: string) => <Tag className={checkColor(status)}>{status}</Tag>
        },
        {
            title: "Description",
            dataIndex: "description",
            render: (_, r) => (
                <div className="flex flex-col text-[14px] gap-2">
                    {(r.parentNo || r.messageC) && (
                        <span
                            onClick={() => undefined}
                            className="font-bold cursor-pointer hover:underline hover:text-blue-500"
                        >
                            {r.messageC} (Parent No : {r.parentNo})
                        </span>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: r.description }} />
                    {Array.isArray(r.imageUrl) &&
                        r.imageUrl.map((item, index) => (
                            <a key={index} href={item?.url} target="_blank" className="text-blue-500">
                                {item?.url?.slice(8, 22)}...
                            </a>
                        ))}
                </div>
            )
        },
        {
            title: "Assignee",
            dataIndex: "assignee",
            render: (_, r) => (
                <div className="flex flex-col items-center">
                    {r.assignee && <span className="text-center">{r.assignee}</span>}
                </div>
            )
        },
        {
            title: "Created By",
            dataIndex: "createdBy",
            render: (_, r) => (
                <div className="flex flex-col items-center">
                    {r?.createdBy && <span className="text-center">{r?.createdBy}</span>}
                </div>
            )
        },
        {
            title: "Type",
            dataIndex: "type",
            render: (_, r) =>
                r.type === "Bug" ? (
                    <div className="flex items-center flex-col gap-1">
                        <BugOutlined className="text-red-500 text-lg" /> Bug
                    </div>
                ) : (
                    <Space>{r.type}</Space>
                )
        },
        { title: "UI Canvas", dataIndex: "uiCanvas" },
        {
            title: "EH",
            dataIndex: "eh",
            render: (_, r) => <Space className="text-red-500">{r.eh}</Space>
        },
        {
            title: "SH",
            dataIndex: "sh",
            render: (_, r) => <Space className="text-green-500">{r.sh}</Space>
        },
    ]

    return (
        <Drawer
            width="70%"
            title="Issue List"
            closable={true}
            open={false}
            onClose={() => setParentNoFlag(false)}
            footer={
                <div className="flex items-center gap-1">
                    <Button onClick={() => setParentNoFlag(false)}>Cancel</Button>
                </div>
            }
        >
            <Table
                pagination={false}
                columns={parentTaskColumns}
                dataSource={tasks?.filter(item => item.no === parentNo)}
            />
        </Drawer>
    )
}

export default ParentTaskDrawer
