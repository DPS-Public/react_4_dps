import { message } from 'antd';
import SelectedFile from '../types/SelectedFile.interface';
import Commit from '../types/commitTypes.interface';
import { fetchCommitDiff } from '../services/serviceCommitDiff';

export interface HandleLoadFileCodeDeps {
    selectedRepoId:      string | null;
    repositories:        any[];
    setSelectedFileForCode: (file: SelectedFile) => void;
    setLoadingCode:      (v: boolean) => void;
    setCommitCode:       (code: string) => void;
    setFileModalVisible: (v: boolean) => void;
}

/**
 * Handles clicking a file name in the Files column.
 * Opens the FileChangesModal and loads the diff for that specific file.
 *
 * If `patch` is already present in the file data it is used directly;
 * otherwise the diff is fetched from the API.
 *
 * Handler layer — coordinates UI state + service call.
 * Chain: onClick (file name) → handleLoadFileCode → fetchCommitDiff → API
 */
export const handleLoadFileCode = async (
    commit: Commit,
    file: any,
    deps: HandleLoadFileCodeDeps
): Promise<void> => {
    const { selectedRepoId, repositories, setSelectedFileForCode, setLoadingCode, setCommitCode, setFileModalVisible } = deps;

    setSelectedFileForCode({
        filename:  file.filename || file.path || 'Unknown file',
        patch:     file.patch || '',
        status:    file.status || 'modified',
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        changes:   file.changes   || 0,
    });
    setLoadingCode(true);
    setCommitCode('');
    setFileModalVisible(true);

    try {
        if (file.patch) {
            setCommitCode(file.patch);
            return;
        }

        if (!selectedRepoId) { message.warning('Patch not available'); return; }

        const repo = repositories.find((r: any) =>
            String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!repo?.full_name) { message.error('Repository not found'); return; }

        const filePath = file.filename || file.path || '';
        if (!filePath)   { message.info('File path not found'); return; }

        const diff = await fetchCommitDiff(repo.full_name, commit.sha, filePath);

        if (diff) {
            setCommitCode(diff);
        } else {
            message.warning('Patch not available. Showing file information instead.');
            setCommitCode(
                `File: ${filePath}\nStatus: ${file.status || 'modified'}\nChanges: ${file.changes || 0} (+${file.additions || 0} -${file.deletions || 0})`
            );
        }
    } catch (e: any) {
        message.error(e?.message || 'Failed to load file code');
        setCommitCode('');
    } finally {
        setLoadingCode(false);
    }
};
