import { useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/config/firebase";
import { setCurrentProject, useAppDispatch, useAppSelector } from "@/store";
import { useReadProjectState } from "./useReadProjectState";

export function useProjectManagement() {
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector((state) => state.project);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, projects, setProjects } = useReadProjectState();
  
  const isInitializedRef = useRef(false);
  const fetchingRef = useRef(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    fetchingRef.current = true;
    
    try {
      // 1. project_permissions kolleksiyasından istifadəçinin icazəli olduğu layihə ID-lərini tap
      const permissionsSnapshot = await getDocs(collection(db, "project_permissions"));
      
      const allowedProjectIds: string[] = [];
      
      permissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userList = data.user_list || [];
        
        // İstifadəçi bu layihədə var?
        const hasAccess = userList.some((perm: any) => perm.uid === user.uid);
        
        if (hasAccess) {
          allowedProjectIds.push(doc.id); // sənəd ID = projectId
        }
      });
      
      // Əgər heç bir layihə yoxdursa
      if (allowedProjectIds.length === 0) {
        setProjects([]);
        dispatch(setCurrentProject(null));
        isInitializedRef.current = true;
        return;
      }

      // 2. Yalnız icazəli layihələri gətir
      // Firestore "in" operatoru maksimum 30 element qəbul edir
      const limitedIds = allowedProjectIds.slice(0, 30);
      
      const projectsQuery = query(
        collection(db, "projects"),
        where(documentId(), "in", limitedIds)
      );

      const projectSnapshots = await getDocs(projectsQuery);
      const allProjects: any[] = [];
      
      projectSnapshots.forEach((docSnap) => {
        const data = docSnap.data();
        allProjects.push({
          id: docSnap.id,
          name: data.name,
          userId: data.userId,
          createdAt: data.createdAt?.toDate?.() || null,
        });
      });

      // Yaradılma tarixinə görə sırala (client-side)
      allProjects.sort((a, b) => {
        const dateA = a.createdAt?.getTime?.() || 0;
        const dateB = b.createdAt?.getTime?.() || 0;
        return dateB - dateA;
      });

      setProjects(allProjects);

      // 3. Cari layihəni təyin et
      if (allProjects.length > 0) {
        const savedProjectId = localStorage.getItem("currentProjectId");
        
        if (savedProjectId) {
          const foundProject = allProjects.find((p: any) => p.id === savedProjectId);
          if (foundProject) {
            dispatch(setCurrentProject(foundProject));
            isInitializedRef.current = true;
            return;
          }
          // Tapılmadısa, localStorage-i təmizlə
          localStorage.removeItem("currentProjectId");
        }
        
        // İlk layihəni seç
        dispatch(setCurrentProject(allProjects[0]));
      } else {
        dispatch(setCurrentProject(null));
      }

      isInitializedRef.current = true;
      
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
      dispatch(setCurrentProject(null));
    } finally {
      fetchingRef.current = false;
    }
  }, [user, dispatch, setProjects]);

  // Fetch projects - YALNIZ user dəyişəndə işləsin
  useEffect(() => {
    if (!user || fetchingRef.current) return;
    
    // Əgər artıq yüklənibsə, təkrar yükləmə
    if (isInitializedRef.current && projects.length > 0) {
      return;
    }

    fetchProjects();
  }, [user?.uid]); // YALNIZ user.uid dəyişəndə işləsin

  // Cari layihə dəyişəndə localStorage-ə yaz
  useEffect(() => {
    if (currentProject?.id) {
      localStorage.setItem("currentProjectId", currentProject.id);
    }
  }, [currentProject?.id]);

  const selectProject = useCallback((projectId: string) => {
    const selected = projects.find((project) => project.id === projectId);
    if (selected) {
      if (searchParams.get("db")) {
        const next = new URLSearchParams(searchParams);
        next.delete("db");
        setSearchParams(next);
        localStorage.removeItem("dbId");
      }
      dispatch(setCurrentProject(selected));
    }
  }, [projects, searchParams, setSearchParams, dispatch]);

  return {
    projects,
    currentProject,
    selectProject
  };
}
