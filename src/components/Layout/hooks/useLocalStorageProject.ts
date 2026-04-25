// hooks/useLocalStorageProject.ts
import {useEffect} from "react";
import {setCurrentProject, setCurrentRepo, useAppDispatch} from "@/store";
import {Project} from "@/store/slices/type";

export function useLocalStorageProject() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Load currentProject from localStorage
    const savedProject = localStorage.getItem("currentProject");
    if (savedProject) {
      try {
        const project: Project = JSON.parse(savedProject);
        dispatch(setCurrentProject(project));
      } catch (e) {
        console.error("Failed to parse saved project:", e);
        localStorage.removeItem("currentProject");
      }
    }

    // Load currentRepo from localStorage
    const savedRepo = localStorage.getItem("currentRepo");
    if (savedRepo) {
      try {
        dispatch(setCurrentRepo(savedRepo));      } catch (e) {
        console.error("Failed to load saved repo:", e);
        localStorage.removeItem("currentRepo");
      }
    }
  }, [dispatch]);
}
