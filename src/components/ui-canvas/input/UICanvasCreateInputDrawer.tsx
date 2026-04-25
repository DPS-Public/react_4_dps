import {Button, Drawer, Form, Input, Space} from "antd";
import React, {useEffect, useState} from "react";
import {SaveOutlined} from "@ant-design/icons";

export default React.memo(UICanvasCreateInputDrawer, (prevProps, nextProps) => prevProps.open === nextProps.open);

function UICanvasCreateInputDrawer({
    open,
    onClose,
    createInput
}) {
    const [error, setError] = useState<Record<string, string> | null>(null);
    const [name, setName] = useState("");

    useEffect(() => {
        if (open) {
            setName("")
            setError(null);
        }
    }, [open]);

    function submitWithKeyPress(e) {
        if (e.code === "Enter" && e.key === "Enter") {
            if (name.trim()) {
                createInput(name.trim())
                setName("")
            }
            else setError({ name: "Input Name is required" })
        }
    }

    return <>
        <Drawer
            title="Create Input"
            width={400}
            open={open}
            onClose={onClose}
            footer={
                <Space direction="horizontal">
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => {
                            if (name.trim()) {
                                createInput(name.trim())
                                setName("")
                            }
                            else setError({ name: "Input Name is required" })
                        }}>
                        Create
                    </Button>
                    <Button
                        onClick={onClose}
                        style={{ marginRight: 8 }}
                    >
                        Cancel
                    </Button>
                </Space>
            }
        >
            <Form layout="vertical">
                <Form.Item label="Input Name" required>
                    <Input
                        placeholder="Enter Input Name"
                        value={name}
                        onKeyPress={submitWithKeyPress}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => {
                            if (e.target.value.trim().length < 1) setError({ name: "Input Name is required" })
                            else setError(null);
                        }}
                        onFocus={() => setError(null)}
                        ref={input => {
                            if (open && input) {
                                input.focus();
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
                                    clipRule="evenodd" />
                            </svg>

                            <span>{error.name}</span>
                        </p>
                    )}
                </Form.Item>
            </Form>
        </Drawer>
    </>
}
