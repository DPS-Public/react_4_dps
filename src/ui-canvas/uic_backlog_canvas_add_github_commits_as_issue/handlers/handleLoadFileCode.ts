import { message } from 'antd';
import Commit from '../types/Commit.interface';
import SelectedFile from '../types/SelectedFile.interface';
import { fetchCommitDiff } from '../services/fetchCommitDiff';

export interface HandleLoadFileCodeDeps {
    selectedRepoId: string | null;
    repositories: any[];
    setSelectedFileForCode: (file: SelectedFile) => void;
    setLoadingCode: (v: boolean) => void;
    setCommitCode: (v: string) => void;
    setFileModalVisible: (v: boolean) => void;
}

/**
 * Handles the onClick event on a specific file name in the Files column.
 * Opens the "File Changes" modal and loads the diff for that exact file.
 *
 * Handler layer — coordinates UI state setters + service calls.
 * Chain: onClick (file name) → handleLoadFileCode → fetchCommitDiff (service)
 */
export const handleLoadFileCode = async (
    commit: Commit,
    file: any,
    deps: HandleLoadFileCodeDeps
): Promise<void> => {
    const {
        selectedRepoId,
        repositories,
        setSelectedFileForCode,
        setLoadingCode,
        setCommitCode,
        setFileModalVisible,
    } = deps;

    setSelectedFileForCode({
        filename: file.filename || file.path || 'Unknown file',
        patch: file.patch || '',
        status: file.status || 'modified',
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        changes: file.changes || 0,
    });
    setLoadingCode(true);
    setCommitCode('');
    setFileModalVisible(true);

    try {
        // Use patch already in file data if available
        if (file.patch) {
            setCommitCode(file.patch);
            return;
        }

        if (!selectedRepoId) {
            message.warning('Patch not available in commit data');
            return;
        }

        const repo = repositories.find(
            (r: any) => String(r.repoId || r.id || r.repo) === String(selectedRepoId)
        );
        if (!repo?.full_name) {
            message.error('Repository not found');
            return;
        }

        const filePath = file.filename || file.path || '';
        if (!filePath) {
            message.info('File path not found');
            return;
        }

        try {
            const diff = await fetchCommitDiff(repo.full_name, commit.sha, filePath);
            if (diff) {
                setCommitCode(diff);
            } else {
                message.warning('Patch not available. Showing file information instead.');
                setCommitCode(
                    `File: ${filePath}\nStatus: ${file.status || 'modified'}\n` +
                    `Changes: ${file.changes || 0} (+${file.additions || 0} -${file.deletions || 0})`
                );
            }
        } catch {
            message.warning('Patch not available. Showing file information instead.');
            setCommitCode(
                `File: ${filePath}\nStatus: ${file.status || 'modified'}\n` +
                `Changes: ${file.changes || 0} (+${file.additions || 0} -${file.deletions || 0})`
            );
        }
    } catch (error: any) {
        message.error(error?.message || 'Failed to load file code');
        setCommitCode('');
    } finally {
        setLoadingCode(false);
    }
};
