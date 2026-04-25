import { startTransition, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import {
    utilGeneratePathNamesChunked,
    utilToggleSetNode,
} from "../utils/utilTreeHelpers";

export const useAddCrdComponentDrawer = (addCrdComponentDrawer: boolean) => {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentRepo = useSelector((state: RootState) => state.project.currentRepo);

    const [addCrdComponentDrawerOpen, setAddCrdComponentDrawerOpen] = useState(false);
    const [addCrdComponentTreeData, setAddCrdComponentTreeData] = useState<any[]>([]);
    const [loadingAddCrdComponentTree, setLoadingAddCrdComponentTree] = useState(false);
    const [selectedCrdComponent, setSelectedCrdComponent] = useState<any | null>(null);
    const [addCrdExpandedNodes, setAddCrdExpandedNodes] = useState<Set<string>>(new Set());
    const [addCrdSelectedRepoId, setAddCrdSelectedRepoId] = useState<string | null>(null);
    const [allRepositories, setAllRepositories] = useState<any[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);

    useEffect(() => {
        if (addCrdComponentDrawer) {
            setAddCrdComponentDrawerOpen(true);
            setAddCrdSelectedRepoId(currentRepo);
        } else {
            setAddCrdComponentDrawerOpen(false);
            setAddCrdSelectedRepoId(null);
            setSelectedCrdComponent(null);
            setAddCrdExpandedNodes(new Set());
        }
    }, [addCrdComponentDrawer, currentRepo]);

    useEffect(() => {
        const loadRepositories = async () => {
            if (!addCrdComponentDrawerOpen || !currentProject?.id) return;

            setLoadingRepos(true);
            try {
                const userData = JSON.parse(localStorage.getItem("userData") || "{}");
                const userId = localStorage.getItem("githubId");
                const uid = userData?.uid;
                if (!userId || !uid) {
                    setLoadingRepos(false);
                    return;
                }

                const { callApiWithToken } = await import("@/utils/callApi");
                const res = await callApiWithToken("/github-project-permission/repo-list", {
                    projectId: currentProject.id,
                    userId,
                    uid,
                });

                if (res.status === 200 && Array.isArray(res.data)) {
                    setAllRepositories(res.data);
                    if (!addCrdSelectedRepoId && res.data.length > 0) {
                        setAddCrdSelectedRepoId(currentRepo || String(res.data[0]?.id));
                    }
                }
            } catch (error) {
                console.error("Error loading repositories:", error);
            } finally {
                setLoadingRepos(false);
            }
        };
        loadRepositories();
    }, [addCrdComponentDrawerOpen, currentProject?.id]);

    useEffect(() => {
        let cancelled = false;

        const loadAddCrdComponentTreeData = async () => {
            if (!addCrdComponentDrawerOpen) {
                setAddCrdComponentTreeData([]);
                setLoadingAddCrdComponentTree(false);
                return;
            }

            const repoIdToUse = addCrdSelectedRepoId || currentRepo;
            if (!repoIdToUse) {
                setAddCrdComponentTreeData([]);
                setLoadingAddCrdComponentTree(false);
                return;
            }

            setLoadingAddCrdComponentTree(true);
            try {
                const projectId = currentProject?.id || null;
                const { callApiWithToken } = await import("@/utils/callApi");
                const res = await callApiWithToken("/crd-relation/read-crd", {
                    repoId: repoIdToUse,
                    projectId,
                });

                let treeData: any[] = [];
                if (res.success && res.data) {
                    if (Array.isArray(res.data)) treeData = res.data;
                    else if (res.data.data && Array.isArray(res.data.data)) treeData = res.data.data;
                    else if (res.data.treeData && Array.isArray(res.data.treeData)) {
                        treeData = res.data.treeData;
                    }
                }

                if (treeData.length > 0) {
                    setAddCrdComponentTreeData([]);
                    await utilGeneratePathNamesChunked(treeData, (chunkedTreeData) => {
                        if (cancelled) return;
                        startTransition(() => {
                            setAddCrdComponentTreeData(chunkedTreeData);
                        });
                    });

                    if (cancelled) return;

                    startTransition(() => {
                        setAddCrdExpandedNodes(new Set());
                    });
                } else {
                    setAddCrdComponentTreeData([]);
                }
            } catch (error) {
                console.error("Error loading CRD tree data:", error);
                setAddCrdComponentTreeData([]);
            } finally {
                if (!cancelled) {
                    setLoadingAddCrdComponentTree(false);
                }
            }
        };
        loadAddCrdComponentTreeData();

        return () => {
            cancelled = true;
        };
    }, [addCrdComponentDrawerOpen, addCrdSelectedRepoId, currentRepo, currentProject?.id]);

    const toggleAddCrdFolder = (nodeId: string) => {
        setAddCrdExpandedNodes((prev) => utilToggleSetNode(prev, nodeId));
    };

    const closeAddCrdDrawer = (setContextDrawer: (v: boolean) => void) => {
        setAddCrdComponentDrawerOpen(false);
        setSelectedCrdComponent(null);
        setAddCrdExpandedNodes(new Set());
        setContextDrawer(false);
        delete (window as any).__updatingCrdComponent;
    };

    return {
        addCrdComponentDrawerOpen,
        setAddCrdComponentDrawerOpen,
        addCrdComponentTreeData,
        loadingAddCrdComponentTree,
        selectedCrdComponent,
        setSelectedCrdComponent,
        addCrdExpandedNodes,
        addCrdSelectedRepoId,
        setAddCrdSelectedRepoId,
        allRepositories,
        loadingRepos,
        toggleAddCrdFolder,
        closeAddCrdDrawer,
    };
};
