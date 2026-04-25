import {useEffect, useState} from "react";
import {Button, Drawer, Form, Input, Modal, Space} from "antd";
import {SaveOutlined} from "@ant-design/icons";

const {Item} = Form;

export default function UpdateAPIInputDrawer({
                                                 isInputDrawerVisible,
                                                 setIsInputDrawerVisible,
                                                 saveInput,
                                                 editingInput,
                                                 deleteInput
                                             }) {
    // Local state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<Record<string, string> | null>(null)
    // Drawer açıldığında veya editingInput değiştiğinde state’i güncelle

    useEffect(() => {

        if (editingInput?.value) {
            setName(editingInput.value.name || "");
            setDescription(editingInput.value.description || "");
        }
    }, [editingInput, isInputDrawerVisible]);
    const handleSave = async () => {
        if (!name.trim()) return setError({name: "Input name is required"});
        await saveInput({name, description});
        setIsInputDrawerVisible(false);
    };

    function submitWithKeyPress(e) {
        if (e.code === "Enter" && e.ctrlKey) {
            handleSave()
        }
    }


    const handleDelete = () => {
        Modal.confirm({
            content: "Are you sure to delete current Input?",
            okText: "OK",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteInput(editingInput?.value?.key)
                setIsInputDrawerVisible(false)
            }
        })
    }
    return (
        <Drawer
            title={editingInput ? "Update Input" : "Create Input"}
            width={500}
            open={isInputDrawerVisible}
            onClose={() => setIsInputDrawerVisible(false)}
            footer={
                <div className="flex justify-between">
                    <Space>
                        <Button type="primary" icon={<SaveOutlined/>} onClick={handleSave}>
                            Update
                        </Button>
                        <Button onClick={() => setIsInputDrawerVisible(false)}>Cancel</Button>
                    </Space>
                    <Button type="link" onClick={handleDelete}>Delete</Button>
                </div>
            }
        >
            <Form layout="vertical">
                <Item label="Input name" required>
                    <Input
                        value={name ?? ''}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => {
                            if (!e.target.value.trim()) setError({name: "Input name is required"});
                            else setError(null);
                        }}
                        onKeyPress={submitWithKeyPress}
                        placeholder="Enter Input Name"
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
                </Item>
                <Item label="Description">
                    <Input.TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter Description"
                        onKeyPress={submitWithKeyPress}
                        rows={3}
                    />
                </Item>
            </Form>
        </Drawer>
    );
}
