import { useState } from 'react';
import Commit from '../types/Commit.interface';

/**
 * Manages open/close state and issue data for CodeLineCommitHistoryDrawer.
 * Triggered when the user clicks a commit SHA in the table.
 *
 * Wraps the raw commit in { githubData: commit } — the shape the drawer expects.
 */
export const useCodeLineHistory = () => {
    const [open,  setOpen]  = useState(false);
    const [issue, setIssue] = useState<any>(null);

    const openForCommit = (commit: Commit) => {
        setIssue({ githubData: commit });
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        setIssue(null);
    };

    return { open, issue, openForCommit, close };
};
