import React, { useCallback, useState } from "react";
import { Card, Col, Modal, Row, Space } from "antd";
import { AppstoreOutlined, LoadingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { useUICanvasStates } from "./hooks/useUICanvasStates.tsx";
import { useUICanvasCollapse } from "./hooks/useUICanvasCollapse";
import type { MotionProps } from "./types/MotionProps.interface";

import UICanvasHeading from "./components/UICanvasHeading.tsx";
import UICanvasDescriptionPanel from "./components/UICanvasDescriptionPanel";
import UICanvasUACPanel from "./components/UICanvasUACPanel";
import UICanvasUIViewPanel from "./components/UICanvasUIViewPanel";
import UICanvasInputPanel from "./components/UICanvasInputPanel";

import UICanvasActionsComponentInformationUpdateDrawer from "@/ui-canvas/uic_ui_canvas_actions_component_information_update_drawer/uicUICanvasActionsComponentInformationUpdateDrawer";
import UICanvasTemplateDescriptionCreateDrawer from "@/components/ui-canvas/template-description/UICanvasTemplateDescriptionCreateDrawer.tsx";
import UICanvasTemplateDescriptionUpdateDrawer from "@/components/ui-canvas/template-description/UICanvasTemplateDescriptionUpdateDrawer.tsx";
import APICanvasDetailsDrawer from "@/components/ui-canvas/common/APICanvasDetailsDrawer.tsx";
import UICanvasActionsAPICallDrawer from "@/ui-canvas/uic_ui_canvas_actions_api_call_drawer/uicUICanvasActionsAPICallDrawer";
import UICanvasActionsAPICallUpdateDrawer from "@/ui-canvas/uic_ui_canvas_actions_api_call_update_drawer/uicUICanvasActionsAPICallUpdateDrawer";
import UICanvasUpdateInputDrawer from "@/components/ui-canvas/input/UICanvasUpdateInputDrawer.tsx";
import UICanvasCreateDescriptionDrawer from "@/components/ui-canvas/description/UICanvasCreateDescriptionDrawer.tsx";
import UICanvasCreateInputDrawer from "@/components/ui-canvas/input/UICanvasCreateInputDrawer.tsx";
import UICanvasActionsManualDescriptionCreateDrawer from "@/ui-canvas/uic_ui_canvas_actions_manual_description_create_drawer/uicUICanvasActionsManualDescriptionCreateDrawer.tsx";
import UICanvasCardCreateModal from "@/components/ui-canvas/common/UICanvasCardCreateModal.tsx";
import UICanvasCardUpdateModal from "@/components/ui-canvas/common/UICanvasCardUpdateModal.tsx";
import UICanvasDuplicateModal from "@/components/ui-canvas/common/UICanvasDuplicateModal.tsx";
import CreateIssueDrawer from "@/ui-canvas/uic_backlog_canvas_create_issue/uicBacklogCanvasCreateIssue";
import UICanvasExternalLinksDrawer from "@/components/ui-canvas/external-view-link/UICanvasExternalLinksDrawer.tsx";
import BacklogTableDrawer from "@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogTableDrawer";
import { IssueProvider } from "@/ui-canvas/uic_backlog_canvas/context/issueContext";
import UICanvasAIDrawer from "@/components/ui-canvas/UICanvasAIDrawer/index";
import UICanvasAnalyzerDrawer from "@/components/ui-canvas/UICanvasAnalyzerDrawer";
import type { SelectedManualDescriptionAction } from "@/ui-canvas/uic_ui_canvas/types/SelectedManualDescriptionAction.interface";
import UICanvasActionsManualDescriptionUpdateDrawer from "@/ui-canvas/uic_ui_canvas_actions_manual_description_update_drawer/uicUICanvasActionsManualDescriptionUpdateDrawer";
import useUICanvasManualDescriptionDelete from "@/ui-canvas/uic_ui_canvas/hooks/input/action/manual-description/useUICanvasManualDescriptionDelete.tsx";
import useUICanvasManualDescriptionUpdate from "@/ui-canvas/uic_ui_canvas/hooks/input/action/manual-description/useUICanvasManualDescriptionUpdate.tsx";
import UICanvasActionsFormActionDrawer from "@/ui-canvas/uic_ui_canvas_actions_form_action_drawer/uicUICanvasActionsFormActionDrawer";
import FirstCanvasSetupCard from "@/components/empty-states/FirstCanvasSetupCard";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface UICanvasProps extends MotionProps {
  previewMode?: boolean;
  forcedCanvasId?: string;
  onClosePreview?: () => void;
}

const UICanvas: React.FC<UICanvasProps> = ({
  previewMode = false,
  forcedCanvasId,
  onClosePreview,
  ...motionProps
}) => {
  const uiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.uiCanvases);
  const [isOpenManualDescriptionUpdateDrawer, setIsOpenManualDescriptionUpdateDrawer] =
    useState(false);
  const [isOpenAnalyzerDrawer, setIsOpenAnalyzerDrawer] = useState(false);
  const [selectedManualDescriptionAction, setSelectedManualDescriptionAction] =
    useState<SelectedManualDescriptionAction | null>(null);

  const openUICanvasActionsManualDescriptionUpdateDrawer = useCallback(
    (action: SelectedManualDescriptionAction | null) => {
      setSelectedManualDescriptionAction(action);
      setIsOpenManualDescriptionUpdateDrawer(Boolean(action));
    },
    [],
  );

  const {
    selectedUI, uiList, isOpenUICreateModal, openUICreateModal,
    isOpenUIUpdateModal, openUIUpdateModal, closeUIUpdateModal, closeUICreateModal,
    createUICanvas, onChangeUI, updateUICanvasName, setDescription, loading,
    editingUICanvas, deleteUICanvas, isOpenUICanvasDuplicateModal,
    setIsOpenUICanvasDuplicateModal, uiCanvasRef, duplicateUICanvas, duplicateSteps, createInput,
    isOpenUICanvasCreateInputModal, setIsOpenUICanvasCreateInputModal, inputColumns,
    inputTableData, selectedUICanvasId, isOpenUICanvasCreateDescriptionModal,
    setIsOpenUICanvasCreateDescriptionModal, createDescription, apiCanvasDrawerData,
    closeAPICanvasDrawer, isOpenUICanvasActionsAPIRelationDrawer,
    closeUICanvasActionsAPIRelationDrawer, createAPICallRelation,
    selectedInput, moveRow,
    closeUICanvasActionsComponentInformationUpdateDrawer, isOpenUICanvasActionsComponentInformationUpdateDrawer,
    updateComponentInformation, closeUICanvasActionsTemplateDescriptionDrawer,
    isOpenUICanvasActionsTemplateDescriptionDrawer, templateDescriptionCreate,
    isOpenUICanvasUpdateInputModal, closeUICanvasUpdateInputModal, updateInput,
    isOpenUICanvasUpdateAPIRelationDrawer,
    closeUICanvasUpdateAPIRelationDrawer, updateAPICallRelation, deleteAPIRelation,
    isOpenUICanvasCreateFormActionDrawer,
    closeUICanvasFormActionDrawer, createFormAction, closeUICanvasPreviewDrawer,
    uiCanvasPreviewDrawerData, setUICanvasPreviewDrawerData, updateFormAction,
    closeUICanvasUpdateFormActionDrawer, isOpenUICanvasUpdateFormActionDrawer,
    deleteFormAction, selectedUICanvasInputRows, deleteInput, setSelectedUICanvasInputRows, selectedDescriptions, descriptionsBulkDelete,
    isOpenUICanvasCreateIssueDrawer, openUICanvasCreateIssueDrawer,
    closeUICanvasCreateIssueDrawer, createBulkIssue, openUICanvasExternalViewLinksDrawer,
    isOpenUICanvasExternalViewLinksDrawer, closeUICanvasExternalViewLinksDrawer,
    externalViewLinkInitialAction, externalLinkData, externalViewLinkTableData, setIsShowIssueStats, selectedLink,
    setSelectedLink, closeBacklogIssueDrawer, issueDrawerData, setIssueDrawerData,
    closeUICanvasActionsTemplateDescriptionUpdateDrawer,
    isOpenUICanvasActionsTemplateDescriptionUpdateDrawer, templateDescriptionUpdate,
    createIssueData, isShowUIViewCSSColumn, setIsShowUIViewCSSColumn,
    handleActionInputDescription, isOpenAIDrawer, setIsOpenAIDrawer, handleAIDrawerCancel,
    inputDescriptionMainActions, selectedComponent, setSelectedComponent,
    selectedComponentInformationInput, setSelectedComponentInformationInput, openComponentInformationFromPrototype,
    createManualDescription, isOpenUICanvasActionsManualDescriptionDrawer,
    closeUICanvasActionsManualDescriptionCreateDrawer, selectedManualDescriptionCreateInput,
  } = useUICanvasStates({
    openUICanvasActionsManualDescriptionUpdateDrawer,
    forcedCanvasId,
    previewMode,
  });

  const { updateManualDescription } = useUICanvasManualDescriptionUpdate({
    selectedUICanvasId,
    selectedInput: selectedManualDescriptionAction,
  });
  const { deleteManualDescription } = useUICanvasManualDescriptionDelete({
    selectedUICanvasId,
  });

  const closeUICanvasActionsManualDescriptionUpdateDrawer = useCallback(() => {
    setIsOpenManualDescriptionUpdateDrawer(false);
    setSelectedManualDescriptionAction(null);
  }, []);

  const showFirstCanvasSetupCard = !previewMode && !loading && uiCanvasCatalog.length === 0;

  const handleCloseComponentInformationDrawer = useCallback(() => {
    setSelectedComponentInformationInput(null);
    closeUICanvasActionsComponentInformationUpdateDrawer();
  }, [closeUICanvasActionsComponentInformationUpdateDrawer, setSelectedComponentInformationInput]);

  const { activeKey, onChangeCollapse } = useUICanvasCollapse();

    const canvasBody = (
      <motion.div {...motionProps} style={{ padding: previewMode ? "12px" : "24px", height: previewMode ? "auto" : "100%" }}>
        {loading ? (
          <div className="grid place-items-center">
            <LoadingOutlined className="text-4xl text-gray-400 mx-auto my-16" />
          </div>
        ) : (
          <Row gutter={24} style={{ height: previewMode ? "auto" : "100%" }} ref={uiCanvasRef}>
            <Col span={24}>
              {!previewMode && (
                <UICanvasHeading
                  uiList={uiList}
                  selectedUI={selectedUI}
                  externalLinkData={externalLinkData}
                  onChangeUI={onChangeUI}
                  openUICreateModal={openUICreateModal}
                  openUIUpdateModal={openUIUpdateModal}
                  setIsOpenUICanvasDuplicateModal={setIsOpenUICanvasDuplicateModal}
                  targetRef={uiCanvasRef}
                  selectedUICanvasId={selectedUICanvasId}
                  setIsOpenAIDrawer={setIsOpenAIDrawer}
                  setIsOpenAnalyzerDrawer={setIsOpenAnalyzerDrawer}
                  readOnly={previewMode}
                />
              )}
              {showFirstCanvasSetupCard ? (
                <FirstCanvasSetupCard
                  title="Create your first UI canvas"
                  description="This module becomes active after you create your first UI canvas. We will automatically select it in the dropdown once it is created."
                  buttonLabel="Create First UI Canvas"
                  onCreate={openUICreateModal}
                  icon={<AppstoreOutlined />}
                  minHeight={560}
                />
              ) : (
                <Card className="h-full bg-transparent border-none" styles={{ body: { padding: 0 } }}>
                  <Row gutter={24} style={{ height: previewMode ? "auto" : "calc(100% - 60px)" }}>
                    <Col span={24}>
                      <Space direction="vertical" style={{ width: "100%" }} size="large">
                        <UICanvasDescriptionPanel
                          activeKey={activeKey}
                          onChangeCollapse={onChangeCollapse}
                          description={selectedUI?.description ?? ""}
                          setDescription={setDescription}
                          setIsOpenUICanvasCreateDescriptionModal={setIsOpenUICanvasCreateDescriptionModal}
                          readOnly={previewMode}
                        />
                        <UICanvasUACPanel
                          activeKey={activeKey}
                          onChangeCollapse={onChangeCollapse}
                          selectedUICanvasId={selectedUICanvasId}
                          criteria={selectedUI?.userAcceptanceCriteria ?? []}
                          onOpenIssueDrawer={(ids: string[]) => setIssueDrawerData({ open: true, data: { ids } })}
                          readOnly={previewMode}
                        />
                        <UICanvasUIViewPanel
                          activeKey={activeKey}
                          onChangeCollapse={onChangeCollapse}
                          selectedLink={selectedLink}
                          setSelectedLink={setSelectedLink}
                          externalLinkData={externalLinkData}
                          openUICanvasExternalViewLinksDrawer={openUICanvasExternalViewLinksDrawer}
                          isShowUIViewCSSColumn={isShowUIViewCSSColumn}
                          setIsShowUIViewCSSColumn={setIsShowUIViewCSSColumn}
                          selectedUICanvasId={selectedUICanvasId}
                          selectedComponent={selectedComponent}
                          setSelectedComponent={setSelectedComponent}
                          openComponentInformationFromPrototype={openComponentInformationFromPrototype}
                          onToggleCSSPanel={() => setIsShowUIViewCSSColumn((prev) => !prev)}
                          selectedUIInput={selectedUI?.input}
                          readOnly={previewMode}
                        />
                        <UICanvasInputPanel
                          activeKey={activeKey}
                          onChangeCollapse={onChangeCollapse}
                          inputDescriptionMainActions={inputDescriptionMainActions}
                          handleActionInputDescription={handleActionInputDescription}
                          setIsOpenUICanvasCreateInputModal={setIsOpenUICanvasCreateInputModal}
                          setIsShowIssueStats={setIsShowIssueStats}
                          selectedInputRows={selectedUICanvasInputRows}
                          inputsBulkDelete={async () => {
                            const ids = selectedUICanvasInputRows.map((r: { id: string }) => r.id);
                            setSelectedUICanvasInputRows([]);
                            await deleteInput(ids);
                          }}
                          selectedDescriptions={selectedDescriptions}
                          descriptionsBulkDelete={descriptionsBulkDelete}
                          openUICanvasCreateIssueDrawer={openUICanvasCreateIssueDrawer}
                          inputColumns={inputColumns}
                          inputTableData={inputTableData}
                          moveRow={moveRow}
                          readOnly={previewMode}
                        />
                      </Space>
                    </Col>
                  </Row>
                </Card>
              )}
            </Col>
          </Row>
        )}

        {/* Drawers & Modals */}
        {!previewMode && <UICanvasActionsComponentInformationUpdateDrawer
          open={isOpenUICanvasActionsComponentInformationUpdateDrawer}
          selectedUICanvasId={selectedUICanvasId}
          onClose={handleCloseComponentInformationDrawer}
          selectedInput={selectedComponentInformationInput ?? selectedInput}
          updateComponentInformation={updateComponentInformation}
        />}
        {!previewMode && <UICanvasTemplateDescriptionCreateDrawer
          open={isOpenUICanvasActionsTemplateDescriptionDrawer}
          onClose={closeUICanvasActionsTemplateDescriptionDrawer}
          templateDescriptionCreate={templateDescriptionCreate}
          selectedInput={selectedInput}
        />}
        {!previewMode && <UICanvasTemplateDescriptionUpdateDrawer
          open={isOpenUICanvasActionsTemplateDescriptionUpdateDrawer}
          onClose={closeUICanvasActionsTemplateDescriptionUpdateDrawer}
          templateDescriptionUpdate={templateDescriptionUpdate}
          selectedInput={selectedInput}
        />}
        <APICanvasDetailsDrawer
          open={apiCanvasDrawerData.open}
          onClose={closeAPICanvasDrawer}
          data={apiCanvasDrawerData.data}
        />
        {!previewMode && <UICanvasActionsAPICallDrawer
          mode="create"
          open={isOpenUICanvasActionsAPIRelationDrawer}
          onClose={closeUICanvasActionsAPIRelationDrawer}
          createAPICallRelation={createAPICallRelation}
          selectedInput={selectedInput}
        />}
        {!previewMode && <UICanvasActionsAPICallUpdateDrawer
          open={isOpenUICanvasUpdateAPIRelationDrawer}
          onClose={closeUICanvasUpdateAPIRelationDrawer}
          updateAPICallRelation={updateAPICallRelation}
          selectedInput={selectedInput}
          deleteAPIRelation={deleteAPIRelation}
        />}
        {!previewMode && <UICanvasUpdateInputDrawer
          selectedInput={selectedInput}
          open={isOpenUICanvasUpdateInputModal}
          onClose={closeUICanvasUpdateInputModal}
          updateInput={updateInput}
        />}
        {!previewMode && <UICanvasCreateDescriptionDrawer
          open={isOpenUICanvasCreateDescriptionModal}
          onClose={() => setIsOpenUICanvasCreateDescriptionModal(false)}
          createDescription={createDescription}
          defaultDescription={selectedUI?.description ?? ""}
        />}
        {!previewMode && <UICanvasActionsFormActionDrawer
          mode="create"
          open={isOpenUICanvasCreateFormActionDrawer}
          onClose={closeUICanvasFormActionDrawer}
          createFormAction={createFormAction}
          uiList={uiList}
          selectedInput={selectedInput}
        />}
        {!previewMode && <UICanvasActionsFormActionDrawer
          mode="update"
          open={isOpenUICanvasUpdateFormActionDrawer}
          onClose={closeUICanvasUpdateFormActionDrawer}
          updateFormAction={updateFormAction}
          uiList={uiList}
          selectedInput={selectedInput}
          deleteFormAction={deleteFormAction}
        />}
        {!previewMode && <UICanvasCreateInputDrawer
          open={isOpenUICanvasCreateInputModal}
          onClose={() => setIsOpenUICanvasCreateInputModal(false)}
          createInput={createInput}
        />}
        {!previewMode && <UICanvasActionsManualDescriptionCreateDrawer
          open={isOpenUICanvasActionsManualDescriptionDrawer}
          selectedInput={selectedManualDescriptionCreateInput}
          createManualDescription={createManualDescription}
          onClose={closeUICanvasActionsManualDescriptionCreateDrawer}
        />}
        {!previewMode && <UICanvasActionsManualDescriptionUpdateDrawer
          open={isOpenManualDescriptionUpdateDrawer}
          selectedUICanvasId={selectedUICanvasId}
          selectedAction={selectedManualDescriptionAction}
          updateManualDescription={updateManualDescription}
          deleteManualDescription={deleteManualDescription}
          onClose={closeUICanvasActionsManualDescriptionUpdateDrawer}
        />}
        {!previewMode && <UICanvasCardCreateModal
          open={isOpenUICreateModal}
          onClose={closeUICreateModal}
          createUICanvas={createUICanvas}
        />}
        {!previewMode && <UICanvasCardUpdateModal
          open={isOpenUIUpdateModal}
          onClose={closeUIUpdateModal}
          updateUICanvas={updateUICanvasName}
          selectedUI={selectedUI}
          editingUICanvas={editingUICanvas}
          deleteUICanvas={deleteUICanvas}
        />}
        {!previewMode && <UICanvasDuplicateModal
          isOpenUICanvasDuplicateModal={isOpenUICanvasDuplicateModal}
          setIsOpenUICanvasDuplicateModal={setIsOpenUICanvasDuplicateModal}
          targetRef={uiCanvasRef}
          duplicateUICanvas={duplicateUICanvas}
          onSelectDuplicated={onChangeUI}
          steps={duplicateSteps}
        />}
        {uiCanvasPreviewDrawerData.open && uiCanvasPreviewDrawerData.data?.id && (
          <Modal
            open={uiCanvasPreviewDrawerData.open}
            onCancel={closeUICanvasPreviewDrawer}
            footer={null}
            destroyOnClose
            width="90vw"
            style={{ top: 24 }}
            styles={{ body: { padding: 0, height: "80vh", overflow: "auto" } }}
            title={uiList.find((item) => item.id === uiCanvasPreviewDrawerData.data?.id)?.label || "UI Canvas Preview"}
          >
            <UICanvas previewMode={true} forcedCanvasId={uiCanvasPreviewDrawerData.data.id} onClosePreview={closeUICanvasPreviewDrawer} />
          </Modal>
        )}
        {!previewMode && <CreateIssueDrawer
          open={isOpenUICanvasCreateIssueDrawer}
          onClose={closeUICanvasCreateIssueDrawer}
          createIssue={createBulkIssue}
          data={createIssueData}
          selectedDescriptions={selectedDescriptions as string[]}
        />}
        {!previewMode && <UICanvasExternalLinksDrawer
          open={isOpenUICanvasExternalViewLinksDrawer}
          onClose={closeUICanvasExternalViewLinksDrawer}
          tableData={externalViewLinkTableData}
          initialAction={externalViewLinkInitialAction}
        />}
        <IssueProvider>
          <BacklogTableDrawer
            onClose={closeBacklogIssueDrawer}
            open={issueDrawerData.open}
            data={issueDrawerData.data}
          />
        </IssueProvider>
        {!previewMode && <UICanvasAIDrawer
          open={isOpenAIDrawer}
          onClose={handleAIDrawerCancel}
          canvasId={selectedUICanvasId}
          onOpenAnalyzer={() => {
            handleAIDrawerCancel();
            setIsOpenAnalyzerDrawer(true);
          }}
        />}
        {!previewMode && <UICanvasAnalyzerDrawer
          open={isOpenAnalyzerDrawer}
          onClose={() => setIsOpenAnalyzerDrawer(false)}
          selectedUI={selectedUI}
          inputTableData={inputTableData}
        />}
      </motion.div>
  );

  if (previewMode) {
    return canvasBody;
  }

  return <DndProvider backend={HTML5Backend}>{canvasBody}</DndProvider>;
};

export default UICanvas;
