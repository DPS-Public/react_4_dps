import type { ColumnsType } from 'antd/es/table';
import { IssueColumnDeps } from '../../types/IssueColumnDeps';

// Static columns (shared, no deps needed)
import { columnDate }        from '../../configs/columns/columnDate';

// Dynamic columns (specific to this drawer)
import { createColumnShaForIssue }     from './columnShaForIssue';
import { createColumnChangesForIssue } from './columnChangesForIssue';
import { createColumnFilesForIssue }   from './columnFilesForIssue';
import { createColumnActionForIssue }  from './columnActionForIssue';
import { columnAuthor } from './columnAuthor';
import { columnBranch } from './columnBranch';
import { columnDescription } from './columnDescription';
import Commit from '../../types/commitTypes.interface';

/**
 * Assembles and returns the ColumnsType array for the GetGithubCommitsForIssueDrawer table.
 *
 * Compared to createCommitColumns (GithubCommitsDrawer):
 * - No Assignee column
 * - No UI Canvas column
 * - SHA opens CodeLineCommitHistoryDrawer (not CommitCodeModal)
 * - Action links to existing tasks (not creates new ones)
 *
 * Usage in component:
 *   const columns = useMemo(() => createIssueCommitColumns(deps), [relevantDeps]);
 */
export const createIssueCommitColumns = (deps: IssueColumnDeps): ColumnsType<Commit> => [
    columnDate,
    columnAuthor,
    columnBranch,
    createColumnShaForIssue(deps),
    columnDescription,
    createColumnChangesForIssue(deps),
    createColumnFilesForIssue(deps),
    createColumnActionForIssue(deps),
];
