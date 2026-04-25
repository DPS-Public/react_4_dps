import { Modal } from "antd";

export function handleUICanvasActionsAPICallUpdateDelete({
  deleteAPIRelation,
  relId,
  inputId,
  onSuccess,
  setIsDeleting,
}: {
  deleteAPIRelation?: (descriptionId: string, inputId: string) => Promise<boolean | void>;
  relId?: string;
  inputId?: string;
  onSuccess: () => void;
  setIsDeleting: (value: boolean) => void;
}) {
  if (!deleteAPIRelation || !relId || !inputId) {
    return;
  }

  Modal.confirm({
    content: "Are you sure to delete this API call?",
    okText: "Delete",
    cancelText: "Cancel",
    okButtonProps: { danger: true },
    onOk: async () => {
      setIsDeleting(true);
      try {
        const isSuccess = await deleteAPIRelation(relId, inputId);
        if (isSuccess === false) {
          return;
        }

        onSuccess();
      } finally {
        setIsDeleting(false);
      }
    },
  });
}
