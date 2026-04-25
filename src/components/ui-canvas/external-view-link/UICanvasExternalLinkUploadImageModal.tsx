import React, {useEffect, useState} from "react";
import {Button, Form, Input, message, Modal, Upload} from "antd";
import {SaveOutlined, UploadOutlined} from "@ant-design/icons";
import {getDownloadURL, ref, uploadBytes} from "firebase/storage";
import {storage} from "@/config/firebase.ts";
import {v4 as uuidv4} from "uuid";
import useUICanvasExternalLinkCreate from "@/hooks/ui-canvas/external-link/useUICanvasExternalLinkCreate.tsx";

export default function UICanvasExternalLinkUploadImageModal({
                                                                 open,
                                                                 onClose,
                                                             }: {
    open: boolean;
    onClose: () => void;
}) {
    const [form] = Form.useForm();
    const {createExternalLink} = useUICanvasExternalLinkCreate({type: "image"});
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const file = values.file?.[0]?.originFileObj;
            if (!file) {
                message.error("Please select an image");
                return;
            }            const imageId = uuidv4();
            const storagePath = `external_links/${imageId}_${file.name}`;            const storageRef = ref(storage, storagePath);            
            await uploadBytes(storageRef, file);            const downloadURL = await getDownloadURL(storageRef);            if (!downloadURL) {
                console.error("❌ Download URL is empty!");
                message.error("Failed to get download URL");
                return;
            }            await createExternalLink({
                title: values.title,
                url: downloadURL,
                file_name: values.file?.[0]?.name
            });

            message.success("Image uploaded successfully");
            form.resetFields();
            onClose();
        } catch (err) {
            console.error("❌ Upload error:", err);
            console.error("❌ Error details:", {
                code: err.code,
                message: err.message,
                customData: err.customData
            });
            message.error("Upload failed: " + (err.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (info: any) => {
        const file = info.fileList?.[0]?.originFileObj;
        if (file) {
            // Faylın adını .ext hissəsiz də götürmək olar
            const nameWithExt = file.name
            form.setFieldsValue({file_name: nameWithExt});
        }
        form.setFieldsValue({file: info.fileList});
    };

    useEffect(() => {
        if (open) form.resetFields()
    }, [open]);

    return (
        <Modal
            title="Upload Image"
            open={open}
            onCancel={onClose}
            footer={null}
            className="modal-bottom-border"
        >
            <Form form={form} layout="vertical" onFinish={handleAdd}>
                <Form.Item
                    label="Title"
                    name="title"
                    required={true}
                    rules={[
                        {
                            validator: (_, value) =>
                                value && value.trim() !== ""
                                    ? Promise.resolve()
                                    : Promise.reject("Please enter a title"),
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>

                <Form.Item
                    label="Image"
                    name="file"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => e?.fileList}
                    rules={[{required: true, message: "Please select an image"}]}
                >
                    <Upload
                        beforeUpload={() => false}
                        maxCount={1}
                        onChange={handleFileChange} // 🔹 burada dəyişiklik etdik

                    >
                        <Button icon={<UploadOutlined/>}>Choose File</Button>
                    </Upload>
                </Form.Item>

                <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
                    <Button
                        type="primary"
                        onClick={handleAdd}
                        loading={loading}
                        icon={<SaveOutlined/>}
                    >
                        Create
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                </div>
            </Form>
        </Modal>
    );
}
