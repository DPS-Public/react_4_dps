import React, { useState, useCallback } from 'react';
import { Modal, Form, Select, Space, Avatar, Button, message, Spin } from 'antd';
import { UserOutlined, CrownOutlined, EditFilled, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { doc, updateDoc, getDoc, collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { RoleDefinition } from '@/utils/projectPermissions';
import debounce from 'lodash/debounce';
import {
  buildProjectPermissionEntry,
  setUserProjectPermissionDoc,
  upsertUserPermissionsProjectEntry,
  upsertUserProjectsEntry,
} from '@/utils/projectAccessSync';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AddUserModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  selectedProject: { id: string; name: string; userId?: string };
  getProjectPermissions: (projectId: string) => any[];
  user: any;
  availableRoles?: RoleDefinition[];
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  visible,
  setVisible,
  selectedProject,
  getProjectPermissions,
  user,
  availableRoles = []
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const searchUsers = useCallback(
    debounce(async (searchValue: string) => {
      if (!searchValue || searchValue.length < 2) {
        setSearchResults([]);
        setLoadingUsers(false);
        return;
      }

      setLoadingUsers(true);
      setSearchTerm(searchValue);

      try {
        const usersCollection = collection(db, 'users');
        const searchLower = searchValue.toLowerCase().trim();
        const q = query(usersCollection, orderBy('displayName'), limit(50));
        const snapshot = await getDocs(q);

        const allUsers: User[] = [];
        snapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          allUsers.push({
            uid: data.uid || snapshotDoc.id,
            email: data.email || '',
            displayName: data.displayName || '',
            photoURL: data.photoURL || null,
          });
        });

        const filteredUsers = allUsers.filter((entry) => {
          const displayName = (entry.displayName || '').toLowerCase();
          const email = (entry.email || '').toLowerCase();
          return displayName.includes(searchLower) || email.includes(searchLower);
        });

        setSearchResults(filteredUsers.slice(0, 10));
      } catch (error: any) {
        console.error('Error searching users:', error);

        if (error.code === 'failed-precondition') {
          try {
            const usersCollection = collection(db, 'users');
            const snapshot = await getDocs(query(usersCollection, limit(50)));

            const allUsers: User[] = [];
            snapshot.forEach((snapshotDoc) => {
              const data = snapshotDoc.data();
              allUsers.push({
                uid: data.uid || snapshotDoc.id,
                email: data.email || '',
                displayName: data.displayName || '',
                photoURL: data.photoURL || null,
              });
            });

            const searchLower = searchValue.toLowerCase().trim();
            const filteredUsers = allUsers.filter((entry) => {
              const displayName = (entry.displayName || '').toLowerCase();
              const email = (entry.email || '').toLowerCase();
              return displayName.includes(searchLower) || email.includes(searchLower);
            });

            setSearchResults(filteredUsers.slice(0, 10));
          } catch (fallbackError) {
            message.error('Failed to search users');
          }
        } else {
          message.error('Failed to search users');
        }
      } finally {
        setLoadingUsers(false);
      }
    }, 300),
    []
  );

  const handleSearch = (value: string) => {
    searchUsers(value);
  };

  const handleClose = () => {
    setSearchResults([]);
    setSearchTerm('');
    setLoadingUsers(false);
    form.resetFields();
    setVisible(false);
  };

  const selectableUsers = searchResults
    .filter((entry) => {
      const projectPermissions = getProjectPermissions(selectedProject?.id || '');
      return !projectPermissions.some((perm: any) => perm.uid === entry.uid);
    })
    .map((entry) => {
      const displayName = entry.displayName || 'Unknown User';
      const email = entry.email || '';

      return {
        value: entry.uid,
        selectedLabel: email ? `${displayName} (${email})` : displayName,
        label: (
          <Space align="start" style={{ width: '100%' }}>
            <Avatar
              src={entry.photoURL || undefined}
              size="small"
              icon={<UserOutlined />}
              style={{ flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {displayName}
              </div>
              {email && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {email}
                </div>
              )}
            </div>
          </Space>
        ),
      };
    });

  const handleAddUser = async (values: { userId: string; permissionType: string }) => {
    if (!selectedProject) return;

    setLoading(true);

    try {
      const selectedRole = availableRoles.find((role) => role.id === values.permissionType);
      const projectPermRef = doc(db, "project_permissions", selectedProject.id);
      const projectPermissionsDoc = await getDoc(projectPermRef);
      const currentPermissions = projectPermissionsDoc.exists()
        ? projectPermissionsDoc.data().user_list || []
        : [];

      if (currentPermissions.some((perm: any) => perm.uid === values.userId)) {
        message.warning('This user already has access to the project');
        setLoading(false);
        return;
      }

      const newPermission = buildProjectPermissionEntry({
        uid: values.userId,
        roleId: values.permissionType,
        roleName: selectedRole?.name || values.permissionType,
        actorUid: user.uid,
      });

      await updateDoc(projectPermRef, {
        project_name: selectedProject.name,
        user_list: [...currentPermissions, newPermission]
      });

      await upsertUserPermissionsProjectEntry({
        uid: values.userId,
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
        },
      });

      await upsertUserProjectsEntry({
        uid: values.userId,
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
        },
      });

      await setUserProjectPermissionDoc({
        uid: values.userId,
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
        },
        role: {
          roleId: values.permissionType,
          roleName: selectedRole?.name || values.permissionType,
        },
      });

      message.success('User added to project successfully');
      handleClose();
    } catch (error) {
      console.error('Error adding user:', error);
      message.error('Failed to add user to project');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (roleId: string) => {
    const roleKey = String(roleId).toLowerCase();
    if (roleKey === 'admin') return <CrownOutlined style={{ color: '#faad14' }} />;
    if (roleKey === 'editor') return <EditFilled style={{ color: '#1890ff' }} />;
    if (roleKey === 'reviewer') return <EditOutlined style={{ color: '#52c41a' }} />;
    return <EyeOutlined style={{ color: '#8c8c8c' }} />;
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>Add User to Project</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleAddUser}
      >
        <Form.Item
          name="userId"
          label="Select User"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            placeholder={searchTerm.length < 2 ? "Type at least 2 characters..." : "Search by name or email"}
            showSearch
            onSearch={handleSearch}
            loading={loadingUsers}
            notFoundContent={
              loadingUsers ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin size="small" /> Searching...
                </div>
              ) : searchTerm.length < 2 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Type at least 2 characters
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No users found
                </div>
              )
            }
            filterOption={false}
            options={selectableUsers}
            optionLabelProp="selectedLabel"
          />
        </Form.Item>

        <Form.Item
          name="permissionType"
          label="Role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select
            placeholder="Select role"
            options={availableRoles.map((role) => ({
              value: role.id,
              label: (
                <Space>
                  {getRoleIcon(role.id)}
                  <span>{role.name}</span>
                </Space>
              ),
            }))}
          />
        </Form.Item>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Add User
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default AddUserModal;
