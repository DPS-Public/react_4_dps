import React from "react";
import { Button, Drawer, Form, Select, Space } from "antd";
import TextArea from "antd/es/input/TextArea";
import { SaveOutlined } from "@ant-design/icons";

import APICanvasDetailsDrawer from "@/components/ui-canvas/common/APICanvasDetailsDrawer";
import UICanvasPreviewDrawer from "@/components/ui-canvas/UICanvasPreviewDrawer";

import ApiRelations from "./componentElemets/uicApiRelations"; 
import RelatedUICanvasDrawer from "./componentElemets/uicRelatedUICanvasDrawer";
import { CloseandSend } from "./componentElemets/uicCloseandSend";
import CreateIssueDrawer from "../../uic_backlog_canvas_create_issue/uicBacklogCanvasCreateIssue";
import IssueDetailDrawer from "./componentElemets/uicBacklogCanvasIssueDetailDrawer";
import { CalculateCodeLine } from "./componentElemets/uicCalculateCodeLine";
import { FilterIssue } from "./componentElemets/uicFilterIssue";
import { ForwardIssue } from "./componentElemets/uicBacklogCanvasForwardIssue";
import ParentTaskDrawer from "./componentElemets/uicParentTaskDrawer";
import { UpdateType } from "./componentElemets/uicBacklogCanvasUpdateType";
import CodeLineCommitHistoryDrawer from "./componentElemets/uicCodeLineCommitHistoryDrawer";
import { ExternalSourceCodeDrawer } from "./ExternalSourceCodeDrawer";
import { CrdTreeDrawer } from "./CrdTreeDrawer";
import { AddCrdComponentDrawer } from "./AddCrdComponentDrawer";

interface BacklogDrawersProps {
    // ── create issue ──
    open: boolean;
    onClose: () => void;
    createIssue: (values: any, uploadedUrlList: any, selectedNodes?: Set<string>, treeData?: any[]) => Promise<void>;

    // ── issue detail ──
    issueDetailDrawerOpen: boolean;
    closeIssueDetailDrawer: () => void;
    selectedIssue: any;
    issueDetailInitialTab: "details" | "comment";
    currentProject: any;
    onIssueDetailUpdate: () => Promise<void>;
    refreshSelectedIssue: (id: string) => Promise<void>;
    setSelectedIssue: (v: any) => void;
    setTasks: (v: any[]) => void;
    setAllTasks: (v: any[]) => void;

    // ── canvas ──
    uiFlag: boolean;
    setUiFlag: (v: boolean) => void;
    activeCanvas: any;
    canvasName?: string;
    setActiveCanvas: (v: any) => void;
    apiFlag: boolean;
    setApiFlag: (v: boolean) => void;
    apiCanvas: any;
    setApiCanvas: (v: any) => void;
    currentRepo: string | null;

    // ── crd drawer ──
    crdDrawer: any;
    handleDeleteCrdComponent: (issueId: string, nodeId: string) => Promise<void>;
    drawerState: any;
    closeDrawer: () => void;
    setDrawerState: (v: any) => void;
    handleLoadExternalSourceCode: (p: any) => void;
    setExternalSourceCode: (v: string | null) => void;
    setExternalSourceCodeDrawerOpen: (v: boolean) => void;

    // ── external source code ──
    externalSourceCodeDrawerOpen: boolean;
    externalSourceCode: string | null;
    activeTab: string;
    setActiveTab: (v: string) => void;
    commitHistory: any;

    // ── add crd component ──
    addCrdDrawer: any;
    checkedRow: React.Key[];
    onAddCrdComponent: () => void;
    setAddCrdComponentDrawer: (v: boolean) => void;

    // ── bulk action drawers ──
    edit: boolean;
    setEdit: (v: boolean) => void;
    commentVisible: boolean;
    setCommentVisible: (v: boolean) => void;
    status: boolean;
    setStatus: (v: boolean) => void;
    formDesc: any;
    commentValue: string;
    setCommentValue: (v: string) => void;
    updateComment: () => Promise<void>;
    updateDescription: () => Promise<void>;
    changeStatus: () => Promise<void>;
    allTasks: any[];

    // ── type / sprint ──
    setType: (v: any) => void;
    setSprint: (v: any) => void;
    setCsflag: (v: any) => void;
    setForward: (v: any) => void;
    setApi: (v: any) => void;
    setRelatedUICanvas: (v: any) => void;
    setCalculateCodeLine: (v: any) => void;
    setPriorityFlag: (v: boolean) => void;

    // ── parent task ──
    disableDrawers: boolean;
    parentNo: any;
    setParentNo: (v: any) => void;
    parentNoFlag: boolean;
    setParentNoFlag: (v: boolean) => void;
    refreshTasks: () => Promise<void>;

    // ── collection ──
    viewCollectionDrawerOpen: boolean;
    setViewCollectionDrawerOpen: (v: boolean) => void;

    // ── code line ──
    codeLineCommitHistoryOpen: boolean;
    setCodeLineCommitHistoryOpen: (v: boolean) => void;
    codeLineCommitHistoryIssue: any;
    setCodeLineCommitHistoryIssue: (v: any) => void;
    currentTaskCommits: any[];

    // ── shared drawers for selected issue context ──
    type: any;
    sprint: any;
    csflag: any;
    forward: any;
    api: any;
    relatedUICanvas: any;
    calculateCodeLine: any;
}

export const BacklogDrawers: React.FC<BacklogDrawersProps> = (p) => {
    const [updatingDescription, setUpdatingDescription] = React.useState(false);
    const [updatingComment, setUpdatingComment] = React.useState(false);
    const [updatingStatus, setUpdatingStatus] = React.useState(false);
    const firstSelectedIssue = React.useMemo(
        () => p.allTasks?.find((task: any) => p.checkedRow?.includes(task.id)),
        [p.allTasks, p.checkedRow]
    );

    React.useEffect(() => {
        if (!p.status) return;
        p.formDesc.setFieldsValue({
            status: firstSelectedIssue?.status || "draft",
        });
    }, [firstSelectedIssue?.status, p.formDesc, p.status]);

    const handleDescriptionUpdate = async () => {
        setUpdatingDescription(true);
        try {
            await p.updateDescription();
        } finally {
            setUpdatingDescription(false);
        }
    };

    const handleCommentUpdate = async () => {
        setUpdatingComment(true);
        try {
            await p.updateComment();
        } finally {
            setUpdatingComment(false);
        }
    };

    const handleStatusUpdate = async () => {
        setUpdatingStatus(true);
        try {
            await p.changeStatus();
        } finally {
            setUpdatingStatus(false);
        }
    };

    return (
        <>
            {/* Create Issue */}
            <CreateIssueDrawer
                location="backlog"
                open={p.open}
                onClose={p.onClose}
                createIssue={p.createIssue}
            />

            {/* Main Issue Detail */}
            <IssueDetailDrawer
                open={p.issueDetailDrawerOpen}
                onClose={p.closeIssueDetailDrawer}
                issue={p.selectedIssue}
                initialActiveTab={p.issueDetailInitialTab}
                currentProject={p.currentProject}
                onUpdate={p.onIssueDetailUpdate}
                setApiFlag={p.setApiFlag}
                setApiCanvas={p.setApiCanvas}
                setUiFlag={p.setUiFlag}
                setActiveCanvas={p.setActiveCanvas}
                currentRepo={p.currentRepo}
                setCrdDrawerOpen={p.crdDrawer.setCrdDrawerOpen}
                setCrdDrawerNodeId={p.crdDrawer.setCrdDrawerNodeId}
                setCrdDrawerRepoId={p.crdDrawer.setCrdDrawerRepoId}
                handleDeleteCrdComponent={p.handleDeleteCrdComponent}
                setType={p.setType}
                setSprint={p.setSprint}
                setCsflag={p.setCsflag}
                setForward={p.setForward}
                setApi={p.setApi}
                setRelatedUi={p.setRelatedUICanvas}
                setCalculateCodeLine={p.setCalculateCodeLine}
            />

            {/* Sub-drawers for selected issue */}
            {p.selectedIssue && (
                <>
                    <UpdateType
                        checkedRow={[p.selectedIssue.id]}
                        setCheckedRow={() => { }}
                        form={p.formDesc}
                        onUpdated={async () => {
                            await p.refreshTasks();
                            await p.refreshSelectedIssue(p.selectedIssue.id);
                        }}
                    />
                    <ApiRelations
                        checkedRow={[p.selectedIssue.id]}
                        setCheckedRow={() => { }}
                        onUpdated={async () => {
                            await p.refreshTasks();
                            await p.refreshSelectedIssue(p.selectedIssue.id);
                        }}
                    />
                   
                    <RelatedUICanvasDrawer
                        checkedRow={[p.selectedIssue.id]}
                        setCheckedRow={() => { }}
                        onUpdated={async () => {
                            await p.refreshTasks();
                            await p.refreshSelectedIssue(p.selectedIssue.id);
                        }}
                    />
                    <ForwardIssue
                        checkedRow={[p.selectedIssue.id]}
                        setCheckedRow={() => { }}
                        onUpdated={async () => {
                            await p.refreshTasks();
                            await p.refreshSelectedIssue(p.selectedIssue.id);
                        }}
                    />
                    <CalculateCodeLine
                        checkedRow={[p.selectedIssue.id]}
                        setCheckedRow={() => { }}
                        onTasksUpdated={(updated) => {
                            p.setTasks(updated);
                            p.setAllTasks(updated);
                            const updatedIssue = updated.find((t: any) => t.id === p.selectedIssue.id);
                            if (updatedIssue) p.setSelectedIssue({ ...p.selectedIssue, ...updatedIssue });
                        }}
                    />
                </>
            )}

            {/* Description Edit */}
            <Drawer
                title="Update Issue Description"
                open={p.edit}
                onClose={() => {
                    if (updatingDescription) return;
                    p.setEdit(false);
                }}
                maskClosable={!updatingDescription}
                keyboard={!updatingDescription}
                footer={
                    <Space>
                        <Button
                            onClick={handleDescriptionUpdate}
                            type="primary"
                            loading={updatingDescription}
                            icon={!updatingDescription ? <SaveOutlined /> : undefined}
                        >
                            Update
                        </Button>
                        <Button disabled={updatingDescription} onClick={() => p.setEdit(false)}>Cancel</Button>
                    </Space>
                }
            >
                <Form form={p.formDesc} layout="vertical">
                    <Form.Item
                        label="Description"
                        name="desc"
                        rules={[
                            { required: true, min: 3, max: 300 },
                            {
                                validator: (_, v) =>
                                    !v || !v.trim()
                                        ? Promise.reject("Description cannot be empty or spaces only!")
                                        : Promise.resolve(),
                            },
                        ]}
                    >
                        <TextArea rows={10} />
                    </Form.Item>
                </Form>
            </Drawer>

            {/* Comment */}
            <Drawer
                title="Issue Comment"
                open={p.commentVisible}
                onClose={() => {
                    if (updatingComment) return;
                    p.setCommentVisible(false);
                }}
                maskClosable={!updatingComment}
                keyboard={!updatingComment}
                footer={
                    <Space>
                        <Button
                            onClick={handleCommentUpdate}
                            type="primary"
                            loading={updatingComment}
                            icon={!updatingComment ? <SaveOutlined /> : undefined}
                        >
                            Update
                        </Button>
                        <Button disabled={updatingComment} onClick={() => p.setCommentVisible(false)}>Cancel</Button>
                    </Space>
                }
            >
                <TextArea rows={10} onChange={(e) => p.setCommentValue(e.target.value)} value={p.commentValue} />
            </Drawer>

            {/* Status */}
            <Drawer
                title="Update Issue Status"
                open={p.status}
                onClose={() => {
                    if (updatingStatus) return;
                    p.formDesc.resetFields(["status"]);
                    p.setStatus(false);
                }}
                maskClosable={!updatingStatus}
                keyboard={!updatingStatus}
                footer={
                    <Space>
                        <Button
                            onClick={handleStatusUpdate}
                            type="primary"
                            loading={updatingStatus}
                            icon={!updatingStatus ? <SaveOutlined /> : undefined}
                        >
                            Update
                        </Button>
                        <Button
                            disabled={updatingStatus}
                            onClick={() => {
                                p.formDesc.resetFields(["status"]);
                                p.setStatus(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </Space>
                }
            >
                <Form form={p.formDesc} layout="vertical">
                    <Form.Item name="status">
                        <Select
                            className="w-full"
                            disabled={updatingStatus}
                            options={["draft", "waiting", "new", "ongoing", "closed", "canceled"].map((s) => ({
                                value: s,
                                label: s,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Drawer>

            {/* Bulk action drawers */}
            <UpdateType checkedRow={p.checkedRow as any[]} setCheckedRow={() => { }} form={p.formDesc}
                onUpdated={async () => {
                    await p.refreshTasks();
                    if (p.selectedIssue?.id) await p.refreshSelectedIssue(p.selectedIssue.id);
                }} />
            <FilterIssue data={p.allTasks} />
            <ForwardIssue checkedRow={p.checkedRow} setCheckedRow={() => { }} />
            <CloseandSend checkedRow={p.checkedRow} setCheckedRow={() => { }}
                onUpdated={async () => {
                    await p.refreshTasks();
                    if (p.selectedIssue?.id) await p.refreshSelectedIssue(p.selectedIssue.id);
                }} />
            <ApiRelations checkedRow={p.checkedRow as any[]} setCheckedRow={() => { }}
                onUpdated={async () => {
                    await p.refreshTasks();
                    if (p.selectedIssue?.id) await p.refreshSelectedIssue(p.selectedIssue.id);
                }} />
             
            <RelatedUICanvasDrawer checkedRow={p.checkedRow as any[]} setCheckedRow={() => { }}
                onUpdated={async () => {
                    await p.refreshTasks();
                    if (p.selectedIssue?.id) await p.refreshSelectedIssue(p.selectedIssue.id);
                }} />
            <CalculateCodeLine checkedRow={p.checkedRow} setCheckedRow={() => { }}
                onTasksUpdated={(u) => { p.setTasks([...u]); p.setAllTasks([...u]); }} />
            <ParentTaskDrawer />

            {/* Canvas previews */}
            <UICanvasPreviewDrawer
                open={p.uiFlag}
                onClose={() => p.setUiFlag(false)}
                data={{ id: p.activeCanvas, name: p.canvasName }}
            />
            <APICanvasDetailsDrawer open={p.apiFlag} onClose={() => p.setApiFlag(false)} data={p.apiCanvas} />

           
           

            {/* External Source Code */}
            <ExternalSourceCodeDrawer
                open={p.externalSourceCodeDrawerOpen}
                node={p.externalSourceCodeNode}
                sourceCode={p.externalSourceCode}
                activeTab={p.activeTab}
                setActiveTab={p.setActiveTab}
                commits={p.commitHistory.commits}
                loadingCommits={p.commitHistory.loadingCommits}
                selectedCommit={p.commitHistory.selectedCommit}
                setSelectedCommit={p.commitHistory.setSelectedCommit}
                onClose={() => {
                    p.setExternalSourceCodeDrawerOpen(false);
                    p.setExternalSourceCode(null);
                    p.setExternalSourceCodeNode(null);
                    p.commitHistory.resetCommits();
                    p.setActiveTab("source");
                }}
            />

            {/* Parent Issue Drawer */}
            {!p.disableDrawers && (
                <IssueDetailDrawer
                    issue={p.parentNo}
                    currentProject={p.currentProject}
                    onClose={() => { p.setParentNoFlag(false); p.setParentNo(null); }}
                    open={p.parentNoFlag}
                    onUpdate={async () => {
                        if (p.currentProject?.id) {
                            await p.refreshTasks();
                            if (p.parentNo?.id) {
                                const updated = await (await import("../services/backlogService")).default
                                    .getTaskById(p.currentProject.id, p.parentNo.id);
                                if (updated) p.setParentNo({ id: p.parentNo.id, ...updated });
                            }
                        }
                    }}
                    setApiFlag={p.setApiFlag}
                    setApiCanvas={p.setApiCanvas}
                    setUiFlag={p.setUiFlag}
                    setActiveCanvas={p.setActiveCanvas}
                    currentRepo={p.currentRepo}
                    setCrdDrawerOpen={p.crdDrawer.setCrdDrawerOpen}
                    setCrdDrawerNodeId={p.crdDrawer.setCrdDrawerNodeId}
                    setCrdDrawerRepoId={p.crdDrawer.setCrdDrawerRepoId}
                    handleDeleteCrdComponent={p.handleDeleteCrdComponent}
                    setType={p.setType}
                    setSprint={p.setSprint}
                    setCsflag={p.setCsflag}
                    setForward={p.setForward}
                    setApi={p.setApi}
                    setRelatedUi={p.setRelatedUICanvas}
                    setCalculateCodeLine={p.setCalculateCodeLine}
                    setPriority={p.setPriorityFlag}
                />
            )}

            {/* Add CRD Component */}
            <AddCrdComponentDrawer
                open={p.addCrdDrawer.addCrdComponentDrawerOpen}
                allRepositories={p.addCrdDrawer.allRepositories}
                loadingRepos={p.addCrdDrawer.loadingRepos}
                addCrdSelectedRepoId={p.addCrdDrawer.addCrdSelectedRepoId}
                setAddCrdSelectedRepoId={(id: string) => {
                    p.addCrdDrawer.setAddCrdSelectedRepoId(id);
                    p.addCrdDrawer.setSelectedCrdComponent(null);
                }}
                selectedCrdComponent={p.addCrdDrawer.selectedCrdComponent}
                setSelectedCrdComponent={p.addCrdDrawer.setSelectedCrdComponent}
                addCrdComponentTreeData={p.addCrdDrawer.addCrdComponentTreeData}
                loadingAddCrdComponentTree={p.addCrdDrawer.loadingAddCrdComponentTree}
                addCrdExpandedNodes={p.addCrdDrawer.addCrdExpandedNodes}
                toggleAddCrdFolder={p.addCrdDrawer.toggleAddCrdFolder}
                checkedRow={p.checkedRow}
                onAdd={p.onAddCrdComponent}
                onClose={() => p.addCrdDrawer.closeAddCrdDrawer(p.setAddCrdComponentDrawer)}
            />

            {/* CRD Tree */}
            <CrdTreeDrawer
                open={p.crdDrawer.crdDrawerOpen}
                crdTreeData={p.crdDrawer.crdTreeData}
                filteredCrdTreeData={p.crdDrawer.filteredCrdTreeData}
                loadingCrdTree={p.crdDrawer.loadingCrdTree}
                crdDrawerNodeId={p.crdDrawer.crdDrawerNodeId}
                expandedNodes={p.crdDrawer.expandedNodes}
                crdTreeSearchTerm={p.crdDrawer.crdTreeSearchTerm}
                setCrdTreeSearchTerm={p.crdDrawer.setCrdTreeSearchTerm}
                toggleFolder={p.crdDrawer.toggleFolder}
                onClose={p.crdDrawer.closeCrdDrawer}
                crdDrawerRepoId={p.crdDrawer.crdDrawerRepoId}
                currentRepo={p.currentRepo}
                openViewDrawer={p.openViewDrawer}
                onPathClick={(n) => p.openViewDrawer({ ...n, githubRepoId: n.githubRepoId || p.crdDrawer.crdDrawerRepoId || p.currentRepo })}
                onExternalPathClick={(n) => {
                    if (n.externalRepoFullName && n.externalPath) {
                        p.handleLoadExternalSourceCode({
                            repoFullName: n.externalRepoFullName,
                            filePath: n.externalPath,
                            branch: n.externalBranch || "main",
                            nodeId: n.id,
                            onSuccess: (content: string, node: any) => {
                                p.setExternalSourceCode(content);
                                p.setExternalSourceCodeNode(node);
                                p.setExternalSourceCodeDrawerOpen(true);
                            },
                        });
                    }
                }}
                onCanvasClick={(canvasType: string, canvasId: string) => {
                    if (canvasType === "ui") { p.setActiveCanvas(canvasId); p.setUiFlag(true); }
                    else if (canvasType === "api") { p.setApiCanvas({ id: canvasId }); p.setApiFlag(true); }
                }}
            />

            {/* Code Line Commit History */}
            <CodeLineCommitHistoryDrawer
                open={p.codeLineCommitHistoryOpen}
                issue={p.codeLineCommitHistoryIssue}
                onClose={() => { p.setCodeLineCommitHistoryOpen(false); p.setCodeLineCommitHistoryIssue(null); }}
                currentTaskCommits={p.currentTaskCommits}
            />
        </>
    );
};
