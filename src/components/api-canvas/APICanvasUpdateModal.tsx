import {useEffect, useState} from "react";
import {Button, Form, Input, Modal, Select, Space} from "antd";

const {Option} = Select;

export default function APICanvasUpdateModal({open, onClose, selectedEndpoint, updateNameAndConfig, deleteEndpoint}) {
    const [name, setName] = useState("");
    const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");

    useEffect(() => {
        if (selectedEndpoint) {
            setName(selectedEndpoint.name || "");
            setMethod(selectedEndpoint.config?.method || "GET");
        }
    }, [selectedEndpoint, open]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        const payload = {
            name: name,
            config: {
                method
            },
        };

        updateNameAndConfig(payload);
        onClose();
    };
    const handleDelete = () => {
        Modal.confirm({
            // title: "Warning!",
            content: "Delete selected API. Show the confirmation message the delete it after approve",
            okText: "OK",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteEndpoint(selectedEndpoint.id)
                onClose()
            },
            onCancel: () => {            },

        })
    }
    return (
        <Modal
            className="edit-endpoint-modal"
            title="Update API Canvas"
            open={open}
            onCancel={onClose}
            width={500}
            footer={
                <div
                    style={{
                        display: "flex",
                        paddingInline: "24px",
                        justifyContent: "space-between",
                    }}
                >
                    <Button type="link" className="px-0" onClick={handleDelete}>
                        Delete
                    </Button>

                    <Space>
                        <Button type="primary" onClick={handleSubmit}>
                            Update
                        </Button>
                        <Button onClick={onClose}>Cancel</Button>
                    </Space>
                </div>
            }
        >
            <Form
                layout="vertical"
            >
                <Form.Item label="Canvas Name" required>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter Canvas Name"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
