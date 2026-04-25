import { db } from "@/config/firebase";
import { getAllUsersFromFirestore } from "@/services/frontendData";
import { getAuth } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  removeUserPermissionsProjectEntry,
  removeUserProjectsEntry,
  setUserProjectPermissionDoc,
  upsertUserPermissionsProjectEntry,
  upsertUserProjectsEntry,
} from "@/utils/projectAccessSync";

type ProjectPermissionEntry = {
  uid: string;
  permission_type: string;
  role_id?: string;
  role_name?: string;
  system_roles?: string[];
  custom_roles?: string[];
};

const isAdminProjectPermission = (entry?: ProjectPermissionEntry | null) => {
  if (!entry) return false;

  const systemRoles = Array.isArray(entry.system_roles) ? entry.system_roles : [];
  if (systemRoles.includes("admin")) {
    return true;
  }

  const effectiveRole = String(entry.role_id || entry.permission_type || "").toLowerCase();
  return effectiveRole === "admin";
};

type ProjectPermissionDoc = {
  id: string;
  user_list?: ProjectPermissionEntry[];
};

type ProjectRecord = {
  id: string;
  name: string;
  project_name?: string;
  userId?: string;
  createdAt?: any;
  permissionType?: string | null;
};

const getPermissionType = (
  projectId: string,
  permissionsData: ProjectPermissionDoc[],
  userId: string
) => {
  const permission = permissionsData.find((item) => item.id === projectId);
  if (!permission?.user_list) return null;

  const userPermission = permission.user_list.find((item) => item.uid === userId);
  return userPermission ? userPermission.permission_type : null;
};

function useProjectActions() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectPermissions, setProjectPermissions] = useState<ProjectPermissionDoc[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProjectName, setSavingProjectName] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const auth = getAuth();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setProjectPermissions([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let projectsCache: ProjectRecord[] = [];
    let permissionsCache: ProjectPermissionDoc[] = [];

    const syncProjects = async () => {
      try {
        const sourceEntries = permissionsCache
          .filter((permissionDoc) =>
            (permissionDoc.user_list || []).some((item) => item.uid === user.uid && isAdminProjectPermission(item))
          )
          .map((permissionDoc) => {
            const matchedProject = projectsCache.find((project) => project.id === permissionDoc.id);
            const currentUserPermission = (permissionDoc.user_list || []).find((item) => item.uid === user.uid);
            return {
              project_id: permissionDoc.id,
              project_name:
                matchedProject?.name ||
                matchedProject?.project_name ||
                (permissionDoc as any)?.project_name ||
                "Untitled Project",
              role_id: String(
                currentUserPermission?.role_id ||
                currentUserPermission?.permission_type ||
                currentUserPermission?.custom_roles?.[0] ||
                ""
              ).toLowerCase(),
              role_name: String(
                currentUserPermission?.role_name ||
                currentUserPermission?.permission_type ||
                currentUserPermission?.role_id ||
                ""
              ).toLowerCase(),
            };
          });

        const nextProjects = sourceEntries
          .map((item) => {
            const matchedProject = projectsCache.find((project) => project.id === item.project_id);
            const projectName = String(item.project_name || matchedProject?.name || matchedProject?.project_name || "").trim();
            return {
              id: item.project_id,
              name: projectName || "Untitled Project",
              project_name: projectName || "Untitled Project",
              userId: matchedProject?.userId,
              createdAt: matchedProject?.createdAt,
              permissionType: getPermissionType(item.project_id, permissionsCache, user.uid),
            } as ProjectRecord;
          })
          .sort((left, right) => {
            const leftTime = new Date(left.createdAt?.toDate?.() || left.createdAt || 0).getTime();
            const rightTime = new Date(right.createdAt?.toDate?.() || right.createdAt || 0).getTime();
            return rightTime - leftTime;
          });

        setProjects(nextProjects);

        for (const item of sourceEntries) {
          try {
            await upsertUserProjectsEntry({
              uid: user.uid,
              project: {
                id: item.project_id,
                name: item.project_name,
              },
            });

            await upsertUserPermissionsProjectEntry({
              uid: user.uid,
              project: {
                id: item.project_id,
                name: item.project_name,
              },
            });

            await setUserProjectPermissionDoc({
              uid: user.uid,
              project: {
                id: item.project_id,
                name: item.project_name,
              },
              role: {
                roleId: item.role_id || "viewer",
                roleName: item.role_name || item.role_id || "viewer",
              },
            });
          } catch (error) {
            console.warn("Failed to backfill project access mirrors:", error);
          }
        }
      } catch (error) {
        console.error("Error syncing projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      projectsCache = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data(),
      })) as ProjectRecord[];

      void syncProjects();
    });

    const unsubscribePermissions = onSnapshot(collection(db, "project_permissions"), (snapshot) => {
      permissionsCache = snapshot.docs.map((permissionDoc) => ({
        id: permissionDoc.id,
        ...permissionDoc.data(),
      })) as ProjectPermissionDoc[];

      setProjectPermissions(permissionsCache);
      void syncProjects();
    });

    void getAllUsersFromFirestore()
      .then((usersData) => setUsers(usersData as any[]))
      .catch((error) => {
        console.error("Error fetching users:", error);
        setUsers([]);
      });

    return () => {
      unsubscribeProjects();
      unsubscribePermissions();
    };
  }, [user?.uid]);

  const getUserInfo = (uid: string) => users.find((item) => item.uid === uid) || null;

  const getProjectPermissions = (projectId: string) =>
    projectPermissions.find((permission) => permission.id === projectId)?.user_list || [];

  const updateProjectName = async (projectId: string, name: string) => {
    setSavingProjectName(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        name,
        project_name: name,
        updatedAt: new Date(),
      });

      const projectPermissionsDoc = await getDoc(doc(db, "project_permissions", projectId));
      const permissionUsers = projectPermissionsDoc.exists()
        ? ((projectPermissionsDoc.data()?.user_list || []) as Array<{ uid: string }>)
        : [];
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectOwnerUid = projectDoc.exists() ? String(projectDoc.data()?.userId || "") : "";

      await setDoc(
        doc(db, "project_permissions", projectId),
        {
          project_name: name,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const memberIds = Array.from(
        new Set([user?.uid, projectOwnerUid, ...permissionUsers.map((item) => item.uid)].filter(Boolean))
      );
      for (const memberUid of memberIds) {
        await upsertUserProjectsEntry({
          uid: memberUid,
          project: {
            id: projectId,
            name,
          },
        });

        await upsertUserPermissionsProjectEntry({
          uid: memberUid,
          project: {
            id: projectId,
            name,
          },
        });

        await setDoc(
          doc(db, "user_project_permissions", `${memberUid}_${projectId}`),
          {
            project_name: name,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } finally {
      setSavingProjectName(false);
    }
  };

  const getProjectAdminGuard = (project: ProjectRecord) => {
    if (!user) {
      return { canEdit: false, reason: "User not authenticated" };
    }

    const projectUsers = getProjectPermissions(project.id);
    const myPermission = projectUsers.find((item) => item.uid === user.uid);
    const myRole = String(myPermission?.role_id || myPermission?.permission_type || "").toLowerCase();
    const isAdmin = project.userId === user.uid || myRole === "admin";

    if (!isAdmin) {
      return { canEdit: false, reason: "Only admins can edit project" };
    }

    return { canEdit: true, reason: "" };
  };

  const getDeleteProjectGuard = (project: ProjectRecord) => {
    const adminGuard = getProjectAdminGuard(project);
    if (!adminGuard.canEdit) {
      return { canDelete: false, reason: "Only admins can delete project" };
    }

    const projectUsers = getProjectPermissions(project.id);
    const hasOtherUsers = projectUsers.some((item) => item.uid !== user.uid);
    if (hasOtherUsers) {
      return { canDelete: false, reason: "Project has users. Remove users first" };
    }

    return { canDelete: true, reason: "" };
  };

  const deleteProject = async (project: ProjectRecord) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const guard = getDeleteProjectGuard(project);
    if (!guard.canDelete) {
      throw new Error(guard.reason);
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, "projects", project.id));
    batch.delete(doc(db, "project_permissions", project.id));
    batch.delete(doc(db, "project_module_permission", project.id));
    batch.delete(doc(db, "project_roles", project.id));

    const projectUsers = getProjectPermissions(project.id);
    const memberIds = Array.from(new Set([user.uid, ...projectUsers.map((item) => item.uid).filter(Boolean)]));
    for (const memberUid of memberIds) {
      await removeUserPermissionsProjectEntry({
        uid: memberUid,
        projectId: project.id,
      });

      await removeUserProjectsEntry({
        uid: memberUid,
        projectId: project.id,
      });

      await deleteDoc(doc(db, "user_project_permissions", `${memberUid}_${project.id}`));
    }

    await batch.commit();
  };

  return {
    projects,
    getProjectPermissions,
    getUserInfo,
    selectedProject,
    setSelectedProject,
    loading,
    setLoading,
    user,
    users,
    updateProjectName,
    savingProjectName,
    deleteProject,
    getDeleteProjectGuard,
    getProjectAdminGuard,
  };
}

export default useProjectActions;
