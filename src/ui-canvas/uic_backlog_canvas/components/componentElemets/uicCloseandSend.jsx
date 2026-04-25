import { Button, Drawer, Form, message, Select } from "antd"
import { SaveOutlined } from "@ant-design/icons";
import { useContext, useState } from "react";
import { IssueContext } from "../../context/issueContext";
import TextArea from "antd/es/input/TextArea";
import services from "../../services/backlogService";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { useAppSelector } from "@/store";
import { LoaderCircle } from "lucide-react";
import { utilResolveActingUser } from "../../utils/utilResolveActingUser";

const CLOSE_AND_SEND_DRAWER_Z_INDEX = 1220;
 
export const CloseandSend = ({ checkedRow, setCheckedRow, onUpdated }) => {
    const { csflag,currentProject, setCsflag, setTasks } = useContext(IssueContext)
    const { projectUsers: users } = useProjectUsers();
    const currentUser = useAppSelector((state) => state.auth.currentUser);
    const [loadFlag , setLoadFlag] = useState(false)
    
    const [form] = Form.useForm()
    const handleSave = async () => {
        setLoadFlag(true)
        try {
            if (!currentProject?.id) {
                message.warning("Please select a project first");
                return;
            }

            if (!Array.isArray(checkedRow) || checkedRow.length === 0) {
                message.warning("Please select at least one issue");
                return;
            }

            const values = await form.validateFields()
            const actingUser = utilResolveActingUser(users, currentUser);

            const assigneeUser = users?.find((u) => u.uid === values.assignee);
            if (!assigneeUser) {
                message.error("Selected assignee was not found");
                return;
            }

            let updatedCount = 0;

            for(const row of checkedRow) {
                const rowId = String(row);
                const oldData = await services.getTaskById(currentProject?.id, rowId);
                if (!oldData) continue;

                const creatorName = actingUser.displayName || oldData.createdBy || 'Unknown';

                await services.updateAssign(
                    currentProject?.id,
                    rowId,
                    "closed",
                    actingUser.uid,
                    actingUser.displayName || actingUser.email
                )

                const now = new Date();
                const formatted = now.toISOString().replace("T", " ").slice(0, 19);
                await services.updateClosedDate(currentProject?.id, rowId, formatted);

                await services.addIssueHistory(currentProject?.id, rowId, {
                    action: "closed and sent",
                    user: actingUser.displayName || actingUser.email || "Unknown",
                    userId: actingUser.uid || "",
                    details: {
                        sentTo: assigneeUser.displayName,
                        sentToEmail: assigneeUser.email || "",
                        comment: values.comment || ""
                    }
                });

                const { id, ...restOldData } = oldData;
                delete restOldData.history;

                const data = {
                    ...restOldData,
                    assignee: assigneeUser.uid,
                    assigneeName: assigneeUser.displayName,
                    assigneePhotoUrl: assigneeUser.photoURL || null,
                    createdBy: creatorName,
                    parentNo: oldData.no,
                    description: values.comment || "",
                    messageC: values.comment || "",
                    status: "new",
                    priority: "Normal",
                    createdAt: new Date().toISOString(),
                    closedDate: "",
                    comment: "",
                    history: [],
                    type: values.type || oldData.type || "New Request"
                }

                const newIssueId = await services.createIssue(currentProject?.id, data);

                if (newIssueId) {
                    await services.addIssueHistory(
                        currentProject?.id,
                        newIssueId,
                        services.buildIssueCreatedHistoryEntry(
                            data.no,
                            creatorName,
                            actingUser.uid || ""
                        )
                    );
                }

                if (newIssueId && data.no) {
                }

                updatedCount += 1;
            }

            if (updatedCount === 0) {
                message.warning("No issue was updated");
                return;
            }

            const updatedTasks = await services.getTasks(currentProject?.id);
            setTasks(updatedTasks || []);
            message.success(`Close and Send completed for ${updatedCount} issue(s)`)

            // Close drawer immediately after a successful operation.
            setCsflag(false)
            form.resetFields()
            setCheckedRow([])

            if (onUpdated) {
                try {
                    await onUpdated();
                } catch (error) {
                    console.error("Error refreshing data after close and send:", error);
                }
            }
        } catch (error) {
            console.error("Error in close and send:", error);
            message.error("Close and Send failed");
        } finally {
            setLoadFlag(false)
        }
    }
    return (
        <Drawer
            title="Close and Send Issue"
            closable={{ 'aria-label': 'Custom Close Button' }}
            zIndex={CLOSE_AND_SEND_DRAWER_Z_INDEX}
            open={csflag}
            onClose={() => {
                setCsflag(false);
                form.resetFields();
            }}
            footer={[
                <div className="flex items-center gap-1">
                    <Button onClick={handleSave} type="primary" disabled={loadFlag}>{loadFlag ? <LoaderCircle className="animate-spin" /> : <><SaveOutlined /> Close and Send </>}</Button>
                    <Button onClick={() => setCsflag(false)}>Cancel</Button>
                </div>
            ]}
        >
            <Form form={form} layout="vertical" initialValues={{ type: "New Request" }}>
                <Form.Item rules={[{ required: true, message: "Assign is required!" }]} name="assignee" label="Assignee">
                    <Select optionLabelProp="label" showSearch className="w-full" placeholder="Select User" optionFilterProp="label">
                        {users?.map((u, i) => u?.displayName && u?.uid && <Select.Option label={u?.displayName} key={i} value={u.uid}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">{u?.photoURL ? <img className="w-full h-full object-cover" src={u?.photoURL} /> : u.displayName[0]}</div>
                                <div className="flex flex-col gap-1">
                                    <span>{u.displayName}</span>
                                    <span className="italic">{u.email}</span>
                                </div>
                            </div>
                        </Select.Option>)}
                    </Select>
                </Form.Item>
                <Form.Item name="type" label="Type" rules={[{ required: true, message: "Type is required!" }]}>
                    <Select className="w-full" placeholder="Select Type">
                        <Select.Option value="Bug">Bug</Select.Option>
                        <Select.Option value="New Request">New Request</Select.Option>
                        <Select.Option value="Change Request">Change Request</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="comment" label="Comment">
                    <TextArea rows={10} />
                </Form.Item>
            </Form>
        </Drawer>
    )
}
