import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Menu, Spin } from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BuildOutlined,
  ContainerOutlined,
  CodeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GithubOutlined,
  NodeIndexOutlined,
  SettingOutlined,
  TeamOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import defaultModulesData from '@/configs/defaultModules.json';
import {
  selectPermissionsLoading,
  selectProjectPermissions,
  hasModuleAccessFromCache,
} from '@/store/slices/permissions';

const { SubMenu } = Menu;

const CACHE_CONFIG = {
  MODULES_KEY: 'cached_modules_v3',
  CACHE_DURATION: 5 * 60 * 1000,
};

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  analytics: <BarChartOutlined />,
  ui_canvas_analytics: <AppstoreOutlined />,
  ui_canvas_reports: <FileTextOutlined />,
  assignee_analytics: <TeamOutlined />,
  'ui-canvas': <AppstoreOutlined />,
  'ui-canvas/analytics': <AppstoreOutlined />,
  'ui-canvas/reports': <FileTextOutlined />,
  'ui-canvas/assignee-analytics': <TeamOutlined />,
  'ui-editor': <BuildOutlined />,
  'data-flow': <NodeIndexOutlined />,
  api: <ApiOutlined />,
  'api-testing': <BugOutlined />,
  'code-builder': <CodeOutlined />,
  'backlog-canvas': <ContainerOutlined />,
  settings: <SettingOutlined />,
  system_settings: <SettingOutlined />,
  'settings/user-management-settings': <TeamOutlined />,
  'settings/github-repositories': <GithubOutlined />,
};

const DefaultIcon = <AppstoreOutlined />;

interface FirestoreModule {
  module_id: string;
  module_name: string;
  status?: string;
  parent_id?: string | null;
  is_menu?: boolean;
  order?: number;
  route?: string;
}

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: MenuItem[];
  enabled?: boolean;
  order?: number;
  route?: string;
}

const getCachedModules = (): FirestoreModule[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_CONFIG.MODULES_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_CONFIG.CACHE_DURATION) {
      return data;
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
};

const setCachedModules = (modules: FirestoreModule[]): void => {
  try {
    localStorage.setItem(
      CACHE_CONFIG.MODULES_KEY,
      JSON.stringify({
        data: modules,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

const SidebarMenu = ({
  isMobile,
  drawerVisible,
  setDrawerVisible,
  appTheme,
  activeKey,
  sidebarCollapsed = false,
}: {
  isMobile: boolean;
  drawerVisible: boolean;
  setDrawerVisible: (visible: boolean) => void;
  appTheme: string;
  activeKey: string;
  sidebarCollapsed?: boolean;
}) => {
  const navigate = useNavigate();
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const cachedPermissions = useAppSelector((state) =>
    selectProjectPermissions(state, currentProject?.id || '')
  );
  const permissionsLoading = useAppSelector(selectPermissionsLoading);
  const systemAdminEmail = String(import.meta.env.VITE_SYSTEM_ADMIN_EMAIL || '').trim().toLowerCase();
  const isSystemAdminUser =
    Boolean(currentUser?.isSystemAdmin) ||
    String(currentUser?.email || '').trim().toLowerCase() === systemAdminEmail;

  const compactItemHeight = sidebarCollapsed ? 40 : 42;
  const compactItemStyle: React.CSSProperties = useMemo(
    () => ({
      opacity: 1,
      height: compactItemHeight,
      lineHeight: `${compactItemHeight}px`,
      margin: '2px 0',
      borderRadius: 12,
    }),
    [compactItemHeight]
  );

  const compactSubMenuStyle: React.CSSProperties = useMemo(
    () => ({
      opacity: 1,
      margin: '2px 0',
      borderRadius: 12,
      overflow: 'visible',
    }),
    []
  );

  const fetchModulesWithCache = (): FirestoreModule[] => {
    const cachedModules = getCachedModules();
    if (cachedModules) {
      return cachedModules;
    }

    try {
      const modules = (defaultModulesData as FirestoreModule[])
        .filter((moduleItem) => moduleItem.is_menu !== false && moduleItem.status === 'active')
        .sort((left, right) => (left.order || 999) - (right.order || 999));

      setCachedModules(modules);
      return modules;
    } catch (error) {
      console.error('Error loading modules:', error);
      return [];
    }
  };

  const convertModulesToMenuItems = (modules: FirestoreModule[]): MenuItem[] => {
    if (!modules.length) return [];

    const moduleMap = new Map<string, FirestoreModule>();
    const childrenMap = new Map<string, FirestoreModule[]>();

    modules.forEach((moduleItem) => {
      moduleMap.set(moduleItem.module_id, moduleItem);

      if (!childrenMap.has(moduleItem.module_id)) {
        childrenMap.set(moduleItem.module_id, []);
      }

      if (moduleItem.parent_id) {
        if (!childrenMap.has(moduleItem.parent_id)) {
          childrenMap.set(moduleItem.parent_id, []);
        }
        childrenMap.get(moduleItem.parent_id)?.push(moduleItem);
      }
    });

    const buildMenuItem = (moduleId: string): MenuItem | null => {
      const moduleItem = moduleMap.get(moduleId);
      if (!moduleItem) return null;

      const children = (childrenMap.get(moduleId) || []).sort(
        (left, right) => (left.order || 999) - (right.order || 999)
      );

      const menuItem: MenuItem = {
        key: moduleItem.module_id,
        icon: iconMap[moduleItem.module_id] || DefaultIcon,
        label: moduleItem.module_name,
        order: moduleItem.order,
        route: moduleItem.route,
      };

      if (children.length > 0) {
        const childItems = children
          .map((child) => buildMenuItem(child.module_id))
          .filter((item): item is MenuItem => item !== null);

        if (childItems.length > 0) {
          menuItem.children = childItems;
        }
      }

      return menuItem;
    };

    return modules
      .filter((moduleItem) => !moduleItem.parent_id || !moduleMap.has(moduleItem.parent_id))
      .sort((left, right) => (left.order || 999) - (right.order || 999))
      .map((moduleItem) => buildMenuItem(moduleItem.module_id))
      .filter((item): item is MenuItem => item !== null);
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] =>
    items
      .map((item) => {
        if (item.key === 'system_settings') {
          return isSystemAdminUser
            ? {
                ...item,
                enabled: true,
              }
            : null;
        }

        const moduleEnabled = cachedPermissions?.isAdmin
          ? true
          : cachedPermissions?.modulePermissions[item.key]?.enabled ?? false;
        const hasAccess = cachedPermissions?.isAdmin
          ? true
          : hasModuleAccessFromCache(cachedPermissions, item.key, 'read');

        if (item.children?.length) {
          const filteredChildren = filterMenuItems(item.children);
          const shouldShowParent = filteredChildren.length > 0 || (moduleEnabled && hasAccess);

          if (!shouldShowParent) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren,
            enabled: moduleEnabled && hasAccess,
          };
        }

        if (!moduleEnabled || !hasAccess) {
          return null;
        }

        return {
          ...item,
          enabled: true,
        };
      })
      .filter((item): item is MenuItem => item !== null);

  const loading = Boolean(currentProject?.id) && (permissionsLoading || !cachedPermissions);

  const findMenuItemByKey = (items: MenuItem[], key: string): MenuItem | null => {
    for (const item of items) {
      if (item.key === key) {
        return item;
      }

      if (item.children?.length) {
        const match = findMenuItemByKey(item.children, key);
        if (match) {
          return match;
        }
      }
    }

    return null;
  };

  const findParentKeys = (items: MenuItem[], key: string, parents: string[] = []): string[] => {
    for (const item of items) {
      if (item.key === key) {
        return parents;
      }

      if (item.children?.length) {
        const match = findParentKeys(item.children, key, [...parents, item.key]);
        if (match.length || item.children.some((child) => child.key === key)) {
          return match;
        }
      }
    }

    return [];
  };

  const filteredMenuItems = useMemo(() => {
    if (loading) {
      return [];
    }

    try {
      const modules = fetchModulesWithCache();
      const menuItems = convertModulesToMenuItems(modules);

      if (!currentProject?.id) {
        return isSystemAdminUser
          ? menuItems.filter((item) => item.key === 'system_settings').map((item) => ({
              ...item,
              enabled: true,
            }))
          : [];
      }

      return filterMenuItems(menuItems);
    } catch (error) {
      console.error('Error initializing menu:', error);
      return [
        {
          key: 'ui-canvas',
          icon: <AppstoreOutlined />,
          label: 'UI Canvas',
          enabled: true,
        },
      ];
    }
  }, [currentProject?.id, loading, cachedPermissions?.isAdmin, cachedPermissions?.userPermission?.role_id, cachedPermissions?.userPermission?.permission_type, JSON.stringify(cachedPermissions?.modulePermissions || {}), isSystemAdminUser]);

  const parentOpenKeys = useMemo(
    () => findParentKeys(filteredMenuItems, activeKey),
    [filteredMenuItems, activeKey]
  );
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    setOpenKeys((prev) => Array.from(new Set([...prev, ...parentOpenKeys])));
  }, [parentOpenKeys]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'system_settings') {
      if (!isSystemAdminUser) {
        navigate('/ui-canvas');
        return;
      }

      const matchedItem = findMenuItemByKey(filteredMenuItems, key);
      navigate(matchedItem?.route || `/${key}`);

      if (isMobile) {
        setDrawerVisible(false);
      }
      return;
    }

    const moduleEnabled = cachedPermissions?.isAdmin
      ? true
      : cachedPermissions?.modulePermissions[key]?.enabled ?? false;
    const hasAccess = cachedPermissions?.isAdmin
      ? true
      : hasModuleAccessFromCache(cachedPermissions, key, 'read');

    if ((!moduleEnabled || !hasAccess) && key !== 'ui-canvas') {
      navigate('/ui-canvas');
      return;
    }

    const matchedItem = findMenuItemByKey(filteredMenuItems, key);
    navigate(matchedItem?.route || `/${key}`);

    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const renderMenuItems = (items: MenuItem[]) =>
    items.map((item) => {
      if (item.children && item.children.length > 0) {
        return (
          <SubMenu
            key={item.key}
            icon={item.icon}
            style={{ ...compactSubMenuStyle, opacity: item.enabled ? 1 : 0.6 }}
            title={<span>{item.label}</span>}
            disabled={!item.enabled}
          >
            {renderMenuItems(item.children)}
          </SubMenu>
        );
      }

      return (
        <Menu.Item
          key={item.key}
          icon={item.icon}
          disabled={!item.enabled}
          style={{ ...compactItemStyle, opacity: item.enabled ? 1 : 0.6 }}
        >
          <span>{item.label}</span>
        </Menu.Item>
      );
    });

  if (loading) {
    const loadingMenu = (
      <Menu
        mode="inline"
        inlineIndent={12}
        style={{
          height: '100%',
          borderRight: 0,
          background: appTheme === 'dark' ? '#001529' : '#fff',
          padding: sidebarCollapsed ? '4px 2px' : '6px 4px',
        }}
      >
        <Menu.Item key="loading" disabled>
          <Spin size="small" style={{ marginRight: 8 }} />
          Loading...
        </Menu.Item>
      </Menu>
    );

    if (isMobile) {
      return (
        <Drawer
          title="Menu"
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
        >
          {loadingMenu}
        </Drawer>
      );
    }

    return loadingMenu;
  }

  const menuContent = (
    <Menu
      mode="inline"
      selectedKeys={[activeKey]}
      openKeys={openKeys}
      inlineIndent={12}
      style={{
        height: '100%',
        borderRight: 0,
        background: appTheme === 'dark' ? '#001529' : '#fff',
        padding: sidebarCollapsed ? '4px 2px' : '6px 4px',
      }}
      onOpenChange={(keys) => setOpenKeys(keys as string[])}
      onClick={handleMenuClick}
    >
      {renderMenuItems(filteredMenuItems)}
    </Menu>
  );

  if (isMobile) {
    return (
      <Drawer
        title={`Menu - ${currentProject?.name || 'Project'} ${cachedPermissions?.isAdmin ? '(Admin)' : ''}`}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        bodyStyle={{ padding: 0 }}
      >
        {menuContent}
      </Drawer>
    );
  }

  return menuContent;
};

export default SidebarMenu;
