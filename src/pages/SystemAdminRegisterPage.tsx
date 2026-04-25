import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Divider, Form, Input, Result, Space, Spin, Typography, message } from "antd";
import { GoogleOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/auth/AuthContext";
import LogoImage from "@/assets/images/Logo.svg";
import {
  getSystemAdminInvitation,
  registerSystemAdminFromGoogleInvitation,
  registerSystemAdminFromInvitation,
  SystemAdminInvitation,
} from "@/services/systemAdminService";

const { Title, Text } = Typography;

export default function SystemAdminRegisterPage() {
  const { invitationId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [invitation, setInvitation] = useState<SystemAdminInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const normalizeEmail = (value?: string | null) => String(value || "").trim().toLowerCase();

  const toReadableRegisterError = (error: any) => {
    switch (error?.code) {
      case "auth/email-already-in-use":
        return "This email already exists in authentication. If this is your account, enter the same password to complete the missing registration records.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "This email already exists in authentication, but the password does not match. Please use the correct password for that account.";
      case "auth/weak-password":
        return "Password is too weak. Please choose a stronger password.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled before completion.";
      case "auth/popup-blocked":
        return "Google sign-in popup was blocked by the browser.";
      default:
        return error?.message || "Registration failed.";
    }
  };

  useEffect(() => {
    const loadInvitation = async () => {
      setLoading(true);
      try {
        const resolvedInvitation = await getSystemAdminInvitation(invitationId);
        setInvitation(resolvedInvitation);
      } catch (error) {
        console.error("Failed to load system admin invitation:", error);
        message.error("Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    };

    void loadInvitation();
  }, [invitationId]);

  const invitationError = useMemo(() => {
    if (!invitationId) {
      return "Invitation key is missing.";
    }

    if (!invitation) {
      return "Invitation not found.";
    }

    if (invitation.status !== "pending") {
      return "This invitation is no longer active.";
    }

    return "";
  }, [invitation, invitationId]);

  const sessionEmailMatchesInvitation = useMemo(() => {
    return normalizeEmail(user?.email) !== "" && normalizeEmail(user?.email) === normalizeEmail(invitation?.email);
  }, [invitation?.email, user?.email]);

  const handleRegister = async (values: {
    displayName: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match.");
      return;
    }

    if (values.password.length < 6) {
      message.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await registerSystemAdminFromInvitation({
        invitationId,
        displayName: values.displayName,
        password: values.password,
      });

      message.success("System admin registration completed.");
      navigate("/system-settings", { replace: true });
    } catch (error: any) {
      console.error("Failed to register system admin:", error);
      message.error(toReadableRegisterError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWithGoogle = async () => {
    setSubmitting(true);
    try {
      await registerSystemAdminFromGoogleInvitation({
        invitationId,
        displayName: form.getFieldValue("displayName"),
      });

      message.success("System admin registration completed with Google.");
      navigate("/system-settings", { replace: true });
    } catch (error: any) {
      console.error("Failed to register system admin with Google:", error);
      message.error(toReadableRegisterError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 px-4 py-8"
        style={{ minHeight: "100vh", height: "100vh", overflowY: "auto", overflowX: "hidden" }}
      >
        <Space direction="vertical" align="center" size={16}>
          <Spin size="large" />
          <Text type="secondary">Loading system admin invitation...</Text>
        </Space>
      </div>
    );
  }

  if (invitationError) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 px-4 py-8"
        style={{ minHeight: "100vh", height: "100vh", overflowY: "auto", overflowX: "hidden" }}
      >
        <Card bordered={false} style={{ width: "100%", maxWidth: 680, borderRadius: 28 }}>
          <Result
            status="warning"
            title="System admin invitation"
            subTitle={invitationError}
            extra={[
              <Link key="login" to="/login">
                <Button type="primary">Go to login</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex items-start justify-center bg-slate-50 px-4 py-10"
      style={{ minHeight: "100vh", height: "100vh", overflowY: "auto", overflowX: "hidden" }}
    >
      <Card
        bordered={false}
        style={{ width: "100%", maxWidth: 760, borderRadius: 28 }}
        bodyStyle={{ padding: 32 }}
      >
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <img
              src={LogoImage}
              alt="DPS Logo"
              style={{
                width: 108,
                height: 108,
                objectFit: "contain",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#000",
                  letterSpacing: "-0.04em",
                }}
              >
                DPS
              </div>
              <div
                style={{
                  fontSize: 20,
                  lineHeight: 1.2,
                  color: "#194DD8",
                  marginTop: 6,
                }}
              >
                Digital Product Summary
              </div>
            </div>
          </div>

          <Space align="center" size={14}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(14,165,233,0.12))",
              }}
            >
              <SafetyCertificateOutlined style={{ fontSize: 28, color: "#2563eb" }} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                System Admin Registration
              </Title>
              <Text type="secondary">
                Complete your registration using the invitation created in System Settings.
              </Text>
            </div>
          </Space>

          <Alert
            type="info"
            showIcon
            message="Invitation email"
            description={
              <Space direction="vertical" size={4}>
                <Text>{invitation?.email}</Text>
                <Text type="secondary">
                  You can also continue with Google if you sign in using this exact email address.
                </Text>
              </Space>
            }
            style={{ borderRadius: 14 }}
          />

          <Card
            bordered={false}
            style={{ background: "#f8fbff", borderRadius: 18 }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ display: "block" }}>
                  Google sign-in option
                </Text>
                <Text type="secondary">
                  If your invited company email is hosted on Google, you can complete registration with Google sign-in.
                </Text>
              </div>

              {sessionEmailMatchesInvitation ? (
                <Alert
                  type="success"
                  showIcon
                  message="Current Google session matches the invitation email."
                  style={{ borderRadius: 12 }}
                />
              ) : null}

              <Button
                icon={<GoogleOutlined />}
                size="large"
                onClick={handleRegisterWithGoogle}
                loading={submitting}
              >
                {sessionEmailMatchesInvitation ? "Complete with current Google session" : "Continue with Google"}
              </Button>
            </Space>
          </Card>

          <Divider style={{ margin: "4px 0" }}>Or register with email and password</Divider>

          <Form form={form} layout="vertical" onFinish={handleRegister}>
            <Form.Item label="Invited email">
              <Input size="large" value={invitation?.email} prefix={<MailOutlined />} disabled />
            </Form.Item>

            <Form.Item
              label="Display name"
              name="displayName"
              rules={[{ required: true, message: "Display name is required." }]}
            >
              <Input size="large" prefix={<UserOutlined />} placeholder="Your full name" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required." }]}
            >
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="Create a password" />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              rules={[{ required: true, message: "Please confirm your password." }]}
            >
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="Confirm your password" />
            </Form.Item>

            <Space size={12} wrap>
              <Button type="primary" htmlType="submit" size="large" loading={submitting}>
                Register as System Admin
              </Button>
              <Link to="/login">
                <Button size="large">Go to login</Button>
              </Link>
            </Space>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
