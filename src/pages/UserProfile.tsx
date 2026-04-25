import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Avatar, Typography, Space, Divider, ConfigProvider, Spin, message, Tag, Descriptions, Button, Row, Col, Statistic, Timeline, Empty, Badge, Progress } from 'antd';
import { UserOutlined, MailOutlined, CopyOutlined, SafetyCertificateOutlined, CheckCircleOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { useAppTheme } from '@/components/Layout/hooks/useAppTheme';

const { Title, Text } = Typography;

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { users, currentUser } = useAppSelector(store => store.auth);
  const currentProject = useAppSelector((store) => store.project.currentProject);
  const { appTheme, darkAlgorithm, defaultAlgorithm } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const isDark = appTheme === 'dark';
  
  // Dark mode colors
  const cardBg = isDark ? '#161b22' : '#ffffff';
  const cardBgSecondary = isDark ? '#0f1720' : '#f8fafc';
  const pageBg = isDark ? '#0b1220' : '#eef3f8';
  const textColor = isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.85)';
  const textSecondary = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)';
  const borderColor = isDark ? '#273244' : '#dbe4ee';
  const dividerColor = isDark ? '#1e293b' : '#e2e8f0';
  const heroGradient = isDark
    ? 'linear-gradient(135deg, #10233f 0%, #153b69 45%, #0f766e 100%)'
    : 'linear-gradient(135deg, #0f4c81 0%, #0d7f8c 48%, #1fb6a6 100%)';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    if (Array.isArray(users) && users.length > 0) {
      const foundUser = users.find((u: any) => u.uid === id);
      if (foundUser) {
        setUserData(foundUser);
        setLoading(false);
        return;
      }
    }

    if (currentUser?.uid === id) {
      setUserData(currentUser);
      setLoading(false);
      return;
    }

    // Keep page stable even when user list is not loaded.
    // Avoid redirect/noisy toast for background fetch races.
    setUserData(null);
    setLoading(false);
  }, [id, users, currentUser]);

  const resolvedUser = userData || currentUser || null;
  const photoURL = resolvedUser?.photoURL || null;
  const displayName = resolvedUser?.displayName || resolvedUser?.email?.split('@')[0] || 'User';
  const email = resolvedUser?.email || '';
  const userId = resolvedUser?.uid || id || '-';
  const emailVerified = Boolean(resolvedUser?.emailVerified);
  const role = resolvedUser?.permission_type || resolvedUser?.role || 'member';
  const status = resolvedUser?.status || 'active';
  const createdAt = resolvedUser?.metadata?.creationTime || resolvedUser?.createdAt || '-';
  const lastLoginAt = resolvedUser?.metadata?.lastSignInTime || resolvedUser?.lastLoginAt || '-';
  const projectName = currentProject?.name || currentProject?.label || currentProject?.id || '-';
  const moduleAccess = resolvedUser?.moduleAccess || resolvedUser?.permissions || {};
  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(displayName?.trim()),
      Boolean(email?.trim()),
      Boolean(photoURL),
      emailVerified,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [displayName, email, photoURL, emailVerified]);

  const formatDate = (value: unknown) => {
    if (!value || value === '-') {
      return '-';
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString();
  };

  const recentActions = useMemo(() => {
    const source = resolvedUser?.recentActions || resolvedUser?.activityLogs || resolvedUser?.timeline || [];
    if (Array.isArray(source) && source.length > 0) {
      return source.slice(0, 8).map((item: any, index: number) => ({
        key: item?.id || `${index}`,
        title: item?.title || item?.actionType || item?.action || 'Profile activity',
        description: item?.description || item?.detail || '',
        timestamp: item?.timestamp || item?.createdAt || item?.updatedAt || '-',
      }));
    }

    return [
      {
        key: 'login',
        title: 'Last login',
        description: `User logged in as ${displayName}`,
        timestamp: lastLoginAt,
      },
      {
        key: 'created',
        title: 'Account created',
        description: 'User account created',
        timestamp: createdAt,
      },
    ];
  }, [createdAt, displayName, lastLoginAt, resolvedUser]);

  const activitySummary = useMemo(() => {
    const actionsCount = Array.isArray(resolvedUser?.recentActions) ? resolvedUser.recentActions.length : recentActions.length;
    const modulesCount = typeof moduleAccess === 'object' ? Object.keys(moduleAccess || {}).length : 0;
    const activeSessions = Number(resolvedUser?.activeSessions || 1);

    return {
      actionsCount,
      modulesCount,
      activeSessions,
    };
  }, [moduleAccess, recentActions.length, resolvedUser]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        background: isDark ? '#141414' : '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!resolvedUser) {
    return (
      <div style={{ 
        padding: '24px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 64px)',
        background: isDark ? '#141414' : '#f5f5f5'
      }}>
        <Card style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <Space direction="vertical" size={8}>
            <Title level={4} style={{ marginBottom: 0 }}>User not found</Title>
            <Text type="secondary">
              This profile is unavailable or you do not have access to this user data.
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  const handleCopyUID = async () => {
    try {
      await navigator.clipboard.writeText(String(userId));
      message.success('UID copied');
    } catch {
      message.error('Failed to copy UID');
    }
  };

  const heroStats = [
    {
      title: 'Profile Health',
      value: `${profileCompletion}%`,
      icon: <SafetyCertificateOutlined />,
      color: '#22c55e',
    },
    {
      title: 'Identity',
      value: emailVerified ? 'Verified' : 'Pending',
      icon: <CheckCircleOutlined />,
      color: emailVerified ? '#22c55e' : '#f59e0b',
    },
    {
      title: 'Workspace',
      value: projectName,
      icon: <TeamOutlined />,
      color: '#60a5fa',
    },
    {
      title: 'Locale',
      value: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      icon: <GlobalOutlined />,
      color: '#a78bfa',
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorBgContainer: cardBg,
          colorText: textColor,
          colorTextSecondary: textSecondary,
          colorBorder: borderColor,
          borderRadius: 8,
        },
        components: {
          Card: {
            headerBg: cardBg,
            actionsBg: cardBg,
          },
          Input: {
            colorBgContainer: isDark ? '#141414' : '#ffffff',
            colorText: textColor,
            colorBorder: borderColor,
            colorTextPlaceholder: textSecondary,
          },
          Form: {
            labelColor: textColor,
          },
        },
      }}
    >
      <div style={{ padding: '24px', margin: '0 auto', minHeight: 'calc(100vh - 64px)', background: pageBg }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <Card
            bordered={false}
            style={{
              background: heroGradient,
              borderRadius: 28,
              marginBottom: 24,
              boxShadow: isDark ? '0 22px 45px rgba(2, 8, 23, 0.45)' : '0 24px 48px rgba(15, 76, 129, 0.18)',
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} lg={12}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Tag color="rgba(255,255,255,0.12)" style={{ color: '#fff', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.24)' }}>
                    User Profile
                  </Tag>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <Avatar
                      size={92}
                      src={photoURL}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: photoURL ? 'transparent' : 'rgba(255,255,255,0.16)',
                        color: '#fff',
                        border: '3px solid rgba(255,255,255,0.24)',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <Title level={2} style={{ margin: 0, color: '#fff' }}>{displayName}</Title>
                      <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', display: 'block', marginTop: 4 }}>
                        {email}
                      </Text>
                      <Space wrap style={{ marginTop: 12 }}>
                        <Tag color={emailVerified ? 'success' : 'warning'}>
                          {emailVerified ? 'Verified identity' : 'Verification pending'}
                        </Tag>
                        <Tag color="blue">{projectName}</Tag>
                      </Space>
                    </div>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <Row gutter={[12, 12]}>
                  {heroStats.map((item) => (
                    <Col xs={24} sm={12} key={item.title}>
                      <div style={{ minHeight: 108, padding: 18, borderRadius: 18, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
                        <Space direction="vertical" size={8}>
                          <div style={{ color: item.color, fontSize: 18 }}>{item.icon}</div>
                          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</Text>
                          <Text style={{ color: '#fff', fontSize: item.title === 'Workspace' ? 18 : 24, fontWeight: 700, lineHeight: 1.2 }}>
                            {item.value}
                          </Text>
                        </Space>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
          </Card>

          <Row gutter={[24, 24]}>
            <Col xs={24} xl={8}>
              <Card bordered={false} style={{ background: cardBg, borderRadius: 24, boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.26)' : '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ color: textSecondary, textTransform: 'uppercase', letterSpacing: 1.1 }}>Account Overview</Text>
                    <Title level={4} style={{ margin: '8px 0 0', color: textColor }}>Professional identity snapshot</Title>
                  </div>
                  <Progress percent={profileCompletion} strokeColor={{ '0%': '#0ea5e9', '100%': '#22c55e' }} trailColor={isDark ? '#1e293b' : '#e2e8f0'} />
                  <Descriptions
                    column={1}
                    colon={false}
                    labelStyle={{ color: textSecondary }}
                    contentStyle={{ color: textColor }}
                    items={[
                      {
                        label: 'Account status',
                        children: <Badge status={status === 'active' ? 'processing' : 'default'} text={<span style={{ color: textColor }}>{status === 'active' ? 'Active' : 'Unavailable'}</span>} />
                      },
                      {
                        label: 'Email verification',
                        children: emailVerified ? <Tag color="success">Verified</Tag> : <Tag color="warning">Pending</Tag>
                      },
                      {
                        label: 'Current project',
                        children: projectName
                      },
                      {
                        label: 'Last sign in',
                        children: formatDate(lastLoginAt)
                      },
                      {
                        label: 'Account created',
                        children: formatDate(createdAt)
                      },
                    ]}
                  />
                </Space>
              </Card>
            </Col>

            <Col xs={24} xl={16}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: cardBg, borderRadius: 24 }}>
                      <Statistic title="Profile Completeness" value={profileCompletion} suffix="%" valueStyle={{ color: textColor }} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: cardBg, borderRadius: 24 }}>
                      <Statistic title="Recent Actions" value={activitySummary.actionsCount} valueStyle={{ color: textColor }} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: cardBg, borderRadius: 24 }}>
                      <Statistic title="Accessible Modules" value={activitySummary.modulesCount} valueStyle={{ color: textColor }} />
                    </Card>
                  </Col>
                </Row>

                <Card bordered={false} style={{ background: cardBg, borderRadius: 24, boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.26)' : '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                  <Space direction="vertical" size={20} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <Text style={{ color: textSecondary, textTransform: 'uppercase', letterSpacing: 1.1 }}>Profile Details</Text>
                        <Title level={3} style={{ margin: '8px 0 6px', color: textColor }}>Identity & metadata</Title>
                      </div>
                      <Button icon={<CopyOutlined />} onClick={handleCopyUID}>
                        Copy UID
                      </Button>
                    </div>

                    <Divider style={{ borderColor: dividerColor, margin: 0 }} />

                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="UID">{userId}</Descriptions.Item>
                          <Descriptions.Item label="Role">{String(role)}</Descriptions.Item>
                          <Descriptions.Item label="Project">{String(projectName)}</Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text strong>Module Access</Text>
                          <Space wrap>
                            {Object.keys(moduleAccess || {}).length > 0 ? (
                              Object.keys(moduleAccess).slice(0, 10).map((moduleKey) => (
                                <Tag key={moduleKey} color="processing">{moduleKey}</Tag>
                              ))
                            ) : (
                              <Text type="secondary">No module data</Text>
                            )}
                          </Space>
                        </Space>
                      </Col>
                    </Row>

                    <Divider style={{ borderColor: dividerColor, margin: 0 }} />

                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Text strong>Recent Actions</Text>
                      {recentActions.length ? (
                        <Timeline
                          items={recentActions.map((action) => ({
                            children: (
                              <Space direction="vertical" size={0}>
                                <Text strong>{action.title}</Text>
                                {action.description ? <Text type="secondary">{action.description}</Text> : null}
                                <Text type="secondary">{formatDate(action.timestamp)}</Text>
                              </Space>
                            ),
                          }))}
                        />
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent actions" />
                      )}
                    </Space>

                    <Divider style={{ borderColor: dividerColor, margin: 0 }} />

                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Text strong>Public Contact (read-only)</Text>
                      <Input
                        prefix={<UserOutlined style={{ color: textSecondary }} />}
                        size="large"
                        readOnly
                        value={displayName}
                      />
                      <Input
                        prefix={<MailOutlined style={{ color: textSecondary }} />}
                        size="large"
                        readOnly
                        value={email}
                      />
                    </Space>
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default UserProfile;

