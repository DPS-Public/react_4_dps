import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Drawer, Empty, Input, Progress, Select, Space, Spin, Tag, Tree, Typography } from "antd";
import { BranchesOutlined, FileOutlined, FolderOpenOutlined, GithubOutlined, LoadingOutlined, SearchOutlined } from "@ant-design/icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getGitHubAccessToken } from "@/config/firebase";
import { getProjectGithubRepositories } from "@/services/frontendData";
import { useAsyncTreeData } from "@/hooks/useAsyncTreeData";

const { Text } = Typography;

type BrowserMode = "create" | "view" | "edit";

type GithubUrlLike = {
  repoId: string;
  repoFullName: string;
  branch: string;
  defaultBranch?: string;
  sourceBranch?: string;
  filePath: string;
  fileName?: string;
};

type ConfiguredRepo = {
  id?: string;
  repo_id?: string;
  owner?: string;
  repo?: string;
  full_name?: string;
  name?: string;
};

type RepositoryOption = {
  id: string;
  repoId: string;
  name: string;
  full_name: string;
};

type BranchOption = {
  name: string;
  protected?: boolean;
};

type RepoContentItem = {
  path: string;
  type: "file" | "dir";
};

type FilePreview = {
  content: string;
  sha?: string;
};

interface Props {
  open: boolean;
  mode: BrowserMode;
  projectId?: string;
  initialGithubUrl?: GithubUrlLike | null;
  onClose: () => void;
  onSubmitSelection?: (files: GithubUrlLike[]) => Promise<void> | void;
}

const normalizeConfiguredRepo = (configuredRepo: ConfiguredRepo): RepositoryOption | null => {
  let owner = configuredRepo.owner?.trim();
  let repo = configuredRepo.repo?.trim();

  if ((!owner || !repo) && configuredRepo.full_name?.includes("/")) {
    const [fullOwner, fullRepo] = configuredRepo.full_name.split("/");
    owner = owner || fullOwner?.trim();
    repo = repo || fullRepo?.trim();
  }

  if ((!owner || !repo) && configuredRepo.name?.includes("/")) {
    const [nameOwner, nameRepo] = configuredRepo.name.split("/");
    owner = owner || nameOwner?.trim();
    repo = repo || nameRepo?.trim();
  }

  if (!owner || !repo) {
    return null;
  }

  const fullName = `${owner}/${repo}`;
  const repoId = String(configuredRepo.repo_id || configuredRepo.id || fullName).trim();

  return {
    id: repoId,
    repoId,
    name: repo,
    full_name: fullName,
  };
};

const decodeBase64Content = (content: string) => {
  const normalized = atob(content);
  return decodeURIComponent(escape(normalized));
};

const resolveDefaultBranch = (branchOptions: BranchOption[]) => {
  return (
    branchOptions.find((branch) => branch.name === "main")?.name ||
    branchOptions.find((branch) => branch.name === "master")?.name ||
    branchOptions[0]?.name
  );
};

const getPreviewLanguage = (filePath?: string) => {
  const extension = filePath?.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "html":
      return "html";
    case "md":
      return "markdown";
    case "svg":
      return "xml";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
};

export default function UICanvasGithubFilesBrowserDrawer({
  open,
  mode,
  projectId,
  initialGithubUrl,
  onClose,
  onSubmitSelection,
}: Props) {
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [repoContent, setRepoContent] = useState<RepoContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>();
  const [selectedRepoId, setSelectedRepoId] = useState<string>();
  const [defaultBranch, setDefaultBranch] = useState<string>();
  const [selectedBranch, setSelectedBranch] = useState<string>();
  const [selectedFilePath, setSelectedFilePath] = useState<string>();
  const [checkedFilePaths, setCheckedFilePaths] = useState<string[]>([]);
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const selectedFilePathRef = useRef<string>();
  const selectedRepoRef = useRef<string>();
  const { treeData, expandedKeys, isBuildingTree, treeBuildProgress } = useAsyncTreeData(repoContent, treeSearchTerm);

  const isReadOnly = mode === "view";

  const selectedFiles = useMemo(() => {
    if (!selectedRepo || !defaultBranch) {
      return [];
    }

    return checkedFilePaths.map((filePath) => ({
      repoId: selectedRepoId || selectedRepo,
      repoFullName: selectedRepo,
      branch: defaultBranch,
      defaultBranch,
      sourceBranch: selectedBranch || defaultBranch,
      filePath,
      fileName: filePath.split("/").pop() || filePath,
    }));
  }, [checkedFilePaths, defaultBranch, selectedBranch, selectedRepo, selectedRepoId]);

  useEffect(() => {
    selectedFilePathRef.current = selectedFilePath;
  }, [selectedFilePath]);

  useEffect(() => {
    if (selectedRepoRef.current && selectedRepoRef.current !== selectedRepo) {
      selectedFilePathRef.current = undefined;
    }

    selectedRepoRef.current = selectedRepo;
  }, [selectedRepo]);

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }

    let cancelled = false;

    const loadRepositories = async () => {
      setLoadingRepos(true);
      setError(undefined);

      try {
        const configuredRepos = (await getProjectGithubRepositories(projectId)) as ConfiguredRepo[];
        const normalizedRepos = configuredRepos
          .map(normalizeConfiguredRepo)
          .filter(Boolean) as RepositoryOption[];

        if (cancelled) {
          return;
        }

        setRepositories(normalizedRepos);

        const initialRepo =
          normalizedRepos.find((repo) => repo.full_name === initialGithubUrl?.repoFullName) ||
          normalizedRepos[0];

        setSelectedRepo(initialRepo?.full_name);
        setSelectedRepoId(initialRepo?.repoId);
        setDefaultBranch(undefined);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "Failed to load configured repositories");
        }
      } finally {
        if (!cancelled) {
          setLoadingRepos(false);
        }
      }
    };

    loadRepositories();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, initialGithubUrl?.repoFullName]);

  useEffect(() => {
    if (!open || !selectedRepo) {
      return;
    }

    let cancelled = false;

    const loadBranches = async () => {
      setLoadingBranches(true);
      setError(undefined);

      try {
        const githubToken = await getGitHubAccessToken();
        if (!githubToken) {
          throw new Error("GitHub token not found");
        }

        const response = await fetch(`https://api.github.com/repos/${selectedRepo}/branches?per_page=100`, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load branches: ${response.status}`);
        }

        const data = await response.json();
        const nextBranches = Array.isArray(data)
          ? data.map((branch: any) => ({
              name: branch.name,
              protected: Boolean(branch.protected),
            }))
          : [];

        if (cancelled) {
          return;
        }

        const nextDefaultBranch =
          initialGithubUrl?.repoFullName === selectedRepo && initialGithubUrl?.defaultBranch
            ? initialGithubUrl.defaultBranch
            : resolveDefaultBranch(nextBranches);

        setBranches(nextBranches);
        setDefaultBranch(nextDefaultBranch);
        setSelectedBranch(nextDefaultBranch);
      } catch (loadError: any) {
        if (!cancelled) {
          setBranches([]);
          setDefaultBranch(undefined);
          setSelectedBranch(undefined);
          setError(loadError?.message || "Failed to load branches");
        }
      } finally {
        if (!cancelled) {
          setLoadingBranches(false);
        }
      }
    };

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, [open, selectedRepo, initialGithubUrl?.repoFullName, initialGithubUrl?.defaultBranch]);

  useEffect(() => {
    if (!open || !selectedRepo || !selectedBranch) {
      return;
    }

    // Remember the currently selected file path before loading new content
    const previouslySelectedFilePath = selectedFilePathRef.current;

    let cancelled = false;

    const loadRepoContent = async () => {
      setLoadingContent(true);
      setError(undefined);
      setRepoContent([]);

      try {
        const githubToken = await getGitHubAccessToken();
        if (!githubToken) {
          throw new Error("GitHub token not found");
        }

        const response = await fetch(`https://api.github.com/repos/${selectedRepo}/git/trees/${selectedBranch}?recursive=1`, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load repository content: ${response.status}`);
        }

        const data = await response.json();
        const nextContent = Array.isArray(data?.tree)
          ? data.tree
              .filter((item: any) => item.type === "blob" || item.type === "tree")
              .map((item: any) => ({
                path: item.path,
                type: item.type === "blob" ? "file" : "dir",
              }))
          : [];

        if (cancelled) {
          return;
        }

        setRepoContent(nextContent);

        // Determine which file path to select:
        // 1. First, try to use the previously selected file if it exists in the new content
        // 2. Then, try to use the initialGithubUrl if provided and exists in content
        // 3. Otherwise, clear the selection
        let pathToSelect: string | undefined;

        if (previouslySelectedFilePath && nextContent.some((item) => item.type === "file" && item.path === previouslySelectedFilePath)) {
          pathToSelect = previouslySelectedFilePath;
        } else if (
          initialGithubUrl?.repoFullName === selectedRepo &&
          nextContent.some((item) => item.type === "file" && item.path === initialGithubUrl.filePath)
        ) {
          pathToSelect = initialGithubUrl.filePath;
        }

        if (pathToSelect) {
          setSelectedFilePath(pathToSelect);
          selectedFilePathRef.current = pathToSelect;
          if (mode === "edit") {
            setCheckedFilePaths([pathToSelect]);
          }
        } else {
          setSelectedFilePath(undefined);
          selectedFilePathRef.current = undefined;
          setCheckedFilePaths([]);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "Failed to load repository content");
        }
      } finally {
        if (!cancelled) {
          setLoadingContent(false);
        }
      }
    };

    loadRepoContent();

    return () => {
      cancelled = true;
    };
  }, [open, selectedRepo, selectedBranch, mode, initialGithubUrl?.repoFullName, initialGithubUrl?.filePath]);

  useEffect(() => {
    if (!open || !selectedRepo || !selectedBranch || !selectedFilePath) {
      setFilePreview(null);
      return;
    }

    let cancelled = false;

    const loadFileContent = async () => {
      setLoadingFile(true);
      setError(undefined);

      try {
        const githubToken = await getGitHubAccessToken();
        if (!githubToken) {
          throw new Error("GitHub token not found");
        }

        const encodedPath = selectedFilePath
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");

        const response = await fetch(
          `https://api.github.com/repos/${selectedRepo}/contents/${encodedPath}?ref=${encodeURIComponent(selectedBranch)}`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load file content: ${response.status}`);
        }

        const data = await response.json();
        const content = typeof data?.content === "string" ? decodeBase64Content(data.content.replace(/\n/g, "")) : "";

        if (!cancelled) {
          setFilePreview({
            content,
            sha: data?.sha,
          });
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setFilePreview(null);
          setError(loadError?.message || "Failed to load file content");
        }
      } finally {
        if (!cancelled) {
          setLoadingFile(false);
        }
      }
    };

    loadFileContent();

    return () => {
      cancelled = true;
    };
  }, [open, selectedRepo, selectedBranch, selectedFilePath]);

  const handleCheck = (checkedKeysValue: any) => {
    const nextCheckedKeys = Array.isArray(checkedKeysValue)
      ? checkedKeysValue
      : Array.isArray(checkedKeysValue?.checked)
      ? checkedKeysValue.checked
      : [];

    const fileKeys = nextCheckedKeys.filter((key: string) =>
      repoContent.some((item) => item.path === key && item.type === "file")
    );

    setCheckedFilePaths(mode === "edit" ? fileKeys.slice(-1) : fileKeys);
  };

  const handleSubmit = async () => {
    if (!onSubmitSelection || selectedFiles.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitSelection(selectedFiles);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const drawerTitle =
    mode === "create"
      ? "Add GitHub Files"
      : mode === "edit"
      ? "Update GitHub File"
      : "GitHub File Preview";

  return (
    <Drawer
      title={drawerTitle}
      open={open}
      onClose={onClose}
      width="86%"
      destroyOnClose
      styles={{
        body: {
          padding: 16,
          overflow: "hidden",
          height: "calc(100vh - 160px)",
          display: "flex",
          flexDirection: "column",
        },
      }}
      footer={
        !isReadOnly ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Text type="secondary">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file selected`
                : mode === "edit"
                ? "Select 1 file to update the link"
                : "Select file(s) from the tree"}
            </Text>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={selectedFiles.length === 0}
              >
                {mode === "edit" ? "Update File Link" : "Add Selected Files"}
              </Button>
            </Space>
          </div>
        ) : undefined
      }
    >
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(undefined)}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px minmax(0, 1fr)",
          gap: 16,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Card
          size="small"
          title={<span style={{ fontWeight: 600 }}>Repository Files <BranchesOutlined /></span>}
          style={{ height: "100%" }}
          styles={{
            body: {
              padding: 12,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Select
              showSearch
              placeholder="Select repository"
              value={selectedRepo}
              onChange={(value) => {
                const matchedRepo = repositories.find((repo) => repo.full_name === value);
                setSelectedRepo(value);
                setSelectedRepoId(matchedRepo?.repoId || value);
                setBranches([]);
                setDefaultBranch(undefined);
                setSelectedBranch(undefined);
                setRepoContent([]);
                selectedFilePathRef.current = undefined;
                setSelectedFilePath(undefined);
                setCheckedFilePaths([]);
                setFilePreview(null);
              }}
              options={repositories.map((repo) => ({
                label: repo.full_name,
                value: repo.full_name,
              }))}
              loading={loadingRepos}
              notFoundContent={loadingRepos ? <Spin size="small" /> : null}
            />

            <Select
              placeholder={loadingBranches ? "Loading branches..." : "Select branch"}
              value={selectedBranch}
              onChange={(value) => {
                setSelectedBranch(value);
                setRepoContent([]);
                setCheckedFilePaths([]);
                setFilePreview(null);
              }}
              options={branches.map((branch) => ({
                label: branch.name,
                value: branch.name,
              }))}
              disabled={!selectedRepo}
              loading={loadingBranches}
            />

            <Input
              prefix={<SearchOutlined />}
              placeholder="Search files..."
              value={treeSearchTerm}
              onChange={(event) => setTreeSearchTerm(event.target.value)}
              disabled={!selectedRepo || repoContent.length === 0}
            />

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowX: "auto",
                overflowY: "auto",
                paddingRight: 4,
                scrollbarGutter: "stable",
              }}
            >
              {!selectedRepo ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select repository" />
              ) : loadingContent ? (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                  <Spin indicator={<LoadingOutlined spin />} />
                </div>
              ) : isBuildingTree ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 48 }}>
                  <Progress percent={treeBuildProgress} size="small" status="active" />
                  <Text type="secondary">Building file structure...</Text>
                </div>
              ) : treeData.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files found" />
              ) : (
                <Tree
                  checkable={!isReadOnly}
                  checkedKeys={!isReadOnly ? checkedFilePaths : []}
                  selectedKeys={selectedFilePath ? [selectedFilePath] : []}
                  expandedKeys={treeSearchTerm.trim() ? expandedKeys : undefined}
                  autoExpandParent={Boolean(treeSearchTerm.trim())}
                  height={560}
                  onCheck={!isReadOnly ? handleCheck : undefined}
                  onSelect={(keys, info: any) => {
                    const nextKey = String(keys?.[0] || "");
                    if (!nextKey || !info?.node?.isLeaf) {
                      return;
                    }
                    selectedFilePathRef.current = nextKey;
                    setSelectedFilePath(nextKey);
                  }}
                  treeData={treeData}
                  virtual
                  style={{ minWidth: "max-content" }}
                  titleRender={(node: any) => (
                    <span title={String(node.key)} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {node.isLeaf ? <FileOutlined /> : <FolderOpenOutlined />}
                      <span>{node.title}</span>
                    </span>
                  )}
                />
              )}
            </div>
          </Space>
        </Card>

        <Card
          size="small"
          style={{ height: "100%" }}
          title={
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Text strong>{selectedFilePath ? selectedFilePath.split("/").pop() : "File Preview"}</Text>
              {selectedFilePath && <Text type="secondary">{selectedFilePath}</Text>}
            </div>
          }
          styles={{
            body: {
              padding: 0,
              height: "100%",
              overflow: "hidden",
            },
          }}
        >
          {selectedFilePath ? (
            loadingFile ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#f6f8fa",
                    flexShrink: 0,
                  }}
                >
                  <Space wrap>
                    {selectedRepo && <Tag color="blue" style={{ paddingInline: 10, borderRadius: 999 }}>{selectedRepo}</Tag>}
                    {defaultBranch && <Tag color="cyan" style={{ paddingInline: 10, borderRadius: 999 }}>default: {defaultBranch}</Tag>}
                    {selectedBranch && selectedBranch !== defaultBranch && (
                      <Tag color="geekblue" style={{ paddingInline: 10, borderRadius: 999 }}>
                        source: {selectedBranch}
                      </Tag>
                    )}
                    {filePreview?.sha && <Tag style={{ paddingInline: 10, borderRadius: 999 }}>{filePreview.sha.slice(0, 7)}</Tag>}
                  </Space>
                </div>
                <div
                  style={{
                    overflow: "auto",
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    background: "#ffffff",
                    borderTop: "1px solid #d0d7de",
                    scrollbarGutter: "stable both-edges",
                    position: "relative",
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      padding: "16px",
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      overflow: "auto",
                      height: "calc(100vh - 300px)",
                      maxHeight: "calc(100vh - 300px)",
                      minHeight: "200px",
                      background: "#ffffff",
                      color: "#24292f",
                    }}
                  >
                    {filePreview?.content || ""}
                  </pre>
                </div>
              </div>
            )
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a file to preview its content" />
            </div>
          )}
        </Card>
      </div>
    </Drawer>
  );
}
