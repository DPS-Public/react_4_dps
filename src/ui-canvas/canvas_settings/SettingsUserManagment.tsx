import React from "react";
import {
  Button,
  Card,
  Space,
  Table,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Checkbox,
  Select,
  Tag,
  Empty,
  Alert,
  message,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  PlusOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  CopyOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  RoleDefinition,
  createModulePermission,
  getRoleConfigurableModules,
  getDefaultSystemRoles,
  mergeRolesWithSystemRoles,
} from "@/utils/projectPermissions";
import {
  ProjectUserInvitation,
  createProjectUserInvitation,
  deleteSystemAdminInvitation,
  listProjectAccessInvitations,
} from "@/services/systemAdminService";

import useUserManagment from "../user-managment/hooks/useUserManagment";
import ProjectStatistics from "../projects-canvas/ProjectStatistics";
import AddUserModal from "../projects-canvas/AddUserModal";
import SettingsUserPermissionItem from "./UserPermissionItem";

const { Text } = Typography;

function SettingsUserManagment() {
  const {
    loading,
    users,
    selectedProject,
    setSelectedProject,
    addUserModalVisible,
    setAddUserModalVisible,
    getProjectPermissions,
    getUserInfo,
    currentProject,
    user,
  } = useUserManagment();

  const moduleOptions = React.useMemo(() => getRoleConfigurableModules(), []);
  const systemRoles = React.useMemo<RoleDefinition[]>(
    () => getDefaultSystemRoles(),
    [],
  );

  const [roleModalOpen, setRoleModalOpen] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState(false);
  const [availableRoles, setAvailableRoles] =
    React.useState<RoleDefinition[]>(systemRoles);
  const [roleForm] = Form.useForm();
  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null);
  const [inviteMemberModalOpen, setInviteMemberModalOpen] =
    React.useState(false);
  const [invitingMember, setInvitingMember] = React.useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = React.useState("");
  const [projectInvitations, setProjectInvitations] = React.useState<
    ProjectUserInvitation[]
  >([]);
  const [loadingInvitations, setLoadingInvitations] = React.useState(false);
  const [deletingInvitationId, setDeletingInvitationId] = React.useState("");
  const [inviteMemberForm] = Form.useForm();

  const selectedProjectPermissions = selectedProject
    ? getProjectPermissions(selectedProject.id)
    : [];
  const currentUserPermission = selectedProjectPermissions.find(
    (perm: any) => perm.uid === user?.uid,
  );
  const isProjectOwner = Boolean(
    user?.uid &&
    (user.uid === selectedProject?.userId ||
      user.uid === currentProject?.userId),
  );
  const isCurrentUserAdmin =
    isProjectOwner ||
    currentUserPermission?.permission_type === "admin" ||
    currentUserPermission?.role_id === "admin";

  const loadProjectInvitations = React.useCallback(async () => {
    if (!selectedProject?.id) {
      setProjectInvitations([]);
      return;
    }

    try {
      setLoadingInvitations(true);
      const invitations = await listProjectAccessInvitations();
      setProjectInvitations(
        invitations.filter(
          (invitation) =>
            String(invitation.targetProjectId || "").trim() ===
            selectedProject.id,
        ),
      );
    } catch (error: any) {
      console.error("Failed to load project invitations:", error);
      message.error(error?.message || "Failed to load project invitations.");
    } finally {
      setLoadingInvitations(false);
    }
  }, [selectedProject?.id]);

  const formatDateTime = React.useCallback((value: any) => {
    if (!value) return "-";

    let date: Date | null = null;
    if (typeof value?.toDate === "function") {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string" || typeof value === "number") {
      date = new Date(value);
    }

    if (!date || Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  }, []);

  // ============================================
  // SELECBOX WIDTH HESABLANMASI (YENİ)
  // ============================================
  const selectBoxWidth = React.useMemo(() => {
    if (!availableRoles || availableRoles.length === 0) return 140;

    // Canvas ilə mətn genişliyini ölç
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 140;

    // Ant Design SelectBox-un default fontu
    context.font =
      '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial';

    // Ən uzun rol adını tap
    let maxTextWidth = 0;
    availableRoles.forEach((role) => {
      const textWidth = context.measureText(role.name || "").width;
      if (textWidth > maxTextWidth) {
        maxTextWidth = textWidth;
      }
    });

    // SelectBox padding: sol 12px + sağ 30px (ox işarəsi üçün)
    const totalWidth = Math.ceil(maxTextWidth + 42);

    // Minimum 120px, maksimum 300px
    return Math.min(300, Math.max(120, totalWidth));
  }, [availableRoles]);

  React.useEffect(() => {
    if (!selectedProject?.id) {
      setAvailableRoles(systemRoles);
      return;
    }

    const roleDocRef = doc(db, "project_roles", selectedProject.id);
    const unsubscribe = onSnapshot(roleDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAvailableRoles(systemRoles);
        return;
      }

      const data = snapshot.data() as any;
      setAvailableRoles(mergeRolesWithSystemRoles(data?.roles));
    });

    return () => unsubscribe();
  }, [selectedProject?.id, systemRoles]);

  React.useEffect(() => {
    void loadProjectInvitations();
  }, [loadProjectInvitations]);

  const syncModuleAccess = React.useCallback(
    (moduleId: string, checked: boolean) => {
      const currentCrud =
        roleForm.getFieldValue(["crudPermissions", moduleId]) || {};

      roleForm.setFieldsValue({
        crudPermissions: {
          ...(roleForm.getFieldValue("crudPermissions") || {}),
          [moduleId]: checked
            ? {
                read: currentCrud.read ?? true,
                write: currentCrud.write ?? true,
                update: currentCrud.update ?? true,
                delete: currentCrud.delete ?? true,
              }
            : {
                read: false,
                write: false,
                update: false,
                delete: false,
              },
        },
      });
    },
    [roleForm],
  );

  const openCreateRoleModal = React.useCallback(() => {
    setEditingRoleId(null);
    roleForm.resetFields();
    roleForm.setFieldsValue({ modules: [], crudPermissions: {} });
    setRoleModalOpen(true);
  }, [roleForm]);

  const openEditRoleModal = React.useCallback(
    (role: RoleDefinition) => {
      const moduleIds = Object.entries(role.permissions || {})
        .filter(([, permission]) => permission?.access)
        .map(([moduleId]) => moduleId);

      const crudPermissions = moduleIds.reduce(
        (acc: Record<string, any>, moduleId) => {
          const permission = role.permissions[moduleId];
          acc[moduleId] = {
            read: Boolean(permission?.read),
            write: Boolean(permission?.write),
            update: Boolean(permission?.update),
            delete: Boolean(permission?.delete),
          };
          return acc;
        },
        {},
      );

      setEditingRoleId(role.id);
      roleForm.setFieldsValue({
        roleName: role.name,
        modules: moduleIds,
        crudPermissions,
      });
      setRoleModalOpen(true);
    },
    [roleForm],
  );

  const persistRoles = React.useCallback(
    async (rolesToStore: RoleDefinition[]) => {
      if (!selectedProject?.id) return;

      const roleDocRef = doc(db, "project_roles", selectedProject.id);
      await setDoc(
        roleDocRef,
        {
          roles: rolesToStore,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || "",
        },
        { merge: true },
      );
    },
    [selectedProject?.id, user?.uid],
  );

  const handleCreateRole = async () => {
    if (!selectedProject?.id || !isCurrentUserAdmin) return;

    try {
      const values = await roleForm.validateFields();
      const roleName = String(values.roleName || "").trim();
      const selectedPermissions = Array.isArray(values.modules)
        ? values.modules
        : [];
      const crudPermissions = values.crudPermissions || {};
      const normalizedRoleId = roleName.toLowerCase().replace(/\s+/g, "-");

      if (!normalizedRoleId) {
        message.warning("Role name is required");
        return;
      }

      const exists = availableRoles.some(
        (role) =>
          role.id !== editingRoleId &&
          (role.id === normalizedRoleId ||
            role.name.toLowerCase() === roleName.toLowerCase()),
      );
      if (exists) {
        message.warning("A role with this name already exists");
        return;
      }

      const permissionsMap = selectedPermissions.reduce(
        (
          acc: Record<string, ReturnType<typeof createModulePermission>>,
          moduleId: string,
        ) => {
          const crud = crudPermissions[moduleId] || {};
          acc[moduleId] = createModulePermission(true, {
            read: Boolean(crud.read ?? true),
            write: Boolean(crud.write ?? true),
            update: Boolean(crud.update ?? true),
            delete: Boolean(crud.delete ?? true),
          });
          return acc;
        },
        {},
      );

      const rolePayload: RoleDefinition = {
        id: normalizedRoleId,
        name: roleName,
        permissions: permissionsMap,
        isSystem: false,
      };

      setSavingRole(true);
      const customRoles = availableRoles.filter(
        (role) => !role.isSystem && role.id !== editingRoleId,
      );
      await persistRoles([...customRoles, rolePayload]);

      message.success(
        editingRoleId
          ? "Role updated successfully"
          : "Role created successfully",
      );
      roleForm.resetFields();
      setRoleModalOpen(false);
      setEditingRoleId(null);
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to create role:", error);
      message.error("Failed to create role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!selectedProject?.id || !isCurrentUserAdmin) return;

    const assignedUsers = selectedProjectPermissions.filter(
      (permission: any) => permission.role_id === roleId,
    );
    if (assignedUsers.length > 0) {
      message.warning(
        "Please move users to another role before deleting this role",
      );
      return;
    }

    try {
      setSavingRole(true);
      const customRoles = availableRoles.filter(
        (role) => !role.isSystem && role.id !== roleId,
      );
      await persistRoles(customRoles);
      message.success("Role deleted successfully");
    } catch (error) {
      console.error("Failed to delete role:", error);
      message.error("Failed to delete role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedProject?.id || !isCurrentUserAdmin) return;

    try {
      const values = await inviteMemberForm.validateFields();
      const selectedRole = availableRoles.find(
        (role) => role.id === values.roleId,
      );

      setInvitingMember(true);
      const createdInvitation = await createProjectUserInvitation({
        email: values.email,
        invitedByEmail: user?.email || "",
        invitedByName: user?.displayName || "",
        targetProjectId: selectedProject.id,
        targetProjectName: selectedProject.name,
        targetRoleId: values.roleId,
        targetRoleName: selectedRole?.name || values.roleId,
      });

      setLatestInviteUrl(createdInvitation.inviteUrl);
      setProjectInvitations((current) => [createdInvitation, ...current]);
      message.success("Project join invitation created.");
      inviteMemberForm.resetFields();
      setInviteMemberModalOpen(false);
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to invite project member:", error);
      message.error(error?.message || "Failed to invite member.");
    } finally {
      setInvitingMember(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      setDeletingInvitationId(invitationId);
      await deleteSystemAdminInvitation(invitationId);
      setProjectInvitations((current) =>
        current.filter((item) => item.id !== invitationId),
      );
      message.success("Invitation deleted.");
    } catch (error: any) {
      console.error("Failed to delete invitation:", error);
      message.error(error?.message || "Failed to delete invitation.");
    } finally {
      setDeletingInvitationId("");
    }
  };

  const invitationColumns = React.useMemo(
    () => [
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        render: (value: string) => value || "-",
      },
      {
        title: "Role",
        key: "roleName",
        render: (_: unknown, record: ProjectUserInvitation) =>
          record.targetRoleName || record.targetRoleId || "Project Member",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (value: string) => {
          const normalized = String(value || "").toLowerCase();
          const color =
            normalized === "accepted"
              ? "green"
              : normalized === "pending"
                ? "gold"
                : "default";

          return <Tag color={color}>{normalized || "unknown"}</Tag>;
        },
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (value: any) => formatDateTime(value),
      },
      {
        title: "Accepted",
        dataIndex: "acceptedAt",
        key: "acceptedAt",
        render: (value: any) => formatDateTime(value),
      },
      {
        title: "Action",
        key: "action",
        render: (_: unknown, record: ProjectUserInvitation) => (
          <Space wrap>
            <Tooltip title="Open invitation link">
              <Button
                icon={<LinkOutlined />}
                onClick={() => window.open(record.inviteUrl, "_blank")}
              />
            </Tooltip>
            <Tooltip title="Copy invitation link">
              <Button
                icon={<CopyOutlined />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(record.inviteUrl);
                    message.success("Invitation URL copied.");
                  } catch (error) {
                    message.error("Copy failed.");
                  }
                }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete this invitation?"
              description="The invite link will stop being usable."
              onConfirm={() => handleDeleteInvitation(record.id)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deletingInvitationId === record.id}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletingInvitationId, formatDateTime],
  );

  const staticRoles = availableRoles.filter((role) => role.isSystem);
  const customRoles = availableRoles.filter((role) => !role.isSystem);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isCurrentUserAdmin) {
    return (
      <Alert
        type="error"
        showIcon
        message="Access denied"
        description="Only admins can access User Management and Role Management settings."
      />
    );
  }

  return (
    <div>
      {selectedProject ? (
        <>
          <ProjectStatistics
            selectedProject={selectedProject}
            getProjectPermissions={getProjectPermissions}
            availableRoles={availableRoles}
          />

          <Card
            title={
              <Row
                justify="space-between"
                align="middle"
                style={{ width: "100%" }}
              >
                <Col>
                  <Space>
                    <UserOutlined />
                    <span>
                      Team Members (
                      {getProjectPermissions(selectedProject.id).length})
                    </span>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <Button
                      icon={<MailOutlined />}
                      onClick={() => setInviteMemberModalOpen(true)}
                      size="small"
                    >
                      Invite Member
                    </Button>
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => setAddUserModalVisible(true)}
                      size="small"
                    >
                      Add Member
                    </Button>
                  </Space>
                </Col>
              </Row>
            }
            styles={{
              body: {
                padding: 0,
              },
            }}
          >
            {getProjectPermissions(selectedProject.id).length > 0 ? (
              <div style={{ padding: "24px" }}>
                {/* // SettingsUserManagment.tsx içində - sadəcə bunu çağırın: */}
                {getProjectPermissions(selectedProject.id).map(
                  (permission, index) => (
                    <SettingsUserPermissionItem
                      key={index}
                      permission={permission}
                      selectedProject={selectedProject}
                      getUserInfo={getUserInfo}
                      user={user}
                      currentUserPermission={
                        currentUserPermission?.permission_type || ""
                      }
                      currentUserIsAdmin={isCurrentUserAdmin}
                      availableRoles={availableRoles}
                      // selectWidth PROP-U SİLİNDİ - ehtiyac yoxdur
                    />
                  ),
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#bfbfbf",
                }}
              >
                <TeamOutlined
                  style={{ fontSize: "48px", marginBottom: "16px" }}
                />
                <div>No team members yet</div>
                <Text type="secondary">
                  Add members to collaborate on this project
                </Text>
                <div style={{ marginTop: "16px" }}>
                  <Space wrap>
                    <Button
                      icon={<MailOutlined />}
                      onClick={() => setInviteMemberModalOpen(true)}
                    >
                      Invite First Member
                    </Button>
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => setAddUserModalVisible(true)}
                    >
                      Add First Member
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Card>

          {/* Add User Modal */}
          <AddUserModal
            visible={addUserModalVisible}
            setVisible={setAddUserModalVisible}
            selectedProject={selectedProject}
            users={users.filter((u) => u.uid !== user?.uid)}
            getProjectPermissions={getProjectPermissions}
            user={user}
            availableRoles={availableRoles}
          />

          <Modal
            title={
              <Space>
                <MailOutlined />
                <span>Invite User to Join Project</span>
              </Space>
            }
            open={inviteMemberModalOpen}
            onCancel={() => setInviteMemberModalOpen(false)}
            onOk={handleInviteMember}
            confirmLoading={invitingMember}
            okText="Create Invitation"
            destroyOnClose
          >
            <Form form={inviteMemberForm} layout="vertical">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input placeholder="new-member@company.com" />
              </Form.Item>

              <Form.Item
                label="Role"
                name="roleId"
                rules={[{ required: true, message: "Please select role" }]}
              >
                <Select
                  placeholder="Select role"
                  options={availableRoles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />
              </Form.Item>

              <Alert
                type="info"
                showIcon
                message="Invitation behavior"
                description={`The invited user will register through a secure link and then be added to ${selectedProject.name}.`}
              />
            </Form>
          </Modal>

          {latestInviteUrl ? (
            <Alert
              type="success"
              showIcon
              style={{ marginTop: 16 }}
              message="Latest project member invitation"
              description={
                <Space direction="vertical" size={8}>
                  <a href={latestInviteUrl} target="_blank" rel="noreferrer">
                    {latestInviteUrl}
                  </a>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(latestInviteUrl);
                        message.success("Invitation URL copied.");
                      } catch (error) {
                        message.error("Copy failed.");
                      }
                    }}
                  >
                    Copy Link
                  </Button>
                </Space>
              }
            />
          ) : null}

          <Card
            style={{ marginTop: 24 }}
            title={
              <Space>
                <MailOutlined />
                <span>Project Invitations</span>
              </Space>
            }
            extra={
              <Text type="secondary">
                {projectInvitations.length} invitation
                {projectInvitations.length !== 1 ? "s" : ""}
              </Text>
            }
          >
            <Table
              rowKey="id"
              loading={loadingInvitations}
              columns={invitationColumns}
              dataSource={projectInvitations}
              pagination={false}
              locale={{
                emptyText: "No invitations sent for this project yet",
              }}
              scroll={{ x: 900 }}
            />
          </Card>

          <Card style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={10}>
                <Text strong>System Role</Text>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {staticRoles.length > 0 ? (
                    <Tag color="red">{staticRoles[0].name}</Tag>
                  ) : (
                    <Text type="secondary">No system roles</Text>
                  )}
                </div>
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 8, fontSize: 12 }}
                >
                  Admin has full access to all modules
                </Text>
              </Col>
              <Col xs={24} lg={14}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text strong>Custom Roles</Text>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreateRoleModal}
                  >
                    Create New Role
                  </Button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  {customRoles.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No custom roles yet"
                    />
                  ) : (
                    customRoles.map((role) => {
                      const assignedCount = selectedProjectPermissions.filter(
                        (permission: any) => permission.role_id === role.id,
                      ).length;

                      return (
                        <Card
                          key={role.id}
                          size="small"
                          title={role.name}
                          extra={
                            <Tag>
                              {assignedCount} user
                              {assignedCount !== 1 ? "s" : ""}
                            </Tag>
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                            }}
                          >
                            <Text type="secondary">
                              {Object.keys(role.permissions || {}).length}{" "}
                              module access configured
                            </Text>
                            <Space>
                              <Button
                                icon={<EditOutlined />}
                                onClick={() => openEditRoleModal(role)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                title="Delete this role?"
                                description="Users assigned to this role must be moved first."
                                onConfirm={() => handleDeleteRole(role.id)}
                                okText="Delete"
                                cancelText="Cancel"
                              >
                                <Button danger icon={<DeleteOutlined />}>
                                  Delete
                                </Button>
                              </Popconfirm>
                            </Space>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </Col>
            </Row>
          </Card>

          <Modal
            title={
              <Space>
                <CrownOutlined />
                <span>{editingRoleId ? "Update Role" : "Create New Role"}</span>
              </Space>
            }
            open={roleModalOpen}
            onCancel={() => {
              setRoleModalOpen(false);
              roleForm.resetFields();
              setEditingRoleId(null);
            }}
            onOk={handleCreateRole}
            confirmLoading={savingRole}
            okText={editingRoleId ? "Update Role" : "Create Role"}
            destroyOnClose
            width={920}
          >
            <div style={{ marginBottom: 12 }}>
              <Text strong>Existing Roles</Text>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {availableRoles.length > 0 ? (
                  availableRoles.map((role) => (
                    <Tag
                      key={role.id}
                      color={role.id === "admin" ? "red" : "blue"}
                    >
                      {role.name}
                    </Tag>
                  ))
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No roles found"
                  />
                )}
              </div>
            </div>

            <Form
              form={roleForm}
              layout="vertical"
              initialValues={{ modules: [], crudPermissions: {} }}
            >
              <Form.Item
                name="roleName"
                label="Role Name"
                rules={[{ required: true, message: "Please enter role name" }]}
              >
                <Input placeholder="Example: QA Manager" />
              </Form.Item>

              <Form.Item
                name="modules"
                label="Permissions (Modules)"
                rules={[
                  {
                    required: true,
                    message: "Select at least one module access",
                  },
                ]}
              >
                <Checkbox.Group style={{ width: "100%" }}>
                  <Row gutter={[8, 8]}>
                    {moduleOptions.map((moduleItem: any) => (
                      <Col key={moduleItem.id} span={12}>
                        <Checkbox
                          value={moduleItem.id}
                          onChange={(event) =>
                            syncModuleAccess(
                              moduleItem.id,
                              event.target.checked,
                            )
                          }
                        >
                          {moduleItem.name}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </Form.Item>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="User Management is reserved for admins only."
              />
            </Form>
          </Modal>
        </>
      ) : (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "#bfbfbf",
          }}
        >
          <TeamOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
          <div>No project selected</div>
          <Text type="secondary">Please select a project to manage users</Text>
        </div>
      )}
    </div>
  );
}

export default SettingsUserManagment;
