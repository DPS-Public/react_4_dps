import React from 'react';
import type { ColumnType } from 'antd/es/table';
import Commit from '../../types/Commit.interface';

export const columnAuthor: ColumnType<Commit> = {
    title: 'Author',
    key:   'author',
    width: 180,
    render: (_, record: Commit) => {
        const authorName = record.commit?.author?.name || record.author?.name || 'Unknown';
        const authorLogin = record.author?.login || '';
        const avatarUrl   = record.author?.avatar_url || '';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {avatarUrl ? (
                    <img src={avatarUrl} alt={authorName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#999',
                    }}>
                        {authorName.charAt(0).toUpperCase()}
                    </div>
                )}
                {authorLogin && <span style={{ fontSize: 11, color: '#666' }}>{authorLogin}</span>}
            </div>
        );
    },
};
