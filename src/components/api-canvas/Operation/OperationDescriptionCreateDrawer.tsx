import {Button, Drawer, Form, Input, Select, Space} from 'antd'
import {SaveOutlined} from "@ant-design/icons";
import {useEffect, useState} from "react";
import {OperationType, operationTypes} from "@/hooks/api-canvas/types.ts";

const {Item} = Form;

const {Option} = Select;
export default function OperationDescriptionCreateDrawer({
                                                             isCreateOperationDrawerVisible,
                                                             setIsCreateOperationDrawerVisible,
                                                             saveOperation,
                                                             operationForm,
                                                             setOperationForm
                                                         }) {
    const [error, setError] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        setOperationForm({type: OperationType.COMMON, description: ""});
        setError(null);
    }, [isCreateOperationDrawerVisible]);

    const handleSave = () => {
        if (!operationForm.description) return setError({description: "Description is required"});
        saveOperation()
        setOperationForm({type: OperationType.COMMON, description: ""});
    }

    function submitWithKeyPress(e) {
        if (e.code === "Enter" && e.ctrlKey) {
            if (operationForm.description) handleSave()
            else setError({description: "Description is required"})
        }
    }
    return (
        <Drawer
            title={
                "Create Operation Description"
            }
            width={500}
            visible={isCreateOperationDrawerVisible}
            onClose={() => setIsCreateOperationDrawerVisible(false)}
            footer={
                <Space>
                    <Button
                        type="primary"
                        icon={<SaveOutlined/>}
                        onClick={handleSave}
                    >
                        {"Create"}
                    </Button>
                    <Button onClick={() => setIsCreateOperationDrawerVisible(false)}>
                        Cancel
                    </Button>
                </Space>
            }
        >
            <Form layout="vertical">
                <Form.Item label="Type">
                    <Select
                        value={operationForm.type}
                        onChange={(value) => setOperationForm({...operationForm, type: value})}
                        style={{width: "100%"}}
                    >
                        {Object.values(operationTypes).map(item => (
                            <Option key={item.value} value={item.value}>{item.label}</Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label="Description" required>
                    <Input.TextArea
                        value={operationForm.description}
                        onBlur={(e) => {
                            if (e.target.value.length < 3) setError({description: "Minimum length is 3"})
                            else setError(null);
                        }}
                        onChange={(e) =>
                            setOperationForm({
                                ...operationForm,
                                description: e.target.value,
                            })
                        }
                        onKeyPress={submitWithKeyPress}
                        placeholder="Enter Description"
                        rows={10}
                    />
                    {error?.description && (
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

                            <span>{error.description}</span>
                        </p>
                    )}
                </Form.Item>
            </Form>
        </Drawer>
    )
}
