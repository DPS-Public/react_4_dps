import { RootState } from "@/store";
import { AppstoreOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, message, Select } from "antd";
import { useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IssueContext } from "../../context/issueContext";
import services from "../../services/backlogService";
import { useAppSelector } from "@/store";

const RelatedUICanvasDrawer = ({ checkedRow, setCheckedRow, onUpdated }: { checkedRow: any[]; setCheckedRow: (v: any[]) => void; onUpdated?: () => void | Promise<void> }) => {
    const RELATED_UI_DRAWER_Z_INDEX = 1300;
    const { relatedUICanvas, setRelatedUICanvas } = useContext(IssueContext);
    const [form] = Form.useForm();
    const { canvasses } = useAppSelector(state => state.auth);
    const [selectedCanvasId, setSelectedCanvasId] = useState<string>("");
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);

    useEffect(() => {
        form.setFieldsValue({ count: checkedRow?.length || 0 });
    }, [checkedRow, form]);
    const [loadFlag , setLoadFlag] = useState<boolean>(false)
    const handleUpdateUICanvas = async () => {
        if (!selectedCanvasId) {
            message.error("Please select a UI Canvas first.");
            return;
        }

        if (!checkedRow || checkedRow.length === 0) {
            message.warning("No issues selected.");
            return;
        }

        const selectedCanvas = canvasses?.find(canvas => canvas.id === selectedCanvasId);
        if (!selectedCanvas) {
            message.error("Selected UI Canvas not found.");
            return;
        }

        setLoadFlag(true);
        try {
            
            await services.updateUICanvas(
                currentProject?.id,
                checkedRow as string[],
                selectedCanvasId,
                selectedCanvas.label || selectedCanvas.name || "",
                currentUser?.uid,
                currentUser?.displayName || currentUser?.email
            );
            
            message.success(`UI Canvas updated for ${checkedRow.length} issue(s) successfully`);
            if (onUpdated) {
                await onUpdated();
            }
            setRelatedUICanvas(false);
            form.resetFields();
            setSelectedCanvasId("");
            setCheckedRow([]);
        } catch (error) {
            console.error("Error updating UI Canvas:", error);
            message.error("Error updating UI Canvas.");
        } finally {
            setLoadFlag(false);
        }
    };

    return (
        <Drawer
            title="Related UI Canvas"
            zIndex={RELATED_UI_DRAWER_Z_INDEX}
            closable={{ 'aria-label': 'Custom Close Button' }}
            open={relatedUICanvas}
            onClose={() => {
                if (loadFlag) return;
                setRelatedUICanvas(false);
                form.resetFields();
                setSelectedCanvasId("");
            }}
            maskClosable={!loadFlag}
            keyboard={!loadFlag}
            footer={[
                <div className="flex items-center gap-1" key="footer">
                    <Button
                        onClick={handleUpdateUICanvas}
                        type="primary"
                        loading={loadFlag}
                        icon={!loadFlag ? <SaveOutlined /> : undefined}
                    >
                        Update
                    </Button>
                    <Button disabled={loadFlag} onClick={() => {
                        setRelatedUICanvas(false);
                        form.resetFields();
                        setSelectedCanvasId("");
                    }}>
                        Cancel
                    </Button>
                </div>
            ]}
        >
            <Form form={form} layout="vertical" initialValues={{
                count: checkedRow?.length || 0
            }}>
                <Form.Item name="count" label="Total Issue Count">
                    <Input readOnly={true} />
                </Form.Item>

                <Form.Item
                    rules={[{ required: true, message: "UI Canvas is required!" }]}
                    name="uiCanvas"
                    label="Select UI Canvas"
                >
                    <Select
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            (option?.children ?? "")
                                .toString()
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                        filterSort={(optionA, optionB) =>
                            (optionA?.children ?? "")
                                .toString()
                                .toLowerCase()
                                .localeCompare((optionB?.children ?? "").toString().toLowerCase())
                        }
                        onChange={value => setSelectedCanvasId(value)}
                        placeholder="Select UI Canvas"
                        suffixIcon={<AppstoreOutlined />}
                    >
                        {canvasses?.map((item, index) => (
                            <Select.Option key={item?.id || index} value={item?.id}>
                                {item?.label || item?.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default RelatedUICanvasDrawer;

