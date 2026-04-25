import React, {useRef, useState, useEffect} from 'react';
import {Avatar, Button, Dropdown, message, Tooltip, Typography, Menu} from 'antd';
import {ImportOutlined, MenuOutlined, UserOutlined, LogoutOutlined, CloudUploadOutlined, FileZipOutlined, DownloadOutlined, DoubleLeftOutlined, DoubleRightOutlined, MoonOutlined, SunOutlined} from '@ant-design/icons';
import Logo from '@/assets/images/Logo.svg';
import {useSelector} from 'react-redux';
import {RootState} from '@/store';
import {toast} from 'sonner';
import axios from 'axios';
import {useUserContext} from '@/components/Layout/hooks/useUserContext';
import {useNavigationContext} from '@/components/Layout/hooks/useNavigationContext';
import {useNotifications} from '@/components/Layout/hooks/useNotifications';
import NotificationIcon from '@/components/Layout/components/NotificationIcon';
import NotificationDrawer from '@/components/Layout/components/NotificationDrawer';
import {useIssueActions} from '@/ui-canvas/uic_backlog_canvas/hooks/useIssueActions';
import { Notification } from '@/components/Layout/hooks/useNotifications';
import IssueDetailDrawer from '@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogCanvasIssueDetailDrawer';
import services from '@/ui-canvas/uic_backlog_canvas/services/backlogService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const { Text } = Typography;

// Updated API call function to handle file uploads
export const callApiWithToken = async (url: string, params?: any, isFileUpload = false) => {
    try {
        const token = localStorage.getItem("token");
        
        const config = {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        };

        let response;

        if (isFileUpload) {
            // For file uploads, use FormData and multipart/form-data
            config.headers["Content-Type"] = "multipart/form-data";
            response = await axios.post(BASE_URL + `/api${url}`, params, config);
        } else {
            // For regular JSON requests
            config.headers["Content-Type"] = "application/json";
            response = await axios.post(BASE_URL + `/api${url}`, params, config);
        }
        
        return response.data;

    } catch (error: any) {        if (error.response?.status === 403) {
            window.location.href = '/login';
            localStorage.removeItem("token");
        }
        toast.error(error.response?.data?.error || "An error occurred");
        return error.response?.data || {error: "Unknown error"};
    }
};

const HeaderContent = ({ 
  isMobile, 
  appTheme, 
  setTheme, 
  setDrawerVisible,
  projectSelector,
  sidebarCollapsed,
  setSidebarCollapsed 
}) => {
  const { currentProject } = useSelector((state: RootState) => state.project);
  const { users } = useSelector((state: RootState) => state.auth);
  const fileInputRef = useRef(null);
  const { logout, user } = useUserContext();
  const { navigate } = useNavigationContext();
  
  // Get user info
  const userData = user || JSON.parse(localStorage.getItem('userData') || '{}');
  const currentUserFromStore = users?.find((u: any) => u.uid === userData?.uid);
  const rawPhotoURL = currentUserFromStore?.photoURL || userData?.photoURL || null;
  const photoURL = String(rawPhotoURL || '').trim() || null;
  const displayName = userData?.displayName || userData?.email?.split('@')[0] || 'User';
  const email = userData?.email || '';
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [globalIssueDrawerOpen, setGlobalIssueDrawerOpen] = useState(false);
  const [globalSelectedIssue, setGlobalSelectedIssue] = useState<any | null>(null);
  const [globalIssueProject, setGlobalIssueProject] = useState<any | null>(null);
  const [globalIssueInitialTab, setGlobalIssueInitialTab] = useState<"details" | "comment">("details");
  const userIdForNotifications = userData?.uid || null;
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications(userIdForNotifications, currentProject?.id);
  const { handleIssueClick } = useIssueActions();

  useEffect(() => {
    const handleOpenGlobalIssueDrawer = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const issueDetail = customEvent.detail || {};
      const issueId = issueDetail.issueId || issueDetail.issueKey || issueDetail.id;
      const projectId = issueDetail.projectId || currentProject?.id;

      if (!issueId || !projectId) {
        return;
      }

      try {
        const fullIssue = await services.getTaskById(projectId, issueId);
        setGlobalSelectedIssue({ id: issueId, ...issueDetail, ...fullIssue });
        setGlobalIssueProject(
          currentProject?.id === projectId
            ? currentProject
            : { id: projectId, name: issueDetail.projectName || 'Project' }
        );
        setGlobalIssueInitialTab(issueDetail.openTab === 'comment' ? 'comment' : 'details');
        setGlobalIssueDrawerOpen(true);
      } catch (error) {
        console.error('Error opening global issue drawer:', error);
        message.error('Failed to load issue details');
      }
    };

    window.addEventListener('openGlobalIssueDrawer', handleOpenGlobalIssueDrawer as EventListener);

    return () => {
      window.removeEventListener('openGlobalIssueDrawer', handleOpenGlobalIssueDrawer as EventListener);
    };
  }, [currentProject]);

  useEffect(() => {
    if (!globalIssueDrawerOpen || !globalSelectedIssue?.id || !globalIssueProject?.id) {
      return;
    }

    const issueRef = doc(db, `backlog_${globalIssueProject.id}`, globalSelectedIssue.id);
    const unsubscribe = onSnapshot(issueRef, (snapshot) => {
      if (!snapshot.exists()) return;
      setGlobalSelectedIssue((prev: any) => ({
        ...(prev || {}),
        id: snapshot.id,
        ...snapshot.data(),
      }));
    });

    return () => unsubscribe();
  }, [globalIssueDrawerOpen, globalSelectedIssue?.id, globalIssueProject?.id]);

  const handleNotificationClick = (notification: Notification) => {
    // Handle different notification types
    if (notification.type === 'issue') {
      handleIssueClick(notification);
    } else if (notification.type === 'pull_request') {
      message.warning('Pull request details are no longer available.');
    }
  };
  

  const handleJsonImport = async (file) => {
    try {
      if (file.size > 50 * 1024 * 1024) {
        message.error('File size too large. Maximum size is 50MB.');
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const jsonContent = e.target.result;
          const parsedData = JSON.parse(jsonContent);
          if (!parsedData.projectId && !parsedData.project_name) {
            message.error('Invalid project export file format. Missing projectId or project_name.');
            return;
          }
          const hasCanvasData = 
            parsedData.ui_canvas_data || 
            parsedData.database_canvas_data || 
            parsedData.api_canvas_data || 
            parsedData.dataflow_canvas_data;

          if (!hasCanvasData) {
            message.warning('No canvas data found in the file. The file may be empty or in wrong format.');
          }
          const formData = new FormData();
          formData.append('projectId', currentProject.id);
          formData.append('importFile', file);
          message.loading('Importing project...', 0);
          
          try {
            const response = await callApiWithToken(
              '/project-execude/import-data', 
              formData, 
              true
            );

            message.destroy();

            if (response.status === 202) {
              const projectName = parsedData.project_name || 'Unknown Project';
              message.success(`Project "${projectName}" imported successfully!`);
              setTimeout(() => {
                window.location.reload();
              }, 1500);
              
            } else {
              message.error(response.error || 'Failed to import project');
            }
            
          } catch (apiError) {
            message.destroy();
            console.error('API import error:', apiError);
            message.error('Failed to import project via API');
          }
          
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          message.error('Failed to parse JSON file.');
        }
      };
      
      reader.onerror = () => {
        message.error('Failed to read file');
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      console.error('Error importing JSON:', error);
      message.error('Failed to import project');
    }
  };

  const handleImportClick = () => {
    if (!currentProject || !currentProject.id) {
      message.error('Please select a project first');
      return;
    }
    
    // Trigger the file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        message.error('Please select a JSON file');
        return;
      }
      
      handleJsonImport(file);
    }
    // Reset the input
    e.target.value = '';
  };

  const toggleSidebar = () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);
    // Save to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsedState));
  };

  const handleProfileMenuClick = async ({ key }: { key: string }) => {
    if (key === 'logout') {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('redirectAfterLogin');
        navigate('/login');
      }
    } else if (key === 'profile') {
      navigate('/profile');
    }
  };

  const profileMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  return (
    <div style={{ 
      padding: isMobile ? '0 16px' : '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: appTheme === 'dark' ? '#001529' : '#fff',
      borderBottom: '1px solid #f0f0f0',
      height: '64px',
      minHeight: '64px'
    }}>
      {/* Left Section - Logo and Title */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        flex: 1,
        minWidth: 0 // Important for text truncation
      }}>
        {/* NEW: Sidebar Collapse Toggle - Desktop only */}
        {!isMobile && (
          <Tooltip title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
              onClick={toggleSidebar}
              style={{
                color: appTheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                padding: 0,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}
            />
          </Tooltip>
        )}
        
        {/* Logo */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          // marginLeft: !isMobile ? '14px' : '0'
        }}>
          <img 
            src={Logo} 
            alt="Logo" 
            style={{
              width: '30px',
              height: '30px',
              objectFit: 'contain'
            }} 
          />
        </div>

        {/* Title */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          // marginLeft: '14px'
        }}>
          <Text 
            style={{
              fontSize: '26px',
              fontWeight: 600,
              color: appTheme === 'dark' ? '#fff' : '#000',
              lineHeight: 1.2,
              margin: 0,
              marginTop: -4,
              fontFamily: '"TT Fors Light", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            DPS 
            {/* <span style={{ fontSize: '14px', fontWeight: 400, color: appTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', marginLeft: '8px' }}>Beta</span> */}
          </Text>
        </div>

        {/* Project Selector - Desktop only */}
        {!isMobile && (
          <div style={{ 
            flex: 1, 
            minWidth: 0,
            marginLeft: '16px',
            maxWidth: '400px'
          }}>
            {projectSelector}
          </div>
        )}
      </div>

      {/* Right Section - Actions */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? '8px' : '16px',
        flexShrink: 0
      }}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            style={{
              color: appTheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}
          />
        )}

        {/* User Info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginRight: isMobile ? '8px' : '0',
        }}>
          <Text 
            strong
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: appTheme === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
              margin: 0,
            }}
          >
            {displayName}
          </Text>
          <Text 
            style={{
              fontSize: '12px',
              lineHeight: '16px',
              color: appTheme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
              margin: 0,
            }}
          >
            {email}
          </Text>
        </div>

        {/* User Avatar with Dropdown */}
        <Dropdown
          menu={{
            items: profileMenuItems,
            onClick: handleProfileMenuClick,
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <div
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: '50%',
              border: appTheme === 'dark' ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(15,23,42,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: photoURL ? (appTheme === 'dark' ? '#1f2937' : '#ffffff') : (appTheme === 'dark' ? '#2563eb' : '#f97316'),
              cursor: 'pointer',
              boxShadow: appTheme === 'dark' ? '0 2px 8px rgba(0,0,0,0.28)' : '0 2px 8px rgba(15,23,42,0.08)',
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18.5"
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="20"
                  cy="15"
                  r="5.5"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <path
                  d="M12.5 28C12.5 23.86 15.86 20.5 20 20.5C24.14 20.5 27.5 23.86 27.5 28"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </Dropdown>

        {/* Notification Icon - After profile photo */}
        <NotificationIcon
          unreadCount={unreadCount}
          onClick={() => setNotificationDrawerOpen(true)}
          appTheme={appTheme}
        />

        {/* Notification Drawer */}
        <NotificationDrawer
          open={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          notifications={notifications}
          users={users}
          loading={notificationsLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />

        <IssueDetailDrawer
          open={globalIssueDrawerOpen}
          onClose={() => {
            setGlobalIssueDrawerOpen(false);
            setGlobalSelectedIssue(null);
            setGlobalIssueInitialTab('details');
          }}
          issue={globalSelectedIssue}
          initialActiveTab={globalIssueInitialTab}
          currentProject={globalIssueProject || currentProject}
          onUpdate={async () => {}}
        />

      </div>
    </div>
  );
};

export default HeaderContent;
