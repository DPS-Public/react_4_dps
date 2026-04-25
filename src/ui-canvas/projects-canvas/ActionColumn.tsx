import React from 'react';
import { Button, Popconfirm, Space, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';

const ActionColumn = ({
  record,
  onUsers,
  onEdit,
  onDelete,
  canManageUsers,
  manageUsersReason,
  canEdit,
  editReason,
  canDelete,
  deleteReason,
}) => {
  const usersButton = (
    <Button
      icon={<TeamOutlined />}
      onClick={() => onUsers(record)}
      disabled={!canManageUsers}
    >
      User
    </Button>
  );

  const editButton = (
    <Button
      type="primary"
      icon={<EditOutlined />}
      onClick={() => onEdit(record)}
      disabled={!canEdit}
    >
      Edit
    </Button>
  );

  const deleteButton = (
    <Popconfirm
      title="Delete project"
      description="Are you sure you want to delete this project?"
      okText="Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
      onConfirm={() => onDelete(record)}
      disabled={!canDelete}
    >
      <Button danger icon={<DeleteOutlined />} disabled={!canDelete}>
        Delete
      </Button>
    </Popconfirm>
  );

  return (
    <Space>
      {canManageUsers ? (
        usersButton
      ) : (
        <Tooltip title={manageUsersReason || 'Only admins can manage project users'}>
          {usersButton}
        </Tooltip>
      )}
      {canEdit ? editButton : <Tooltip title={editReason || 'Only admins can edit project'}>{editButton}</Tooltip>}
      {canDelete ? (
        deleteButton
      ) : (
        <Tooltip title={deleteReason || 'Only admins can delete project and project must have no users'}>
          {deleteButton}
        </Tooltip>
      )}
    </Space>
  );
};

export default ActionColumn;
