import React, { useEffect, useState } from 'react';
import { Drawer, Spin, Avatar, message, Select, Button, Space, Tag, Typography } from 'antd';
import { 
    GithubOutlined, 
    FileOutlined, 
    PlusOutlined, 
    MinusOutlined,
    DownOutlined,
    RightOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

interface CodeLineCommitHistoryDrawerProps {
    open: boolean;
    issue: any | null;
    onClose: () => void;
    currentTaskCommits?: any[] | null;
}

const CodeLineCommitHistoryDrawer: React.FC<CodeLineCommitHistoryDrawerProps> = ({
    open,
    issue,
    onClose,
    currentTaskCommits
}) => {    
    const [commits, setCommits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    const normalizeGitHubUrl = (url?: string): string => {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('api.github.com/repos/')) {
            return url
                .replace('https://api.github.com/repos/', 'https://github.com/')
                .replace('/commits/', '/commit/');
        }
        return url;
    };

    const getCommitDate = (commit: any): Date | null => {
        const iso =
            commit?.author?.date ||
            commit?.committer?.date ||
            commit?.commit?.author?.date ||
            commit?.commit?.committer?.date;
        if (!iso) return null;
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return 'Unknown date';
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');
    };

    const getCommitMessage = (commit: any): string => {
        return commit?.message || commit?.commit?.message || '';
    };

    const getAuthorName = (commit: any): string => {
        return (
            commit?.author?.name ||
            commit?.author?.login ||
            commit?.commit?.author?.name ||
            commit?.commit?.committer?.name ||
            'Unknown'
        );
    };

    const getAuthorAvatar = (commit: any): string | null => {
        return commit?.author?.avatar_url || null;
    };

    // Initialize commits from props
    useEffect(() => {
        if (!open || !issue) {
            return;
        }

        setLoading(true);

        try {
            // First check if we have currentTaskCommits from props
            if (currentTaskCommits && currentTaskCommits.length > 0) {
                setCommits(currentTaskCommits);
                if (currentTaskCommits.length > 0) {
                    setSelectedCommit(currentTaskCommits[0]);
                }
                setLoading(false);
                return;
            }

            // Then check if we have githubData directly in the issue
            if (issue?.githubData) {
                // Use the githubData as the commit history
                const githubData = issue.githubData;
                
                // If githubData is an array, use it directly
                if (Array.isArray(githubData)) {
                    setCommits(githubData);
                    if (githubData.length > 0) {
                        setSelectedCommit(githubData[0]);
                    }
                } else {
                    // Single commit
                    setCommits([githubData]);
                    setSelectedCommit(githubData);
                }
                setLoading(false);
                return;
            }

            // Check if we have commit data directly in the issue
            if (issue?.commitSha && issue?.commitMessage) {
                // Create a commit object from issue data
                const commitFromIssue = {
                    sha: issue.commitSha,
                    message: issue.commitMessage,
                    author: {
                        name: issue.commitAuthor,
                        date: issue.commitDate
                    },
                    url: issue.commitUrl,
                    stats: {
                        additions: issue.codeLine || 0,
                        deletions: 0,
                        total: issue.codeLine || 0
                    }
                };
                setCommits([commitFromIssue]);
                setSelectedCommit(commitFromIssue);
                setLoading(false);
                return;
            }

            setCommits([]);
            setSelectedCommit(null);
        } catch (error) {
            console.error("Error processing commit data:", error);
            setCommits([]);
            setSelectedCommit(null);
        } finally {
            setLoading(false);
        }
    }, [open, issue, currentTaskCommits]);

    // Reset selected commit when drawer closes
    useEffect(() => {
        if (!open) {
            setSelectedCommit(null);
            setCommits([]);
            setExpandedFiles(new Set());
        }
    }, [open]);

    const handleOpenInGithub = (url?: string) => {
        const targetUrl = normalizeGitHubUrl(url || selectedCommit?.url || selectedCommit?.html_url);
        if (!targetUrl) {
            message.warning("No GitHub URL available");
            return;
        }
        window.open(targetUrl, "_blank");
    };

    const handleViewFileOnGitHub = (file: any) => {
        // Try to get repo info from the commit URL
        const commitUrl = normalizeGitHubUrl(selectedCommit?.url || selectedCommit?.html_url);
        if (!commitUrl || !file.filename) {
            message.warning("Cannot open file on GitHub");
            return;
        }
        
        // Extract owner and repo from commit URL
        // URL format: https://github.com/owner/repo/commit/sha
        const urlParts = commitUrl.split('/');
        if (urlParts.length >= 5) {
            const owner = urlParts[3];
            const repo = urlParts[4];
            const branch = 'main'; // Default to main
            const url = `https://github.com/${owner}/${repo}/blob/${branch}/${file.filename}`;
            window.open(url, "_blank");
        } else {
            message.warning("Could not determine repository from URL");
        }
    };

    const toggleFileExpand = (fileKey: string) => {
        setExpandedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileKey)) {
                newSet.delete(fileKey);
            } else {
                newSet.add(fileKey);
            }
            return newSet;
        });
    };

    const getTotalChanges = (commit: any): number => {
        if (commit.stats?.total) return commit.stats.total;
        if (commit.files) {
            return commit.files.reduce((sum: number, file: any) => sum + (file.changes || 0), 0);
        }
        return 0;
    };

    const getTotalAdditions = (commit: any): number => {
        if (commit.stats?.additions) return commit.stats.additions;
        if (commit.files) {
            return commit.files.reduce((sum: number, file: any) => sum + (file.additions || 0), 0);
        }
        return 0;
    };

    const getTotalDeletions = (commit: any): number => {
        if (commit.stats?.deletions) return commit.stats.deletions;
        if (commit.files) {
            return commit.files.reduce((sum: number, file: any) => sum + (file.deletions || 0), 0);
        }
        return 0;
    };

    const renderCommitCard = (commit: any) => {
        if (!commit) return null;

        const authorName = getAuthorName(commit);
        const authorAvatar = getAuthorAvatar(commit);
        const commitDate = getCommitDate(commit);
        const message = getCommitMessage(commit);
        const totalChanges = getTotalChanges(commit);
        const totalAdditions = getTotalAdditions(commit);
        const totalDeletions = getTotalDeletions(commit);
        const filesCount = commit.files?.length || 0;
        const sha = commit.sha || '';

        return (
            <div className="border rounded-lg overflow-hidden mb-4">
                {/* Commit Card Header - Always visible */}
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedCommit(selectedCommit?.sha === commit.sha ? null : commit)}
                >
                    {/* Author and Date */}
                    <div className="flex items-center gap-2 mb-2">
                        {authorAvatar ? (
                            <Avatar src={authorAvatar} size="small" />
                        ) : (
                            <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                                {authorName.charAt(0).toUpperCase()}
                            </Avatar>
                        )}
                        <span className="font-medium text-sm">{authorName}</span>
                        <span className="text-xs text-gray-500">{formatDate(commitDate)}</span>
                    </div>

                    {/* Commit Message */}
                    <div className="text-sm font-medium mb-2">{message || 'No commit message'}</div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm mb-2">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                            +{totalAdditions} additions
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                            -{totalDeletions} deletions
                        </span>
                        <span className="text-gray-500">
                            {totalChanges} changes
                        </span>
                    </div>

                    {/* Files Count and SHA */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {filesCount} file(s) changed
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            SHA: {sha.substring(0, 7)}
                        </div>
                    </div>

                    {/* View on GitHub Button */}
                    {(commit.url || commit.html_url) && (
                        <div className="mt-3">
                            <Button 
                                type="link" 
                                icon={<GithubOutlined />} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInGithub(commit.url || commit.html_url);
                                }}
                                className="p-0 h-auto text-blue-600"
                            >
                                View on GitHub
                            </Button>
                        </div>
                    )}
                </div>

                {/* Changed Files Section - Only visible when card is selected */}
                {selectedCommit?.sha === commit.sha && commit.files && commit.files.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="text-sm font-medium mb-3">Changed Files:</div>
                        <div className="space-y-2">
                            {commit.files.map((file: any, index: number) => {
                                const fileKey = `${commit.sha}-${file.filename}-${index}`;
                                const isExpanded = expandedFiles.has(fileKey);
                                
                                return (
                                    <div key={fileKey} className="border rounded-md bg-white">
                                        {/* File Header - Click to expand/collapse file diff */}
                                        <div 
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                            onClick={() => toggleFileExpand(fileKey)}
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                {isExpanded ? (
                                                    <DownOutlined className="text-xs text-gray-400" />
                                                ) : (
                                                    <RightOutlined className="text-xs text-gray-400" />
                                                )}
                                                <FileOutlined className="text-blue-500" />
                                                <span className="text-sm text-blue-600 hover:underline">
                                                    {file.filename}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <Tag color={file.status === 'added' ? 'green' : file.status === 'removed' ? 'red' : 'blue'}>
                                                    {file.status}
                                                </Tag>
                                                <span className="text-green-600">
                                                    <PlusOutlined /> {file.additions || 0}
                                                </span>
                                                <span className="text-red-600">
                                                    <MinusOutlined /> {file.deletions || 0}
                                                </span>
                                                <span className="text-gray-500">
                                                    {file.changes || 0} changes
                                                </span>
                                            </div>
                                        </div>

                                        {/* File Diff - Show when expanded */}
                                        {isExpanded && file.patch && (
                                            <div className="border-t border-gray-200">
                                                <div className="p-3 bg-gray-50">
                                                    <pre className="text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                                                        {file.patch.split('\n').map((line: string, lineIndex: number) => {
                                                            const isAdded = line.startsWith('+') && !line.startsWith('+++');
                                                            const isRemoved = line.startsWith('-') && !line.startsWith('---');
                                                            const isHeader = line.startsWith('@@');
                                                            
                                                            return (
                                                                <div
                                                                    key={lineIndex}
                                                                    className={`px-3 py-0.5 ${
                                                                        isAdded ? 'bg-green-50 text-green-700' :
                                                                        isRemoved ? 'bg-red-50 text-red-700' :
                                                                        isHeader ? 'bg-blue-50 text-blue-700 font-bold' : ''
                                                                    }`}
                                                                >
                                                                    {line}
                                                                </div>
                                                            );
                                                        })}
                                                    </pre>
                                                </div>
                                                {/* View on GitHub button for this file */}
                                                <div className="p-2 bg-gray-50 border-t border-gray-200 text-right">
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        icon={<GithubOutlined />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewFileOnGitHub(file);
                                                        }}
                                                        className="text-blue-600"
                                                    >
                                                        View on GitHub
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <GithubOutlined />
                    <span>Commit History</span>
                    {issue && (
                        <span className="text-sm text-gray-500 ml-2">
                            - {issue.description || issue.desc || 'Issue'}
                        </span>
                    )}
                </div>
            }
            width="90%"
            open={open}
            onClose={onClose}
        >
            <Spin spinning={loading}>
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spin size="large" />
                    </div>
                ) : commits.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No commit history available</div>
                ) : (
                    <div className="space-y-4">
                        {/* Commit Selector for multiple commits */}
                        {commits.length > 1 && (
                            <Select
                                value={selectedCommit?.sha}
                                onChange={(sha) => {
                                    const commit = commits.find(c => c.sha === sha);
                                    setSelectedCommit(commit || null);
                                }}
                                style={{ width: '100%', marginBottom: 16 }}
                                placeholder="Select a commit"
                            >
                                {commits.map((commit) => {
                                    const date = getCommitDate(commit);
                                    return (
                                        <Select.Option key={commit.sha} value={commit.sha}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                                                <span className="text-xs text-gray-500">
                                                    {date ? formatDate(date) : 'Unknown date'}
                                                </span>
                                            </div>
                                        </Select.Option>
                                    );
                                })}
                            </Select>
                        )}
                        
                        {/* Commit Cards */}
                        {commits.map((commit) => (
                            <div key={commit.sha}>
                                {renderCommitCard(commit)}
                            </div>
                        ))}
                    </div>
                )}
            </Spin>
        </Drawer>
    );
};

export default CodeLineCommitHistoryDrawer;
