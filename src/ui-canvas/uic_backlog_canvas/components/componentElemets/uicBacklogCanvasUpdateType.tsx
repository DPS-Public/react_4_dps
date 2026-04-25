import { Button, Drawer, Form, Select, message } from "antd"
import { useContext, useEffect, useState } from "react"
import { IssueContext } from "../../context/issueContext"
import { SaveOutlined } from "@ant-design/icons";
import services from "../../services/backlogService";
import { useAppSelector } from "@/store";

export const UpdateType = ({ form: _form, checkedRow, setCheckedRow: _setCheckedRow, onUpdated }: { form: any; checkedRow: any[]; setCheckedRow: (v: any[]) => void; onUpdated?: () => void | Promise<void> }) => {
    const { type, setType, currentProject } = useContext(IssueContext)
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);
    const [loadFlag , setLoadFlag] = useState<boolean>(false)
    const [form] = Form.useForm();

    useEffect(() => {
        if (!type) {
            form.resetFields();
            return;
        }

        form.setFieldsValue({ type: "New Request" });
    }, [type, form]);
    
    const changeType = async () => {
        const newType = form.getFieldsValue().type;
        if (!newType) {
            message.warning("Please select a type.");
            return;
        }

        setLoadFlag(true)
        
        try {
            for (const row of checkedRow || []) {
                await services.changeType(
                    currentProject.id, 
                    String(row), 
                    newType,
                    currentUser?.uid,
                    currentUser?.displayName || currentUser?.email
                );
            }

            if (onUpdated) {
                await onUpdated();
            }
            
            message.success(`Issue type updated for ${checkedRow?.length || 0} issue(s).`);
            setType(false)
            form.resetFields()
        } catch (error) {
            console.error("Error updating issue type:", error);
            message.error("Failed to update issue type.");
        } finally {
            setLoadFlag(false)
        }
    }
    return (
        <Drawer
            title="Update Issue Type"
            closable={{ 'aria-label': 'Custom Close Button' }}
            open={type}
            onClose={() => {
                if (loadFlag) return;
                form.resetFields();
                setType(false);
            }}
            maskClosable={!loadFlag}
            keyboard={!loadFlag}
            footer={[
                <div className="flex items-center gap-1">
                    <Button
                        onClick={changeType}
                        type="primary"
                        loading={loadFlag}
                        icon={!loadFlag ? <SaveOutlined /> : undefined}
                    >
                        Update
                    </Button>
                    <Button
                        disabled={loadFlag}
                        onClick={() => {
                            form.resetFields();
                            setType(false);
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            ]}
        >
            <Form form={form} layout="vertical" initialValues={{ type: "New Request" }}>
                <Form.Item name="type">
                    <Select className="w-full" placeholder="Select Type" disabled={loadFlag}>
                        <Select.Option value="New Request">New Request</Select.Option>
                        <Select.Option value="Bug">Bug</Select.Option>
                        <Select.Option value="Change Request">Change Request</Select.Option>
                        <Select.Option value="Backlog">Backlog</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Drawer>
    )
}
