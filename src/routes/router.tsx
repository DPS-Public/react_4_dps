import { createBrowserRouter, RouteObject, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { Spin } from 'antd';
import React from 'react';

// Import all your components
import MainLayout from '../components/Layout/MainLayout';
import UICanvas from '../ui-canvas/uic_ui_canvas/uicUICanvas';
import APICanvas from '@/ui-canvas/uicApiCanvas/uicApiCanvas';
import CanvasUINotFound from '@/ui-canvas/ui_canvas_notFound/ui_canvas_NotFound';
import Login from '@/ui-canvas/canvas-login-page/canvas-login-component';
import CanvasGithubAI from '@/ui-canvas/canvas_github_contents_ai/CanvasGithubAI';
import ApiEditor from '@/ui-canvas/uic_api_testing/uicApiTesting';
import { Backlog } from '@/ui-canvas/uic_backlog_canvas/uicBacklogCanvas';
import SettingsUserManagment from '@/ui-canvas/canvas_settings/SettingsUserManagment';
import GithubSettingsManagment from '@/ui-canvas/canvas_settings/GithubSettingsManagment';
import { useAppSelector } from '@/store';
import CanvasDashBoard from '@/ui-canvas/canvas_dashboard/CanvasDashBoard';
import UICanvasLivePreview from "@/components/ui-canvas/UICanvasLivePreview.tsx";
import { useAuth } from '@/auth/AuthContext';
import Signup from '@/ui-canvas/canvas-register-page/canvas_register_comp';
import CanvasForgetPass from '@/ui-canvas/canvas_forget_pass/CanvasForgetPass';
import CanvasResetPass from '@/ui-canvas/canvas_reset_pass/CanvasResetPass';
import AcceptGithub from '@/ui-canvas/canvas_accept_github/AcceptGithub';
import AllNotifications from '@/pages/AllNotifications';
import UIEditorCanvas from '@/ui-canvas/ui-editor/UIEditorCanvas';
import SharedCanvasView from '@/pages/SharedCanvasView';
import SharedAPICanvasView from '@/pages/SharedAPICanvasView';
import Profile from '@/pages/Profile';
import UserProfile from '@/pages/UserProfile';
import DataFlowPage from '@/pages/DataFlowPage';
import ProjectCanvas from '@/ui-canvas/projects-canvas/ProjectCanvas';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SystemSettingsPage from '@/pages/SystemSettingsPage';
import ProjectUserRegisterPage from '@/pages/ProjectUserRegisterPage';
import SystemAdminRegisterPage from '@/pages/SystemAdminRegisterPage';
import { CrudAction } from '@/utils/projectPermissions';
import { hasModuleAccessFromCache, selectProjectPermissions } from '@/store/slices/permissions';
import { useProjectPermissions } from '@/hooks/useProjectPermissions';
import UserParformanceManagment, { AssigneeAnalyticsPerformanceManagment } from '@/ui-canvas/performance-managment/userParformanceManagment';

interface PermissionsContextType {
  checkAccess: (moduleId: string, requiredPermission?: CrudAction | 'admin') => boolean;
  isPermissionsLoading: boolean;
  isPermissionsResolved: boolean;
}

// ============================================
// PERMISSIONS CONTEXT
// ============================================
const PermissionsContext = createContext<PermissionsContextType | null>(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

// ============================================
// PERMISSIONS PROVIDER - M?rk?zl?sdirilmis yükl?m?
// ============================================
const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const { isLoading } = useProjectPermissions();
  const cachedPermissions = useAppSelector((state) =>
    selectProjectPermissions(state, currentProject?.id || '')
  );

  const checkAccess = (moduleId: string, requiredPermission: CrudAction | 'admin' = 'read'): boolean => {
    if (!currentProject?.id) {
      return true;
    }

    if (!cachedPermissions || isLoading) {
      return false;
    }

    if (requiredPermission === 'admin') {
      return cachedPermissions.isAdmin;
    }

    return hasModuleAccessFromCache(cachedPermissions, moduleId, requiredPermission);
  };

  return (
    <PermissionsContext.Provider
      value={{
        checkAccess,
        isPermissionsLoading: isLoading,
        isPermissionsResolved: !currentProject?.id || Boolean(cachedPermissions),
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

// ============================================
// GLOBAL LOADING - Sad?c? ilk yükl?nm?d?
// ============================================
const InitialLoadingScreen = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <Spin size="large" />
      <p style={{ marginTop: 16, color: '#666' }}>Loading application...</p>
    </div>
  </div>
);

const ModuleLoadingScreen = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 64px)',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      padding: 24,
    }}
  >
    <div
      style={{
        minWidth: 280,
        padding: 32,
        borderRadius: 24,
        background: '#ffffff',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
        textAlign: 'center',
      }}
    >
      <Spin size="large" />
      <p style={{ marginTop: 16, color: '#475569', fontSize: 16 }}>
        Loading permissions...
      </p>
    </div>
  </div>
);

// ============================================
// AUTH PROTECTED ROUTE - Sad?l?sdirilmis
// ============================================
const AuthProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading, token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !token)) {
      const fullPath = location.pathname + location.search + location.hash;
      sessionStorage.setItem("redirectAfterLogin", fullPath);
    }
  }, [user, loading, token, location]);

  if (loading) {
    return <InitialLoadingScreen />;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ============================================
// MODULE PROTECTED ROUTE - Loading YOXDUR
// ============================================
const ModuleProtectedRoute: React.FC<{
  children: React.ReactNode;
  moduleId: string;
  requiredPermission?: CrudAction | 'admin';
}> = ({ children, moduleId, requiredPermission = 'read' }) => {
  const { checkAccess, isPermissionsLoading, isPermissionsResolved } = usePermissions();
  const { isSystemAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const systemAdminEmail = String(import.meta.env.VITE_SYSTEM_ADMIN_EMAIL || '').trim().toLowerCase();
  const hasSystemSettingsAccess =
    moduleId === 'system_settings' &&
    (isSystemAdmin || String(userProfile?.email || '').trim().toLowerCase() === systemAdminEmail);

  // Layih? seçilm?yibs?, birbasa göst?r
  if (!currentProject?.id) {
    return hasSystemSettingsAccess ? <>{children}</> : <>{children}</>;
  }

  if (hasSystemSettingsAccess) {
    return <>{children}</>;
  }

  if (isPermissionsLoading || !isPermissionsResolved) {
    return <ModuleLoadingScreen />;
  }

  const hasAccess = checkAccess(moduleId, requiredPermission);

  if (!hasAccess) {
    return <AccessDenied moduleId={moduleId} onGoHome={() => navigate('/dashboard')} />;
  }

  return <>{children}</>;
};

// ============================================
// ACCESS DENIED - Sad?l?sdirilmis
// ============================================
const AccessDenied: React.FC<{ moduleId: string; onGoHome: () => void }> = ({ moduleId, onGoHome }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-9V4m0 7h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access <span className="font-semibold text-blue-600">{moduleId}</span>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Go Back
          </button>
          <button
            onClick={onGoHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ROUTE ELEMENT FACTORY - Sad?l?sdirilmis
// ============================================
const createRouteElement = (
  Component: React.ComponentType, 
  moduleId: string, 
  requiredPermission: CrudAction | 'admin' = 'read'
) => (
  <ModuleProtectedRoute moduleId={moduleId} requiredPermission={requiredPermission}>
    <Component />
  </ModuleProtectedRoute>
);

// ============================================
// ROUTES
// ============================================
const routes: RouteObject[] = [
  {
    path: "/ui-canvas/preview/:canvasId",
    element: <UICanvasLivePreview />
  },
  {
    path: "/ui-canvas/share/:shareToken",
    element: <SharedCanvasView />
  },
  {
    path: "/api-canvas/share/:shareToken",
    element: <SharedAPICanvasView />
  },
  {
    path: '/',
    element: (
      <AuthProtectedRoute>
        <PermissionsProvider>
          <MainLayout />
        </PermissionsProvider>
      </AuthProtectedRoute>
    ),
    errorElement: <CanvasUINotFound />,
    children: [
      { path: 'dashboard', element: createRouteElement(CanvasDashBoard, 'dashboard') },
      { path: 'ui-canvas', element: createRouteElement(UICanvas, 'ui-canvas') },
      { path: 'analytics', element: createRouteElement(() => <AnalyticsPage view="general" />, 'analytics') },
      { path: 'ui-canvas-analytics', element: createRouteElement(UserParformanceManagment, 'ui_canvas_analytics') },
      { path: 'ui-canvas-reports', element: createRouteElement(() => <AnalyticsPage view="reports" />, 'ui_canvas_reports') },
      { path: 'assignee-analytics', element: createRouteElement(AssigneeAnalyticsPerformanceManagment, 'assignee_analytics') },
      { path: 'ui-editor', element: createRouteElement(UIEditorCanvas, 'ui-editor') },
      { path: 'data-flow', element: createRouteElement(DataFlowPage, 'data-flow') },
      { path: 'api', element: createRouteElement(APICanvas, 'api') },
      { path: 'api-testing', element: createRouteElement(ApiEditor, 'api-testing') },
      { path: 'code-builder', element: createRouteElement(CanvasGithubAI, 'code-builder') },
      { path: 'backlog-canvas', element: createRouteElement(Backlog, 'backlog-canvas') },
      { path: 'settings/user-management-settings', element: createRouteElement(SettingsUserManagment, 'settings/user-management-settings', 'admin') },
      { path: 'settings/github-repositories', element: createRouteElement(GithubSettingsManagment, 'settings/github-repositories') },
      { path: 'system-settings', element: createRouteElement(SystemSettingsPage, 'system_settings') },
      { path: 'notifications', element: <AllNotifications /> },
      { path: 'projects', element: <ProjectCanvas /> },
      { path: 'profile', element: <Profile /> },
      { path: 'user-profile/:id', element: <UserProfile /> },
      { path: '*', element: <CanvasUINotFound /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/accept-github", element: <AcceptGithub /> },
  { path: "/forgot-password", element: <CanvasForgetPass /> },
  { path: "/reset-password", element: <CanvasResetPass /> },
  { path: "/system-admin-register/:invitationId", element: <SystemAdminRegisterPage /> },
  { path: "/project-user-register/:invitationId", element: <ProjectUserRegisterPage /> },
  { path: "/project-access-register/:invitationId", element: <ProjectUserRegisterPage /> },
  { path: "*", element: <Navigate to="/login" replace /> }
];

export const router = createBrowserRouter(routes);
