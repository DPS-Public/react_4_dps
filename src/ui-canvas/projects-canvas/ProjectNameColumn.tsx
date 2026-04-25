import React from 'react';
import { Space, Badge, Avatar, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ProjectNameColumn = ({ name, record, getProjectPermissions }) => {
  return (
    <Space>
      <Badge 
        dot 
        color={getProjectPermissions(record.id).length > 0 ? 'green' : 'orange'}
      >
        <Avatar shape="square" style={{ backgroundColor: '#1890ff' }}>
          <FolderOpenOutlined />
        </Avatar>
      </Badge>
      <Text strong>{name}</Text>
    </Space>
  );
};

export default ProjectNameColumn;
