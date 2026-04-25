import React, { useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const FORM_ACTION_DRAWER_WIDTH = "min(400px, calc(100vw - 16px))";
export default React.memo(UICanvasCreateFormActionDrawer, (prevProps, nextProps) => prevProps.open === nextProps.open);

function UICanvasCreateFormActionDrawer({ open, onClose, createFormAction, uiList, selectedInput }) {

    const [form] = Form.useForm();
    const [actionType, setActionType] = useState("");

    const handleFinish = (values) => {
        // If condition is undefined or empty string, set it to empty string
        if (!values?.condition) {
            values.condition = ""; // Use assignment operator =, not comparison ==
        }
        
        createFormAction?.(values);
        form.resetFields();
        onClose()
    };

    useEffect(() => {
        if (open) {
            if (Object.keys(selectedInput?.formAction || {})?.length > 0) {
                form.setFieldsValue(selectedInput?.formAction); // set form values
                setActionType(selectedInput.formAction?.action || "")

            } else {
                form.resetFields(); // set form values
                setActionType("")
            }
        }
    }, [open, selectedInput]);

    return (
        <Drawer
            title="Form Action"
            placement="right"
            width={FORM_ACTION_DRAWER_WIDTH}
            onClose={onClose}
            open={open}
            destroyOnClose
            footer={
                <div>
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => form.submit()}
                            icon={<SaveOutlined />}
                        >
                            {Object.keys(selectedInput?.formAction || {})?.length > 0 ? "Update" : "Create"}
                        </Button>
                        <Button onClick={onClose}>Cancel</Button>
                    </Space>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{ actionType: "" }}
            >
                <Form.Item
                    label="Action Type"
                    name="action"
                    rules={[{ required: true, message: "Please select an action type" }]}
                >
                    <Select
                        placeholder="Select Action Type"
                        onChange={(value) => setActionType(value)}
                        allowClear
                    >
                        <Select.Option value="show_form">Show Form</Select.Option>
                        <Select.Option value="close_form">Close Form</Select.Option>
                        <Select.Option value="redirect">Redirect</Select.Option>
                    </Select>
                </Form.Item>

                {(actionType === "show_form" || actionType === "redirect") && (
                    <Form.Item
                        label="Related UI Canvas"
                        name="uiId"
                        rules={[{ required: true, message: "Please select a related UI canvas" }]}
                    >
                        <Select
                            showSearch
                            placeholder="Select Related UI Canvas"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.children
                                    ?.toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        >
                            {uiList?.sort((a , b) => a.label > b.label ? 1 : -1).map(item => (
                                <Select.Option key={item.id} value={item.id}>
                                    {item.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item 
                    label="Condition" 
                    name="condition"
                    // Remove the required rule since it's optional
                    rules={[
                        { min: 3, message: "Condition must be at least 3 characters" },
                        { max: 1000, message: "Condition cannot exceed 1000 characters" }
                    ]}
                >
                    <TextArea 
                        showCount={true} 
                        rows={3} 
                        placeholder="Enter condition (optional)..." 
                        maxLength={1000} 
                        minLength={3}
                        allowClear
                    />
                </Form.Item>
            </Form>
        </Drawer>
    );
}
