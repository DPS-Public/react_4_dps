import React, { useEffect, useState } from "react";
import { Button, Drawer, Form, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";

interface UICApiCanvasDescriptionDrawerProps {
  open: boolean;
  onClose: () => void;
  createDescription: (description: string) => void;
  defaultDescription: string;
}

function UICApiCanvasDescriptionDrawer({
  open,
  onClose,
  createDescription,
  defaultDescription,
}: UICApiCanvasDescriptionDrawerProps) {
  const [description, setDescription] = useState("");

  const handleSave = () => {
    createDescription(description);
    onClose();
  };

  useEffect(() => {
    if (open) {
      setDescription(defaultDescription);
    }
  }, [defaultDescription, open]);

  return (
    <Drawer
      width={800}
      title="Canvas Description"
      open={open}
      onClose={onClose}
      footer={
        <Space direction="horizontal">
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            Update
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="Description">
          <TextArea
            rows={10}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Enter Description"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default React.memo(
  UICApiCanvasDescriptionDrawer,
  (prevProps, nextProps) => prevProps.open === nextProps.open,
);
