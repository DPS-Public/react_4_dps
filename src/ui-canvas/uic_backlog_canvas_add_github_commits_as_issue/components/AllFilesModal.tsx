import React from 'react';
import { Modal, Button, List, Tooltip } from 'antd';
import { FileOutlined, FileTextOutlined, GithubOutlined } from '@ant-design/icons';
import Commit from '../types/Commit.interface';
import { CommitFile } from '../types/Commit.interface';

interface AllFilesModalProps {
    visible: boolean;
    commit: Commit | null;
    onClose: () => void;
    onViewFile: (commit: Commit, file: CommitFile) => void;
}

/**
 * Modal: All Files in Commit
 * Opens when the user clicks "+N more" in the Files column.
 * Lists every changed file with +/- stats and a "View Changes" button.
 * Clicking a file name or "View Changes" closes this modal and opens FileChangesModal.
 *
 * Component layer — pure presentational, zero business logic.
 * Opened/closed by GithubCommitsDrawer via allFilesModalVisible state.
 */
const AllFilesModal: React.FC<AllFilesModalProps> = ({
    visible,
    commit,
    onClose,
    onViewFile,
}) => (
    <Modal
        title={
            <div>
                <GithubOutlined /> All Files in Commit
                {commit && (
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 'normal', color: '#666' }}>
                        {commit.sha.substring(0, 7)} –{' '}
                        {commit.commit?.message || commit.message || 'No message'}
                    </div>
                )}
            </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
            <Button key="close" onClick={onClose}>Close</Button>,
        ]}
        width="80%"
        style={{ top: 20 }}
    >
        {commit && (
            <List
                itemLayout="horizontal"
                dataSource={commit.files || []}
                renderItem={(file, index) => {
                    const fileName  = file.filename || file.path || 'Unknown file';
                    const shortName = fileName.split('/').pop() || fileName;

                    return (
                        <List.Item
                            key={index}
                            actions={[
                                <Button
                                    key="view"
                                    type="link"
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    onClick={() => {
                                        onViewFile(commit, file);
                                    }}
                                >
                                    View Changes
                                </Button>,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<FileOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                                title={
                                    <Tooltip title={fileName}>
                                        <span
                                            style={{ cursor: 'pointer', color: '#1890ff' }}
                                            onClick={() => {
                                                onViewFile(commit, file);
                                            }}
                                        >
                                            {shortName}
                                        </span>
                                    </Tooltip>
                                }
                                description={
                                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                                        <span style={{ color: '#52c41a' }}>+{file.additions || 0}</span>
                                        <span style={{ color: '#ff4d4f' }}>-{file.deletions || 0}</span>
                                        <span style={{ color: '#8c8c8c' }}>{file.changes || 0} changes</span>
                                        <span style={{
                                            backgroundColor: '#e6f7ff',
                                            border: '1px solid #91d5ff',
                                            borderRadius: 4, padding: '0 4px', color: '#1890ff',
                                        }}>
                                            {file.status || 'modified'}
                                        </span>
                                    </div>
                                }
                            />
                        </List.Item>
                    );
                }}
            />
        )}
    </Modal>
);

export default AllFilesModal;
