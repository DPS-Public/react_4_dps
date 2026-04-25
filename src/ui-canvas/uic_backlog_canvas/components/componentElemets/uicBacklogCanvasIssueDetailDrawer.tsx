import { db } from "@/config/firebase";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { useAppSelector } from "@/store";
import {
    AppstoreOutlined, ArrowDownOutlined, ClockCircleOutlined,
    CloseCircleOutlined, DeleteOutlined, EditOutlined, FolderOutlined,
    FolderOpenOutlined, GithubOutlined, LinkOutlined, LockOutlined,
    PlayCircleOutlined, RocketOutlined, SaveOutlined, ShareAltOutlined,
    UploadOutlined, InboxOutlined, CheckCircleOutlined, TagOutlined,
    CalendarOutlined, ThunderboltOutlined, FlagOutlined, FileOutlined,
    PlusOutlined, MinusOutlined, DownOutlined, RightOutlined
} from "@ant-design/icons";
import { Avatar, Button, Collapse, Divider, Drawer, Dropdown, Form, Input, InputNumber, message, Modal, Radio, Select, Space, Spin, Tabs, Tag, Timeline, Tooltip, Typography, Upload, UploadProps } from "antd";
import TextArea from "antd/es/input/TextArea";
import Dragger from "antd/es/upload/Dragger";
import { formatDistanceToNow } from "date-fns";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { storage } from "@/config/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import services from "../../services/backlogService";
import { utilResolveActingUser } from "../../utils/utilResolveActingUser";
import AttachmentsGrid from "./AttachmentsGrid";
import ShareIssueModal from "./uicShareIssueModal";
import UserProfileTooltip from "./uicBacklogCanvasUserProfileTooltip";
import IssueComments from "./IssueComments";
import useSprintAllSprint from "@/ui-canvas/canvas_sprint/actions/useSprintAllSprint";
import { LoaderCircle, SplineIcon } from "lucide-react";
import APICanvasDetailsDrawer from "@/components/ui-canvas/common/APICanvasDetailsDrawer";
import UICanvasPreviewDrawer from "@/components/ui-canvas/UICanvasPreviewDrawer";
import GithubCommitsDrawer from "@/ui-canvas/uic_backlog_canvas_add_github_commits_as_issue/canvasGithubCommitsDrawer";

const { Panel } = Collapse;
const { Title, Text } = Typography;

// Helper function to render description with highlighted tags
const renderDescriptionWithTags = (description: string) => {
    if (!description) return description;

    // Regex to match [XXX] patterns
    const tagRegex = /\[([^\]]+)\]/g;
    const parts: any[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(description)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
            parts.push(description.substring(lastIndex, match.index));
        }

        // Add the tag with special styling
        parts.push(
            <span
                key={match.index}
                style={{
                    backgroundColor: '#e6f7ff',
                    color: '#1890ff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    margin: '0 2px',
                    fontWeight: 500,
                    display: 'inline-block'
                }}
            >
                {match[0]}
            </span>
        );

        lastIndex = tagRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < description.length) {
        parts.push(description.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : description;
};

// Priority Change Modal Component
const ChangePriorityModal: React.FC<{
    open: boolean;
    onClose: () => void;
    currentPriority: string;
    onConfirm: (newPriority: string) => Promise<void>;
    loading?: boolean;
}> = ({ open, onClose, currentPriority, onConfirm, loading = false }) => {
    const [selectedPriority, setSelectedPriority] = useState<string>(currentPriority || 'Normal');
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

    useEffect(() => {
        if (open) {
            setSelectedPriority(currentPriority || 'Normal');
        }
    }, [open, currentPriority]);

    const handleConfirm = async () => {
        setConfirmLoading(true);
        try {
            await onConfirm(selectedPriority);
            onClose();
        } catch (error) {
            console.error("Error changing priority:", error);
            message.error("Failed to change priority");
        } finally {
            setConfirmLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'text-red-600 bg-red-50 border-red-200';
            case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Normal': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <FlagOutlined className="text-yellow-500" />
                    <span>Change Priority</span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={handleConfirm}
                    loading={confirmLoading || loading}
                    disabled={selectedPriority === currentPriority}
                    style={{ backgroundColor: '#1890ff' }}
                >
                    Change Priority
                </Button>
            ]}
        >
            <div className="py-4">
                <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Current Priority</div>
                    <Tag className={`px-3 py-1 text-sm font-semibold border ${getPriorityColor(currentPriority)}`}>
                        {currentPriority || 'Normal'}
                    </Tag>
                </div>

                <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Select New Priority</div>
                    <Select
                        className="w-full"
                        value={selectedPriority}
                        onChange={setSelectedPriority}
                        size="large"
                    >
                        <Select.Option value="Urgent">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Urgent</span>
                            </div>
                        </Select.Option>
                        <Select.Option value="High">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">High</span>
                            </div>
                        </Select.Option>
                        <Select.Option value="Normal">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Normal</span>
                            </div>
                        </Select.Option>
                    </Select>
                </div>

                {selectedPriority !== currentPriority && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-700">
                            Priority will be changed from <span className="font-semibold">{currentPriority || 'Normal'}</span> to{' '}
                            <span className="font-semibold">{selectedPriority}</span>
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const resolveIssueAssigneeUser = (issue: any, users: any[] = []) =>
    users?.find((u: any) =>
        u.uid?.toLowerCase().trim() === issue.assignee?.toLowerCase().trim() ||
        u.displayName?.toLowerCase().trim() === issue.assigneeName?.toLowerCase().trim()
    );

const getRelationPriorityAppearance = (priority?: string) => {
    switch (priority) {
        case "Urgent":
            return { bg: "#fff1f2", border: "#fecdd3", color: "#dc2626", label: "Urgent" };
        case "High":
            return { bg: "#fff7ed", border: "#fed7aa", color: "#ea580c", label: "High" };
        case "Normal":
        default:
            return { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", label: "Normal" };
    }
};

const getRelationStatusAppearance = (status?: string) => {
    switch ((status || "new").toLowerCase()) {
        case "draft":
            return { bg: "#f1f5f9", border: "#cbd5e1", color: "#475569", label: "Draft" };
        case "closed":
            return { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", label: "Closed" };
        case "canceled":
            return { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "Canceled" };
        case "ongoing":
            return { bg: "#ecfdf3", border: "#bbf7d0", color: "#15803d", label: "Ongoing" };
        case "waiting":
            return { bg: "#f7fee7", border: "#d9f99d", color: "#4d7c0f", label: "Waiting" };
        case "new":
        default:
            return { bg: "#fff7ed", border: "#fed7aa", color: "#d97706", label: "New" };
    }
};

const getRelationTypeAppearance = (type?: string) => {
    switch ((type || "").toLowerCase()) {
        case "bug":
            return { bg: "#fff1f2", border: "#fecdd3", color: "#e11d48", label: "Bug" };
        case "change request":
            return { bg: "#ecfeff", border: "#a5f3fc", color: "#0f766e", label: "Change Request" };
        case "backlog":
            return { bg: "#f8fafc", border: "#cbd5e1", color: "#475569", label: "Backlog" };
        case "new request":
        default:
            return { bg: "#f5f3ff", border: "#ddd6fe", color: "#7c3aed", label: type || "New Request" };
    }
};

const relationBadgeStyle = (appearance: { bg: string; border: string; color: string }): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${appearance.border}`,
    background: appearance.bg,
    color: appearance.color,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
});

const relationMetaPillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e6edf7",
    background: "#ffffff",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1,
    boxShadow: "0 10px 25px -24px rgba(15, 23, 42, 0.35)",
};

const relationDatePillStyle: React.CSSProperties = {
    ...relationMetaPillStyle,
    background: "#f8fbff",
};

const relationCardContainerStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    borderRadius: 20,
    border: "1px solid #dbe4f0",
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    padding: 18,
    boxShadow: "0 18px 40px -34px rgba(15, 23, 42, 0.55)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    cursor: "pointer",
};

const relationSectionCardStyle: React.CSSProperties = {
    borderRadius: 22,
    border: "1px solid #e5edf8",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    padding: 18,
    boxShadow: "0 18px 40px -36px rgba(15, 23, 42, 0.4)",
};

const relationSectionHeadingStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
};

const relationSectionCountStyle: React.CSSProperties = {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid #dbe8fb",
    background: "#eff6ff",
    color: "#2563eb",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 10px",
};

const relationEmptyStateStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px dashed #d7e3f7",
    background: "#f8fbff",
    padding: "24px 16px",
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
};

const RelationIssueCard: React.FC<{
    issue: any;
    users: any[];
    onClick: () => void;
}> = ({ issue, users, onClick }) => {
    const assigneeUser = resolveIssueAssigneeUser(issue, users);
    const priorityAppearance = getRelationPriorityAppearance(issue.priority);
    const statusAppearance = getRelationStatusAppearance(issue.status);
    const typeAppearance = getRelationTypeAppearance(issue.type);
    const attachmentCount = Array.isArray(issue.imageUrl) ? issue.imageUrl.length : 0;

    const renderAssignee = () => {
        if (!assigneeUser) {
            return <span style={{ fontWeight: 600, color: "#94a3b8" }}>Unassigned</span>;
        }

        return (
            <UserProfileTooltip user={assigneeUser} navigateOnClick={false}>
                <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                        size={24}
                        src={assigneeUser.photoURL}
                        style={{ backgroundColor: "#7c3aed", flexShrink: 0 }}
                    >
                        {!assigneeUser.photoURL && assigneeUser.displayName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <span className="truncate text-sm font-semibold text-slate-800">
                        {assigneeUser.displayName}
                    </span>
                </div>
            </UserProfileTooltip>
        );
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className="group"
            style={relationCardContainerStyle}
            onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-2px)";
                event.currentTarget.style.borderColor = "#cddcf8";
                event.currentTarget.style.boxShadow = "0 22px 48px -34px rgba(37, 99, 235, 0.28)";
            }}
            onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.borderColor = "#e6edf7";
                event.currentTarget.style.boxShadow = "0 18px 40px -34px rgba(15, 23, 42, 0.55)";
            }}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[18px] font-semibold leading-none text-slate-900">#{issue.no}</span>
                            <span style={relationBadgeStyle(typeAppearance)}>
                                <TagOutlined />
                                <span>{typeAppearance.label}</span>
                            </span>
                        </div>
                        <div className="mt-3 text-[15px] leading-7 text-slate-700 line-clamp-2">
                            {renderDescriptionWithTags(issue.description || "No description")}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <span style={relationBadgeStyle(priorityAppearance)}>
                            <FlagOutlined />
                            <span>{priorityAppearance.label}</span>
                        </span>
                        <span style={relationBadgeStyle(statusAppearance)}>
                            <CheckCircleOutlined />
                            <span>{statusAppearance.label}</span>
                        </span>
                    </div>
                </div>

                <div style={{ height: 1, background: "linear-gradient(90deg, #e5edf8 0%, #edf3fb 68%, rgba(237,243,251,0) 100%)" }} />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tooltip title="Assignee">
                            <div style={{ ...relationMetaPillStyle, background: "transparent" }}>
                                {renderAssignee()}
                            </div>
                        </Tooltip>

                        <div style={{ ...relationMetaPillStyle, background: "transparent", border: "none", boxShadow: "none" }}>
                            <InboxOutlined style={{ color: "#64748b" }} />
                            <span className="text-sm font-medium text-slate-600">
                                {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {issue.createdAt && (
                            <Tooltip title={dayjs(issue.createdAt).format("MMMM DD, YYYY [at] h:mm A")}>
                                <div style={{ ...relationDatePillStyle, background: "transparent", border: "none", boxShadow: "none" }}>
                                    <ClockCircleOutlined style={{ color: "#2563eb" }} />
                                    <span className="font-medium text-slate-600">
                                        Created {dayjs(issue.createdAt).format("MMM DD")}
                                    </span>
                                </div>
                            </Tooltip>
                        )}
                        {issue.closedDate && (
                            <Tooltip title={dayjs(issue.closedDate).format("MMMM DD, YYYY [at] h:mm A")}>
                                <div style={{ ...relationDatePillStyle, background: "transparent", border: "none", boxShadow: "none" }}>
                                    <CheckCircleOutlined style={{ color: "#2563eb" }} />
                                    <span className="font-medium text-slate-600">
                                        Closed {dayjs(issue.closedDate).format("MMM DD")}
                                    </span>
                                </div>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};

const ParentIssueCard: React.FC<{
    issue: any;
    users: any[];
    onClick: () => void;
}> = ({ issue, users, onClick }) => (
    <RelationIssueCard issue={issue} users={users} onClick={onClick} />
);

const ChildIssueCard: React.FC<{
    issue: any;
    users: any[];
    onClick: () => void;
}> = ({ issue, users, onClick }) => {
    const assigneeUser = resolveIssueAssigneeUser(issue, users);

    return (
        <button
            type="button"
            onClick={onClick}
            className="group"
            style={{
                ...relationCardContainerStyle,
                padding: 16,
            }}
            onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-2px)";
                event.currentTarget.style.borderColor = "#cddcf8";
                event.currentTarget.style.boxShadow = "0 22px 48px -34px rgba(37, 99, 235, 0.28)";
            }}
            onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.borderColor = "#dbe4f0";
                event.currentTarget.style.boxShadow = "0 18px 40px -34px rgba(15, 23, 42, 0.55)";
            }}
        >
            <div className="flex flex-col gap-4 text-left">
                <div className="text-[20px] font-semibold leading-none text-slate-900">#{issue.no}</div>

                <div className="text-[15px] leading-7 text-slate-700 line-clamp-2 min-h-[48px]">
                    {renderDescriptionWithTags(issue.description || "No description")}
                </div>

                <div style={{ height: 1, background: "linear-gradient(90deg, #e5edf8 0%, #edf3fb 68%, rgba(237,243,251,0) 100%)" }} />

                <div className="flex flex-col gap-2">
                    <Tooltip title="Assignee">
                        <div className="flex items-center gap-2" style={{ padding: 0, margin: 0 }}>
                            {assigneeUser ? (
                                <UserProfileTooltip user={assigneeUser} navigateOnClick={false}>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar
                                            size={24}
                                            src={assigneeUser.photoURL}
                                            style={{ backgroundColor: "#7c3aed", flexShrink: 0 }}
                                        >
                                            {!assigneeUser.photoURL && assigneeUser.displayName?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <span className="truncate text-sm font-semibold text-slate-800">
                                            {assigneeUser.displayName}
                                        </span>
                                    </div>
                                </UserProfileTooltip>
                            ) : (
                                <span style={{ fontWeight: 600, color: "#94a3b8" }}>Unassigned</span>
                            )}
                        </div>
                    </Tooltip>

                    {issue.createdAt && (
                        <Tooltip title={dayjs(issue.createdAt).format("MMMM DD, YYYY [at] h:mm A")}>
                            <div style={{ ...relationDatePillStyle, background: "transparent", border: "none", boxShadow: "none", padding: 0, width: "fit-content" }}>
                                <ClockCircleOutlined style={{ color: "#2563eb" }} />
                                <span className="font-medium text-slate-600">
                                    Created {dayjs(issue.createdAt).format("MMM DD")}
                                </span>
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>
        </button>
    );
};

interface IssueDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    issue: any | null;
    initialActiveTab?: "details" | "comment";
    currentProject: any;
    onUpdate: () => void;
    setApiFlag?: (flag: boolean) => void;
    setApiCanvas?: (canvas: any) => void;
    setUiFlag?: (flag: boolean) => void;
    setActiveCanvas?: (id: string) => void;
    currentRepo?: string | null;
    setCrdDrawerOpen?: (open: boolean) => void;
    setCrdDrawerNodeId?: (id: string) => void;
    setCrdDrawerRepoId?: (id: string | null) => void;
    handleDeleteCrdComponent?: (issueId: string, nodeId: string) => Promise<void>;
    setType?: (flag: boolean) => void;
    setSprint?: (flag: boolean) => void;
    setCsflag?: (flag: boolean) => void;
    setForward?: (flag: boolean) => void;
    setApi?: (flag: boolean) => void;
    setRelatedUi?: (flag: boolean) => void;
    setCalculateCodeLine?: (flag: boolean) => void;
    setPriority?: (flag: boolean) => void;
}

const ISSUE_DETAIL_DRAWER_Z_INDEX = 1200;
const ISSUE_DETAIL_ACTION_DRAWER_Z_INDEX = ISSUE_DETAIL_DRAWER_Z_INDEX + 20;
const ISSUE_DETAIL_FORWARD_DRAWER_Z_INDEX = ISSUE_DETAIL_DRAWER_Z_INDEX + 60;
const ISSUE_DETAIL_TYPE_DRAWER_Z_INDEX = ISSUE_DETAIL_DRAWER_Z_INDEX + 80;

const IssueDetailDrawer: React.FC<IssueDetailDrawerProps> = ({
    open,
    onClose,
    issue,
    initialActiveTab = "details",
    currentProject,
    onUpdate,
    setApiFlag,
    setApiCanvas,
    setUiFlag,
    setActiveCanvas,
    currentRepo,
    setCrdDrawerOpen,
    setCrdDrawerNodeId,
    setCrdDrawerRepoId,
    handleDeleteCrdComponent,
    setType,
    setSprint,
    setCsflag,
    setForward,
    setApi,
    setRelatedUi,
    setCalculateCodeLine,
    setPriority,
}) => {
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
    const [commentValue, setCommentValue] = useState<string>("");
    const [issueHistory, setIssueHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const [localApiFlag, setLocalApiFlag] = useState<boolean>(false);
    const [localUiFlag, setLocalUiFlag] = useState<boolean>(false);
    const [localApiCanvas, setLocalApiCanvas] = useState<any>({});
    const [localActiveCanvas, setLocalActiveCanvas] = useState<string>("");
    const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);
    const [imageUrls, setImageUrls] = useState<any[]>([]);
    const imageUrlsRef = useRef<any[]>([]);
    const [canvas, setCanvas] = useState<any>({});
    const [apiNames, setApiNames] = useState<{ [key: string]: string }>({});
    const [priorityModalOpen, setPriorityModalOpen] = useState<boolean>(false);
    const [changingPriority, setChangingPriority] = useState<boolean>(false);
    const [localTypeDrawerOpen, setLocalTypeDrawerOpen] = useState<boolean>(false);
    const [localTypeLoading, setLocalTypeLoading] = useState<boolean>(false);
    const [localTypeValue, setLocalTypeValue] = useState<string>(issue?.type || "New Request");
    const [localRelatedUiDrawerOpen, setLocalRelatedUiDrawerOpen] = useState<boolean>(false);
    const [localRelatedUiLoading, setLocalRelatedUiLoading] = useState<boolean>(false);
    const [localRelatedUiCanvasId, setLocalRelatedUiCanvasId] = useState<string>("");
    const [realtimeUiCanvasId, setRealtimeUiCanvasId] = useState<string>(issue?.uiCanvasId || issue?.uiCanvas || "");
    const [realtimeUiCanvasName, setRealtimeUiCanvasName] = useState<string>(issue?.uiCanvas || "");
    const [expandedCommittedFileKeys, setExpandedCommittedFileKeys] = useState<Set<string>>(new Set());
    const [commitChangeDrawerOpen, setCommitChangeDrawerOpen] = useState<boolean>(false);
    const [localLinkedCommit, setLocalLinkedCommit] = useState<any | null>(null);

    const committedCommits = React.useMemo(() => {
        if (localLinkedCommit) {
            return [localLinkedCommit];
        }

        const normalizedFromIssue = {
            sha: issue?.commitSha,
            html_url: issue?.commitUrl,
            message: issue?.commitMessage,
            commit: {
                message: issue?.commitMessage,
                author: {
                    name: issue?.commitAuthor,
                    date: issue?.commitDate,
                },
            },
            author: {
                name: issue?.commitAuthor,
                login: issue?.commitAuthor,
                avatar_url: "",
                date: issue?.commitDate,
            },
            stats: {
                additions: issue?.insertedLine || issue?.codeLine || 0,
                deletions: issue?.deletedLine || 0,
                total: issue?.modifiedLine || issue?.insertedLine || issue?.codeLine || 0,
            },
            files: Array.isArray(issue?.changedFiles) ? issue.changedFiles : [],
        };

        let githubData = issue?.githubData;
        if (typeof githubData === "string") {
            try {
                githubData = JSON.parse(githubData);
            } catch (_error) {
                githubData = null;
            }
        }

        if (Array.isArray(githubData)) {
            return githubData;
        }

        if (githubData?.commits && Array.isArray(githubData.commits)) {
            return githubData.commits;
        }

        if (githubData && typeof githubData === "object") {
            return [githubData];
        }

        if (normalizedFromIssue.sha || normalizedFromIssue.message) {
            return [normalizedFromIssue];
        }

        return [];
    }, [issue, localLinkedCommit]);

    const committedFilesCount = React.useMemo(() => {
        return committedCommits.reduce((total: number, commit: any) => {
            const files = Array.isArray(commit?.files) ? commit.files.length : 0;
            return total + files;
        }, 0);
    }, [committedCommits]);

    const renderGithubLikePatch = React.useCallback((patchText: string) => {
        const lines = String(patchText || "").split("\n");
        let oldLine = 0;
        let newLine = 0;

        return (
            <div className="border border-[#d8dee4] rounded-md overflow-hidden bg-white">
                <div className="max-h-80 overflow-auto">
                    {lines.map((line: string, lineIndex: number) => {
                        const isHunkHeader = line.startsWith("@@");
                        const isAdd = line.startsWith("+") && !line.startsWith("+++");
                        const isDelete = line.startsWith("-") && !line.startsWith("---");
                        const isMeta = line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++");

                        if (isHunkHeader) {
                            const match = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
                            if (match) {
                                oldLine = Number(match[1]);
                                newLine = Number(match[2]);
                            }
                        }

                        let oldDisplay = "";
                        let newDisplay = "";

                        if (isAdd) {
                            newDisplay = String(newLine || "");
                            newLine += 1;
                        } else if (isDelete) {
                            oldDisplay = String(oldLine || "");
                            oldLine += 1;
                        } else if (!isHunkHeader && !isMeta && line.length > 0) {
                            oldDisplay = String(oldLine || "");
                            newDisplay = String(newLine || "");
                            oldLine += 1;
                            newLine += 1;
                        }

                        const rowClass = isHunkHeader
                            ? "bg-[#ddf4ff]"
                            : isAdd
                                ? "bg-[#e6ffec]"
                                : isDelete
                                    ? "bg-[#ffebe9]"
                                    : "bg-white";

                        const numberCellClass = isHunkHeader
                            ? "text-[#1f6feb]"
                            : "text-[#6e7781]";

                        const contentClass = isHunkHeader
                            ? "text-[#0550ae]"
                            : isAdd
                                ? "text-[#116329]"
                                : isDelete
                                    ? "text-[#cf222e]"
                                    : "text-[#24292f]";

                        return (
                            <div
                                key={`${lineIndex}-${oldDisplay}-${newDisplay}`}
                                className={`grid grid-cols-[56px_56px_1fr] font-mono text-xs leading-5 ${rowClass}`}
                            >
                                <div className={`px-2 text-right border-r border-[#d8dee4] select-none ${numberCellClass}`}>
                                    {oldDisplay}
                                </div>
                                <div className={`px-2 text-right border-r border-[#d8dee4] select-none ${numberCellClass}`}>
                                    {newDisplay}
                                </div>
                                <div className={`px-3 whitespace-pre-wrap break-words ${contentClass}`}>
                                    {line || " "}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }, []);

    useEffect(() => {
        if (open) {
            setActiveTab(initialActiveTab);
        }
    }, [open, issue?.id, initialActiveTab]);

    useEffect(() => {
        if (!open) {
            setExpandedCommittedFileKeys(new Set());
            setCommitChangeDrawerOpen(false);
            setLocalLinkedCommit(null);
        }
    }, [open]);

    useEffect(() => {
        setLocalLinkedCommit(null);
    }, [issue?.id]);
    const [localCloseSendDrawerOpen, setLocalCloseSendDrawerOpen] = useState<boolean>(false);
    const [localCloseSendLoading, setLocalCloseSendLoading] = useState<boolean>(false);
    const [localCloseSendForm] = Form.useForm();

    const [localForwardDrawerOpen, setLocalForwardDrawerOpen] = useState<boolean>(false);
    const [localForwardLoading, setLocalForwardLoading] = useState<boolean>(false);
    const [localForwardForm] = Form.useForm();

    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { projectUsers: users } = useProjectUsers();
    const { canvasses } = useAppSelector(state => state.auth);
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);

    const [sprintDetailsOpen, setSprintDetailsOpen] = useState(false);
    const [selectedSprintId, setSelectedSprintId] = useState<string>("");

    const [parentChain, setParentChain] = useState<any[]>([]);
    const [loadingParentChain, setLoadingParentChain] = useState<boolean>(false);
    const [parentIssueDrawerOpen, setParentIssueDrawerOpen] = useState<boolean>(false);
    const [selectedParentIssue, setSelectedParentIssue] = useState<any>(null);

    const [childIssues, setChildIssues] = useState<any[]>([]);
    const [loadingChildIssues, setLoadingChildIssues] = useState<boolean>(false);
    const [childIssueDrawerOpen, setChildIssueDrawerOpen] = useState<boolean>(false);
    const [selectedChildIssue, setSelectedChildIssue] = useState<any>(null);

    const openSprintDetails = (sprintId: string) => {
        if (!sprintId) return;
        setSelectedSprintId(sprintId);
        setSprintDetailsOpen(true);
    };

    const getValueSync = React.useCallback((arg: any, canvasData: any) => {
        if (!canvasData?.input || !arg?.inputId) return "";

        for (const [key, item] of Object.entries(canvasData.input)) {
            const inputBlock = (item as any)?.[arg?.inputId];
            if (!inputBlock) continue;
            const fieldBlock = inputBlock?.[arg?.key];
            if (!fieldBlock) continue;
            const value =
                arg?.key !== "formAction"
                    ? fieldBlock?.[arg?.descId] ?? ""
                    : inputBlock?.[arg?.key] ?? "";

            const inputName = inputBlock?.inputName ?? "";

            if (value && inputName) {
                return { value, name: inputName, key: arg?.key };
            }
        }

        return "";
    }, []);

    useEffect(() => {
        if (currentProject?.id && open) {
            services.getActiveProjectById(currentProject.id).then(canvasData => {
                setCanvas(canvasData || {});
            }).catch(error => {
                console.error(' IssueDetailDrawer - Error loading canvas:', error);
            });
        }
    }, [currentProject?.id, open]);

    const uiCanvasDescriptionData = React.useMemo(() => {
        if (issue?.uiCanvasDescriptionData) {
            try {
                return JSON.parse(issue.uiCanvasDescriptionData);
            } catch (e) {
                console.error('Failed to parse uiCanvasDescriptionData:', e);
            }
        }
        return null;
    }, [issue?.uiCanvasDescriptionData]);

    useEffect(() => {
        const loadApiNames = async () => {
            if (!canvas?.input || !issue) return;

            const names: { [key: string]: string } = {};
            const apiIds = new Set<string>();
            if (uiCanvasDescriptionData?.api) {
                apiIds.add(uiCanvasDescriptionData.api);
            }
            if (issue?.apiCanvasId) {
                apiIds.add(issue.apiCanvasId);
            }
            const obj: any = getValueSync(issue, canvas);
            if (obj?.value?.api) {
                apiIds.add(obj.value.api);
            }

            for (const apiId of apiIds) {
                try {
                    const apiCanvas = await services.getApiCanvas(apiId);
                    if (apiCanvas && apiCanvas.name) {
                        names[apiId] = apiCanvas.name;
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            setApiNames(names);
        };

        loadApiNames();
    }, [canvas, issue, getValueSync, uiCanvasDescriptionData]);

    useEffect(() => {
        const issueKey = searchParams.get('key');
        if (issueKey && currentProject?.id) {
            loadIssueByKey(issueKey);
        }
    }, [searchParams, currentProject]);

    useEffect(() => {
        if (open && issue) {
            form.setFieldsValue({
                description: issue.description?.split("--- UI Canvas Input Description ---")[0] || issue.description || "",
                status: issue.status,
                assignee: issue.assignee,
                type: issue.type,
            });
            setCommentValue(issue.comment || "");
            setImageUrls(issue?.imageUrl || []);
            setLocalTypeValue(issue.type || "New Request");
            setRealtimeUiCanvasId(issue?.uiCanvasId || issue?.uiCanvas || "");
            setRealtimeUiCanvasName(issue?.uiCanvas || "");
            loadIssueHistory();
            loadParentChain();
            loadChildIssues();
        }
    }, [open, issue]);

    const handleLocalTypeUpdate = async () => {
        if (!localTypeValue) {
            message.warning("Please select issue type");
            return;
        }

        setLocalTypeLoading(true);
        try {
            await services.changeType(
                currentProject.id,
                issue.id,
                localTypeValue,
                currentUser?.uid,
                currentUser?.displayName || currentUser?.email,
                issue.type
            );
            message.success("Issue type updated");
            setLocalTypeDrawerOpen(false);
            onUpdate();
        } catch (error) {
            console.error("Error updating issue type:", error);
            message.error("Failed to update issue type");
        } finally {
            setLocalTypeLoading(false);
        }
    };

    const handleLocalRelatedUiUpdate = async () => {
        if (!localRelatedUiCanvasId) {
            message.error("Please select a UI Canvas first.");
            return;
        }
        if (!currentProject?.id || !issue?.id) {
            message.error("Issue context is missing.");
            return;
        }

        const selectedCanvas = canvasses?.find((canvas: any) => canvas.id === localRelatedUiCanvasId);
        if (!selectedCanvas) {
            message.error("Selected UI Canvas not found.");
            return;
        }

        setLocalRelatedUiLoading(true);
        try {
            await services.updateUICanvas(
                currentProject.id,
                [issue.id],
                localRelatedUiCanvasId,
                selectedCanvas.label || selectedCanvas.name || "",
                currentUser?.uid,
                currentUser?.displayName || currentUser?.email
            );
            setRealtimeUiCanvasId(localRelatedUiCanvasId);
            setRealtimeUiCanvasName(selectedCanvas.label || selectedCanvas.name || "");
            message.success("Related UI Canvas updated successfully");
            setLocalRelatedUiDrawerOpen(false);
            setLocalRelatedUiCanvasId("");
            onUpdate();
        } catch (error) {
            console.error("Error updating related UI canvas:", error);
            message.error("Error updating UI Canvas.");
        } finally {
            setLocalRelatedUiLoading(false);
        }
    };

    const handleLocalCloseAndSend = async () => {
        try {
            setLocalCloseSendLoading(true);
            const values = await localCloseSendForm.validateFields();

            const assigneeUser = users?.find((u: any) => u.displayName === values.assignee);
            if (!assigneeUser) {
                message.error("Assignee user not found.");
                return;
            }

            const actingUser = utilResolveActingUser(users, currentUser);
            const creatorName = actingUser.displayName || issue.createdBy || "Unknown";

            await services.updateAssign(
                currentProject?.id,
                issue.id,
                "closed",
                actingUser.uid,
                actingUser.displayName || actingUser.email
            );

            const now = new Date();
            const formatted = now.toISOString().replace("T", " ").slice(0, 19);
            await services.updateClosedDate(currentProject?.id, issue.id, formatted);

            await services.addIssueHistory(currentProject?.id, issue.id, {
                action: "closed and sent",
                user: actingUser.displayName || actingUser.email || "Unknown",
                userId: actingUser.uid || "",
                details: {
                    sentTo: assigneeUser.displayName,
                    sentToEmail: assigneeUser.email || "",
                    comment: values.comment || ""
                }
            });

            const { id, ...restOldData } = issue;
            delete restOldData.history;
            const data = {
                ...restOldData,
                assignee: assigneeUser.uid,
                assigneeName: assigneeUser.displayName,
                assigneePhotoUrl: assigneeUser.photoURL || null,
                createdBy: creatorName,
                parentNo: issue.no,
                description: values.comment || "",
                messageC: values.comment || "",
                status: "new",
                priority: "Normal",
                createdAt: new Date().toISOString(),
                closedDate: "",
                comment: "",
                history: [],
                type: values.type || issue.type || "New Request"
            };

            const newIssueId = await services.createIssue(currentProject?.id, data);

            if (newIssueId) {
                await services.addIssueHistory(
                    currentProject?.id,
                    newIssueId,
                    services.buildIssueCreatedHistoryEntry(
                        data.no,
                        creatorName,
                        actingUser.uid || ""
                    )
                );

            }

            message.success("Close and Send is Successfully!");
            setLocalCloseSendDrawerOpen(false);
            localCloseSendForm.resetFields();
            onUpdate();
            // Reload child issues to show the newly created child issue
            setTimeout(() => {
                loadChildIssues();
            }, 500);
        } catch (error) {
            console.error("Error in local close and send:", error);
            message.error("Close and Send failed.");
        } finally {
            setLocalCloseSendLoading(false);
        }
    };

    const handleLocalForwardIssue = async () => {
        try {
            setLocalForwardLoading(true);
            const values = await localForwardForm.validateFields();

            if (!values.forward) {
                message.warning("Please select a user to forward to.");
                return;
            }

            const selectedUser = users?.find((u: any) => u.uid === values.forward);
            if (!selectedUser) {
                message.error("Selected user not found.");
                return;
            }

            // Update forward using service
            await services.updateForward(
                currentProject.id,
                issue.id,
                values.forward,
                currentUser?.uid,
                currentUser?.displayName || currentUser?.email,
                selectedUser?.displayName,
                selectedUser?.photoURL || null
            );

            // Add detailed history entry with user info
            await services.addIssueHistory(currentProject?.id, issue.id, {
                action: "forwarded the Issue",
                user: currentUser?.displayName || currentUser?.email || "Unknown",
                userId: currentUser?.uid || "",
                details: {
                    forwardedTo: selectedUser.displayName,
                    forwardedToEmail: selectedUser.email || "",
                    forwardedToUid: selectedUser.uid
                }
            });

            message.success("Issue successfully forwarded to user");
            setLocalForwardDrawerOpen(false);
            localForwardForm.resetFields();
            onUpdate();
        } catch (error) {
            console.error("Error forwarding issue:", error);
            message.error("Failed to forward issue");
        } finally {
            setLocalForwardLoading(false);
        }
    };

    useEffect(() => {
        imageUrlsRef.current = imageUrls;
    }, [imageUrls]);

    const loadParentChain = async () => {
        if (!issue?.parentNo || !currentProject?.id) {
            setParentChain([]);
            return;
        }

        setLoadingParentChain(true);
        try {
            const allTasks = await services.getTasks(currentProject.id);
            const normalizeIssueNo = (value: any) => String(value ?? "").replace("#", "").trim();
            const parentIssue = allTasks.find((task: any) =>
                normalizeIssueNo(task.no) === normalizeIssueNo(issue.parentNo)
            );

            // Only direct parent is needed (no parent-of-parent chain)
            setParentChain(parentIssue ? [parentIssue] : []);
        } catch (error) {
            console.error("Error loading parent chain:", error);
            setParentChain([]);
        } finally {
            setLoadingParentChain(false);
        }
    };

    const openParentIssueDrawer = (parentIssue: any) => {
        setSelectedParentIssue(parentIssue);
        setParentIssueDrawerOpen(true);
    };

    const loadChildIssues = async () => {
        if (!issue?.no || !currentProject?.id) {
            setChildIssues([]);
            return;
        }

        setLoadingChildIssues(true);
        try {
            const allTasks = await services.getTasks(currentProject.id);
            const normalizeIssueNo = (value: any) => String(value ?? "").replace("#", "").trim();
            const issueNoStr = normalizeIssueNo(issue.no);

            const childrenByRelation = allTasks.filter((task: any) =>
                normalizeIssueNo(task.parentNo) === issueNoStr
            );

            // Backward-compatible fallback: some older child issues may miss parentNo
            // but still contain parent reference in history details.
            const childrenByHistory = allTasks.filter((task: any) => {
                if (!Array.isArray(task?.history)) return false;
                return task.history.some((h: any) => {
                    const historyParentNo = h?.details?.parentIssueNo || h?.details?.parentNo;
                    return normalizeIssueNo(historyParentNo) === issueNoStr;
                });
            });

            const merged = [...childrenByRelation, ...childrenByHistory];
            const seen = new Set<string>();
            const children = merged.filter((task: any) => {
                const key = String(task?.id || task?.no || "");
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });            setChildIssues(children);
        } catch (error) {
            console.error("Error loading child issues:", error);
            setChildIssues([]);
        } finally {
            setLoadingChildIssues(false);
        }
    };

    const openChildIssueDrawer = (childIssue: any) => {
        setSelectedChildIssue(childIssue);
        setChildIssueDrawerOpen(true);
    };

    const loadIssueByKey = async (issueKey: string) => {
        if (!currentProject?.id) return;
        try {
            const issueData = await services.getTaskById(currentProject.id, issueKey);
            if (issueData) {
                const fullIssue = { id: issueKey, ...issueData };
                if (!open) {
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openIssueDrawer', { detail: fullIssue }));
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Error loading issue by key:", error);
        }
    };

    const loadIssueHistory = async (historySourceParam?: any) => {
        const historySource = historySourceParam || issue;
        if (!historySource?.id || !currentProject?.id) return;
        setLoadingHistory(true);
        try {
            const history: any[] = [];

            if (historySource.history && Array.isArray(historySource.history)) {
                historySource.history.forEach((historyItem: any) => {
                    history.push({
                        action: historyItem.action || "Change",
                        timestamp: historyItem.timestamp?.toDate ? historyItem.timestamp.toDate() : (historyItem.timestamp || new Date()),
                        user: historyItem.user || 'Unknown',
                        oldValue: historyItem.oldValue || '',
                        newValue: historyItem.newValue || '',
                        details: historyItem.details || ''
                    });
                });
            }

            if (historySource.createdAt && !history.some(h => h.action === "created the Work item")) {
                history.push({
                    action: "created the Work item",
                    timestamp: historySource.createdAt,
                    user: historySource.createdBy,
                    details: `Issue #${historySource.no} was created`
                });
            }

            if (historySource.closedDate && !history.some(h => h.action === "changed the Status" && h.newValue === "closed")) {
                history.push({
                    action: "changed the Status",
                    timestamp: historySource.closedDate,
                    user: historySource.closedBy || historySource.assignee,
                    oldValue: historySource.status !== "closed" ? historySource.status : "Open",
                    newValue: "Closed",
                    details: `Issue #${historySource.no} was closed`
                });
            }
            const sourceImageUrls = historySource.imageUrl || imageUrls || [];
            if (sourceImageUrls && sourceImageUrls.length > 0) {
                sourceImageUrls.forEach((url: any, index: number) => {
                    const fileName = typeof url === 'string' ? url.split('/').pop() : url.name || `Attachment ${index + 1}`;
                    if (!history.some(h => h.action === "added an Attachment" && h.newValue === fileName)) {
                        history.push({
                            action: "added an Attachment",
                            timestamp: historySource.createdAt,
                            user: historySource.createdBy,
                            oldValue: "None",
                            newValue: fileName,
                        });
                    }
                });
            }

            history.sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                return dateB.getTime() - dateA.getTime();
            });

            setIssueHistory(history);
        } catch (error) {
            console.error("Error loading issue history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!open || !issue?.id || !currentProject?.id) return;

        const issueRef = doc(db, `backlog_${currentProject.id}`, issue.id);
        const unsubscribe = onSnapshot(issueRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const snapshotIssue = { id: snapshot.id, ...snapshot.data() };
            loadIssueHistory(snapshotIssue);
            form.setFieldsValue({
                description: snapshotIssue?.description?.split("--- UI Canvas Input Description ---")[0] || snapshotIssue?.description || "",
                status: snapshotIssue?.status,
                assignee: snapshotIssue?.assignee,
                type: snapshotIssue?.type,
            });
            setCommentValue(snapshotIssue?.comment || "");
            setImageUrls(snapshotIssue?.imageUrl || []);
            setLocalTypeValue(snapshotIssue?.type || "New Request");
            setRealtimeUiCanvasId(snapshotIssue?.uiCanvasId || snapshotIssue?.uiCanvas || "");
            setRealtimeUiCanvasName(snapshotIssue?.uiCanvas || "");
        });

        return () => unsubscribe();
    }, [open, issue?.id, currentProject?.id, form]);

    const [loadFlag, setLoadFlag] = useState<boolean>(false)

    const handleUpdateDescription = async () => {
        if (!canEditDescription) {
            message.warning("Only issue creator can edit description")
            return
        }
        setLoadFlag(true)
        try {
            const values = await form.validateFields();
            const descValue = values.description?.trim();
            if (!descValue) {
                message.warning("Description cannot be empty");
                return;
            }
            const historyEntry = {
                action: "changed the Description",
                user: currentUser.displayName,
                oldValue: issue?.description,
                newValue: descValue,
                details: `Description changed from '${issue?.description}' to '${descValue}'`
            }
            await services.updateDescription(currentProject.id, issue.id, descValue);
            const res = await services.addIssueHistory(currentProject.id, issue.id, historyEntry)
            message.success("Description updated successfully");
            onUpdate();
            setLoadFlag(false)
        } catch (error) {
            message.error("Failed to update description");
        }
    };

    const handleUpload = async (file: File, location: "upload" | "dragger", silent = false) => {
        try {
            const storageRef = ref(storage, `issues/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            const isImage = file.type.startsWith("image/");
            const newFile = { type: isImage ? "image" : "file", location, url: downloadURL, name: file.name };
            const updatedUrls = [...imageUrlsRef.current, newFile];
            imageUrlsRef.current = updatedUrls;
            setImageUrls(updatedUrls);
            await services.updateImageUrl(currentProject.id, issue.id, updatedUrls);
            if (!silent) {
                message.success(`${file.name} uploaded successfully`);
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            message.error(`Failed to upload ${file.name}`);
            throw error;
        }
    };

    const handleMultipleUpload = async (files: File[], location: "upload" | "dragger") => {
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = files.map(file => handleUpload(file, location, true));
            await Promise.all(uploadPromises);
            message.success(`${files.length} file(s) uploaded successfully`);
            onUpdate();
        } catch (error) {
            console.error("Error uploading multiple files:", error);
            message.error("Some files failed to upload");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = async (fileUrl: string) => {
        try {
            const updatedUrls = imageUrlsRef.current.filter((item: any) => item.url !== fileUrl);
            imageUrlsRef.current = updatedUrls;
            setImageUrls(updatedUrls);
            await services.updateImageUrl(currentProject.id, issue.id, updatedUrls);
            message.success("File removed successfully");
            onUpdate();
        } catch (error) {
            message.error("Failed to remove file");
        }
    };

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        showUploadList: true,
        beforeUpload: (file) => {
            handleUpload(file, "upload");
            return false;
        },
        fileList: imageUrls.filter((item: any) => item.location === "upload").map((item, index) => ({
            uid: String(index),
            name: item.name || `file-${index}`,
            status: "done",
            url: item.url
        })),
        onRemove: (file) => handleRemoveFile(file.url),
    };

    const draggerProps: UploadProps = {
        name: "file",
        multiple: true,
        customRequest: async (options) => {
            try {
                await handleUpload(options.file as File, "dragger");
                options.onSuccess?.("ok");
            } catch (error) {
                options.onError?.(error as Error);
            }
        },
        showUploadList: false,
        pastable: true,
        accept: "*/*",
        fileList: imageUrls.filter((item: any) => item.location === "dragger").map((item, index) => ({
            uid: String(index),
            name: item.name || `file-${index}`,
            status: "done",
            url: item.url
        })),
        onRemove: (file) => handleRemoveFile(file.url),
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const now = new Date();
            const formatted = now.toISOString().replace("T", " ").slice(0, 19);
            const oldStatus = issue.status;

            await services.changeStatus(
                currentProject.id,
                issue.id,
                newStatus,
                currentUser?.uid,
                currentUser?.displayName || currentUser?.email,
                oldStatus
            );
            await services.updateClosedDate(currentProject.id, issue.id, newStatus === "closed" ? formatted : "");

            message.success(`Status updated to "${newStatus}"`);
            form.setFieldsValue({ status: newStatus });
            onUpdate();
        } catch (error) {
            console.error("Error updating status:", error);
            message.error("Failed to update status");
        }
    };

    const handleChangePriority = async (newPriority: string) => {
        if (!currentUser?.uid || !currentUser?.displayName) {
            message.error("User information not available");
            return;
        }

        setChangingPriority(true);
        try {
            const oldPriority = issue.priority || 'Normal';

            await services.changePriority(
                currentProject.id,
                issue.id,
                newPriority,
                currentUser.uid,
                currentUser.displayName,
                oldPriority
            );

            message.success(`Priority updated to "${newPriority}"`);
            onUpdate();
            setPriorityModalOpen(false);
        } catch (error) {
            console.error("Error changing priority:", error);
            message.error("Failed to change priority");
        } finally {
            setChangingPriority(false);
        }
    };

    const handleUpdateComment = async () => {
        try {
            await services.editComment(currentProject.id, issue.id, commentValue);
            message.success("Comment updated successfully");
            onUpdate();
        } catch (error) {
            console.error("Error updating comment:", error);
            message.error("Failed to update comment");
        }
    };

    const { formDescription, uiCanvasDescriptionFromIssue } = React.useMemo(() => {
        if (!issue?.description) return { formDescription: '', uiCanvasDescriptionFromIssue: '' };
        let formDesc = issue.description;
        let uiCanvasDesc = '';
        if (issue.description.includes('--- UI Canvas Input Description ---')) {
            const parts = issue.description.split('--- UI Canvas Input Description ---');
            formDesc = parts[0]?.trim() || '';
            uiCanvasDesc = parts[1]?.trim() || '';
        }
        return { formDescription: formDesc, uiCanvasDescriptionFromIssue: uiCanvasDesc };
    }, [issue?.description]);

    const { obj, value, name, arg, apiNameFromId } = React.useMemo(() => {
        if (!issue || !canvas) return { obj: null, value: null, name: '', arg: null, apiNameFromId: null };
        const canvasObj: any = getValueSync(issue, canvas);
        const canvasValue = canvasObj?.value;
        const canvasName = canvasObj?.name;
        const canvasArg = canvasObj?.key;
        const canvasApiNameFromId = canvasValue?.api ? apiNames[canvasValue.api] : null;
        return {
            obj: canvasObj,
            value: canvasValue,
            name: canvasName,
            arg: canvasArg,
            apiNameFromId: canvasApiNameFromId
        };
    }, [issue, canvas, apiNames, getValueSync]);

    const { displayInputName, displayDescription, useIssueData, descData, descKey, hasInputInfo, issueApiName, finalApiName } = React.useMemo(() => {
        if (!issue) return { displayInputName: '', displayDescription: '', useIssueData: false, descData: null, descKey: null, hasInputInfo: false, issueApiName: null, finalApiName: null };
        const inputName = issue?.inputName || name || '';
        const description = uiCanvasDescriptionFromIssue || value?.description || '';
        const useData = uiCanvasDescriptionData && issue?.inputId;
        const data = useData ? uiCanvasDescriptionData : value;
        const key = useData ? uiCanvasDescriptionData?.key : arg;
        const hasInfo = (canvas?.input && obj) || (issue?.inputId && (inputName || description || uiCanvasDescriptionData));
        const apiName = data?.apiName || (data?.api ? apiNames[data.api] : null);
        const finalApi = apiName || apiNameFromId;
        return {
            displayInputName: inputName,
            displayDescription: description,
            useIssueData: useData,
            descData: data,
            descKey: key,
            hasInputInfo: hasInfo,
            issueApiName: apiName,
            finalApiName: finalApi
        };
    }, [issue, name, uiCanvasDescriptionFromIssue, value, uiCanvasDescriptionData, arg, canvas, obj, apiNames, apiNameFromId]);

    const getCanvasName = React.useCallback((canvasId: string) => {
        if (!canvasId || !canvas?.list) return canvasId;
        const canvasItem = canvas.list.find((item: any) => item.id === canvasId);
        return canvasItem?.label || canvasItem?.name || canvasId;
    }, [canvas?.list]);

    const crdNodeDataFromIssue = React.useMemo(() => {
        const raw = issue?.crdNodeData;
        if (!raw) return [];

        // Firestore may store this as stringified JSON OR as an object/array directly.
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!parsed) return [];
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            console.error('Failed to parse crdNodeData:', e);
            return [];
        }
    }, [issue?.crdNodeData]);

    const checkColor = (status: string) => {
        return status === "draft" ? "bg-[#C8C8C8] text-black"
            : status === "new" ? "bg-[#FFA500] text-black"
                : status === "closed" ? "bg-blue-500 text-white"
                    : status === "canceled" ? "bg-red-500 text-white"
                        : status === "ongoing" ? "bg-[#008000] text-white"
                            : "bg-[#9ACD32] text-black";
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'bg-red-500 text-white';
            case 'High': return 'bg-orange-500 text-white';
            case 'Normal': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const [flag, setFlag] = useState<boolean>(false)
    const [descEditMode, setDescEditMode] = useState<boolean>(false)
    if (!issue) {
        return null;
    }
    const assigneeUser: any = users?.find((u: any) => u.uid?.toLowerCase().trim() === issue.assignee?.toLowerCase().trim());
    const createdByUser: any = users?.find((u: any) => u.displayName?.toLowerCase().trim() === issue.createdBy?.toLowerCase().trim());
    const creatorIdFromHistory = Array.isArray(issue?.history)
        ? issue.history.find((h: any) => h?.action === "created the Work item" && h?.userId)?.userId
        : "";
    const createdByUid = issue?.createdByUid || creatorIdFromHistory || createdByUser?.uid || "";
    const currentUserUid = (currentUser?.uid || "").toLowerCase().trim();
    const canEditDescription = Boolean(
        currentUserUid &&
        (
            (createdByUid && currentUserUid === String(createdByUid).toLowerCase().trim()) ||
            (issue?.createdBy && currentUser?.displayName && issue.createdBy.toLowerCase().trim() === currentUser.displayName.toLowerCase().trim()) ||
            (issue?.createdByEmail && currentUser?.email && issue.createdByEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
        )
    );
    const editDescription = (arg) => {
        if (!canEditDescription) {
            message.warning("Only issue creator can edit description")
            return
        }
        if (!arg) {
            setDescEditMode(true)
        }
        else {
            handleUpdateDescription()
            setDescEditMode(false)
        }
    }

    const getIconColor = (status: string) => {
        const colorClass = checkColor(status);
        return colorClass.includes("text-white") ? "white" : "black";
    };

    const statusItems = [
        { key: "canceled", label: "Canceled", icon: <CloseCircleOutlined style={{ color: getIconColor("canceled") }} /> },
        { key: "ongoing", label: "Ongoing", icon: <PlayCircleOutlined style={{ color: getIconColor("ongoing") }} /> },
        { key: "waiting", label: "Waiting", icon: <ClockCircleOutlined style={{ color: getIconColor("waiting") }} /> },
        { key: "closed", label: "Closed", icon: <LockOutlined style={{ color: getIconColor("closed") }} /> },
        { key: "draft", label: "Draft", icon: <EditOutlined style={{ color: getIconColor("draft") }} /> },
        { key: "new", label: "New", icon: <RocketOutlined style={{ color: getIconColor("new") }} /> },
    ];

    const currentStatus = statusItems.find(item => item.key === issue.status);
    const menu = {
        className: "w-40",
        theme: "dark" as const,
        onClick: async ({ key }: { key: string }) => {
            if (key !== issue.status) {
                await handleUpdateStatus(key);
            }
        },
        items: statusItems.map(i => ({
            key: i.key,
            label: <span className={`inline-block px-2.5 ${checkColor(i.key)} w-max rounded capitalize`}>{i.icon} {i.label}</span>,
        }))
    };

    const drawerPanelStyle: React.CSSProperties = {
        borderRadius: 14,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        background: "#ffffff",
        overflow: "hidden",
    };

    const sectionStyle: React.CSSProperties = {
        borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
        paddingBottom: 16,
        marginBottom: 16,
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: 13,
        fontWeight: 600,
        color: "#0f172a",
        marginBottom: 10,
    };

    const sideCardStyle: React.CSSProperties = {
        ...drawerPanelStyle,
        padding: 16,
    };

    const metaLabelStyle: React.CSSProperties = {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 6,
        fontWeight: 500,
    };

    const actionButtonStyle: React.CSSProperties = {
        width: "100%",
        height: 38,
        borderRadius: 10,
        justifyContent: "flex-start",
    };

    const metricStripStyle: React.CSSProperties = {
        width: 124,
        color: "#ffffff",
        padding: "7px 12px",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12,
        fontWeight: 600,
    };

    const miniStatStyle: React.CSSProperties = {
        background: "#ffffff",
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        minHeight: 56,
        display: "flex",
        alignItems: "center",
    };

    const getPriorityBadgeStyle = (priority: string): React.CSSProperties => {
        switch (priority) {
            case "Urgent":
                return { background: "#fff1f0", color: "#d9363e", border: "1px solid #ffccc7" };
            case "High":
                return { background: "#fff7e6", color: "#ad6800", border: "1px solid #ffd591" };
            default:
                return { background: "#e6f4ff", color: "#1677ff", border: "1px solid #91caff" };
        }
    };

    const getStatusBadgeStyle = (status: string): React.CSSProperties => {
        switch (status) {
            case "new":
                return { background: "#fff7e6", color: "#d46b08", border: "1px solid #ffd591" };
            case "ongoing":
                return { background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" };
            case "closed":
                return { background: "#e6f4ff", color: "#1677ff", border: "1px solid #91caff" };
            case "canceled":
                return { background: "#fff1f0", color: "#cf1322", border: "1px solid #ffa39e" };
            case "draft":
                return { background: "#fafafa", color: "#595959", border: "1px solid #d9d9d9" };
            default:
                return { background: "#f6ffed", color: "#5b8c00", border: "1px solid #d9f7be" };
        }
    };

    const prioritySelectorOptions = [
        { value: "Urgent", label: "Urgent", textColor: "#d9363e", background: "#fff1f0", border: "#ffccc7", activeBackground: "#ffd8d6", activeBorder: "#ff7875" },
        { value: "High", label: "High", textColor: "#ad6800", background: "#fff7e6", border: "#ffd591", activeBackground: "#ffe7ba", activeBorder: "#faad14" },
        { value: "Normal", label: "Normal", textColor: "#1677ff", background: "#ffffff", border: "#91caff", activeBackground: "#d6e4ff", activeBorder: "#1677ff" },
    ];

    const getPrioritySelectorButtonStyle = (
        option: { value: string; textColor: string; background: string; border: string; activeBackground: string; activeBorder: string },
        selected: string,
        index: number,
        total: number
    ): React.CSSProperties => {
        const isSelected = selected === option.value;
        return ({
        flex: 1,
        minWidth: 88,
        height: 38,
        lineHeight: "36px",
        textAlign: "center",
        color: option.textColor,
        background: isSelected ? option.activeBackground : option.background,
        borderColor: isSelected ? option.activeBorder : "#d9d9d9",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderTopLeftRadius: index === 0 ? 10 : 0,
        borderBottomLeftRadius: index === 0 ? 10 : 0,
        borderTopRightRadius: index === total - 1 ? 10 : 0,
        borderBottomRightRadius: index === total - 1 ? 10 : 0,
        marginInlineStart: 0,
        boxShadow: isSelected ? `inset 0 0 0 1px ${option.activeBorder}, 0 2px 8px rgba(15, 23, 42, 0.12)` : "none",
        fontWeight: isSelected ? 700 : 600,
        zIndex: isSelected ? 2 : 1,
    });
    };

    const actionMenuItems = [
        {
            key: "updateType",
            label: <span className="inline-flex items-center gap-2"><EditOutlined />Update Type</span>,
            onClick: () => {
                if (setType) {
                    setType(true);
                    return;
                }
                setLocalTypeValue(issue?.type || "New Request");
                setLocalTypeDrawerOpen(true);
            }
        },
        {
            key: "relatedUi",
            label: <span className="inline-flex items-center gap-2"><AppstoreOutlined />Related UI Canvas</span>,
            onClick: () => {
                if (setRelatedUi) {
                    setRelatedUi(true);
                    return;
                }
                setLocalRelatedUiDrawerOpen(true);
            }
        },
        {
            key: "closeAndSend",
            label: <span className="inline-flex items-center gap-2"><SaveOutlined />Close and Send</span>,
            onClick: () => {
                if (setCsflag) {
                    setCsflag(true);
                    return;
                }
                const currentAssignee = users?.find((u: any) =>
                    u.uid?.toLowerCase().trim() === issue.assignee?.toLowerCase().trim() ||
                    u.displayName?.toLowerCase().trim() === issue.assigneeName?.toLowerCase().trim()
                );
                localCloseSendForm.setFieldsValue({
                    assignee: currentAssignee?.displayName || "",
                    type: issue?.type || "New Request",
                    comment: ""
                });
                setLocalCloseSendDrawerOpen(true);
            }
        },
        {
            key: "forwardIssue",
            label: <span className="inline-flex items-center gap-2"><ShareAltOutlined />Forward Issue</span>,
            onClick: () => {
                if (setForward) {
                    setForward(true);
                    return;
                }
                localForwardForm.resetFields();
                setLocalForwardDrawerOpen(true);
            }
        },
    ];

    const commentsCount = Array.isArray(issue?.comment)
        ? issue.comment.length
        : (typeof issue?.comment === "string" && issue.comment.trim() !== "" ? 1 : 0);
    const issueRelationsCount = parentChain.length + childIssues.length;
    const historyCount = issueHistory.length;
    const relatedUiCanvasId = realtimeUiCanvasId || issue?.uiCanvasId || issue?.uiCanvas || "";
    const relatedUiCanvasName = realtimeUiCanvasName || getCanvasName(relatedUiCanvasId) || issue?.uiCanvas || "";
    const hasRelatedUiCanvas = Boolean(relatedUiCanvasName);

    return (
        <>
            <Drawer
                title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, width: "100%" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Title level={4} style={{ margin: 0, color: "#0f172a" }}>Issue Details - #{issue.no}</Title>
                                <Button
                                    type="text"
                                    icon={<ShareAltOutlined />}
                                    onClick={() => setShareModalOpen(true)}
                                    size="small"
                                    style={{ paddingInline: 0, color: "#475569" }}
                                >
                                    Share
                                </Button>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <Tag style={{ ...getPriorityBadgeStyle(issue.priority || "Normal"), margin: 0, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                                <FlagOutlined style={{ marginRight: 6 }} />
                                {issue.priority || 'Normal'}
                            </Tag>
                            <Tag style={{ ...getStatusBadgeStyle(issue.status), margin: 0, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                                {issue.status}
                            </Tag>
                        </div>
                    </div>
                }
                width="90%"
                zIndex={ISSUE_DETAIL_DRAWER_Z_INDEX}
                open={open}
                onClose={onClose}
                styles={{
                    header: {
                        paddingBlock: 14,
                        paddingInline: 20,
                        borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
                        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
                    },
                    body: {
                        padding: 16,
                        background: "#f5f7fb",
                        height: "calc(100vh - 132px)",
                        overflow: "auto",
                    },
                    footer: {
                        padding: "12px 16px",
                        borderTop: "1px solid rgba(148, 163, 184, 0.14)",
                        background: "rgba(255, 255, 255, 0.96)",
                    },
                }}
                footer={
                    activeTab === "details" ? (
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                            <Button onClick={onClose} style={{ minWidth: 100, height: 38, borderRadius: 10 }}>Close</Button>
                        </div>
                    ) : null
                }
            >
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                            {
                                key: "details",
                                label: "Details",
                                children: (
                                    <div style={drawerPanelStyle}>
                                        <Form form={form} layout="vertical" style={{ padding: 16 }}>
                                        <div style={{ ...sectionStyle, marginBottom: issue?.description?.includes('--- UI Canvas Input Description ---') || hasRelatedUiCanvas || hasInputInfo || crdNodeDataFromIssue.length > 0 ? 16 : 0, borderBottom: issue?.description?.includes('--- UI Canvas Input Description ---') || hasRelatedUiCanvas || hasInputInfo || crdNodeDataFromIssue.length > 0 ? sectionStyle.borderBottom : "none", paddingBottom: issue?.description?.includes('--- UI Canvas Input Description ---') || hasRelatedUiCanvas || hasInputInfo || crdNodeDataFromIssue.length > 0 ? 16 : 0 }}>
                                            <div style={{ display: "flex", paddingBottom: 6, width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                                <div style={sectionTitleStyle}>Description</div>
                                                <Button
                                                    onClick={() => editDescription(descEditMode)}
                                                    size="small"
                                                    type="primary"
                                                    disabled={!canEditDescription}
                                                    title={!canEditDescription ? "Only issue creator can edit description" : ""}
                                                    style={{ borderRadius: 8 }}
                                                >
                                                    {loadFlag ? <LoaderCircle className="animate-spin" /> : !descEditMode ? "Edit" : "Save"}
                                                </Button>
                                            </div>

                                            <Form.Item
                                                name="description"
                                                rules={[{ required: true, min: 3, max: 1000 }]}
                                                style={{ marginBottom: 0 }}
                                            >
                                                {descEditMode ? (
                                                    <TextArea rows={4} style={{ borderRadius: 12, background: "#fbfdff" }} />
                                                ) : (
                                                    <div style={{
                                                        border: "1px solid rgba(15, 23, 42, 0.12)",
                                                        padding: "12px 14px",
                                                        minHeight: "104px",
                                                        borderRadius: 12,
                                                        backgroundColor: "#fbfdff",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word",
                                                        color: "#0f172a"
                                                    }}>
                                                        {renderDescriptionWithTags(form.getFieldValue('description') || issue?.description || '')}
                                                    </div>
                                                )}
                                            </Form.Item>
                                        </div>

                                        {issue?.description?.includes('--- UI Canvas Input Description ---') && (
                                            <Form.Item>
                                                <div style={{ ...sectionStyle }}>
                                                <div style={sectionTitleStyle}>UI Canvas Description</div>
                                                <div className="p-3 bg-gray-50 rounded border">
                                                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                                        {issue.description.split('--- UI Canvas Input Description ---')[1]?.trim() || ''}
                                                    </div>
                                                </div>
                                                </div>
                                            </Form.Item>
                                        )}
                                        {hasRelatedUiCanvas && (
                                            <Form.Item >
                                                <div style={{ ...sectionStyle }}>
                                                <div style={sectionTitleStyle}>Related UI - Canvas</div>
                                                <div className="flex items-center gap-2">
                                                    <AppstoreOutlined className="text-blue-500" />
                                                    <span
                                                        className="text-blue-500 hover:underline cursor-pointer font-medium"
                                                        onClick={() => {
                                                            const canvasId = relatedUiCanvasId;

                                                            if (setUiFlag && setActiveCanvas) {
                                                                setUiFlag(true);
                                                                setActiveCanvas(canvasId);
                                                            } else {
                                                                setLocalUiFlag(true);
                                                                setLocalActiveCanvas(canvasId);
                                                            }
                                                        }}
                                                    >
                                                        {relatedUiCanvasName}
                                                    </span>
                                                </div>
                                                </div>
                                            </Form.Item>
                                        )}

                                        {hasInputInfo && (
                                            <Form.Item>
                                                <div style={{ ...sectionStyle }}>
                                                <div style={sectionTitleStyle}>Description Details</div>
                                                <div className="text-gray-400 text-[12px]">
                                                    {descData?.action ? (
                                                        <span>
                                                            <span className="font-bold">{displayInputName}</span> On Click{' '}
                                                            <span className="inline-block py-0 text-[10px] text-white bg-green-500 rounded px-2.5 leading-[1.4]">
                                                                {descData?.action === "show_form" ? "pop" : descData?.action}
                                                            </span>{' '}
                                                            {(() => {
                                                                const uiCanvasId = descData?.uiId || descData?.ui_canvas_id;
                                                                const canvasName = getCanvasName(uiCanvasId) || relatedUiCanvasName || descData?.uiName || uiCanvasId;
                                                                return (
                                                                    <span
                                                                        onClick={() => {
                                                                            if (setUiFlag && setActiveCanvas) {
                                                                                setUiFlag(true);
                                                                                setActiveCanvas(uiCanvasId);
                                                                            } else {
                                                                                setLocalUiFlag(true);
                                                                                setLocalActiveCanvas(uiCanvasId);
                                                                            }
                                                                        }}
                                                                        className="hover:underline font-bold hover:text-blue-500 cursor-pointer"
                                                                    >
                                                                        {canvasName}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {descData?.condition && (
                                                                <span className="text-gray-600">
                                                                    , {descData?.condition}
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : descData?.event ? (
                                                        <span className="inline-block">
                                                            <span className="font-bold">{displayInputName}</span>{' '}
                                                            <span className={`inline-block mr-[2px] text-white ${descKey === "manualDescription" ? "bg-yellow-500" : "bg-blue-500"} text-[10px] leading-[1.4] rounded py-0 px-2.5`}>
                                                                {descData?.event}
                                                            </span>{' '}
                                                            {descData?.api && (
                                                                <span
                                                                    onClick={async () => {
                                                                        const apiId = descData?.api;
                                                                        if (setApiFlag && setApiCanvas) {
                                                                            setApiCanvas({ id: apiId });
                                                                            setApiFlag(true);
                                                                        } else {
                                                                            setLocalApiCanvas({ id: apiId });
                                                                            setLocalApiFlag(true);
                                                                        }
                                                                    }}
                                                                    className="font-bold hover:underline cursor-pointer hover:text-blue-400"
                                                                >
                                                                    {finalApiName || 'API'}
                                                                </span>
                                                            )}
                                                            {displayDescription && (
                                                                <span className="text-gray-600">
                                                                    , {displayDescription}
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : displayDescription ? (
                                                        <span>
                                                            <span className="font-bold">{displayInputName}</span>{' '}
                                                            {descData?.label ? descData.label + ' ' : value?.label ? value.label + ' ' : ''}
                                                            {displayDescription}
                                                        </span>
                                                    ) : displayInputName ? (
                                                        <span>
                                                            <span className="font-bold">{displayInputName}</span>{' '}
                                                            {value?.label || ''}
                                                        </span>
                                                    ) : value?.label ? (
                                                        <Tooltip title={value?.label}>
                                                            <span className="text-[14px]">{value?.label}</span>
                                                        </Tooltip>
                                                    ) : null}
                                                </div>
                                                </div>
                                            </Form.Item>
                                        )}

                                        {crdNodeDataFromIssue.length > 0 && (
                                            <Form.Item >
                                                <div style={{ ...sectionStyle }}>
                                                <div style={sectionTitleStyle}>Description Details</div>
                                                <div className="space-y-3">
                                                    {crdNodeDataFromIssue.map((nodeInfo: any, index: number) => {
                                                        const githubRepoFullName = nodeInfo.githubRepoFullName || '';
                                                        const githubPath = nodeInfo.githubPath || nodeInfo.path || '';
                                                        const externalRepoFullName = nodeInfo.externalRepoFullName || '';
                                                        const externalPath = nodeInfo.externalPath || '';

                                                        const primaryPath = githubPath || externalPath || '';
                                                        const displayName =
                                                            nodeInfo.nodeName ||
                                                            (primaryPath ? String(primaryPath).split('/').pop() : '') ||
                                                            'Source File';

                                                        const openSourceDrawer = (repoFullName: string, filePath: string, branch: string, nodeId?: string) => {
                                                            if (!repoFullName || !filePath) {
                                                                message.warning("Repository file info not found for this component");
                                                                return;
                                                            }
                                                            window.dispatchEvent(new CustomEvent('openSourceCodeDrawer', {
                                                                detail: { repoFullName, filePath, branch, nodeId }
                                                            }));
                                                        };

                                                        const handleOpenCrd = () => {
                                                            if (setCrdDrawerNodeId && setCrdDrawerRepoId && setCrdDrawerOpen && nodeInfo.nodeId) {
                                                                setCrdDrawerNodeId(nodeInfo.nodeId);
                                                                const repoIdToUse = nodeInfo.githubRepoId || currentRepo || null;
                                                                setCrdDrawerRepoId(repoIdToUse);
                                                                setCrdDrawerOpen(true);
                                                                return;
                                                            }
                                                            message.warning("CRD drawer is not available for this component");
                                                        };

                                                        return (
                                                            <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                                                                <div className="flex items-start justify-between gap-2">

                                                                    <div className="min-w-0">
                                                                        {(issue?.api || issue?.apiCanvasId || issue?.apiCanvasName || issue?.key === 'apiCall' || uiCanvasDescriptionData?.key === 'apiCall') && (
                                                                            <div>
                                                                                <div className="text-gray-400 text-[12px]">
                                                                                    {issue?.api && !uiCanvasDescriptionData && (
                                                                                        <p>
                                                                                            Call Api{' '}
                                                                                            <span
                                                                                                className="font-bold text-[14px] text-black cursor-pointer hover:text-blue-500 hover:underline"
                                                                                                onClick={async () => {
                                                                                                    let apiId = issue?.apiCanvasId;

                                                                                                    // If apiCanvasId is not available, try to parse from api field
                                                                                                    if (!apiId && issue?.api) {
                                                                                                        if (issue.api.includes("T")) {
                                                                                                            apiId = issue.api.split("T")[1];
                                                                                                        } else {
                                                                                                            apiId = issue.api;
                                                                                                        }
                                                                                                    }

                                                                                                    // Only open drawer if we have a valid API ID
                                                                                                    if (apiId && apiId.trim() !== '') {
                                                                                                        if (setApiFlag && setApiCanvas) {
                                                                                                            setApiCanvas({ id: apiId });
                                                                                                            setApiFlag(true);
                                                                                                        } else {
                                                                                                            setLocalApiCanvas({ id: apiId });
                                                                                                            setLocalApiFlag(true);
                                                                                                        }
                                                                                                    } else {
                                                                                                        console.warn("API Canvas ID not found for issue:", issue);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                {issue?.apiCanvasName || issue?.api?.split("T")[0] || issue?.api}
                                                                                            </span>
                                                                                            {(issue?.apiDescription || issue?.apiCanvasDescription) && <span> {issue.apiDescription || issue.apiCanvasDescription}</span>}
                                                                                        </p>
                                                                                    )}
                                                                                    {(uiCanvasDescriptionData?.key === 'apiCall' || issue?.key === 'apiCall') && uiCanvasDescriptionData?.event && (
                                                                                        <span className="inline-block">
                                                                                            <span className="font-bold">{issue?.inputName || uiCanvasDescriptionData?.inputName || 'Input'}</span>{' '}
                                                                                            <span className={`inline-block mr-[2px] text-white bg-blue-500 text-[10px] leading-[1.4] rounded py-0 px-2.5`}>
                                                                                                {uiCanvasDescriptionData.event}
                                                                                            </span>{' '}
                                                                                            {(uiCanvasDescriptionData?.api || issue?.apiCanvasId) && (
                                                                                                <span
                                                                                                    onClick={async () => {
                                                                                                        const apiId = uiCanvasDescriptionData?.api || issue?.apiCanvasId;

                                                                                                        // Only open drawer if we have a valid API ID
                                                                                                        if (apiId && apiId.trim() !== '') {
                                                                                                            if (setApiFlag && setApiCanvas) {
                                                                                                                setApiCanvas({ id: apiId });
                                                                                                                setApiFlag(true);
                                                                                                            } else {
                                                                                                                setLocalApiCanvas({ id: apiId });
                                                                                                                setLocalApiFlag(true);
                                                                                                            }
                                                                                                        } else {
                                                                                                            console.warn("API Canvas ID not found");
                                                                                                        }
                                                                                                    }}
                                                                                                    className="font-bold hover:underline cursor-pointer hover:text-blue-400"
                                                                                                >
                                                                                                    {issue?.apiCanvasName || uiCanvasDescriptionData?.apiName || 'API'}
                                                                                                </span>
                                                                                            )}
                                                                                            {uiCanvasDescriptionData?.description && (
                                                                                                <Tooltip title={uiCanvasDescriptionData.description.length >= 30 ? uiCanvasDescriptionData.description : ""}>
                                                                                                    <span className="text-gray-600">
                                                                                                        , {uiCanvasDescriptionData.description.length >= 30 ? uiCanvasDescriptionData.description.slice(0, 30) + "..." : uiCanvasDescriptionData.description}
                                                                                                    </span>
                                                                                                </Tooltip>
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                    {!uiCanvasDescriptionData && (issue?.apiCanvasId || issue?.apiCanvasName) && (
                                                                                        <p>
                                                                                            Call Api{' '}
                                                                                            <span
                                                                                                className="font-bold cursor-pointer hover:text-blue-500 hover:underline"
                                                                                                onClick={async () => {
                                                                                                    const apiId = issue?.apiCanvasId;

                                                                                                    // Only open drawer if we have a valid API ID
                                                                                                    if (apiId && apiId.trim() !== '') {
                                                                                                        if (setApiFlag && setApiCanvas) {
                                                                                                            setApiCanvas({ id: apiId });
                                                                                                            setApiFlag(true);
                                                                                                        } else {
                                                                                                            setLocalApiCanvas({ id: apiId });
                                                                                                            setLocalApiFlag(true);
                                                                                                        }
                                                                                                    } else {
                                                                                                        console.warn("API Canvas ID not found for issue:", issue);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                {issue?.apiCanvasName || 'API Canvas'}
                                                                                            </span>
                                                                                            {issue?.apiCanvasDescription && <span> {issue.apiCanvasDescription}</span>}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2">
                                                                            <FolderOutlined className="text-yellow-500" />
                                                                            <span className="font-medium">{displayName}</span>
                                                                        </div>

                                                                        {githubRepoFullName && githubPath && (
                                                                            <div className="flex gap-2 items-center mt-1">
                                                                                <GithubOutlined className="text-blue-500" />
                                                                                <Tooltip title={`${githubRepoFullName}/${githubPath}`}>
                                                                                    <span
                                                                                        className="text-blue-600 cursor-pointer hover:underline break-all"
                                                                                        onClick={() =>
                                                                                            openSourceDrawer(
                                                                                                githubRepoFullName,
                                                                                                githubPath,
                                                                                                nodeInfo.githubBranch || 'main',
                                                                                                nodeInfo.nodeId
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {githubPath}
                                                                                    </span>
                                                                                </Tooltip>
                                                                            </div>
                                                                        )}

                                                                        {externalRepoFullName && externalPath && (
                                                                            <div className="flex gap-2 items-center mt-1">
                                                                                <LinkOutlined className="text-red-500" />
                                                                                <Tooltip title={`${externalRepoFullName}/${externalPath}`}>
                                                                                    <span
                                                                                        className="text-red-600 cursor-pointer hover:underline break-all"
                                                                                        onClick={() =>
                                                                                            openSourceDrawer(
                                                                                                externalRepoFullName,
                                                                                                externalPath,
                                                                                                nodeInfo.externalBranch || 'main',
                                                                                                nodeInfo.nodeId
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {externalPath}
                                                                                    </span>
                                                                                </Tooltip>
                                                                            </div>
                                                                        )}

                                                                        {nodeInfo.canvasType && nodeInfo.canvasId && (
                                                                            <div className="mt-2">
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1.5 px-2.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${nodeInfo.canvasType === 'ui'
                                                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                                        : 'bg-green-100 text-green-700 border border-green-200'
                                                                                        }`}
                                                                                    onClick={() => {
                                                                                        if (nodeInfo.canvasType === 'ui' && nodeInfo.canvasId) {
                                                                                            const canvasId = nodeInfo.canvasId;
                                                                                            if (setUiFlag && setActiveCanvas) {
                                                                                                setUiFlag(true);
                                                                                                setActiveCanvas(canvasId);
                                                                                            } else {
                                                                                                setLocalUiFlag(true);
                                                                                                setLocalActiveCanvas(canvasId);
                                                                                            }
                                                                                        } else if (nodeInfo.canvasType === 'api' && nodeInfo.canvasId) {
                                                                                            const apiId = nodeInfo.canvasId;
                                                                                            if (setApiFlag && setApiCanvas) {
                                                                                                setApiCanvas({ id: apiId });
                                                                                                setApiFlag(true);
                                                                                            } else {
                                                                                                setLocalApiCanvas({ id: apiId });
                                                                                                setLocalApiFlag(true);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {nodeInfo.canvasType === 'ui' ? <AppstoreOutlined /> : <LinkOutlined />}
                                                                                    <span>{nodeInfo.canvasType === 'ui' ? 'UI' : 'API'} Canvas: {nodeInfo.canvasName || nodeInfo.canvasId}</span>
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {Array.isArray(nodeInfo.collectionIds) && nodeInfo.collectionIds.length > 0 && (
                                                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                                                <FolderOpenOutlined className="text-yellow-600" />
                                                                                <span className="text-yellow-700 font-medium">
                                                                                    {nodeInfo.collectionIds.length} Collection{nodeInfo.collectionIds.length > 1 ? 's' : ''}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <Tooltip title="Open CRD view">
                                                                            <GithubOutlined className="text-blue-500 cursor-pointer" onClick={handleOpenCrd} />
                                                                        </Tooltip>
                                                                        {handleDeleteCrdComponent && nodeInfo.nodeId && (
                                                                            <Tooltip title="Remove Component">
                                                                                <DeleteOutlined
                                                                                    className="text-red-500 cursor-pointer"
                                                                                    onClick={() => {
                                                                                        Modal.confirm({
                                                                                            title: 'Remove Component',
                                                                                            content: `Are you sure you want to remove "${displayName}"?`,
                                                                                            okText: 'Yes',
                                                                                            okType: 'danger',
                                                                                            cancelText: 'Cancel',
                                                                                            onOk: async () => {
                                                                                                await handleDeleteCrdComponent(issue.id, nodeInfo.nodeId);
                                                                                                onUpdate();
                                                                                            },
                                                                                        });
                                                                                    }}
                                                                                />
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                </div>
                                            </Form.Item>
                                        )}
                                        <Form.Item style={{ marginBottom: 0 }}>
                                            <div>
                                            <AttachmentsGrid
                                                files={imageUrls}
                                                onAddFile={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.multiple = true;
                                                    input.accept = '*/*';
                                                    input.onchange = (e: any) => {
                                                        const files = Array.from(e.target.files || []) as File[];
                                                        if (files.length > 0) {
                                                            handleMultipleUpload(files, "upload");
                                                        }
                                                    };
                                                    input.click();
                                                }}
                                            />

                                            <div className="space-y-2" style={{ marginTop: 6 }}>
                                                {!(imageUrls.length > 0) ? <Upload {...uploadProps}>
                                                    <Button className="mb-[5px]" icon={<UploadOutlined />} disabled={uploading} style={{ borderRadius: 10, height: 38 }}>
                                                        {uploading ? "Uploading..." : "Choose File"}
                                                    </Button>
                                                </Upload> : ''}
                                                <Dragger className="issue-dragger-animated" {...draggerProps} style={{ borderRadius: 10, background: "linear-gradient(180deg, #fcfdff 0%, #f7faff 100%)", minHeight: 104, padding: "6px 8px" }}>
                                                    <>
                                                        <p className="ant-upload-drag-icon" style={{ marginBottom: 6 }}><InboxOutlined /></p>
                                                        <p className="ant-upload-text" style={{ marginBottom: 0, fontSize: 14 }}>Drag, drop, or paste file</p>
                                                    </>
                                                </Dragger>
                                            </div>
                                            </div>
                                        </Form.Item>
                                        </Form>
                                    </div>
                                )
                            },
                            {
                                key: "commited-files",
                                label: `Commited Files (${committedFilesCount})`,
                                children: (
                                    <div style={{ ...drawerPanelStyle, padding: 16 }}>
                                        {committedCommits.length === 0 ? (
                                            <div className="py-8 flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setCommitChangeDrawerOpen(true)}
                                                    className="group inline-flex items-center gap-2 rounded-md border border-dashed border-[#cbd5e1] bg-white px-4 py-2 text-[13px] text-[#2563eb] hover:border-[#93c5fd] hover:bg-[#eff6ff]"
                                                >
                                                    <GithubOutlined className="text-[14px]" />
                                                    <span className="font-medium">Add commit changes</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {committedCommits.map((commit: any, commitIndex: number) => {
                                                    const files = Array.isArray(commit?.files) ? commit.files : [];
                                                    const additions = Number(commit?.stats?.additions || 0);
                                                    const deletions = Number(commit?.stats?.deletions || 0);
                                                    const changes = Number(
                                                        commit?.stats?.total ||
                                                        files.reduce((sum: number, file: any) => sum + Number(file?.changes || 0), 0)
                                                    );
                                                    const commitMessage = commit?.message || commit?.commit?.message || "No commit message";
                                                    const authorName = commit?.author?.login || commit?.author?.name || commit?.commit?.author?.name || "Unknown";
                                                    const authorAvatar = commit?.author?.avatar_url;
                                                    const commitDateRaw = commit?.author?.date || commit?.commit?.author?.date || commit?.commit?.committer?.date;
                                                    const commitDate = commitDateRaw ? dayjs(commitDateRaw).format("DD/MM/YYYY HH:mm:ss") : "Unknown date";
                                                    const sha = String(commit?.sha || "");
                                                    const shortSha = sha ? sha.slice(0, 7) : "-";
                                                    const commitUrl = typeof commit?.html_url === "string" && commit.html_url
                                                        ? commit.html_url
                                                        : (typeof commit?.url === "string" && commit.url.includes("api.github.com/repos")
                                                            ? commit.url.replace("api.github.com/repos", "github.com").replace("/commits/", "/commit/")
                                                            : "");

                                                    return (
                                                        <div
                                                            key={`${sha || "commit"}-${commitIndex}`}
                                                            className="rounded-lg border border-[#d9e2f2] bg-white overflow-hidden"
                                                        >
                                                            <div className="p-4">
                                                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar
                                                                            size="small"
                                                                            src={authorAvatar || undefined}
                                                                            style={authorAvatar ? undefined : { backgroundColor: "#1677ff" }}
                                                                        >
                                                                            {String(authorName).charAt(0).toUpperCase()}
                                                                        </Avatar>
                                                                        <span className="font-semibold text-[#1f2937]">{authorName}</span>
                                                                        <span className="text-xs text-gray-500">{commitDate}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-gray-400">SHA: {shortSha}</span>
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            onClick={() => setCommitChangeDrawerOpen(true)}
                                                                            className="p-0 h-auto text-blue-600 text-[12px]"
                                                                        >
                                                                            Change GitHub commits
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 text-[16px] font-semibold text-[#111827]">{commitMessage}</div>

                                                                <div className="mt-3 flex items-center gap-4 text-sm flex-wrap">
                                                                    <span className="text-green-600 font-semibold">+{additions} additions</span>
                                                                    <span className="text-red-600 font-semibold">-{deletions} deletions</span>
                                                                    <span className="text-gray-600">{changes} changes</span>
                                                                </div>

                                                                <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                                                                    <div className="text-sm text-[#4b5563]">
                                                                        {files.length} file(s) changed
                                                                    </div>
                                                                    {commitUrl ? (
                                                                        <Button
                                                                            type="link"
                                                                            icon={<GithubOutlined />}
                                                                            onClick={() => window.open(commitUrl, "_blank")}
                                                                            className="p-0 h-auto"
                                                                        >
                                                                            View on GitHub
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="border-t border-[#e5eaf3] bg-[#f8fafc] p-4">
                                                                <div className="text-sm font-semibold text-[#111827] mb-3">Changed Files:</div>
                                                                {files.length === 0 ? (
                                                                    <div className="text-sm text-gray-500">No file-level details in this commit.</div>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {files.map((file: any, fileIndex: number) => {
                                                                            const fileKey = `${sha || commitIndex}-${file?.filename || fileIndex}-${fileIndex}`;
                                                                            const isExpanded = expandedCommittedFileKeys.has(fileKey);
                                                                            const fileStatus = String(file?.status || "modified");
                                                                            const statusColor = fileStatus === "added"
                                                                                ? "green"
                                                                                : fileStatus === "removed"
                                                                                    ? "red"
                                                                                    : "blue";

                                                                            return (
                                                                                <div key={fileKey} className="rounded border border-[#e4e8f0] bg-white">
                                                                                    <div
                                                                                        className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-[#f8fbff]"
                                                                                        onClick={() => {
                                                                                            setExpandedCommittedFileKeys((prev) => {
                                                                                                const next = new Set(prev);
                                                                                                if (next.has(fileKey)) {
                                                                                                    next.delete(fileKey);
                                                                                                } else {
                                                                                                    next.add(fileKey);
                                                                                                }
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            {isExpanded ? <DownOutlined className="text-xs text-gray-400" /> : <RightOutlined className="text-xs text-gray-400" />}
                                                                                            <FileOutlined className="text-[#1677ff]" />
                                                                                            <span className="text-[#1677ff] truncate">{file?.filename || "Unknown file"}</span>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
                                                                                            <Tag color={statusColor} style={{ marginInlineEnd: 0 }}>{fileStatus}</Tag>
                                                                                            <span className="text-green-600"><PlusOutlined /> {Number(file?.additions || 0)}</span>
                                                                                            <span className="text-red-600"><MinusOutlined /> {Number(file?.deletions || 0)}</span>
                                                                                            <span className="text-gray-600">{Number(file?.changes || 0)} changes</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {isExpanded && file?.patch ? (
                                                                                        <div className="border-t border-[#eef2f7] p-3 bg-[#fbfdff]">
                                                                                            {renderGithubLikePatch(String(file.patch))}
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: "relations",
                                label: `Issue Relations (${issueRelationsCount})`,
                                children: (
                                    <div
                                        style={{
                                            ...drawerPanelStyle,
                                            padding: 16,
                                            border: "none",
                                            boxShadow: "none",
                                            background: "transparent",
                                        }}
                                    >
                                        <div className="space-y-4">
                                            <div style={relationSectionCardStyle}>
                                                <div style={relationSectionHeadingStyle}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                                                            <LinkOutlined />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">Parent Issues</div>
                                                            <div className="text-xs text-slate-500">
                                                                Source issue connected to this work item
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span style={relationSectionCountStyle}>{parentChain.length}</span>
                                                </div>
                                                {loadingParentChain ? (
                                                    <div className="text-center py-4">
                                                        <Spin size="small" />
                                                    </div>
                                                ) : parentChain.length > 0 ? (
                                                    <div
                                                        style={{
                                                            display: "grid",
                                                            gap: 12,
                                                            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                                        }}
                                                    >
                                                        {parentChain.map((parentIssue, index) => (
                                                            <ParentIssueCard
                                                                key={parentIssue.id || parentIssue.no || index}
                                                                issue={parentIssue}
                                                                users={users}
                                                                onClick={() => openParentIssueDrawer(parentIssue)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={relationEmptyStateStyle}>No parent issue linked yet</div>
                                                )}
                                            </div>

                                            <div style={relationSectionCardStyle}>
                                                <div style={relationSectionHeadingStyle}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eefbf3] text-[#15803d]">
                                                            <FolderOpenOutlined />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">Child Issues</div>
                                                            <div className="text-xs text-slate-500">
                                                                Follow-up items created from this issue
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span style={relationSectionCountStyle}>{childIssues.length}</span>
                                                </div>
                                                {loadingChildIssues ? (
                                                    <div className="text-center py-4">
                                                        <Spin size="small" />
                                                    </div>
                                                ) : childIssues.length > 0 ? (
                                                    <div
                                                        style={{
                                                            display: "grid",
                                                            gap: 12,
                                                            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                                        }}
                                                    >
                                                        {childIssues.map((childIssue, index) => (
                                                            <ChildIssueCard
                                                                key={childIssue.id || childIssue.no || index}
                                                                issue={childIssue}
                                                                users={users}
                                                                onClick={() => openChildIssueDrawer(childIssue)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={relationEmptyStateStyle}>No child issues linked yet</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "comment",
                                label: `Comments (${commentsCount})`,
                                children: (
                                    <div style={{ ...drawerPanelStyle, padding: 16 }}>
                                        <IssueComments
                                            issue={issue}
                                            currentProject={currentProject}
                                            onUpdate={onUpdate}
                                        />
                                    </div>
                                )
                            },
                            {
                                key: "history",
                                label: `History (${historyCount})`,
                                children: (
                                    <div className="space-y-4" style={{ ...drawerPanelStyle, padding: 16 }}>
                                        <div className="text-sm font-semibold mb-2">Issue History</div>
                                        {loadingHistory ? (
                                            <div className="text-center py-8">
                                                <Spin />
                                            </div>
                                        ) : issueHistory.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                No history available for this issue
                                            </div>
                                        ) : (
                                            <Timeline>
                                                {issueHistory.map((item: any, index: number) => {
                                                    const STATUS_VALUES = new Set(["draft", "waiting", "new", "ongoing", "closed", "canceled"]);
                                                    const isStatusValue = (v: any) =>
                                                        typeof v === 'string' && STATUS_VALUES.has(v.toLowerCase().trim());

                                                    const resolveUserByUid = (uidOrName: any) => {
                                                        if (!uidOrName || !users) return null;
                                                        const s = String(uidOrName).toLowerCase().trim();
                                                        return users.find((u: any) =>
                                                            u?.uid?.toLowerCase().trim() === s ||
                                                            u?.displayName?.toLowerCase().trim() === s ||
                                                            u?.email?.toLowerCase().trim() === s
                                                        ) || null;
                                                    };

                                                    const renderHistoryValue = (val: any) => {
                                                        if (!val) return null;
                                                        const user = resolveUserByUid(val);
                                                        if (user) {
                                                            return (
                                                                <UserProfileTooltip user={user}>
                                                                    <span className="inline-flex items-center gap-2 cursor-pointer">
                                                                        <Avatar size={18} src={user.photoURL}>
                                                                            {!user.photoURL && (user.displayName?.charAt(0).toUpperCase() || 'U')}
                                                                        </Avatar>
                                                                        <span className="font-medium">{user.displayName}</span>
                                                                        {user.email && <span className="text-gray-500">({user.email})</span>}
                                                                    </span>
                                                                </UserProfileTooltip>
                                                            );
                                                        }
                                                        if (isStatusValue(val)) {
                                                            const s = String(val).toLowerCase().trim();
                                                            return (
                                                                <Tag className={`uppercase px-2.5 text-[10px] font-semibold ${checkColor(s)}`}>
                                                                    {s}
                                                                </Tag>
                                                            );
                                                        }
                                                        return <span className="font-medium">{String(val)}</span>;
                                                    };

                                                    const historyUser: any = users?.find((u: any) =>
                                                        u.displayName?.toLowerCase().trim() === item.user?.toLowerCase().trim() ||
                                                        u.uid?.toLowerCase().trim() === item.user?.toLowerCase().trim()
                                                    );
                                                    const getInitials = (name: string) => {
                                                        if (!name) return 'U';
                                                        const parts = name.split(' ');
                                                        if (parts.length >= 2) {
                                                            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                                                        }
                                                        return name.substring(0, 2).toUpperCase();
                                                    };
                                                    return (
                                                        <Timeline.Item key={index}>
                                                            <div className="flex gap-3">
                                                                <UserProfileTooltip user={historyUser || { displayName: item.user, email: '' }}>
                                                                    <Avatar
                                                                        size="small"
                                                                        src={historyUser?.photoURL}
                                                                        style={{ backgroundColor: '#1890ff' }}
                                                                    >
                                                                        {!historyUser?.photoURL && getInitials(item.user || '')}
                                                                    </Avatar>
                                                                </UserProfileTooltip>
                                                                <div className="flex-1">
                                                                    <div className="text-sm">
                                                                        <span className="font-medium">{historyUser?.displayName || item.user || 'Unknown'}</span>
                                                                        <span className="ml-2">{item.action || "Change"}</span>
                                                                    </div>
                                                                    {item.details && item.action !== "changed the Description" && (
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            {item.action === "closed and sent" && typeof item.details === "object" && item.details.sentTo ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span>Sent to:</span>
                                                                                    {(() => {
                                                                                        const sentToUser = users?.find((u: any) =>
                                                                                            u.displayName?.toLowerCase().trim() === item.details.sentTo?.toLowerCase().trim() ||
                                                                                            u.email?.toLowerCase().trim() === item.details.sentToEmail?.toLowerCase().trim()
                                                                                        );
                                                                                        if (sentToUser) {
                                                                                            return (
                                                                                                <UserProfileTooltip user={sentToUser}>
                                                                                                    <span className="inline-flex items-center gap-2 cursor-pointer">
                                                                                                        <Avatar size={18} src={sentToUser.photoURL}>
                                                                                                            {!sentToUser.photoURL && (sentToUser.displayName?.charAt(0).toUpperCase() || 'U')}
                                                                                                        </Avatar>
                                                                                                        <span className="font-medium">{sentToUser.displayName}</span>
                                                                                                        {sentToUser.email && <span className="text-gray-500">({sentToUser.email})</span>}
                                                                                                    </span>
                                                                                                </UserProfileTooltip>
                                                                                            );
                                                                                        }
                                                                                        return <span className="font-medium">{item.details.sentTo}</span>;
                                                                                    })()}
                                                                                    {item.details.comment && (
                                                                                        <span className="ml-2 text-gray-500">- {item.details.comment}</span>
                                                                                    )}
                                                                                </div>
                                                                            ) : item.action === "forwarded the Issue" && typeof item.details === "object" && item.details.forwardedTo ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span>Forwarded to:</span>
                                                                                    {(() => {
                                                                                        const forwardedToUser = users?.find((u: any) =>
                                                                                            u.displayName?.toLowerCase().trim() === item.details.forwardedTo?.toLowerCase().trim() ||
                                                                                            u.email?.toLowerCase().trim() === item.details.forwardedToEmail?.toLowerCase().trim() ||
                                                                                            u.uid?.toLowerCase().trim() === item.details.forwardedToUid?.toLowerCase().trim()
                                                                                        );
                                                                                        if (forwardedToUser) {
                                                                                            return (
                                                                                                <UserProfileTooltip user={forwardedToUser}>
                                                                                                    <span className="inline-flex items-center gap-2 cursor-pointer">
                                                                                                        <Avatar size={18} src={forwardedToUser.photoURL}>
                                                                                                            {!forwardedToUser.photoURL && (forwardedToUser.displayName?.charAt(0).toUpperCase() || 'U')}
                                                                                                        </Avatar>
                                                                                                        <span className="font-medium">{forwardedToUser.displayName}</span>
                                                                                                        {forwardedToUser.email && <span className="text-gray-500">({forwardedToUser.email})</span>}
                                                                                                    </span>
                                                                                                </UserProfileTooltip>
                                                                                            );
                                                                                        }
                                                                                        return <span className="font-medium">{item.details.forwardedTo}</span>;
                                                                                    })()}
                                                                                </div>
                                                                            ) : item.action?.toLowerCase()?.includes("attachment") && typeof item.details === "object" ? (
                                                                                <div className="space-y-1">
                                                                                    {item.details.summary && <div>{String(item.details.summary)}</div>}
                                                                                    {Array.isArray(item.details.added) && item.details.added.length > 0 && (
                                                                                        <div>
                                                                                            <span className="font-medium">Added:</span>{" "}
                                                                                            {item.details.added.map((file: any, idx: number) => (
                                                                                                <span key={`added-${idx}`} className="mr-2 inline-flex items-center gap-1">
                                                                                                    {file?.url ? (
                                                                                                        <>
                                                                                                            <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{file?.name || 'attachment'}</a>
                                                                                                            <a href={file.url} download className="text-blue-500 hover:underline">download</a>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <span>{file?.name || 'attachment'}</span>
                                                                                                    )}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    {Array.isArray(item.details.removed) && item.details.removed.length > 0 && (
                                                                                        <div>
                                                                                            <span className="font-medium">Removed:</span>{" "}
                                                                                            {item.details.removed.map((file: any, idx: number) => (
                                                                                                <span key={`removed-${idx}`} className="mr-2 inline-flex items-center gap-1">
                                                                                                    {file?.url ? (
                                                                                                        <>
                                                                                                            <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{file?.name || 'attachment'}</a>
                                                                                                            <a href={file.url} download className="text-blue-500 hover:underline">download</a>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <span>{file?.name || 'attachment'}</span>
                                                                                                    )}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : item.action === "created from closed issue" && typeof item.details === "object" && item.details.receivedFrom ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span>Received from:</span>
                                                                                    <span className="font-medium">{item.details.receivedFrom}</span>
                                                                                    {item.details.parentIssueNo && (
                                                                                        <span className="text-gray-500">(Parent: #{item.details.parentIssueNo})</span>
                                                                                    )}
                                                                                    {item.details.comment && (
                                                                                        <span className="ml-2 text-gray-500">- {item.details.comment}</span>
                                                                                    )}
                                                                                </div>
                                                                            ) : typeof item.details === "object" ? JSON.stringify(item.details) : String(item.details)}
                                                                        </div>
                                                                    )}
                                                                    {item.oldValue && item.newValue && (
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            {item.action === "changed the Description" ? (
                                                                                <>
                                                                                    <Tooltip title={String(item.oldValue)}>
                                                                                        <span className="line-through">
                                                                                            {String(item.oldValue).length > 100 ? String(item.oldValue).substring(0, 100) + '...' : String(item.oldValue)}
                                                                                        </span>
                                                                                    </Tooltip>
                                                                                    <span className="mx-2">→</span>
                                                                                    <Tooltip title={String(item.newValue)}>
                                                                                        <span className="font-medium">
                                                                                            {String(item.newValue).length > 100 ? String(item.newValue).substring(0, 100) + '...' : String(item.newValue)}
                                                                                        </span>
                                                                                    </Tooltip>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="line-through">{renderHistoryValue(item.oldValue)}</span>
                                                                                    <span className="mx-2">→</span>
                                                                                    {renderHistoryValue(item.newValue)}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {item.timestamp ? dayjs(item.timestamp).format("MMMM DD, YYYY [at] h:mm A") : "N/A"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Timeline.Item>
                                                    );
                                                })}
                                            </Timeline>
                                        )}
                                    </div>
                                )
                            }
                        ]} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={sideCardStyle}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <div style={metaLabelStyle}>Assignee</div>
                                    {assigneeUser ? (
                                        <UserProfileTooltip user={assigneeUser} navigateOnClick={false}>
                                            <div className="flex items-center gap-2 cursor-pointer">
                                                <Avatar
                                                    size={34}
                                                    src={assigneeUser.photoURL}
                                                    style={{ backgroundColor: '#722ed1' }}
                                                >
                                                    {!assigneeUser.photoURL && assigneeUser.displayName?.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <span style={{ fontWeight: 500, color: "#0f172a" }}>{assigneeUser.displayName}</span>
                                            </div>
                                        </UserProfileTooltip>
                                    ) : (
                                        <span className="text-gray-400">Unassigned</span>
                                    )}
                                </div>

                                <div>
                                    <div style={metaLabelStyle}>Created By</div>
                                    {createdByUser ? (
                                        <UserProfileTooltip user={createdByUser} navigateOnClick={false}>
                                            <div className="flex items-center gap-2 cursor-pointer">
                                                <Avatar
                                                    size={34}
                                                    src={createdByUser.photoURL}
                                                    style={{ backgroundColor: '#52c41a' }}
                                                >
                                                    {!createdByUser.photoURL && createdByUser.displayName?.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <span style={{ fontWeight: 500, color: "#0f172a" }}>{createdByUser.displayName}</span>
                                            </div>
                                        </UserProfileTooltip>
                                    ) : (
                                        <span>{issue.createdBy || "N/A"}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={sideCardStyle}>
                            <div style={metaLabelStyle}>Status</div>
                            <Dropdown menu={menu} trigger={["click"]}>
                                <Tag style={{ ...getStatusBadgeStyle(issue.status), cursor: "pointer", width: "100%", margin: 0, padding: "9px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", textTransform: "uppercase" }}>
                                    <div className="flex items-center gap-1">
                                        {currentStatus?.icon}
                                        {issue.status}
                                    </div>
                                    <ArrowDownOutlined className="dropdown-arrow" />
                                </Tag>
                            </Dropdown>

                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                                    <FlagOutlined style={{ color: "#1677ff" }} />
                                    <span>Prioritet</span>
                                </div>
                                <Radio.Group
                                    value={issue.priority || "Normal"}
                                    onChange={(e) => handleChangePriority(e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                    disabled={changingPriority}
                                    style={{ width: "100%", display: "flex", borderRadius: 10, overflow: "hidden" }}
                                >
                                    {prioritySelectorOptions.map((option, index) => (
                                        <Radio.Button
                                            key={option.value}
                                            value={option.value}
                                            title={option.value === "Urgent" ? "Immediate attention" : option.value === "High" ? "Important" : "Planned work"}
                                            style={getPrioritySelectorButtonStyle(option, issue.priority || "Normal", index, prioritySelectorOptions.length)}
                                        >
                                            {option.label}
                                        </Radio.Button>
                                    ))}
                                </Radio.Group>
                            </div>
                        </div>

                        <div style={sideCardStyle}>
                            <div style={metaLabelStyle}>Actions</div>
                            <Dropdown
                                menu={{
                                    items: actionMenuItems,
                                }}
                                trigger={["click"]}
                            >
                                <Button block style={{ ...actionButtonStyle, justifyContent: "space-between" }}>
                                    <span>Select Action</span>
                                    <ArrowDownOutlined />
                                </Button>
                            </Dropdown>
                        </div>

                        <div style={sideCardStyle}>
                            <div className="flex flex-col gap-4 mb-1">
                                <div className="!flex !items-center gap-1">
                                    <div style={{ ...metricStripStyle, background: "#ff4d4f" }}>
                                        <span>Estimation Hours</span>
                                    </div>
                                    <div>
                                        <InputNumber
                                            min={0}
                                            value={issue.eh}
                                            onChange={async (v) => {
                                                try {
                                                    await services.updateShEh(currentProject.id, issue.id, issue.sh, v);
                                                    onUpdate();
                                                } catch (error) {
                                                    message.error("Failed to update EH");
                                                }
                                            }}
                                            step={0.25}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div style={{ ...metricStripStyle, background: "#22c55e" }}>
                                        <span>Spent Hours</span>
                                    </div>
                                    <div>
                                        <InputNumber
                                            min={0}
                                            value={issue.sh}
                                            onChange={async (v) => {
                                                try {
                                                    await services.updateShEh(currentProject.id, issue.id, v, issue.eh);
                                                    onUpdate();
                                                } catch (error) {
                                                    message.error("Failed to update SH");
                                                }
                                            }}
                                            step={0.25}
                                        />
                                    </div>
                                </div>
                                {issue.codeLine !== undefined && issue.codeLine !== null && (
                                    <div className="flex items-center gap-1">
                                        <div style={{ ...metricStripStyle, background: "#1677ff" }}>
                                            <span>Code Line</span>
                                        </div>
                                        <div>
                                            <InputNumber min={0} value={issue.codeLine} disabled />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mb-0">
                                    <div style={miniStatStyle}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-blue-600 font-bold text-xs">#</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Issue</div>
                                                <div className="text-xs font-bold text-gray-800 truncate leading-tight">{issue.no}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={miniStatStyle}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="w-6 h-6 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <TagOutlined className="text-purple-600 text-xs" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Type</div>
                                                <div className="text-xs font-semibold text-gray-800 truncate leading-tight">{issue.type}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={miniStatStyle}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${issue.priority === 'Urgent' ? 'bg-red-100' :
                                                    issue.priority === 'High' ? 'bg-orange-100' :
                                                        'bg-blue-100'
                                                }`}>
                                                <FlagOutlined className={`text-xs ${issue.priority === 'Urgent' ? 'text-red-600' :
                                                        issue.priority === 'High' ? 'text-orange-600' :
                                                            'text-blue-600'
                                                    }`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Priority</div>
                                                <div className={`text-xs font-semibold truncate leading-tight ${issue.priority === 'Urgent' ? 'text-red-600' :
                                                        issue.priority === 'High' ? 'text-orange-600' :
                                                            'text-blue-600'
                                                    }`}>
                                                    {issue.priority || 'Normal'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ ...miniStatStyle, background: "#f8fafc" }}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-gray-500 font-bold text-xs">S</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Sprint</div>
                                                <div className="text-xs font-semibold text-gray-600 truncate leading-tight">None</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={miniStatStyle}>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="w-6 h-6 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <CalendarOutlined className="text-green-600 text-xs" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Created</div>
                                                <div className="text-xs font-semibold text-gray-800 truncate leading-tight">
                                                    {issue.createdAt ? dayjs(issue.createdAt).format("MMM DD") : "N/A"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {issue.closedDate && (
                                        <div style={miniStatStyle}>
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="w-6 h-6 bg-gradient-to-br from-red-100 to-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <CheckCircleOutlined className="text-red-600 text-xs" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide truncate">Closed</div>
                                                    <div className="text-xs font-semibold text-gray-800 truncate leading-tight">
                                                        {dayjs(issue.closedDate).format("MMM DD")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Child Issues Section */}
                        <div style={sideCardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
                                <FolderOpenOutlined style={{ color: "#1677ff" }} />
                                <span>Child Issues ({childIssues.length})</span>
                            </div>
                            {loadingChildIssues ? (
                                <div className="text-center py-4">
                                    <Spin size="small" />
                                </div>
                            ) : childIssues.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {childIssues.map((childIssue, index) => (
                                        <div
                                            key={childIssue.id || index}
                                            onClick={() => openChildIssueDrawer(childIssue)}
                                            className="p-3 bg-gray-50 rounded border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-sm font-bold text-gray-800">#{childIssue.no}</span>
                                                <Tag className={`text-[10px] ${
                                                    childIssue.status === "draft" ? "bg-[#C8C8C8] text-black"
                                                        : childIssue.status === "new" ? "bg-[#FFA500] text-black"
                                                            : childIssue.status === "closed" ? "bg-blue-500 text-white"
                                                                : childIssue.status === "canceled" ? "bg-red-500 text-white"
                                                                    : childIssue.status === "ongoing" ? "bg-[#008000] text-white"
                                                                        : "bg-[#9ACD32] text-black"
                                                }`}>
                                                    {childIssue.status}
                                                </Tag>
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-1">
                                                {childIssue.description || "No description"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-3 text-gray-500 text-sm">
                                    No child issues
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <ShareIssueModal
                    open={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    issueId={issue.id}
                    issueNo={issue.no}
                />
                <APICanvasDetailsDrawer
                    open={localApiFlag}
                    onClose={() => {
                        if (setApiFlag) {
                            setApiFlag(false);
                        } else {
                            setLocalApiFlag(false);
                        }
                    }}
                    data={localApiCanvas}
                />
                <UICanvasPreviewDrawer
                    open={localUiFlag}
                    onClose={() => {
                        if (setUiFlag) {
                            setUiFlag(false);
                        } else {
                            setLocalUiFlag(false);
                        }
                    }}
                    data={{ id: localActiveCanvas, name: relatedUiCanvasName }}
                />

                {/* Parent Issue Drawer */}
                {selectedParentIssue && (
                    <IssueDetailDrawer
                        open={parentIssueDrawerOpen}
                        onClose={() => {
                            setParentIssueDrawerOpen(false);
                            setSelectedParentIssue(null);
                        }}
                        issue={selectedParentIssue}
                        currentProject={currentProject}
                        onUpdate={onUpdate}
                        setApiFlag={setApiFlag}
                        setApiCanvas={setApiCanvas}
                        setUiFlag={setUiFlag}
                        setActiveCanvas={setActiveCanvas}
                        currentRepo={currentRepo}
                        setCrdDrawerOpen={setCrdDrawerOpen}
                        setCrdDrawerNodeId={setCrdDrawerNodeId}
                        setCrdDrawerRepoId={setCrdDrawerRepoId}
                        handleDeleteCrdComponent={handleDeleteCrdComponent}
                        setType={setType}
                        setSprint={setSprint}
                        setCsflag={setCsflag}
                        setForward={setForward}
                        setApi={setApi}
                        setRelatedUi={setRelatedUi}
                        setCalculateCodeLine={setCalculateCodeLine}
                        setPriority={setPriority}
                    />
                )}

                {/* Child Issue Drawer */}
                {selectedChildIssue && (
                    <IssueDetailDrawer
                        open={childIssueDrawerOpen}
                        onClose={() => {
                            setChildIssueDrawerOpen(false);
                            setSelectedChildIssue(null);
                        }}
                        issue={selectedChildIssue}
                        currentProject={currentProject}
                        onUpdate={onUpdate}
                        setApiFlag={setApiFlag}
                        setApiCanvas={setApiCanvas}
                        setUiFlag={setUiFlag}
                        setActiveCanvas={setActiveCanvas}
                        currentRepo={currentRepo}
                        setCrdDrawerOpen={setCrdDrawerOpen}
                        setCrdDrawerNodeId={setCrdDrawerNodeId}
                        setCrdDrawerRepoId={setCrdDrawerRepoId}
                        handleDeleteCrdComponent={handleDeleteCrdComponent}
                        setType={setType}
                        setSprint={setSprint}
                        setCsflag={setCsflag}
                        setForward={setForward}
                        setApi={setApi}
                        setRelatedUi={setRelatedUi}
                        setCalculateCodeLine={setCalculateCodeLine}
                        setPriority={setPriority}
                    />
                )}

                

                {/* Priority Change Modal */}
                <ChangePriorityModal
                    open={priorityModalOpen}
                    onClose={() => setPriorityModalOpen(false)}
                    currentPriority={issue?.priority || 'Normal'}
                    onConfirm={handleChangePriority}
                    loading={changingPriority}
                />

                {/* Change GitHub Commits Drawer */}
                <GithubCommitsDrawer
                    open={commitChangeDrawerOpen}
                    onClose={() => setCommitChangeDrawerOpen(false)}
                    currentProject={currentProject}
                    onIssuesUpdate={() => onUpdate()}
                    hideUICanvasAndAssignee={true}
                    linkToTaskIds={issue?.id ? [issue.id] : []}
                    closeOnCommitLinked={true}
                    onCommitLinked={(commit) => {
                        setLocalLinkedCommit(commit);
                        setExpandedCommittedFileKeys(new Set());
                        onUpdate();
                    }}
                />

                <Drawer
                    title="Update Issue Type"
                    zIndex={ISSUE_DETAIL_TYPE_DRAWER_Z_INDEX}
                    open={localTypeDrawerOpen}
                    onClose={() => setLocalTypeDrawerOpen(false)}
                    footer={
                        <div className="flex items-center gap-2">
                            <Button type="primary" onClick={handleLocalTypeUpdate} disabled={localTypeLoading}>
                                {localTypeLoading ? <LoaderCircle className="animate-spin" /> : <><SaveOutlined /> Update</>}
                            </Button>
                            <Button onClick={() => setLocalTypeDrawerOpen(false)}>Cancel</Button>
                        </div>
                    }
                >
                    <Form layout="vertical" initialValues={{ type: localTypeValue }}>
                        <Form.Item name="type">
                            <Select value={localTypeValue} onChange={setLocalTypeValue} className="w-full" placeholder="Select Type">
                                <Select.Option value="New Request">New Request</Select.Option>
                                <Select.Option value="Bug">Bug</Select.Option>
                                <Select.Option value="Change Request">Change Request</Select.Option>
                                <Select.Option value="Backlog">Backlog</Select.Option>
                            </Select>
                        </Form.Item>
                    </Form>
                </Drawer>

                <Drawer
                    title="Related UI Canvas"
                    zIndex={ISSUE_DETAIL_ACTION_DRAWER_Z_INDEX}
                    open={localRelatedUiDrawerOpen}
                    onClose={() => {
                        setLocalRelatedUiDrawerOpen(false);
                        setLocalRelatedUiCanvasId("");
                    }}
                    footer={
                        <div className="flex items-center gap-2">
                            <Button type="primary" onClick={handleLocalRelatedUiUpdate} disabled={localRelatedUiLoading}>
                                {localRelatedUiLoading ? <LoaderCircle className="animate-spin" /> : <><SaveOutlined /> Update</>}
                            </Button>
                            <Button onClick={() => {
                                setLocalRelatedUiDrawerOpen(false);
                                setLocalRelatedUiCanvasId("");
                            }}>
                                Cancel
                            </Button>
                        </div>
                    }
                >
                    <Form layout="vertical" initialValues={{ count: 1 }}>
                        <Form.Item label="Total Issue Count" name="count">
                            <Input readOnly value={1} />
                        </Form.Item>
                        <Form.Item label="Select UI Canvas" required>
                            <Select
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => (option?.children ?? "").toString().toLowerCase().includes(input.toLowerCase())}
                                filterSort={(optionA, optionB) => (optionA?.children ?? "").toString().toLowerCase().localeCompare((optionB?.children ?? "").toString().toLowerCase())}
                                value={localRelatedUiCanvasId || undefined}
                                onChange={setLocalRelatedUiCanvasId}
                                placeholder="Select UI Canvas"
                                suffixIcon={<AppstoreOutlined />}
                            >
                                {canvasses?.map((item: any, index: number) => (
                                    <Select.Option key={item?.id || index} value={item?.id}>
                                        {item?.label || item?.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Drawer>

                <Drawer
                    title="Close and Send Issue"
                    zIndex={ISSUE_DETAIL_ACTION_DRAWER_Z_INDEX}
                    open={localCloseSendDrawerOpen}
                    onClose={() => {
                        setLocalCloseSendDrawerOpen(false);
                        localCloseSendForm.resetFields();
                    }}
                    footer={
                        <div className="flex items-center gap-2">
                            <Button type="primary" onClick={handleLocalCloseAndSend} disabled={localCloseSendLoading}>
                                {localCloseSendLoading ? <LoaderCircle className="animate-spin" /> : <><SaveOutlined /> Forward</>}
                            </Button>
                            <Button onClick={() => {
                                setLocalCloseSendDrawerOpen(false);
                                localCloseSendForm.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </div>
                    }
                >
                    <Form form={localCloseSendForm} layout="vertical" initialValues={{ assignee: "", type: "New Request", comment: "" }}>
                        <Form.Item rules={[{ required: true, message: "Assign is required!" }]} name="assignee" label="Assignee">
                            <Select optionLabelProp="label" showSearch className="w-full" placeholder="Select User">
                                {users?.map((u: any, i: number) => u?.displayName && (
                                    <Select.Option label={u?.displayName} key={i} value={u.displayName}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">
                                                {u?.photoURL ? <img className="w-full h-full object-cover" src={u?.photoURL} /> : u.displayName[0]}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span>{u.displayName}</span>
                                                <span className="italic">{u.email}</span>
                                            </div>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="type" label="Type" rules={[{ required: true, message: "Type is required!" }]}>
                            <Select className="w-full" placeholder="Select Type">
                                <Select.Option value="Bug">Bug</Select.Option>
                                <Select.Option value="New Request">New Request</Select.Option>
                                <Select.Option value="Change Request">Change Request</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="comment" label="Comment">
                            <TextArea rows={10} />
                        </Form.Item>
                    </Form>
                </Drawer>

                <Drawer
                    title="Forward Issue"
                    zIndex={ISSUE_DETAIL_FORWARD_DRAWER_Z_INDEX}
                    open={localForwardDrawerOpen}
                    onClose={() => {
                        setLocalForwardDrawerOpen(false);
                        localForwardForm.resetFields();
                    }}
                    footer={
                        <div className="flex items-center gap-2">
                            <Button type="primary" onClick={handleLocalForwardIssue} disabled={localForwardLoading}>
                                {localForwardLoading ? <LoaderCircle className="animate-spin" /> : <><ShareAltOutlined /> Forward</>}
                            </Button>
                            <Button onClick={() => {
                                setLocalForwardDrawerOpen(false);
                                localForwardForm.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </div>
                    }
                >
                    <Form form={localForwardForm} layout="vertical">
                        <Form.Item name="forward" rules={[{ required: true, message: "Please select a user" }]} label="Forward To">
                            <Select 
                                optionLabelProp="label" 
                                showSearch 
                                className="w-full" 
                                placeholder="Select User"
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                    String(option?.label ?? "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                            >
                                {users?.map((u: any, i: number) =>
                                    u?.displayName && (
                                        <Select.Option label={u?.displayName} key={i} value={u.uid}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden">
                                                    {u?.photoURL ? <img className="w-full h-full object-cover" src={u?.photoURL} /> : u.displayName[0]}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span>{u.displayName}</span>
                                                    <span className="italic">{u.email}</span>
                                                </div>
                                            </div>
                                        </Select.Option>
                                    )
                                )}
                            </Select>
                        </Form.Item>
                    </Form>
                </Drawer>
            </Drawer>
        </>
    );
};

export default IssueDetailDrawer;
