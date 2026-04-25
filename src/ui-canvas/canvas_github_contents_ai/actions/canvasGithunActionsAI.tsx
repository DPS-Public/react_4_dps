import {Form, message} from 'antd';
import {DataNode} from 'antd/es/tree';
import React, {useRef, useState} from 'react';
import {FileOutlined, FolderOpenOutlined,} from "@ant-design/icons";
import { getGitHubAccessToken } from '@/config/firebase';

interface Repository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    updated_at: string;
    language: string;
}

interface RepoContent {
    path: string;
    content?: string;
    size?: number;
    encoding?: string;
    type: "file" | "dir";
}

interface Branch {
    name: string;
    protected?: boolean;
}

interface FileContent {
    content: string;
    encoding: string;
    sha?: string;
}

export default function useGithubActions() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("main");
    const [repoContent, setRepoContent] = useState<RepoContent[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);
    const [loadingFile, setLoadingFile] = useState(false);
    const [selectedFileKey, setSelectedFileKey] = useState<string>();
    const [treeSearchTerm, setTreeSearchTerm] = useState("");
    const [fileContent, setFileContent] = useState<FileContent | string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [error, setError] = useState<string>();
    const [commitModalVisible, setCommitModalVisible] = useState(false);
    const [commitMessage, setCommitMessage] = useState("Updated file");
    const [blobSha, setBlobSha] = useState<string>("");
    const [commitSha, setCommitSha] = useState<string>("");
    const [form] = Form.useForm();
    const selectRef = useRef<any>();
    const githubId = localStorage.getItem("githubId");
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const firebaseUid = userData?.uid || localStorage.getItem("uid") || "";
    const userId = githubId || firebaseUid;
    const githubAccessToken = "";
    const token = localStorage.getItem("token");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    // Git operation states
    const [isAdding, setIsAdding] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    // New file states
    const [newFileModalVisible, setNewFileModalVisible] = useState(false);
    const [newFileName, setNewFileName] = useState("");
    const [newFileContent, setNewFileContent] = useState("");
    const [isCreatingFile, setIsCreatingFile] = useState(false);

    const getGithubToken = async () => {
        const token = await getGitHubAccessToken();
        if (!token) {
            throw new Error("GitHub token not found. Please login with GitHub again.");
        }
        return token;
    };

    const parseRepo = (repoFullName: string) => {
        const [owner, repo] = repoFullName.split("/");
        return { owner, repo };
    };

    const toBase64 = (content: string) => {
        const normalized = unescape(encodeURIComponent(content));
        return btoa(normalized);
    };

    const fromBase64 = (content: string) => {
        const normalized = atob(content);
        return decodeURIComponent(escape(normalized));
    };

    const githubRequest = async (url: string, options?: RequestInit) => {
        const githubToken = await getGithubToken();
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                ...(options?.headers || {}),
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `GitHub request failed: ${response.status}`);
        }

        return response.json();
    };

    const getRepoBranches = async (repoFullName: string) => {
        try {
            setLoadingBranches(true);
            setError(undefined);
            const { owner, repo } = parseRepo(repoFullName);
            const data = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);

            if (Array.isArray(data)) {
                const normalizedBranches = data.map((branch: any) => ({
                    name: branch.name,
                    protected: !!branch.protected,
                }));
                setBranches(normalizedBranches);
                return normalizedBranches;
            }

            setError("Failed to load branches");
            return [];
        } catch (error) {
            console.error("Error fetching branches:", error);
            setError(error instanceof Error ? error.message : "Error loading branches");
            return [];
        } finally {
            setLoadingBranches(false);
        }
    };

    const getRepoContent = async () => {
        if (!selectedRepo || !selectedBranch) return;

        try {
            setLoadingContent(true);
            setError(undefined);
            setRepoContent([]);
            setSelectedFileKey(undefined);
            setFileContent("");
            const { owner, repo } = parseRepo(selectedRepo);
            const data = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/git/trees/${selectedBranch}?recursive=1`);

            if (Array.isArray(data?.tree)) {
                const files: RepoContent[] = data.tree
                    .filter((item: any) => item.type === "blob" || item.type === "tree")
                    .map((item: any) => ({
                        path: item.path,
                        size: item.size,
                        type: item.type === "blob" ? "file" : "dir",
                    }));

                setRepoContent(files);
                message.success(`Loaded ${files.length} items from ${selectedBranch} branch`);
                return;
            }

            setError("No content found in repository.");
        } catch (error) {
            console.error("Error fetching repository content:", error);
            setError(error instanceof Error ? error.message : "Error loading repository content");
        } finally {
            setLoadingContent(false);
        }
    };

    const getFileContent = async (path: string) => {
        if (!path || !selectedRepo || !selectedBranch) return;

        try {
            setLoadingFile(true);
            setError(undefined);
            const { owner, repo } = parseRepo(selectedRepo);
            const encodedPath = path
                .split("/")
                .map((segment) => encodeURIComponent(segment))
                .join("/");
            const data = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(selectedBranch)}`);

            if (data?.content) {
                const decodedContent = fromBase64(data.content.replace(/\n/g, ""));
                const normalizedContent: FileContent = {
                    content: decodedContent,
                    encoding: data.encoding || "base64",
                    sha: data.sha,
                };
                setFileContent(normalizedContent);
                setEditContent(decodedContent);
                return;
            }

            setError("Failed to load file content");
        } catch (error) {
            console.error("Error fetching file content:", error);
            setError(error instanceof Error ? error.message : "Error loading file content");
        } finally {
            setLoadingFile(false);
        }
    };

    const handleSaveFile = async () => {
        if (!selectedFileKey || !selectedRepo) return;

        try {
            await form.validateFields();
            setCommitModalVisible(true);
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    const addFileChanges = async () => {
        try {
            setIsAdding(true);
            if (!selectedRepo || !selectedFileKey) return false;

            const { owner, repo } = parseRepo(selectedRepo);
            const data = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFileKey}?ref=${selectedBranch}`);
            setBlobSha(data?.sha || "");
            message.success("Changes staged successfully");
            return true;
        } catch (error) {
            console.error("Error staging changes:", error);
            setError(error instanceof Error ? error.message : "Error staging changes");
            return false;
        } finally {
            setIsAdding(false);
        }
    };

    const commitFileChanges = async () => {
        try {
            setIsCommitting(true);
            if (!selectedRepo || !selectedFileKey || !selectedBranch) return false;

            const { owner, repo } = parseRepo(selectedRepo);
            const currentFileSha = blobSha || (typeof fileContent === "object" ? fileContent.sha : "");

            const payload: any = {
                message: commitMessage || "Updated file",
                content: toBase64(editContent),
                branch: selectedBranch,
            };

            if (currentFileSha) {
                payload.sha = currentFileSha;
            }

            const data = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFileKey}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            setCommitSha(data?.commit?.sha || "");
            if (data?.content?.sha) {
                setBlobSha(data.content.sha);
            }
            message.success("Changes committed successfully");
            return true;
        } catch (error) {
            console.error("Error committing changes:", error);
            setError(error instanceof Error ? error.message : "Error committing changes");
            return false;
        } finally {
            setIsCommitting(false);
        }
    };

    const pushFileChanges = async () => {
        try {
            setIsPushing(true);
            if (!commitSha) {
                setError("No commit found. Commit changes first.");
                return false;
            }

            message.success("Changes are already pushed to GitHub");
            return true;
        } catch (error) {
            console.error("Error pushing changes:", error);
            setError(error instanceof Error ? error.message : "Error pushing changes");
            return false;
        } finally {
            setIsPushing(false);
        }
    };

    const createNewFile = async () => {
        if (!newFileName || !selectedRepo || !selectedBranch) {
            message.error("Please provide a file name");
            return;
        }

        try {
            setIsCreatingFile(true);
            const fullPath = selectedFolder ? `${selectedFolder}/${newFileName}` : newFileName;

            const { owner, repo } = parseRepo(selectedRepo);
            await githubRequest(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`, {
                method: "PUT",
                body: JSON.stringify({
                    message: `Create new file: ${newFileName}`,
                    content: toBase64(""),
                    branch: selectedBranch,
                }),
            });

            message.success(`File ${newFileName} created successfully`);
            setNewFileName("");
            setNewFileContent(""); // Reset to empty
            setNewFileModalVisible(false);
            await getRepoContent(); // Refresh the content
            return true;
        } catch (error) {
            console.error("Error creating file:", error);
            const errorMessage = error instanceof Error ? error.message : "Error creating file";
            setError(errorMessage);
            message.error(errorMessage);
            return false;
        } finally {
            setIsCreatingFile(false);
        }
    };

    const handleCreateFileClick = (folderPath: string) => {
        setSelectedFolder(folderPath);
        setNewFileName("");
        setNewFileContent(""); // Always create empty file
        setNewFileModalVisible(true);
    };

    const handleGitAdd = async () => {
        await addFileChanges();
    };

    const handleGitCommit = async () => {
        try {
            await form.validateFields();
            await commitFileChanges();
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    const handleGitPush = async () => {
        await pushFileChanges();
    };

    const buildTreeData = (files: RepoContent[]): DataNode[] => {
        const tree: Record<string, any> = {};

        files.forEach((file) => {
            const parts = file.path.split("/");
            let current = tree;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        title: part,
                        key: parts.slice(0, index + 1).join("/"),
                        isLeaf: index === parts.length - 1 && file.type === "file",
                        icon:
                            index === parts.length - 1
                                ? file.type === "file"
                                    ? <FileOutlined />
                                    : <FolderOpenOutlined />
                                : undefined,
                        children: {},
                    };
                }
                current = current[part].children;
            });
        });

        const convertToTreeNodes = (node: any): DataNode[] =>
            Object.values(node)
                .map((item: any) => {
                    const children = convertToTreeNodes(item.children);
                    const matchesSearch = item.title
                        .toLowerCase()
                        .includes(treeSearchTerm.toLowerCase());

                    if (treeSearchTerm && !matchesSearch && children.length === 0) {
                        return null;
                    }

                    return {
                        title: item.title,
                        key: item.key,
                        isLeaf: item.isLeaf,
                        icon: item.icon,
                        children,
                    };
                })
                .filter(Boolean);

        return convertToTreeNodes(tree);
    };

    const handleTreeSelect = (keys: React.Key[], info: { node: DataNode }) => {
        if (keys.length > 0) {
            const path = keys[0] as string;
            setSelectedFileKey(path);
            setTreeSearchTerm("");
            
            const pathParts = path.split('/');
            if (pathParts.length > 1) {
                if (info.node.isLeaf) {
                    getFileContent(path)
                    setSelectedFolder(pathParts.slice(0, -1).join('/'));
                    
                } else {
                    setSelectedFolder(path);
                }
            } else {
                setSelectedFolder(null);
            }
            
            setTimeout(() => {
                selectRef.current?.blur();
            }, 0);
        }
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            setEditContent(typeof fileContent === 'string' ? fileContent : fileContent.content);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(typeof fileContent === 'string' ? fileContent : fileContent.content);
    };

    const fileName = selectedFileKey?.split("/").pop() || "";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "text";

    return {
        repositories,
        setRepositories,
        selectedRepo,
        setSelectedRepo,
        branches,
        setBranches,
        selectedBranch,
        setSelectedBranch,
        repoContent,
        setRepoContent,
        loadingRepos: loadingRepos,
        setLoadingRepos,
        loadingBranches,
        setLoadingBranches,
        loadingContent,
        setLoadingContent,
        loadingFile,
        setLoadingFile,
        selectedFileKey,
        setSelectedFileKey,
        treeSearchTerm,
        setTreeSearchTerm,
        fileContent,
        setFileContent,
        isEditing,
        setIsEditing,
        editContent,
        setEditContent,
        error,
        setError,
        commitModalVisible,
        setCommitModalVisible,
        commitMessage,
        setCommitMessage,
        commitSha,
        setCommitSha,
        form,
        selectRef,
        githubId,
        userId,
        isAdding,
        setIsAdding,
        isCommitting,
        setIsCommitting,
        isPushing,
        setIsPushing,
        selectedFolder,
        setSelectedFolder,
        newFileModalVisible,
        setNewFileModalVisible,
        newFileName,
        setNewFileName,
        newFileContent,
        setNewFileContent,
        isCreatingFile,
        getRepoBranches,
        getRepoContent,
        getFileContent,
        handleSaveFile,
        addFileChanges,
        commitFileChanges,
        pushFileChanges,
        createNewFile,
        handleCreateFileClick,
        handleGitAdd,
        handleGitCommit,
        handleGitPush,
        buildTreeData,
        handleTreeSelect,
        handleEditToggle,
        handleCancelEdit,
        fileName,
        fileExtension,
        token
    };
}
