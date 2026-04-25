import React from 'react';
import { Select, Button, Form, Input, Modal } from 'antd';
import { PlusOutlined ,ProjectOutlined} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const ProjectSelector = ({ 
  projects, 
  currentProject, 
  onSelectProject, 
  onCreateProject ,
  canCreateProject,
  handleCancelCreateProject,
  form,
  createProjectModalVisible,
  createProjectLoading,
  handleCreateProject
}) => {
  const navigate=useNavigate()

  return (
    <>
        <Select
      value={currentProject?.id}
      style={{ width: 200 }}
      placeholder="Select Project"
      onChange={onSelectProject}
      dropdownRender={(menu) => (
        <>
          {menu}
          <div style={{ padding: '8px' }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onCreateProject}
              disabled={!canCreateProject}
              style={{ width: '100%' }}
            >
              New Project
            </Button>
            <Button
            type='dashed'
            icon={<ProjectOutlined/>}
            onClick={()=>{
              navigate('/projects')
            }}
            style={{ width: '100%', marginTop: '8px' }}
            >
            Show Projects
            </Button>
          </div>
        </>
      )}
    >
      {projects.map((project) => (
        <Option key={project.id} value={project.id}>
          {project.name}
        </Option>
      ))}
    </Select>
    
    <Modal
        title="Create New Project"
        open={createProjectModalVisible}
        onCancel={handleCancelCreateProject}
        footer={[
          <Button key="cancel" onClick={handleCancelCreateProject}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={createProjectLoading}
            onClick={() => form.submit()}
          >
            Create Project
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter a project name' },
              { min: 3, message: 'Project name must be at least 3 characters' }
            ]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
        </Form>
      </Modal>
    </>

  );
};

export default ProjectSelector;
