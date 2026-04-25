import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Typography, Button, Tag, Empty, Spin, Avatar } from 'antd';
import {
  CheckCircleOutlined,
  CalendarOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../hooks/useNotifications';
import { useProjectManagementFromUserProjects } from '../hooks/useProjectManagementFromUserProjects';
import UserProfileTooltip from '@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogCanvasUserProfileTooltip';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const { Text, Title } = Typography;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  users?: any[];
  loading: boolean;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  users = [],
  loading,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationDetailsClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
  };

  const handleShowAll = () => {
    onClose();
    navigate('/notifications');
  };

  const toDate = (date: any) => {
    if (!date) return null;
    try {
      return date.toDate ? date.toDate() : new Date(date);
    } catch {
      return null;
    }
  };

  const formatDate = (date: any) => {
    const dateObj = toDate(date);
    if (!dateObj) return 'Unknown';

    if (isYesterday(dateObj)) {
      return `Yesterday at ${format(dateObj, 'h:mm a')}`;
    }

    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const { projects } = useProjectManagementFromUserProjects();
  const [resolvedProjectNames, setResolvedProjectNames] = useState<Record<string, string>>({});

  const getNotifierUser = (userId?: string) => {
    if (!userId) return null;
    return users.find((user: any) => user?.uid === userId) || null;
  };

  useEffect(() => {
    const missingProjectIds = Array.from(
      new Set(
        notifications
          .map((notification) => notification.projectId)
          .filter((projectId): projectId is string => Boolean(projectId))
          .filter((projectId) => !resolvedProjectNames[projectId])
          .filter((projectId) => !projects.some((project) => project.id === projectId))
      )
    );

    if (!missingProjectIds.length) return;

    let cancelled = false;

    const loadProjectNames = async () => {
      const entries = await Promise.all(
        missingProjectIds.map(async (projectId) => {
          try {
            const projectDoc = await getDoc(doc(db, 'projects', projectId));
            const data = projectDoc.exists() ? projectDoc.data() : null;
            const projectName = data?.name || data?.project_name || data?.label;
            return [projectId, typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Project'] as const;
          } catch (error) {
            console.error('Error resolving notification project name:', error);
            return [projectId, 'Project'] as const;
          }
        })
      );

      if (cancelled) return;

      setResolvedProjectNames((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    };

    loadProjectNames();

    return () => {
      cancelled = true;
    };
  }, [notifications, projects, resolvedProjectNames]);

  const getProjectName = (notification: Notification) => {
    const savedProjectName =
      notification.projectName ||
      notification.projectLabel ||
      notification.targetProjectName;

    if (typeof savedProjectName === 'string' && savedProjectName.trim()) {
      return savedProjectName.trim();
    }

    if (!notification.projectId) return 'N/A';

    const project = projects.find(item => item.id === notification.projectId);
    return project?.name || resolvedProjectNames[notification.projectId] || 'Project';
  };

  const getDisplayTitle = (notification: Notification) => {
    const issueRef = notification.issueNo || notification.issueId;
    if (notification.type === 'issue' && notification.actionType === 'issue_created' && issueRef) {
      return `New issue #${issueRef} created`;
    }
    return notification.title;
  };

  const getActionText = (notification: Notification) => {
    if (notification.type !== 'issue') return notification.message;

    const actionTextByType: Record<string, string> = {
      issue_created: 'created new issue',
      status_change: 'changed issue status',
      type_change: 'changed issue type',
      comment_add: 'added a comment',
      comment_update: 'updated a comment',
      description_changed: 'updated issue description',
      priority_change: 'changed issue priority',
      assignee_change: 'changed issue assignee',
      attachment_change: 'updated issue attachments',
      ui_canvas_change: 'updated UI canvas relation',
    };

    return actionTextByType[notification.actionType || ''] || notification.message;
  };

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    filteredNotifications.forEach((notification) => {
      const dateObj = toDate(notification.createdAt);
      const label = !dateObj
        ? 'Earlier'
        : isToday(dateObj)
          ? 'Today'
          : isYesterday(dateObj)
            ? 'Yesterday'
            : format(dateObj, 'MMM d, yyyy');

      if (!groups[label]) groups[label] = [];
      groups[label].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  const getProjectTagColor = (notification: Notification) => {
    if ((notification.message || '').toLowerCase().includes('mention')) {
      return {
        background: '#e8f0ff',
        color: '#3563e9',
      };
    }

    if (notification.type === 'system') {
      return {
        background: '#eef2f7',
        color: '#475569',
      };
    }

    return {
      background: '#edf9d2',
      color: '#6d9f00',
    };
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            Notifications
          </Title>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={onMarkAllAsRead}
              style={{
                paddingInline: 0,
                fontWeight: 600,
                color: '#2563eb',
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={560}
      styles={{
        body: {
          padding: 0,
          background: '#f8fbff',
        },
        header: {
          padding: '18px 22px 14px',
          borderBottom: '1px solid #edf2f7',
          background: '#ffffff',
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
      {
        loading ? (
          <div style={{ textAlign: 'center', padding: '56px 0' }} >
            <Spin size="large" />
          </div >
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '48px 24px' }}>
            <Empty description="No notifications" />
          </div>
        ) : (
          <div>
            {Object.entries(groupedNotifications).map(([groupLabel, items]) => (
              <div key={groupLabel} style={{ background: '#ffffff' }}>
                <div
                  style={{
                    padding: '14px 22px 10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#495466',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {groupLabel}
                </div>
                {items.map((notification) => {
                  const notifier = getNotifierUser(notification.userId);
                  const notifierName = notifier?.displayName || notifier?.email?.split('@')[0] || 'Unknown User';
                  const projectTagColor = getProjectTagColor(notification);

                  return (
                    <div
                      key={notification.id}
                      style={{
                        cursor: 'default',
                        padding: '16px 22px',
                        borderBottom: '1px solid #eef2f7',
                        background: notification.read
                          ? '#ffffff'
                          : 'linear-gradient(180deg, #f7fbff 0%, #f3f8ff 100%)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignSelf: 'stretch',
                          paddingTop: '18px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: notification.read ? '#d1d5db' : '#3b82f6',
                          }}
                        />
                      </div>

                      {notifier ? (
                        <UserProfileTooltip user={notifier} navigateOnClick={false}>
                          <Avatar
                            size={38}
                            src={notifier.photoURL || undefined}
                            style={{
                              flexShrink: 0,
                              alignSelf: 'flex-start',
                              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
                              border: '2px solid #ffffff',
                              backgroundColor: '#2563eb',
                            }}
                          >
                            {!notifier.photoURL ? notifierName.charAt(0).toUpperCase() : null}
                          </Avatar>
                        </UserProfileTooltip>
                      ) : (
                        <Avatar
                          size={38}
                          style={{
                            flexShrink: 0,
                            alignSelf: 'flex-start',
                            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
                            border: '2px solid #ffffff',
                            backgroundColor: '#64748b',
                          }}
                        >
                          {notifierName.charAt(0).toUpperCase()}
                        </Avatar>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                            <Text
                              strong
                              style={{
                                fontSize: '15px',
                                lineHeight: 1.35,
                                color: '#101828',
                              }}
                            >
                              {getDisplayTitle(notification)}
                            </Text>
                            <Tag
                              bordered={false}
                              style={{
                                margin: 0,
                                borderRadius: '7px',
                                padding: '1px 7px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: projectTagColor.background,
                                color: projectTagColor.color,
                              }}
                            >
                              {getProjectName(notification)}
                            </Tag>
                          </div>
                          {!notification.read && (
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#2563eb',
                                marginTop: '7px',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        <div style={{ marginTop: '6px', color: '#4b5563', fontSize: '14px' }}>
                          {notifier ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <UserProfileTooltip user={notifier} navigateOnClick={false}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Text style={{ fontSize: '14px', color: '#6b7280' }}>{notifierName}</Text>
                                </div>
                              </UserProfileTooltip>
                              <Text style={{ fontSize: '14px', color: '#4b5563' }}>{getActionText(notification)}</Text>
                            </div>
                          ) : (
                            <Text style={{ fontSize: '14px', color: '#4b5563' }}>{notification.message}</Text>
                          )}
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '13px', color: '#6b7280' }}>
                            <CalendarOutlined style={{ marginRight: '6px' }} />
                            {formatDate(notification.createdAt)}
                          </Text>
                          {notification.type === 'issue' && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontWeight: 600 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationDetailsClick(notification);
                              }}
                            >
                              Check Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        </div>

        <div
          style={{
            borderTop: '1px solid #edf2f7',
            background: '#ffffff',
            padding: '14px 20px 18px',
            textAlign: 'center',
          }}
        >
          <Button type="link" onClick={handleShowAll} style={{ fontWeight: 600 }}>
            View all notifications <RightOutlined />
          </Button>
        </div>
      </div>
    </Drawer >
  );
};

export default NotificationDrawer;

