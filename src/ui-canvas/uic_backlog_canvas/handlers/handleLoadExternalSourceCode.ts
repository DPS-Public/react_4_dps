import { message } from "antd";

import { callApiWithToken } from "@/utils/callApi";

interface HandleLoadExternalSourceCodeParams {
    repoFullName: string;
    filePath: string;
    branch: string;
    nodeId?: string;
    onSuccess: (content: string, node: any) => void;
}

export const handleLoadExternalSourceCode = async ({
    repoFullName,
    filePath,
    branch,
    nodeId,
    onSuccess,
}: HandleLoadExternalSourceCodeParams) => {
    const userId = localStorage.getItem("githubId");
    if (!userId) {
        message.error("GitHub user ID not found. Please authenticate with GitHub first.");
        return;
    }

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const uid = userData?.uid || null;

    try {
        const res = await callApiWithToken("/integration-github/repo-file-content", {
            userId,
            uid,
            repoFullName,
            path: filePath,
            branch,
        });

        if (res.status === 200 && res.content) {
            const content =
                typeof res.content === "string" ? res.content : res.content.content || "";
            const displayName = String(filePath).split("/").pop() || "";
            const nodeForDrawer: any = {
                id: nodeId || `${repoFullName}:${filePath}`,
                name: displayName,
                type: "file",
                pathName: filePath,
                externalPath: filePath,
                externalRepoFullName: repoFullName,
                externalBranch: branch,
            };
            onSuccess(content, nodeForDrawer);
        } else {
            const errorMsg = res?.message || res?.error || `API returned status ${res?.status}`;
            message.error(`Failed to load source code: ${errorMsg}`);
        }
    } catch (error: any) {
        const errorMsg = error?.response?.data?.error || error?.message || "Unknown error";
        message.error(`Failed to load source code: ${errorMsg}`);
    }
};


