import { auth, db, loginWithGoogle, mailDb } from "@/config/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import {
  buildProjectPermissionEntry,
  setUserProjectPermissionDoc,
  upsertUserPermissionsProjectEntry,
  upsertUserProjectsEntry,
} from "@/utils/projectAccessSync";

const FIREBASE_MAIL_COLLECTION = import.meta.env.VITE_FIREBASE_MAIL_COLLECTION || "mail";

const normalizeEmail = (value?: string | null) => String(value || "").trim().toLowerCase();

const getProjectInvitationType = (data: any): "project_user" | "project_access" => {
  const explicitType = String(data?.invitationType || "").trim();
  if (explicitType === "project_access" || explicitType === "project_user") {
    return explicitType;
  }

  return String(data?.targetProjectId || "").trim() ? "project_access" : "project_user";
};

const toReadablePermissionError = (error: any, actionLabel: string) => {
  if (error?.code === "permission-denied") {
    return new Error(
      `${actionLabel} failed because Firestore rules do not allow this action for the current user. Update rules for system_admins, temporary_invitations, project_users, and project_admins.`
    );
  }

  return error;
};

const upsertProjectAdmin = async ({
  email,
  uid,
  displayName,
  photoURL,
  source,
  invitationId,
  actorEmail,
  actorName,
}: {
  email: string;
  uid?: string;
  displayName?: string;
  photoURL?: string;
  source: "manual" | "invitation";
  invitationId?: string;
  actorEmail?: string;
  actorName?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Project admin email is required.");
  }
    console.log("zaddddddddddddddddddddddddddd")

  await setDoc(
    doc(db, "project_admins", normalizedEmail),
    {
      email: normalizedEmail,
      uid: uid || "",
      displayName: displayName || "",
      photoURL: photoURL || "",
      role: "project_admin",
      status: "active",
      source,
      invitationId: invitationId || "",
      addedByEmail: actorEmail || "",
      addedByName: actorName || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export type SystemAdminInvitation = {
  id: string;
  email: string;
  role: "system_admin";
  status: "pending" | "accepted" | "revoked";
  invitedByEmail?: string;
  invitedByName?: string;
  inviteUrl: string;
  createdAt?: any;
  updatedAt?: any;
  acceptedAt?: any;
  acceptedByUid?: string;
};

export type ProjectUserInvitation = {
  id: string;
  email: string;
  role: "project_user";
  invitationType?: "project_user" | "project_access";
  status: "pending" | "accepted" | "revoked";
  invitedByEmail?: string;
  invitedByName?: string;
  inviteUrl: string;
  createdAt?: any;
  updatedAt?: any;
  acceptedAt?: any;
  acceptedByUid?: string;
  targetProjectId?: string;
  targetProjectName?: string;
  targetRoleId?: string;
  targetRoleName?: string;
};

export type SystemAdminRecord = {
  id: string;
  email: string;
  role?: string;
  status?: string;
  displayName?: string;
  photoURL?: string;
  uid?: string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type SystemAdminCandidate = {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};

export type ProjectUserAccessRecord = {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  status?: string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
};

type UserLookupRecord = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};

const buildUsersLookup = async () => {
  const byUid = new Map<string, UserLookupRecord>();
  const byEmail = new Map<string, UserLookupRecord>();

  try {
    const snapshot = await getDocs(collection(db, "users"));

    snapshot.docs.forEach((item) => {
      const data = item.data() as any;
      const uid = String(data?.uid || item.id || "").trim();
      const email = normalizeEmail(data?.email);
      const userRecord: UserLookupRecord = {
        uid,
        email,
        displayName: String(data?.displayName || "").trim(),
        photoURL: String(data?.photoURL || "").trim(),
      };

      if (uid) byUid.set(uid, userRecord);
      if (email) byEmail.set(email, userRecord);
    });
  } catch (error: any) {
    if (error?.code !== "permission-denied") {
      throw error;
    }
  }

  return { byUid, byEmail };
};

export const listSystemAdmins = async (): Promise<SystemAdminRecord[]> => {
  try {
    const snapshot = await getDocs(query(collection(db, "system_admins"), orderBy("email")));
    const usersLookup = await buildUsersLookup();

    return snapshot.docs.map((item) => {
      const data = item.data() as any;
      const email = normalizeEmail(data?.email || item.id);
      const uid = String(data?.uid || "").trim();
      const matchedUser =
        (uid ? usersLookup.byUid.get(uid) : undefined) ||
        (email ? usersLookup.byEmail.get(email) : undefined);

      return {
        id: item.id,
        ...data,
        email,
        uid: uid || matchedUser?.uid || "",
        displayName: matchedUser?.displayName || data?.displayName || "",
        photoURL: matchedUser?.photoURL || data?.photoURL || "",
      };
    });
  } catch (error: any) {
    throw toReadablePermissionError(error, "Loading system admins");
  }
};

export const listSystemAdminCandidates = async (): Promise<SystemAdminCandidate[]> => {
  try {
    const snapshot = await getDocs(query(collection(db, "users"), orderBy("displayName"), limit(200)));
    return snapshot.docs
      .map((item) => {
        const data = item.data() as any;
        const email = normalizeEmail(data?.email);

        if (!email) return null;

        return {
          id: item.id,
          uid: data?.uid || item.id,
          email,
          displayName: data?.displayName || "",
          photoURL: data?.photoURL || "",
        };
      })
      .filter((item): item is SystemAdminCandidate => item !== null);
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      throw toReadablePermissionError(error, "Loading users collection");
    }

    if (error?.code !== "failed-precondition") {
      throw error;
    }

    const snapshot = await getDocs(query(collection(db, "users"), limit(200)));
    return snapshot.docs
      .map((item) => {
        const data = item.data() as any;
        const email = normalizeEmail(data?.email);

        if (!email) return null;

        return {
          id: item.id,
          uid: data?.uid || item.id,
          email,
          displayName: data?.displayName || "",
          photoURL: data?.photoURL || "",
        };
      })
      .filter((item): item is SystemAdminCandidate => item !== null)
      .sort((left, right) =>
        String(left.displayName || left.email).localeCompare(String(right.displayName || right.email))
      );
  }
};

export const addSystemAdminDirectly = async ({
  email,
  displayName,
  uid,
  photoURL,
  addedByEmail,
  addedByName,
}: {
  email: string;
  displayName?: string;
  uid?: string;
  photoURL?: string;
  addedByEmail?: string;
  addedByName?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("System admin email is required.");
  }

  try {
    await setDoc(
      doc(db, "system_admins", normalizedEmail),
      {
        email: normalizedEmail,
        displayName: displayName || "",
        uid: uid || "",
        photoURL: photoURL || "",
        role: "system_admin",
        status: "active",
        source: "manual",
        addedByEmail: addedByEmail || "",
        addedByName: addedByName || "",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error: any) {
    throw toReadablePermissionError(error, "Adding system admin");
  }

  return normalizedEmail;
};

export const listProjectUsers = async (): Promise<ProjectUserAccessRecord[]> => {
  try {
    const snapshot = await getDocs(collection(db, "project_admins"));
    const usersLookup = await buildUsersLookup();

    return snapshot.docs
      .map((item) => {
        const data = item.data() as any;
        const uid = String(data?.uid || item.id || "").trim();
        const email = normalizeEmail(data?.email);
        const matchedUser =
          (uid ? usersLookup.byUid.get(uid) : undefined) ||
          (email ? usersLookup.byEmail.get(email) : undefined);

        return {
          id: item.id,
          ...data,
          uid,
          email,
          displayName: matchedUser?.displayName || data?.displayName || "",
          photoURL: matchedUser?.photoURL || data?.photoURL || "",
        };
      })
      .filter((item) => normalizeEmail(item.email))
      .sort((left, right) =>
        String(left.displayName || left.email || "").localeCompare(String(right.displayName || right.email || ""))
      );
  } catch (error: any) {
    throw toReadablePermissionError(error, "Loading project users");
  }
};

export const addProjectUserDirectly = async ({
  email,
  displayName,
  uid,
  photoURL,
  addedByEmail,
  addedByName,
}: {
  email: string;
  displayName?: string;
  uid: string;
  photoURL?: string;
  addedByEmail?: string;
  addedByName?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUid = String(uid || "").trim();

  if (!normalizedEmail) {
    throw new Error("Project user email is required.");
  }

  if (!normalizedUid) {
    throw new Error("Project user uid is required.");
  }

  try {
    await upsertProjectAdmin({
      email: normalizedEmail,
      uid: normalizedUid,
      displayName,
      photoURL,
      source: "manual",
      actorEmail: addedByEmail,
      actorName: addedByName,
    });
  } catch (error: any) {
    throw toReadablePermissionError(error, "Adding project user");
  }

  return normalizedUid;
};

export const deleteProjectUser = async (uid: string) => {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Project user uid is required.");
  }

  try {
    if (normalizedUid.includes("@")) {
      await deleteDoc(doc(db, "project_admins", normalizeEmail(normalizedUid)));
      return;
    }

    const projectAdminsSnapshot = await getDocs(collection(db, "project_admins"));
    const projectAdminDoc = projectAdminsSnapshot.docs.find((item) => {
      const data = item.data() as any;
      return String(data?.uid || "").trim() === normalizedUid;
    });

    if (projectAdminDoc) {
      await deleteDoc(projectAdminDoc.ref);
    }
  } catch (error: any) {
    throw toReadablePermissionError(error, "Deleting project user");
  }
};

export const createSystemAdminInvitation = async ({
  email,
  invitedByEmail,
  invitedByName,
}: {
  email: string;
  invitedByEmail?: string;
  invitedByName?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Invitation email is required.");
  }

  const existingSystemAdmin = await getDoc(doc(db, "system_admins", normalizedEmail));
  if (existingSystemAdmin.exists()) {
    throw new Error("This email is already a system admin. Invitation email was not sent.");
  }

  const invitationRef = doc(collection(db, "temporary_invitations"));
  const inviteUrl = `${window.location.origin}/system-admin-register/${invitationRef.id}`;

  try {
    const existingInvitationsSnapshot = await getDocs(collection(db, "temporary_invitations"));
    const duplicateInvitationDocs = existingInvitationsSnapshot.docs.filter((item) => {
      const data = item.data() as any;
      return normalizeEmail(data?.email) === normalizedEmail;
    });

    await Promise.all(duplicateInvitationDocs.map((item) => deleteDoc(item.ref)));

    await setDoc(invitationRef, {
      email: normalizedEmail,
      role: "system_admin",
      status: "pending",
      invitedByEmail: invitedByEmail || "",
      invitedByName: invitedByName || "",
      inviteUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(mailDb, FIREBASE_MAIL_COLLECTION), {
      to: normalizedEmail,
      message: {
        subject: "System Admin Invitation",
        html: `
        <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <div style="padding:24px;background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);color:#ffffff;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.5px;opacity:0.9;">SYSTEM ADMIN INVITATION</div>
              <h2 style="margin:12px 0 0;font-size:28px;">You are invited as a system admin</h2>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                ${invitedByName || invitedByEmail || "A system administrator"} invited you to register as a DPS system admin.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Registration URL:
              </p>
              <div style="margin:0 0 20px;padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#2563eb;text-decoration:none;font-weight:700;">${inviteUrl}</a>
              </div>
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Open system admin registration
              </a>
            </div>
          </div>
        </div>
        `,
      },
      meta: {
        type: "system_admin_invitation",
        invitationId: invitationRef.id,
        inviteUrl,
        invitedByEmail: invitedByEmail || "",
        invitedByName: invitedByName || "",
      },
      createdAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw toReadablePermissionError(error, "Creating system admin invitation");
  }

  return {
    id: invitationRef.id,
    inviteUrl,
    email: normalizedEmail,
    invitedByEmail: invitedByEmail || "",
    invitedByName: invitedByName || "",
    role: "system_admin" as const,
    status: "pending" as const,
  };
};

export const createProjectUserInvitation = async ({
  email,
  invitedByEmail,
  invitedByName,
  targetProjectId,
  targetProjectName,
  targetRoleId,
  targetRoleName,
}: {
  email: string;
  invitedByEmail?: string;
  invitedByName?: string;
  targetProjectId?: string;
  targetProjectName?: string;
  targetRoleId?: string;
  targetRoleName?: string;
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Invitation email is required.");
  }
  const normalizedTargetProjectId = String(targetProjectId || "").trim();
  const invitationType: "project_user" | "project_access" = normalizedTargetProjectId
    ? "project_access"
    : "project_user";

  if (normalizedTargetProjectId) {
    const matchedUsersSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", normalizedEmail), limit(5))
    );

    if (!matchedUsersSnapshot.empty) {
      const matchedUids = matchedUsersSnapshot.docs
        .map((item) => String((item.data() as any)?.uid || item.id || "").trim())
        .filter(Boolean);

      if (matchedUids.length > 0) {
        const projectPermissionSnapshot = await getDoc(doc(db, "project_permissions", normalizedTargetProjectId));
        const currentPermissions = projectPermissionSnapshot.exists()
          ? projectPermissionSnapshot.data()?.user_list || []
          : [];

        const isAlreadyProjectMember = currentPermissions.some((permission: any) =>
          matchedUids.includes(String(permission?.uid || "").trim())
        );

        if (isAlreadyProjectMember) {
          throw new Error("This user is already a team member of the selected project.");
        }
      }
    }
  }

  const invitationRef = doc(collection(db, "temporary_invitations"));
  const inviteUrl = `${window.location.origin}/${invitationType === "project_access" ? "project-access-register" : "project-user-register"}/${invitationRef.id}`;

  try {
    const existingInvitationsSnapshot = await getDocs(collection(db, "temporary_invitations"));
    const duplicateInvitationDocs = existingInvitationsSnapshot.docs.filter((item) => {
      const data = item.data() as any;
      return (
        normalizeEmail(data?.email) === normalizedEmail &&
        String(data?.role || "") === "project_user" &&
        getProjectInvitationType(data) === invitationType
      );
    });

    await Promise.all(duplicateInvitationDocs.map((item) => deleteDoc(item.ref)));

    await setDoc(invitationRef, {
      email: normalizedEmail,
      role: "project_user",
      invitationType,
      status: "pending",
      invitedByEmail: invitedByEmail || "",
      invitedByName: invitedByName || "",
      targetProjectId: normalizedTargetProjectId,
      targetProjectName: String(targetProjectName || "").trim(),
      targetRoleId: String(targetRoleId || "").trim(),
      targetRoleName: String(targetRoleName || "").trim(),
      inviteUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(mailDb, FIREBASE_MAIL_COLLECTION), {
      to: normalizedEmail,
      message: {
        subject: "Project User Invitation",
        html: `
        <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <div style="padding:24px;background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);color:#ffffff;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.5px;opacity:0.9;">PROJECT USER INVITATION</div>
              <h2 style="margin:12px 0 0;font-size:28px;">You are invited as a project user</h2>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                ${invitedByName || invitedByEmail || "A system administrator"} invited you to register as a DPS project user.
              </p>
              ${
                targetProjectName
                  ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Project access will be granted to <strong>${targetProjectName}</strong>${targetRoleName ? ` with role <strong>${targetRoleName}</strong>` : ""}.
              </p>`
                  : ""
              }
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Registration URL:
              </p>
              <div style="margin:0 0 20px;padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#2563eb;text-decoration:none;font-weight:700;">${inviteUrl}</a>
              </div>
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Open project user registration
              </a>
            </div>
          </div>
        </div>
        `,
      },
      meta: {
        type: invitationType === "project_access" ? "project_access_invitation" : "project_user_invitation",
        invitationId: invitationRef.id,
        inviteUrl,
        invitationType,
        invitedByEmail: invitedByEmail || "",
        invitedByName: invitedByName || "",
        targetProjectId: normalizedTargetProjectId,
        targetProjectName: String(targetProjectName || "").trim(),
        targetRoleId: String(targetRoleId || "").trim(),
        targetRoleName: String(targetRoleName || "").trim(),
      },
      createdAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw toReadablePermissionError(error, "Creating project user invitation");
  }

  return {
    id: invitationRef.id,
    inviteUrl,
    email: normalizedEmail,
    invitedByEmail: invitedByEmail || "",
    invitedByName: invitedByName || "",
    invitationType,
    targetProjectId: normalizedTargetProjectId,
    targetProjectName: String(targetProjectName || "").trim(),
    targetRoleId: String(targetRoleId || "").trim(),
    targetRoleName: String(targetRoleName || "").trim(),
    role: "project_user" as const,
    status: "pending" as const,
  };
};

const syncAcceptedInvitationToProject = async ({
  invitation,
  uid,
}: {
  invitation: ProjectUserInvitation;
  uid: string;
}) => {
  const targetProjectId = String(invitation.targetProjectId || "").trim();
  const targetProjectName = String(invitation.targetProjectName || "").trim();
  const roleId = String(invitation.targetRoleId || "viewer").trim() || "viewer";
  const roleName = String(invitation.targetRoleName || roleId).trim() || roleId;

  if (!targetProjectId || !targetProjectName) {
    return;
  }

  const projectPermRef = doc(db, "project_permissions", targetProjectId);
  const projectPermissionsDoc = await getDoc(projectPermRef);
  const currentPermissions = projectPermissionsDoc.exists()
    ? projectPermissionsDoc.data().user_list || []
    : [];

  if (!currentPermissions.some((perm: any) => String(perm?.uid || "") === uid)) {
    await setDoc(
      projectPermRef,
      {
        project_id: targetProjectId,
        project_name: targetProjectName,
        user_list: [
          ...currentPermissions,
          buildProjectPermissionEntry({
            uid,
            roleId,
            roleName,
            actorUid: uid,
          }),
        ],
      },
      { merge: true },
    );
  }

  await upsertUserPermissionsProjectEntry({
    uid,
    project: {
      id: targetProjectId,
      name: targetProjectName,
    },
  });

  await upsertUserProjectsEntry({
    uid,
    project: {
      id: targetProjectId,
      name: targetProjectName,
    },
  });

  await setUserProjectPermissionDoc({
    uid,
    project: {
      id: targetProjectId,
      name: targetProjectName,
    },
    role: {
      roleId,
      roleName,
    },
  });
};

export const listSystemAdminInvitations = async (): Promise<SystemAdminInvitation[]> => {
  try {
    const snapshot = await getDocs(collection(db, "temporary_invitations"));
    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...(item.data() as any),
      }))
      .filter(
        (item) =>
          item.role === "system_admin" &&
          ["pending", "accepted"].includes(String(item.status || "").toLowerCase())
      )
      .sort((left, right) => {
        const leftTime =
          typeof left.createdAt?.toDate === "function"
            ? left.createdAt.toDate().getTime()
            : left.createdAt?.seconds
              ? left.createdAt.seconds * 1000
              : 0;
        const rightTime =
          typeof right.createdAt?.toDate === "function"
            ? right.createdAt.toDate().getTime()
            : right.createdAt?.seconds
              ? right.createdAt.seconds * 1000
              : 0;

        return rightTime - leftTime;
      });
  } catch (error: any) {
    throw toReadablePermissionError(error, "Loading system admin invitations");
  }
};

export const listProjectUserInvitations = async (): Promise<ProjectUserInvitation[]> => {
  try {
    const snapshot = await getDocs(collection(db, "temporary_invitations"));
    return snapshot.docs
      .map((item) => {
        const data = item.data() as any;
        return {
          id: item.id,
          ...data,
          invitationType: getProjectInvitationType(data),
        };
      })
      .filter(
        (item) =>
          item.role === "project_user" &&
          item.invitationType === "project_user" &&
          ["pending", "accepted"].includes(String(item.status || "").toLowerCase())
      )
      .sort((left, right) => {
        const leftTime =
          typeof left.createdAt?.toDate === "function"
            ? left.createdAt.toDate().getTime()
            : left.createdAt?.seconds
              ? left.createdAt.seconds * 1000
              : 0;
        const rightTime =
          typeof right.createdAt?.toDate === "function"
            ? right.createdAt.toDate().getTime()
            : right.createdAt?.seconds
              ? right.createdAt.seconds * 1000
              : 0;

        return rightTime - leftTime;
      }) as ProjectUserInvitation[];
  } catch (error: any) {
    throw toReadablePermissionError(error, "Loading project user invitations");
  }
};

export const listProjectAccessInvitations = async (): Promise<ProjectUserInvitation[]> => {
  try {
    const snapshot = await getDocs(collection(db, "temporary_invitations"));
    return snapshot.docs
      .map((item) => {
        const data = item.data() as any;
        return {
          id: item.id,
          ...data,
          invitationType: getProjectInvitationType(data),
        };
      })
      .filter(
        (item) =>
          item.role === "project_user" &&
          item.invitationType === "project_access" &&
          ["pending", "accepted"].includes(String(item.status || "").toLowerCase())
      )
      .sort((left, right) => {
        const leftTime =
          typeof left.createdAt?.toDate === "function"
            ? left.createdAt.toDate().getTime()
            : left.createdAt?.seconds
              ? left.createdAt.seconds * 1000
              : 0;
        const rightTime =
          typeof right.createdAt?.toDate === "function"
            ? right.createdAt.toDate().getTime()
            : right.createdAt?.seconds
              ? right.createdAt.seconds * 1000
              : 0;

        return rightTime - leftTime;
      }) as ProjectUserInvitation[];
  } catch (error: any) {
    throw toReadablePermissionError(error, "Loading project access invitations");
  }
};

export const getSystemAdminInvitation = async (invitationId: string): Promise<SystemAdminInvitation | null> => {
  const snapshot = await getDoc(doc(db, "temporary_invitations", invitationId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as any;
  if (data?.role !== "system_admin") {
    return null;
  }

  return {
    id: snapshot.id,
    ...data,
  };
};

export const getProjectUserInvitation = async (invitationId: string): Promise<ProjectUserInvitation | null> => {
  const snapshot = await getDoc(doc(db, "temporary_invitations", invitationId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as any;
  if (data?.role !== "project_user") {
    return null;
  }

  return {
    id: snapshot.id,
    ...data,
    invitationType: getProjectInvitationType(data),
  };
};

export const deleteSystemAdmin = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("System admin email is required.");
  }

  await deleteDoc(doc(db, "system_admins", normalizedEmail));
};

export const deleteSystemAdminInvitation = async (invitationId: string) => {
  if (!String(invitationId || "").trim()) {
    throw new Error("Invitation id is required.");
  }

  try {
    await deleteDoc(doc(db, "temporary_invitations", invitationId));
  } catch (error: any) {
    throw toReadablePermissionError(error, "Deleting system admin invitation");
  }
};

export const registerSystemAdminFromInvitation = async ({
  invitationId,
  displayName,
  password,
}: {
  invitationId: string;
  displayName: string;
  password: string;
}) => {
  const invitation = await getSystemAdminInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active.");
  }

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, invitation.email, password);
  } catch (error: any) {
    if (error?.code === "auth/email-already-in-use") {
      // Recovery flow: auth record exists, so sign in and complete missing Firestore records.
      credential = await signInWithEmailAndPassword(auth, invitation.email, password);
    } else {
      throw error;
    }
  }
  const user = credential.user;

  if (displayName.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: invitation.email,
      displayName: displayName.trim(),
      role: "system_admin",
      isSystemAdmin: true,
      invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "system_admins", invitation.email),
    {
      email: invitation.email,
      uid: user.uid,
      displayName: displayName.trim(),
      role: "system_admin",
      status: "active",
      source: "invitation",
      invitationId,
      invitedByEmail: invitation.invitedByEmail || "",
      invitedByName: invitation.invitedByName || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await updateDoc(doc(db, "temporary_invitations", invitationId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    acceptedByUid: user.uid,
    updatedAt: serverTimestamp(),
  });

  return {
    user,
    invitation,
  };
};

export const registerSystemAdminFromGoogleInvitation = async ({
  invitationId,
  displayName,
}: {
  invitationId: string;
  displayName?: string;
}) => {
  const invitation = await getSystemAdminInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active.");
  }

  const normalizedInvitationEmail = normalizeEmail(invitation.email);
  const currentSignedInEmail = normalizeEmail(auth.currentUser?.email);
  if (currentSignedInEmail && currentSignedInEmail !== normalizedInvitationEmail) {
    await signOut(auth);
  }

  await loginWithGoogle();
  const activeUser = auth.currentUser;

  if (!activeUser) {
    throw new Error("Google sign-in failed. Please try again.");
  }

  const normalizedUserEmail = normalizeEmail(activeUser.email);

  if (!normalizedUserEmail || normalizedUserEmail !== normalizedInvitationEmail) {
    throw new Error("Please sign in with the same Google email as the invitation email.");
  }

  const resolvedDisplayName =
    String(displayName || "").trim() ||
    activeUser.displayName ||
    invitation.email.split("@")[0];

  if (resolvedDisplayName && resolvedDisplayName !== activeUser.displayName) {
    await updateProfile(activeUser, { displayName: resolvedDisplayName });
  }

  await setDoc(
    doc(db, "users", activeUser.uid),
    {
      uid: activeUser.uid,
      email: invitation.email,
      displayName: resolvedDisplayName,
      photoURL: activeUser.photoURL || "",
      providerId: activeUser.providerData?.[0]?.providerId || "google.com",
      role: "system_admin",
      isSystemAdmin: true,
      invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "system_admins", invitation.email),
    {
      email: invitation.email,
      uid: activeUser.uid,
      displayName: resolvedDisplayName,
      photoURL: activeUser.photoURL || "",
      providerId: activeUser.providerData?.[0]?.providerId || "google.com",
      role: "system_admin",
      status: "active",
      source: "invitation",
      invitationId,
      invitedByEmail: invitation.invitedByEmail || "",
      invitedByName: invitation.invitedByName || "",
      emailVerified: Boolean(activeUser.emailVerified),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await updateDoc(doc(db, "temporary_invitations", invitationId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    acceptedByUid: activeUser.uid,
    updatedAt: serverTimestamp(),
  });

  return {
    user: activeUser,
    invitation,
  };
};

export const registerProjectUserFromInvitation = async ({
  invitationId,
  displayName,
  password,
}: {
  invitationId: string;
  displayName: string;
  password: string;
}) => {
  const invitation = await getProjectUserInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active.");
  }

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, invitation.email, password);
  } catch (error: any) {
    if (error?.code === "auth/email-already-in-use") {
      credential = await signInWithEmailAndPassword(auth, invitation.email, password);
    } else {
      throw error;
    }
  }
  const user = credential.user;

  if (displayName.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: invitation.email,
      displayName: displayName.trim(),
      role: "project_user",
      invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "project_users", user.uid),
    {
      uid: user.uid,
      email: invitation.email,
      displayName: displayName.trim(),
      role: "project_user",
      status: "active",
      source: "invitation",
      invitationId,
      invitedByEmail: invitation.invitedByEmail || "",
      invitedByName: invitation.invitedByName || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  if ((invitation.invitationType || "project_user") === "project_user") {
    await upsertProjectAdmin({
      email: invitation.email,
      uid: user.uid,
      displayName: displayName.trim(),
      source: "invitation",
      invitationId,
      actorEmail: invitation.invitedByEmail || "",
      actorName: invitation.invitedByName || "",
    });
  }

  await syncAcceptedInvitationToProject({
    invitation,
    uid: user.uid,
  });

  await updateDoc(doc(db, "temporary_invitations", invitationId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    acceptedByUid: user.uid,
    updatedAt: serverTimestamp(),
  });

  return {
    user,
    invitation,
  };
};

export const registerProjectUserFromGoogleInvitation = async ({
  invitationId,
  displayName,
}: {
  invitationId: string;
  displayName?: string;
}) => {
  const invitation = await getProjectUserInvitation(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer active.");
  }

  const normalizedInvitationEmail = normalizeEmail(invitation.email);
  const currentSignedInEmail = normalizeEmail(auth.currentUser?.email);
  if (currentSignedInEmail && currentSignedInEmail !== normalizedInvitationEmail) {
    await signOut(auth);
  }

  await loginWithGoogle();
  const activeUser = auth.currentUser;

  if (!activeUser) {
    throw new Error("Google sign-in failed. Please try again.");
  }

  const normalizedUserEmail = normalizeEmail(activeUser.email);

  if (!normalizedUserEmail || normalizedUserEmail !== normalizedInvitationEmail) {
    throw new Error("Please sign in with the same Google email as the invitation email.");
  }

  const resolvedDisplayName =
    String(displayName || "").trim() ||
    activeUser.displayName ||
    invitation.email.split("@")[0];

  if (resolvedDisplayName && resolvedDisplayName !== activeUser.displayName) {
    await updateProfile(activeUser, { displayName: resolvedDisplayName });
  }

  await setDoc(
    doc(db, "users", activeUser.uid),
    {
      uid: activeUser.uid,
      email: invitation.email,
      displayName: resolvedDisplayName,
      photoURL: activeUser.photoURL || "",
      providerId: activeUser.providerData?.[0]?.providerId || "google.com",
      role: "project_user",
      invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, "project_users", activeUser.uid),
    {
      uid: activeUser.uid,
      email: invitation.email,
      displayName: resolvedDisplayName,
      photoURL: activeUser.photoURL || "",
      providerId: activeUser.providerData?.[0]?.providerId || "google.com",
      role: "project_user",
      status: "active",
      source: "invitation",
      invitationId,
      invitedByEmail: invitation.invitedByEmail || "",
      invitedByName: invitation.invitedByName || "",
      emailVerified: Boolean(activeUser.emailVerified),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  if ((invitation.invitationType || "project_user") === "project_user") {
    await upsertProjectAdmin({
      email: invitation.email,
      uid: activeUser.uid,
      displayName: resolvedDisplayName,
      photoURL: activeUser.photoURL || "",
      source: "invitation",
      invitationId,
      actorEmail: invitation.invitedByEmail || "",
      actorName: invitation.invitedByName || "",
    });
  }

  await syncAcceptedInvitationToProject({
    invitation,
    uid: activeUser.uid,
  });

  await updateDoc(doc(db, "temporary_invitations", invitationId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    acceptedByUid: activeUser.uid,
    updatedAt: serverTimestamp(),
  });

  return {
    user: activeUser,
    invitation,
  };
};
