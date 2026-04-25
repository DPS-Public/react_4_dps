import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/auth/AuthContext";
import {
  addSystemAdminDirectly,
  addProjectUserDirectly,
  createProjectUserInvitation,
  deleteProjectUser,
  createSystemAdminInvitation,
  deleteSystemAdmin,
  deleteSystemAdminInvitation,
  listProjectUserInvitations,
  listProjectUsers,
  listSystemAdminCandidates,
  listSystemAdminInvitations,
  listSystemAdmins,
  ProjectUserInvitation,
  ProjectUserAccessRecord,
  SystemAdminCandidate,
  SystemAdminInvitation,
  SystemAdminRecord,
} from "@/services/systemAdminService";

const { Title, Text } = Typography;

const formatDateTime = (value: any) => {
  const rawDate =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : value
          ? new Date(value)
          : null;

  if (!rawDate || Number.isNaN(rawDate.getTime())) {
    return "-";
  }

  return rawDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeEmail = (value?: string | null) => String(value || "").trim().toLowerCase();

const renderUserIdentity = (displayName?: string, email?: string, photoURL?: string) => (
  <Space size={10}>
    <Avatar src={photoURL} icon={<UserOutlined />}>
      {String(displayName || email || "U").trim().charAt(0).toUpperCase()}
    </Avatar>
    <Text>{displayName || "-"}</Text>
  </Space>
);

export default function SystemSettingsPage() {
  const { userProfile } = useAuth();
  const [addForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [admins, setAdmins] = useState<SystemAdminRecord[]>([]);
  const [candidates, setCandidates] = useState<SystemAdminCandidate[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUserAccessRecord[]>([]);
  const [projectInvitations, setProjectInvitations] = useState<ProjectUserInvitation[]>([]);
  const [invitations, setInvitations] = useState<SystemAdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingProjectUserAdd, setSubmittingProjectUserAdd] = useState(false);
  const [submittingProjectInvite, setSubmittingProjectInvite] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string>("");
  const [deletingProjectUserUid, setDeletingProjectUserUid] = useState<string>("");
  const [deletingInvitationId, setDeletingInvitationId] = useState<string>("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [latestProjectInviteUrl, setLatestProjectInviteUrl] = useState("");
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [projectUserDrawerOpen, setProjectUserDrawerOpen] = useState(false);
  const [projectUserForm] = Form.useForm();
  const [projectInviteForm] = Form.useForm();

  const envSystemAdminEmail = normalizeEmail(import.meta.env.VITE_SYSTEM_ADMIN_EMAIL);
  const currentUserEmail = normalizeEmail(userProfile?.email);

  const loadData = async (options?: { silentInvitationError?: boolean }) => {
    setLoading(true);
    try {
      const [adminResult, invitationResult, projectInvitationResult] = await Promise.allSettled([
        listSystemAdmins(),
        listSystemAdminInvitations(),
        listProjectUserInvitations(),
      ]);
      const projectUserResult = await Promise.allSettled([listProjectUsers()]);

      if (adminResult.status === "fulfilled") {
        setAdmins(adminResult.value);
      } else {
        console.error("Failed to load system admins:", adminResult.reason);
        message.error("Failed to load system admin list.");
      }

      if (invitationResult.status === "fulfilled") {
        setInvitations(invitationResult.value);
      } else {
        console.error("Failed to load system admin invitations:", invitationResult.reason);
        if (!options?.silentInvitationError) {
          message.warning("System admin list loaded, but invitations could not be loaded.");
        }
      }

      if (projectInvitationResult.status === "fulfilled") {
        setProjectInvitations(projectInvitationResult.value);
      } else {
        console.error("Failed to load project user invitations:", projectInvitationResult.reason);
        if (!options?.silentInvitationError) {
          message.warning("Project user invitations could not be loaded.");
        }
      }

      if (projectUserResult[0].status === "fulfilled") {
        setProjectUsers(projectUserResult[0].value);
      } else {
        console.error("Failed to load project users:", projectUserResult[0].reason);
        message.warning("Project users could not be loaded. Check Firestore rules for project_admins.");
      }
    } catch (error) {
      console.error("Failed to load system settings data:", error);
      message.error("Failed to load system admin settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const pendingInvitations = useMemo(
    () => invitations.filter((item) => item.status === "pending"),
    [invitations]
  );

  const pendingProjectInvitations = useMemo(
    () => projectInvitations.filter((item) => item.status === "pending"),
    [projectInvitations]
  );

  const availableCandidates = useMemo(() => {
    const adminEmailSet = new Set(admins.map((item) => normalizeEmail(item.email)));

    return candidates.filter((item) => !adminEmailSet.has(normalizeEmail(item.email)));
  }, [admins, candidates]);

  const availableProjectUserCandidates = useMemo(() => {
    const projectUserUidSet = new Set(projectUsers.map((item) => String(item.uid || item.id || "").trim()));

    return candidates.filter((item) => !projectUserUidSet.has(String(item.uid || item.id || "").trim()));
  }, [candidates, projectUsers]);

  const adminColumns: ColumnsType<SystemAdminRecord> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (value: string | undefined, record) =>
        renderUserIdentity(value, record.email, (record as any).photoURL),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (value?: string, record) => (
        <Tag color={normalizeEmail(record.email) === envSystemAdminEmail ? "gold" : "blue"}>
          {normalizeEmail(record.email) === envSystemAdminEmail ? "env" : value || "manual"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value?: string) => <Tag color="green">{value || "active"}</Tag>,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: any) => formatDateTime(value),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_, record) => {
        const normalizedRecordEmail = normalizeEmail(record.email);
        const isEnvAdmin = normalizedRecordEmail === envSystemAdminEmail;
        const isCurrentUser = normalizedRecordEmail === currentUserEmail;

        if (isEnvAdmin) {
          return <Tag color="gold">Protected env admin</Tag>;
        }

        return (
          <Popconfirm
            title="Delete system admin?"
            description="This removes the user from the system_admins collection."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteAdmin(record.email)}
            disabled={isCurrentUser}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deletingEmail === record.email}
              disabled={isCurrentUser}
            >
              {isCurrentUser ? "Current user" : "Delete"}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  const invitationColumns: ColumnsType<SystemAdminInvitation> = [
    {
      title: "Invitee Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={value === "accepted" ? "green" : value === "revoked" ? "red" : "blue"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Invited By",
      key: "invitedBy",
      render: (_, record) => record.invitedByName || record.invitedByEmail || "-",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: any) => formatDateTime(value),
    },
    {
      title: "Invitation URL",
      dataIndex: "inviteUrl",
      key: "inviteUrl",
      render: (value: string) => (
        <Space size={8} wrap>
          <a href={value} target="_blank" rel="noreferrer">
            Open URL
          </a>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => copyText(value, "Invitation URL copied.")}
          >
            Copy
          </Button>
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Popconfirm
          title="Delete invitation?"
          description="This invitation link will stop working."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteInvitation(record.id)}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deletingInvitationId === record.id}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const projectInvitationColumns: ColumnsType<ProjectUserInvitation> = [
    {
      title: "Invitee Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={value === "accepted" ? "green" : value === "revoked" ? "red" : "blue"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Invited By",
      key: "invitedBy",
      render: (_, record) => record.invitedByName || record.invitedByEmail || "-",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: any) => formatDateTime(value),
    },
    {
      title: "Invitation URL",
      dataIndex: "inviteUrl",
      key: "inviteUrl",
      render: (value: string) => (
        <Space size={8} wrap>
          <a href={value} target="_blank" rel="noreferrer">
            Open URL
          </a>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => copyText(value, "Project invitation URL copied.")}
          >
            Copy
          </Button>
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Popconfirm
          title="Delete invitation?"
          description="This invitation link will stop working."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteInvitation(record.id)}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deletingInvitationId === record.id}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const projectUserColumns: ColumnsType<ProjectUserAccessRecord> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (value: string | undefined, record) =>
        renderUserIdentity(value, record.email, record.photoURL),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value?: string) => <Tag color="blue">{value || "active"}</Tag>,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: any) => formatDateTime(value),
    },
    {
      title: "Action",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Popconfirm
          title="Delete project user?"
          description="This removes project creation access for this user."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteProjectUser(record.uid || record.id)}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deletingProjectUserUid === (record.uid || record.id)}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const loadCandidates = async () => {
    try {
      const userList = await listSystemAdminCandidates();
      setCandidates(userList);
    } catch (error) {
      console.error("Failed to load system admin candidates:", error);
      message.error("Failed to load users from collection.");
    }
  };

  const openAddDrawer = async () => {
    setAddDrawerOpen(true);
    if (!candidates.length) {
      await loadCandidates();
    }
  };

  const openProjectUserDrawer = async () => {
    setProjectUserDrawerOpen(true);
    if (!candidates.length) {
      await loadCandidates();
    }
  };

  const handleAddAdmin = async (values: { email: string }) => {
    setSubmittingAdd(true);
    try {
      const selectedCandidate = candidates.find((item) => normalizeEmail(item.email) === normalizeEmail(values.email));

      await addSystemAdminDirectly({
        email: values.email,
        displayName: selectedCandidate?.displayName || "",
        uid: selectedCandidate?.uid || "",
        photoURL: selectedCandidate?.photoURL || "",
        addedByEmail: currentUserEmail,
        addedByName: userProfile?.displayName || "",
      });

      message.success("System admin added.");
      addForm.resetFields();
      setAddDrawerOpen(false);
      await loadData();
    } catch (error: any) {
      console.error("Failed to add system admin:", error);
      message.error(error?.message || "Failed to add system admin.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleInviteAdmin = async (values: { email: string }) => {
    setSubmittingInvite(true);
    try {
      const createdInvitation = await createSystemAdminInvitation({
        email: values.email,
        invitedByEmail: currentUserEmail,
        invitedByName: userProfile?.displayName || "",
      });

      setLatestInviteUrl(createdInvitation.inviteUrl);
      setInvitations((prev) => [
        {
          id: createdInvitation.id,
          email: createdInvitation.email,
          inviteUrl: createdInvitation.inviteUrl,
          invitedByEmail: createdInvitation.invitedByEmail,
          invitedByName: createdInvitation.invitedByName,
          role: "system_admin",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...prev.filter((item) => item.id !== createdInvitation.id),
      ]);
      message.success("System admin invitation created and queued for email.");
      inviteForm.resetFields();
      await loadData({ silentInvitationError: true });
    } catch (error: any) {
      console.error("Failed to invite system admin:", error);
      message.error(error?.message || "Failed to invite system admin.");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleInviteProjectUser = async (values: { email: string }) => {
    setSubmittingProjectInvite(true);
    try {
      const createdInvitation = await createProjectUserInvitation({
        email: values.email,
        invitedByEmail: currentUserEmail,
        invitedByName: userProfile?.displayName || "",
      });

      setLatestProjectInviteUrl(createdInvitation.inviteUrl);
      setProjectInvitations((prev) => [
        {
          id: createdInvitation.id,
          email: createdInvitation.email,
          inviteUrl: createdInvitation.inviteUrl,
          invitedByEmail: createdInvitation.invitedByEmail,
          invitedByName: createdInvitation.invitedByName,
          role: "project_user",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...prev.filter((item) => item.id !== createdInvitation.id),
      ]);
      message.success("Project user invitation created and queued for email.");
      projectInviteForm.resetFields();
      await loadData({ silentInvitationError: true });
    } catch (error: any) {
      console.error("Failed to invite project user:", error);
      message.error(error?.message || "Failed to invite project user.");
    } finally {
      setSubmittingProjectInvite(false);
    }
  };

  const handleAddProjectUser = async (values: { email: string }) => {
    setSubmittingProjectUserAdd(true);
    try {
      const selectedCandidate = candidates.find((item) => normalizeEmail(item.email) === normalizeEmail(values.email));

      if (!selectedCandidate?.uid) {
        throw new Error("Please select a valid user from the users collection.");
      }

      await addProjectUserDirectly({
        email: selectedCandidate.email,
        displayName: selectedCandidate.displayName || "",
        uid: selectedCandidate.uid,
        photoURL: selectedCandidate.photoURL || "",
        addedByEmail: currentUserEmail,
        addedByName: userProfile?.displayName || "",
      });

      message.success("Project user access granted.");
      projectUserForm.resetFields();
      setProjectUserDrawerOpen(false);
      await loadData({ silentInvitationError: true });
    } catch (error: any) {
      console.error("Failed to add project user:", error);
      message.error(error?.message || "Failed to add project user.");
    } finally {
      setSubmittingProjectUserAdd(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    setDeletingEmail(email);
    try {
      await deleteSystemAdmin(email);
      message.success("System admin deleted.");
      await loadData();
    } catch (error: any) {
      console.error("Failed to delete system admin:", error);
      message.error(error?.message || "Failed to delete system admin.");
    } finally {
      setDeletingEmail("");
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    setDeletingInvitationId(invitationId);
    try {
      await deleteSystemAdminInvitation(invitationId);
      setInvitations((prev) => prev.filter((item) => item.id !== invitationId));
      setProjectInvitations((prev) => prev.filter((item) => item.id !== invitationId));
      message.success("Invitation deleted.");
      await loadData({ silentInvitationError: true });
    } catch (error: any) {
      console.error("Failed to delete system admin invitation:", error);
      message.error(error?.message || "Failed to delete invitation.");
    } finally {
      setDeletingInvitationId("");
    }
  };

  const handleDeleteProjectUser = async (uid: string) => {
    setDeletingProjectUserUid(uid);
    try {
      await deleteProjectUser(uid);
      message.success("Project user access removed.");
      await loadData({ silentInvitationError: true });
    } catch (error: any) {
      console.error("Failed to delete project user:", error);
      message.error(error?.message || "Failed to delete project user.");
    } finally {
      setDeletingProjectUserUid("");
    }
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(successMessage);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      message.error("Copy failed.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] px-6 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card
          bordered={false}
          style={{ borderRadius: 24 }}
          bodyStyle={{ padding: 28 }}
        >
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <Space align="center" size={12}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(14,165,233,0.12))",
                }}
              >
                <SafetyCertificateOutlined style={{ fontSize: 26, color: "#2563eb" }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  System Settings
                </Title>
                <Text type="secondary">
                  Manage system admins, project users, invitation links, and registration access.
                </Text>
              </div>
            </Space>

            <Alert
              type="info"
              showIcon
              message="Admin and project user registration flows"
              description="Invitations are stored in `temporary_invitations`. Accepted project user registrations keep `project_users` records and project creation access is stored in `project_admins`."
              style={{ marginTop: 12, borderRadius: 16 }}
            />
          </Space>
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Card title="Project User Access" bordered={false} style={{ borderRadius: 24 }}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Text type="secondary">
                  Only system admins can grant project creation access. Users added here get active `project_admins` records.
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={openProjectUserDrawer}>
                  Add Project User
                </Button>
                <Statistic title="Total Project Users" value={projectUsers.length} prefix={<TeamOutlined />} />
              </Space>
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Project User List" bordered={false} style={{ borderRadius: 24 }}>
              <Table
                rowKey={(record) => record.uid || record.email || record.id}
                columns={projectUserColumns}
                dataSource={projectUsers}
                pagination={false}
                loading={loading}
                locale={{ emptyText: "No project users yet." }}
              />
            </Card>
          </Col>
        </Row>

        <Drawer
          title="Add Project User"
          open={projectUserDrawerOpen}
          onClose={() => setProjectUserDrawerOpen(false)}
          width={420}
          destroyOnClose
        >
          <Form form={projectUserForm} layout="vertical" onFinish={handleAddProjectUser}>
            <Form.Item
              name="email"
              label="User"
              rules={[{ required: true, message: "Please select a user from users collection." }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select user"
                options={availableProjectUserCandidates.map((item) => ({
                  value: item.email,
                  label: `${item.displayName || item.email} (${item.email})`,
                }))}
              />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={submittingProjectUserAdd} icon={<UserAddOutlined />}>
              Grant Project Access 
            </Button>
          </Form>
        </Drawer>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ borderRadius: 20 }}>
              <Statistic title="Total System Admins" value={admins.length} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ borderRadius: 20 }}>
                <Statistic
                  title="Pending Invitations"
                  value={pendingInvitations.length + pendingProjectInvitations.length}
                  prefix={<MailOutlined />}
                />
              </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ borderRadius: 20 }}>
              <Statistic
                title="Env System Admin"
                value={envSystemAdminEmail || "-"}
                valueStyle={{ fontSize: 18 }}
                prefix={<LinkOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title="Add System Admin"
              bordered={false}
              style={{ borderRadius: 20, height: "100%" }}
            >
              <Space direction="vertical" size={12}>
                <Text type="secondary">
                  Choose an existing user from the `users` collection and promote them to system admin.
                </Text>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={() => void openAddDrawer()}
                >
                   Add System Admin 
                </Button>
              </Space>
            </Card>
          </Col>

        </Row>

        <Card
          title="System Admin List"
          bordered={false}
          style={{ borderRadius: 20 }}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={admins}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 960 }}
            columns={adminColumns}
          />
        </Card>

      </div>

      <Drawer
        title="Add System Admin"
        open={addDrawerOpen}
        onClose={() => {
          setAddDrawerOpen(false);
          addForm.resetFields();
        }}
        width={520}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddAdmin}>
          <Form.Item
            label="Select user"
            name="email"
            rules={[{ required: true, message: "Please select a user from users collection." }]}
          >
            <Select
              size="large"
              showSearch
              placeholder="Search user by name or email"
              optionFilterProp="searchLabel"
              loading={loading && !candidates.length}
              options={availableCandidates.map((item) => ({
                value: item.email,
                searchLabel: `${item.displayName || ""} ${item.email}`.toLowerCase(),
                label: (
                  <Space align="start" style={{ width: "100%" }}>
                    <Avatar
                      src={item.photoURL || undefined}
                      size="small"
                      icon={<UserOutlined />}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {item.displayName || item.email}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{item.email}</div>
                    </div>
                  </Space>
                ),
              }))}
              notFoundContent={
                availableCandidates.length
                  ? "No matching users"
                  : "No available users to promote"
              }
            />
          </Form.Item>

          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setAddDrawerOpen(false);
                addForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<PlusOutlined />}
              loading={submittingAdd}
            >
              Add System Admin
            </Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}
