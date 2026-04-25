import React from 'react';
import { Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';

export const columnDescription: ColumnType<Commit> = {
    title:   'Description',
    key:     'message',
    ellipsis: true,
    width:   250,
    render: (_, record: Commit) => {
        const msg = record.commit?.message || record.message || 'No commit message';
        return (
            <Tooltip title={msg}>
                <span style={{
                    whiteSpace: 'nowrap', display: 'inline-block',
                    maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {msg}
                </span>
            </Tooltip>
        );
    },
};
