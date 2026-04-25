import React, {useEffect, useState} from "react";
import {Button, Form, Input, Modal, Select, Space} from "antd";
import {SaveOutlined} from "@ant-design/icons";

export default function UICanvasExternalLinkUpdateModal({
                                                            open,
                                                            onClose,
                                                            selectedLink,
                                                            onUpdate,
                                                            onDelete,
                                                            loading = false,
                                                        }) {
    const [form] = Form.useForm();
    const [type, setType] = useState<string>("embedded");
    const isImageType = type === "image";
    const isEmbedCodeType = type === "embed" || type === "embedded_code";

    useEffect(() => {
        if (selectedLink && open) {
            const currentType = selectedLink.type || "embedded";
            setType(currentType);
            form.setFieldsValue({
                title: selectedLink.title,
                type: currentType,
                ...(currentType === "image" ? {url: selectedLink.url || selectedLink.image || ""} : {}),
                ...(currentType === "embed" || currentType === "embedded_code" ? {code: selectedLink.code || selectedLink.url || ""} : {url: selectedLink.url})
            });
        }
    }, [selectedLink, form, open]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const nextType = values.type || type;

            const isUpdated = await onUpdate?.(selectedLink?.id, {
                title: values.title,
                type: nextType,
                ...(nextType === "image" ? {image: values.url, url: values.url, code: ""} : {}),
                ...((nextType === "embed" || nextType === "embedded_code") ? {code: values.code, url: values.code, image: ""} : {}),
                ...(nextType !== "image" && nextType !== "embed" && nextType !== "embedded_code" ? {url: values.url, code: "", image: ""} : {}),
            });
            if (isUpdated !== false) {
                onClose();
            }
            // message.success("Link updated successfully");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Modal
            title={isImageType ? "Update Image URL" : isEmbedCodeType ? "Update Embed Code" : "Update External Link"}
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Title"
                    name="title"
                    rules={[{required: true, message: "Please enter a title"}]}
                >
                    <Input placeholder="Enter link title"/>
                </Form.Item>

                <Form.Item
                    label="Type"
                    name="type"
                    rules={[{required: true, message: "Please select a type"}]}
                >
                    <Select
                        disabled
                        options={[
                            {value: "image", label: "Image"},
                            {value: "embedded", label: "Embedded"},
                            {value: "embed", label: "Embed Code"},
                            {value: "embedded_code", label: "Embedded Code (Legacy)"},
                        ]}
                        onChange={(value) => setType(value)}
                    />
                </Form.Item>

                {!isImageType && !isEmbedCodeType ? (
                    <Form.Item
                        label="URL"
                        name="url"
                        rules={[{required: true, message: "Please enter a URL"}]}
                    >
                        <Input.TextArea rows={6} placeholder="Enter embedded URL"/>
                    </Form.Item>
                ) : isEmbedCodeType ? (
                    <Form.Item
                        label="Embed Code"
                        name="code"
                        rules={[{required: true, message: "Please enter embed code"}]}
                    >
                        <Input.TextArea rows={6} placeholder="Paste Figma iframe embed code"/>
                    </Form.Item>
                ) : (
                    <Form.Item
                        label="Image URL"
                        name="url"
                        rules={[{required: true, message: "Please enter an image URL"}]}
                    >
                        <Input.TextArea rows={6} placeholder="Paste image URL"/>
                    </Form.Item>

                )}
                <Space direction={"horizontal"} className="justify-between w-full">

                    <div style={{display: "flex", gap: 8}}>

                        <Button
                            type="primary"
                            onClick={handleSubmit}
                            loading={loading}
                            icon={<SaveOutlined/>}
                        >
                            Update
                        </Button>
                        <Button onClick={onClose}>Cancel</Button>

                    </div>
                    <Button onClick={onDelete} type="link">Delete</Button>
                </Space>

            </Form>
        </Modal>
    );
}
