import {useEffect, useState} from "react";
import {Button, Drawer, Form, Input, Modal, Space} from "antd";
import {SaveOutlined} from "@ant-design/icons";

const {Item} = Form;

export default function UpdateOutputFieldDrawer({
                                                    isUpdateOutputDrawerVisible,
                                                    setIsUpdateOutputDrawerVisible,
                                                    updateOutput,
                                                    editingOutput,
                                                    deleteOutput
                                                }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<Record<string, string> | null>(null)
    // editingOutput değiştiğinde veya drawer açıldığında state’i set et

    useEffect(() => {
        if (editingOutput?.value) {
            setName(editingOutput.value.name || "");
            setDescription(editingOutput.value.description || "");
        }
    }, [editingOutput, isUpdateOutputDrawerVisible]);

    const handleSave = async () => {
        if (!name.trim()) return setError({name: "Input name is required"});
        await Promise.resolve(updateOutput({name, description}));
        setIsUpdateOutputDrawerVisible(false);
    };

    function submitWithKeyPress(e) {
        if (e.code === "Enter" && e.ctrlKey) {
            handleSave()
        }
    }

    const handleDelete = () => {
        Modal.confirm({
            content: "Are you sure to delete current output?",
            okText: "OK",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteOutput(editingOutput?.value?.key)
                setIsUpdateOutputDrawerVisible(false)
            }
        })
    }
    return (
        <Drawer
            title={"Update Output"}
            width={500}
            open={isUpdateOutputDrawerVisible}
            onClose={() => setIsUpdateOutputDrawerVisible(false)}
            footer={
                <div className="flex justify-between">
                    <Space>
                        <Button type="primary" icon={<SaveOutlined/>} onClick={handleSave}>
                            Update
                        </Button>
                        <Button onClick={() => setIsUpdateOutputDrawerVisible(false)}>Cancel</Button>
                    </Space>
                    <Button type="link" onClick={handleDelete}>Delete</Button>
                </div>
            }
        >
            <Form layout="vertical">
                <Item label="Output Name" required>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => {
                            if (!e.target.value.trim()) setError({name: "Output Name Is Required"});
                            else setError(null);
                        }}
                        onKeyPress={submitWithKeyPress}
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
                                      clipRule="evenodd"
                                />
                            </svg>

                            <span>{error.name}</span>
                        </p>
                    )}
                </Item>
                <Item label="Description">
                    <Input.TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyPress={submitWithKeyPress}
                        rows={3}
                    />
                </Item>
            </Form>
        </Drawer>
    );
}
