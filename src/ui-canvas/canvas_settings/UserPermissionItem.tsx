import React from 'react';
import { Avatar, Button, Popconfirm, Select } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { UserPermissionItemProps } from '../projects-canvas/hooks/types';
import useUserPermissionItem from '../projects-canvas/hooks/useUserPermissionItem';

const { Option } = Select;

const SettingsUserPermissionItem: React.FC<UserPermissionItemProps> = ({ 
  permission, 
  selectedProject, 
  getUserInfo, 
  user,
  currentUserPermission,
  currentUserIsAdmin,
  availableRoles = [],
}) => {
  const {
    userInfo, 
    isCurrentUser, 
    canModifyPermission,
    handleUpdatePermission, 
    handleRemoveUser
  } = useUserPermissionItem({
    permission, 
    selectedProject, 
    getUserInfo, 
    user, 
    currentUserPermission, 
    currentUserIsAdmin
  });

  const selectedRoleId = permission.role_id || permission.permission_type;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0'
    }}>
      {/* Sol tərəf - İstifadəçi məlumatları */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <Avatar 
          src={userInfo?.photoURL} 
          icon={!userInfo?.photoURL ? <UserOutlined /> : undefined} 
        />
        <div>
          <div style={{ fontWeight: '500' }}>
            {userInfo?.displayName || userInfo?.email || 'Unknown User'}
          </div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            {userInfo?.email}
          </div>
          {isCurrentUser && (
            <div style={{ color: '#1890ff', fontSize: '11px' }}>(You)</div>
          )}
        </div>
      </div>

      {/* Sağ tərəf - Select və Sil düyməsi üçün konteyner */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        justifyContent: 'flex-end',
        flexShrink: 0
      }}>
        {/* SelectBox üçün fit-content konteyner */}
        <div style={{ width: 'fit-content' }}>
          <Select
            value={selectedRoleId}
            style={{ 
              width: 'fit-content',
              minWidth: '350px',
            }}
            onChange={(value) => {
              const role = availableRoles.find((item) => item.id === value);
              handleUpdatePermission(permission.uid, value, role?.name || value);
            }}
            disabled={!canModifyPermission}
          >
            {availableRoles.map((role) => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        </div>

        <Popconfirm
          title="Are you sure to remove this user from the project?"
          description="This user will lose access to this project."
          onConfirm={() => handleRemoveUser(permission.uid)}
          okText="Yes"
          cancelText="No"
          disabled={!canModifyPermission}
        >
          <Button 
            type="text"
            danger 
            icon={<DeleteOutlined />}
            disabled={!canModifyPermission}
            style={{ 
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </Popconfirm>
      </div>
    </div>
  );
};

export default SettingsUserPermissionItem;
