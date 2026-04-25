import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RoleDefinition, ProjectPermissionUser } from "@/utils/projectPermissions";

export interface CachedPermissions {
  modulePermissions: Record<string, { enabled: boolean; expireDate: string | null }>;
  userPermission: ProjectPermissionUser | null;
  roles: RoleDefinition[];
  isAdmin: boolean;
  isProjectOwner: boolean;
  lastFetched: number;
}

interface PermissionsState {
  cachedPermissions: Record<string, CachedPermissions>; // keyed by projectId
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: PermissionsState = {
  cachedPermissions: {},
  isLoading: false,
  isInitialized: false,
};

const PERMISSIONS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    setProjectPermissions(
      state,
      action: PayloadAction<{
        projectId: string;
        modulePermissions: Record<string, { enabled: boolean; expireDate: string | null }>;
        userPermission: ProjectPermissionUser | null;
        roles: RoleDefinition[];
        isAdmin: boolean;
        isProjectOwner: boolean;
      }>
    ) {
      const { projectId, ...data } = action.payload;
      state.cachedPermissions[projectId] = {
        ...data,
        lastFetched: Date.now(),
      };
      state.isLoading = false;
      state.isInitialized = true;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearProjectPermissions(state, action: PayloadAction<string>) {
      delete state.cachedPermissions[action.payload];
    },
    clearAllPermissions(state) {
      state.cachedPermissions = {};
      state.isInitialized = false;
    },
    invalidateCache(state, action: PayloadAction<string>) {
      if (state.cachedPermissions[action.payload]) {
        state.cachedPermissions[action.payload].lastFetched = 0;
      }
    },
  },
});

export const {
  setProjectPermissions,
  setLoading,
  clearProjectPermissions,
  clearAllPermissions,
  invalidateCache,
} = permissionsSlice.actions;

// Selector to get cached permissions for a project
export const selectProjectPermissions = (state: { permissions: PermissionsState }, projectId: string) => {
  const cached = state.permissions.cachedPermissions[projectId];
  if (!cached) return null;

  // Check if cache is still valid (less than 5 minutes old)
  const isCacheValid = Date.now() - cached.lastFetched < PERMISSIONS_CACHE_DURATION;
  
  return {
    ...cached,
    isCacheValid,
  };
};

// Selector to check if permissions are loading
export const selectPermissionsLoading = (state: { permissions: PermissionsState }) => state.permissions.isLoading;

export const hasModuleAccessFromCache = (
  cached: CachedPermissions | null | undefined,
  moduleId: string,
  requiredPermission: 'read' | 'write' | 'update' | 'delete' = 'read'
) => {
  if (!cached) return false;

  if (cached.isAdmin) {
    return true;
  }

  const moduleConfig = cached.modulePermissions[moduleId];
  if (!moduleConfig?.enabled) {
    return false;
  }

  if (!cached.roles?.length || !cached.userPermission) {
    return true;
  }

  const matchedRole = cached.roles.find(
    (role) => role.id === String(cached.userPermission?.role_id || cached.userPermission?.permission_type || '').toLowerCase()
  );
  if (!matchedRole) {
    return true;
  }

  const modulePermission = matchedRole.permissions?.[moduleId];
  return Boolean(modulePermission?.access && modulePermission?.[requiredPermission]);
};

export const selectHasModuleAccess = (
  state: { permissions: PermissionsState },
  projectId: string,
  moduleId: string,
  requiredPermission: 'read' | 'write' | 'update' | 'delete' = 'read'
) => {
  const cached = state.permissions.cachedPermissions[projectId];
  return hasModuleAccessFromCache(cached, moduleId, requiredPermission);
};

export const permissionsReducer = permissionsSlice.reducer;
