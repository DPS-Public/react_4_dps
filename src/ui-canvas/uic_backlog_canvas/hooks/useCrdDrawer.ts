import { startTransition, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import {
    utilFilterTreeBySearch,
    utilGetAncestorFolderIds,
    utilGeneratePathNamesChunked,
    utilToggleSetNode,
} from "../utils/utilTreeHelpers";

export const useCrdDrawer = () => {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentRepo = useSelector((state: RootState) => state.project.currentRepo);

    const [crdDrawerOpen, setCrdDrawerOpen] = useState(false);
    const [crdDrawerNodeId, setCrdDrawerNodeId] = useState<string | null>(null);
    const [crdDrawerRepoId, setCrdDrawerRepoId] = useState<string | null>(null);
    const [crdTreeData, setCrdTreeData] = useState<any[]>([]);
    const [loadingCrdTree, setLoadingCrdTree] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [crdTreeSearchTerm, setCrdTreeSearchTerm] = useState<string>("");

    const filteredCrdTreeData = useMemo(
        () =>
            crdTreeSearchTerm
                ? utilFilterTreeBySearch(crdTreeData, crdTreeSearchTerm)
                : crdTreeData,
        [crdTreeData, crdTreeSearchTerm]
    );

    useEffect(() => {
        let cancelled = false;

        const loadCrdTreeData = async () => {
            if (!crdDrawerOpen) {
                setCrdTreeData([]);
                setLoadingCrdTree(false);
                return;
            }

            const repoIdToUse = crdDrawerRepoId || currentRepo;
            if (!repoIdToUse) {
                setCrdTreeData([]);
                setLoadingCrdTree(false);
                return;
            }

            setLoadingCrdTree(true);
            try {
                const projectId = currentProject?.id || null;
                const { callApiWithToken } = await import("@/utils/callApi");
                const res = await callApiWithToken("/crd-relation/read-crd", {
                    repoId: repoIdToUse,
                    projectId,
                });

                if (res.success && res.data && res.data.data) {
                    setCrdTreeData([]);
                    const treeDataWithPaths = await utilGeneratePathNamesChunked(
                        res.data.data,
                        (chunkedTreeData) => {
                            if (cancelled) return;
                            startTransition(() => {
                                setCrdTreeData(chunkedTreeData);
                            });
                        }
                    );

                    if (cancelled) return;

                    startTransition(() => {
                        setExpandedNodes(
                            new Set(utilGetAncestorFolderIds(treeDataWithPaths, crdDrawerNodeId))
                        );
                    });
                } else {
                    setCrdTreeData([]);
                }
            } catch (error) {
                console.error("Error loading CRD tree data:", error);
                setCrdTreeData([]);
            } finally {
                if (!cancelled) {
                    setLoadingCrdTree(false);
                }
            }
        };

        loadCrdTreeData();

        return () => {
            cancelled = true;
        };
    }, [crdDrawerOpen, crdDrawerRepoId, currentRepo, currentProject?.id, crdDrawerNodeId]);

    const toggleFolder = (nodeId: string) => {
        setExpandedNodes((prev) => utilToggleSetNode(prev, nodeId));
    };

    const closeCrdDrawer = () => {
        setCrdDrawerOpen(false);
        setCrdDrawerNodeId(null);
        setCrdDrawerRepoId(null);
        setExpandedNodes(new Set());
        setCrdTreeSearchTerm("");
    };

    return {
        crdDrawerOpen,
        setCrdDrawerOpen,
        crdDrawerNodeId,
        setCrdDrawerNodeId,
        crdDrawerRepoId,
        setCrdDrawerRepoId,
        crdTreeData,
        loadingCrdTree,
        expandedNodes,
        crdTreeSearchTerm,
        setCrdTreeSearchTerm,
        filteredCrdTreeData,
        toggleFolder,
        closeCrdDrawer,
    };
};
