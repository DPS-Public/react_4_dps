import {
    Alert,
    Button,
    Card,
    DatePicker,
  Drawer,
    Dropdown,
    Form,
    Input,
  List,
    Menu,
    message,
    Modal,
    Progress,
    Select,
    Skeleton,
    Space,
    Spin,
    Tag,
    Tooltip,
    Tree,
    Typography,
} from "antd";
import {
    BranchesOutlined,
    CheckOutlined,
    CloseOutlined,
    CodeOutlined,
    ContainerOutlined,
    EditOutlined,
    FileOutlined,
    FolderOpenOutlined,
    GithubOutlined,
    HistoryOutlined,
    LoadingOutlined,
    LoginOutlined,
    LogoutOutlined,
    PlusOutlined,
    RobotOutlined,
    RocketOutlined,
    SaveOutlined,
    SearchOutlined,
    SyncOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import canvasGithunActions from "./actions/canvasGithunActionsAI";
import {useEffect, useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import dayjs from "dayjs";
import { useAppSelector } from "@/store";
import { clearGitHubSessionStorage, getGitHubAccessToken, loginWithGitHub } from "@/config/firebase";
import { getProjectGithubRepositories } from "@/services/frontendData";
import { useAsyncTreeData } from "@/hooks/useAsyncTreeData";

// Custom icons for different services
const VSCodeIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
  </svg>
);

const CodeSandboxIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M2 6l10.455-6L22.91 6 23 17.95 12.455 24 2 18V6zm2.088 2.481v4.757l3.345 1.86v3.516l3.972 2.296v-8.272L4.088 8.481zm16.739 0l-7.317 4.157v8.272l3.972-2.296V15.1l3.345-1.861V8.48zM5.134 6.601l7.303 4.144 7.32-4.18-3.871-2.197-3.41 1.945-3.43-1.968L5.133 6.6z" />
  </svg>
);

const StackBlitzIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M10.797 14.182H3.635L16.728 0l-3.525 9.818h7.162L7.272 24l3.524-9.818Z" />
  </svg>
);

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const getHistoryDateRangePresets = () => [
  {
    label: "Today",
    value: [dayjs().startOf("day"), dayjs().endOf("day")],
  },
  {
    label: "Yesterday",
    value: [
      dayjs().subtract(1, "day").startOf("day"),
      dayjs().subtract(1, "day").endOf("day"),
    ],
  },
  {
    label: "Last 7 Days",
    value: [dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")],
  },
  {
    label: "This Week",
    value: [dayjs().startOf("week"), dayjs().endOf("week")],
  },
  {
    label: "Last Week",
    value: [
      dayjs().subtract(1, "week").startOf("week"),
      dayjs().subtract(1, "week").endOf("week"),
    ],
  },
  {
    label: "This Month",
    value: [dayjs().startOf("month"), dayjs().endOf("month")],
  },
  {
    label: "Last Month",
    value: [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
  },
];

const openInMenuItemStyle = {
  margin: 0,
  paddingLeft: 8,
  paddingRight: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
};

const openInMenuIconWrapStyle = {
  width: 16,
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
};

const formatReadableError = (rawError?: string) => {
  if (!rawError) return "Unknown error";

  const normalizeMessage = (payload: any) => {
    const messageText = String(payload?.message || rawError);
    const statusCode = payload?.status;

    if (statusCode === 409 || messageText.includes("does not match")) {
      return [
        "Conflict detected: file changed on GitHub.",
        "Please refresh file content and retry commit.",
      ].join("\n");
    }

    if (statusCode === 404) {
      return "File not found on GitHub. Please refresh and verify file path.";
    }

    if (statusCode === 403) {
      return "Permission denied. Your GitHub token may not have write access to this repository.";
    }

    if (statusCode) {
      return `GitHub request failed (status: ${statusCode}). ${messageText}`;
    }

    return messageText;
  };

  try {
    return normalizeMessage(JSON.parse(rawError));
  } catch {
    try {
      const firstBrace = rawError.indexOf("{");
      const lastBrace = rawError.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return normalizeMessage(JSON.parse(rawError.slice(firstBrace, lastBrace + 1)));
      }
    } catch {
      // Ignore parse errors and fall back to raw text.
    }
  }

  return rawError;
};

interface ConfiguredGithubRepo {
  id: string;
  owner: string;
  repo: string;
  type?: string;
  project_id?: string;
}

export default function CanvasGithubAI() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
 const currentProject = useAppSelector((state) => state.project.currentProject);
  const {
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
    loadingRepos,
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
    token,
  } = canvasGithunActions();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectType, setProjectType] = useState("");
  const [acfProjectsList, setAcfProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [progLanguage, setProgLanguage] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [type, setType] = useState("");
  const uid = userData?.uid || null;
  const isInitializingFromUrl = useRef(false);
  const pendingRestoredFileRef = useRef<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [commitModalError, setCommitModalError] = useState<string>("");
  const [commitHistoryOpen, setCommitHistoryOpen] = useState(false);
  const [commitHistoryLoading, setCommitHistoryLoading] = useState(false);
  const [commitHistoryItems, setCommitHistoryItems] = useState<any[]>([]);
  const [historyFilterBranch, setHistoryFilterBranch] = useState<string>("");
  const [historyDateRange, setHistoryDateRange] = useState<any>(null);
  const [historyBranches, setHistoryBranches] = useState<string[]>([]);
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const [commitFilesMap, setCommitFilesMap] = useState<Record<string, any[]>>({});
  const [diffDrawerOpen, setDiffDrawerOpen] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<any>(null);
  const { treeData, expandedKeys, isBuildingTree, treeBuildProgress } = useAsyncTreeData(repoContent, treeSearchTerm);

  const getGithubSelectionStorageKey = () =>
    `canvasGithubAISelection:${currentProject?.id || "global"}`;

  const getGithubTreeStorageKey = (repo?: string, branch?: string) =>
    `canvasGithubAITree:${currentProject?.id || "global"}:${repo || "no-repo"}:${branch || "no-branch"}`;

  const readSavedGithubSelection = () => {
    try {
      const raw = localStorage.getItem(getGithubSelectionStorageKey());
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return {
        repo: parsed?.repo || "",
        branch: parsed?.branch || "",
        file: parsed?.file || "",
      };
    } catch {
      return null;
    }
  };

  const readSavedRepoTree = (repo?: string, branch?: string) => {
    if (!repo || !branch) return [];

    try {
      const raw = localStorage.getItem(getGithubTreeStorageKey(repo, branch));
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    } catch {
      return [];
    }
  };

  const saveRepoTree = (repo: string, branch: string, files: any[]) => {
    localStorage.setItem(
      getGithubTreeStorageKey(repo, branch),
      JSON.stringify({
        files,
        updatedAt: Date.now(),
      })
    );
  };
  

  useEffect(() => {
    if (githubId) {
      setIsAuthenticated(true);
    }
  }, [githubId]);

  const [githubLoading, setGithubLoading] = useState(false);

  const handleOpenInEditor = (type: string) => {
    if (!selectedRepo) {
      message.warning("Please select a repository first");
      return;
    }

    const [owner, repo] = selectedRepo.split("/");
    const file = selectedFileKey || "README.md";
    const branch = selectedBranch || "main";

    switch (type) {
      case "vscode":
        window.open(
          `vscode://vscode.git/clone?url=https://github.com/${owner}/${repo}.git`,
          "_blank"
        );
        break;
      case "stackblitz":
        window.open(
          `https://stackblitz.com/github/${owner}/${repo}?file=${file}`,
          "_blank"
        );
        break;
      case "codesandbox":
        window.open(
          `https://codesandbox.io/p/github/${owner}/${repo}/${branch}?file=/${file}&import=true`,
          "_blank"
        );
        break;
      case "github.dev":
        window.open(`https://github.dev/${owner}/${repo}`, "_blank");
        break;
      case "github.com":
        window.open(`https://github.com/${owner}/${repo}/tree/${branch}`, "_blank");
        break;
      case "codespace":
        handleOpenInCodeSpace();
        break;
      default:
        message.warning("Unsupported editor type");
        break;
    }
  };

  const handleOpenInCodeSpace = () => {
    if (!selectedRepo) {
      message.warning("Please select a repository first");
      return;
    }

    // Find the repository to get its ID
    const repo = repositories.find(r => r.full_name === selectedRepo);
    if (!repo || !repo.id) {
      message.error("Could not find repository ID");
      return;
    }

    // Open GitHub Codespaces for this repository
    window.open(`https://github.com/codespaces?repository_id=${repo.id}`, "_blank");
  };

  const editorMenu = (
    <Menu onClick={({ key }) => handleOpenInEditor(key)}>
      <Menu.Item
        key="vscode"
        style={openInMenuItemStyle}
        icon={<span style={openInMenuIconWrapStyle}><VSCodeIcon /></span>}
      >
        Open in VS Code
      </Menu.Item>
      <Menu.Item
        style={openInMenuItemStyle}
        key="stackblitz"
        icon={<span style={openInMenuIconWrapStyle}><StackBlitzIcon /></span>}
      >
        Open in StackBlitz
      </Menu.Item>
      <Menu.Item
        style={openInMenuItemStyle}
        key="codesandbox"
        icon={<span style={openInMenuIconWrapStyle}><CodeSandboxIcon /></span>}
      >
        Open in CodeSandbox
      </Menu.Item>
      <Menu.Item
        style={openInMenuItemStyle}
        key="codespace"
        icon={<span style={openInMenuIconWrapStyle}><CodeOutlined /></span>}
      >
        Open in CodeSpace
      </Menu.Item>
      <Menu.Item
        style={openInMenuItemStyle}
        key="github.com"
        icon={<span style={openInMenuIconWrapStyle}><GithubOutlined /></span>}
      >
        Open in github.com
      </Menu.Item>
      <Menu.Item
        style={openInMenuItemStyle}
        key="github.dev"
        icon={<span style={openInMenuIconWrapStyle}><CodeOutlined /></span>}
      >
        Open in github.dev
      </Menu.Item>
    </Menu>
  );

  const handleGitSubmit = async () => {
    setGithubLoading(true);
    try {
      await loginWithGitHub();
      const refreshedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
      const fallbackGithubId = refreshedUserData?.uid || localStorage.getItem("uid");

      if (!localStorage.getItem("githubId") && fallbackGithubId) {
        localStorage.setItem("githubId", fallbackGithubId.toString());
      }

      setIsAuthenticated(true);
      message.success("GitHub connected successfully");
      await handleProjectSelect();
    } catch (error: any) {
      console.error("GitHub OAuth error:", error);
      const errorMsg = error?.response?.data?.error || error?.message || "Error connecting to GitHub";
      message.error(errorMsg);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleGithubLogout = () => {
    setIsAuthenticated(false);
    setRepositories([]);
    setSelectedRepo(undefined);
    setBranches([]);
    setSelectedBranch(undefined);
    setRepoContent([]);
    setSelectedFileKey(undefined);
    setFileContent("");
    localStorage.removeItem(getGithubSelectionStorageKey());
    clearGitHubSessionStorage();
    message.success("Logged out from GitHub");
    navigate(location.pathname); // Clear query params
  };

  const fetchEnrollments = async () => {
    setProjects([]);
  };

  useEffect(() => {
    fetchEnrollments();
  }, [token]);

  const handleProjectSelect = async () => {
    try {
      setLoadingRepos(true);
      setError(undefined);
      setRepoContent([]);
      setSelectedFileKey(undefined);
      setFileContent("");
      setSelectedBranch(undefined);
      const githubToken = await getGitHubAccessToken();
      if (!githubToken) {
        throw new Error("GitHub token not found. Please authenticate with GitHub first.");
      }

      if (!currentProject?.id) {
        setRepositories([]);
        return;
      }

      const configuredRepos = await getProjectGithubRepositories(currentProject.id) as ConfiguredGithubRepo[];
      if (configuredRepos.length === 0) {
        setRepositories([]);
        message.info("No repositories configured in GitHub Repositories settings");
        return;
      }

      const accessibleRepos = await Promise.all(
        configuredRepos.map(async (configuredRepo) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${configuredRepo.owner}/${configuredRepo.repo}`,
              {
                headers: {
                  Authorization: `token ${githubToken}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );

            if (!response.ok) {
              return null;
            }

            const repo = await response.json();
            return {
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              private: !!repo.private,
              html_url: repo.html_url,
              description: repo.description,
              updated_at: repo.updated_at,
              language: repo.language,
            };
          } catch {
            return null;
          }
        })
      );

      const repos = accessibleRepos.filter(Boolean);

      setRepositories(repos);

      if (repos.length === 0) {
        message.info("No accessible configured repositories found");
      }
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setError(error instanceof Error ? error.message : "Error loading repositories");
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    handleProjectSelect();
  }, [currentProject]);

  useEffect(() => {
    if (!currentProject?.id || !selectedRepo || repositories.length === 0) {
      return;
    }

    const exists = repositories.some((repo) => repo.full_name === selectedRepo);
    if (!exists) {
      return;
    }

    localStorage.setItem(
      getGithubSelectionStorageKey(),
      JSON.stringify({
        repo: selectedRepo || "",
        branch: selectedBranch || "",
        file: selectedFileKey || "",
      })
    );
  }, [currentProject?.id, repositories, selectedRepo, selectedBranch, selectedFileKey]);

  useEffect(() => {
    if (!currentProject?.id || repositories.length === 0 || selectedRepo) {
      return;
    }

    const saved = readSavedGithubSelection();
    const matchedRepo = saved?.repo
      ? repositories.find((repo) => repo.full_name === saved.repo)
      : undefined;
    const repoToSelect = matchedRepo?.full_name || repositories[0]?.full_name;

    if (!repoToSelect) {
      return;
    }

    isInitializingFromUrl.current = true;
    pendingRestoredFileRef.current = saved?.file || undefined;
    setSelectedRepo(repoToSelect);
  }, [currentProject?.id, repositories, selectedRepo]);

  const acfProjects = async () => {
    setAcfProjectsList([]);
  };

  useEffect(() => {
    acfProjects();
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedRepo) {
      return;
    }

    setRepoContent([]);
    setSelectedFileKey(undefined);
    setFileContent("");
    pendingRestoredFileRef.current = readSavedGithubSelection()?.file || undefined;

    getRepoBranches(selectedRepo).then((loadedBranches: any[] = []) => {
      const savedSelection = readSavedGithubSelection();
      const preferredBranch =
        (savedSelection?.branch
          ? loadedBranches.find((branch) => branch.name === savedSelection.branch)
          : undefined) ||
        loadedBranches.find((branch) => branch.name === "main") ||
        loadedBranches.find((branch) => branch.name === "master") ||
        loadedBranches[0];

      setSelectedBranch(preferredBranch?.name || undefined);
      isInitializingFromUrl.current = false;
    });
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedRepo || !selectedBranch) {
      setRepoContent([]);
      setSelectedFileKey(undefined);
      setFileContent("");
      return;
    }

    const cachedTree = readSavedRepoTree(selectedRepo, selectedBranch);

    if (cachedTree.length > 0) {
      setRepoContent(cachedTree);
      return;
    }

    setRepoContent([]);
    setSelectedFileKey(undefined);
    setFileContent("");
  }, [selectedRepo, selectedBranch]);

  useEffect(() => {
    if (!selectedRepo || !selectedBranch || !repoContent?.length) {
      return;
    }

    const restoredFile = pendingRestoredFileRef.current;
    if (!restoredFile) {
      return;
    }

    const fileExists = repoContent.some(
      (item: any) => item.type === "file" && item.path === restoredFile
    );

    pendingRestoredFileRef.current = undefined;

    if (fileExists) {
      setSelectedFileKey(restoredFile);
      getFileContent(restoredFile);
    }
  }, [selectedRepo, selectedBranch, repoContent]);

  useEffect(() => {
    if (!selectedRepo || !selectedBranch || repoContent.length === 0) {
      return;
    }

    saveRepoTree(selectedRepo, selectedBranch, repoContent);
  }, [selectedRepo, selectedBranch, repoContent]);

  const handleLoadContent = async () => {
    if (!selectedRepo || !selectedBranch) {
      return;
    }

    await getRepoContent();
  };

  const handleCommitModalOk = async () => {
    setCommitModalError("");
    const success = await commitFileChanges();
    if (success) {
      setCommitModalVisible(false);
      setCommitModalError("");
      setIsEditing(false);
      return;
    }

    setCommitModalError(error || "Commit failed. Please refresh and try again.");
  };

  useEffect(() => {
    if (commitModalVisible && error) {
      setCommitModalError(error);
    }
  }, [error, commitModalVisible]);

  const loadCommitHistory = async (filterBranch?: string, fromDate?: string, toDate?: string) => {
    if (!selectedRepo) {
      message.warning("Please select a repository first");
      return;
    }

    if (!filterBranch || !fromDate || !toDate) {
      message.warning("Please select branch and date range, then click Filter");
      return;
    }

    try {
      setCommitHistoryLoading(true);
      const githubToken = await getGitHubAccessToken();
      if (!githubToken) {
        throw new Error("GitHub token not found. Please login again.");
      }

      const [owner, repo] = selectedRepo.split("/");
      const branch = filterBranch || historyFilterBranch || selectedBranch || "main";
      let url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=30`;
      
      if (fromDate) {
        url += `&since=${fromDate}T00:00:00Z`;
      }
      if (toDate) {
        url += `&until=${toDate}T23:59:59Z`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load commit history");
      }

      const data = await res.json();
      const commits = Array.isArray(data) ? data : [];
      setCommitHistoryItems(commits);
      
      // Fetch details for all commits to get file changes
      const newFilesMap: Record<string, any[]> = {};
      const detailPromises = commits.map(async (commit: any) => {
        try {
          const detailRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
            {
              headers: {
                Authorization: `token ${githubToken}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            newFilesMap[commit.sha] = Array.isArray(detailData.files) ? detailData.files : [];
          }
        } catch (e) {
          // Silently fail for individual commits
        }
      });
      
      await Promise.all(detailPromises);
      setCommitFilesMap((prev) => ({ ...prev, ...newFilesMap }));
    } catch (e: any) {
      message.error(e?.message || "Failed to load commit history");
      setCommitHistoryItems([]);
    } finally {
      setCommitHistoryLoading(false);
    }
  };

  const openCommitHistory = async () => {
    setCommitHistoryOpen(true);
    // Reset filters
    setHistoryFilterBranch("");
    setHistoryDateRange(null);
    setCommitHistoryItems([]);
    // Load all branches for filter dropdown
    if (selectedRepo) {
      try {
        const githubToken = await getGitHubAccessToken();
        const [owner, repo] = selectedRepo.split("/");
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/branches`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const branchNames = Array.isArray(data) ? data.map((b: any) => b.name) : [];
          setHistoryBranches(branchNames);
        }
      } catch (e) {
        // Silently fail for branch loading
      }
    }
  };

  const fetchCommitDetails = async (sha: string) => {
    if (commitFilesMap[sha]) {
      // Already fetched
      return;
    }

    try {
      const githubToken = await getGitHubAccessToken();
      const [owner, repo] = selectedRepo.split("/");
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const files = Array.isArray(data.files) ? data.files : [];
        setCommitFilesMap((prev) => ({
          ...prev,
          [sha]: files,
        }));
      }
    } catch (e) {
      // Silently fail for details loading
    }
  };

  const toggleCommitExpansion = async (sha: string) => {
    const newExpanded = new Set(expandedCommits);
    if (newExpanded.has(sha)) {
      newExpanded.delete(sha);
    } else {
      newExpanded.add(sha);
      // Fetch details when expanding
      await fetchCommitDetails(sha);
    }
    setExpandedCommits(newExpanded);
  };

  const openFileDiffDrawer = (file: any) => {
    setSelectedDiffFile(file);
    setDiffDrawerOpen(true);
  };

  return (
    <div className="w-full pr-[30px]">
      <Card
        title={
          <Space>
            <GithubOutlined />
            <span>GitHub Repository Browser</span>
            {loadingRepos && <SyncOutlined spin />}
          </Space>
        }
        className="w-full"
        extra={
          <Space>
            {isAuthenticated ? (
              <Button
                icon={<LogoutOutlined />}
                onClick={handleGithubLogout}
                danger
              >
              GitHub Logout
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleGitSubmit}
                loading={githubLoading}
              >
                Login with GitHub
              </Button>
            )}
          </Space>
        }
      >
        {!isAuthenticated && (
          <div className="text-center py-8">
            <div className="mb-4">
              <GithubOutlined style={{ fontSize: "48px", color: "#1890ff" }} />
            </div>
            <Typography.Title level={4} className="mb-2">
              Connect to GitHub
            </Typography.Title>
            <Typography.Paragraph type="secondary" className="mb-6">
              Authenticate with GitHub to browse and edit your repositories
            </Typography.Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<GithubOutlined />}
              onClick={handleGitSubmit}
              loading={githubLoading}
            >
              Sign in with GitHub
            </Button>
          </div>
        )}

        {isAuthenticated && (
          <>
 
        
     

            {error && !commitModalVisible && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                className="mb-4"
                onClose={() => setError(undefined)}
              />
            )}

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                
                <Select
                  showSearch
                  placeholder="Select repository"
                  value={selectedRepo}
                  onChange={(value) => {
                    setSelectedRepo(value);
                    setRepoContent([]);
                    setSelectedFileKey(undefined);
                    setFileContent("");
                    setBranches([]);
                    setSelectedBranch(undefined)
                    setIsEditing(false);
                    setEditContent("");
                    setCommitMessage("");
                    setCommitSha("");
                  }}
                  options={repositories.map((repo) => ({
                    label: (
                      <div className="flex min-w-[420px] items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                        <GithubOutlined />
                        <span className="font-medium whitespace-nowrap">{repo.full_name}</span>
                        </div>
                        <Tag color={repo.private ? "orange" : "blue"}>
                          {repo.private ? "Private" : "Public"}
                        </Tag>
                      </div>
                    ),
                    value: repo.full_name,
                  }))}
                  className="flex-1 min-w-[300px]"
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: 460 }}
                  loading={loadingRepos}
                  notFoundContent={
                    loadingRepos ? (
                      <div className="p-2">
                        <Spin size="small" />
                      </div>
                    ) : (
                      <div className="p-2 text-gray-500">
                        {repositories.length === 0
                          ? "No repositories available"
                          : "No matching repositories found"}
                      </div>
                    )
                  }
                  filterOption={(input, option) => {
                    if (!option) return false;
                    const repoName = String(option.value || "");
                    return repoName.toLowerCase().includes(input.toLowerCase());
                  }}
                  suffixIcon={
                    loadingRepos ? <LoadingOutlined spin /> : undefined
                  }
                  disabled={loadingRepos || repositories.length === 0}
                />

                <Select
                  placeholder={
                    loadingBranches ? "Loading branches..." : "Select branch"
                  }
                  value={selectedBranch}
                  onChange={(value) => {
                    setSelectedBranch(value);
                    setSelectedFileKey(undefined);
                    setFileContent("");
                  }}
                  options={branches.map((branch) => ({
                    label: (
                      <div className="flex items-center gap-2">
                        <span>{branch.name}</span>
                        {branch.protected && (
                          <Tag color="red" icon={<SyncOutlined spin />}>
                            Protected
                          </Tag>
                        )}
                      </div>
                    ),
                    value: branch.name,
                  }))}
                  className="min-w-[200px]"
                  loading={loadingBranches}
                  disabled={!selectedRepo || loadingBranches}
                  suffixIcon={
                    loadingBranches ? <LoadingOutlined spin /> : undefined
                  }
                />

                <Dropdown overlay={editorMenu} placement="bottomRight">
                  <Button
                    type="default"
                    icon={<RocketOutlined />}
                    disabled={!selectedRepo}
                  >
                    Open in...
                  </Button>
                </Dropdown>

                <Button
                  type="default"
                  icon={<HistoryOutlined />}
                  onClick={openCommitHistory}
                  disabled={!selectedRepo}
                >
                  Commit History
                </Button>
             

                <Button
                  type="primary"
                  onClick={handleLoadContent}
                  disabled={!selectedRepo || !selectedBranch || loadingContent}
                  loading={loadingContent}
                  icon={loadingContent ? <LoadingOutlined spin /> : undefined}
                  className="md:w-auto w-full"
                >
                <ContainerOutlined/>  {loadingContent ? "Loading..." : "Load Content"}
                </Button>
              </div>
              <Card
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {selectedRepo
                        ? repositories.find((r) => r.full_name === selectedRepo)?.name || selectedRepo
                        : "Repository not selected"}
                    </span>
                    <Tag color="blue">
                      {selectedRepo
                        ? repositories.find((r) => r.full_name === selectedRepo)?.language || "Unknown"
                        : "No repo"}
                    </Tag>
                    <Tag color="geekblue" className="ml-auto">
                      Branch: {selectedBranch || "Not selected"}
                    </Tag>
                  </div>
                }
                size="small"
                loading={loadingContent}
              >
                <div
                  className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-stretch"
                  style={{ minHeight: "70vh" }}
                >
                  <Card
                    size="small"
                    title={<span style={{ fontWeight: 500 }}>File structure <BranchesOutlined /></span>}
                    extra={
                      <Button
                        size="small"
                        icon={<SyncOutlined />}
                        onClick={handleLoadContent}
                        disabled={!selectedRepo || !selectedBranch}
                      >
                        Refresh
                      </Button>
                    }
                    styles={{ body: { padding: 10 } }}
                  >
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="Search files..."
                      value={treeSearchTerm}
                      onChange={(e) => setTreeSearchTerm(e.target.value)}
                      style={{ marginBottom: 10 }}
                      disabled={!selectedRepo || repoContent.length === 0}
                    />
                    <div style={{ height: "calc(70vh - 110px)", overflow: "auto", paddingRight: 4 }}>
                      {selectedRepo ? (
                        isBuildingTree ? (
                          <div className="flex flex-col justify-center gap-3 px-2 py-8">
                            <Progress percent={treeBuildProgress} size="small" status="active" />
                            <Text type="secondary">Building file structure...</Text>
                          </div>
                        ) : repoContent.length > 0 ? (
                          <Tree
                            treeData={treeData}
                            showIcon={false}
                            expandedKeys={treeSearchTerm.trim() ? expandedKeys : undefined}
                            autoExpandParent={Boolean(treeSearchTerm.trim())}
                            onSelect={handleTreeSelect}
                            selectedKeys={selectedFileKey ? [selectedFileKey] : []}
                            virtual
                            titleRender={(node: any) => (
                              <Dropdown
                                overlay={
                                  <Menu>
                                    <Menu.Item
                                      key="create-file"
                                      icon={<PlusOutlined />}
                                      onClick={() => handleCreateFileClick(node.key as string)}
                                    >
                                      Create New File
                                    </Menu.Item>
                                  </Menu>
                                }
                                trigger={["contextMenu"]}
                              >
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    maxWidth: 280,
                                    verticalAlign: "middle",
                                  }}
                                  title={String(node.title || "")}
                                >
                                  {node.isLeaf ? <FileOutlined /> : <FolderOpenOutlined />}
                                  <span
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "inline-block",
                                      maxWidth: 244,
                                    }}
                                  >
                                    {node.title}
                                  </span>
                                </span>
                              </Dropdown>
                            )}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <FolderOpenOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                            <Text type="secondary">
                              {loadingContent
                                ? "Loading content..."
                                : selectedBranch
                                ? "No content loaded"
                                : "Please select a branch first"}
                            </Text>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <FolderOpenOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                          <Text type="secondary">No repo selected</Text>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="w-full">
                    {selectedFileKey ? (
                      <Card
                     title={
                       <div className="flex items-center gap-2">
                         <FileOutlined />
                         <Text ellipsis className="max-w-xs">
                           {fileName}
                         </Text>
                         <div className="ml-auto">
                           <Space>
                             <Tooltip title={isEditing ? "Cancel" : "Edit"}>
                               <Button
                                 size="small"
                                 icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
                                 onClick={handleEditToggle}
                                 disabled={loadingFile}
                               />
                             </Tooltip>
                             {isEditing && (
                               <>
                                 <Tooltip title="Git Add (Stage Changes)">
                                   <Button
                                     type="default"
                                     size="small"
                                     icon={<PlusOutlined />}
                                     onClick={handleGitAdd}
                                     loading={isAdding}
                                     disabled={!isEditing || loadingFile}
                                   />
                                 </Tooltip>
                                 <Tooltip title="Git Commit (Commit Changes)">
                                   <Button
                                     type="default"
                                     size="small"
                                     icon={<CheckOutlined />}
                                     onClick={() => {
                                       setCommitModalError("");
                                       setCommitModalVisible(true);
                                     }}
                                     loading={isCommitting}
                                     disabled={!isEditing || loadingFile}
                                   />
                                 </Tooltip>
                                 <Tooltip title="Git Push (Push Changes)">
                                   <Button
                                     type="default"
                                     size="small"
                                     icon={<UploadOutlined />}
                                     onClick={handleGitPush}
                                     loading={isPushing}
                                     disabled={!isEditing || loadingFile}
                                   />
                                 </Tooltip>
                                 <Tooltip title="Save (Add + Commit + Push)">
                                   <Button
                                     type="primary"
                                     size="small"
                                     icon={<SaveOutlined />}
                                     onClick={handleSaveFile}
                                     loading={loadingFile}
                                   />
                                 </Tooltip>
                               </>
                             )}
                           </Space>
                         </div>
                       </div>
                      }
                        size="small"
                        styles={{ body: { padding: 0 } }}
                      >
                        {loadingFile ? (
                          <div className="p-4">
                            <Skeleton active paragraph={{ rows: 8 }} />
                          </div>
                        ) : isEditing ? (
                          <TextArea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            autoSize={{ minRows: 15, maxRows: 25 }}
                            className="p-2 font-mono text-sm"
                          />
                        ) : (
                          <SyntaxHighlighter
                            language={fileExtension}
                            customStyle={{
                              width: "100%",
                              margin: 0,
                              padding: 16,
                              background: "transparent",
                              maxHeight: "60vh",
                              overflow: "auto",
                            }}
                            showLineNumbers
                          >
                            {typeof fileContent === "string" ? fileContent : fileContent?.content || ""}
                          </SyntaxHighlighter>
                        )}
                      </Card>
                    ) : (
                      <div style={{ minHeight: "70vh" }}>
                        <div
                          className="w-full h-full rounded-md border border-dashed border-gray-300 bg-gray-50"
                          style={{ minHeight: "70vh" }}
                        >
                          <div className="h-10 border-b border-gray-200 bg-white rounded-t-md" />
                          <div className="flex flex-col items-center justify-center text-gray-400" style={{ minHeight: "calc(70vh - 40px)" }}>
                            <FileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                            <Text type="secondary">No file selected</Text>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </Card>

      {/* Commit Message Modal */}
      <Modal
        title="Commit Changes"
        visible={commitModalVisible}
        onOk={handleCommitModalOk}
        onCancel={() => {
          setCommitModalVisible(false);
          setCommitModalError("");
        }}
        confirmLoading={loadingFile || isAdding || isCommitting || isPushing}
        okText="Commit Changes"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="commitMessage"
            label="Commit Message"
            initialValue={commitMessage}
            rules={[
              { required: true, message: "Please enter a commit message" },
            ]}
          >
            <TextArea
              rows={4}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes..."
            />
          </Form.Item>

          {commitModalError && (
            <Alert
              message="Commit Error"
              description={<div style={{ whiteSpace: "pre-line" }}>{formatReadableError(commitModalError)}</div>}
              type="error"
              showIcon
            />
          )}
        </Form>
      </Modal>

      <Modal
        title={`Create New File in ${selectedFolder || "root"}`}
        visible={newFileModalVisible}
        onOk={createNewFile}
        onCancel={() => setNewFileModalVisible(false)}
        confirmLoading={isCreatingFile}
        okText="Create File"
        cancelText="Cancel"
      >
        <Form layout="vertical">
          <Form.Item
            label="File Name"
            required
            rules={[{ required: true, message: "Please enter a file name" }]}
          >
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="example.txt"
            />
          </Form.Item>

          <Form.Item label="File Content">
            <TextArea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              rows={6}
              placeholder="Enter file content here..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Commit History"
        placement="right"
        width="80%"
        open={commitHistoryOpen}
        onClose={() => setCommitHistoryOpen(false)}
        bodyStyle={{ paddingTop: 0 }}
      >
        <div className="sticky top-0 z-20 -mx-6 mb-[10px] border border-sky-100 bg-sky-50 px-6 pt-3 pb-4">
          <div className="mb-4 text-sm text-gray-600">
            <div><strong>Repository:</strong> {selectedRepo || "Not selected"}</div>
            <div><strong>Default Branch:</strong> {selectedBranch || "main"}</div>
          </div>
          
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Filter by Branch</label>
              <Select
                placeholder="Select branch"
                value={historyFilterBranch}
                onChange={setHistoryFilterBranch}
                options={historyBranches.map((branch) => ({
                  label: branch,
                  value: branch,
                }))}
                allowClear
                disabled={!selectedRepo}
                style={{ minWidth: 200 }}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">From Date - To Date</label>
              <RangePicker
                value={historyDateRange}
                onChange={setHistoryDateRange}
                presets={getHistoryDateRangePresets()}
                format="YYYY-MM-DD"
                className="w-full"
                disabled={!selectedRepo}
              />
            </div>
            
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => {
                const fromDateStr = historyDateRange?.[0]
                  ? historyDateRange[0].format("YYYY-MM-DD")
                  : undefined;
                const toDateStr = historyDateRange?.[1]
                  ? historyDateRange[1].format("YYYY-MM-DD")
                  : undefined;
                loadCommitHistory(
                  historyFilterBranch || undefined,
                  fromDateStr,
                  toDateStr
                );
              }}
              loading={commitHistoryLoading}
              disabled={!selectedRepo || !historyFilterBranch || !historyDateRange?.[0] || !historyDateRange?.[1]}
            >
              Filter
            </Button>
          </div>
        </div>

        <List
          loading={commitHistoryLoading}
          bordered
          split={false}
          style={{
            border: "1px solid #64748b",
            borderRadius: 8,
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
          dataSource={commitHistoryItems}
          locale={{
            emptyText: (
              <div className="py-10 text-center text-gray-400">
                <HistoryOutlined style={{ fontSize: 34, marginBottom: 8 }} />
                <div className="text-sm">No commits found</div>
              </div>
            ),
          }}
          renderItem={(item: any, index: number) => {
            const sha = item?.sha;
            const commitMessage = item?.commit?.message || "No message";
            const authorName = item?.commit?.author?.name || item?.author?.login || "Unknown";
            const commitDate = item?.commit?.author?.date
              ? new Date(item.commit.author.date).toLocaleString()
              : "Unknown date";
            const commitUrl = item?.html_url;
            const filesChanged = commitFilesMap[sha] || item.files || [];
            
            // Use commit.stats if available, otherwise calculate from files
            const commitStats = item?.commit?.stats;
            const additions = commitStats?.additions ?? filesChanged.reduce((sum: number, f: any) => sum + (f.additions || 0), 0);
            const deletions = commitStats?.deletions ?? filesChanged.reduce((sum: number, f: any) => sum + (f.deletions || 0), 0);
            const numFiles = filesChanged.length || commitStats?.total || 0;
            const modifications = filesChanged.filter((f: any) => f.status === "modified").length;
            const isExpanded = expandedCommits.has(sha);

            return (
              <List.Item
                key={sha}
                className="flex-col !items-start"
                style={{
                  borderBottom:
                    index !== commitHistoryItems.length - 1
                      ? "1px solid #94a3b8"
                      : "none",
                }}
              >
                <div className="w-full">
                  <div
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => toggleCommitExpansion(sha)}
                  >
                    <div className="font-medium text-base">{commitMessage.split("\n")[0]}</div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {authorName} • {commitDate}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">SHA: {sha?.slice(0, 8)}</div>
                  
                  <div className="flex gap-3 mt-2 mb-2">
                    <Tag color="green">
                      <span className="font-medium">+{additions}</span> Added
                    </Tag>
                    <Tag color="red">
                      <span className="font-medium">-{deletions}</span> Deleted
                    </Tag>
                    <Tag color="gold">
                      <span className="font-medium">{numFiles}</span> Files
                    </Tag>
                    {modifications > 0 && (
                      <Tag color="blue">
                        <span className="font-medium">{modifications}</span> Modified
                      </Tag>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => toggleCommitExpansion(sha)}
                    >
                      {numFiles} file{numFiles !== 1 ? 's' : ''} changed
                    </button>
                  </div>
                  
                  {commitUrl && (
                    <a href={commitUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600">
                      View on GitHub
                    </a>
                  )}
                  
                  {isExpanded && filesChanged.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm font-medium mb-2">
                        Changed Files: <span className="text-gray-500 font-normal">({filesChanged.length} file{filesChanged.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                        {filesChanged.map((file: any, idx: number) => {
                          const status = file.status || "unknown";
                          const statusColor = {
                            added: "#52c41a",
                            removed: "#ff4d4f",
                            modified: "#faad14",
                            renamed: "#1890ff",
                            unknown: "#999999",
                          }[status] || "#999999";

                          const patchLines = typeof file.patch === "string"
                            ? file.patch.split("\n")
                            : [];
                          const filePath = file.filename || "unknown-file";
                          const fileName = filePath.includes("/")
                            ? filePath.split("/").pop()
                            : filePath;

                          return (
                            <div key={`${file.filename}-${idx}`} className="border rounded-md overflow-hidden bg-white">
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 border-b bg-gray-50 hover:bg-gray-100"
                                onClick={() => openFileDiffDrawer(file)}
                              >
                                <div className="text-xs font-medium break-all">
                                  <span className="text-gray-500 mr-2">[Open]</span>
                                  {fileName} - [{filePath}]
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                  <Tag color={statusColor}>{status}</Tag>
                                  <span className="text-green-600">+{file.additions || 0}</span>
                                  <span className="text-red-500">-{file.deletions || 0}</span>
                                  <span>{file.changes || 0} changes</span>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      </Drawer>

      <Drawer
        title={selectedDiffFile ? `File Diff: ${selectedDiffFile.filename || "Unknown file"}` : "File Diff"}
        placement="right"
        width="70%"
        open={diffDrawerOpen}
        onClose={() => {
          setDiffDrawerOpen(false);
          setSelectedDiffFile(null);
        }}
      >
        {selectedDiffFile ? (
          <div>
            <div className="mb-3 text-xs text-gray-600 break-all">
              <div><strong>File:</strong> {selectedDiffFile.filename || "Unknown"}</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-green-600">+{selectedDiffFile.additions || 0}</span>
                <span className="text-red-500">-{selectedDiffFile.deletions || 0}</span>
                <span>{selectedDiffFile.changes || 0} changes</span>
              </div>
            </div>

            {typeof selectedDiffFile.patch === "string" && selectedDiffFile.patch.length > 0 ? (
              <pre className="m-0 p-0 text-xs font-mono overflow-x-auto border rounded-md">
                {selectedDiffFile.patch.split("\n").map((line: string, lineIdx: number) => {
                  let bg = "#ffffff";
                  let color = "#24292f";

                  if (line.startsWith("+")) {
                    bg = "#e6ffec";
                    color = "#1a7f37";
                  } else if (line.startsWith("-")) {
                    bg = "#ffebe9";
                    color = "#cf222e";
                  } else if (line.startsWith("@@")) {
                    bg = "#ddf4ff";
                    color = "#0969da";
                  }

                  return (
                    <div
                      key={`selected-diff-${lineIdx}`}
                      style={{
                        backgroundColor: bg,
                        color,
                        padding: "1px 10px",
                        lineHeight: "18px",
                        whiteSpace: "pre",
                      }}
                    >
                      {line || " "}
                    </div>
                  );
                })}
              </pre>
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border rounded-md">
                Diff preview is not available for this file.
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No file selected.</div>
        )}
      </Drawer>

    </div>
  );
}
