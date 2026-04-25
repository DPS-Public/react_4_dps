import React, { useState } from "react";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import {
  ApiOutlined,
  CaretRightOutlined,
  FormatPainterOutlined,
  LoadingOutlined,
  PlusOutlined,
  SaveOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CrudApiEndPoint from "@/components/api-canvas/CrudApiEndPoint";
import APICanvasCreateModal from "@/components/api-canvas/APICanvasCreateModal";
import CreateAPIInputDrawer from "@/components/api-canvas/Input/CreateAPIInputDrawer";
import APICanvasDuplicateModal from "@/components/api-canvas/APICanvasDuplicateModal";
import APICanvasUpdateModal from "@/components/api-canvas/APICanvasUpdateModal";
import UpdateAPIInputDrawer from "@/components/api-canvas/Input/UpdateAPIInputDrawer";
import OperationDescriptionCreateDrawer from "@/components/api-canvas/Operation/OperationDescriptionCreateDrawer";
import OperationDescriptionUpdateDrawer from "@/components/api-canvas/Operation/OperationDescriptionUpdateDrawer";
import RequestBody from "@/components/api-canvas/RequestBody/RequestBody";
import OperationDescription from "@/components/api-canvas/Operation/OperationDescription";
import ResponseBody from "@/components/api-canvas/ResponseBody/ResponseBody";
import OutputFields from "@/components/api-canvas/Output/OutputFields";
import APIRequestBodyDrawer from "@/components/api-canvas/RequestBody/APIRequestBodyDrawer";
import APIResponseBodyDrawer from "@/components/api-canvas/ResponseBody/APIResponseBodyDrawer";
import CreateOutputFieldDrawer from "@/components/api-canvas/Output/CreateOutputFieldDrawer";
import UpdateOutputFieldDrawer from "@/components/api-canvas/Output/UpdateOutputFieldDrawer";
import InputParameters from "@/components/api-canvas/Input/ InputParameters";
import UICApiCanvasDescriptionDrawer from "@/ui-canvas/uic_api_canvas_description_drawer/uicAPICanvasDescriptionDrawer";
import UICanvasGithubFilesBrowserDrawer from "@/components/ui-canvas/common/UICanvasGithubFilesBrowserDrawer";
import { useUICApiCanvasState } from "../hooks/useUICApiCanvasState";
import { useUICApiCanvasCollapse } from "../hooks/useUICApiCanvasCollapse";
import type { MotionProps } from "../types/MotionProps.interface";
import { useUICApiCanvasDescriptionUpdate } from "../hooks/useUICApiCanvasDescriptionUpdate";
import UICApiCanvasDescriptionPanel from "./UICApiCanvasDescriptionPanel";
import APICanvasAIDrawer from "@/components/api-canvas/APICanvasAIDrawer";
import APICanvasLivePreviewModal from "@/components/api-canvas/APICanvasLivePreviewModal";
import APICanvasAnalyzerDrawer from "@/components/api-canvas/APICanvasAnalyzerDrawer";
import FirstCanvasSetupCard from "@/components/empty-states/FirstCanvasSetupCard";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const { Text } = Typography;
const iconClassName = "text-[18px] text-[#1677ff]";

export default function UICApiCanvasContent(motionProps: MotionProps) {
  const [formatJsonTrigger, setFormatJsonTrigger] = useState(0);
  const [descriptionPanelKey, setDescriptionPanelKey] = useState<string | string[]>("description");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isOpenDescriptionDrawer, setIsOpenDescriptionDrawer] = useState(false);
  const [isOpenAIDrawer, setIsOpenAIDrawer] = useState(false);
  const [isOpenAnalyzerDrawer, setIsOpenAnalyzerDrawer] = useState(false);
  const [isOpenPreviewModal, setIsOpenPreviewModal] = useState(false);
  const [isOpenGithubFilesDrawer, setIsOpenGithubFilesDrawer] = useState(false);
  const apiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.apiCanvases);
  const { activeKey: sectionActiveKey, onChangeCollapse: onChangeSectionCollapse } = useUICApiCanvasCollapse();
  const {
    selectedEndpoint,
    setSelectedEndpoint,
    isDrawerVisible,
    setIsDrawerVisible,
    isCreateOperationDrawerVisible,
    setIsCreateOperationDrawerVisible,
    isUpdateOperationDrawerVisible,
    setIsUpdateOperationDrawerVisible,
    isCreateInputDrawerVisible,
    setIsCreateInputDrawerVisible,
    isUpdateInputDrawerVisible,
    setIsUpdateInputDrawerVisible,
    isCreateOutputDrawerVisible,
    setIsCreateOutputDrawerVisible,
    isUpdateOutputDrawerVisible,
    setIsUpdateOutputDrawerVisible,
    editingInput,
    editingOutput,
    editingOperation,
    newEndpoint,
    setNewEndpoint,
    operationForm,
    setOperationForm,
    addCanvas,
    addInput,
    addOutput,
    addOperation,
    updateInput,
    createInput,
    updateOutput,
    createOutput,
    deleteInput,
    deleteOutput,
    updateRequestBody,
    updateResponseBody,
    updateOperation,
    inputColumns,
    outputColumns,
    operationColumns,
    moveRow,
    updateNameAndConfig,
    updateEndpoint,
    getMethodColor,
    filteredEndpoints,
    duplicateAPICanvas,
    handleEndpointChange,
    isCopyEndpointModalVisible,
    setIsCopyEndpointModalVisible,
    isEditEndpointModalVisible,
    setIsEditEndpointModalVisible,
    deleteEndpoint,
    createOperation,
    deleteOperationDescription,
    isRequestBodyDrawerVisible,
    setIsRequestBodyDrawerVisible,
    isResponseBodyDrawerVisible,
    setIsResponseBodyDrawerVisible,
    setIsExportCanvasModalVisible,
    apiCanvasRef,
    loading,
  } = useUICApiCanvasState();
  const { createDescription } = useUICApiCanvasDescriptionUpdate({
    selectedAPICanvasId: selectedEndpoint?.id,
  });

  React.useEffect(() => {
    setDescriptionValue(selectedEndpoint?.description || "");
  }, [selectedEndpoint?.description, selectedEndpoint?.id]);

  const actionButtonStyle = {
    width: 32,
    height: 32,
    minWidth: 32,
    maxWidth: 32,
    minHeight: 32,
    maxHeight: 32,
    padding: 0,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const renderHeaderIconButton = (icon: React.ReactNode, onClick: (event: React.MouseEvent<HTMLElement>) => void) => (
    <Button
      type="text"
      icon={icon}
      onClick={onClick}
      style={actionButtonStyle}
    />
  );

  const isSectionOpen = (sectionKey: string) =>
    Array.isArray(sectionActiveKey) ? sectionActiveKey.includes(sectionKey) : sectionActiveKey === sectionKey;

  const showFirstApiCanvasSetupCard = !loading && apiCanvasCatalog.length === 0;

  const toggleSection = (sectionKey: string) => {
    const currentKeys = Array.isArray(sectionActiveKey)
      ? sectionActiveKey
      : sectionActiveKey
        ? [sectionActiveKey]
        : [];

    const nextKeys = currentKeys.includes(sectionKey)
      ? currentKeys.filter((key) => key !== sectionKey)
      : [...currentKeys, sectionKey];

    onChangeSectionCollapse(nextKeys);
  };

  const sectionItems = [
    {
      key: "input-fields",
      title: "Input Fields",
      actions: (
        <div style={{ display: "flex", alignItems: "center", minHeight: 24 }}>
          {renderHeaderIconButton(
            <PlusOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              addInput();
            },
          )}
        </div>
      ),
      content: (
        <div style={{ minHeight: 150 }}>
          <InputParameters
            selectedEndpoint={selectedEndpoint}
            moveRow={moveRow}
            inputColumns={inputColumns}
          />
        </div>
      ),
    },
    {
      key: "request-body",
      title: "Request Body",
      actions: (
        <Space align="center">
          <Button
            type="default"
            size="small"
            icon={<FormatPainterOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              setFormatJsonTrigger((prev) => prev + 1);
            }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Beautify
          </Button>
          {renderHeaderIconButton(
            <SaveOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              setIsRequestBodyDrawerVisible(true);
            },
          )}
        </Space>
      ),
      content: (
        <div style={{ minHeight: 150 }}>
          <RequestBody
            selectedEndpoint={selectedEndpoint}
            formatJsonTrigger={formatJsonTrigger}
          />
        </div>
      ),
    },
    {
      key: "operation-description",
      title: "Operation Description",
      actions: (
        <div style={{ display: "flex", alignItems: "center", minHeight: 24 }}>
          {renderHeaderIconButton(
            <PlusOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              addOperation();
            },
          )}
        </div>
      ),
      content: (
        <div style={{ minHeight: 150 }}>
          <OperationDescription
            selectedEndpoint={selectedEndpoint}
            moveRow={moveRow}
            operationColumns={operationColumns}
          />
        </div>
      ),
    },
    {
      key: "output-fields",
      title: "Output Fields",
      actions: (
        <div style={{ display: "flex", alignItems: "center", minHeight: 24 }}>
          {renderHeaderIconButton(
            <PlusOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              addOutput();
            },
          )}
        </div>
      ),
      content: (
        <div style={{ minHeight: 150 }}>
          <OutputFields
            selectedEndpoint={selectedEndpoint}
            moveRow={moveRow}
            outputColumns={outputColumns}
          />
        </div>
      ),
    },
    {
      key: "response-body",
      title: "Response Body",
      actions: (
        <Space align="center">
          <Button
            type="default"
            size="small"
            icon={<FormatPainterOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              setFormatJsonTrigger((prev) => prev + 1);
            }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Beautify
          </Button>
          {renderHeaderIconButton(
            <SaveOutlined className={iconClassName} />,
            (event) => {
              event.stopPropagation();
              setIsResponseBodyDrawerVisible(true);
            },
          )}
        </Space>
      ),
      content: (
        <div style={{ minHeight: 150 }}>
          <ResponseBody
            selectedEndpoint={selectedEndpoint}
            formatJsonTrigger={formatJsonTrigger}
          />
        </div>
      ),
    },
  ];

  const renderSectionBlock = (sectionItem: (typeof sectionItems)[number]) => (
    <div
      key={sectionItem.key}
      style={{
        background: "#ffffff",
        border: "1px solid #f0f0f0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => toggleSection(sectionItem.key)}
        style={{
          minHeight: 68,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          background: "#ffffff",
        }}
      >
        <div className="flex items-center min-h-6">
          <div className="flex items-center justify-center w-5 h-5 mr-3">
            <CaretRightOutlined rotate={isSectionOpen(sectionItem.key) ? 90 : 0} style={{ lineHeight: 1 }} />
          </div>
          <span className="font-medium text-black leading-none">{sectionItem.title}</span>
        </div>
        <div className="flex items-center min-h-6">{sectionItem.actions}</div>
      </div>

      {isSectionOpen(sectionItem.key) ? (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f0f0f0", background: "#ffffff" }}>
          {sectionItem.content}
        </div>
      ) : null}
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <motion.div {...motionProps} style={{ padding: "24px", height: "100%" }}>
        {loading ? (
          <div className="grid place-items-center">
            <LoadingOutlined className="text-4xl text-gray-400 mx-auto my-16" />
          </div>
        ) : (
          <Row gutter={24} style={{ height: "100%" }}>
            <Col span={24}>
              <CrudApiEndPoint
                endpoints={filteredEndpoints}
                selectedEndpoint={selectedEndpoint}
                setSelectedEndpoint={setSelectedEndpoint}
                handleEndpointChange={handleEndpointChange}
                getMethodColor={getMethodColor}
                setIsDrawerVisible={setIsDrawerVisible}
                setIsCopyEndpointModalVisible={setIsCopyEndpointModalVisible}
                setIsEditEndpointModalVisible={setIsEditEndpointModalVisible}
                setIsExportCanvasModalVisible={setIsExportCanvasModalVisible}
                targetRef={apiCanvasRef}
                onPreview={() => setIsOpenPreviewModal(true)}
                onAI={() => setIsOpenAIDrawer(true)}
                onAnalyze={() => setIsOpenAnalyzerDrawer(true)}
              />

              {showFirstApiCanvasSetupCard ? (
                <FirstCanvasSetupCard
                  title="Create your first API canvas"
                  description="API Canvas opens after your first endpoint is created. We will automatically place it into the dropdown for you."
                  buttonLabel="Create First API Canvas"
                  onCreate={() => setIsDrawerVisible(true)}
                  icon={<ApiOutlined />}
                  minHeight={560}
                />
              ) : selectedEndpoint ? (
                <Card
                  ref={apiCanvasRef}
                  className="h-full bg-transparent border-none"
                  style={{
                    height: "100%",
                    overflow: "auto",
                    borderRadius: "0 !important",
                    border: "none",
                  }}
                  styles={{ body: { padding: 0, background: "transparent" } }}
                >
                  <Space direction="vertical" className="w-full" size={10}>
                    <UICApiCanvasDescriptionPanel
                      activeKey={descriptionPanelKey}
                      onChangeCollapse={setDescriptionPanelKey}
                      description={descriptionValue}
                      setDescription={setDescriptionValue}
                      setIsOpenDescriptionDrawer={setIsOpenDescriptionDrawer}
                    />
                    {sectionItems.map(renderSectionBlock)}
                  </Space>
                </Card>
              ) : (
                <Card style={{ height: "100%" }}>
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      color: "#8c8c8c",
                    }}
                  >
                    <ApiOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
                    <Text className="text-xl font-semibold">Select an API to view details</Text>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        )}

        <APICanvasCreateModal
          isDrawerVisible={isDrawerVisible}
          setIsDrawerVisible={setIsDrawerVisible}
          newEndpoint={newEndpoint}
          setNewEndpoint={setNewEndpoint}
          addEndpoint={addCanvas}
        />

        <APICanvasUpdateModal
          open={isEditEndpointModalVisible}
          onClose={() => setIsEditEndpointModalVisible(false)}
          selectedEndpoint={selectedEndpoint}
          updateNameAndConfig={updateNameAndConfig}
          deleteEndpoint={deleteEndpoint}
        />

        <CreateAPIInputDrawer
          isInputDrawerVisible={isCreateInputDrawerVisible}
          setIsInputDrawerVisible={setIsCreateInputDrawerVisible}
          saveInput={createInput}
        />

        <UpdateAPIInputDrawer
          isInputDrawerVisible={isUpdateInputDrawerVisible}
          setIsInputDrawerVisible={setIsUpdateInputDrawerVisible}
          saveInput={updateInput}
          editingInput={editingInput}
          deleteInput={deleteInput}
        />

        <APIRequestBodyDrawer
          isRequestBodyDrawerVisible={isRequestBodyDrawerVisible}
          setIsRequestBodyDrawerVisible={setIsRequestBodyDrawerVisible}
          selectedEndpoint={selectedEndpoint}
          updateRequestBody={updateRequestBody}
        />

        <APIResponseBodyDrawer
          isResponseBodyDrawerVisible={isResponseBodyDrawerVisible}
          setIsResponseBodyDrawerVisible={setIsResponseBodyDrawerVisible}
          selectedEndpoint={selectedEndpoint}
          updateResponseBody={updateResponseBody}
        />

        <CreateOutputFieldDrawer
          isCreateOutputDrawerVisible={isCreateOutputDrawerVisible}
          setIsCreateOutputDrawerVisible={setIsCreateOutputDrawerVisible}
          createOutput={createOutput}
        />

        <UpdateOutputFieldDrawer
          isUpdateOutputDrawerVisible={isUpdateOutputDrawerVisible}
          setIsUpdateOutputDrawerVisible={setIsUpdateOutputDrawerVisible}
          updateOutput={updateOutput}
          editingOutput={editingOutput}
          deleteOutput={deleteOutput}
        />

        <OperationDescriptionCreateDrawer
          isCreateOperationDrawerVisible={isCreateOperationDrawerVisible}
          setIsCreateOperationDrawerVisible={setIsCreateOperationDrawerVisible}
          saveOperation={createOperation}
          operationForm={operationForm}
          setOperationForm={setOperationForm}
        />

        <OperationDescriptionUpdateDrawer
          isUpdateOperationDrawerVisible={isUpdateOperationDrawerVisible}
          setIsUpdateOperationDrawerVisible={setIsUpdateOperationDrawerVisible}
          saveOperation={updateOperation}
          operationForm={operationForm}
          setOperationForm={setOperationForm}
          editingOperation={editingOperation}
          deleteOperation={deleteOperationDescription}
        />

        <APICanvasDuplicateModal
          isCopyEndpointModalVisible={isCopyEndpointModalVisible}
          setIsCopyEndpointModalVisible={setIsCopyEndpointModalVisible}
          duplicateAPICanvas={duplicateAPICanvas}
          targetRef={apiCanvasRef}
        />

        <UICApiCanvasDescriptionDrawer
          open={isOpenDescriptionDrawer}
          onClose={() => setIsOpenDescriptionDrawer(false)}
          createDescription={createDescription}
          defaultDescription={selectedEndpoint?.description ?? ""}
        />

        <APICanvasAIDrawer
          open={isOpenAIDrawer}
          onClose={() => setIsOpenAIDrawer(false)}
          onOpenAnalyzer={() => {
            setIsOpenAIDrawer(false);
            setIsOpenAnalyzerDrawer(true);
          }}
          selectedEndpoint={selectedEndpoint}
          updateEndpoint={updateEndpoint}
        />

        <APICanvasAnalyzerDrawer
          open={isOpenAnalyzerDrawer}
          onClose={() => setIsOpenAnalyzerDrawer(false)}
          selectedEndpoint={selectedEndpoint}
          updateEndpoint={updateEndpoint}
        />

        <APICanvasLivePreviewModal
          open={isOpenPreviewModal}
          onClose={() => setIsOpenPreviewModal(false)}
          selectedEndpoint={selectedEndpoint}
        />
      </motion.div>
    </DndProvider>
  );
}
