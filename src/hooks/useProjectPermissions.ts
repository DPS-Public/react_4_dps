import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setProjectPermissions, selectProjectPermissions, setLoading } from '@/store/slices/permissions';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  ADMIN_ONLY_MODULE_IDS,
  getAllModuleOptions,
  getDefaultSystemRoles, 
  isAdminPermission,
  mergeRolesWithSystemRoles,
} from '@/utils/projectPermissions';
import { RoleDefinition, ProjectPermissionUser } from '@/utils/projectPermissions';

interface ProjectModulePermissions {
  [moduleId: string]: {
    enabled: boolean;
    expireDate: string | null;
  };
}

const buildModulePermissionsFromRole = ({
  permissionDoc,
  userPermission,
  isAdmin,
  availableRoles,
}: {
  permissionDoc: Record<string, any>;
  userPermission: ProjectPermissionUser | null;
  isAdmin: boolean;
  availableRoles: RoleDefinition[];
}): ProjectModulePermissions => {
  const allModuleIds = getAllModuleOptions().map((moduleItem) => moduleItem.id);

  const modulesFromRecord = (record: Record<string, any> | undefined) => {
    const result: ProjectModulePermissions = {};

    Object.entries(record || {}).forEach(([moduleId, value]) => {
      if (!allModuleIds.includes(moduleId)) return;

      if (typeof value === 'boolean') {
        result[moduleId] = {
          enabled: value,
          expireDate: null,
        };
        return;
      }

      if (value && typeof value === 'object') {
        result[moduleId] = {
          enabled: Boolean((value as any).enabled ?? (value as any).access ?? (value as any).read),
          expireDate: (value as any).expireDate || null,
        };
      }
    });

    return result;
  };

  const modulesFromArray = (items: unknown) => {
    const result: ProjectModulePermissions = {};

    if (!Array.isArray(items)) return result;

    items.forEach((item) => {
      const moduleId = String(item || '').trim();
      if (!moduleId || !allModuleIds.includes(moduleId)) return;

      result[moduleId] = {
        enabled: true,
        expireDate: null,
      };
    });

    return result;
  };

  const directModules = modulesFromRecord(permissionDoc?.modules);
  const modulePermissions = modulesFromRecord(permissionDoc?.module_permissions);
  const pageAccess = modulesFromRecord(permissionDoc?.page_access);
  const allowedModules = modulesFromArray(permissionDoc?.allowed_modules);
  const accessibleModules = modulesFromArray(permissionDoc?.accessible_modules);
  const customRoles = Array.isArray(permissionDoc?.custom_roles) ? permissionDoc.custom_roles : [];
  const fallbackRoleId = String(
    userPermission?.role_id ||
    userPermission?.permission_type ||
    customRoles[0] ||
    ''
  ).toLowerCase();

  const mergedExplicitPermissions = {
    ...directModules,
    ...modulePermissions,
    ...pageAccess,
    ...allowedModules,
    ...accessibleModules,
  };
  const hasExplicitModuleAssignments = Object.keys(mergedExplicitPermissions).length > 0;
  const matchedRole = availableRoles.find((role) => role.id === fallbackRoleId) || null;

  return getAllModuleOptions().reduce<ProjectModulePermissions>((acc, moduleItem) => {
    if (isAdmin) {
      acc[moduleItem.id] = {
        enabled: true,
        expireDate: null,
      };
      return acc;
    }

    const resolvedPermission =
      directModules[moduleItem.id] ||
      modulePermissions[moduleItem.id] ||
      pageAccess[moduleItem.id] ||
      allowedModules[moduleItem.id] ||
      accessibleModules[moduleItem.id];

    if (!hasExplicitModuleAssignments && userPermission) {
      const rolePermission = matchedRole?.permissions?.[moduleItem.id];
      acc[moduleItem.id] = {
        enabled: Boolean(
          rolePermission?.access &&
          !ADMIN_ONLY_MODULE_IDS.includes(moduleItem.id as (typeof ADMIN_ONLY_MODULE_IDS)[number])
        ),
        expireDate: null,
      };
      return acc;
    }

    acc[moduleItem.id] = {
      enabled: Boolean(
        resolvedPermission?.enabled ||
        (fallbackRoleId === moduleItem.id && fallbackRoleId !== 'admin')
      ),
      expireDate: resolvedPermission?.expireDate || null,
    };

    return acc;
  }, {});
};

interface UseProjectPermissionsReturn {
  isLoading: boolean;
  isInitialized: boolean;
}

export const useProjectPermissions = (): UseProjectPermissionsReturn => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.currentUser);
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const cachedPermissions = useAppSelector((state) =>
    selectProjectPermissions(state, currentProject?.id || '')
  );
  const { isInitialized } = useAppSelector((state) => state.permissions);
  
  const loadPermissions = useCallback(async (projectId: string) => {
    if (!authUser || !projectId) {
      dispatch(setLoading(false));
      return;
    }

    dispatch(setLoading(true));

    try {
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        dispatch(setLoading(false));
        return;
      }

      const isProjectOwner = currentUser.uid === currentProject?.userId;

      const [userProjectPermissionSnap, projectRolesSnap] = await Promise.all([
        getDoc(doc(db, "user_project_permissions", `${currentUser.uid}_${projectId}`)),
        getDoc(doc(db, "project_roles", projectId)),
      ]);

      let userPermission: ProjectPermissionUser | null = null;
      let roles: RoleDefinition[] = getDefaultSystemRoles();
      let permissionDoc: Record<string, any> = {};
      if (projectRolesSnap.exists()) {
        const roleDocData = projectRolesSnap.data() as any;
        roles = mergeRolesWithSystemRoles(roleDocData?.roles);
      }

      if (userProjectPermissionSnap.exists()) {
        const data = userProjectPermissionSnap.data() as any;
        permissionDoc = data || {};
        const systemRoles = Array.isArray(data?.system_roles) ? data.system_roles : [];
        const customRoles = Array.isArray(data?.custom_roles) ? data.custom_roles : [];
        const roleId = systemRoles.includes("admin")
          ? "admin"
          : String(customRoles[0] || data?.role_id || data?.permission_type || "").toLowerCase();
        userPermission = {
          uid: currentUser.uid,
          permission_type: roleId || "viewer",
          role_id: roleId || "viewer",
          created_at: data?.updatedAt || data?.createdAt || new Date().toISOString(),
          created_by: data?.updatedBy || data?.createdBy || currentUser.uid,
        };
      }

      const isAdmin = isProjectOwner || isAdminPermission(userPermission);
      const modulePermissions = buildModulePermissionsFromRole({
        permissionDoc,
        userPermission,
        isAdmin,
        availableRoles: roles,
      });

      dispatch(setProjectPermissions({
        projectId,
        modulePermissions,
        userPermission,
        roles,
        isAdmin,
        isProjectOwner,
      }));
    } catch (error) {
      console.error('Error loading project permissions:', error);
      dispatch(setLoading(false));
    }
  }, [authUser, currentProject?.userId, dispatch]);

  useEffect(() => {
    if (!currentProject?.id || !authUser) {
      dispatch(setLoading(false));
      return;
    }

    if (!cachedPermissions?.isCacheValid) {
      loadPermissions(currentProject.id);
      return;
    }

    dispatch(setLoading(false));
  }, [authUser, cachedPermissions?.isCacheValid, currentProject?.id, dispatch, loadPermissions]);

  const isLoading = useAppSelector((state) => state.permissions.isLoading);

  return {
    isLoading,
    isInitialized: isInitialized || Boolean(cachedPermissions),
  };
};
