import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Collapse, Empty, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, FileTextOutlined, PlusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { useAppSelector } from "@/store";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";
import useUICanvasDescriptionUpdate from "@/ui-canvas/uic_ui_canvas/hooks/description/useUICanvasDescriptionUpdate";
import IssueDetailDrawer from "@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogCanvasIssueDetailDrawer";
import CreateIssueDrawer from "@/ui-canvas/uic_backlog_canvas_create_issue/uicBacklogCanvasCreateIssue";

const { Text } = Typography;
const { TextArea } = Input;

interface UACTask {
  id: string;
  no?: number;
  description?: string;
  status?: string;
}

interface UACCriterion {
  id: string;
  title: string;
  description?: string;
  taskIds: string[];
}

interface UICanvasUACPanelProps {
  activeKey: string | string[];
  onChangeCollapse: (key: string | string[]) => void;
  selectedUICanvasId: string;
  criteria: UACCriterion[];
  onOpenIssueDrawer: (ids: string[]) => void;
  readOnly?: boolean;
}

const CLOSED_STATUSES = new Set(["closed", "done", "completed", "complete", "resolved"]);

const getTaskStatusTagColor = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "new":
      return "orange";
    case "draft":
      return "default";
    case "ongoing":
      return "green";
    case "waiting":
      return "lime";
    case "closed":
    case "done":
    case "completed":
    case "complete":
    case "resolved":
      return "blue";
    case "canceled":
    case "cancelled":
      return "error";
    default:
      return "blue";
  }
};

const getCriterionStatus = (tasks: UACTask[]) => {
  if (!tasks.length) {
    return { color: "default" as const, label: "Pending" };
  }

  const closedCount = tasks.filter((task) => CLOSED_STATUSES.has(String(task.status || "").toLowerCase())).length;

  if (closedCount === tasks.length) {
    return { color: "success" as const, label: "Done" };
  }

  if (closedCount > 0) {
    return { color: "processing" as const, label: "In Progress" };
  }

  return { color: "warning" as const, label: "Pending" };
};

const UICanvasUACPanel: React.FC<UICanvasUACPanelProps> = ({
  activeKey,
  onChangeCollapse,
  selectedUICanvasId,
  criteria,
  onOpenIssueDrawer,
  readOnly = false,
}) => {
  const { currentProject } = useAppSelector((state) => state.project);
  const { updateUICanvasField } = useUICanvasDescriptionUpdate({ selectedUICanvasId });

  const [tasks, setTasks] = useState<UACTask[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<UACTask | null>(null);
  const [isIssueDrawerOpen, setIsIssueDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inlineTaskCriterionId, setInlineTaskCriterionId] = useState<string | null>(null);
  const [isInlineTaskModalOpen, setIsInlineTaskModalOpen] = useState(false);
  const [inlineSelectedTaskIds, setInlineSelectedTaskIds] = useState<string[]>([]);
  const [isCreateIssueDrawerOpen, setIsCreateIssueDrawerOpen] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [previewCriterion, setPreviewCriterion] = useState<UACCriterion | null>(null);
  const [descriptionCriterion, setDescriptionCriterion] = useState<UACCriterion | null>(null);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
    const quillRef = useRef<ReactQuill | null>(null);
  const [criterionTitle, setCriterionTitle] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSavingCriterion, setIsSavingCriterion] = useState(false);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "blockquote", "code-block"],
      ["clean"],
    ],
  }), []);

  useEffect(() => {
    if (!currentProject?.id) {
      setTasks([]);
      return;
    }

    const unsubscribe = services.subscribeTasks(currentProject.id, (nextTasks: UACTask[]) => {
      setTasks(nextTasks || []);
    });

    return () => {
      unsubscribe?.();
    };
  }, [currentProject?.id]);

  const tasksById = useMemo(() => {
    return tasks.reduce<Record<string, UACTask>>((accumulator, task) => {
      accumulator[task.id] = task;
      return accumulator;
    }, {});
  }, [tasks]);

  const canvasTasks = useMemo(() => {
    return tasks.filter((task: any) => task?.uiCanvasId === selectedUICanvasId);
  }, [tasks, selectedUICanvasId]);

  const taskOptions = useMemo(() => {
    return canvasTasks.map((task) => ({
      label: `#${task.no ?? "-"} ${task.description ?? "Untitled task"}`,
      value: task.id,
    }));
  }, [canvasTasks]);

  const canvasTaskIds = useMemo(() => new Set(canvasTasks.map((task) => task.id)), [canvasTasks]);

  const normalizedCriteria = useMemo(() => {
    return (criteria || []).map((criterion) => {
      const relatedTasks = (criterion.taskIds || [])
        .map((taskId) => tasksById[taskId])
        .filter(Boolean);

      return {
        ...criterion,
        relatedTasks,
        status: getCriterionStatus(relatedTasks),
      };
    });
  }, [criteria, tasksById]);

  const completedCount = normalizedCriteria.filter((criterion) => criterion.status.label === "Done").length;

  const canvasIssueStats = useMemo(() => {
    const total = canvasTasks.length;
    const totalIds = canvasTasks.map((task: any) => task.id).filter(Boolean);
    const bugCount = canvasTasks.filter((task: any) => String(task?.type || "").toLowerCase() === "bug").length;
    const bugIds = canvasTasks
      .filter((task: any) => String(task?.type || "").toLowerCase() === "bug")
      .map((task: any) => task.id)
      .filter(Boolean);
    const newRequestCount = canvasTasks.filter((task: any) => String(task?.type || "").toLowerCase() === "new request").length;
    const newRequestIds = canvasTasks
      .filter((task: any) => String(task?.type || "").toLowerCase() === "new request")
      .map((task: any) => task.id)
      .filter(Boolean);
    const sh = canvasTasks.reduce((sum: number, task: any) => sum + Number(task?.sh || 0), 0);
    const shIds = canvasTasks
      .filter((task: any) => Number(task?.sh || task?.es || 0) > 0)
      .map((task: any) => task.id)
      .filter(Boolean);
    const eh = canvasTasks.reduce((sum: number, task: any) => sum + Number(task?.eh || 0), 0);
    const ehIds = canvasTasks
      .filter((task: any) => Number(task?.eh || 0) > 0)
      .map((task: any) => task.id)
      .filter(Boolean);

    const statusGroups = canvasTasks.reduce<Record<string, { count: number; ids: string[] }>>((accumulator: Record<string, { count: number; ids: string[] }>, task: any) => {
      const statusKey = String(task?.status || "new").toLowerCase();
      if (!accumulator[statusKey]) {
        accumulator[statusKey] = { count: 0, ids: [] };
      }

      accumulator[statusKey].count += 1;
      if (task?.id) {
        accumulator[statusKey].ids.push(task.id);
      }

      return accumulator;
    }, {});

    const typeGroups = canvasTasks.reduce<Record<string, { count: number; ids: string[] }>>((accumulator: Record<string, { count: number; ids: string[] }>, task: any) => {
      const typeKey = String(task?.type || "other");
      if (!accumulator[typeKey]) {
        accumulator[typeKey] = { count: 0, ids: [] };
      }

      accumulator[typeKey].count += 1;
      if (task?.id) {
        accumulator[typeKey].ids.push(task.id);
      }

      return accumulator;
    }, {});

    return {
      total,
      totalIds,
      bugCount,
      bugIds,
      newRequestCount,
      newRequestIds,
      sh,
      shIds,
      eh,
      ehIds,
      statusGroups,
      typeGroups,
    };
  }, [canvasTasks]);

  const openIssueList = (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    onOpenIssueDrawer(ids);
  };

  const resetModalState = () => {
    if (isSavingCriterion) {
      return;
    }

    setEditingCriterionId(null);
    setCriterionTitle("");
    setSelectedTaskIds([]);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingCriterionId(null);
    setCriterionTitle("");
    setSelectedTaskIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (criterion: UACCriterion) => {
    setEditingCriterionId(criterion.id);
    setCriterionTitle(criterion.title);
    setSelectedTaskIds((criterion.taskIds || []).filter((taskId) => canvasTaskIds.has(taskId)));
    setIsModalOpen(true);
  };

  const openDescriptionModal = (criterion: UACCriterion) => {
    setDescriptionCriterion(criterion);
  };

  const closeDescriptionModal = () => {
    if (isSavingDescription) {
      return;
    }

    setDescriptionCriterion(null);
  };

  const saveCriteria = async (nextCriteria: UACCriterion[]) => {
    const payload = nextCriteria.map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      taskIds: criterion.taskIds,
      ...(typeof criterion.description === "string" ? { description: criterion.description } : {}),
    }));

    await updateUICanvasField("userAcceptanceCriteria", payload);
  };

  const handleSaveCriterion = async () => {
    if (isSavingCriterion) {
      return;
    }

    const normalizedTitle = criterionTitle.trim();

    if (!normalizedTitle) {
      return;
    }

    const nextCriterion: UACCriterion = {
      id: editingCriterionId ?? crypto.randomUUID(),
      title: normalizedTitle,
      taskIds: selectedTaskIds,
    };

    const nextCriteria = editingCriterionId
      ? normalizedCriteria.map((criterion) =>
          criterion.id === editingCriterionId ? nextCriterion : {
            id: criterion.id,
            title: criterion.title,
            taskIds: criterion.taskIds,
          },
        )
      : [
          ...normalizedCriteria.map((criterion) => ({
            id: criterion.id,
            title: criterion.title,
            taskIds: criterion.taskIds,
          })),
          nextCriterion,
        ];

    setIsSavingCriterion(true);
    try {
      await saveCriteria(nextCriteria);
      if (editingCriterionId) {
        resetModalState();
        return;
      }

      setCriterionTitle("");
      setSelectedTaskIds([]);
    } finally {
      setIsSavingCriterion(false);
    }
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    const nextCriteria = normalizedCriteria
      .filter((criterion) => criterion.id !== criterionId)
      .map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        taskIds: criterion.taskIds,
      }));

    await saveCriteria(nextCriteria);
  };

  const handleDeleteCriterionFromEdit = () => {
    if (!editingCriterionId) {
      return;
    }

    Modal.confirm({
      title: "Delete criterion?",
      content: "This criterion will be removed from the UAC list.",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        await handleDeleteCriterion(editingCriterionId);
        resetModalState();
      },
    });
  };

  const handleSaveDescription = async () => {
    if (!descriptionCriterion?.id || isSavingDescription) {
      return;
    }

    setIsSavingDescription(true);
    try {
      const quill = quillRef.current?.getEditor();
      const rawHtml = quill?.root.innerHTML ?? "";
      const html = rawHtml === "<p><br></p>" ? "" : rawHtml;

      const nextCriteria = normalizedCriteria.map((criterion) => {
        if (criterion.id !== descriptionCriterion.id) {
          return {
            id: criterion.id,
            title: criterion.title,
            description: criterion.description,
            taskIds: criterion.taskIds,
          };
        }

        return {
          id: criterion.id,
          title: criterion.title,
          description: html,
          taskIds: criterion.taskIds,
        };
      });

      await saveCriteria(nextCriteria);
      closeDescriptionModal();
    } finally {
      setIsSavingDescription(false);
    }
  };

  const openInlineTaskModal = (criterion: UACCriterion) => {
    setInlineTaskCriterionId(criterion.id);
    setInlineSelectedTaskIds((criterion.taskIds || []).filter((taskId) => canvasTaskIds.has(taskId)));
    setIsInlineTaskModalOpen(true);
  };

  const closeInlineTaskModal = () => {
    setIsInlineTaskModalOpen(false);
    setInlineTaskCriterionId(null);
    setInlineSelectedTaskIds([]);
  };

  const handleOpenCreateIssueDrawer = () => {
    setIsInlineTaskModalOpen(false);
    setIsCreateIssueDrawerOpen(true);
  };

  const handleSaveInlineTasks = async () => {
    if (!inlineTaskCriterionId) {
      return;
    }

    const nextCriteria = normalizedCriteria.map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      taskIds: criterion.id === inlineTaskCriterionId ? inlineSelectedTaskIds : criterion.taskIds,
    }));

    await saveCriteria(nextCriteria);
    closeInlineTaskModal();
  };

  const handleRemoveTaskFromCriterion = async (criterionId: string, taskId: string) => {
    const nextCriteria = normalizedCriteria.map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      taskIds: criterion.id === criterionId ? criterion.taskIds.filter((currentTaskId) => currentTaskId !== taskId) : criterion.taskIds,
    }));

    await saveCriteria(nextCriteria);
  };

  const confirmRemoveTaskFromCriterion = (criterionId: string, task: UACTask) => {
    Modal.confirm({
      title: "Remove related task?",
      content: `Are you sure you want to remove #${task.no ?? "-"} from this criterion?`,
      okText: "Remove",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => handleRemoveTaskFromCriterion(criterionId, task.id),
    });
  };

  const handleOpenIssueDetail = (task: UACTask) => {
    setSelectedIssue(task);
    setIsIssueDrawerOpen(true);
  };

  const refreshSelectedIssue = async () => {
    if (!currentProject?.id || !selectedIssue?.id) {
      return;
    }

    const issueData = await services.getTaskById(currentProject.id, selectedIssue.id);
    if (issueData) {
      setSelectedIssue({
        id: selectedIssue.id,
        ...issueData,
      });
    }
  };

  const columns = [
    {
      title: "Criteria",
      dataIndex: "title",
      key: "title",
      render: (value: string, record: UACCriterion) => (
        <Space size={8} direction="vertical" align="start" style={{ maxWidth: 800, width: "100%" }}>
          <a
            href="#"
            className="uac-criteria-anchor"
            onClick={(event) => {
              event.preventDefault();
              setPreviewCriterion(record);
            }}
          >
            {value}
          </a>
        </Space>
      ),
    },
    ...(!readOnly
      ? [
          {
            title: "Related Issue(s)",
            dataIndex: "relatedTasks",
            key: "relatedTasks",
            render: (relatedTasks: UACTask[], record: UACCriterion) => {
              const hasTasks = relatedTasks.length > 0;

              return (
                <Space size={[6, 6]} wrap>
                  {!hasTasks && <Text type="secondary">No linked task</Text>}
                  {relatedTasks.map((task) => (
                    <Tooltip key={task.id} title={task.description ?? "Open issue details"}>
                      <Tag
                        closable={!readOnly}
                        color={getTaskStatusTagColor(task.status)}
                        onClose={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!readOnly) {
                            confirmRemoveTaskFromCriterion(record.id, task);
                          }
                        }}
                        onClick={() => handleOpenIssueDetail(task)}
                        style={{ cursor: "pointer", marginInlineEnd: 0 }}
                      >
                        #{task.no ?? "-"} {task.status ?? "new"}
                      </Tag>
                    </Tooltip>
                  ))}
                  {!readOnly && (
                    <Button
                      type="text"
                      size="small"
                      className="uac-add-issue-hover-btn"
                      icon={<PlusOutlined className="text-[#1677ff]" />}
                      onClick={() => openInlineTaskModal(record)}
                    />
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status: { color: "default" | "success" | "processing" | "warning"; label: string }, record: { relatedTasks: UACTask[] }) => (
        <Space direction="vertical" size={2}>
          <Tag color={status.color}>{status.label}</Tag>
          {record.relatedTasks.length > 0 && (
            <Text type="secondary">
              {record.relatedTasks.filter((task) => CLOSED_STATUSES.has(String(task.status || "").toLowerCase())).length}/{record.relatedTasks.length} closed
            </Text>
          )}
        </Space>
      ),
    },
    ...(!readOnly
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 160,
            render: (_: unknown, record: UACCriterion) => (
              <Space>
                <Tooltip title="Add / Update Detailed Description">
                  <Button
                    type="text"
                    className="uac-description-hover-btn"
                    icon={<FileTextOutlined />}
                    onClick={() => openDescriptionModal(record)}
                  />
                </Tooltip>
                <Button
                  type="text"
                  className="uac-edit-hover-btn"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(record)}
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  const items = [
    {
      key: "uac",
      className: "bg-white",
      collapsible: "icon" as const,
      label: (
        <Space className="flex justify-between items-center w-full">
          <Space size="middle" wrap>
            <span className="font-medium text-black">User Acceptance Criteria - UAC</span>
            <Tag color={completedCount === normalizedCriteria.length && normalizedCriteria.length > 0 ? "success" : "default"}>
              {completedCount}/{normalizedCriteria.length} completed
            </Tag>
            {!readOnly && (
              <>
                <Tag className="cursor-pointer" onClick={() => openIssueList(canvasIssueStats.totalIds)}>Total-{canvasIssueStats.total}</Tag>
                {Object.entries(canvasIssueStats.statusGroups).map(([status, value]) => (
                  <Tag
                    key={`status-${status}`}
                    className="cursor-pointer"
                    onClick={() => openIssueList(value.ids)}
                  >
                    {status}-{value.count}
                  </Tag>
                ))}
                {Object.entries(canvasIssueStats.typeGroups).map(([type, value]) => (
                  <Tag
                    key={`type-${type}`}
                    className="cursor-pointer"
                    onClick={() => openIssueList(value.ids)}
                    color={String(type).toLowerCase() === "bug" ? "error" : "blue"}
                  >
                    {type}-{value.count}
                  </Tag>
                ))}
                <Tag className="cursor-pointer" color="green" onClick={() => openIssueList(canvasIssueStats.shIds)}>ES-{canvasIssueStats.sh}</Tag>
                <Tag className="cursor-pointer" color="red" onClick={() => openIssueList(canvasIssueStats.ehIds)}>EH-{canvasIssueStats.eh}</Tag>
              </>
            )}
          </Space>
          <Space size="small">
            {!readOnly && (
              <Button
                icon={<PlusOutlined className="text-[18px] text-[#1677ff]" />}
                type="text"
                onClick={openCreateModal}
              />
            )}
          </Space>
        </Space>
      ),
      children: normalizedCriteria.length ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={normalizedCriteria}
          rowClassName={() => "uac-hover-row"}
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No acceptance criteria added yet"
        />
      ),
    },
  ];

  return (
    <>
      <Collapse
        activeKey={activeKey}
        onChange={onChangeCollapse}
        className="ui-uac-collapse"
        items={items}
      />

      <Modal
        title={editingCriterionId ? "Edit UAC Criterion" : "Add UAC Criterion"}
        open={isModalOpen}
        onCancel={resetModalState}
        onOk={handleSaveCriterion}
        confirmLoading={isSavingCriterion}
        okText={editingCriterionId ? "Update" : "Create"}
        okButtonProps={editingCriterionId
          ? { disabled: isSavingCriterion }
          : { icon: <PlusCircleOutlined />, disabled: isSavingCriterion }}
        cancelButtonProps={{ disabled: isSavingCriterion }}
        footer={(
          <Space>
            {editingCriterionId && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={isSavingCriterion}
                onClick={handleDeleteCriterionFromEdit}
              >
                Delete
              </Button>
            )}
            <Button onClick={resetModalState} disabled={isSavingCriterion}>Cancel</Button>
            <Button
              type="primary"
              loading={isSavingCriterion}
              disabled={isSavingCriterion}
              icon={!editingCriterionId ? <PlusCircleOutlined /> : undefined}
              onClick={handleSaveCriterion}
            >
              {editingCriterionId ? "Update" : "Create"}
            </Button>
          </Space>
        )}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Criterion</Text>
            <TextArea
              rows={4}
              value={criterionTitle}
              onChange={(event) => setCriterionTitle(event.target.value)}
              placeholder="Example: User can submit the education form with required fields only."
            />
          </div>

          <div>
            <Text strong>Related Issue(s)</Text>
            <Select
              mode="multiple"
              allowClear
              placeholder="Select related backlog tasks"
              value={selectedTaskIds}
              onChange={setSelectedTaskIds}
              options={taskOptions}
              style={{ width: "100%", marginTop: 8 }}
              optionFilterProp="label"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="Criterion Details"
        open={Boolean(previewCriterion)}
        onCancel={() => setPreviewCriterion(null)}
        footer={null}
        width={960}
        style={{ top: 24 }}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Criteria</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{previewCriterion?.title || "-"}</Text>
            </div>
          </div>
          <div>
            <Text strong>Description</Text>
            <div style={{ marginTop: 8 }}>
              {previewCriterion?.description ? (
                <div className="uac-description-preview-shell ql-snow">
                  <div
                    className="uac-description-preview ql-editor"
                    dangerouslySetInnerHTML={{ __html: previewCriterion.description }}
                  />
                </div>
              ) : (
                <Text type="secondary">No detailed description.</Text>
              )}
            </div>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Detailed Description"
        open={Boolean(descriptionCriterion)}
        onCancel={closeDescriptionModal}
        onOk={handleSaveDescription}
        okText="Save"
        confirmLoading={isSavingDescription}
        okButtonProps={{ disabled: isSavingDescription }}
        cancelButtonProps={{ disabled: isSavingDescription }}
        style={{ minWidth: 800, top: 24 }}
        destroyOnClose
        afterOpenChange={(open) => {
          if (open) {
            const quill = quillRef.current?.getEditor();
            if (quill) {
              quill.root.innerHTML = descriptionCriterion?.description || "<p><br></p>";
              quill.history.clear();
            }
          }
        }}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Text type="secondary">{descriptionCriterion?.title}</Text>
          <ReactQuill
            ref={quillRef}
            key={descriptionCriterion?.id || "editor"}
            theme="snow"
            modules={quillModules}
            style={{ minHeight: 260 }}
          />
        </Space>
      </Modal>

      <Modal
        title="Manage Related Issue(s)"
        open={Boolean(inlineTaskCriterionId) && isInlineTaskModalOpen}
        onCancel={closeInlineTaskModal}
        onOk={handleSaveInlineTasks}
        okText="Save"
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Select existing backlog tasks"
            value={inlineSelectedTaskIds}
            onChange={setInlineSelectedTaskIds}
            options={taskOptions}
            style={{ width: "100%" }}
            optionFilterProp="label"
          />
          <Button
            type="dashed"
            icon={<PlusCircleOutlined />}
            block
            onClick={handleOpenCreateIssueDrawer}
          >
            Create New Issue
          </Button>
        </Space>
      </Modal>

      <CreateIssueDrawer
        open={isCreateIssueDrawerOpen}
        onClose={() => {
          setIsCreateIssueDrawerOpen(false);
          if (inlineTaskCriterionId) {
            setIsInlineTaskModalOpen(true);
          }
        }}
        onIssueCreated={(issueIds) => {
          setInlineSelectedTaskIds((prev) => Array.from(new Set([...prev, ...issueIds])));
        }}
        data={{ uiCanvas: selectedUICanvasId }}
      />

      <IssueDetailDrawer
        open={isIssueDrawerOpen}
        onClose={() => {
          setIsIssueDrawerOpen(false);
          setSelectedIssue(null);
        }}
        issue={selectedIssue}
        currentProject={currentProject}
        onUpdate={refreshSelectedIssue}
        currentRepo={null}
      />

      <style>{`
        .uac-edit-hover-btn {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }

        .uac-description-hover-btn {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }

        .uac-criteria-anchor {
          max-width: 800px;
          width: 100%;
          text-align: left;
          white-space: normal;
          word-break: break-word;
          line-height: 1.5;
          color: #1677ff;
          text-decoration: underline;
          display: inline-block;
        }

        .uac-add-issue-hover-btn {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }

        .uac-hover-row:hover .uac-edit-hover-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .uac-hover-row:hover .uac-description-hover-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .uac-hover-row:hover .uac-add-issue-hover-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .uac-description-preview-shell {
          border: 0;
        }

        .uac-description-preview {
          padding: 0;
          white-space: normal;
        }

        .uac-description-preview p {
          margin-bottom: 8px;
        }

        .uac-description-preview h1,
        .uac-description-preview h2,
        .uac-description-preview h3,
        .uac-description-preview h4,
        .uac-description-preview h5,
        .uac-description-preview h6 {
          margin-top: 0;
        }

        .uac-description-preview ul,
        .uac-description-preview ol {
          padding-left: 1.5em;
        }
      `}</style>
    </>
  );
};

export default UICanvasUACPanel;
