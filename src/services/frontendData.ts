import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { callApiWithToken, callApiPublic } from "@/utils/callApi";

const GITHUB_REPO_COLLECTION = "github_permissions";
const GITHUB_REPO_ACCESS_COLLECTION = "github_project_permissions";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const mapFirestoreUser = (userDoc: any) => {
  const data = userDoc.data?.() || userDoc || {};

  return {
    uid: normalizeString(data.uid) || normalizeString(userDoc.id),
    email: normalizeString(data.email),
    displayName:
      normalizeString(data.displayName) ||
      normalizeString(data.name) ||
      normalizeString(data.userName) ||
      null,
    photoURL: normalizeString(data.photoURL) || null,
    disabled: Boolean(data.disabled),
    providerId: data.providerData?.[0]?.providerId || null,
    creationTime: data.metadata?.creationTime || data.creationTime || null,
    lastSignInTime: data.metadata?.lastSignInTime || data.lastSignInTime || null,
    githubId: data.githubId || null,
    githubIds: Array.isArray(data.githubIds) ? data.githubIds : [],
    hasGitHub: Boolean(data.hasGitHub || data.githubId || (Array.isArray(data.githubIds) && data.githubIds.length)),
  };
};

export const getAllUsersFromFirestore = async () => {
  const userMap = new Map<string, ReturnType<typeof mapFirestoreUser>>();

  const mergeUsers = (items: any[]) => {
    items.forEach((userItem) => {
      const mappedUser = mapFirestoreUser(userItem);
      if (!mappedUser.uid) return;

      const existingUser = userMap.get(mappedUser.uid);
      userMap.set(mappedUser.uid, {
        ...existingUser,
        ...mappedUser,
        email: mappedUser.email || existingUser?.email || "",
        displayName: mappedUser.displayName || existingUser?.displayName || null,
        photoURL: mappedUser.photoURL || existingUser?.photoURL || null,
      });
    });
  };

  try {
    const [usersSnapshot, devStackUsersSnapshot] = await Promise.allSettled([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "dev_stack_users")),
    ]);

    if (usersSnapshot.status === "fulfilled") {
      mergeUsers(usersSnapshot.value.docs);
    }

    if (devStackUsersSnapshot.status === "fulfilled") {
      mergeUsers(devStackUsersSnapshot.value.docs);
    }
  } catch (error) {
    console.warn("Firestore user list fetch failed, will try auth API fallback:", error);
  }

  if (userMap.size === 0) {
    try {
      // Removed callApiWithToken("/get-auth/users")
      if (authResponse?.status === 200 && Array.isArray(authResponse?.users)) {
        mergeUsers(authResponse.users);
      }
    } catch (tokenError) {
      try {
        // Removed callApiPublic("/get-auth/users")
        if (publicResponse?.status === 200 && Array.isArray(publicResponse?.users)) {
          mergeUsers(publicResponse.users);
        }
      } catch (publicError) {
        console.error("Unable to load users from Firestore or auth API:", tokenError, publicError);
      }
    }
  }

  return Array.from(userMap.values()).sort((left, right) => {
    const leftLabel = (left.displayName || left.email || left.uid).toLowerCase();
    const rightLabel = (right.displayName || right.email || right.uid).toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  });
};

export const getProjectGithubRepositories = async (projectId: string) => {
  const normalizedProjectId = normalizeString(projectId);
  if (!normalizedProjectId) return [];

  const snapshot = await getDocs(
    query(collection(db, GITHUB_REPO_COLLECTION), where("project_id", "==", normalizedProjectId))
  );

  return snapshot.docs
    .map((repoDoc) => {
      const data = repoDoc.data() || {};
      return {
        id: repoDoc.id,
        key: repoDoc.id,
        ...data,
        projectId: normalizeString(data.projectId) || normalizeString(data.project_id) || normalizedProjectId,
        project_id: normalizeString(data.project_id) || normalizeString(data.projectId) || normalizedProjectId,
        owner: normalizeString(data.owner),
        repo: normalizeString(data.repo),
        type: normalizeString(data.type) || "UI Canvas",
        permission: data.permission || "Manage",
      };
    })
    .filter((item) => item.owner && item.repo);
};

export const createProjectGithubRepository = async (payload: {
  projectId: string;
  owner: string;
  repo: string;
  type: string;
  permission?: string;
}) => {
  const docRef = await addDoc(collection(db, GITHUB_REPO_COLLECTION), {
    projectId: payload.projectId,
    project_id: payload.projectId,
    owner: normalizeString(payload.owner),
    repo: normalizeString(payload.repo),
    type: normalizeString(payload.type),
    permission: payload.permission || "Manage",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
};

export const updateProjectGithubRepository = async (
  id: string,
  payload: { owner: string; repo: string; type: string; projectId: string }
) => {
  await updateDoc(doc(db, GITHUB_REPO_COLLECTION, id), {
    owner: normalizeString(payload.owner),
    repo: normalizeString(payload.repo),
    type: normalizeString(payload.type),
    projectId: payload.projectId,
    project_id: payload.projectId,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteProjectGithubRepository = async (id: string) => {
  await deleteDoc(doc(db, GITHUB_REPO_COLLECTION, id));
};

export const getProjectGithubRepositoryPermissions = async (repoId: string) => {
  const normalizedRepoId = normalizeString(repoId);
  if (!normalizedRepoId) return [];

  const snapshot = await getDocs(
    query(collection(db, GITHUB_REPO_ACCESS_COLLECTION), where("repo_id", "==", normalizedRepoId))
  );

  return snapshot.docs.map((permissionDoc) => {
    const data = permissionDoc.data() || {};
    return {
      id: permissionDoc.id,
      key: permissionDoc.id,
      ...data,
      repo_id: normalizeString(data.repo_id) || normalizedRepoId,
      userId: normalizeString(data.userId) || normalizeString(data.uid),
      uid: normalizeString(data.uid) || normalizeString(data.userId),
      role: normalizeString(data.role) || "commentor",
      email: normalizeString(data.userEmail) || normalizeString(data.email),
      displayName: normalizeString(data.userName) || normalizeString(data.displayName),
      photoURL: normalizeString(data.userPhotoURL) || normalizeString(data.photoURL),
    };
  });
};

export const createProjectGithubRepositoryPermission = async (payload: {
  repo_id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhotoURL?: string;
  role: string;
}) => {
  await addDoc(collection(db, GITHUB_REPO_ACCESS_COLLECTION), {
    ...payload,
    uid: payload.userId,
    email: payload.userEmail,
    displayName: payload.userName,
    photoURL: payload.userPhotoURL || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const updateProjectGithubRepositoryPermission = async (
  repoId: string,
  userId: string,
  role: string
) => {
  const snapshot = await getDocs(
    query(
      collection(db, GITHUB_REPO_ACCESS_COLLECTION),
      where("repo_id", "==", normalizeString(repoId)),
      where("userId", "==", normalizeString(userId))
    )
  );

  await Promise.all(
    snapshot.docs.map((permissionDoc) =>
      updateDoc(permissionDoc.ref, {
        role: normalizeString(role) || "commentor",
        updatedAt: new Date().toISOString(),
      })
    )
  );
};

export const deleteProjectGithubRepositoryPermission = async (
  repoId: string,
  userId: string
) => {
  const snapshot = await getDocs(
    query(
      collection(db, GITHUB_REPO_ACCESS_COLLECTION),
      where("repo_id", "==", normalizeString(repoId)),
      where("userId", "==", normalizeString(userId))
    )
  );

  await Promise.all(snapshot.docs.map((permissionDoc) => deleteDoc(permissionDoc.ref)));
};
