import { Button, Drawer, Form, message, Select } from "antd"
import { SaveOutlined } from "@ant-design/icons";
import { useContext, useState } from "react";
import { IssueContext } from "../../context/issueContext";
import services from "../../services/backlogService";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { useAppSelector } from "@/store";
import { LoaderCircle } from "lucide-react";

export const ForwardIssue = ({ checkedRow, setCheckedRow, onUpdated }: { checkedRow: any[]; setCheckedRow: (v: any[]) => void; onUpdated?: () => void | Promise<void> }) => {
    const FORWARD_DRAWER_Z_INDEX = 1300;
    const { projectUsers: users } = useProjectUsers();
    const { forward, setForward, currentProject } = useContext(IssueContext)
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);
    const [form] = Form.useForm()
    const [loadFlag, setLoadFlag] = useState<boolean>(false)
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

            const values = await form.validateFields();
            if (!values.forward) {
                message.warning("Please select a user");
                return;
            }

            const selectedUser = users?.find((u: any) => u.uid === values.forward);
            let updatedCount = 0;

            for (const item of checkedRow) {
                await services.updateForward(
                    currentProject.id,
                    item,
                    values.forward,
                    currentUser?.uid,
                    currentUser?.displayName || currentUser?.email,
                    selectedUser?.displayName,
                    selectedUser?.photoURL || null
                );
                updatedCount += 1;
            }

            if (updatedCount === 0) {
                message.warning("No issues were updated");
                return;
            }

            if (onUpdated) {
                await onUpdated();
            }  
            message.success(`Forwarded ${updatedCount} issue(s) successfully`)

            setForward(false);
            form.resetFields();
            setCheckedRow([]);
        } catch (error) {
            console.error("Error forwarding issues:", error);
            message.error("Failed to forward selected issue(s)");
        } finally {
            setLoadFlag(false)
        }
    }

    return (
        <Drawer
            title="Forward Issue(s)"
            zIndex={FORWARD_DRAWER_Z_INDEX}
            closable={{ 'aria-label': 'Custom Close Button' }}
            open={forward}
            onClose={() => {
                setForward(false);
                form.resetFields();
            }}
            footer={[
                <div className="flex items-center gap-1">
                    <Button onClick={handleSave} type="primary">{loadFlag ? <LoaderCircle className="animate-spin" /> : <><SaveOutlined /> Forward</>}</Button>
                    <Button onClick={() => setForward(false)}>Cancel</Button>
                </div>
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="forward" rules={[{ required: true, message: "Please select a user" }]}>
                    <Select
                        optionLabelProp="label"
                        showSearch
                        className="w-full"
                        placeholder="Select User"
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                            String(option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                    >
                        {users?.map(
                            (u: any, i) =>
                                u?.displayName && u?.uid && (
                                    <Select.Option
                                        label={u?.displayName}
                                        key={i}
                                        value={u.uid}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">
                                                {u?.photoURL ? (
                                                    <img
                                                        className="w-full h-full object-cover"
                                                        src={u?.photoURL}
                                                    />
                                                ) : (
                                                    u.displayName[0]
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span>{u.displayName}</span>
                                                <span className="italic">{u.email}</span>
                                            </div>
                                        </div>
                                    </Select.Option>
                                )
                        )}
                    </Select>

                </Form.Item>
            </Form>
        </Drawer>
    )
}
