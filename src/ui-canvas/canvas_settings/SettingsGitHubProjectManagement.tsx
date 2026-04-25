import React, { useEffect, useState } from "react";
import { AutoComplete, Avatar, Button, Card, Col, Drawer, Form, Input, message, Modal, Row, Select, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { getGitHubAccessToken } from "@/config/firebase";
import {
  createProjectGithubRepositoryPermission,
  deleteProjectGithubRepositoryPermission,
  getAllUsersFromFirestore,
  getProjectGithubRepositoryPermissions,
  updateProjectGithubRepositoryPermission,
} from "@/services/frontendData";
import useSettingsPermissionState from "./actions/useSettingsPermissionState";
import axios from "axios";


const { Option } = Select;
const { Text } = Typography;

const SettingsGitHubProjectManagement = ({ projectId }: { projectId: string }) => {
  const [repoFormDrawerVisible, setRepoFormDrawerVisible] = useState(false);
  const [collaboratorsModalVisible, setCollaboratorsModalVisible] = useState(false);
  const [currentRepoForCollaborators, setCurrentRepoForCollaborators] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [currentRepoForToken, setCurrentRepoForToken] = useState<any>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const {
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
  } = useSettingsPermissionState({
    projectId,
  });

  // Wrapper function to handle collaborator removal and refresh the list
  const handleRemoveCollaborator = async (record: any) => {
    if (!currentRepoForCollaborators) {
      message.error("Repository information not found");
      return;
    }

    const username = record.login;
    if (!username) {
      message.error("Collaborator username not found");
      return;
    }

    // Show loading state
    setCollaboratorsLoading(true);
    
    // Optimistically remove from UI immediately for better UX
    const previousCollaborators = [...collaborators];
    setCollaborators(prev => prev.filter(collab => collab.login !== username && collab.id !== record.id));
    
    try {
      const success = await handleDeleteUseronCollobrators(record, currentRepoForCollaborators);
      
      if (success) {
        // Refresh collaborators list from API to ensure consistency
        // Wait a bit for GitHub API to update (GitHub API might have slight delay)
        setTimeout(async () => {
          await fetchGitHubCollaborators(currentRepoForCollaborators.owner, currentRepoForCollaborators.repo, false);
        }, 1000);
      } else {
        // If removal failed, restore the collaborator in the list
        setCollaborators(previousCollaborators);
        setCollaboratorsLoading(false);
      }
    } catch (error) {
      // If error, restore the collaborator in the list
      setCollaborators(previousCollaborators);
      setCollaboratorsLoading(false);
    }
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      owner: record.owner,
      repo: record.repo,
      type: record.type,
    });
    setEditingKey(record.key);
    setRepoFormDrawerVisible(true);
  };

  const openAddRepoDrawer = () => {
    setEditingKey("");
    form.resetFields();
    setRepoFormDrawerVisible(true);
  };

  const closeRepoFormDrawer = () => {
    setRepoFormDrawerVisible(false);
    setEditingKey("");
    form.resetFields();
  };

  const handleRepoFormSubmit = async () => {
    let success = false;
    if (editingKey !== "") {
      success = await handleUpdate();
    } else {
      success = await handleAdd();
    }
    if (success) {
      closeRepoFormDrawer();
    }
  };

  const handleDeleteFromRepoDrawer = () => {
    const record = tableData.find((item) => item.key === editingKey);
    if (!record) {
      message.error("Repository not found");
      return;
    }

    Modal.confirm({
      title: "Delete this repository?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        const success = await handleDelete(record);
        if (success) {
          closeRepoFormDrawer();
        }
      },
    });
  };

  const showPermissionDrawer = (record) => {
    setCurrentRepo(record);
    setPermissionDrawerVisible(true);
    fetchClassPermissions(record.key);
  };

  const closePermissionDrawer = () => {
    setPermissionDrawerVisible(false);
    setCurrentRepo(null);
  };

  const fetchClassPermissions = async (classId) => {
    setPermissionsLoading(true);
    try {
      const response = await getProjectGithubRepositoryPermissions(classId);
      const updatedData = response.map((item) => ({
        ...item,
        key: item.id,
        role: item.role,
        userEmail: item.email,
        userName: item.displayName,
        userPhotoURL: item.photoURL,
        userId: item.userId || item.uid
      }));
      setClassPermissions(updatedData);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setClassPermissions([]); // Error zamanı da boş set et
    } finally {
      setPermissionsLoading(false);
    }
  };


  const fetchCoachesData = async () => {
    try {
      const response = await getAllUsersFromFirestore();
      setCoaches(response);
    } catch (error) {
      console.error("Error fetching coaches:", error);
    }
  };

  useEffect(() => {
    fetchCoachesData();
  }, []);

  const handleSearch = (value) => {
    setSearchValue(value);
    if (value) {
      const filtered = coaches.filter(
        (user) =>
          user.email.toLowerCase().includes(value.toLowerCase()) ||
          (user.displayName &&
            user.displayName.toLowerCase().includes(value.toLowerCase()))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelect = (value, option) => {
    setEmail(option.email);
    setSearchValue(option.email);
  };

  const filterOption = (inputValue, option) => {
    return option.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1;
  };

  const renderOption = (user) => {
    return {
      value: user.email,
      label: (
        <div style={{ display: "flex", alignItems: "center" }}>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="User"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                marginRight: 8,
              }}
            />
          )}
          <div>
            <div>{user.displayName || "No name"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{user.email}</div>
          </div>
        </div>
      ),
      email: user.email,
    };
  };

  const handleEnrollDeveloperSubmit = async () => {
    if (!email) return;

    const newPermission = {
      userId: searchResults.find((u) => u.email === email)?.uid,
      userEmail: email,
      userName:
        searchResults.find((u) => u.email === email)?.displayName ||
        email.split("@")[0],
      userPhotoURL: searchResults.find((u) => u.email === email)?.photoURL,
      role: selectedRole,
      repo_id: currentRepo.key,
      projectId: projectId,
    };


    await createProjectGithubRepositoryPermission(newPermission);
    message.success("Repository access added");
    setClassPermissions([...classPermissions, newPermission]);
    setEmail("");
    setSearchValue("");
    fetchClassPermissions(currentRepo.key)
  };

  const handleUpdatePermission = async (userId, classId, newRole) => {

    await updateProjectGithubRepositoryPermission(classId, userId, newRole);
    message.success("Repository access updated");
    setClassPermissions((prev) =>
      prev.map((perm) =>
        perm.userId === userId && perm.repo_id === classId
          ? { ...perm, role: newRole }
          : perm
      )
    );
    fetchClassPermissions(classId)

  };

  const handleDeletePermission = async (userId, classId) => {
    await deleteProjectGithubRepositoryPermission(classId, userId);
    message.success("Repository access removed");
    setClassPermissions((prev) =>
      prev.filter(
        (perm) => !(perm.userId === userId && perm.repo_id === classId)
      )
    );
    fetchClassPermissions(classId)

  };

  const fetchGitHubCollaborators = async (owner: string, repo: string, useCache: boolean = false) => {
    setCollaboratorsLoading(true);
    try {
      const githubToken = await getGitHubAccessToken();
      if (!githubToken) {
        message.error('GitHub token not found. Please authenticate with GitHub first.');
        setCollaborators([]);
        return;
      }

      const githubHeaders = {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${githubToken}`,
      };

      let resolvedOwner = owner;
      let resolvedRepo = repo;

      try {
        const repoInfoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: githubHeaders,
        });
        resolvedOwner = repoInfoResponse.data?.owner?.login || owner;
        resolvedRepo = repoInfoResponse.data?.name || repo;
      } catch (repoInfoError: any) {
        // Fallback: try to resolve from visible repos in case stored owner/repo is stale.
        const repoListResponse = await axios.get('https://api.github.com/user/repos?per_page=100&type=all&sort=updated', {
          headers: githubHeaders,
        });

        const repos = Array.isArray(repoListResponse.data) ? repoListResponse.data : [];
        const wantedFullName = `${owner}/${repo}`.toLowerCase();
        const matchedRepo = repos.find((item: any) => {
          const fullName = String(item?.full_name || '').toLowerCase();
          const repoName = String(item?.name || '').toLowerCase();
          return fullName === wantedFullName || repoName === repo.toLowerCase();
        });

        if (!matchedRepo) {
          throw repoInfoError;
        }

        resolvedOwner = matchedRepo.owner?.login || owner;
        resolvedRepo = matchedRepo.name || repo;
      }

      const separator = useCache ? "?" : "?t=" + Date.now() + "&";

      const response = await axios.get(
        `https://api.github.com/repos/${resolvedOwner}/${resolvedRepo}/collaborators${separator}per_page=100&affiliation=all`,
        { headers: githubHeaders }
      );

      const collaboratorsData = Array.isArray(response.data) ? response.data : [];
      const normalizedData = collaboratorsData.map((collab: any) => ({
        id: collab.id,
        login: collab.login,
        node_id: collab.node_id,
        avatar_url: collab.avatar_url,
        type: collab.type,
        role_name: collab.role_name,
        permissions: collab.permissions || {},
        ...collab,
      }));

      setCollaborators(normalizedData);
    } catch (error: any) {
      console.error("Error fetching collaborators:", error);
      if (error.response?.status === 401) {
        message.error('GitHub authentication failed. Please re-authenticate with GitHub.');
      } else if (error.response?.status === 403) {
        message.error('Access forbidden for collaborators list. Your token needs proper repository scope.');
      } else if (error.response?.status === 404) {
        message.error('Repository not found in your accessible GitHub repositories.');
      } else if (!error.response) {
        message.error('Network error. Please check your internet connection.');
      } else {
        message.error(error.response?.data?.message || 'Failed to fetch collaborators');
      }
      setCollaborators([]);
    } finally {
      setCollaboratorsLoading(false);
    }
  };

  const showCollaboratorsModal = (record: any) => {
    setCurrentRepoForCollaborators(record);
    setCollaboratorsModalVisible(true);
    fetchGitHubCollaborators(record.owner, record.repo);
  };

  const closeCollaboratorsModal = () => {
    setCollaboratorsModalVisible(false);
    setCurrentRepoForCollaborators(null);
    setCollaborators([]);
  };

  const showTokenModal = (record: any) => {
    setCurrentRepoForToken(record);
    setTokenValue(record.gha_token || "");
    setTokenModalVisible(true);
  };

  const closeTokenModal = () => {
    setTokenModalVisible(false);
    setCurrentRepoForToken(null);
    setTokenValue("");
  };

  const handleSaveToken = async () => {
    if (!currentRepoForToken) {
      message.error("Repository information not found");
      return;
    }

    if (!currentRepoForToken.id) {
      message.error("Repository ID is missing");
      return;
    }

    setTokenLoading(true);
    try {
      message.info("GHA token saving is not configured yet.");
    } catch (error: any) {
      console.error("Error saving GHA token:", error);
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.message || 
                       error.message || 
                       "Failed to save GHA token. Please check your connection and try again.";
      message.error(errorMsg);
    } finally {
      setTokenLoading(false);
    }
  };

  const permissionsColumns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {record.photoURL && (
            <img
              src={record.photoURL}
              alt="User"
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
          )}
          <div>
            <div>{record.displayName}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role, record) => (
        <Select
          defaultValue={role}
          style={{ width: 120 }}
          onChange={(value) =>
            handleUpdatePermission(record.userId, record.repo_id, value)
          }
        >
          <Option value="admin">Admin</Option>
          <Option value="reviewer">Reviewer</Option>
          <Option value="commentor">Commentor</Option>
        </Select>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          danger
          onClick={() =>
            handleDeletePermission(record.userId, record.repo_id)
          }
        >
          Remove
        </Button>
      ),
    },
  ];

  const columns : any = [
    {
      title: "GitHub Owner",
      dataIndex: "owner",
      key: "owner",
      responsive: ["md"],
      render: (text) => text,
    },
    {
      title: "GitHub Repo",
      dataIndex: "repo",
      key: "repo",
      render: (text) => text,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      responsive: ["sm"],
      render: (text, record) => {
        return (
          <div>
            {text}
            {record.type === 'virtual' && (
              <Tag color="purple" style={{ marginLeft: 8 }}>Virtual</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Collaborators",
      key: "collaborators",
      width: 150,
      render: (_, record) => {
        return (
          <Button
            danger
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => showCollaboratorsModal(record)}
            style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            Collaborators
          </Button>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const isVirtual = record.type === 'virtual';
        return (
          <Space size="middle">
            {!isVirtual && (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  Edit
                </Button>
              </>
            )}
            {isVirtual && (
              <span style={{ color: '#999', fontSize: '12px' }}>Virtual repositories cannot be edited or deleted</span>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="github-project-management">
      <Card bordered={false} style={{ margin: "16px" }}>
        <Card type="inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text strong style={{ fontSize: 16 }}>Add New Github Repository </Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddRepoDrawer}>
              Add
            </Button>
          </div>
          <Form component={false}>
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              scroll={{ x: true }}
              rowKey="key"
            />
          </Form>
        </Card>
      </Card>

      <Drawer
        title={editingKey !== "" ? "Edit Github Repository" : "Add New Github Repository"}
        open={repoFormDrawerVisible}
        onClose={closeRepoFormDrawer}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="owner"
                label="GitHub Owner"
                rules={[{ required: true, message: "Please input GitHub Owner!" }]}
              >
                <Input placeholder="GitHub Owner" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="repo"
                label="GitHub Repo"
                rules={[{ required: true, message: "Please input GitHub Repo!" }]}
              >
                <Input placeholder="GitHub Repo" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: "Please select a type!" }]}
              >
                <Select placeholder="Select Type">
                  <Option value="API Canvas">API Canvas</Option>
                  <Option value="UI Canvas">UI Canvas</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div>
              {editingKey !== "" && (
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteFromRepoDrawer}>
                  Delete
                </Button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={closeRepoFormDrawer}>Cancel</Button>
            <Button type="primary" onClick={handleRepoFormSubmit}>
              {editingKey !== "" ? "Update" : "Add"}
            </Button>
            </div>
          </div>
        </Form>
      </Drawer>

      <Drawer
        title={`Manage Permissions - ${currentRepo?.repo || ""}`}
        width={720}
        onClose={closePermissionDrawer}
        visible={permissionDrawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
      >
        <AutoComplete
          style={{ width: "100%" }}
          value={searchValue}
          onChange={(value) => {
            handleSearch(value);
            setEmail(value);
          }}
          onSelect={handleSelect}
          placeholder="Search by name or email"
          options={searchResults.map(renderOption)}
          filterOption={filterOption}
        />
        <Select
          style={{ width: "100%", marginTop: 16 }}
          value={selectedRole}
          onChange={setSelectedRole}
          placeholder="Select role"
        >
          <Option value="admin">Admin</Option>
          <Option value="reviewer">Reviewer</Option>
          <Option value="commentor">Commentor</Option>
        </Select>
        <Button
          type="primary"
          block
          onClick={handleEnrollDeveloperSubmit}
          disabled={!email}
          style={{ marginTop: 16, marginBottom: 20 }}
        >
          Enroll User
        </Button>

        <Table
          columns={permissionsColumns}
          dataSource={classPermissions}
          loading={permissionsLoading}
          rowKey="userId"
          pagination={false}
        />
      </Drawer>

      <Modal
        title={`GHA Token - ${currentRepoForToken?.owner}/${currentRepoForToken?.repo}`}
        open={tokenModalVisible}
        onOk={handleSaveToken}
        onCancel={closeTokenModal}
        confirmLoading={tokenLoading}
        okText="Save"
        cancelText="Cancel"
        width={600}
      >
        <Form layout="vertical">
          <Form.Item
            label="GHA Token"
          >
            <Input.Password
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder="Enter GHA token"
              allowClear
            />
          </Form.Item>
          {currentRepoForToken?.gha_token && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Current token is set. Leave empty to remove the token.
            </Text>
          )}
        </Form>
      </Modal>

      <Modal
        title={`GitHub Collaborators - ${currentRepoForCollaborators?.owner}/${currentRepoForCollaborators?.repo}`}
        open={collaboratorsModalVisible}
        onCancel={closeCollaboratorsModal}
        footer={[
          <Button key="close" onClick={closeCollaboratorsModal}>
            Close
          </Button>
        ]}
        width={800}
      >
        {collaboratorsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">Loading collaborators...</Text>
          </div>
        ) : collaborators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">No collaborators found for this repository.</Text>
          </div>
        ) : (
          <Table
            dataSource={collaborators}
            rowKey={(record) => {
              // Use id, login, or node_id as unique key
              if (record.id) return String(record.id);
              if (record.login) return record.login;
              if (record.node_id) return record.node_id;
              return Math.random().toString();
            }}
            pagination={false}
            // pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "User",
                key: "user",
                render: (_, record: any) => {
                  // GitHub API returns: login, avatar_url, id, node_id, type, permissions
                  const login = record.login || record.username || 'Unknown';
                  const avatarUrl = record.avatar_url || record.avatarUrl;
                  
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar
                        src={avatarUrl}
                        style={{ backgroundColor: '#1677ff' }}
                      >
                        {login.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {login}
                        </div>
                        {(record.type || record.role) && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.type || record.role}
                          </Text>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                title: "Permissions",
                key: "permissions",
                render: (_, record: any) => {
                  // GitHub API returns permissions object with admin, push, pull
                  const permissions = record.permissions || {};
                  return (
                    <Space direction="vertical" size="small">
                      {permissions.admin && <Tag color="red">Admin</Tag>}
                      {permissions.push && <Tag color="green">Push</Tag>}
                      {permissions.pull && <Tag color="blue">Pull</Tag>}
                      {!permissions.admin && !permissions.push && !permissions.pull && (
                        <Tag>No permissions</Tag>
                      )}
                    </Space>
                  );
                },
              },
              {
                title: "Remove ",
                key: "remove",
                render: (_, record: any) => {
                  return (
                    <Button 
                      danger
                      onClick={() => handleRemoveCollaborator(record)}
                      type="primary"
                    >
                      Remove
                    </Button>
                  );
                }
              },  
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default SettingsGitHubProjectManagement;



