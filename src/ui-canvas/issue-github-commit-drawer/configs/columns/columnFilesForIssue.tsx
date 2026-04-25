import React from 'react';
import { Tooltip } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';
import { IssueColumnDeps } from '../../types/IssueColumnDeps';

/**
 * Table column: Files
 * Renders up to 3 clickable file names. "+N more" opens AllFilesModal.
 */
export const createColumnFilesForIssue = (deps: IssueColumnDeps): ColumnType<Commit> => ({
    title: 'Files',
    key:   'files',
    width: 250,
    render: (_, record: Commit) => {
        const files = record.files || [];
        if (files.length === 0) return <span>-</span>;

        const items = files.slice(0, 3).map((file, index) => {
            const fileName  = file.filename || file.path || 'Unknown';
            const shortName = fileName.split('/').pop() || fileName;
            return (
                <Tooltip key={index} title={`${fileName} (+${file.additions || 0} -${file.deletions || 0})`}>
                    <span
                        style={{ cursor: 'pointer', color: '#1890ff', textDecoration: 'underline', marginRight: 8, fontSize: 11, display: 'inline-block' }}
                        onClick={e => { e.stopPropagation(); deps.onLoadFileCode(record, file); }}
                    >
                        <FileOutlined style={{ marginRight: 2 }} />
                        {shortName}
                    </span>
                </Tooltip>
            );
        });

        if (files.length > 3) {
            items.push(
                <Tooltip key="more" title={`Click to view all ${files.length} files`}>
                    <span
                        style={{ cursor: 'pointer', color: '#1890ff', textDecoration: 'underline', fontSize: 11 }}
                        onClick={e => {
                            e.stopPropagation();
                            deps.setSelectedCommitForAllFiles(record);
                            deps.setAllFilesModalVisible(true);
                        }}
                    >
                        +{files.length - 3} more
                    </span>
                </Tooltip>
            );
        }

        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{items}</div>;
    },
});
