import {Button, Drawer, Form, Space} from "antd";
import React, {useEffect, useState} from "react";
import {SaveOutlined} from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";

function UICanvasCreateDescriptionDrawer({open, onClose, createDescription, defaultDescription}) {
    const [description, setDescription] = useState("");
    const handleSave = () => {
        createDescription(description);
        onClose();
    };

    useEffect(() => {
        if (open) setDescription(defaultDescription)
    }, [defaultDescription, open]);

  return (
    <>
      <Drawer
        width={800}
        title="Canvas Description"
        open={open}
        onClose={onClose}
        footer={
            <Space direction="horizontal">
                <Button
                type="primary"
                icon={<SaveOutlined/>}
                onClick={handleSave}
                >Update</Button>
                <Button onClick={onClose}>Cancel</Button>
            </Space>
        }
      >
        <Form layout="vertical">
            <Form.Item label="Description">
                <TextArea
                    rows={10}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter Description"
                />
            </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}

export default React.memo(UICanvasCreateDescriptionDrawer, (prevProps, nextProps) => prevProps.open === nextProps.open);
