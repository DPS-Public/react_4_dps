import React, { useEffect, useState } from "react";
import { Modal, Switch, Input, Button, message, Spin, Tooltip } from "antd";
import { CopyOutlined, LinkOutlined } from "@ant-design/icons";
import { serviceUpdateCanvasShare } from "@/ui-canvas/uic_ui_canvas/services/serviceUpdateCanvasShare";

interface UICanvasShareModalProps {
  open: boolean;
  onClose: () => void;
  canvasId: string;
  canvasTitle: string;
  currentIsShared?: boolean;
  currentShareToken?: string;
}

export default function UICanvasShareModal({
  open,
  onClose,
  canvasId,
  canvasTitle,
  currentIsShared = false,
  currentShareToken = "",
}: UICanvasShareModalProps) {
  const [isShared, setIsShared] = useState(currentIsShared);
  const [shareToken, setShareToken] = useState(currentShareToken);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsShared(!!currentIsShared);
    setShareToken(currentShareToken || "");
  }, [open, currentIsShared, currentShareToken]);

  const shareUrl = shareToken 
    ? `${window.location.origin}/ui-canvas/share/${shareToken}` 
    : "";

  const handleShareToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const result = await serviceUpdateCanvasShare(canvasId, checked, shareToken);
      setIsShared(checked);
      setShareToken(result.shareToken || "");
      message.success(checked ? "Canvas shared successfully" : "Canvas unshared successfully");
    } catch (error) {
      console.error("❌ Share toggle error:", error);
      message.error("Failed to update share status");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateShareId = async () => {
    setLoading(true);
    try {
      const result = await serviceUpdateCanvasShare(canvasId, isShared, shareToken, true);
      setShareToken(result.shareToken || "");
      message.success("Share ID regenerated");
    } catch (error) {
      console.error("❌ Share ID regenerate error:", error);
      message.error("Failed to regenerate share ID");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    message.success("Copied to clipboard");
  };

  return (
    <Modal
      title={`Share: ${canvasTitle}`}
      open={open}
      onCancel={onClose}
      footer={(
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <Button onClick={handleRegenerateShareId} disabled={loading}>
            Generate New ID
          </Button>
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
      width={600}
    >
      <Spin spinning={loading}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Share Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Enable Public Sharing:</span>
            <Switch
              checked={isShared}
              onChange={handleShareToggle}
              disabled={loading}
            />
          </div>

          {/* Share Link Section */}
          {isShared && shareUrl && (
            <div style={{ 
              padding: 16, 
              backgroundColor: "#f5f5f5", 
              borderRadius: 8,
              border: "1px solid #e8e8e8"
            }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px 0" }}>
                  <LinkOutlined style={{ marginRight: 6 }} />
                  Public Share Link:
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={shareUrl}
                    readOnly
                    style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                  />
                  <Tooltip title="Copy to clipboard">
                    <Button
                      type="primary"
                      icon={<CopyOutlined />}
                      onClick={copyToClipboard}
                    />
                  </Tooltip>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "#999", marginTop: 12 }}>
                <p style={{ margin: "8px 0" }}>
                  ✓ Anyone with this link can view this canvas (read-only)
                </p>
                <p style={{ margin: "8px 0" }}>
                  ✓ No authentication required
                </p>
                <p style={{ margin: "8px 0" }}>
                  ✓ Changes you make will be visible to shared viewers
                </p>
              </div>
            </div>
          )}

          {/* Shared Info */}
          {isShared && (
            <div style={{ 
              padding: 12, 
              backgroundColor: "#e6f7ff", 
              borderRadius: 6,
              border: "1px solid #91d5ff"
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "#0050b3" }}>
                🔓 This canvas is currently public. Anyone with the share link can view it.
              </p>
            </div>
          )}

          {/* Private Info */}
          {!isShared && (
            <div style={{ 
              padding: 12, 
              backgroundColor: "#fff7e6", 
              borderRadius: 6,
              border: "1px solid #ffc069"
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "#ad6800" }}>
                🔒 This canvas is private. Only you can access it.
              </p>
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  );
}
