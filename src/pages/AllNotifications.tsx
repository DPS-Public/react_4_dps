import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Typography, Button, Space, Empty, Spin, Card, Pagination, Avatar, Tag, message } from 'antd';
import { CheckCircleOutlined, CalendarOutlined, RightOutlined, MailOutlined, WarningOutlined } from '@ant-design/icons';
import { useNotifications } from '@/components/Layout/hooks/useNotifications';
import { useUserContext } from '@/components/Layout/hooks/useUserContext';
import { useIssueActions } from '@/ui-canvas/uic_backlog_canvas/hooks/useIssueActions';
import { Notification } from '@/components/Layout/hooks/useNotifications';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useProjectManagement } from '@/components/Layout/hooks/useProjectManagement';
import dayjs, { Dayjs } from 'dayjs';
import { NotificationFilters } from './notifications/components/NotificationFilters';
import { useNotificationFilters } from './notifications/hooks/useNotificationFilters';
import { useUsers } from './notifications/hooks/useUsers';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import UserProfileTooltip from '@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogCanvasUserProfileTooltip';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const { Title, Text } = Typography;

const AllNotifications: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUserContext();
  const { currentProject } = useSelector((state: RootState) => state.project);
  const { projects } = useProjectManagement();
  const { users, loading: usersLoading } = useUsers();
  const userData = user || JSON.parse(localStorage.getItem('userData') || '{}');
  const userIdForNotifications = userData?.uid || null;
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications(userIdForNotifications, currentProject?.id);
  const { handleIssueClick } = useIssueActions();
  const openedIssueFromQueryRef = useRef<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  // Filter state
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState<boolean>(false);
  const [resolvedProjectNames, setResolvedProjectNames] = useState<Record<string, string>>({});

  const filteredNotifications = useNotificationFilters(notifications, {
    selectedProject,
    selectedCreatedBy,
    dateRange,
    showOnlyUnread,
  });

  // Calculate paginated notifications
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.type === 'issue') {
      handleIssueClick(notification);
    } else if (notification.type === 'pull_request') {
      message.warning('Pull request details are no longer available.');
    }
  };

  const clearFilters = () => {
    setSelectedProject(undefined);
    setSelectedCreatedBy(undefined);
    setDateRange(null);
    setShowOnlyUnread(false);
    setCurrentPage(1); // Reset to first page when filters are cleared
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when any filter changes
  };

  const handleProjectChange = (value: string | undefined) => {
    setSelectedProject(value);
    handleFilterChange();
  };

  const handleCreatedByChange = (value: string | undefined) => {
    setSelectedCreatedBy(value);
    handleFilterChange();
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(dates);
    handleFilterChange();
  };

  const handleShowOnlyUnread = (value: boolean) => {
    setShowOnlyUnread(value);
    handleFilterChange();
  };

  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredCount = filteredNotifications.length;

  const getUserInfo = (userId: string) => {
    return users.find(u => u.uid === userId);
  };

  const createdByOptions = useMemo(() => {
    const senderIds = Array.from(
      new Set(
        notifications
          .map((notification) => notification.userId)
          .filter(Boolean)
      )
    );

    return senderIds.map((senderId) => {
      const sender = users.find((user) => user.uid === senderId);
      return {
        uid: senderId,
        label: sender?.displayName || sender?.email || senderId,
        email: sender?.email || '',
        photoURL: sender?.photoURL || null,
      };
    });
  }, [notifications, users]);

  const getProjectName = (notification: Notification) => {
    const savedProjectName =
      notification.projectName ||
      notification.projectLabel ||
      notification.targetProjectName;

    if (typeof savedProjectName === 'string' && savedProjectName.trim()) {
      return savedProjectName.trim();
    }

    if (!notification.projectId) return 'N/A';

    const project = projects.find(p => p.id === notification.projectId);
    return project?.name || resolvedProjectNames[notification.projectId] || 'Project';
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

  const toDate = (date: any) => {
    if (!date) return null;
    try {
      return date.toDate ? date.toDate() : new Date(date);
    } catch {
      return null;
    }
  };

  const formatNotificationTime = (date: any) => {
    const dateObj = toDate(date);
    if (!dateObj) return 'Unknown';

    if (isYesterday(dateObj)) {
      return `Yesterday at ${format(dateObj, 'h:mm a')}`;
    }

    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const getGroupLabel = (date: any) => {
    const dateObj = toDate(date);
    if (!dateObj) return 'Earlier';
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'MMM d, yyyy');
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
      issue_created: 'created a new issue',
      status_change: 'changed issue status',
      type_change: 'changed issue type',
      comment_add: 'commented on issue',
      comment_update: 'updated a comment',
      description_changed: 'updated issue description',
      priority_change: 'changed issue priority',
      assignee_change: 'changed issue assignee',
      attachment_change: 'updated issue attachments',
      ui_canvas_change: 'updated UI canvas relation',
    };

    return actionTextByType[notification.actionType || ''] || notification.message;
  };

  const getProjectTagColor = (notification: Notification) => {
    if ((notification.message || '').toLowerCase().includes('mention')) {
      return { background: '#e8f0ff', color: '#3563e9' };
    }
    if (notification.type === 'system') {
      return { background: '#eef2f7', color: '#475569' };
    }
    return { background: '#edf9d2', color: '#6d9f00' };
  };

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    paginatedNotifications.forEach((notification) => {
      const label = getGroupLabel(notification.createdAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(notification);
    });
    return groups;
  }, [paginatedNotifications]);

  useEffect(() => {
    const issueIdFromQuery = searchParams.get('issueId');
    const projectIdFromQuery = searchParams.get('projectId');

    if (!issueIdFromQuery || loading) {
      return;
    }

    if (openedIssueFromQueryRef.current === issueIdFromQuery) {
      return;
    }

    const matchingNotification = notifications.find(
      (notification) =>
        notification.type === 'issue' &&
        (notification.issueId === issueIdFromQuery || notification.issueKey === issueIdFromQuery) &&
        (!projectIdFromQuery || notification.projectId === projectIdFromQuery)
    );

    if (!matchingNotification) {
      return;
    }

    openedIssueFromQueryRef.current = issueIdFromQuery;
    handleIssueClick(matchingNotification);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('issueId');
    nextParams.delete('projectId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, notifications, loading, handleIssueClick]);

  return (
    <div style={{ padding: '24px', margin: '0 auto', maxWidth: '1400px' }}>
      <Card
        styles={{
          body: {
            padding: '20px 20px 24px',
          },
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0 }}>
              All Notifications
            </Title>
            <Space size="small" split={<Text type="secondary">|</Text>}>
              <Text strong style={{ fontSize: '16px', color: '#666' }}>
                Total: {totalCount}
              </Text>
              {filteredCount !== totalCount && (
                <Text style={{ fontSize: '16px', color: '#1890ff' }}>
                  Filtered: {filteredCount}
                </Text>
              )}
            </Space>
          </div>
          <Space wrap>
            {unreadCount > 0 && (
              <>
                <Text
                  style={{
                    color: '#1890ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: showOnlyUnread ? 'underline' : 'none',
                    fontWeight: showOnlyUnread ? 'bold' : 'normal',
                  }}
                  onClick={() => handleShowOnlyUnread(true)}
                >
                  Unread: {unreadCount}
                </Text>
                <Button
                  type="default"
                  onClick={() => handleShowOnlyUnread(false)}
                  disabled={!showOnlyUnread}
                >
                  Show All
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              </>
            )}
          </Space>
        </div>

        <NotificationFilters
          selectedProject={selectedProject}
          selectedCreatedBy={selectedCreatedBy}
          dateRange={dateRange}
          createdByOptions={createdByOptions}
          loadingCreatedBy={usersLoading}
          onProjectChange={handleProjectChange}
          onCreatedByChange={handleCreatedByChange}
          onDateRangeChange={handleDateRangeChange}
          onClearFilters={clearFilters}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Empty 
            description={
              notifications.length === 0 
                ? "No notifications" 
                : "No notifications match the selected filters"
            }
          />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(groupedNotifications).map(([groupLabel, items]) => (
                <div key={groupLabel}>
                  <div
                    style={{
                      padding: '4px 4px 12px',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#202938',
                    }}
                  >
                    {groupLabel}
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e6edf7',
                      borderRadius: '16px',
                      overflow: 'hidden',
                    }}
                  >
                    {items.map((notification, index) => {
                      const userInfo = getUserInfo(notification.userId);
                      const notifierName =
                        userInfo?.displayName || userInfo?.email?.split('@')[0] || 'Unknown User';
                      const projectTagColor = getProjectTagColor(notification);

                      return (
                        <div
                          key={notification.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '20px',
                            padding: '18px 18px 16px',
                            background: notification.read
                              ? '#ffffff'
                              : 'linear-gradient(180deg, #f7fbff 0%, #f3f8ff 100%)',
                            borderBottom: index === items.length - 1 ? 'none' : '1px solid #edf2f7',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                width: '8px',
                                display: 'flex',
                                justifyContent: 'center',
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

                            {userInfo ? (
                              <UserProfileTooltip user={userInfo} navigateOnClick={false}>
                                <Avatar
                                  size={40}
                                  src={userInfo.photoURL || undefined}
                                  style={{
                                    flexShrink: 0,
                                    alignSelf: 'flex-start',
                                    border: '2px solid #ffffff',
                                    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
                                    backgroundColor: '#2563eb',
                                  }}
                                >
                                  {!userInfo.photoURL ? notifierName.charAt(0).toUpperCase() : null}
                                </Avatar>
                              </UserProfileTooltip>
                            ) : (
                              <Avatar
                                size={40}
                                style={{
                                  flexShrink: 0,
                                  alignSelf: 'flex-start',
                                  border: '2px solid #ffffff',
                                  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
                                  backgroundColor: '#64748b',
                                }}
                              >
                                {notifierName.charAt(0).toUpperCase()}
                              </Avatar>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                                <Text strong style={{ fontSize: '16px', color: '#101828', lineHeight: 1.35 }}>
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

                              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {userInfo ? (
                                  <UserProfileTooltip user={userInfo} navigateOnClick={false}>
                                    <Text style={{ fontSize: '14px', color: '#6b7280' }}>{notifierName}</Text>
                                  </UserProfileTooltip>
                                ) : (
                                  <Text style={{ fontSize: '14px', color: '#6b7280' }}>{notifierName}</Text>
                                )}
                                <Text style={{ fontSize: '14px', color: '#4b5563' }}>{getActionText(notification)}</Text>
                              </div>

                              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <Text type="secondary" style={{ fontSize: '13px', color: '#6b7280' }}>
                                  <CalendarOutlined style={{ marginRight: '6px' }} />
                                  {formatNotificationTime(notification.createdAt)}
                                </Text>
                                <Tag
                                  bordered={false}
                                  icon={notification.emailSent ? <MailOutlined /> : <WarningOutlined />}
                                  style={{
                                    margin: 0,
                                    borderRadius: '999px',
                                    padding: '2px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: notification.emailSent ? '#e8f7e8' : '#fff1f0',
                                    color: notification.emailSent ? '#237b4b' : '#cf1322',
                                  }}
                                >
                                  {notification.emailSent ? 'Email sent' : 'Email unsent'}
                                </Tag>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              minWidth: '220px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-end',
                              gap: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            {notification.type === 'issue' && (
                              <Button
                                type="default"
                                onClick={() => handleNotificationClick(notification)}
                                style={{
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  color: '#2563eb',
                                  borderColor: '#cfe0ff',
                                }}
                              >
                                Open issue
                              </Button>
                            )}
                            {!notification.read && (
                              <Button
                                onClick={() => markAsRead(notification.id)}
                                style={{
                                  borderRadius: '10px',
                                  fontWeight: 500,
                                }}
                              >
                                Mark as read <RightOutlined />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {filteredNotifications.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: '24px',
                padding: '16px 0'
              }}>
                <Pagination
                  current={currentPage}
                  total={filteredNotifications.length}
                  pageSize={pageSize}
                  onChange={handlePageChange}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} notifications`}
                  pageSizeOptions={['50', '100', '200', '500']}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default AllNotifications;
