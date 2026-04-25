import React from 'react';
import { Modal, Input, Button, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

interface ShareIssueModalProps {
  open: boolean;
  onClose: () => void;
  issueId: string;
  issueNo: number;
}

const ShareIssueModal: React.FC<ShareIssueModalProps> = ({
  open,
  onClose,
  issueId,
  issueNo,
}) => {
  const shareUrl = `${window.location.origin}${window.location.pathname}?key=${issueId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    message.success('Link copied to clipboard!');
  };

  return (
    <Modal
      title={`Share issue #${issueNo}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700">
            Share link
          </label>
          <Input
            value={shareUrl}
            readOnly
            size="large"
            suffix={
              <Button
                type="link"
                icon={<LinkOutlined />}
                onClick={handleCopyLink}
                style={{ paddingInline: 0 }}
              >
                Copy link
              </Button>
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default ShareIssueModal;

