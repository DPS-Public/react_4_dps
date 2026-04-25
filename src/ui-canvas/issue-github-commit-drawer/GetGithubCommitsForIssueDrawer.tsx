import React, { useMemo, useState } from 'react';
import {
    Drawer, Table, Button, Empty, Spin,
    DatePicker, Select,
} from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { useAppSelector } from '@/store';
import { useProjectUsers } from '@/hooks/useProjectUsers';
import CodeLineCommitHistoryDrawer from '@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicCodeLineCommitHistoryDrawer';

// ── Types ────────────────────────────────────────────────────────────────────
import GetGithubCommitsForIssueDrawerProps from './types/drawerProps.type';
import Commit from './types/commitTypes.interface';

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useRepositories }    from './hooks/useRepositories';
import { useBranches }        from './hooks/useBranches';
import { useCommits }         from './hooks/useCommits';
import { useFilteredCommits } from './hooks/useFilteredCommits';
import { useCodeLineHistory } from './hooks/useCodeLineHistory';

// ── Handlers ─────────────────────────────────────────────────────────────────
import { handleLoadFileCode }      from './handlers/handleLoadFileCode';
import { handleLinkCommitToTasks } from './handlers/handleLinkCommitToTasks';

// ── Config ───────────────────────────────────────────────────────────────────
import { createIssueCommitColumns } from './configs/columns/createIssueCommitColumns';

// ── Components ───────────────────────────────────────────────────────────────
import AllFilesModal    from './components/AllFilesModal';
import SelectedFile from './types/SelectedFile.interface';
import FileChangesModal from './components/FileChangesModal';

const { RangePicker } = DatePicker;

const GetGithubCommitsForIssueDrawer: React.FC<GetGithubCommitsForIssueDrawerProps> = ({
    open,
    onClose,
    currentProject,
    onIssuesUpdate,
    currentTaskId,
    currentTaskIds,
}) => {
    // ── Global state ──────────────────────────────────────────────────────
    const currentRepo = useAppSelector((state) => state.project.currentRepo);
    const { projectUsers } = useProjectUsers();

    // ── Repository + Branch hooks ─────────────────────────────────────────
    const { repositories, loadingRepos, selectedRepoId, setSelectedRepoId } =
        useRepositories(open, currentProject?.id, currentRepo);

    const { branches, setBranches, selectedBranches, setSelectedBranches, loadingBranches } =
        useBranches(open, selectedRepoId, repositories);

    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    // ── Commits hook ──────────────────────────────────────────────────────
    const {
        commits, loading,
        pagination, setPagination, loadCommits,
    } = useCommits(
        open, currentProject?.id, selectedRepoId,
        repositories, selectedBranches, dateRange, 10
    );

    // ── Filter ─────────────────────────────────────────────────────────────
    const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
    const filteredCommits = useFilteredCommits(commits, selectedCollaborator);

    // ── Per-row loading state ─────────────────────────────────────────────
    const [addingCommits,    setAddingCommits]    = useState<Set<string>>(new Set());
    const [commitToIssueMap, setCommitToIssueMap] = useState<Record<string, any>>({});

    // ── File diff modal state ─────────────────────────────────────────────
    const [fileModalVisible,         setFileModalVisible]         = useState(false);
    const [selectedFileForCode,      setSelectedFileForCode]      = useState<SelectedFile | null>(null);
    const [commitCode,               setCommitCode]               = useState<string>('');
    const [loadingCode,              setLoadingCode]              = useState(false);
    const [allFilesModalVisible,     setAllFilesModalVisible]     = useState(false);
    const [selectedCommitForAllFiles, setSelectedCommitForAllFiles] = useState<Commit | null>(null);
    const [selectedCommitForCode,    setSelectedCommitForCode]    = useState<Commit | null>(null);

    // ── CodeLineHistory drawer ─────────────────────────────────────────────
    const codeLineHistory = useCodeLineHistory();

    // ── Handler dep objects ────────────────────────────────────────────────
    const loadFileCodeDeps = {
        selectedRepoId,
        repositories,
        setSelectedFileForCode,
        setLoadingCode,
        setCommitCode,
        setFileModalVisible,
    };

    const linkCommitDeps = {
        projectId:           currentProject?.id || '',
        currentTaskIds,
        setAddingCommits,
        setCommitToIssueMap,
        onIssuesUpdate,
    };

    // ── Table columns ─────────────────────────────────────────────────────
    const columns = useMemo(
        () => createIssueCommitColumns({
            addingCommits,
            currentTaskIds,
            setSelectedCommitForAllFiles,
            setAllFilesModalVisible,
            setSelectedCommitForCode,
            setCodeLineCommitHistoryOpen:  (v) => v
                ? codeLineHistory.openForCommit(selectedCommitForCode!)
                : codeLineHistory.close(),
            setCodeLineCommitHistoryIssue: (issue) => {
                // openForCommit handles issue wrapping; direct SHA click goes through setCodeLineCommitHistoryOpen
            },
            onLoadFileCode:      (commit, file) => handleLoadFileCode(commit, file, loadFileCodeDeps),
            onLinkCommitToTasks: (commit)       => handleLinkCommitToTasks(commit, linkCommitDeps),
        }),
         
        [addingCommits, currentTaskIds, commitToIssueMap, selectedRepoId]
    );

    // ── Collaborator options ───────────────────────────────────────────────
    const collaboratorOptions = useMemo(() =>
        Array.from(new Set([
            ...commits.map(c => c.author?.login || ''),
            ...commits.map(c => c.commit?.author?.name || ''),
            ...commits.map(c => c.author?.name || ''),
        ].filter(Boolean))).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        [commits]
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GithubOutlined />
                    <span>GitHub Commits</span>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={open}
            width="100%"
        >
            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                <Select
                    value={selectedRepoId || undefined}
                    onChange={value => {
                        setSelectedRepoId(value);
                        setBranches([]);
                        setSelectedBranches([]);
                    }}
                    loading={loadingRepos}
                    style={{ minWidth: 200 }}
                    placeholder="Select Repository"
                    showSearch
                    filterOption={(input, option) =>
                        (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                    }
                    notFoundContent={loadingRepos ? <Spin size="small" /> : null}
                >
                    {repositories.map((repo, index) => {
                        const repoId   = String(repo.repoId || repo.id || repo.repo || `repo-${index}`).trim();
                        const repoName = (repo.full_name || repo.name || repoId).trim();
                        return (
                            <Select.Option key={`repo-${repoId}-${index}`} value={repoId} title={repoName}>
                                {repoName}
                            </Select.Option>
                        );
                    })}
                </Select>

                <Select
                    mode="multiple"
                    value={selectedBranches}
                    onChange={setSelectedBranches}
                    loading={loadingBranches}
                    style={{ minWidth: 200 }}
                    placeholder="Select Branches"
                    disabled={!selectedRepoId}
                    maxTagCount="responsive"
                    showSearch
                >
                    {branches.map(branch => (
                        <Select.Option key={branch} value={branch}>{branch}</Select.Option>
                    ))}
                </Select>

                <RangePicker
                    value={dateRange}
                    onChange={dates => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                    format="DD MMM YYYY"
                />

                <Button
                    type="primary"
                    onClick={loadCommits}
                    loading={loading}
                    disabled={!selectedRepoId || selectedBranches.length === 0}
                >
                    Load Commits
                </Button>

                <Select
                    value={selectedCollaborator}
                    onChange={setSelectedCollaborator}
                    allowClear
                    style={{ minWidth: 180 }}
                    placeholder="Filter by Collaborator"
                    showSearch
                >
                    {collaboratorOptions.map(collab => (
                        <Select.Option key={collab} value={collab} label={collab}>{collab}</Select.Option>
                    ))}
                </Select>
            </div>

            {/* ── Commit Table ──────────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
            ) : filteredCommits.length === 0 ? (
                <Empty description="No commits found" />
            ) : (
                <Table
                    dataSource={filteredCommits}
                    rowKey="sha"
                    columns={columns}
                    pagination={{
                        current:          pagination.current,
                        pageSize:         pagination.pageSize,
                        showSizeChanger:  true,
                        showTotal:        (total, range) => `${range[0]}-${range[1]} of ${total} commits`,
                        pageSizeOptions:  ['10', '20', '50', '100'],
                        showQuickJumper:  true,
                        hideOnSinglePage: false,
                        onChange: (page, pageSize) =>
                            setPagination({ current: page, pageSize: pageSize || pagination.pageSize }),
                        onShowSizeChange: (_, size) => setPagination({ current: 1, pageSize: size }),
                    }}
                    scroll={{ x: 'max-content' }}
                />
            )}

            {/* ── File Changes Modal ────────────────────────────────────────── */}
            <FileChangesModal
                visible={fileModalVisible}
                file={selectedFileForCode}
                code={commitCode}
                loading={loadingCode}
                onClose={() => { setFileModalVisible(false); setSelectedFileForCode(null); setCommitCode(''); }}
            />

            {/* ── All Files Modal ───────────────────────────────────────────── */}
            <AllFilesModal
                visible={allFilesModalVisible}
                commit={selectedCommitForAllFiles}
                onClose={() => { setAllFilesModalVisible(false); setSelectedCommitForAllFiles(null); }}
                onViewFile={(commit, file) => handleLoadFileCode(commit, file, loadFileCodeDeps)}
            />

            

            {/* ── CodeLine Commit History Drawer ────────────────────────────── */}
            <CodeLineCommitHistoryDrawer
                open={codeLineHistory.open}
                issue={codeLineHistory.issue}
                onClose={codeLineHistory.close}
                currentTaskCommits={[]}
            />
        </Drawer>
    );
};

export default GetGithubCommitsForIssueDrawer;
