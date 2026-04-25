import React, { useState } from 'react';
import { Row, Col, Card, Table, Tag, Skeleton, Typography, Modal, Form, Input, message } from 'antd';
import useProjectActions from './actions/useProjectActions';
import ActionColumn from './ActionColumn';
import ProjectNameColumn from './ProjectNameColumn';
import TeamMembersColumn from './TeamMembersColumn';
import ManageUsersDrawer from './ManageUsersDrawer';

const { Title, Text } = Typography;

function ProjectCanvas() {
const {
    projects,
    getProjectPermissions,
    getUserInfo,
    selectedProject,
    setSelectedProject,
    loading,
    updateProjectName,
    savingProjectName,
    deleteProject,
    getDeleteProjectGuard,
    getProjectAdminGuard,
  }=useProjectActions()
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [manageUsersDrawerVisible, setManageUsersDrawerVisible] = useState(false);
  const [renameForm] = Form.useForm();

  const handleManageUsers = (project: any) => {
    setSelectedProject(project);
    setManageUsersDrawerVisible(true);
  };

  const openRenameModal = (project: any) => {
    setSelectedProject(project);
    renameForm.setFieldsValue({ name: project.name });
    setRenameModalVisible(true);
  };

  const handleRenameProject = async (values: { name: string }) => {
    if (!selectedProject?.id) return;

    try {
      await updateProjectName(selectedProject.id, values.name.trim());
      message.success('Project name updated successfully');
      setRenameModalVisible(false);
    } catch (error) {
      console.error('Failed to update project name:', error);
      message.error('Failed to update project name');
    }
  };

  const handleDeleteProject = async (project: any) => {
    try {
      await deleteProject(project);
      message.success('Project deleted successfully');
      if (selectedProject?.id === project.id) {
        setManageUsersDrawerVisible(false);
      }
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      message.error(error?.message || 'Failed to delete project');
    }
  };

  const closeManageUsersDrawer = () => {
    setManageUsersDrawerVisible(false);
  };

  const tableGetUserInfo = (uid: string) => {
    const userData: any = getUserInfo(uid);
    if (!userData) {
      return { fullName: 'Unknown User', avatar: null, email: 'Unknown' };
    }
    return {
      fullName: userData.displayName || userData.email,
      avatar: userData.photoURL,
      email: userData.email,
    };
  };

  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <ProjectNameColumn
          name={name}
          record={record}
          getProjectPermissions={getProjectPermissions}
        />
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: any) => new Date(date?.toDate?.() || date || Date.now()).toLocaleDateString(),
    },
    {
      title: 'Team Members',
      key: 'members',
      render: (_: unknown, record: any) => (
        <TeamMembersColumn
          record={record}
          getProjectPermissions={getProjectPermissions}
          getUserInfo={tableGetUserInfo}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: any) => {
        const editGuard = getProjectAdminGuard(record);
        const deleteGuard = getDeleteProjectGuard(record);
        return (
          <ActionColumn
            record={record}
            onUsers={handleManageUsers}
            onEdit={openRenameModal}
            onDelete={handleDeleteProject}
            canManageUsers={editGuard.canEdit}
            manageUsersReason={editGuard.reason}
            canEdit={editGuard.canEdit}
            editReason={editGuard.reason}
            canDelete={deleteGuard.canDelete}
            deleteReason={deleteGuard.reason}
          />
        );
      },
    },
  ];

  if (loading) {
    return <div style={{ padding: '24px' }}><Skeleton active /></div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Title level={2}>Project Management</Title>
            <Text type="secondary">Manage your projects and team member access</Text>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card title="Your Projects" extra={<Tag color="blue">{projects.length} projects</Tag>}>
            <Table
              dataSource={projects}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Update Project Name"
        open={renameModalVisible}
        onCancel={() => setRenameModalVisible(false)}
        onOk={() => renameForm.submit()}
        confirmLoading={savingProjectName}
        okText="Update Name"
      >
        <Form form={renameForm} layout="vertical" onFinish={handleRenameProject}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter project name' },
              { min: 3, message: 'Project name must be at least 3 characters' },
            ]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
        </Form>
      </Modal>

      <ManageUsersDrawer
        visible={manageUsersDrawerVisible}
        onClose={closeManageUsersDrawer}
        selectedProject={selectedProject}
      />
    </div>
  );
}

export default ProjectCanvas;
