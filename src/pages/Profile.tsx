import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Divider,
  Form,
  Input,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import {
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  GlobalOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useUserContext } from '@/components/Layout/hooks/useUserContext';
import { useAuth } from '@/auth/AuthContext';
import { useAppSelector, useAppDispatch, updateUser } from '@/store';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/config/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppTheme } from '@/components/Layout/hooks/useAppTheme';
import type { UploadProps } from 'antd';
// import { callApiWithToken } from '@/utils/callApi';

const { Title, Text } = Typography;

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const Profile: React.FC = () => {
  const { user } = useUserContext();
  const { user: authUser } = useAuth();
  const { users } = useAppSelector(store => store.auth);
  const currentProject = useAppSelector(store => store.project.currentProject);
  const dispatch = useAppDispatch();
  const { appTheme, darkAlgorithm, defaultAlgorithm } = useAppTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialValues, setInitialValues] = useState<any>({});
  const [currentDisplayName, setCurrentDisplayName] = useState<string>('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);

  const userData = user || authUser;
  const currentUserFromStore = users?.find((u: any) => u.uid === userData?.uid);
  const photoURL = currentPhotoURL || currentUserFromStore?.photoURL || userData?.photoURL || null;
  const displayName = currentDisplayName || userData?.displayName || userData?.email?.split('@')[0] || 'User';
  const email = userData?.email || '';

  const isDark = appTheme === 'dark';
  const cardBg = isDark ? '#161b22' : '#ffffff';
  const cardBgSecondary = isDark ? '#0f1720' : '#f8fafc';
  const pageBg = isDark ? '#0b1220' : '#eef3f8';
  const textColor = isDark ? '#f3f4f6' : 'rgba(15, 23, 42, 0.95)';
  const textSecondary = isDark ? 'rgba(226, 232, 240, 0.72)' : 'rgba(51, 65, 85, 0.72)';
  const borderColor = isDark ? '#273244' : '#dbe4ee';
  const dividerColor = isDark ? '#1e293b' : '#e2e8f0';
  const heroGradient = isDark
    ? 'linear-gradient(135deg, #10233f 0%, #153b69 45%, #0f766e 100%)'
    : 'linear-gradient(135deg, #0f4c81 0%, #0d7f8c 48%, #1fb6a6 100%)';

  useEffect(() => {
    if (userData) {
      const name = userData?.displayName || '';
      const photo = currentUserFromStore?.photoURL || userData?.photoURL || null;
      setCurrentDisplayName(name);
      setCurrentPhotoURL(photo);
      const values = {
        displayName: name,
        email: userData?.email || '',
      };
      setInitialValues(values);
      form.setFieldsValue(values);
    }
  }, [userData, form, currentUserFromStore]);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(displayName?.trim()),
      Boolean(email?.trim()),
      Boolean(photoURL),
      Boolean(auth.currentUser?.emailVerified),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [displayName, email, photoURL]);

  const heroStats = [
    {
      title: 'Profile Health',
      value: `${profileCompletion}%`,
      icon: <SafetyCertificateOutlined />,
      color: '#22c55e',
    },
    {
      title: 'Identity',
      value: auth.currentUser?.emailVerified ? 'Verified' : 'Pending',
      icon: <CheckCircleOutlined />,
      color: auth.currentUser?.emailVerified ? '#22c55e' : '#f59e0b',
    },
    {
      title: 'Workspace',
      value: currentProject?.name || 'No active project',
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

  const syncUserProfileToFirestore = async (updates: { displayName?: string; photoURL?: string | null }) => {
    if (!auth.currentUser) return;

    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || email || '',
        displayName:
          updates.displayName ??
          auth.currentUser.displayName ??
          currentUserFromStore?.displayName ??
          userData?.displayName ??
          '',
        photoURL:
          updates.photoURL ??
          auth.currentUser.photoURL ??
          currentUserFromStore?.photoURL ??
          userData?.photoURL ??
          '',
        emailVerified: Boolean(auth.currentUser.emailVerified),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handlePhotoUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!auth.currentUser) {
      message.error('User not authenticated');
      return false;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    // Validate file size (5MB limit)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    setUploading(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `user_profiles/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile with new photoURL
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });

      await syncUserProfileToFirestore({
        photoURL: downloadURL,
      });

      // Update backend user profile
      // try {
      //   await callApiWithToken('/auth/update-user-profile', {
      //     uid: auth.currentUser.uid,
      //     photoURL: downloadURL
      //   });
      // } catch (error) {
      //   console.error('Failed to update user profile in backend:', error);
      //   // Don't fail the whole flow if backend update fails
      // }
      // TODO: Replace with new API logic or remove if not needed.

      // Update local state
      setCurrentPhotoURL(downloadURL);

      // Update Redux store
      dispatch(updateUser({
        uid: auth.currentUser.uid,
        updates: { photoURL: downloadURL }
      }));

      // Update localStorage if userData exists there
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userDataObj = JSON.parse(userDataStr);
        userDataObj.photoURL = downloadURL;
        localStorage.setItem('userData', JSON.stringify(userDataObj));
      }

      message.success('Profile photo updated successfully');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      message.error(error?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }

    return false; // Prevent auto upload
  };

  const handleSave = async (values: any) => {
    if (!auth.currentUser) {
      message.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
        ...(currentPhotoURL ? { photoURL: currentPhotoURL } : {})
      });

      await syncUserProfileToFirestore({
        displayName: values.displayName,
        photoURL: currentPhotoURL,
      });

      // Update backend user profile
      try {
        await callApiWithToken('/auth/update-user-profile', {
          uid: auth.currentUser.uid,
          displayName: values.displayName,
          ...(currentPhotoURL ? { photoURL: currentPhotoURL } : {})
        });
      } catch (error) {
        console.error('Failed to update user profile in backend:', error);
        // Don't fail the whole flow if backend update fails
      }

      // Update local state
      setCurrentDisplayName(values.displayName);
      setInitialValues(values);

      // Update Redux store
      dispatch(updateUser({
        uid: auth.currentUser.uid,
        updates: {
          displayName: values.displayName,
          ...(currentPhotoURL ? { photoURL: currentPhotoURL } : {})
        }
      }));
      
      // Update localStorage if userData exists there
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userDataObj = JSON.parse(userDataStr);
        userDataObj.displayName = values.displayName;
        if (currentPhotoURL) {
          userDataObj.photoURL = currentPhotoURL;
        }
        localStorage.setItem('userData', JSON.stringify(userDataObj));
      }

      message.success('Profile updated successfully');
      setEditing(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      message.error(error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.setFieldsValue(initialValues);
    setEditing(false);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorBgContainer: cardBg,
          colorText: textColor,
          colorTextSecondary: textSecondary,
          colorBorder: borderColor,
          borderRadius: 16,
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
                    Personal Workspace Hub
                  </Tag>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
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
                      {editing && (
                        <Upload beforeUpload={handlePhotoUpload} showUploadList={false} accept="image/*">
                          <Button
                            type="primary"
                            shape="circle"
                            icon={<CameraOutlined />}
                            loading={uploading}
                            style={{ position: 'absolute', right: -4, bottom: -4 }}
                            title="Upload profile photo"
                          />
                        </Upload>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Title level={2} style={{ margin: 0, color: '#fff' }}>{displayName}</Title>
                      <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', display: 'block', marginTop: 4 }}>
                        {email}
                      </Text>
                      <Space wrap style={{ marginTop: 12 }}>
                        <Tag color={auth.currentUser?.emailVerified ? 'success' : 'warning'}>
                          {auth.currentUser?.emailVerified ? 'Verified identity' : 'Verification pending'}
                        </Tag>
                        <Tag color="blue">{currentProject?.name || 'No active workspace'}</Tag>
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
                        children: <Badge status={auth.currentUser ? 'processing' : 'default'} text={<span style={{ color: textColor }}>{auth.currentUser ? 'Active' : 'Offline'}</span>} />
                      },
                      {
                        label: 'Email verification',
                        children: auth.currentUser?.emailVerified ? <Tag color="success">Verified</Tag> : <Tag color="warning">Pending</Tag>
                      },
                      {
                        label: 'Current project',
                        children: currentProject?.name || 'No project selected'
                      },
                      {
                        label: 'Last sign in',
                        children: formatDateTime(auth.currentUser?.metadata?.lastSignInTime)
                      },
                      {
                        label: 'Account created',
                        children: formatDateTime(auth.currentUser?.metadata?.creationTime)
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
                      <Statistic title="Identity Confidence" value={auth.currentUser?.emailVerified ? 100 : 65} suffix="%" valueStyle={{ color: textColor }} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card bordered={false} style={{ background: cardBg, borderRadius: 24 }}>
                      <Statistic title="Workspace Readiness" value={currentProject?.id ? 100 : 40} suffix="%" valueStyle={{ color: textColor }} />
                    </Card>
                  </Col>
                </Row>

                <Card bordered={false} style={{ background: cardBg, borderRadius: 24, boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.26)' : '0 12px 28px rgba(15, 23, 42, 0.08)' }}>
                  <Space direction="vertical" size={20} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <Text style={{ color: textSecondary, textTransform: 'uppercase', letterSpacing: 1.1 }}>Profile Editor</Text>
                        <Title level={3} style={{ margin: '8px 0 6px', color: textColor }}>Keep your identity polished and team-ready</Title>
                      </div>
                      <Space wrap>
                        <Button
                          type={editing ? 'default' : 'primary'}
                          icon={editing ? <SaveOutlined /> : <EditOutlined />}
                          onClick={() => editing ? form.submit() : setEditing(true)}
                        >
                          {editing ? 'Save profile' : 'Edit profile'}
                        </Button>
                        {editing && (
                          <Button onClick={handleCancel} style={{ borderColor, color: textColor }}>
                            Cancel
                          </Button>
                        )}
                      </Space>
                    </div>

                    <Divider style={{ borderColor: dividerColor, margin: 0 }} />

                    <Form form={form} layout="vertical" onFinish={handleSave} disabled={!editing}>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label={<span style={{ color: textColor }}>Display Name</span>}
                            name="displayName"
                            rules={[{ required: true, message: 'Please enter your display name' }]}
                          >
                            <Input prefix={<UserOutlined style={{ color: textSecondary }} />} placeholder="Enter your display name" size="large" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item label={<span style={{ color: textColor }}>Email</span>} name="email">
                            <Input prefix={<MailOutlined style={{ color: textSecondary }} />} placeholder="Enter your email" size="large" disabled />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <div style={{ border: `1px solid ${dividerColor}`, background: cardBgSecondary, borderRadius: 18, padding: 18 }}>
                            <Space direction="vertical" size={6}>
                              <Text style={{ color: textSecondary }}>Visibility</Text>
                              <Text style={{ color: textColor, fontSize: 16, fontWeight: 600 }}>Clear identity</Text>
                            </Space>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div style={{ border: `1px solid ${dividerColor}`, background: cardBgSecondary, borderRadius: 18, padding: 18 }}>
                            <Space direction="vertical" size={6}>
                              <Text style={{ color: textSecondary }}>Security</Text>
                              <Text style={{ color: textColor, fontSize: 16, fontWeight: 600 }}>
                                <LockOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
                                Verified account
                              </Text>
                            </Space>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div style={{ border: `1px solid ${dividerColor}`, background: cardBgSecondary, borderRadius: 18, padding: 18 }}>
                            <Space direction="vertical" size={6}>
                              <Text style={{ color: textSecondary }}>Activity</Text>
                              <Text style={{ color: textColor, fontSize: 16, fontWeight: 600 }}>
                                <ClockCircleOutlined style={{ marginRight: 8, color: '#10b981' }} />
                                {formatDateTime(auth.currentUser?.metadata?.lastSignInTime)}
                              </Text>
                            </Space>
                          </div>
                        </Col>
                      </Row>

                      {editing && (
                        <Form.Item style={{ marginTop: 20, marginBottom: 0 }}>
                          <Space wrap>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                              Save changes
                            </Button>
                            <Button onClick={handleCancel} style={{ borderColor, color: textColor }}>
                              Reset draft
                            </Button>
                          </Space>
                        </Form.Item>
                      )}
                    </Form>
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

export default Profile;
