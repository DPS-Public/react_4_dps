import { db } from "@/config/firebase";
import { arrayUnion, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

type ProjectRef = {
  id: string;
  name: string;
};

type RoleAssignment = {
  roleId: string;
  roleName?: string;
};

type UserPermissionsProjectEntry = {
  project_id?: string;
  project_name?: string;
};

const toIsoString = () => new Date().toISOString();

const toRoleArrays = (roleIdRaw: string) => {
  const roleId = String(roleIdRaw || "").trim().toLowerCase();
  if (roleId === "admin") {
    return {
      system_roles: ["admin"],
      custom_roles: [] as string[],
      role_id: "admin",
      permission_type: "admin",
    };
  }

  return {
    system_roles: [] as string[],
    custom_roles: roleId ? [roleId] : [],
    role_id: roleId,
    permission_type: roleId,
  };
};

export const buildProjectPermissionEntry = ({
  uid,
  roleId,
  roleName,
  actorUid,
}: {
  uid: string;
  roleId: string;
  roleName?: string;
  actorUid: string;
}) => {
  const base = toRoleArrays(roleId);
  return {
    uid,
    created_at: toIsoString(),
    created_by: actorUid,
    permission_type: base.permission_type,
    role_id: base.role_id,
    role_name: String(roleName || base.permission_type || roleId || "").trim().toLowerCase(),
    system_roles: base.system_roles,
    custom_roles: base.custom_roles,
  };
};

export const upsertUserPermissionsProjectEntry = async ({
  uid,
  project,
}: {
  uid: string;
  project: ProjectRef;
}) => {
  const ref = doc(db, "user_permissions", uid);
  try {
    const snap = await getDoc(ref);
    const currentProjectList = snap.exists() ? (snap.data()?.project_list || []) : [];
    const currentProjects = snap.exists()
      ? ((snap.data()?.projects || []) as UserPermissionsProjectEntry[])
      : [];

    const nextProjectList = currentProjectList.includes(project.id)
      ? currentProjectList
      : [...currentProjectList, project.id];

    const nextProjects = currentProjects.some((item) => item?.project_id === project.id)
      ? currentProjects.map((item) =>
          item?.project_id === project.id
            ? { ...item, project_id: project.id, project_name: project.name }
            : item
        )
      : [...currentProjects, { project_id: project.id, project_name: project.name }];

    await setDoc(
      ref,
      {
        uid,
        project_list: nextProjectList,
        projects: nextProjects,
        updatedAt: toIsoString(),
        ...(snap.exists() ? {} : { createdAt: toIsoString() }),
      },
      { merge: true }
    );
  } catch (error) {
    await setDoc(
      ref,
      {
        uid,
        project_list: arrayUnion(project.id),
        projects: arrayUnion({ project_id: project.id, project_name: project.name }),
        updatedAt: toIsoString(),
      },
      { merge: true }
    );
  }
};

export const removeUserPermissionsProjectEntry = async ({
  uid,
  projectId,
}: {
  uid: string;
  projectId: string;
}) => {
  const ref = doc(db, "user_permissions", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const currentProjectList = (snap.data()?.project_list || []) as string[];
  const currentProjects = (snap.data()?.projects || []) as UserPermissionsProjectEntry[];

  await updateDoc(ref, {
    project_list: currentProjectList.filter((item) => item !== projectId),
    projects: currentProjects.filter((item) => item?.project_id !== projectId),
    updatedAt: toIsoString(),
  });
};

export const upsertUserProjectsEntry = async ({
  uid,
  project,
}: {
  uid: string;
  project: ProjectRef;
}) => {
  const ref = doc(db, "user_projects", uid);
  try {
    const snap = await getDoc(ref);
    const currentProjects = snap.exists() ? (snap.data()?.projects || []) : [];

    const nextProjects = currentProjects.some((item: any) => item?.project_id === project.id)
      ? currentProjects.map((item: any) =>
          item?.project_id === project.id
            ? { ...item, project_id: project.id, project_name: project.name, updatedAt: toIsoString() }
            : item
        )
      : [...currentProjects, { project_id: project.id, project_name: project.name, createdAt: toIsoString() }];

    await setDoc(
      ref,
      {
        uid,
        projects: nextProjects,
        updatedAt: toIsoString(),
        ...(snap.exists() ? {} : { createdAt: toIsoString() }),
      },
      { merge: true }
    );
  } catch (error) {
    await setDoc(
      ref,
      {
        uid,
        projects: arrayUnion({ project_id: project.id, project_name: project.name }),
        updatedAt: toIsoString(),
      },
      { merge: true }
    );
  }
};

export const removeUserProjectsEntry = async ({
  uid,
  projectId,
}: {
  uid: string;
  projectId: string;
}) => {
  const ref = doc(db, "user_projects", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const currentProjects = (snap.data()?.projects || []) as Array<{ project_id?: string }>;
  const nextProjects = currentProjects.filter((item) => item?.project_id !== projectId);

  await updateDoc(ref, {
    projects: nextProjects,
    updatedAt: toIsoString(),
  });
};

export const setUserProjectPermissionDoc = async ({
  uid,
  project,
  role,
}: {
  uid: string;
  project: ProjectRef;
  role: RoleAssignment;
}) => {
  const roleData = toRoleArrays(role.roleId);
  const ref = doc(db, "user_project_permissions", `${uid}_${project.id}`);
  const snap = await getDoc(ref);

  await setDoc(
    ref,
    {
      uid,
      project_id: project.id,
      project_name: project.name,
      system_roles: roleData.system_roles,
      custom_roles: roleData.custom_roles,
      role_id: roleData.role_id,
      role_name: String(role.roleName || roleData.permission_type || role.roleId || "").trim().toLowerCase(),
      permission_type: roleData.permission_type,
      updatedAt: toIsoString(),
      ...(snap.exists() ? {} : { createdAt: toIsoString() }),
    },
    { merge: true }
  );
};

export const deleteUserProjectPermissionDoc = async ({
  uid,
  projectId,
}: {
  uid: string;
  projectId: string;
}) => {
  await deleteDoc(doc(db, "user_project_permissions", `${uid}_${projectId}`));
};
