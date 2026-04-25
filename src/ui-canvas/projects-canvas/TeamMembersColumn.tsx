import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined, CrownOutlined } from '@ant-design/icons';

const TeamMembersColumn = ({ record, getProjectPermissions, getUserInfo }) => {
  const permissions = getProjectPermissions(record.id);
  
  return (
    <Avatar.Group maxCount={3} maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>
      {permissions.map((perm, index) => {
        const userInfo = getUserInfo(perm.uid);
        return (
          <Tooltip key={index} title={`${userInfo.fullName} (${perm.permission_type})`}>
            <Avatar src={userInfo.avatar} icon={<UserOutlined />}>
              {perm.permission_type === 'admin' ? <CrownOutlined /> : <UserOutlined />}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};

export default TeamMembersColumn;
