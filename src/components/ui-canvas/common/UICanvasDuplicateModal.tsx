import React, { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Progress, Space, Tag, Empty } from "antd";
import { CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from "@ant-design/icons";
import * as htmlToImage from "html-to-image";
import type { DuplicateStep } from "@/ui-canvas/uic_ui_canvas/services/serviceDuplicateUICanvasWithProgress";

export default React.memo(
  UICanvasDuplicateModal,
  (prevProps, nextProps) =>
    prevProps.isOpenUICanvasDuplicateModal === nextProps.isOpenUICanvasDuplicateModal
);

function UICanvasDuplicateModal({
  isOpenUICanvasDuplicateModal,
  setIsOpenUICanvasDuplicateModal,
  duplicateUICanvas,
  onSelectDuplicated,
  targetRef,
  steps: initialSteps = [],
}: {
  isOpenUICanvasDuplicateModal: boolean;
  setIsOpenUICanvasDuplicateModal: (open: boolean) => void;
  duplicateUICanvas: (name: string) => Promise<string | null>;
  onSelectDuplicated?: (id: string) => void | Promise<void>;
  targetRef: React.RefObject<HTMLElement>;
  steps?: DuplicateStep[];
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [steps, setSteps] = useState<DuplicateStep[]>([]);
  const [isShowingProgress, setIsShowingProgress] = useState(false);

  // Update steps whenever initialSteps change (including the initial call from service)
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  // Modal açıldığında inputu temizle
  useEffect(() => {
    if (isOpenUICanvasDuplicateModal) {
      setName("");
      setSteps([]);
      setIsShowingProgress(false);
    }
  }, [isOpenUICanvasDuplicateModal]);

  const handleOk = async () => {
    if (name.trim()) {
      setLoading(true);
      setIsShowingProgress(true);
      
      try {
        const newCanvasId = await duplicateUICanvas(name.trim());
        if (newCanvasId) {
          await onSelectDuplicated?.(newCanvasId);
        }
        
        // Wait for clipboard operation
        if (targetRef.current) {
          try {
            const blob = await htmlToImage.toBlob(targetRef.current);
            if (blob) {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
            }
          } catch (e) {
            console.warn("Failed to copy image to clipboard:", e);
          }
        }

        setLoading(false);
        
        // Wait to show completion state, then close
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsShowingProgress(false);
        setIsOpenUICanvasDuplicateModal(false);
      } catch (e) {
        console.error("Duplication error:", e);
        setLoading(false);
        setIsShowingProgress(false);
      }
    }
  };

  const handleCancel = () => {
    if (!loading) {
      setIsOpenUICanvasDuplicateModal(false);
    }
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "in-progress":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;
      default:
        return <div style={{ width: "1em", height: "1em" }} />;
    }
  };

  const getStepTagColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in-progress":
        return "processing";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Modal
      title={isShowingProgress ? "Duplicating UI Canvas..." : "Duplicate UI Canvas"}
      open={isOpenUICanvasDuplicateModal}
      onCancel={handleCancel}
      footer={
        !isShowingProgress
          ? [
              <Button
                key="copy"
                type="primary"
                onClick={handleOk}
                className="leading-[22px]"
                disabled={!name.trim()}
                loading={loading}
              >
                Duplicate
              </Button>,
              <Button key="cancel" onClick={handleCancel}>
                Cancel
              </Button>,
            ]
          : []
      }
      closable={!loading}
      maskClosable={!loading}
      width={500}
    >
      {!isShowingProgress ? (
        <Form layout="vertical">
          <Form.Item label="Canvas Name" required>
            <Input
              placeholder="Enter Canvas Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={handleOk}
              disabled={loading}
              autoFocus
            />
          </Form.Item>
        </Form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.length === 0 ? (
            <Empty description="Preparing..." />
          ) : (
            <>
              <div>
                <Progress
                  percent={Math.round(progressPercent)}
                  status={
                    progressPercent === 100
                      ? "success"
                      : steps.some((s) => s.status === "error")
                      ? "exception"
                      : "active"
                  }
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      backgroundColor: "#fafafa",
                      borderRadius: 4,
                    }}
                  >
                    {getStepIcon(step.status)}
                    <span style={{ flex: 1, fontSize: 14 }}>{step.label}</span>
                    <Tag color={getStepTagColor(step.status)}>
                      {step.status === "in-progress" && "In Progress"}
                      {step.status === "completed" && "Done"}
                      {step.status === "error" && "Failed"}
                      {step.status === "pending" && "Pending"}
                    </Tag>
                  </div>
                ))}
              </div>

              {steps.some((s) => s.status === "error") && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#fff2f0",
                    border: "1px solid #ffccc7",
                    borderRadius: 4,
                    color: "#ff4d4f",
                    fontSize: 12,
                  }}
                >
                  {steps.find((s) => s.status === "error")?.errorMessage ||
                    "An error occurred during duplication"}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
