import React, { useEffect, useState } from 'react';
import {
    Drawer, List, Button, Empty, Spin, message,
    DatePicker, Select, Tag, Avatar,
} from 'antd';import { GithubOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppSelector } from '@/store';
import { useProjectUsers } from '@/hooks/useProjectUsers';

// ── Types ────────────────────────────────────────────────────────────────────
import GithubCommitsDrawerProps from './types/GithubCommitsDrawerProps.interface';
import Commit from './types/Commit.interface';
import SelectedFile from './types/SelectedFile.interface';

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useRepositories }    from './hooks/useRepositories';
import { useBranches }        from './hooks/useBranches';
import { useCommits }         from './hooks/useCommits';
import { useFilteredCommits } from './hooks/useFilteredCommits';
import { fetchCommits }       from './services/fetchCommits';

// ── Handlers ─────────────────────────────────────────────────────────────────
import { handleLoadFileCode }   from './handlers/handleLoadFileCode';
import { handleAddCommitToBacklog } from './handlers/handleAddCommitToBacklog';
import { serviceLinkCommitToTask } from '@/ui-canvas/issue-github-commit-drawer/services/serviceLinkCommitToTask';

// ── Components ───────────────────────────────────────────────────────────────
import FileChangesModal from './components/FileChangesModal';
import AllFilesModal    from './components/AllFilesModal';

const { RangePicker } = DatePicker;

const dateRangePresets = [
    { label: 'This Week', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Last Week', value: [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')] },
    { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'Last 7 Days', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
];

const GithubCommitsDrawer: React.FC<GithubCommitsDrawerProps> = ({
    open,
    onClose,
    currentProject,
    onIssuesUpdate,
    hideAddToBacklogButton = false,
    hideUICanvasAndAssignee = false,
    linkToTaskIds = [],
    closeOnCommitLinked = true,
    onCommitLinked,
}) => {
    // ── Global state ─────────────────────────────────────────────────────
    const currentRepo = useAppSelector((state) => state.project.currentRepo);
    const { currentUser, canvasses } = useAppSelector((state) => state.auth);
    const { projectUsers } = useProjectUsers();

    // ── Hooks ─────────────────────────────────────────────────────────────
    const { repositories, loadingRepos, selectedRepoId, setSelectedRepoId } =
        useRepositories(open, currentProject?.id, currentRepo);

    const { branches, setBranches, selectedBranches, setSelectedBranches, loadingBranches } =
        useBranches(open, selectedRepoId, repositories);

    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    const {
        commits, loading,
        loadCommits,
    } = useCommits(
        open, currentProject?.id, selectedRepoId,
        repositories, selectedBranches, dateRange, 10
    );

    // ── Per-row state ──────────────────────────────────────────────────────
    const [addingCommits, setAddingCommits]         = useState<Set<string>>(new Set());
    const [commitUICanvasMap, setCommitUICanvasMap] = useState<Record<string, string>>({});
    const [commitAssigneeMap, setCommitAssigneeMap] = useState<Record<string, string>>({});

    // ── Filter state ───────────────────────────────────────────────────────
    const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
    const [collaboratorOptions, setCollaboratorOptions] = useState<string[]>([]);
    const [loadingCollaborators, setLoadingCollaborators] = useState(false);
    const filteredCommits = useFilteredCommits(commits, selectedCollaborator);

    // ── Modal state ────────────────────────────────────────────────────────
    const [loadingCode, setLoadingCode]                           = useState(false);
    const [commitCode, setCommitCode]                             = useState<string>('');
    const [fileModalVisible, setFileModalVisible]                 = useState(false);
    const [selectedFileForCode, setSelectedFileForCode]           = useState<SelectedFile | null>(null);
    const [allFilesModalVisible, setAllFilesModalVisible]         = useState(false);
    const [selectedCommitForAllFiles, setSelectedCommitForAllFiles] = useState<Commit | null>(null);

    const normalizeGitHubUrl = (url?: string): string => {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('api.github.com/repos/')) {
            return url
                .replace('https://api.github.com/repos/', 'https://github.com/')
                .replace('/commits/', '/commit/');
        }
        return url;
    };

    // ── Shared deps for backlog handlers ───────────────────────────────────
    const backlogDeps = {
        currentProject, currentUser, canvasses, projectUsers,
        selectedRepoId, repositories, selectedBranches,
        commitUICanvasMap, commitAssigneeMap,
        setAddingCommits, setCommitUICanvasMap, setCommitAssigneeMap,
        onIssuesUpdate,
    };

    // ── Handler dep objects (follow DPS chain: UI → Handler → Service) ─────
    const loadFileCodeDeps = {
        selectedRepoId, repositories,
        setSelectedFileForCode, setLoadingCode, setCommitCode, setFileModalVisible,
    };

    useEffect(() => {
        if (!open || !selectedRepoId || selectedBranches.length === 0) {
            setCollaboratorOptions([]);
            setSelectedCollaborator(null);
            return;
        }

        let cancelled = false;

        const loadCollaborators = async () => {
            setLoadingCollaborators(true);
            try {
                const repo = repositories.find(
                    (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
                );

                if (!repo?.full_name) {
                    if (!cancelled) setCollaboratorOptions([]);
                    return;
                }

                const allCommits: Commit[] = [];
                const seen = new Set<string>();

                for (const branch of selectedBranches) {
                    try {
                        const branchCommits = await fetchCommits({
                            repoFullName: repo.full_name,
                            branch,
                            dateRange: null,
                            includeDetails: false,
                        });

                        branchCommits.forEach((commit) => {
                            if (!seen.has(commit.sha)) {
                                seen.add(commit.sha);
                                allCommits.push(commit);
                            }
                        });
                    } catch {
                        // Ignore collaborator load errors per branch
                    }
                }

                const options = Array.from(new Set([
                    ...allCommits.map(c => c.author?.login || ''),
                    ...allCommits.map(c => c.commit?.author?.name || ''),
                    ...allCommits.map(c => c.author?.name || ''),
                ].filter(Boolean))).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

                if (!cancelled) {
                    setCollaboratorOptions(options);
                }
            } finally {
                if (!cancelled) {
                    setLoadingCollaborators(false);
                }
            }
        };

        loadCollaborators();

        return () => {
            cancelled = true;
        };
    }, [open, selectedRepoId, selectedBranches, repositories]);

    useEffect(() => {
        if (!selectedCollaborator) return;
        if (!collaboratorOptions.includes(selectedCollaborator)) {
            setSelectedCollaborator(null);
        }
    }, [selectedCollaborator, collaboratorOptions]);

    const handleAddOrLinkCommit = async (item: Commit) => {
        // Change Commit mode: link selected commit to existing issue(s) instead of creating new backlog issue.
        if (linkToTaskIds.length > 0 && currentProject?.id) {
            setAddingCommits(prev => new Set(prev).add(item.sha));
            try {
                const results = await serviceLinkCommitToTask(currentProject.id, linkToTaskIds, item as any);
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;

                if (successful > 0) {
                    message.success(
                        `Commit ${item.sha.substring(0, 7)} added to ${successful} item(s)` +
                        (failed > 0 ? `, ${failed} failed` : '')
                    );
                    if (onIssuesUpdate) onIssuesUpdate();
                    if (onCommitLinked) onCommitLinked(item);
                    if (closeOnCommitLinked) onClose();
                } else {
                    message.error('Failed to add commit to selected issue');
                }
            } catch (error: any) {
                message.error('Failed to link commit: ' + (error?.message || 'Unknown error'));
            } finally {
                setAddingCommits(prev => {
                    const s = new Set(prev);
                    s.delete(item.sha);
                    return s;
                });
            }
            return;
        }

        const assigneeId = commitAssigneeMap[item.sha];
        const assigneeUser = projectUsers.find((u: any) => u.uid === assigneeId);
        const fallbackCanvasId = hideUICanvasAndAssignee ? canvasses?.[0]?.id : undefined;

        handleAddCommitToBacklog(
            item,
            commitUICanvasMap[item.sha] || fallbackCanvasId,
            assigneeId,
            assigneeUser,
            backlogDeps
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GithubOutlined />
                    <span>GitHub Commits - Not in Backlog</span>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={open}
            width="80%"
            bodyStyle={{ paddingTop: 0 }}
        >
            <div className="sticky top-0 z-20 -mx-6 mb-4 border border-sky-100 bg-sky-50 px-6 pt-4 pb-6">
                <div style={{ marginBottom: 12, fontSize: 14, color: '#475569' }}>
                    <div><strong>Repository:</strong> {repositories.find((r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId))?.full_name || 'Not selected'}</div>
                    <div><strong>Default Branch:</strong> {selectedBranches?.[0] || 'main'}</div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>

                    <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="block text-sm font-medium mb-1">Repository</label>
                        <Select
                            value={selectedRepoId || undefined}
                            onChange={value => {
                                setSelectedRepoId(value);
                                setBranches([]);
                                setSelectedBranches([]);
                            }}
                            loading={loadingRepos}
                            style={{ width: '100%' }}
                            placeholder="Select Repository"
                            showSearch
                            filterOption={(input, option) =>
                                (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={loadingRepos ? <Spin size="small" /> : null}
                        >
                            {repositories.map((repo, index) => {
                                const repoId = String(repo.repoId || repo.id || repo.repo || `repo-${index}`).trim();
                                const repoName = (repo.full_name || repo.name || repoId).trim();
                                return (
                                    <Select.Option key={`repo-${repoId}-${index}`} value={repoId} title={repoName}>
                                        {repoName}
                                    </Select.Option>
                                );
                            })}
                        </Select>
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="block text-sm font-medium mb-1">Filter by Branch</label>
                        <Select
                            value={selectedBranches?.[0] || undefined}
                            onChange={(value) => setSelectedBranches(value ? [value] : [])}
                            loading={loadingBranches}
                            style={{ width: '100%', minWidth: 200 }}
                            placeholder="Select Branch"
                            disabled={!selectedRepoId}
                            showSearch
                            allowClear
                        >
                            {branches.map(branch => (
                                <Select.Option key={branch} value={branch}>{branch}</Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div style={{ flex: 1, minWidth: 260 }}>
                        <label className="block text-sm font-medium mb-1">From Date - To Date</label>
                        <RangePicker
                            value={dateRange}
                            onChange={dates => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                            presets={dateRangePresets}
                            format="YYYY-MM-DD"
                            style={{ width: '100%' }}
                            disabled={!selectedRepoId}
                        />
                    </div>

                    <div style={{ flex: 1, minWidth: 220 }}>
                        <label className="block text-sm font-medium mb-1">Filter by Collaborator</label>
                        <Select
                            value={selectedCollaborator}
                            onChange={setSelectedCollaborator}
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Select collaborator"
                            showSearch
                            loading={loadingCollaborators}
                            disabled={!selectedRepoId || selectedBranches.length === 0}
                        >
                            {collaboratorOptions.map(collab => (
                                <Select.Option key={collab} value={collab} label={collab}>{collab}</Select.Option>
                            ))}
                        </Select>
                    </div>

                    <Button
                        type="primary"
                        onClick={loadCommits}
                        loading={loading}
                        disabled={!selectedRepoId || selectedBranches.length === 0 || !dateRange?.[0] || !dateRange?.[1]}
                    >
                        Filter
                    </Button>
                </div>
            </div>

            {/* ── Commit Table ──────────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
            ) : filteredCommits.length === 0 ? (
                <Empty description="No commits found or all commits are already in backlog" />
            ) : (
                <List
                    bordered
                    split={false}
                    dataSource={filteredCommits}
                    style={{
                        border: '1px solid #64748b',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                    }}
                    renderItem={(item: Commit, index: number) => {
                        const authorName = item?.commit?.author?.name || item?.author?.login || item?.author?.name || 'Unknown';
                        const commitDate = item?.commit?.author?.date
                            ? new Date(item.commit.author.date).toLocaleString()
                            : 'Unknown date';
                        const commitUrl = normalizeGitHubUrl(item?.html_url || item?.url);
                        const filesChanged = Array.isArray(item?.files) ? item.files : [];
                        const additions = item?.stats?.additions ?? filesChanged.reduce((sum, f) => sum + (f?.additions || 0), 0);
                        const deletions = item?.stats?.deletions ?? filesChanged.reduce((sum, f) => sum + (f?.deletions || 0), 0);
                        const numFiles = filesChanged.length;
                        const modifications = filesChanged.filter((f) => f?.status === 'modified').length;

                        return (
                            <List.Item
                                key={item.sha}
                                className="flex-col !items-start"
                                style={{
                                    borderBottom: index !== filteredCommits.length - 1 ? '1px solid #94a3b8' : 'none',
                                }}
                            >
                                <div className="w-full">
                                    <div className="font-medium text-base">{(item?.commit?.message || item?.message || 'No message').split('\n')[0]}</div>

                                    <div className="text-xs text-gray-500 mt-1">{authorName} • {commitDate}</div>
                                    <div className="text-xs text-gray-500 mt-1">SHA: {item?.sha?.slice(0, 8)}</div>
                                    {item?.branch && <div className="text-xs text-gray-500 mt-1">Branch: {item.branch}</div>}

                                    <div className="flex gap-3 mt-2 mb-2">
                                        <Tag color="green"><span className="font-medium">+{additions}</span> Added</Tag>
                                        <Tag color="red"><span className="font-medium">-{deletions}</span> Deleted</Tag>
                                        <Tag color="gold"><span className="font-medium">{numFiles}</span> Files</Tag>
                                        {modifications > 0 && (
                                            <Tag color="blue"><span className="font-medium">{modifications}</span> Modified</Tag>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-600 mb-2">
                                        <button
                                            type="button"
                                            className="font-medium text-blue-600 hover:underline"
                                            onClick={() => {
                                                setSelectedCommitForAllFiles(item);
                                                setAllFilesModalVisible(true);
                                            }}
                                        >
                                            {numFiles} file{numFiles !== 1 ? 's' : ''} changed
                                        </button>
                                    </div>

                                    {commitUrl && (
                                        <a href={commitUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600">
                                            View on GitHub
                                        </a>
                                    )}

                                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center">
                                        {!hideUICanvasAndAssignee && (
                                            <Select
                                                value={commitUICanvasMap[item.sha]}
                                                onChange={(value) => setCommitUICanvasMap((prev) => ({ ...prev, [item.sha]: value }))}
                                                style={{ minWidth: 190 }}
                                                placeholder="Select UI Canvas"
                                                showSearch
                                            >
                                                {[...canvasses]
                                                    .filter(c => c?.label)
                                                    .sort((a, b) => (a.label || '').toLowerCase().localeCompare((b.label || '').toLowerCase()))
                                                    .map(canvas => (
                                                        <Select.Option key={canvas.id} value={canvas.id}>{canvas.label}</Select.Option>
                                                    ))}
                                            </Select>
                                        )}

                                        {!hideUICanvasAndAssignee && (
                                            <Select
                                                placeholder="Select Assignee"
                                                value={commitAssigneeMap[item.sha]}
                                                onChange={(value) => setCommitAssigneeMap((prev) => ({ ...prev, [item.sha]: value }))}
                                                style={{ minWidth: 190 }}
                                                showSearch
                                                optionLabelProp="label"
                                                filterOption={(input, option) =>
                                                    (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                                                }
                                            >
                                                {projectUsers.map((user: any) => (
                                                    <Select.Option key={user.uid} value={user.uid} label={user.displayName || user.email}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Avatar size={24} src={user.photoURL} style={{ backgroundColor: '#1677ff' }}>
                                                                {!user.photoURL && (user.displayName || user.email)?.charAt(0)?.toUpperCase()}
                                                            </Avatar>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontSize: 13, lineHeight: 1.2 }}>{user.displayName || user.email}</div>
                                                                {user.email && user.displayName && (
                                                                    <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.2 }}>{user.email}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        )}

                                        {!hideAddToBacklogButton && (
                                            <Button
                                                type="primary"
                                                size="small"
                                                loading={addingCommits.has(item.sha)}
                                                disabled={
                                                    linkToTaskIds.length === 0 &&
                                                    hideUICanvasAndAssignee &&
                                                    !canvasses?.[0]?.id
                                                }
                                                onClick={() => handleAddOrLinkCommit(item)}
                                            >
                                                Add to Backlog
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </List.Item>
                        );
                    }}
                />
            )}

            {/* ── All Files Modal ───────────────────────────────────────────── */}
            <AllFilesModal
                visible={allFilesModalVisible}
                commit={selectedCommitForAllFiles}
                onClose={() => { setAllFilesModalVisible(false); setSelectedCommitForAllFiles(null); }}
                onViewFile={(commit, file) => handleLoadFileCode(commit, file, loadFileCodeDeps)}
            />

            {/* ── File Changes Modal ────────────────────────────────────────── */}
            <FileChangesModal
                visible={fileModalVisible}
                file={selectedFileForCode}
                code={commitCode}
                loading={loadingCode}
                onClose={() => { setFileModalVisible(false); setSelectedFileForCode(null); setCommitCode(''); }}
            />

            
        </Drawer>
    );
};

export default GithubCommitsDrawer;
