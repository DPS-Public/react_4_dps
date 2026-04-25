import { useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { setCurrentProject, useAppDispatch, useAppSelector } from "@/store";
import { useReadProjectState } from "./useReadProjectState";

const USER_PROJECTS_CACHE_KEY = "cachedUserProjects";
const projectNameCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

export function useProjectManagementFromUserProjects() {
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector((state) => state.project);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, projects, setProjects } = useReadProjectState();

  const isInitializedRef = useRef(false);
  const unsubscribeRef = useRef<null | (() => void)>(null);

  const subscribeProjects = useCallback(() => {
    if (!user) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = onSnapshot(
      doc(db, "user_projects", user.uid),
      async (snapshot) => {
        try {
          const projectRows = snapshot.exists() ? (snapshot.data()?.projects || []) : [];
          const allProjects = (projectRows as Array<{ project_id?: string; project_name?: string }>)
            .filter((item) => item?.project_id)
            .map((item) => ({
              id: String(item.project_id),
              name: String(item.project_name || "Untitled Project"),
              userId: "",
              createdAt: null,
            }))
            .sort((left, right) => projectNameCollator.compare(left.name || "", right.name || ""));

          setProjects(allProjects as any);
          localStorage.setItem(USER_PROJECTS_CACHE_KEY, JSON.stringify(allProjects));

          if (allProjects.length > 0) {
            if (currentProject?.id) {
              const activeProject = allProjects.find((project: any) => project.id === currentProject.id);
              if (activeProject) {
                dispatch(setCurrentProject(activeProject as any));
                isInitializedRef.current = true;
                return;
              }
            }

            const savedProjectId = localStorage.getItem("currentProjectId");
            if (savedProjectId) {
              const foundProject = allProjects.find((p: any) => p.id === savedProjectId);
              if (foundProject) {
                dispatch(setCurrentProject(foundProject as any));
                isInitializedRef.current = true;
                return;
              }
              localStorage.removeItem("currentProjectId");
            }

            dispatch(setCurrentProject(allProjects[0] as any));
          } else {
            dispatch(setCurrentProject(null));
          }

          isInitializedRef.current = true;
        } catch (error) {
          console.error("Error processing user_projects:", error);
          setProjects([]);
          localStorage.removeItem(USER_PROJECTS_CACHE_KEY);
          dispatch(setCurrentProject(null));
        }
      },
      (error) => {
        console.error("Error listening user_projects:", error);
        setProjects([]);
        localStorage.removeItem(USER_PROJECTS_CACHE_KEY);
        dispatch(setCurrentProject(null));
      }
    );
  }, [currentProject?.id, user?.uid, dispatch, setProjects]);

  useEffect(() => {
    if (!user?.uid) return;
    subscribeProjects();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, subscribeProjects]);

  useEffect(() => {
    const handleLocalProjectCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        projects?: Array<{ id: string; name: string; userId?: string; createdAt?: unknown }>;
        currentProject?: { id: string; name: string; userId?: string; createdAt?: unknown } | null;
      }>;
      const nextProjects = customEvent.detail?.projects;
      const nextCurrentProject = customEvent.detail?.currentProject;

      if (Array.isArray(nextProjects)) {
        const sortedProjects = [...nextProjects].sort((left, right) =>
          projectNameCollator.compare(left.name || "", right.name || "")
        );
        setProjects(sortedProjects as any);
      }

      if (nextCurrentProject?.id) {
        dispatch(setCurrentProject(nextCurrentProject as any));
      }
    };

    window.addEventListener("user-projects-cache-updated", handleLocalProjectCacheUpdate as EventListener);

    return () => {
      window.removeEventListener("user-projects-cache-updated", handleLocalProjectCacheUpdate as EventListener);
    };
  }, [dispatch, setProjects]);

  useEffect(() => {
    if (currentProject?.id) {
      localStorage.setItem("currentProjectId", currentProject.id);
    }
  }, [currentProject?.id]);

  const selectProject = useCallback(
    (projectId: string) => {
      const selected = projects.find((project) => project.id === projectId);
      if (selected) {
        if (searchParams.get("db")) {
          const next = new URLSearchParams(searchParams);
          next.delete("db");
          setSearchParams(next);
          localStorage.removeItem("dbId");
        }
        dispatch(setCurrentProject(selected as any));
        localStorage.setItem("currentProjectId", selected.id);
        localStorage.setItem("currentProject", JSON.stringify(selected));
      }
    },
    [projects, searchParams, setSearchParams, dispatch]
  );

  return {
    projects,
    currentProject,
    selectProject,
  };
}
