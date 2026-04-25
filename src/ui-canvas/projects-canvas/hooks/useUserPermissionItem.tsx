import {db} from '@/config/firebase';
import {CrownOutlined, EditFilled, EditOutlined, EyeOutlined, UserOutlined} from '@ant-design/icons';
import {message} from 'antd';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import { countAdmins, isAdminPermission } from '@/utils/projectPermissions';
import {
  removeUserPermissionsProjectEntry,
  removeUserProjectsEntry,
  setUserProjectPermissionDoc,
  deleteUserProjectPermissionDoc,
} from '@/utils/projectAccessSync';

const useUserPermissionItem=({
    permission,
    selectedProject,
    getUserInfo,
    user,
  currentUserPermission,
  currentUserIsAdmin
})=>{
  const userInfo = getUserInfo(permission.uid);
  const isCurrentUser = permission.uid === user?.uid;
  
  // Check if current user has admin permission
  const isCurrentUserAdmin = Boolean(currentUserIsAdmin ?? (currentUserPermission === 'admin'));
  
  // Check if the current user can modify this permission
  // Admins can modify any permission except their own admin permission
  const canModifyPermission = isCurrentUserAdmin;

  const getPermissionTagColor = (permissionType: string) => {
    switch (permissionType) {
      case 'admin': return 'red';
      case 'editor': return 'blue';
      case 'reviewer': return 'green';
      case 'viewer': return 'purple';
      default: return 'default';
    }
  };

  const getPermissionIcon = (permissionType: string) => {
    switch (permissionType) {
      case 'admin': return <CrownOutlined />;
      case 'editor': return <EditFilled />;
      case 'reviewer': return <EditOutlined />;
      case 'viewer': return <EyeOutlined />;
      default: return <UserOutlined />;
    }
  };

  const handleUpdatePermission = async (userId: string, newPermissionType: string, roleName?: string) => {
    try {
      // Check if current user has admin permission
      if (!isCurrentUserAdmin) {
        message.error('Only admins can update permissions');
        return;
      }

      // 1. Update project_permissions collection
      const projectPermRef = doc(db, "project_permissions", selectedProject.id);
      
      // Get current permissions from the project
      const projectPermissionsDoc = await getDoc(projectPermRef);
      
      if (!projectPermissionsDoc.exists()) {
        message.error('Project permissions not found');
        return;
      }
      
      const currentPermissions = projectPermissionsDoc.data().user_list || [];
      const adminCount = countAdmins(currentPermissions);
      const targetPermission = currentPermissions.find((perm) => perm.uid === userId);
      const targetIsAdmin = isAdminPermission(targetPermission);
      const newRoleIsAdmin = String(newPermissionType || '').toLowerCase() === 'admin';

      if (targetIsAdmin && !newRoleIsAdmin && adminCount <= 1) {
        message.error('At least one admin must remain in the project');
        return;
      }
      
      // Update the specific user's permission
      const updatedPermissions = currentPermissions.map(perm => 
        perm.uid === userId
          ? {
              ...perm,
              permission_type: String(newPermissionType || '').toLowerCase(),
              role_id: String(newPermissionType || '').toLowerCase(),
              role_name: (roleName || newPermissionType || '').toLowerCase(),
              system_roles: String(newPermissionType || '').toLowerCase() === 'admin' ? ['admin'] : [],
              custom_roles: String(newPermissionType || '').toLowerCase() === 'admin' ? [] : [String(newPermissionType || '').toLowerCase()],
            }
          : perm
      );
      
      await updateDoc(projectPermRef, {
        project_name: selectedProject.name,
        user_list: updatedPermissions
      });

      await setUserProjectPermissionDoc({
        uid: userId,
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
        },
        role: {
          roleId: newPermissionType,
          roleName: roleName || newPermissionType,
        },
      });

      message.success('User permission updated successfully');
    } catch (error) {
      console.error('Error updating permission:', error);
      message.error('Failed to update user permission');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      // Check if current user has admin permission
      if (!isCurrentUserAdmin) {
        message.error('Only admins can remove users');
        return;
      }

      // 1. Update project_permissions collection - remove user from project
      const projectPermRef = doc(db, "project_permissions", selectedProject.id);
      
      // Get current permissions
      const projectPermissionsDoc = await getDoc(projectPermRef);
      
      if (!projectPermissionsDoc.exists()) {
        message.error('Project permissions not found');
        return;
      }
      
      const currentPermissions = projectPermissionsDoc.data().user_list || [];
      const adminCount = countAdmins(currentPermissions);
      const targetPermission = currentPermissions.find((perm) => perm.uid === userId);

      if (isAdminPermission(targetPermission) && adminCount <= 1) {
        message.error('The last admin cannot be removed from the project');
        return;
      }
      
      // Remove the user from project permissions
      const updatedPermissions = currentPermissions.filter(perm => perm.uid !== userId);
      
      await updateDoc(projectPermRef, {
        user_list: updatedPermissions
      });

      // 2. Update user_permissions collection - remove project from user's project list
      await removeUserPermissionsProjectEntry({
        uid: userId,
        projectId: selectedProject.id,
      });

      await removeUserProjectsEntry({
        uid: userId,
        projectId: selectedProject.id,
      });

      await deleteUserProjectPermissionDoc({
        uid: userId,
        projectId: selectedProject.id,
      });

      message.success('User removed from project successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      message.error('Failed to remove user from project');
    }
  };
    return {
    userInfo,
    isCurrentUser,
    isCurrentUserAdmin,
    canModifyPermission,
    getPermissionTagColor,
    getPermissionIcon,
    handleUpdatePermission,
    handleRemoveUser
    }
}

export default useUserPermissionItem;
