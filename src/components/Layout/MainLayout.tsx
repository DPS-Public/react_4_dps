import { ConfigProvider, Layout, FloatButton, Tooltip, Menu, Dropdown, Drawer, Input, Button, Form, message, Modal, Empty, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import HeaderContent from './HeaderContent';
import { 
  PlusOutlined, 
  BugOutlined, 
  AppstoreOutlined, 
  ApiOutlined,
  MessageOutlined
} from '@ant-design/icons';
import useMainLayoutActions from './actions/useMainLayoutActions';
import React, { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { RootState, setCurrentUser, setUsers, useAppDispatch } from "@/store";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useSelector } from "react-redux";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { buildAuthenticatedUserProfile, db, seedSystemAdmin } from "@/config/firebase.ts";
import useUICanvasCreate from '@/hooks/ui-canvas/useUICanvasCreate';
import { APIEndpoint } from '@/hooks/api-canvas/types';
import useCreateIssue from '@/ui-canvas/uic_backlog_canvas/hooks/useCreateIssue';
import CreateIssueDrawer from '@/ui-canvas/uic_backlog_canvas_create_issue/uicBacklogCanvasCreateIssue';
import { getAllUsersFromFirestore } from "@/services/frontendData";
import { useProjectCanvasCatalogSync } from "./hooks/useProjectCanvasCatalogSync";

const { Content, Sider, Header } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    theme,
    appTheme,
    setTheme,
    isMobile,
    drawerVisible,
    setDrawerVisible,
    handleMenuClick,
    getActiveKey,
    projectSelector,
    currentProject,
    projects,
    canCreateProject,
    handleCreateProject,
    defaultAlgorithm,
    darkAlgorithm,
  } = useMainLayoutActions();

  const dispatch = useAppDispatch();
  const selectedProjectFromStore = useSelector((state: RootState) => state.project.currentProject);
  const [floatMenuOpen, setFloatMenuOpen] = useState(false);
  const floatButtonRef = useRef(null);
  const floatMenuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // UI Canvas state'ler
  const [uiCanvasDrawerVisible, setUICanvasDrawerVisible] = useState(false);
  const [uiCanvasLoading, setUICanvasLoading] = useState(false);
  const [uiCanvasForm] = Form.useForm();

  // API Canvas state'ler
  const [apiCanvasDrawerVisible, setApiCanvasDrawerVisible] = useState(false);
  const [apiCanvasLoading, setApiCanvasLoading] = useState(false);
  const [apiCanvasForm] = Form.useForm();

  // NEW: Sidebar collapse state with localStorage integration
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Create Issue state
  const [createIssueDrawerVisible, setCreateIssueDrawerVisible] = useState(false);
  const { createIssue } = useCreateIssue();
  const isUIEditorRoute = location.pathname.includes('/ui-editor') || location.pathname.includes('/data-flow');
  const isProjectOptionalRoute = ['/system-settings', '/projects', '/notifications'].some((path) =>
    location.pathname.startsWith(path)
  );

  // Load permissions on app initialization (only loads once when project is selected)
  useProjectPermissions();
  useProjectCanvasCatalogSync(selectedProjectFromStore?.id);

  // Save to localStorage whenever sidebarCollapsed changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    return () => {
      if (floatMenuCloseTimeoutRef.current) {
        clearTimeout(floatMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const auth = getAuth();
    seedSystemAdmin();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const resolvedProfile =
          (await buildAuthenticatedUserProfile(user)) ||
          JSON.parse(localStorage.getItem("userData") || "null") ||
          user;
        dispatch(setCurrentUser(resolvedProfile));
      } else {
        dispatch(setCurrentUser(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProjectFromStore?.id) return

    getAllUsersFromFirestore()
      .then((users) => dispatch(setUsers(users)))
      .catch((error) => {
        console.error("Error loading users from Firestore:", error);
        dispatch(setUsers([]));
      })
    
  }, [selectedProjectFromStore, dispatch]);

  // Professional color palette for dark mode
  const darkModeColors = {
    bgBase: '#0d1117',
    bgElevated: '#161b22',
    bgContainer: '#1c2128',
    bgHover: '#21262d',
    bgActive: '#30363d',
    textPrimary: '#e6edf3',
    textSecondary: '#b1bac4',
    textTertiary: '#8b949e',
    border: '#30363d',
    borderLight: '#21262d',
    borderHover: '#484f58',
    primary: '#58a6ff',
    primaryHover: '#79c0ff',
    primaryActive: '#1f6feb',
    shadow: 'rgba(0, 0, 0, 0.4)',
    shadowHover: 'rgba(0, 0, 0, 0.5)',
  };

  const { createUICanvas } = useUICanvasCreate();

  // YENİ: API Canvas oluşturma fonksiyonu (doğrudan burada implement ediyoruz)
  const createAPICanvas = async (name: string) => {
    try {
      const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
      const currentUserId = currentUserData?.uid;
      
      if (!selectedProjectFromStore?.id) {
        throw new Error("Project not selected");
      }
      
      if (!currentUserId) {
        throw new Error("User not authenticated");
      }
      
      // UUID oluştur
      const { v4: uuidv4 } = await import('uuid');
      const endpointId = uuidv4();
      
      // Endpoint objesi oluştur
      const endpoint: APIEndpoint = {
        id: endpointId,
        name: name,
        config: {
          method: "POST",
          localUrl: name.toLowerCase().replace(/\s+/g, "-"), // Convert name to URL-friendly format
          localHeader: "",
          filePath: "",
        },
        requestBody: "{}",
        responseBody: "{}",
        input: [],
        output: [],
        operation: [],
      };

      // 1. Projenin api_json'ını güncelle
      const projectDocRef = doc(db, "projects", selectedProjectFromStore.id);
      
      // Mevcut api_json'u al
      const projectSnap = await getDoc(projectDocRef);
      let api_json: Record<string, string> = {};
      
      if (projectSnap.exists()) {
        const existingApiJson = projectSnap.data().api_json;
        if (existingApiJson) {
          try {
            api_json = JSON.parse(existingApiJson);
          } catch (e) {
            api_json = {};
          }
        }
      }
      
      // Yeni endpoint'i ekle
      api_json[endpointId] = name;
      
      await import('firebase/firestore').then(({ updateDoc, serverTimestamp, setDoc }) => {
        // 1. Projeyi güncelle
        updateDoc(projectDocRef, {
          api_json: JSON.stringify(api_json),
          updatedAt: serverTimestamp()
        });
        
        // 2. API canvas dokümanı oluştur
        const apiCanvasRef = doc(db, "api_canvas", endpointId);
        setDoc(apiCanvasRef, {
          ...endpoint,
          id: endpointId,
          name: name,
          type: "api",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: currentUserId,
          projectId: selectedProjectFromStore.id,
        });
        
        // 3. API canvas history dokümanı oluştur
        const historyDocRef = doc(db, 'api_canvas_history', endpointId);
        const historyRecord = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          userName: currentUserData?.name || currentUserData?.email || 'Unknown User',
          userEmail: currentUserData?.email || 'Unknown Email',
          actionType: 'API_CANVAS_CREATE',
          fieldName: 'api_canvas',
          oldValue: null,
          newValue: {
            id: endpointId,
            name: name,
            config: endpoint.config,
            type: 'api'
          },
          apiCanvasId: endpointId,
          apiCanvasName: name,
          timestamp: new Date().toISOString(),
        };

        setDoc(historyDocRef, {
          apiCanvasId: endpointId,
          apiCanvasName: name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          allChanges: [historyRecord],
          api_canvas_create_records: [historyRecord],
          created_by: currentUserId
        });
      });
      
      // Local storage'ı güncelle
      localStorage.setItem("selectedEndpointId", endpointId);
      localStorage.setItem("selectedEndpoint", JSON.stringify(endpoint));
      
      return endpointId;
      
    } catch (error) {
      console.error("Error creating API Canvas:", error);
      throw error;
    }
  };

  // Handle float button actions
  const handleFloatButtonClick = async (action: string) => {    setFloatMenuOpen(false);
    
    switch (action) {
      case 'add-issue':
        // Open the CreateIssueDrawer instead of dispatching event
        setCreateIssueDrawerVisible(true);
        break;
      case 'add-ui-canvas':
        setUICanvasDrawerVisible(true);
        break;
      case 'add-api-canvas':
        setApiCanvasDrawerVisible(true);
        break;
    }
  };

  // Handle UI Canvas creation
  const handleCreateUICanvas = async () => {
    try {
      setUICanvasLoading(true);
      
      await uiCanvasForm.validateFields();
      
      const name = uiCanvasForm.getFieldValue('name');
      
      if (!name || name.trim() === '') {
        message.error('Please enter a canvas name');
        return;
      }
      
      await createUICanvas(name);
      
      uiCanvasForm.resetFields();
      setUICanvasDrawerVisible(false);
      
      message.success('UI Canvas created successfully!');
      
    } catch (error) {
      console.error('Error creating UI Canvas:', error);
      message.error('Failed to create UI Canvas');
    } finally {
      setUICanvasLoading(false);
    }
  };

  // Handle API Canvas creation
  const handleCreateAPICanvas = async () => {
    try {
      setApiCanvasLoading(true);
      
      await apiCanvasForm.validateFields();
      
      const name = apiCanvasForm.getFieldValue('name');
      
      if (!name || name.trim() === '') {
        message.error('Please enter a canvas name');
        return;
      }
      
      // Doğrudan createAPICanvas fonksiyonunu çağır
      await createAPICanvas(name);
      
      apiCanvasForm.resetFields();
      setApiCanvasDrawerVisible(false);
      
      message.success('API Canvas created successfully!');
      
      // Navigate to API canvas page
      
    } catch (error: any) {
      console.error('Error creating API Canvas:', error);
      message.error(error.message || 'Failed to create API Canvas');
    } finally {
      setApiCanvasLoading(false);
    }
  };

  // Handle Create Issue
  const handleCreateIssue = async (issueData: any) => {
    try {
      await createIssue(issueData);
      message.success('Issue created successfully!');
      setCreateIssueDrawerVisible(false);
    } catch (error) {
      console.error('Error creating issue:', error);
      message.error('Failed to create issue');
    }
  };

  // Float button menu items
  const floatMenuItems = [
    {
      key: 'add-issue',
      icon: <BugOutlined />,
      label: 'Add Issue',
      onClick: () => handleFloatButtonClick('add-issue')
    },
    {
      key: 'add-ui-canvas',
      icon: <AppstoreOutlined />,
      label: 'Add UI Canvas',
      onClick: () => handleFloatButtonClick('add-ui-canvas')
    },
    {
      key: 'add-api-canvas',
      icon: <ApiOutlined />,
      label: 'Add API Canvas',
      onClick: () => handleFloatButtonClick('add-api-canvas')
    },
  ];

  // Handle mouse enter/leave for hover effect
  const handleMouseEnter = () => {
    if (floatMenuCloseTimeoutRef.current) {
      clearTimeout(floatMenuCloseTimeoutRef.current);
      floatMenuCloseTimeoutRef.current = null;
    }
    setIsHovering(true);
    setFloatMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);

    if (floatMenuCloseTimeoutRef.current) {
      clearTimeout(floatMenuCloseTimeoutRef.current);
    }

    floatMenuCloseTimeoutRef.current = setTimeout(() => {
      setFloatMenuOpen(false);
    }, 140);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: appTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: appTheme === 'dark' ? {
          colorBgContainer: darkModeColors.bgContainer,
          colorBgElevated: darkModeColors.bgElevated,
          colorBgLayout: darkModeColors.bgBase,
          colorBgSpotlight: darkModeColors.bgHover,
          colorText: darkModeColors.textPrimary,
          colorTextSecondary: darkModeColors.textSecondary,
          colorTextTertiary: darkModeColors.textTertiary,
          colorTextQuaternary: darkModeColors.textTertiary,
          colorBorder: darkModeColors.border,
          colorBorderSecondary: darkModeColors.borderLight,
          colorPrimary: darkModeColors.primary,
          colorPrimaryHover: darkModeColors.primaryHover,
          colorPrimaryActive: darkModeColors.primaryActive,
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: darkModeColors.primary,
        } : {},
        components: {
          ...(appTheme === 'dark' ? {
            Layout: {
              bodyBg: darkModeColors.bgBase,
              headerBg: darkModeColors.bgContainer,
              siderBg: darkModeColors.bgContainer,
              triggerBg: darkModeColors.bgHover,
              triggerColor: darkModeColors.textPrimary,
            },
          } : {}),
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemSelectedBg: appTheme === 'dark' ? 'rgba(88, 166, 255, 0.12)' : '#dbeafe',
            itemSelectedColor: appTheme === 'dark' ? darkModeColors.primary : '#1677ff',
            itemHoverBg: appTheme === 'dark' ? darkModeColors.bgHover : '#f8fafc',
            itemActiveBg: appTheme === 'dark' ? darkModeColors.bgActive : '#eff6ff',
            itemColor: appTheme === 'dark' ? darkModeColors.textPrimary : 'rgba(0, 0, 0, 0.88)',
            itemHeight: 42,
            itemMarginBlock: 2,
            itemMarginInline: 2,
            itemPaddingInline: 12,
            iconMarginInlineEnd: 10,
            collapsedWidth: 56,
            collapsedIconSize: 18,
            itemBorderRadius: 12,
          },
          ...(appTheme === 'dark' ? {
            Card: {
              headerBg: darkModeColors.bgElevated,
              actionsBg: darkModeColors.bgElevated,
              colorTextHeading: darkModeColors.textPrimary,
              colorText: darkModeColors.textPrimary,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
              borderColor: darkModeColors.border,
            },
          } : {}),
          ...(appTheme === 'dark' ? {
          Input: {
            colorBgContainer: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
            colorTextPlaceholder: darkModeColors.textTertiary,
            colorBorder: darkModeColors.border,
            colorPrimaryHover: darkModeColors.primaryHover,
            activeBorderColor: darkModeColors.primary,
            hoverBorderColor: darkModeColors.borderHover,
            activeShadow: '0 0 0 2px rgba(88, 166, 255, 0.2)',
          },
          Button: {
            colorText: darkModeColors.textPrimary,
            defaultBg: darkModeColors.bgElevated,
            defaultBorderColor: darkModeColors.border,
            defaultColor: darkModeColors.textPrimary,
            defaultHoverBg: darkModeColors.bgHover,
            defaultHoverBorderColor: darkModeColors.borderHover,
            defaultHoverColor: darkModeColors.textPrimary,
            defaultActiveBg: darkModeColors.bgActive,
            defaultActiveBorderColor: darkModeColors.primary,
            primaryColor: '#ffffff',
            primaryShadow: 'none',
            boxShadow: 'none',
            boxShadowSecondary: 'none',
          },
          Table: {
            colorBgContainer: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
            colorTextHeading: darkModeColors.textPrimary,
            borderColor: darkModeColors.border,
            headerBg: darkModeColors.bgContainer,
            headerColor: darkModeColors.textPrimary,
            headerSplitColor: darkModeColors.border,
            rowHoverBg: darkModeColors.bgHover,
            rowSelectedBg: 'rgba(88, 166, 255, 0.08)',
            rowSelectedHoverBg: 'rgba(88, 166, 255, 0.12)',
            footerBg: darkModeColors.bgContainer,
            stickyScrollBarBg: darkModeColors.border,
          },
          Drawer: {
            colorBgElevated: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
            headerBg: darkModeColors.bgElevated,
            footerBg: darkModeColors.bgElevated,
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
          },
          Modal: {
            contentBg: darkModeColors.bgElevated,
            headerBg: darkModeColors.bgElevated,
            titleColor: darkModeColors.textPrimary,
            colorText: darkModeColors.textPrimary,
            footerBg: darkModeColors.bgElevated,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
          },
          Select: {
            colorBgContainer: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
            colorBorder: darkModeColors.border,
            colorPrimaryHover: darkModeColors.primaryHover,
            activeBorderColor: darkModeColors.primary,
            hoverBorderColor: darkModeColors.borderHover,
            optionSelectedBg: 'rgba(88, 166, 255, 0.12)',
            optionActiveBg: darkModeColors.bgHover,
            activeShadow: '0 0 0 2px rgba(88, 166, 255, 0.2)',
          },
          Form: {
            labelColor: darkModeColors.textPrimary,
          },
          Divider: {
            colorSplit: darkModeColors.border,
          },
          Typography: {
            colorText: darkModeColors.textPrimary,
            colorTextSecondary: darkModeColors.textSecondary,
            colorTextTertiary: darkModeColors.textTertiary,
          },
          Tag: {
            defaultBg: darkModeColors.bgHover,
            defaultColor: darkModeColors.textPrimary,
          },
          Pagination: {
            itemBg: darkModeColors.bgElevated,
            itemActiveBg: darkModeColors.primary,
            itemLinkBg: darkModeColors.bgElevated,
            itemInputBg: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
            colorTextDisabled: darkModeColors.textTertiary,
          },
          Tabs: {
            itemColor: darkModeColors.textSecondary,
            itemSelectedColor: darkModeColors.primary,
            itemHoverColor: darkModeColors.textPrimary,
            itemActiveColor: darkModeColors.primary,
            inkBarColor: darkModeColors.primary,
            cardBg: darkModeColors.bgElevated,
          },
          Dropdown: {
            colorBgElevated: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
          },
          Tooltip: {
            colorBg: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
          },
          Popover: {
            colorBgElevated: darkModeColors.bgElevated,
            colorText: darkModeColors.textPrimary,
          },
          Spin: {
            colorPrimary: darkModeColors.primary,
          },
          Empty: {
            colorText: darkModeColors.textSecondary,
          },
          FloatButton: {
            colorPrimary: darkModeColors.primary,
            colorPrimaryHover: darkModeColors.primaryHover,
            colorBgElevated: darkModeColors.bgContainer,
            colorText: darkModeColors.textPrimary,
            colorBorder: darkModeColors.border,
          },
        } : {}),
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '64px',
            zIndex: 1000,
            padding: 0,
            background: appTheme === 'dark' ? darkModeColors.bgContainer : '#fff',
            borderBottom: appTheme === 'dark' ? `1px solid ${darkModeColors.border}` : '1px solid #f0f0f0',
            boxShadow: appTheme === 'dark' 
              ? '0 1px 0 rgba(48, 54, 61, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)'
              : '0 1px 0 rgba(226, 232, 240, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <HeaderContent
            isMobile={isMobile}
            appTheme={appTheme}
            setTheme={setTheme}
            setDrawerVisible={setDrawerVisible}
            projectSelector={projectSelector}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </Header>

        <Layout style={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
          {!isMobile && (
            <Sider
              width={216}
              collapsedWidth={56}
              collapsed={sidebarCollapsed}
              collapsible
              trigger={null}
              style={{
                background: appTheme === 'dark' ? darkModeColors.bgContainer : '#fff',
                height: 'calc(100vh - 64px)',
                position: 'fixed',
                left: 0,
                top: '64px',
                overflow: 'auto',
                overflowX: 'hidden',
                boxShadow: appTheme === 'dark'
                  ? '2px 0 8px rgba(0, 0, 0, 0.4), 1px 0 0 rgba(48, 54, 61, 0.5)'
                  : '2px 0 8px rgba(0, 0, 0, 0.08), 1px 0 0 rgba(226, 232, 240, 0.8)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 999,
                borderRight: appTheme === 'dark' ? `1px solid ${darkModeColors.border}` : '1px solid #f0f0f0',
              }}
            >
              <SidebarMenu
                isMobile={isMobile}
                drawerVisible={drawerVisible}
                setDrawerVisible={setDrawerVisible}
                appTheme={appTheme}
                activeKey={getActiveKey()}
                onMenuClick={({ key }) => handleMenuClick(key)}
                sidebarCollapsed={sidebarCollapsed}
              />
            </Sider>
          )}

          {isMobile && (
            <SidebarMenu
              isMobile={isMobile}
              drawerVisible={drawerVisible}
              setDrawerVisible={setDrawerVisible}
              appTheme={appTheme}
              activeKey={getActiveKey()}
              onMenuClick={({ key }) => handleMenuClick(key)}
              sidebarCollapsed={false}
            />
          )}

          <Layout
            style={{
              padding: '0',
              marginLeft: !isMobile ? (sidebarCollapsed ? '56px' : '216px') : '0',
              height: 'calc(100vh - 64px)',
              maxHeight: 'calc(100vh - 64px)',
              background: appTheme === 'dark' ? darkModeColors.bgBase : '#f5f5f5',
              width: '100%',
              transition: 'margin-left 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Content
              style={{
                margin: 0,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isUIEditorRoute ? '0' : '20px 10px 20px 20px',
                boxSizing: 'border-box',
              }}
            >
              {currentProject?.id || isProjectOptionalRoute ? (
                <Outlet />
              ) : (
                <div
                  style={{
                    minHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isUIEditorRoute ? '24px' : '12px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 760,
                      borderRadius: 24,
                      padding: '40px 32px',
                      background: appTheme === 'dark' ? darkModeColors.bgContainer : '#ffffff',
                      border: appTheme === 'dark' ? `1px solid ${darkModeColors.border}` : '1px solid #e5e7eb',
                      boxShadow: appTheme === 'dark'
                        ? '0 20px 40px rgba(0, 0, 0, 0.35)'
                        : '0 18px 40px rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <Space direction="vertical" size={18} style={{ width: '100%', alignItems: 'center', textAlign: 'center' }}>
                      <Empty
                        description={false}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginBottom: 0 }}
                      />
                      <Title level={3} style={{ margin: 0 }}>
                        {projects.length > 0 ? 'Select a project to get started' : 'No project available yet'}
                      </Title>
                      <Text type="secondary" style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.7 }}>
                        {projects.length > 0
                          ? 'You already have project access. Open the project selector in the header and choose a project to continue.'
                          : canCreateProject
                            ? 'You do not have any project yet. Create your first project to start working in DPS.'
                            : 'Your account is ready, but no project is assigned yet. Ask a system admin to grant project access, or use the button below if project creation is enabled for you.'}
                      </Text>
                      <Space size={12} wrap style={{ justifyContent: 'center' }}>
                        {projects.length > 0 ? (
                          <Button type="primary" onClick={() => message.info('Please choose a project from the selector at the top-left.')}>
                            Choose Project
                          </Button>
                        ) : null}
                        {canCreateProject ? (
                          <Button type="primary" onClick={handleCreateProject}>
                            Create Your First Project
                          </Button>
                        ) : null}
                        <Button onClick={() => navigate('/projects')}>
                          Show Projects
                        </Button>
                      </Space>
                    </Space>
                  </div>
                </div>
              )}
            </Content>

            {/* Floating Action Button with Hover Menu */}
            <div
              style={{
                position: 'fixed',
                right: 24,
                bottom: 24,
                zIndex: 2147483647,
                paddingTop: 12,
                paddingLeft: 12,
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Hover Menu */}
              <div
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 14px)',
                  bottom: 56,
                  minWidth: 196,
                  overflow: 'hidden',
                  borderRadius: 14,
                  background: appTheme === 'dark' ? darkModeColors.bgElevated : '#fff',
                  border: appTheme === 'dark' ? `1px solid ${darkModeColors.border}` : '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: appTheme === 'dark'
                    ? '0 18px 40px rgba(0, 0, 0, 0.45), 0 8px 18px rgba(0, 0, 0, 0.3)'
                    : '0 20px 45px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(15, 23, 42, 0.1)',
                  opacity: floatMenuOpen ? 1 : 0,
                  transform: floatMenuOpen ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(10px, 12px, 0) scale(0.96)',
                  transformOrigin: 'bottom right',
                  transition: 'opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease',
                  pointerEvents: floatMenuOpen ? 'auto' : 'none',
                  willChange: 'opacity, transform',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Menu
                  items={floatMenuItems}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                  }}
                  onClick={({ key }) => {
                    const item = floatMenuItems.find(i => i.key === key);
                    if (item) item.onClick();
                  }}
                />
              </div>

              {/* Main Floating Button */}
              <FloatButton
                ref={floatButtonRef}
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                tooltip={floatMenuOpen ? null : "Quick Actions"}
                style={{
                  boxShadow: appTheme === 'dark'
                    ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(88, 166, 255, 0.3)'
                    : '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(24, 144, 255, 0.3)',
                  transform: isHovering ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease',
                }}
                onClick={() => {
                  if (floatMenuCloseTimeoutRef.current) {
                    clearTimeout(floatMenuCloseTimeoutRef.current);
                    floatMenuCloseTimeoutRef.current = null;
                  }

                  if (!floatMenuOpen) {
                    setIsHovering(true);
                    setFloatMenuOpen(true);
                  } else {
                    setIsHovering(false);
                    setFloatMenuOpen(false);
                  }
                }}
              />
            </div>
          </Layout>
        </Layout>
      </Layout>

      {/* UI Canvas Creation Drawer */}
      <Drawer
        title="Create New UI Canvas"
        placement="right"
        onClose={() => setUICanvasDrawerVisible(false)}
        open={uiCanvasDrawerVisible}
        width={400}
        styles={{
          body: {
            padding: '24px',
          },
          header: {
            borderBottom: `1px solid ${appTheme === 'dark' ? darkModeColors.border : '#f0f0f0'}`,
          },
          footer: {
            borderTop: `1px solid ${appTheme === 'dark' ? darkModeColors.border : '#f0f0f0'}`,
          },
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={() => setUICanvasDrawerVisible(false)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleCreateUICanvas}
              loading={uiCanvasLoading}
            >
              Create
            </Button>
          </div>
        }
      >
        <Form
          form={uiCanvasForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label="Canvas Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter a canvas name' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 50, message: 'Name cannot exceed 50 characters' },
            ]}
          >
            <Input 
              placeholder="Enter canvas name" 
              size="large"
              autoFocus
            />
          </Form.Item>
          
          <div style={{ marginTop: '16px', padding: '12px', background: appTheme === 'dark' ? 'rgba(88, 166, 255, 0.1)' : '#f0f8ff', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: appTheme === 'dark' ? darkModeColors.textSecondary : '#666' }}>
              <strong>Note:</strong> This will create a new UI Canvas and add it to your project. 
              You can add components and design the interface after creation.
            </p>
          </div>
        </Form>
      </Drawer>

      {/* API Canvas Creation Drawer */}
      <Drawer
        title="Create New API Canvas"
        placement="right"
        onClose={() => setApiCanvasDrawerVisible(false)}
        open={apiCanvasDrawerVisible}
        width={400}
        styles={{
          body: {
            padding: '24px',
          },
          header: {
            borderBottom: `1px solid ${appTheme === 'dark' ? darkModeColors.border : '#f0f0f0'}`,
          },
          footer: {
            borderTop: `1px solid ${appTheme === 'dark' ? darkModeColors.border : '#f0f0f0'}`,
          },
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={() => setApiCanvasDrawerVisible(false)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleCreateAPICanvas}
              loading={apiCanvasLoading}
            >
              Create
            </Button>
          </div>
        }
      >
        <Form
          form={apiCanvasForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label="API Canvas Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter an API canvas name' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 50, message: 'Name cannot exceed 50 characters' },
            ]}
          >
            <Input 
              placeholder="Enter API canvas name" 
              size="large"
              autoFocus
            />
          </Form.Item>
          
          <div style={{ marginTop: '16px', padding: '12px', background: appTheme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#f0fff4', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: appTheme === 'dark' ? darkModeColors.textSecondary : '#666' }}>
              <strong>Note:</strong> This will create a new API Canvas with a default POST endpoint. 
              You can configure endpoints, request/response bodies, and operations after creation.
            </p>
          </div>
        </Form>
      </Drawer>

      {/* Create Issue Drawer */}
      <CreateIssueDrawer
        open={createIssueDrawerVisible}
        onClose={() => setCreateIssueDrawerVisible(false)}
        createIssue={handleCreateIssue}
      />

      {/* Add CSS animation for menu */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ConfigProvider>
  );
};

export default MainLayout;





