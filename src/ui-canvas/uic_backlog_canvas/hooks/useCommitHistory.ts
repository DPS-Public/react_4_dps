import { useEffect, useState } from "react";
import { message } from "antd";

import { callApiWithToken } from "@/utils/callApi";

export const useCommitHistory = (
    drawerOpen: boolean,
    node: any | null,
    activeTab: string
) => {
    const [commits, setCommits] = useState<any[]>([]);
    const [loadingCommits, setLoadingCommits] = useState(false);
    const [selectedCommit, setSelectedCommit] = useState<any | null>(null);

    useEffect(() => {
        const loadCommitHistory = async () => {
            if (!drawerOpen || !node || activeTab !== "commits") return;
            if (!node.externalRepoFullName || !node.externalPath) return;

            setLoadingCommits(true);
            try {
                const userId = localStorage.getItem("githubId");
                if (!userId) {
                    message.error("GitHub ID not found");
                    return;
                }

                const branchToUse = node.externalBranch || "main";
                const res = await callApiWithToken("/integration-github/repo-file-commits", {
                    userId,
                    repoFullName: node.externalRepoFullName,
                    path: node.externalPath,
                    branch: branchToUse,
                    perPage: 10,
                    all: true,
                });

                if (res.status === 200 && res.commits) {
                    const sortedCommits = [...res.commits].sort((a, b) => {
                        const dateA = new Date(a.author?.date || a.committer?.date);
                        const dateB = new Date(b.author?.date || b.committer?.date);
                        return dateB.getTime() - dateA.getTime();
                    });
                    setCommits(sortedCommits);
                } else {
                    message.error(res.error || "Failed to load commit history");
                    setCommits([]);
                }
            } catch (error: any) {
                console.error("Error loading commit history:", error);
                message.error(error?.message || "Failed to load commit history");
                setCommits([]);
            } finally {
                setLoadingCommits(false);
            }
        };

        loadCommitHistory();
    }, [drawerOpen, node, activeTab]);

    const resetCommits = () => {
        setCommits([]);
        setSelectedCommit(null);
    };

    return {
        commits,
        loadingCommits,
        selectedCommit,
        setSelectedCommit,
        resetCommits,
    };
};


