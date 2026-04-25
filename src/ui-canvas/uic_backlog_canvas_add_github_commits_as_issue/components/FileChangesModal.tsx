import React from 'react';
import { Modal, Button, Spin, Empty } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import SelectedFile from '../types/SelectedFile.interface';
import { renderDiffLines } from '../utils/utilRenderDiffLines';
 

interface FileChangesModalProps {
    visible: boolean;
    file: SelectedFile | null;
    code: string;
    loading: boolean;
    onClose: () => void;
}

/**
 * Modal: File Changes
 * Opens when the user clicks a specific file name in the Files column.
 * Renders the unified diff for that exact file with stats in the header.
 *
 * Component layer — pure presentational, zero business logic.
 * Opened/closed by GithubCommitsDrawer via fileModalVisible state.
 */
const FileChangesModal: React.FC<FileChangesModalProps> = ({
    visible,
    file,
    code,
    loading,
    onClose,
}) => (
    <Modal
        title={
            <div>
                <GithubOutlined /> File Changes
                {file && (
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 'normal' }}>
                        <div style={{ color: '#666' }}>{file.filename}</div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                            <span style={{ color: '#52c41a' }}>+{file.additions}</span>
                            <span style={{ color: '#ff4d4f' }}>-{file.deletions}</span>
                            <span style={{ color: '#8c8c8c' }}>{file.changes} changes</span>
                            <span style={{
                                backgroundColor: '#e6f7ff', border: '1px solid #91d5ff',
                                borderRadius: 4, padding: '0 4px', fontSize: 11, color: '#1890ff',
                            }}>
                                {file.status}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
            <Button key="close" onClick={onClose}>Close</Button>,
        ]}
        width="90%"
        style={{ top: 20 }}
    >
        {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
            </div>
        ) : code ? (
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                <pre style={{
                    background: '#1e1e1e', padding: 16, borderRadius: 4,
                    fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace',
                    margin: 0, color: '#d4d4d4',
                }}>
                    {renderDiffLines(code)}
                </pre>
            </div>
        ) : (
            <Empty description="No code changes found" />
        )}
    </Modal>
);

export default FileChangesModal;
