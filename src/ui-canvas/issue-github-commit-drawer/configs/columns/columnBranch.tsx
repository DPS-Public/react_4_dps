import React from 'react';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/commitTypes.interface';

export const columnBranch: ColumnType<Commit> = {
    title: 'Branch',
    key:   'branch',
    width: 120,
    render: (_, record: Commit) => (
        <span style={{ whiteSpace: 'nowrap' }}>{record.branch || '-'}</span>
    ),
};
