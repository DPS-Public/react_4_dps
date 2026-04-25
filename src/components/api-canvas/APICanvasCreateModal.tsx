import React, {useEffect} from "react";
import {Button, Form, Input, Modal, Space} from "antd";
import {SaveOutlined} from "@ant-design/icons";

const {Item} = Form;

export default function APICanvasCreateModal({
                                             isDrawerVisible,
                                             setIsDrawerVisible,
                                             newEndpoint,
                                             setNewEndpoint,
                                             addEndpoint,
                                         }) {
    useEffect(() => {
        setNewEndpoint('')
    }, [isDrawerVisible]);

    return (
        <Modal
            title="New API Canvas"
            className="new-api-modal"
            open={isDrawerVisible}
            onCancel={() => setIsDrawerVisible(false)}
            footer={
                <Space>
                    <Button
                        type="primary"
                        icon={<SaveOutlined/>}
                        onClick={addEndpoint}
                        disabled={!newEndpoint?.name}
                    >
                        Create
                    </Button>
                    <Button onClick={() => setIsDrawerVisible(false)}>Cancel</Button>
                </Space>
            }
        >
            <Form layout="vertical">
                <Item label="Canvas Name" required>
                    <Input
                        value={newEndpoint?.name}
                        onChange={(e) => {
                            const name = e.target.value;
                            setNewEndpoint({
                                ...newEndpoint,
                                name,
                                config: {
                                    ...newEndpoint.config,
                                    localUrl: name.toLowerCase().replace(/\s+/g, "-"),
                                },
                            });
                        }}
                        placeholder="Enter Canvas Name"
                    />
                </Item>
            </Form>
        </Modal>
    );
}
