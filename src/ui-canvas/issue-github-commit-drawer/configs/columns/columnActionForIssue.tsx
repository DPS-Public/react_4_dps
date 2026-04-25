import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import { IssueColumnDeps } from '../../types/IssueColumnDeps';
import Commit from '../../types/commitTypes.interface';

/**
 * Table column: Action
 * "Add to N item(s)" button — links the commit to all selected backlog tasks.
 * Disabled when no task IDs are selected or commit is already being processed.
 *
 * Does NOT create a new backlog issue. Updates existing ones.
 */
export const createColumnActionForIssue = (deps: IssueColumnDeps): ColumnType<Commit> => ({
    title: 'Action',
    key:   'action',
    width: 150,
    render: (_, record: Commit) => (
        <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={deps.addingCommits.has(record.sha)}
            disabled={deps.addingCommits.has(record.sha) || deps.currentTaskIds.length === 0}
            onClick={() => deps.onLinkCommitToTasks(record)}
        >
            Add to {deps.currentTaskIds.length > 0 ? `${deps.currentTaskIds.length} item(s)` : 'backlog'}
        </Button>
    ),
});
