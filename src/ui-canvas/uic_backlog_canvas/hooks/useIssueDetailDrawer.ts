import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { message } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import services from "../services/backlogService";

export const useIssueDetailDrawer = (currentProject: any) => {
    const [issueDetailDrawerOpen, setIssueDetailDrawerOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const loadedIssueKeyRef = useRef<string | null>(null);
    const issueKey = searchParams.get("key");

    // Listen for openIssueDrawer event
    useEffect(() => {
        const handleOpenIssueDrawer = async (event: CustomEvent) => {
            const issue = event.detail;
            if (issue && currentProject?.id) {
                try {
                    const fullIssue = await services.getTaskById(currentProject.id, issue.id);
                    setSelectedIssue({ ...issue, ...fullIssue });
                    setIssueDetailDrawerOpen(true);
                    loadedIssueKeyRef.current = issue.id;
                } catch (error) {
                    console.error("Error loading issue:", error);
                    message.error("Failed to load issue details");
                }
            }
        };

        window.addEventListener("openIssueDrawer", handleOpenIssueDrawer as EventListener);
        return () =>
            window.removeEventListener("openIssueDrawer", handleOpenIssueDrawer as EventListener);
    }, [currentProject]);

    // Load from URL key
    useEffect(() => {
        if (issueKey && currentProject?.id) {
            if (loadedIssueKeyRef.current !== issueKey) {
                const loadIssueFromKey = async () => {
                    try {
                        const issueData = await services.getTaskById(currentProject.id, issueKey);
                        if (issueData) {
                            const fullIssue = { id: issueKey, ...issueData };
                            setSelectedIssue(fullIssue);
                            setIssueDetailDrawerOpen(true);
                            loadedIssueKeyRef.current = issueKey;

                            // Remove key from URL immediately after opening the issue,
                            // so page refresh does not re-open the same issue again.
                            const nextParams = new URLSearchParams(window.location.search);
                            nextParams.delete("key");
                            setSearchParams(nextParams, { replace: true });
                        }
                    } catch (error) {
                        console.error("Error loading issue by key:", error);
                    }
                };
                loadIssueFromKey();
            }
        } else if (!issueKey) {
            loadedIssueKeyRef.current = null;
        }
    }, [issueKey, currentProject?.id, setSearchParams]);

    useEffect(() => {
        if (!issueDetailDrawerOpen || !selectedIssue?.id || !currentProject?.id) return;

        const issueRef = doc(db, `backlog_${currentProject.id}`, selectedIssue.id);
        const unsubscribe = onSnapshot(issueRef, (snapshot) => {
            if (!snapshot.exists()) return;
            setSelectedIssue((prev: any) => ({
                ...(prev || {}),
                id: snapshot.id,
                ...snapshot.data(),
            }));
        });

        return () => unsubscribe();
    }, [issueDetailDrawerOpen, selectedIssue?.id, currentProject?.id]);

    const refreshSelectedIssue = async (issueId?: string) => {
        if (!currentProject?.id || !issueId) return;
        try {
            const updatedIssue = await services.getTaskById(currentProject.id, issueId);
            if (updatedIssue) {
                setSelectedIssue((prev: any) => (prev ? { ...prev, ...updatedIssue } : prev));
            }
        } catch (e) {
            console.error("Failed to refresh selected issue:", e);
        }
    };

    const closeIssueDetailDrawer = () => {
        setIssueDetailDrawerOpen(false);
        setSelectedIssue(null);
        loadedIssueKeyRef.current = null;
    };

    return {
        issueDetailDrawerOpen,
        setIssueDetailDrawerOpen,
        selectedIssue,
        setSelectedIssue,
        refreshSelectedIssue,
        closeIssueDetailDrawer,
    };
};
