import type { RoleDefinition as ProjectRoleDefinition } from '@/utils/projectPermissions';

export interface UserInfo {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Permission {
  uid: string;
  permission_type: string;
  role_id?: string;
  created_at?: any;
  created_by?: string;
}

export type RoleDefinition = ProjectRoleDefinition;

 export interface Project {
  id: string;
  name: string;
  user_list?: Permission[];
}

export interface UserPermissionItemProps {
  permission: Permission;
  selectedProject: Project;
  getUserInfo: (uid: string) => UserInfo | null;
  user: any;
  currentUserPermission: string;
  currentUserIsAdmin?: boolean;
  availableRoles?: RoleDefinition[];
}
