// hooks/useProjectCreation.ts
import {useEffect, useState} from "react";
import {Form, message} from "antd";
import {useAuthState} from "react-firebase-hooks/auth";
import {getAuth} from "firebase/auth";
import {
  addDoc, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import {db} from "@/config/firebase";
import {setCurrentProject, useAppDispatch} from "@/store";
import { setProjectPermissions } from "@/store/slices/permissions";
import {Project} from "@/store/slices/type";
import {generateProjectNumber} from "../actions/functions";
import { getAllModuleOptions, getDefaultSystemRoles } from '@/utils/projectPermissions';
import {
  buildProjectPermissionEntry,
  upsertUserPermissionsProjectEntry,
  setUserProjectPermissionDoc,
  upsertUserProjectsEntry,
} from "@/utils/projectAccessSync";

const USER_PROJECTS_CACHE_KEY = "cachedUserProjects";

export function useProjectCreation() {
  const [createProjectModalVisible, setCreateProjectModalVisible] = useState(false);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [canCreateProject, setCanCreateProject] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const auth = getAuth();
  const [user] = useAuthState(auth);
  const activeFirestoreDb =
    import.meta.env.VITE_FIRESTORE_DATABASE_ID || import.meta.env.VITE_PROD || "langdp-psp";

  const runCoreStep = async <T,>(stepName: string, action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (error: any) {
      const reason = error?.message || "unknown error";
      console.error(`[ProjectCreate][${stepName}]`, error);
      throw new Error(`${stepName} failed: ${reason}`);
    }
  };

  const syncNewProjectIntoLocalState = (project: Project) => {
    try {
      const parsedProjects = JSON.parse(localStorage.getItem(USER_PROJECTS_CACHE_KEY) || "[]");
      const cachedProjects = Array.isArray(parsedProjects) ? parsedProjects : [];
      const nextProjects = cachedProjects.some((item: Project) => item?.id === project.id)
        ? cachedProjects
        : [...cachedProjects, project];

      localStorage.setItem(USER_PROJECTS_CACHE_KEY, JSON.stringify(nextProjects));
      localStorage.setItem("currentProjectId", project.id);
      localStorage.setItem("currentProject", JSON.stringify(project));

      window.dispatchEvent(
        new CustomEvent("user-projects-cache-updated", {
          detail: {
            projects: nextProjects,
            currentProject: project,
          },
        })
      );
    } catch (error) {
      console.error("Failed to sync new project into local cache:", error);
    }
  };

  // Check if user has project creation access
  const checkProjectCreationAccess = async (): Promise<boolean> => {
    const userEmail = String(user?.email || "").trim().toLowerCase();
    if (!user || !userEmail) return false;
    
    try {
      const projectAdminRef = doc(db, "project_admins", userEmail);
      const projectAdminDoc = await getDoc(projectAdminRef);

      if (projectAdminDoc.exists()) {
        const projectAdminData = projectAdminDoc.data();
        if (typeof projectAdminData?.enabled === "boolean") {
          return projectAdminData.enabled;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking project creation access:", error);
      // Fail closed here so users without a confirmed access record do not
      // see an active "New Project" action by mistake.
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProjectCreationAccess = async () => {
      if (!user) {
        if (isMounted) {
          setCanCreateProject(false);
        }
        return;
      }

      const hasAccess = await checkProjectCreationAccess();
      if (isMounted) {
        setCanCreateProject(hasAccess);
      }
    };

    loadProjectCreationAccess();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Get enabled features from project_default_modules - ONLY ACTIVE STATUS
  const getEnabledFeatures = async (): Promise<string[]> => {
    try {
      const defaultModulesCollection = collection(db, 'project_default_modules');
      
      // Query to get only ACTIVE modules sorted by created_at
      const q = query(
        defaultModulesCollection, 
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Collect all module IDs from ACTIVE documents
        const moduleIds: string[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.module_id && data.status === 'active') {
            moduleIds.push(data.module_id);
          }
        });
        
        
        
        // Remove duplicates and return
        return [...new Set(moduleIds)];
      }      return ['business-canvas'];
    } catch (error) {
      console.error("Error getting enabled features from project_default_modules:", error);
      return ['business-canvas']; // Default fallback
    }
  };

  // Create project module permissions
  const createProjectModulePermissions = async (projectId: string, enabledFeatures: string[]) => {
    try {
      const modulePermissionDocRef = doc(db, "project_module_permission", projectId);
      
      const modules: any = {};
      enabledFeatures.forEach(featureKey => {
        modules[featureKey] = {
          enabled: true,
          expireDate: null
        };
      });

      await setDoc(modulePermissionDocRef, {
        created_date: serverTimestamp(),
        modules: modules,
        projectId: projectId,
        updated_by: user?.uid || 'system',
        updated_date: serverTimestamp()
      });    } catch (error) {
      console.error("Error creating project module permissions:", error);
      throw error;
    }
  };

  // Create user page access - FIXED: Preserve existing entries
  const createUserPageAccess = async (projectId: string, enabledFeatures: string[]) => {
    if (!user) return;

    try {
      const userPageAccessDocRef = doc(db, "user_page_access", user.uid);
      
      // Get current user page access if exists
      let currentUserAccess: any = {
        createdAt: serverTimestamp(),
        uid: user.uid,
        updatedAt: serverTimestamp(),
        userEmail: user.email || user.uid,
        _list: []
      };

      try {
        const userAccessDoc = await getDoc(userPageAccessDocRef);
        if (userAccessDoc.exists()) {
          currentUserAccess = userAccessDoc.data();
        }
      } catch (error) {
        console.warn("Unable to read existing user page access while creating project permissions:", error);
      }

      // Get existing _list or create empty array
      const existingList = currentUserAccess._list || [];
      
      // Remove ONLY the entries for this specific project (not all entries)
      const filteredList = existingList.filter((item: any) => item.projectId !== projectId);
      
      // Add logout entry (always present for this project)
      const logoutEntry = {
        accessType: 'admin',
        createdAt: new Date().toISOString(),
        pageId: 'logout',
        projectId: projectId
      };

      // Add enabled features entries for this project (only active ones)
      const featureEntries = enabledFeatures.map(featureKey => ({
        accessType: 'admin',
        createdAt: new Date().toISOString(),
        pageId: featureKey,
        projectId: projectId
      }));

      // Combine: existing entries from other projects + new entries for this project
      const updatedList = [
        ...filteredList,  // Keep all entries from other projects
        logoutEntry,      // Add logout for this project
        ...featureEntries // Add ACTIVE features for this project
      ];

      // Update user page access document
      await setDoc(userPageAccessDocRef, {
        ...currentUserAccess,
        _list: updatedList,
        updatedAt: serverTimestamp()
      }, { merge: true });    } catch (error) {
      console.error("Error creating user page access:", error);
      throw error;
    }
  };

  const showCreateProjectModal = async () => {
    if (!user) {
      message.error("Please sign in to create a project");
      return;
    }

    // Check if user has project creation access
    const hasAccess = await checkProjectCreationAccess();
    if (!hasAccess) {
      message.error("You don't have permission to create projects. Please contact administrator.");
      return;
    }

    setCreateProjectModalVisible(true);
  };

  const handleCreateProject = async (values: { name: string }) => {
    if (!user) {
      message.error("Please sign in to create a project");
      return;
    }

    // Double-check access before creating project
    const hasAccess = await checkProjectCreationAccess();
    if (!hasAccess) {
      message.error("You don't have permission to create projects. Please contact administrator.");
      return;
    }

    setCreateProjectLoading(true);
    try {
      // Get enabled features from project_default_modules - ONLY ACTIVE
      const enabledFeatures = await getEnabledFeatures();
  

      
      const currentDate = new Date();
      const createdDate = currentDate.toISOString().split('T')[0];
      const createdTime = currentDate.toTimeString().split(' ')[0];
      const projectNo = await generateProjectNumber();

      // Create project document
      const docRef = await runCoreStep("create projects doc", async () =>
        addDoc(collection(db, "projects"), {
          name: values.name,
          project_name: values.name,
          userId: user.uid,
          created_by: user.uid,
          created_date: createdDate,
          created_time: createdTime,
          project_no: projectNo,
          digital_service_json: JSON.stringify({}),
          database_json: JSON.stringify({}),
          status: 'A',
          createdAt: currentDate,
        })
      );

      const projectId = docRef.id;

      // Create project permissions
      await runCoreStep("create project_permissions doc", async () =>
        setDoc(doc(db, "project_permissions", projectId), {
          project_id: projectId,
          project_name: values.name,
          user_list: [
            buildProjectPermissionEntry({
              uid: user.uid,
              roleId: "admin",
              roleName: "admin",
              actorUid: user.uid,
            }),
          ],
        })
      );

      await runCoreStep("create project_roles doc", async () =>
        setDoc(doc(db, 'project_roles', projectId), {
          roles: getDefaultSystemRoles(),
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        })
      );

      await runCoreStep("update user_permissions doc", async () =>
        upsertUserPermissionsProjectEntry({
          uid: user.uid,
          project: {
            id: projectId,
            name: values.name,
          },
        })
      );

      await runCoreStep("upsert user_projects doc", async () =>
        upsertUserProjectsEntry({
          uid: user.uid,
          project: {
            id: projectId,
            name: values.name,
          },
        })
      );

      await runCoreStep("upsert user_project_permissions doc", async () =>
        setUserProjectPermissionDoc({
          uid: user.uid,
          project: {
            id: projectId,
            name: values.name,
          },
          role: {
            roleId: "admin",
            roleName: "admin",
          },
        })
      );

      // Create project module permissions (only for active modules)
      try {
        await createProjectModulePermissions(projectId, enabledFeatures);
      } catch (error) {
        console.warn("[ProjectCreate] project_module_permission write skipped:", error);
      }

      // Create user page access (only for active modules)
      try {
        await createUserPageAccess(projectId, enabledFeatures);
      } catch (error) {
        console.warn("[ProjectCreate] user_page_access write skipped:", error);
      }

      const newProject: Project = {
        id: projectId,
        name: values.name,
        userId: user.uid,
        createdAt: currentDate,
      };

      syncNewProjectIntoLocalState(newProject);
      dispatch(setCurrentProject(newProject));
      dispatch(
        setProjectPermissions({
          projectId,
          modulePermissions: getAllModuleOptions().reduce<Record<string, { enabled: boolean; expireDate: string | null }>>(
            (acc, moduleItem) => {
              acc[moduleItem.id] = {
                enabled: true,
                expireDate: null,
              };
              return acc;
            },
            {}
          ),
          userPermission: {
            uid: user.uid,
            permission_type: "admin",
            role_id: "admin",
            created_at: currentDate.toISOString(),
            created_by: user.uid,
          },
          roles: getDefaultSystemRoles(),
          isAdmin: true,
          isProjectOwner: true,
        })
      );
      message.success(`Project created successfully with ${enabledFeatures.length} active modules!`);
      setCreateProjectModalVisible(false);
      form.resetFields();
    } catch (e: any) {
      console.error("Error adding project: ", e);
      const rawMessage = String(e?.message || "");
      const isPermissionError =
        rawMessage.toLowerCase().includes("insufficient permissions") ||
        rawMessage.toLowerCase().includes("permission-denied");
      const hint = isPermissionError
        ? ` (Firestore DB: ${activeFirestoreDb}. Rules bu database ucun publish olunmalidir.)`
        : "";
      message.error("Error creating project: " + rawMessage + hint);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  const handleCancelCreateProject = () => {
    setCreateProjectModalVisible(false);
    form.resetFields();
  };

  return {
    createProjectModalVisible,
    createProjectLoading,
    canCreateProject,
    form,
    showCreateProjectModal,
    handleCreateProject,
    handleCancelCreateProject,
    checkProjectCreationAccess
  };
}
