import React from 'react';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';

export const columnDate: ColumnType<Commit> = {
    title: 'Date',
    key:   'date',
    width: 180,
    render: (_, record: Commit) => {
        const dateStr = record.commit?.author?.date || record.author?.date || record.date || '';
        if (!dateStr) return 'Unknown';
        try {
            return <span style={{ whiteSpace: 'nowrap' }}>{new Date(dateStr).toLocaleString()}</span>;
        } catch {
            return <span style={{ whiteSpace: 'nowrap' }}>{dateStr}</span>;
        }
    },
};
