import { useRef, useState } from "react";

export function useUICanvasModalState() {
  type ExternalViewLinkAction =
    | "external_link"
    | "embedded_code"
    | "upload_image"
    | "clipboard_image"
    | null;

  const [isOpenUICreateModal, setIsOpenUICreateModal] = useState(false);
  const [isOpenUIUpdateModal, setIsOpenUIUpdateModal] = useState(false);
  const [editingUICanvas, setEditingUICanvas] = useState({ name: "" });
  const [isOpenUICanvasDuplicateModal, setIsOpenUICanvasDuplicateModal] = useState(false);
  const [isOpenUICanvasCreateInputModal, setIsOpenUICanvasCreateInputModal] = useState(false);
  const [isOpenUICanvasUpdateInputModal, setIsOpenUICanvasUpdateInputModal] = useState(false);
  const [apiCanvasDrawerData, setApiCanvasDrawerData] = useState({ open: false, data: null });
  const [uiCanvasPreviewDrawerData, setUICanvasPreviewDrawerData] = useState({
    open: false,
    data: null,
  });
  const [isOpenUICanvasCreateDescriptionModal, setIsOpenUICanvasCreateDescriptionModal] =
    useState(false);
  const [isOpenUICanvasActionsManualDescriptionDrawer, setIsOpenUICanvasActionsManualDescriptionDrawer] =
    useState(false);
  const [isOpenUICanvasActionsAPIRelationDrawer, setIsOpenUICanvasAPIRelationDrawer] =
    useState(false);
  const [isOpenUICanvasUpdateAPIRelationDrawer, setIsOpenUICanvasUpdateAPIRelationDrawer] =
    useState(false);
  const [
    isOpenUICanvasActionsComponentInformationUpdateDrawer,
    setIsOpenUICanvasActionsComponentInformationUpdateDrawer,
  ] = useState(false);
  const [isOpenUICanvasActionsTemplateDescriptionDrawer, setIsOpenUICanvasActionsTemplateDescriptionDrawer] =
    useState(false);
  const [isOpenUICanvasActionsTemplateDescriptionUpdateDrawer, setIsOpenUICanvasActionsTemplateDescriptionUpdateDrawer] =
    useState(false);
  const [isOpenUICanvasCreateFormActionDrawer, setIsOpenUICanvasCreateFormActionDrawer] =
    useState(false);
  const [isOpenUICanvasUpdateFormActionDrawer, setIsOpenUICanvasUpdateFormActionDrawer] =
    useState(false);
  const [isOpenUICanvasCreateIssueDrawer, setIsOpenUICanvasCreateIssueDrawer] = useState(false);
  const [isOpenUICanvasExternalViewLinksDrawer, setIsOpenUICanvasExternalViewLinksDrawer] =
    useState(false);
  const [externalViewLinkInitialAction, setExternalViewLinkInitialAction] =
    useState<ExternalViewLinkAction>(null);
  const [issueDrawerData, setIssueDrawerData] = useState({ open: false, data: null });
  const [isOpenAIDrawer, setIsOpenAIDrawer] = useState(false);
  const uiCanvasRef = useRef(null);

  function openUICreateModal() {
    setIsOpenUICreateModal(true);
  }

  function closeUICreateModal() {
    setIsOpenUICreateModal(false);
  }

  function openUIUpdateModal(editingUI: Record<string, unknown>) {
    setEditingUICanvas(editingUI);
    setIsOpenUIUpdateModal(true);
  }

  function closeUIUpdateModal() {
    setIsOpenUIUpdateModal(false);
  }

  function openUICanvasUpdateInputModal() {
    setIsOpenUICanvasUpdateInputModal(true);
  }

  function closeUICanvasUpdateInputModal() {
    setIsOpenUICanvasUpdateInputModal(false);
  }

  function openUICanvasCreateIssueDrawer() {
    setIsOpenUICanvasCreateIssueDrawer(true);
  }

  function closeUICanvasCreateIssueDrawer() {
    setIsOpenUICanvasCreateIssueDrawer(false);
  }

  function openUICanvasActionsAPIRelationDrawer() {
    setIsOpenUICanvasAPIRelationDrawer(true);
  }

  function closeUICanvasActionsAPIRelationDrawer() {
    setIsOpenUICanvasAPIRelationDrawer(false);
  }

  function openUICanvasCreateFormActionDrawer() {
    setIsOpenUICanvasCreateFormActionDrawer(true);
  }

  function closeUICanvasFormActionDrawer() {
    setIsOpenUICanvasCreateFormActionDrawer(false);
  }

  function openUICanvasUpdateFormActionDrawer() {
    setIsOpenUICanvasUpdateFormActionDrawer(true);
  }

  function closeUICanvasUpdateFormActionDrawer() {
    setIsOpenUICanvasUpdateFormActionDrawer(false);
  }

  function openUICanvasExternalViewLinksDrawer(action: ExternalViewLinkAction = null) {
    setExternalViewLinkInitialAction(action);
    setIsOpenUICanvasExternalViewLinksDrawer(true);
  }

  function closeUICanvasExternalViewLinksDrawer() {
    setIsOpenUICanvasExternalViewLinksDrawer(false);
    setExternalViewLinkInitialAction(null);
  }

  function openUICanvasUpdateAPIRelationDrawer() {
    setIsOpenUICanvasUpdateAPIRelationDrawer(true);
  }

  function closeUICanvasUpdateAPIRelationDrawer() {
    setIsOpenUICanvasUpdateAPIRelationDrawer(false);
  }

  function openUICanvasActionsComponentInformationUpdateDrawer() {
    setIsOpenUICanvasActionsComponentInformationUpdateDrawer(true);
  }

  function closeUICanvasActionsComponentInformationUpdateDrawer() {
    setIsOpenUICanvasActionsComponentInformationUpdateDrawer(false);
  }

  function openUICanvasActionsTemplateDescriptionDrawer() {
    setIsOpenUICanvasActionsTemplateDescriptionDrawer(true);
  }

  function closeUICanvasActionsTemplateDescriptionDrawer() {
    setIsOpenUICanvasActionsTemplateDescriptionDrawer(false);
  }

  function openUICanvasActionsTemplateDescriptionUpdateDrawer() {
    setIsOpenUICanvasActionsTemplateDescriptionUpdateDrawer(true);
  }

  function closeUICanvasActionsTemplateDescriptionUpdateDrawer() {
    setIsOpenUICanvasActionsTemplateDescriptionUpdateDrawer(false);
  }

  function closeUICanvasPreviewDrawer() {
    setUICanvasPreviewDrawerData({ open: false, data: null });
  }

  function closeAPICanvasDrawer() {
    setApiCanvasDrawerData({ open: false, data: null });
  }

  function closeBacklogIssueDrawer() {
    setIssueDrawerData({ open: false, data: null });
  }

  return {
    apiCanvasDrawerData,
    closeAPICanvasDrawer,
    closeBacklogIssueDrawer,
    closeUICanvasActionsAPIRelationDrawer,
    closeUICanvasActionsComponentInformationUpdateDrawer,
    closeUICanvasActionsTemplateDescriptionDrawer,
    closeUICanvasActionsTemplateDescriptionUpdateDrawer,
    closeUICanvasCreateIssueDrawer,
    closeUICanvasExternalViewLinksDrawer,
    closeUICanvasFormActionDrawer,
    closeUICanvasPreviewDrawer,
    closeUICanvasUpdateAPIRelationDrawer,
    closeUICanvasUpdateFormActionDrawer,
    closeUICanvasUpdateInputModal,
    closeUICreateModal,
    closeUIUpdateModal,
    editingUICanvas,
    isOpenAIDrawer,
    isOpenUICanvasActionsAPIRelationDrawer,
    isOpenUICanvasActionsComponentInformationUpdateDrawer,
    isOpenUICanvasActionsManualDescriptionDrawer,
    isOpenUICanvasActionsTemplateDescriptionDrawer,
    isOpenUICanvasActionsTemplateDescriptionUpdateDrawer,
    isOpenUICanvasCreateDescriptionModal,
    isOpenUICanvasCreateFormActionDrawer,
    isOpenUICanvasCreateInputModal,
    isOpenUICanvasCreateIssueDrawer,
    isOpenUICanvasDuplicateModal,
    isOpenUICanvasExternalViewLinksDrawer,
    isOpenUICanvasUpdateAPIRelationDrawer,
    isOpenUICanvasUpdateFormActionDrawer,
    isOpenUICanvasUpdateInputModal,
    isOpenUICreateModal,
    isOpenUIUpdateModal,
    issueDrawerData,
    openUICanvasActionsAPIRelationDrawer,
    openUICanvasActionsComponentInformationUpdateDrawer,
    openUICanvasActionsTemplateDescriptionDrawer,
    openUICanvasActionsTemplateDescriptionUpdateDrawer,
    openUICanvasCreateFormActionDrawer,
    openUICanvasCreateIssueDrawer,
    openUICanvasExternalViewLinksDrawer,
    externalViewLinkInitialAction,
    openUICanvasUpdateAPIRelationDrawer,
    openUICanvasUpdateFormActionDrawer,
    openUICanvasUpdateInputModal,
    openUICreateModal,
    openUIUpdateModal,
    setApiCanvasDrawerData,
    setEditingUICanvas,
    setIsOpenAIDrawer,
    setIsOpenUICanvasActionsManualDescriptionDrawer,
    setIsOpenUICanvasCreateDescriptionModal,
    setIsOpenUICanvasCreateInputModal,
    setIsOpenUICanvasDuplicateModal,
    setIssueDrawerData,
    setUICanvasPreviewDrawerData,
    uiCanvasPreviewDrawerData,
    uiCanvasRef,
  };
}
