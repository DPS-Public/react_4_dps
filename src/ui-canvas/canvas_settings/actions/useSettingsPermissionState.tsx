import {Form, message} from 'antd';
import {useEffect, useState} from 'react'
import {
    createProjectGithubRepository,
    deleteProjectGithubRepository,
    getProjectGithubRepositories,
    updateProjectGithubRepository,
} from "@/services/frontendData";

export default function useSettingsPermissionState({
    projectId
}) {
    const [form] = Form.useForm();
    const [tableData, setTableData] = useState([]);
    const [editingKey, setEditingKey] = useState('');
    const [permissionDrawerVisible, setPermissionDrawerVisible] = useState(false);
    const [currentRepo, setCurrentRepo] = useState(null);
    const [coaches, setCoaches] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('commentor');
    const [classPermissions, setClassPermissions] = useState([]);
    const [permissionsLoading, setPermissionsLoading] = useState(false);
  
    const isEditing = (record) => record.key === editingKey;
    const handleDelete = async (record) => {
        try {
          await deleteProjectGithubRepository(record.id || record.key);
          message.success('Repository deleted');
          setTableData(prevData => prevData.filter(item => item.key !== record.key));
          return true;
        } catch (error) {
          console.error('Delete error:', error);
          message.error('Failed to delete repository');
          return false;
        }
      };
      const handleDeleteUseronCollobrators = async (collaboratorRecord: any, repoInfo: any) => {
        if (!collaboratorRecord || !repoInfo) {
          message.error('Missing collaborator or repository information');
          return false;
        }

        const username = collaboratorRecord.login;
        const owner = repoInfo.owner;
        const repo = repoInfo.repo;

        if (!username || !owner || !repo) {
          message.error('Missing required information to remove collaborator');
          return false;
        }

        message.info(`Collaborator removal is now handled directly in GitHub for ${owner}/${repo}.`);
        return false;
      }
      const handleAdd = async () => {
        try {
          if (!projectId) {
            message.error('Please select a project first');
            return false;
          }

          const values = await form.validateFields();
          const owner = String(values.owner || '').trim();
          const repo = String(values.repo || '').trim();
          const type = String(values.type || '').trim();

          if (!owner || !repo || !type) {
            message.error('Owner, repository and type are required');
            return false;
          }

          const newData = {
            projectId: projectId,
            project_id: projectId,
            owner,
            repo,
            type,
            permission: '0 (Add/Manage)',
          };
    
          const id = await createProjectGithubRepository(newData);
          message.success('Repository created successfully');
          await fetchGithubPermission();
          // setTableData(prevData => [...prevData, {
          //   ...newData,
          //   id,
          //   key: id,
          //   permission: 'Manage',
          // }]);
          form.resetFields();
          return true;
        } catch (error: any) {
          console.error('Add error:', error);
          message.error(error?.message || 'Failed to add repository');
          return false;
        }
      };
      const handleUpdate = async () => {
        try {
          const values = await form.validateFields();
          const record = tableData.find(item => item.key === editingKey);
          
          if (!record) {
            message.error('Record not found');
            return false;
          }
    
          const updateData = {
            id: record.id,
            owner: values.owner,
            repo: values.repo,
            type: values.type,
            projectId: projectId,
          };
    
          await updateProjectGithubRepository(record.id || editingKey, updateData);
          message.success('Repository updated');
          setTableData(prevData => 
            prevData.map(item => 
              item.key === editingKey ? { ...item, ...updateData } : item
            )
          );
          setEditingKey('');
          form.resetFields();
          return true;
        } catch (error) {
          console.error('Update error:', error);
          message.error('Failed to update repository');
          return false;
        }
      };
      const fetchGithubPermission = async () => {
        try {
          const repos = await getProjectGithubRepositories(projectId);
          const filteredData = repos
            .filter((item) => item.type !== 'virtual')
            .map((item) => ({
              ...item,
              key: item.id,
              permission: 'Manage',
            }));
          setTableData(filteredData);
        } catch (error) {
          console.error('Error fetching permissions:', error);
          setTableData([]);
        }
      };
    
      useEffect(() => {
        fetchGithubPermission();
      }, [projectId]);
  return{
    form,
    tableData,
    setTableData,
    editingKey,
    setEditingKey,
    permissionDrawerVisible,
    setPermissionDrawerVisible,
    currentRepo,
    setCurrentRepo,
    coaches,
    setCoaches,
    searchValue,
    setSearchValue,
    searchResults,
    setSearchResults,
    email,
    setEmail,
    selectedRole,
    setSelectedRole,
    classPermissions,
    setClassPermissions,
    permissionsLoading,
    setPermissionsLoading,
    isEditing,
    handleDelete,
    handleAdd,
    handleUpdate,
    handleDeleteUseronCollobrators
  }
}
