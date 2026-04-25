import {Project} from "@/types/project";
import {db} from "@/config/firebase";
import {useAppSelector} from "@/store";
import {getAuth} from "firebase/auth";
import {collection, doc, onSnapshot, query} from "firebase/firestore";
import {useEffect, useState} from "react";
import {useAuthState} from "react-firebase-hooks/auth";
import {ProjectPermission, User} from "./types";
import { getAllUsersFromFirestore } from "@/services/frontendData";

function useUserManagment() {
 const currentProject = useAppSelector((state) => state.project.currentProject);
  
  const [user] = useAuthState(getAuth());
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectPermissions, setProjectPermissions] = useState<ProjectPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(currentProject);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);

  // Update selectedProject when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setSelectedProject(currentProject);
    }
  }, [currentProject]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const projectsUnsubscribe = onSnapshot(doc(db, "user_projects", user.uid), (snapshot) => {
      const projectRows = snapshot.exists() ? (snapshot.data()?.projects || []) : [];
      const projectsData = (projectRows as Array<{ project_id?: string; project_name?: string }>)
        .filter((row) => row?.project_id)
        .map((row) => ({
          id: String(row.project_id),
          name: String(row.project_name || "Untitled Project"),
          userId: "",
          createdAt: null,
        })) as Project[];
      setProjects(projectsData);
      
      // Auto-select the current project from Redux or first project if none is selected
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    });

    const permissionsQuery = query(collection(db, "project_permissions"));
    const permissionsUnsubscribe = onSnapshot(permissionsQuery, (snapshot) => {
      const permissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectPermission[];
      
      setProjectPermissions(permissionsData);
    });

    const fetchUsers = async () => {
      try {
        const usersData = await getAllUsersFromFirestore();
        setUsers(usersData as User[]);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      projectsUnsubscribe();
      permissionsUnsubscribe();
    };
  }, [user?.uid, selectedProject?.id]);

  const getProjectPermissions = (projectId: string) => {
    const permissionDoc = projectPermissions.find(perm => perm.id === projectId);
    if (!permissionDoc) return [];
    
    return permissionDoc.user_list.map(userPerm => {
      const userInfo = users.find(u => u.uid === userPerm.uid);
      return {
        ...userPerm,
        userInfo: userInfo || null
      };
    });
  };

  const getUserInfo = (uid: string) => {
    return users.find(u => u.uid === uid) || null;
  };

    return {
    loading,
    projects,
    projectPermissions,
    users,
    selectedProject,
    setSelectedProject,
    addUserModalVisible,
    setAddUserModalVisible,
    getProjectPermissions,
    getUserInfo,
    currentProject,
    user
    }
}

export default useUserManagment;

