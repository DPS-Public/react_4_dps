import React from 'react';
import { Space, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';
import { IssueColumnDeps } from '../../types/IssueColumnDeps';

const { Text } = Typography;

const normalizeGitHubUrl = (url?: string): string => {
    if (!url || typeof url !== 'string') return '';
    if (url.includes('api.github.com/repos/')) {
        return url
            .replace('https://api.github.com/repos/', 'https://github.com/')
            .replace('/commits/', '/commit/');
    }
    return url;
};

/**
 * Table column: SHA
 * Clicking the SHA opens CodeLineCommitHistoryDrawer (not CommitCodeModal).
 */
export const createColumnShaForIssue = (deps: IssueColumnDeps): ColumnType<Commit> => ({
    title: 'SHA',
    key:   'sha',
    width: 120,
    render: (_, record: Commit) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
            <Text
                code
                style={{ color: '#1890ff', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                onClick={() => {
                    deps.setCodeLineCommitHistoryIssue({ githubData: record });
                    deps.setCodeLineCommitHistoryOpen(true);
                }}
                title="Click to view commit files"
            >
                {record.sha.substring(0, 7)}
            </Text>
            {(record.html_url || record.url) && (
                <a href={normalizeGitHubUrl(record.html_url || record.url)} target="_blank" rel="noopener noreferrer">
                    <GithubOutlined />
                </a>
            )}
        </Space>
    ),
});
