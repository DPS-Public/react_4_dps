import React, { useEffect, useState } from "react";
import { Button, Card, Select, Tag } from "antd";
import { EditOutlined, PlusCircleOutlined, RobotOutlined, SearchOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import ExportUICanvasSelect from "@/components/ui-canvas/common/ExportUICanvasSelect.tsx";
import UICanvasGithubFilesBrowserDrawer from "@/components/ui-canvas/common/UICanvasGithubFilesBrowserDrawer";
import { RootState } from "@/store";
import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

import { UICanvasHeadingProps } from "../types/UICanvasHeadingProps.interface";
import { useUICanvasGithubUrls } from "../hooks/useUICanvasGithubUrls.ts";
import { useUICanvasHeadingState } from "../hooks/useUICanvasHeadingState";
import { useUICanvasHistory } from "../hooks/useUICanvasHistory";
import { handleGenerateAI } from "../handlers/handleGenerateAI";
import { handleAddGithubFiles } from "../handlers/handleAddGithubFiles";
import { handleDeleteGithubUrl } from "../handlers/handleDeleteGithubUrl";
import { handleOpenHistoryDrawer } from "../handlers/handleOpenHistoryDrawer";
import { handleCloseHistoryDrawer } from "../handlers/handleCloseHistoryDrawer";
import { handleOpenGithubViewDrawer } from "../handlers/handleOpenGithubViewDrawer";
import { handleImportDPSFile } from "../handlers/handleImportDPSFile";
import { handleLinkGithubFile } from "../handlers/handleLinkGithubFile";
import UICanvasHeadingGitHubList from "./UICanvasHeadingGitHubList";
import UICanvasHeadingHistoryDrawer from "./UICanvasHeadingHistoryDrawer";
import UICanvasAnalyticsPanel from "./UICanvasAnalyticsPanel";

const { Option } = Select;

export default function UICanvasHeading({
  selectedUI,
  externalLinkData,
  onChangeUI,
  uiList,
  openUICreateModal,
  openUIUpdateModal,
  setIsOpenUICanvasDuplicateModal,
  targetRef,
  selectedUICanvasId,
  setIsOpenAIDrawer,
  setIsOpenAnalyzerDrawer,
  readOnly = false,
}: UICanvasHeadingProps) {
  const [sharedCanvasMap, setSharedCanvasMap] = useState<Record<string, boolean>>({});
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const {
    drawerState,
    setDrawerState,
    showImportModal,
    setShowImportModal,
    fileContent,
    setFileContent,
    importLoading,
    setImportLoading,
    addComponentDrawerOpen,
    setAddComponentDrawerOpen,
    historyDrawerOpen,
    setHistoryDrawerOpen,
  } = useUICanvasHeadingState();

  const currentUserData = JSON.parse(localStorage.getItem("userData") || "{}");
  const currentUserId = currentUserData?.uid || "";

  const { githubUrls, uiData } = useUICanvasGithubUrls({
    selectedUICanvasId,
    selectedUI,
  });

  const { historyDocument, historyError, setHistoryDocument, setHistoryError } = useUICanvasHistory({
    historyDrawerOpen,
    selectedUICanvasId,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSharedStatuses = async () => {
      if (!uiList?.length) {
        if (isMounted) setSharedCanvasMap({});
        return;
      }

      try {
        const sharedEntries = await Promise.all(
          uiList.map(async (item) => {
            const snap = await getDoc(doc(db, "ui_canvas", item.id));
            return [item.id, Boolean(snap.data()?.isShared)] as const;
          }),
        );

        if (!isMounted) return;

        setSharedCanvasMap(
          sharedEntries.reduce<Record<string, boolean>>((acc, [id, isShared]) => {
            acc[id] = isShared;
            return acc;
          }, {}),
        );
      } catch (error) {
        console.error("Failed to load shared canvas statuses", error);
      }
    };

    loadSharedStatuses();

    return () => {
      isMounted = false;
    };
  }, [uiList]);

  const displayGithubUrls = selectedUICanvasId ? githubUrls : selectedUI?.githubUrls || [];
  const isCanvasShared = (item: any): boolean => {
    if (typeof sharedCanvasMap[item.id] === "boolean") return sharedCanvasMap[item.id];
    if (typeof item?.isShared === "boolean") return item.isShared;
    if (selectedUI?.id === item.id && typeof selectedUI?.isShared === "boolean") return selectedUI.isShared;
    return false;
  };
  const getSelectedLabel = (item: any) => {
    if (!isCanvasShared(item)) return item.label;

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span>{item.label}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0 8px",
            borderRadius: 6,
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            color: "#389e0d",
            fontWeight: 600,
            lineHeight: "20px",
          }}
        >
          shared
        </span>
      </span>
    );
  };

  return (
    <>
      <Card styles={{ body: { padding: 16 } }} style={{ borderRadius: 8, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Select
            showSearch
            value={selectedUICanvasId ?? ""}
            placeholder="Load template"
            onChange={onChangeUI}
            disabled={readOnly}
            style={{ flex: "1", width: "100%" }}
            optionLabelProp="selectedLabel"
            filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
          >
            {[...uiList]
              .sort((a, b) => (a.label || "").toLowerCase().localeCompare((b.label || "").toLowerCase()))
              .map((item) => (
                <Option
                  key={item.id}
                  value={item.id}
                  label={item.label}
                  selectedLabel={getSelectedLabel(item)}
                  className="group"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.label}
                      {isCanvasShared(item) && <Tag color="green" style={{ marginInlineEnd: 0 }}>shared</Tag>}
                      {item.githubUrls && item.githubUrls.length > 0 && <Tag color="green">{item.githubUrls.length} GitHub</Tag>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          openUIUpdateModal(item);
                        }}
                      />
                    </div>
                  </div>
                </Option>
              ))}
          </Select>

          <Button type="primary" onClick={openUICreateModal} disabled={readOnly}>
            <PlusCircleOutlined style={{ fontSize: "20px" }} />
          </Button>

          {!readOnly && (
            <Button
              icon={<RobotOutlined style={{ color: selectedUICanvasId ? "#1677ff" : undefined }} />}
              onClick={() => {
                if (selectedUICanvasId) {
                  handleGenerateAI(setIsOpenAIDrawer);
                }
              }}
              disabled={!selectedUICanvasId}
              style={{
                background: "#ffffff",
                borderColor: "#d9d9d9",
                color: "#262626",
              }}
            >
              AI Assistant
            </Button>
          )}

          {!readOnly && (
            <Button
              icon={<SearchOutlined style={{ color: selectedUICanvasId ? "#1677ff" : undefined }} />}
              onClick={() => {
                if (selectedUICanvasId) {
                  setIsOpenAnalyzerDrawer(true);
                }
              }}
              disabled={!selectedUICanvasId}
              style={{
                background: "#ffffff",
                borderColor: "#d9d9d9",
                color: "#262626",
              }}
            >
              AI Analyzer
            </Button>
          )}

          {!readOnly && (
            <ExportUICanvasSelect
              data={selectedUI}
              externalLinks={externalLinkData}
              targetRef={targetRef}
              onDuplicate={() => setIsOpenUICanvasDuplicateModal(true)}
              disableDuplicate={!selectedUI}
              onHistory={() => handleOpenHistoryDrawer({ selectedUICanvasId, setHistoryDrawerOpen })}
              disableHistory={!selectedUICanvasId}
              onAI={() => handleGenerateAI(setIsOpenAIDrawer)}
              disableAI={readOnly}
              onAnalyze={() => setIsOpenAnalyzerDrawer(true)}
              disableAnalyze={readOnly || !selectedUICanvasId}
              showImportModal={showImportModal}
              setShowImportModal={setShowImportModal}
              importDPSFile={(importPayload) =>
                handleImportDPSFile({
                  fileContent: importPayload ?? fileContent,
                  currentProjectId: currentProject?.id,
                  targetUICanvasId: selectedUICanvasId || undefined,
                  importModes: (importPayload ?? fileContent as any)?.__importModes,
                  setImportLoading,
                  setShowImportModal,
                  setFileContent,
                  onChangeUI,
                })
              }
              handleImportCancel={() => {
                setShowImportModal(false);
                setFileContent(null);
              }}
              setFileContent={setFileContent}
              importLoading={importLoading}
              currentProject={currentProject}
            />
          )}
        </div>

        {!readOnly && (
          <UICanvasHeadingGitHubList
            selectedUICanvasId={selectedUICanvasId}
            githubUrls={displayGithubUrls}
            onOpenAddDrawer={() => setAddComponentDrawerOpen(true)}
            onOpenViewDrawer={(githubUrl) => handleOpenGithubViewDrawer({ githubUrl, setDrawerState })}
            onDeleteGithubUrl={(githubUrl) =>
              handleDeleteGithubUrl({
                selectedUICanvasId,
                githubUrl,
                currentUserId,
                currentUserData,
                uiCanvasLabel: uiData?.label,
              })
            }
          />
        )}

        <UICanvasAnalyticsPanel
          selectedUICanvasId={selectedUICanvasId}
          selectedUI={selectedUI}
          uiList={uiList}
          projectId={currentProject?.id}
          readOnly={readOnly}
          fixedView="general"
        />
      </Card>

      <UICanvasHeadingHistoryDrawer
        open={historyDrawerOpen}
        onClose={() =>
          handleCloseHistoryDrawer({
            setHistoryDrawerOpen,
            setHistoryDocument,
            setHistoryError,
          })
        }
        uiData={uiData}
        historyDocument={historyDocument}
        historyError={historyError}
      />

      {!readOnly && (
        <UICanvasGithubFilesBrowserDrawer
          open={addComponentDrawerOpen}
          mode="create"
          projectId={currentProject?.id}
          onClose={() => setAddComponentDrawerOpen(false)}
          onSubmitSelection={async (files) => {
            await handleAddGithubFiles({
              selectedUICanvasId,
              currentUserId,
              currentUserData,
              uiCanvasLabel: uiData?.label,
              parentId: null,
              files,
            });
          }}
        />
      )}

      {!readOnly && (
        <UICanvasGithubFilesBrowserDrawer
          open={drawerState.open}
          mode={drawerState.mode === "edit" ? "edit" : "view"}
          projectId={currentProject?.id}
          initialGithubUrl={drawerState.targetGithubUrl || null}
          onClose={() =>
            setDrawerState({
              open: false,
              mode: "create",
              parentId: null,
              targetGithubUrl: null,
            })
          }
          onSubmitSelection={
            drawerState.mode === "edit"
              ? async (files) => {
                  const nextFile = files[0];
                  if (!nextFile) {
                    return;
                  }

                  await handleLinkGithubFile({
                    selectedUICanvasId,
                    currentUserId,
                    currentUserData,
                    uiCanvasLabel: uiData?.label,
                    githubUrls,
                    targetGithubUrl: drawerState.targetGithubUrl || null,
                    payload: nextFile,
                  });
                }
              : undefined
          }
        />
      )}
    </>
  );
}
