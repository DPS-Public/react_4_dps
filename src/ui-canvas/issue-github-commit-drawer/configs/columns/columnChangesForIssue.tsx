import React from 'react';
import { message } from 'antd';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';
import { IssueColumnDeps } from '../../types/IssueColumnDeps';

/**
 * Table column: Changes
 * Displays additions/deletions totals. Clicking opens diff for the first changed file.
 */
export const createColumnChangesForIssue = (deps: IssueColumnDeps): ColumnType<Commit> => ({
    title: 'Changes',
    key:   'changes',
    width: 180,
    render: (_, record: Commit) => {
        const stats  = record.stats;
        const files  = record.files || [];

        const additions = stats?.additions ?? files.reduce((s, f) => s + (f.additions || 0), 0);
        const deletions = stats?.deletions ?? files.reduce((s, f) => s + (f.deletions || 0), 0);
        const total     = stats?.total     ?? files.reduce((s, f) => s + (f.changes   || 0), 0);
        const label     = stats ? 'modified' : `${files.length} ${files.length === 1 ? 'file' : 'files'}`;

        if (additions + deletions === 0) return <span style={{ whiteSpace: 'nowrap' }}>-</span>;

        return (
            <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => {
                    deps.setSelectedCommitForCode(record);
                    if (files.length > 0) deps.onLoadFileCode(record, files[0]);
                    else message.info('No files changed in this commit');
                }}
                title="Click to view changed files"
            >
                <span style={{
                    backgroundColor: '#e6f7ff', border: '1px solid #91d5ff',
                    borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: '#1890ff',
                }}>
                    {label}
                </span>
                <span style={{ color: '#52c41a', fontWeight: 500, fontSize: 10 }}>+{additions}</span>
                <span style={{ color: '#ff4d4f', fontWeight: 500, fontSize: 10 }}>-{deletions}</span>
                <span style={{ color: '#8c8c8c', fontSize: 10 }}>{total} changes</span>
            </div>
        );
    },
});
