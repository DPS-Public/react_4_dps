import React, {useEffect, useState} from "react";
import {Button, Form, Input, message, Modal, Upload} from "antd";
import {CloseCircleFilled, InboxOutlined, SaveOutlined} from "@ant-design/icons";
import {getDownloadURL, ref, uploadBytesResumable} from "firebase/storage";
import {storage} from "@/config/firebase.ts";
import useUICanvasExternalLinkCreate from "@/hooks/ui-canvas/external-link/useUICanvasExternalLinkCreate.tsx";

const { Dragger } = Upload;

export default function UICanvasExternalLinkImageClipboardCopyModal({ open, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState<any[]>([]);
    const { createExternalLink } = useUICanvasExternalLinkCreate({ type: "image" });
    const handleAdd = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const uploadedUrls = fileList.map((f) => f.url).filter(Boolean);

            if (uploadedUrls.length === 0) {
                message.error("Please upload at least one image");
                return;
            }

            for (let i = 0; i < uploadedUrls.length; i++) {
                const url = uploadedUrls[i];
                const file = fileList.find(f => f.url === url);
                await createExternalLink({
                    title: values.title,
                    url,
                    file_name: file?.name || `image_${i + 1}`,
                });
            }

            message.success("Images added successfully");
            form.resetFields();
            setFileList([]);
            onClose();
        } catch (err) {
            console.error(err);
            message.error("Failed to add image links");
        } finally {
            setLoading(false);
        }
    };

    // 📋 Clipboard ilə şəkil yapışdırma
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        handleFileUpload(file);
                    }
                }
            }
        };

        if (open) {
            form.resetFields();
            document.addEventListener("paste", handlePaste);
        }
        return () => document.removeEventListener("paste", handlePaste);
    }, [open]);

    const handleFileUpload = (file: File) => {
        if (fileList.some((f) => f.name === file.name && f.size === file.size)) {
            message.warning(`${file.name} is already added`);
            return;
        }

        // 🔹 Tarixi `dd.mm.yyyy` formatında alırıq
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const formattedDate = `${day}.${month}.${year}`;

        // 🔹 Tarixi title-a set et
        form.setFieldsValue({ title: formattedDate });

        setUploading(true);
        const imageId = crypto.randomUUID();
        const storagePath = `external_links/${imageId}_${file.name}`;        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;            },
            (error) => {
                console.error("❌ Upload error:", error);
                console.error("❌ Error details:", {
                    code: error.code,
                    message: error.message,
                    customData: error.customData
                });
                message.error("Upload failed: " + (error.message || "Unknown error"));
                setUploading(false);
            },
            async () => {                const url = await getDownloadURL(uploadTask.snapshot.ref);                if (!url) {
                    console.error("❌ Download URL is empty!");
                    message.error("Failed to get download URL");
                    setUploading(false);
                    return;
                }

                setFileList((prev) => [
                    ...prev,
                    {
                        uid: file.name + "_" + Date.now(),
                        name: file.name,
                        size: file.size,
                        status: "done",
                        url,
                    },
                ]);
                setUploading(false);
                message.success(`${file.name} uploaded`);
            }
        );
    };

    const handleRemove = (uid: string) => {
        setFileList((prev) => prev.filter((file) => file.uid !== uid));
    };

    const uploadProps = {
        name: "file",
        multiple: true,
        fileList,
        listType: "picture",
        beforeUpload: (file) => {
            handleFileUpload(file);
            return false;
        },
        showUploadList: false,
    };

    return (
        <Modal
            title="Upload from Clipboard"
            open={open}
            onCancel={onClose}
            footer={null}
            className="modal-bottom-border"
        >
            <Form form={form} layout="vertical">
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
                    <Input placeholder="Example: UI Mockups" />
                </Form.Item>

                <Form.Item
                    label="Upload Images"
                    name="file"
                    required={true}
                    rules={[
                        {
                            validator: () => {
                                if (fileList.length === 0) {
                                    return Promise.reject("Please upload or paste at least one image");
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                    <Dragger {...uploadProps} style={{ padding: 20, position: "relative" }}>
                        {fileList.length > 0 ? (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 12,
                                    justifyContent: "center",
                                }}
                            >
                                {fileList.map((file) => (
                                    <div key={file.uid} style={{ position: "relative", width: 100, height: 100 }}>
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                borderRadius: 8,
                                                border: "1px solid #ddd",
                                            }}
                                        />
                                        <CloseCircleFilled
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(file.uid);
                                            }}
                                            style={{
                                                position: "absolute",
                                                top: -8,
                                                right: -8,
                                                fontSize: 18,
                                                color: "#ff4d4f",
                                                cursor: "pointer",
                                                background: "#fff",
                                                borderRadius: "50%",
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">
                                    Click, drag & drop, copy or paste images here
                                </p>
                                <p className="ant-upload-hint">You can upload multiple images</p>
                            </>
                        )}
                    </Dragger>
                </Form.Item>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button
                        type="primary"
                        onClick={handleAdd}
                        loading={loading || uploading}
                        icon={<SaveOutlined />}
                    >
                        Create
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                </div>
            </Form>
        </Modal>
    );
}
