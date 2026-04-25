import defaultModules from '@/configs/defaultModules.json';

export const USER_MANAGEMENT_MODULE_ID = 'settings/user-management-settings';
export const SYSTEM_SETTINGS_MODULE_ID = 'system_settings';
export const ADMIN_ONLY_MODULE_IDS = [
  USER_MANAGEMENT_MODULE_ID,
  SYSTEM_SETTINGS_MODULE_ID,
] as const;
export const CRUD_ACTIONS = ['read', 'write', 'update', 'delete'] as const;

export type CrudAction = (typeof CRUD_ACTIONS)[number];

export interface RoleModulePermission {
  access: boolean;
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: Record<string, RoleModulePermission>;
  isSystem?: boolean;
}

export interface ProjectPermissionUser {
  uid: string;
  permission_type: string;
  role_id?: string;
  created_at?: unknown;
  created_by?: string;
}

export interface ModuleOption {
  id: string;
  name: string;
}

const DEFAULT_ROLE_ORDER = ['admin'];

export const createModulePermission = (
  access = true,
  overrides: Partial<RoleModulePermission> = {}
): RoleModulePermission => ({
  access,
  read: access,
  write: access,
  update: access,
  delete: access,
  ...overrides,
});

export const getAllModuleOptions = (): ModuleOption[] =>
  (defaultModules as Array<{ module_id?: string; module_name?: string; status?: string }>)
    .filter((moduleItem) => moduleItem.status === 'active' && moduleItem.module_id)
    .map((moduleItem) => ({
      id: String(moduleItem.module_id).trim(),
      name: String(moduleItem.module_name || moduleItem.module_id).trim(),
    }));

export const getRoleConfigurableModules = (): ModuleOption[] =>
  getAllModuleOptions().filter((moduleItem) => !ADMIN_ONLY_MODULE_IDS.includes(moduleItem.id as (typeof ADMIN_ONLY_MODULE_IDS)[number]));

export const getModuleIds = (): string[] => getAllModuleOptions().map((moduleItem) => moduleItem.id);

export const createPermissionsForModules = (
  moduleIds: string[],
  permissionFactory: (moduleId: string) => RoleModulePermission
): Record<string, RoleModulePermission> =>
  moduleIds.reduce<Record<string, RoleModulePermission>>((acc, moduleId) => {
    acc[moduleId] = permissionFactory(moduleId);
    return acc;
  }, {});

export const getDefaultSystemRoles = (): RoleDefinition[] => {
  const moduleIds = getModuleIds();

  // YALNIZ Admin qaytarılır - Editor, Reviewer, Viewer SİLİNDİ
  return [
    {
      id: 'admin',
      name: 'Admin',
      isSystem: true,
      permissions: createPermissionsForModules(moduleIds, () => createModulePermission(true)),
    },
  ];
};

export const normalizeRolePermissions = (
  rawPermissions: Record<string, unknown> | undefined
): Record<string, RoleModulePermission> => {
  const normalizedEntries = Object.entries(rawPermissions || {}).reduce<Record<string, RoleModulePermission>>(
    (acc, [moduleId, permissionValue]) => {
      if (typeof permissionValue === 'boolean') {
        acc[moduleId] = createModulePermission(permissionValue);
        return acc;
      }

      if (permissionValue && typeof permissionValue === 'object') {
        const entry = permissionValue as Partial<RoleModulePermission>;
        const access = Boolean(entry.access ?? entry.read ?? entry.write ?? entry.update ?? entry.delete);
        acc[moduleId] = createModulePermission(access, {
          read: Boolean(entry.read ?? access),
          write: Boolean(entry.write ?? access),
          update: Boolean(entry.update ?? access),
          delete: Boolean(entry.delete ?? access),
        });
      }

      return acc;
    },
    {}
  );

  return normalizedEntries;
};

export const mergeRolesWithSystemRoles = (storedRolesRaw: unknown): RoleDefinition[] => {
  const roleMap = new Map<string, RoleDefinition>();

  getDefaultSystemRoles().forEach((role) => {
    roleMap.set(role.id, role);
  });

  if (Array.isArray(storedRolesRaw)) {
    storedRolesRaw.forEach((roleItem: any) => {
      const id = String(roleItem?.id || '').trim();
      if (!id) return;

      roleMap.set(id, {
        id,
        name: String(roleItem?.name || id).trim(),
        permissions: normalizeRolePermissions(roleItem?.permissions),
        isSystem: Boolean(roleItem?.isSystem) || id === 'admin',
      });
    });
  }

  return Array.from(roleMap.values()).sort((left, right) => {
    const leftIndex = DEFAULT_ROLE_ORDER.indexOf(left.id);
    const rightIndex = DEFAULT_ROLE_ORDER.indexOf(right.id);

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }

    return left.name.localeCompare(right.name);
  });
};

export const isAdminPermission = (permission?: Pick<ProjectPermissionUser, 'permission_type' | 'role_id'> | null) =>
  String(permission?.role_id || permission?.permission_type || '').toLowerCase() === 'admin';

export const getRoleIdFromPermission = (permission?: Pick<ProjectPermissionUser, 'permission_type' | 'role_id'> | null) =>
  String(permission?.role_id || permission?.permission_type || '').trim().toLowerCase();

export const getRoleForPermission = (
  permission: Pick<ProjectPermissionUser, 'permission_type' | 'role_id'> | null | undefined,
  availableRoles: RoleDefinition[]
) => {
  const roleId = getRoleIdFromPermission(permission);
  return availableRoles.find((role) => role.id === roleId) || null;
};

export const getModulePermissionForUser = ({
  permission,
  availableRoles,
  moduleId,
  isProjectOwner,
}: {
  permission?: Pick<ProjectPermissionUser, 'permission_type' | 'role_id'> | null;
  availableRoles: RoleDefinition[];
  moduleId: string;
  isProjectOwner?: boolean;
}): RoleModulePermission => {
  if (isProjectOwner || isAdminPermission(permission)) {
    return createModulePermission(true);
  }

  if (ADMIN_ONLY_MODULE_IDS.includes(moduleId as (typeof ADMIN_ONLY_MODULE_IDS)[number])) {
    return createModulePermission(false, { read: false, write: false, update: false, delete: false });
  }

  const matchedRole = getRoleForPermission(permission, availableRoles);
  return matchedRole?.permissions?.[moduleId] || createModulePermission(false, { read: false, write: false, update: false, delete: false });
};

export const countAdmins = (permissions: Array<Pick<ProjectPermissionUser, 'permission_type' | 'role_id'>>) =>
  permissions.filter((permission) => isAdminPermission(permission)).length;
