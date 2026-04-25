import React, {useEffect, useState} from "react";
import {Button, Form, Input, Modal} from "antd";
import * as htmlToImage from "html-to-image";

export default function APICanvasDuplicateModal({
                                              isCopyEndpointModalVisible,
                                              setIsCopyEndpointModalVisible,
                                              duplicateAPICanvas,
                                              targetRef
                                          }) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState<boolean>(false);
    // Modal açıldığında inputu temizle
    useEffect(() => {
        if (isCopyEndpointModalVisible) {
            setName("");
        }
    }, [isCopyEndpointModalVisible]);

    const handleOk = async () => {
        if (name.trim()) {
            setLoading(true)
            await duplicateAPICanvas(name.trim());
            await htmlToImage.toBlob(targetRef.current).then(async (blob) => {
                await navigator.clipboard.write([new ClipboardItem({"image/png": blob})])
            });
            setLoading(false);

            setIsCopyEndpointModalVisible(false);
        }
    };

    const handleCancel = () => {
        setIsCopyEndpointModalVisible(false);
    };

    return (
        <Modal
            title="Duplicate API Canvas"
            open={isCopyEndpointModalVisible}
            className="duplicate-api-modal"
            onCancel={() => setIsCopyEndpointModalVisible(false)}
            footer={[
                <Button key="copy" type="primary" onClick={handleOk} className="leading-[22px]" disabled={!name.trim()}
                        loading={loading}>Duplicate</Button>,
                <Button key="cancel" onClick={handleCancel}>Cancel</Button>
            ]}
        >
            <Form layout="vertical">
                <Form.Item label="New Canvas Name" required>
                    <Input
                        placeholder="Enter new API Canvas Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onPressEnter={handleOk} // Enter tuşuna basınca da submit olur
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
