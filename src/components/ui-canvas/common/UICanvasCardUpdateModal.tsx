import {Button, Form, Input, Modal, Space} from "antd";
import React, {useEffect, useState} from "react";
import {SaveOutlined} from "@ant-design/icons";

export default function UICanvasCardUpdateModal({
                                                    open,
                                                    onClose,
                                                    updateUICanvas,
                                                    selectedUI,
                                                    editingUICanvas,
                                                    deleteUICanvas
                                                }) {
    const [name, setName] = useState("");
    const [error, setError] = useState<Record<string, string> | null>(null)
    // Modal açıldığında inputu temizle
    useEffect(() => {
        if (open && editingUICanvas) setName(editingUICanvas?.label || '')
    }, [open, editingUICanvas]);

    const handleOk = () => {
        if (name.trim()) {
            updateUICanvas(name.trim())
            onClose()
        }
    };
    const handleDelete = () => {
        Modal.confirm({
            content: "Are you sure you want to delete this record?",
            okText: "OK",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteUICanvas();
                onClose()
            }
        })
    }
    return <>
        <Modal
            title={"Update UI Canvas"}
            open={open}
            onCancel={() => onClose()}
            footer={
                <div className="flex justify-between">
                    <Button onClick={handleDelete} type="link">Delete</Button>
                    <Space>
                        <Button
                            type="primary"
                            icon={<SaveOutlined/>}
                            onClick={handleOk}
                        >
                            Update
                        </Button>
                        <Button onClick={onClose}>Cancel</Button>
                    </Space>
                </div>
            }
        >
            <Form layout="vertical">
                <Form.Item label="Canvas Name" required>
                    <Input
                        placeholder="Enter Canvas Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onPressEnter={handleOk}
                        onBlur={(e) => {
                            if (!e.target.value.length) {
                                setError({name: "Canvas Name is required"})
                            } else {
                                setError(null)
                            }
                        }}
                    />
                    {error?.name && (
                        <p
                            id="input-name-error"
                            role="alert"
                            aria-live="assertive"
                            className="mt-2 text-sm text-red-600 flex items-center gap-2 transition-opacity duration-150"
                        >
                            {/* Basit inline SVG ikonu */}
                            <svg
                                className="h-4 w-4 flex-shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-10.75a.75.75 0 10-1.5 0v4a.75.75 0 001.5 0v-4zM10 13a1 1 0 100 2 1 1 0 000-2z"
                                      clipRule="evenodd"/>
                            </svg>

                            <span>{error.name}</span>
                        </p>
                    )}
                </Form.Item>
            </Form>
        </Modal>

    </>
}
