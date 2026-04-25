// hooks/useAuthState.ts
import {Project} from "@/types/project";
import {getAuth} from "firebase/auth";
import {useState} from "react";
import {useAuthState} from "react-firebase-hooks/auth";

const USER_PROJECTS_CACHE_KEY = "cachedUserProjects";

const readCachedProjects = (): Project[] => {
  try {
    const rawValue = localStorage.getItem(USER_PROJECTS_CACHE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.error("Failed to read cached user projects:", error);
    return [];
  }
};

export function useReadProjectState() {
  const auth = getAuth();
  const [user, loading, error] = useAuthState(auth);
  const [projects, setProjects] = useState<Project[]>(readCachedProjects);
  return {
    user,
    loading,
    error,
    auth,
    projects, setProjects
  };
}
