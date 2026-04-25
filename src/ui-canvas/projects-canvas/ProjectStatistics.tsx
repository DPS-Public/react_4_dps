import React from 'react';
import { Row, Col, Statistic, Typography, Tag, Progress } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { RoleDefinition, getRoleIdFromPermission } from '@/utils/projectPermissions';

const { Text } = Typography;

const ProjectStatistics = ({ selectedProject, getProjectPermissions, availableRoles = [] }: {
  selectedProject: any;
  getProjectPermissions: (projectId: string) => any[];
  availableRoles?: RoleDefinition[];
}) => {
  const getPermissionTagColor = (permissionType: string) => {
    switch (permissionType) {
      case 'admin': return 'red';
      case 'editor': return 'blue';
      case 'reviewer': return 'green';
      case 'viewer': return 'purple';
      default: return 'default';
    }
  };

  const permissions = getProjectPermissions(selectedProject.id);
  const roleMap = availableRoles.reduce<Record<string, string>>((acc, role) => {
    acc[role.id] = role.name;
    return acc;
  }, {});

  const roleCounts = permissions.reduce<Record<string, number>>((acc, permission) => {
    const roleId = getRoleIdFromPermission(permission);
    if (!roleId) return acc;

    acc[roleId] = (acc[roleId] || 0) + 1;
    return acc;
  }, {});

  const visibleRoleIds = Object.keys(roleCounts).sort((left, right) => {
    if (left === 'admin') return -1;
    if (right === 'admin') return 1;
    return left.localeCompare(right);
  });

  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Statistic
            title="Total Members"
            value={getProjectPermissions(selectedProject.id).length}
            prefix={<TeamOutlined />}
          />
        </Col>
        <Col span={8}>
          <div>
            <Text type="secondary">Permission Distribution</Text>
            <div style={{ marginTop: '8px' }}>
              {visibleRoleIds.map((roleId) => {
                const count = roleCounts[roleId] || 0;
                const total = permissions.length;
                return (
                  <div key={roleId} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <Tag color={getPermissionTagColor(roleId)} style={{ margin: 0, minWidth: '120px', textAlign: 'center' }}>
                      {roleMap[roleId] || roleId}
                    </Tag>
                    <Progress
                      percent={total ? Math.round((count / total) * 100) : 0} 
                      size="small" 
                      style={{ margin: '0 8px', flex: 1 }}
                      showInfo={false}
                    />
                    <Text type="secondary">{count}</Text>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectStatistics;
