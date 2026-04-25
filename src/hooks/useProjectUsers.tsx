import { useAppSelector } from "@/store";
import { db } from "@/config/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

interface ProjectPermission {
  id: string;
  user_list?: Array<{
    uid: string;
    permission_type?: string;
    created_at?: any;
    created_by?: string;
  }>;
}

/**
 * Hook to get users who have access to the current project
 * Returns filtered users list based on project_permissions
 */
export function useProjectUsers() {
  const currentProject = useAppSelector((state) => state.project.currentProject);
  const allUsers = useAppSelector((state) => state.auth.users);
  const [projectPermissions, setProjectPermissions] = useState<ProjectPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch project permissions
  useEffect(() => {
    if (!currentProject?.id) {
      setProjectPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const permissionDocRef = doc(db, "project_permissions", currentProject.id);
    const unsubscribe = onSnapshot(
      permissionDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProjectPermissions([
            {
              id: snapshot.id,
              ...snapshot.data(),
            } as ProjectPermission,
          ]);
        } else {
          setProjectPermissions([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to project permissions:", error);
        setProjectPermissions([]);
        setLoading(false);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("Failed to unsubscribe project permissions listener safely:", error);
      }
    };
  }, [currentProject?.id]);

  // Get users with access to current project
  const projectUsers = useMemo(() => {
    if (!currentProject?.id || !allUsers || allUsers.length === 0) {
      return [];
    }

    // Find project permission document
    const projectPermission = projectPermissions.find(
      (perm) => perm.id === currentProject.id
    );

    // Get UIDs of users with access
    const allowedUserIds = new Set<string>();

    // Always include project owner
    if (currentProject.userId) {
      allowedUserIds.add(currentProject.userId);
    }

    // Add users from project_permissions if document exists
    if (projectPermission && projectPermission.user_list) {
      projectPermission.user_list.forEach((userPerm) => {
        if (userPerm.uid) {
          allowedUserIds.add(userPerm.uid);
        }
      });
    }

    // Filter users based on allowed UIDs
    return allUsers.filter((user: any) => {
      if (!user?.uid) return false;
      return allowedUserIds.has(user.uid);
    });
  }, [currentProject, allUsers, projectPermissions]);

  return {
    projectUsers,
    loading,
  };
}

