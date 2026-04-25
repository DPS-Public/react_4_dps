/* eslint-disable */
// @ts-nocheck
import { Button, Checkbox, Dropdown, message, Modal, Space, Tag } from "antd"
import { Actions } from "@/ui-canvas/uic_ui_canvas/types/Actions.ts"
import { ActionsType } from "@/ui-canvas/uic_ui_canvas/types/ActionsType.enum.ts"
import React, { useEffect, useState } from "react"
import {
    ApiOutlined,
    AppstoreOutlined,
    BugOutlined,
    DeleteOutlined,
    DownOutlined,
    EditOutlined,
    FileTextOutlined,
    FormOutlined,
    NodeIndexOutlined,
    SnippetsOutlined,
    TableOutlined,
    TabletFilled
} from "@ant-design/icons"
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore"
import { db } from "@/config/firebase.ts"
import { useSelector } from "react-redux"
import { type RootState } from "@/store"
import useUICanvasLoadIssueInfo from "./useUICanvasLoadIssueInfo.tsx"
import { ComponentTypeLabel } from "@/ui-canvas/uic_ui_canvas/types/ComponentTypeLabel.ts"
import { FormActionEventLabel } from "@/ui-canvas/uic_ui_canvas/types/FormActionEventLabel.ts"
import { utilBuildDisplayOrderData } from "@/ui-canvas/uic_ui_canvas/utils/utilBuildDisplayOrderData.ts";
import useUICanvasInputDelete from "@/ui-canvas/uic_ui_canvas/hooks/input/useUICanvasInputDelete.tsx";
import UIEditorCanvas from "@/ui-canvas/ui-editor/UIEditorCanvas"

type NormalizedInputMap = Record<string, any>;

const normalizeAndSortInputs = (inputObj: NormalizedInputMap = {}): NormalizedInputMap => {
    const values = Object.values(inputObj) as any[]

    const sorted = values.sort((a, b) => (a?.order ?? 9999) - (b?.order ?? 9999))

    let lastOrder = -1
    const normalized: NormalizedInputMap = {}

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i]
        let currentOrder = item?.order

        if (currentOrder === undefined || currentOrder === null) {
            currentOrder = lastOrder + 1
        }

        normalized[item?.id ?? item?.relId ?? item?.dbRelId] = {
            ...item,
            order: currentOrder,
        }

        lastOrder = currentOrder
    }
    return normalized
}

const getComponentTypeDescription = (item: any) => {
    const componentType = ComponentTypeLabel[item?.componentType] ?? item?.componentType ?? "-"
    const cellNo = String(item?.cellNo ?? "").trim()

    if (!cellNo) {
        return `Component Type: ${componentType}`
    }

    return `Component Type: ${componentType} (Cell No: ${cellNo})`
}

export default function useUICanvasInputColumns({
    setInputColumns,
    readOnly = false,
    uiList,
    selectedUI,
    selectedUICanvasId,
    setApiCanvasDrawerData,
    openUICanvasActionsAPIRelationDrawer,
    openUICanvasActionsComponentInformationUpdateDrawer,
    openUICanvasActionsTemplateDescriptionDrawer,
    openUICanvasActionsManualDescriptionCreateDrawer,
    openUICanvasActionsManualDescriptionUpdateDrawer,
    openUICanvasUpdateInputModal,
    openUICanvasUpdateAPIRelationDrawer,
    openUICanvasCreateFormActionDrawer,
    setUICanvasPreviewDrawerData,
    openUICanvasUpdateFormActionDrawer,
    setSelectedDescriptions,
    isShowIssueStats,
    setIssueDrawerData,
    openUICanvasActionsTemplateDescriptionUpdateDrawer,
    selectedDescriptions,
    selectedUICanvasInputRows,
    setSelectedUICanvasInputRows,
}: {
    setInputColumns?: (columns: any[]) => void
    readOnly: boolean
    isShowIssueStats?: any
    uiList?: any[]
    selectedUI?: any
    selectedUICanvasId?: string
    setApiCanvasDrawerData?: (data: any) => void
    openUICanvasActionsAPIRelationDrawer?: (data?: any) => void
    openUICanvasActionsComponentInformationUpdateDrawer?: (data?: any) => void
    openUICanvasActionsTemplateDescriptionDrawer?: (data?: any) => void
    openUICanvasActionsManualDescriptionCreateDrawer?: (data: any) => void
    openUICanvasActionsManualDescriptionUpdateDrawer?: (data: any) => void
    openUICanvasUpdateInputModal?: (data?: any) => void
    openUICanvasUpdateAPIRelationDrawer?: (data?: any) => void
    openUICanvasCreateFormActionDrawer?: (data?: any) => void
    setUICanvasPreviewDrawerData?: (data: any) => void
    openUICanvasUpdateFormActionDrawer?: (data: any) => void,
    selectedDescriptions?: any[],
    setSelectedDescriptions?: (data: any) => void,
    setIssueDrawerData?: (data: any) => void,
    openUICanvasActionsTemplateDescriptionUpdateDrawer?: () => void,
    selectedUICanvasInputRows?: any[],
    setSelectedUICanvasInputRows?: React.Dispatch<React.SetStateAction<any[]>>,
}) {
    const [issueData, setIssueData] = useState<any>({ data: [], total: 0, bugCount: 0, sh: 0, eh: 0, totalIds: [], typeCounts: {} })
    const { loadIssueInfo } = useUICanvasLoadIssueInfo()
    const currentProjectId = useSelector((state: RootState) => state.project.currentProject?.id)
    const [selectedInput, setSelectedInput] = React.useState(null);
    const [inputTableData, setInputTableData] = useState<any[]>([]);
    const { deleteInput } = useUICanvasInputDelete({ selectedUICanvasId });
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Load all backlog issues for the canvas and calculate totals
    const loadAllBacklogIssuesForCanvas = async (canvasId: string) => {
        if (!currentProjectId || !canvasId) return {
            total: 0,
            bugCount: 0,
            sh: 0,
            eh: 0,
            totalIds: [],
            typeCounts: {} as Record<string, number>
        };

        try {
            const backlogRef = collection(db, `backlog_${currentProjectId}`);
            const snapshot = await getDocs(backlogRef);
            const allIssues: any[] = [];

            snapshot.forEach((doc) => {
                const issueData = { id: doc.id, ...doc.data() };
                if (issueData.uiCanvasId === canvasId) {
                    allIssues.push(issueData);
                }
            });

            const total = allIssues.length;
            const bugCount = allIssues.filter(i => i.type === "Bug" || i.type === "bug").length;
            const sh = allIssues.reduce((sum, i) => sum + (i.sh || 0), 0);
            const eh = allIssues.reduce((sum, i) => sum + (i.eh || 0), 0);
            const totalIds = allIssues.map(i => i.id);

            // Calculate counts by issue type
            const typeCounts: Record<string, number> = {};
            allIssues.forEach(issue => {
                const issueType = issue.type || 'Unknown';
                typeCounts[issueType] = (typeCounts[issueType] || 0) + 1;
            });

            return { total, bugCount, sh, eh, totalIds, typeCounts };
        } catch (error) {
            console.error("Error loading backlog issues:", error);
            return {
                total: 0,
                bugCount: 0,
                sh: 0,
                eh: 0,
                totalIds: [],
                typeCounts: {} as Record<string, number>
            };
        }
    };

    const backlogIssueListener = () => {
        let previousDocs: Record<string, any> = {}; // əvvəlki snapshot-ları saxlamaq üçün

        return onSnapshot(collection(db, `backlog_${currentProjectId}`), async (snapshot) => {
            let shouldUpdate = false;
            const currentCanvasId = selectedUICanvasId || localStorage.getItem("currentUI");

            snapshot.docChanges().forEach((change) => {
                const docId = change.doc.id;
                const currentDoc = change.doc.data();
                const previousDoc = previousDocs[docId];

                // pending olanları atla

                // ADD və ya REMOVE olarsa
                if (change.type === "added" || change.type === "removed") {
                    if (currentDoc?.uiCanvasId === currentCanvasId) {
                        shouldUpdate = true;
                    }
                }

                // MODIFIED olarsa və yalnız STATUS və ya TYPE dəyişibsə
                else if (change.type === "modified") {
                    const statusChanged = previousDoc && previousDoc.status !== currentDoc.status;
                    const typeChanged = previousDoc && previousDoc.type !== currentDoc.type;

                    if ((statusChanged || typeChanged) && currentDoc?.uiCanvasId === currentCanvasId) {
                        shouldUpdate = true;
                    }
                }

                // hər doc-u yadda saxla ki, növbəti dəyişikdə müqayisə edə bilək
                previousDocs[docId] = currentDoc;
            });

            if (shouldUpdate && currentCanvasId) {
                // Load per-description stats from API
                const uiDocRef = doc(db, "ui_canvas", currentCanvasId);
                getDoc(uiDocRef).then(async (res) => {
                    if (res.exists() && Object.keys(res.data().input?.[currentCanvasId] || {}).length) {
                        const descriptionStats = await loadIssueInfo({
                            input: res.data().input[currentCanvasId],
                        });

                        // Load all backlog issues for totals
                        const allIssuesStats = await loadAllBacklogIssuesForCanvas(currentCanvasId);

                        // Merge: use all issues stats for totals, keep description stats for per-item details
                        setIssueData({
                            ...descriptionStats,
                            total: allIssuesStats.total,
                            bugCount: allIssuesStats.bugCount,
                            sh: allIssuesStats.sh,
                            eh: allIssuesStats.eh,
                            totalIds: allIssuesStats.totalIds,
                            typeCounts: allIssuesStats.typeCounts,
                        });
                    } else {
                        // If no input, just load all issues stats
                        const allIssuesStats = await loadAllBacklogIssuesForCanvas(currentCanvasId);
                        setIssueData({
                            data: [],
                            ...allIssuesStats,
                        });
                    }
                });
            }
        });

    }

    useEffect(() => {
        const loadData = async () => {
            if (Object.keys(selectedUI?.input ?? {}).length > 0 && !readOnly && selectedUICanvasId) {
                // Load per-description stats from API
                const descriptionStats = await loadIssueInfo(selectedUI);

                // Load all backlog issues for totals
                const allIssuesStats = await loadAllBacklogIssuesForCanvas(selectedUICanvasId);

                // Merge: use all issues stats for totals, keep description stats for per-item details
                setIssueData({
                    ...descriptionStats,
                    total: allIssuesStats.total,
                    bugCount: allIssuesStats.bugCount,
                    sh: allIssuesStats.sh,
                    eh: allIssuesStats.eh,
                    totalIds: allIssuesStats.totalIds,
                    typeCounts: allIssuesStats.typeCounts,
                });
            } else if (selectedUICanvasId) {
                // If no input, just load all issues stats
                const allIssuesStats = await loadAllBacklogIssuesForCanvas(selectedUICanvasId);
                setIssueData({
                    data: [],
                    ...allIssuesStats,
                });
            }
        };

        loadData();
    }, [loadIssueInfo, readOnly, selectedUICanvasId, selectedUI?.input]);

    useEffect(() => {
        if (!currentProjectId || !selectedUICanvasId) return
        const backLogIssueUnsubscribe = backlogIssueListener();
        return () => backLogIssueUnsubscribe()
    }, [currentProjectId, selectedUICanvasId, loadIssueInfo]);

    const handleOpenIssueDrawer = ({ ids, ...rest }) => {
        setIssueDrawerData({
            open: true,
            data: {
                ids,
                ...rest
            }
        })
    }

    const handleAction = async (action: string, record) => {
        setSelectedInput({ ...record, uiName: selectedUI?.label })
        switch (action) {
            case ActionsType.DELETE: {
                Modal.confirm({
                    content: "Are you sure to delete current detail card?",
                    okText: "Ok",
                    cancelText: "Cancel",
                    onOk: async () => {
                        deleteInput([record.id])
                    },
                })
                break
            }
            case ActionsType.MANUAL_DESCRIPTION: {
                openUICanvasActionsManualDescriptionCreateDrawer?.({
                    ...record,
                    uiName: selectedUI?.label,
                })
                break
            }
            case ActionsType.API_RELATION: {
                openUICanvasActionsAPIRelationDrawer()
                break
            }
            case ActionsType.COMPONENT_INFORMATION: {
                openUICanvasActionsComponentInformationUpdateDrawer?.()
                break
            }
            case ActionsType.TEMPLATE_DESCRIPTION: {
                openUICanvasActionsTemplateDescriptionDrawer()
                break
            }
            case ActionsType.FORM_ACTION: {
                openUICanvasCreateFormActionDrawer()
                break
            }
            case ActionsType.RENAME: {
                openUICanvasUpdateInputModal()
                break
            }
            case ActionsType.ADD_TO_TABLE: {
                multiMove(record)
                break
            }
            case ActionsType.ADD_TO_GROUP: {
                multiMove(record)
                break
            }
            case ActionsType.REMOVE_FROM_TABLE: {
                multiRemove(record)
                break
            }
            case ActionsType.REMOVE_FROM_GROUP: {
                multiRemove(record)
                break
            }
            default:
                break
        }
    }

    async function multiMove(targetParent) {
        try {
            let newData = [...inputTableData];

            // seçilən itemləri gətir
            const selectedIds = selectedUICanvasInputRows.map(i => i.id);
            const movedItemsData = [];

            // hər seçilən item üçün parent assign
            newData.forEach(item => {
                if (!selectedIds.includes(item.id)) return;

                const oldParent = {
                    fkTableId: item.fkTableId,
                    fkGroupId: item.fkGroupId,
                    hasLabel: item.hasLabel
                };

                if (["tbl", "table"].includes(targetParent.componentType)) {
                    item.hasLabel = false
                    item.fkTableId = targetParent.id;
                    item.fkGroupId = null;
                } else if (["group", "grp"].includes(targetParent.componentType)) {
                    item.fkGroupId = targetParent.id;
                    item.fkTableId = null;
                }

                movedItemsData.push({
                    inputId: item.id,
                    inputName: item.inputName,
                    oldParent: oldParent,
                    newParent: {
                        fkTableId: item.fkTableId,
                        fkGroupId: item.fkGroupId,
                        hasLabel: item.hasLabel
                    },
                    targetParentId: targetParent.id,
                    targetParentName: targetParent.inputName,
                    targetParentType: targetParent.componentType,
                });
            });

            // === Order yenilə (sənin logic)
            let orderCounter = 0;
            newData.forEach(item => {
                if (!item.fkTableId && !item.fkGroupId) {
                    item.order = orderCounter++;
                    const children = newData.filter(c =>
                        c.fkTableId === item.id || c.fkGroupId === item.id
                    );
                    children.forEach(child => {
                        child.order = orderCounter++;
                    });
                }
            });

            // === Firebase Update ===
            const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
            const docSnap = await getDoc(uiCanvasDocRef);
            const docData = docSnap.data();
            const canvasInputs = docData?.input?.[selectedUICanvasId] || {};

            const updatedInputs = { ...canvasInputs };

            newData.forEach(item => {
                if (!updatedInputs[item.id]) return;
                updatedInputs[item.id] = {
                    ...updatedInputs[item.id],
                    order: item.order ?? 0,
                    fkTableId: item.fkTableId ?? null,
                    fkGroupId: item.fkGroupId ?? null,
                };
            });

            const updatedAllInput = {
                ...docData.input,
                [selectedUICanvasId]: updatedInputs
            };

            await updateDoc(uiCanvasDocRef, { input: updatedAllInput });

            // Add to ui_canvas_history
            if (selectedUICanvasId) {
                await addMultiMoveHistoryRecord({
                    uiCanvasId: selectedUICanvasId,
                    movedItemsData: movedItemsData,
                    actionType: targetParent.componentType === 'table' || targetParent.componentType === 'tbl'
                        ? 'ADD_TO_TABLE'
                        : 'ADD_TO_GROUP',
                });
            }

            message.success("Selected items moved successfully!");

            // clear selection
            setSelectedUICanvasInputRows([]);

        } catch (e) {
            console.error(e);
            message.error("Error moving items");
        }
    }

    async function multiRemove(targetParent) {
        try {
            let newData = [...inputTableData];
            const removedItemsData = [];

            // seçilən itemləri gətir
            const selectedIds = selectedUICanvasInputRows.map(i => i.id);

            // hər seçilən item üçün parent assign
            newData.forEach(item => {
                if (!selectedIds.includes(item.id)) return;

                const oldParent = {
                    fkTableId: item.fkTableId,
                    fkGroupId: item.fkGroupId,
                    hasLabel: item.hasLabel
                };

                if (["tbl", "table"].includes(targetParent.componentType)) {
                    item.hasLabel = !["btn", "hlink"].includes(item.componentType)
                    item.fkTableId = null;
                    item.fkGroupId = null;
                } else if (["grp", "group"].includes(targetParent.componentType)) {
                    item.fkGroupId = null;
                    item.fkTableId = null;
                }

                removedItemsData.push({
                    inputId: item.id,
                    inputName: item.inputName,
                    oldParent: oldParent,
                    newParent: {
                        fkTableId: item.fkTableId,
                        fkGroupId: item.fkGroupId,
                        hasLabel: item.hasLabel
                    },
                    targetParentId: targetParent.id,
                    targetParentName: targetParent.inputName,
                    targetParentType: targetParent.componentType,
                });
            });

            // === Order yenilə (sənin logic)
            let orderCounter = 0;
            newData.forEach(item => {
                if (!item.fkTableId && !item.fkGroupId) {
                    item.order = orderCounter++;
                    const children = newData.filter(c =>
                        c.fkTableId === item.id || c.fkGroupId === item.id
                    );
                    children.forEach(child => {
                        child.order = orderCounter++;
                    });
                }
            });

            // === Firebase Update ===
            const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
            const docSnap = await getDoc(uiCanvasDocRef);
            const docData = docSnap.data();
            const canvasInputs = docData?.input?.[selectedUICanvasId] || {};

            const updatedInputs = { ...canvasInputs };

            newData.forEach(item => {
                if (!updatedInputs[item.id]) return;
                updatedInputs[item.id] = {
                    ...updatedInputs[item.id],
                    order: item.order ?? 0,
                    fkTableId: item.fkTableId ?? null,
                    fkGroupId: item.fkGroupId ?? null,
                };
            });

            const updatedAllInput = {
                ...docData.input,
                [selectedUICanvasId]: updatedInputs
            };

            await updateDoc(uiCanvasDocRef, { input: updatedAllInput });

            // Add to ui_canvas_history
            if (selectedUICanvasId) {
                await addMultiMoveHistoryRecord({
                    uiCanvasId: selectedUICanvasId,
                    movedItemsData: removedItemsData,
                    actionType: targetParent.componentType === 'table' || targetParent.componentType === 'tbl'
                        ? 'REMOVE_FROM_TABLE'
                        : 'REMOVE_FROM_GROUP',
                });
            }

            message.success("Selected items moved successfully!");

            // clear selection
            setSelectedUICanvasInputRows([]);

        } catch (e) {
            console.error(e);
            message.error("Error moving items");
        }
    }

    // Add to ui_canvas_history for multi move/remove actions
    const addMultiMoveHistoryRecord = async (historyData: {
        uiCanvasId: string;
        movedItemsData: any[];
        actionType: string;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);

            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: historyData.actionType,
                fieldName: 'input_parent_changes',
                movedItemsData: historyData.movedItemsData,
                movedCount: historyData.movedItemsData.length,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

            if (!historyDocSnap.exists()) {
                // Create new document
                await updateDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    input_parent_changes: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    input_parent_changes: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding multi move history record:', error);
        }
    }

    const toggleRow = (checked, item) => {
        if (checked) {
            setSelectedUICanvasInputRows((prevState) => [...prevState, item])

        } else {
            setSelectedUICanvasInputRows((prevState) => prevState.filter(prev => prev.id !== item.id))
        }
    }
    const showRemoveButton = (row) => {
        if (selectedUICanvasInputRows.length === 0) return false;

        return selectedUICanvasInputRows.some(item => {
            return (
                (["tbl", "table"].includes(row.componentType) && item.fkTableId === row.id) ||
                (["grp", "group"].includes(row.componentType) && item.fkGroupId === row.id)
            );
        });
    };
    const actionIcons = {
        [ActionsType.COMPONENT_INFORMATION]: <AppstoreOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.MANUAL_DESCRIPTION]: <FileTextOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.TEMPLATE_DESCRIPTION]: <SnippetsOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.API_RELATION]: <ApiOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.FORM_ACTION]: <FormOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.RENAME]: <EditOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.DELETE]: <DeleteOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.ADD_TO_TABLE]: <TableOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.ADD_TO_GROUP]: <NodeIndexOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.REMOVE_FROM_TABLE]: <TableOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
        [ActionsType.REMOVE_FROM_GROUP]: <NodeIndexOutlined style={{ fontSize: 16, color: "#7a8699" }} />,
    };
    const baseActions = Actions.map(a => ({
        key: a.key,
        label: a.label,
        icon: actionIcons[a.key],
    }));

    // Helper to generate add/remove actions for group or table
    const getAddRemoveActions = (record: any) => {
        const actions: any[] = [{ type: "divider" }];

        if (["grp", "group"].includes(record.componentType)) {
            actions.push({
                key: "add_to_group",
                label: "Add to Group",
                icon: actionIcons[ActionsType.ADD_TO_GROUP],
            });
            if (showRemoveButton(record)) {
                actions.push({
                    key: "remove_from_group",
                    label: "Remove from Group",
                    icon: actionIcons[ActionsType.REMOVE_FROM_GROUP],
                });
            }
        } else if (["tbl", "table"].includes(record.componentType)) {
            actions.push({
                key: "add_to_table",
                label: "Add to Table",
                icon: actionIcons[ActionsType.ADD_TO_TABLE],
            });
            if (showRemoveButton(record)) {
                actions.push({
                    key: "remove_from_table",
                    label: "Remove from Table",
                    icon: actionIcons[ActionsType.REMOVE_FROM_TABLE],
                });
            }
        }

        return actions;
    };

    // Determine if we should show extra actions
    const shouldShowExtraActions = selectedUICanvasInputRows?.length > 0 &&
        selectedUICanvasInputRows?.every(item => !["grp", "tbl", "group", "table"].includes(item.componentType));
    // Final menu items


    const buildColumns = () => {

        const columns = [
            !readOnly
                ? [{
                    title: "",
                    key: "drag",
                    width: 20,
                    className: `${readOnly ? "hidden" : ""}`,
                },
                {
                    title: "",
                    key: "checkbox",
                    width: 20,
                    render: (_, record) => {
                        return <Checkbox
                            checked={selectedUICanvasInputRows.find(item => item.id === record.id)}
                            onChange={(e) => toggleRow(e.target.checked, record)}
                        />
                    }
                }]
                : null,

            {
                title: "#",
                dataIndex: "index",
                key: "index",
                width: "30px",
                columnIndex: 2,
                render: (_, record) => record.displayIndex
            },
            {
                title: "Input",
                dataIndex: "inputName",
                key: "inputName",
            },
            {
                title: (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 500 }}>Description</span>
                        {isShowIssueStats && (
                            <div style={{ marginTop: 4 }}>
                                <Space size={4} wrap>
                                    <Tag color="default" className="cursor-pointer"
                                        onClick={() => handleOpenIssueDrawer({ ids: issueData?.totalIds })}>Total-{issueData?.total}</Tag>
                                    <Tag color="error" className="cursor-pointer" icon={<BugOutlined />}
                                        onClick={() => handleOpenIssueDrawer({ ids: issueData?.totalIds, type: "bug" })}>
                                        Bug-{issueData?.bugCount}
                                    </Tag>
                                    {/* Display issue type counts */}
                                    {issueData?.typeCounts && Object.entries(issueData.typeCounts).map(([type, count]: [string, any]) => {
                                        if (type.toLowerCase() === 'bug' || type === 'Bug') return null; // Bug already shown above
                                        const typeColors: Record<string, string> = {
                                            'Task': '#1890ff',
                                            'task': '#1890ff',
                                            'Story': '#52c41a',
                                            'story': '#52c41a',
                                            'Epic': '#722ed1',
                                            'epic': '#722ed1',
                                            'Feature': '#fa8c16',
                                            'feature': '#fa8c16',
                                        };
                                        return (
                                            <Tag
                                                key={type}
                                                color={typeColors[type] || 'default'}
                                                className="cursor-pointer"
                                                onClick={() => handleOpenIssueDrawer({ ids: issueData?.totalIds, type: type.toLowerCase() })}
                                            >
                                                {type}-{count}
                                            </Tag>
                                        );
                                    })}
                                    {issueData?.sh > 0 && <Tag color="#22c55e" className="cursor-pointer"
                                        onClick={() => handleOpenIssueDrawer({ ids: issueData?.totalIds })}>SH-{issueData?.sh}</Tag>}
                                    {issueData?.eh > 0 && <Tag color="#ef4444" className="cursor-pointer"
                                        onClick={() => handleOpenIssueDrawer({ ids: issueData?.totalIds })}>EH-{issueData?.eh}</Tag>}
                                </Space>
                            </div>
                        )}
                    </div>
                ),
                key: "content",
                render: (item) => {
                    const formAction = item?.formAction;
                    const formActionRelationCount = issueData?.data?.find(item => item.id === formAction?.action);
                    return (
                        <Space direction="vertical" className="w-full">

                            <span>{getComponentTypeDescription(item)}</span>
                            {item?.manualDescription &&
                                Object.values(normalizeAndSortInputs(item?.manualDescription))
                                    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
                                    .map((manualItem) => {

                                        const manualDescriptionCount = issueData?.data?.find(item => item.id === manualItem.id);
                                        return (
                                            <div key={manualItem?.id}>
                                                <Space
                                                    className="justify-between w-full group !cursor-default"
                                                    key={manualItem?.id}
                                                >
                                                    <span className="break-words leading-snug">
                                                        <Checkbox
                                                            onChange={(e) => {
                                                                setSelectedDescriptions?.((prev = []) => {
                                                                    if (e.target.checked) {
                                                                        // ekle
                                                                        return [
                                                                            ...prev,
                                                                            {
                                                                                id: manualItem.id,
                                                                                inputId: item.id,
                                                                                key: "manualDescription",
                                                                                inputName: manualItem?.inputName ?? "",
                                                                                event: manualItem?.event ?? "",
                                                                                description: manualItem?.description ?? "",
                                                                                uiCanvasName: manualItem?.uiName ?? "",
                                                                                uiCanvasId: manualItem?.uiId ?? "",
                                                                            },
                                                                        ]
                                                                    } else {
                                                                        // çıkart
                                                                        return prev.filter((desc) => desc.id !== manualItem.id)
                                                                    }
                                                                })
                                                            }}
                                                            checked={!!selectedDescriptions?.find(desc => desc.id === manualItem.id)}
                                                        />
                                                        {manualItem.event && (
                                                            <Tag color={"#FCBD06"}
                                                                className="!text-black inline-block min-h-[22px] ml-1">
                                                                {manualItem?.event ?? ""}
                                                            </Tag>
                                                        )}
                                                        <span>{manualItem?.description}</span>
                                                    </span>
                                                    {!readOnly && (
                                                        <EditOutlined
                                                            className="invisible group-hover:visible !cursor-pointer text-[16px]"
                                                            onClick={() => {
                                                                openUICanvasActionsManualDescriptionUpdateDrawer?.({
                                                                    ...manualItem,
                                                                    inputId: item.id,
                                                                    uiName: selectedUI?.label,
                                                                })
                                                            }}
                                                        />
                                                    )}
                                                </Space>
                                                {
                                                    isShowIssueStats && manualDescriptionCount && (
                                                        <div className="pl-5 pt-1">
                                                            {manualDescriptionCount.closedCount > 0 && (
                                                                <Tag className="!cursor-pointer" color="#0000ff"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "closed"
                                                                    })}>closed
                                                                    - {manualDescriptionCount.closedCount}</Tag>
                                                            )}

                                                            {manualDescriptionCount.draftCount > 0 && (
                                                                <Tag color="#c8c8c8" className="!text-black !cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "draft"
                                                                    })}>draft
                                                                    - {manualDescriptionCount.draftCount}</Tag>
                                                            )}

                                                            {manualDescriptionCount.waitingCount > 0 && (
                                                                <Tag color="#0000ff"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "waiting"
                                                                    })}>waiting
                                                                    - {manualDescriptionCount.waitingCount}</Tag>
                                                            )}

                                                            {manualDescriptionCount.newCount > 0 && (
                                                                <Tag color="#ffa500" className="!text-black !cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "new"
                                                                    })}>new
                                                                    - {manualDescriptionCount.newCount}</Tag>
                                                            )}

                                                            {manualDescriptionCount.ongoingCount > 0 && (
                                                                <Tag color="#008000"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "ongoing"
                                                                    })}>ongoing
                                                                    - {manualDescriptionCount.ongoingCount}</Tag>
                                                            )}

                                                            {manualDescriptionCount.canceledCount > 0 && (
                                                                <Tag color="#EF4444"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        status: "canceled"
                                                                    })}>canceled
                                                                    - {manualDescriptionCount.canceledCount}</Tag>
                                                            )}
                                                            {
                                                                manualDescriptionCount.totalEH > 0 && <Tag
                                                                    className="!cursor-pointer"
                                                                    color="#ef4444"
                                                                    onClick={() => handleOpenIssueDrawer({ ids: manualDescriptionCount?.issueIds })}>EH- {manualDescriptionCount.totalEH}</Tag>
                                                            }
                                                            {
                                                                manualDescriptionCount.totalSH > 0 && <Tag
                                                                    color="#22c55e"
                                                                    onClick={() => handleOpenIssueDrawer({ ids: manualDescriptionCount?.issueIds })}>SH- {manualDescriptionCount.totalSH}</Tag>
                                                            }


                                                            {manualDescriptionCount.bugCount > 0 && (
                                                                <Tag className="!cursor-pointer" color="error" icon={<BugOutlined />}
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: manualDescriptionCount?.issueIds,
                                                                        type: "bug"
                                                                    })}>
                                                                    Bug-{manualDescriptionCount?.bugCount}
                                                                </Tag>
                                                            )}

                                                        </div>

                                                    )
                                                }

                                            </div>

                                        )
                                    })}

                            {item?.templateDescription &&
                                Object.entries(item?.templateDescription ?? {})
                                    .sort(([, a], [, b]) => (a?.order ?? 0) - (b?.order ?? 0))
                                    .map(([id, manualItem]) => {


                                        const templateDescriptionCount = issueData?.data?.find(
                                            (d) => d.id === id || d.id === manualItem?.templateDescId
                                        );

                                        return (
                                            <div key={id}>
                                                <Space
                                                    className="gap-x-1 group w-full justify-between !cursor-default"
                                                >
                                                    <span className="break-words leading-snug">
                                                        <Checkbox
                                                            onChange={(e) => {
                                                                setSelectedDescriptions?.((prev = []) => {
                                                                    if (e.target.checked)
                                                                        return [
                                                                            ...prev,
                                                                            {
                                                                                id,
                                                                                inputId: item.id,
                                                                                key: "templateDescription",
                                                                                inputName: manualItem?.inputName ?? "",
                                                                                event: "",
                                                                                description: manualItem?.description ?? "",
                                                                                uiCanvasName: manualItem?.uiName ?? "",
                                                                                uiCanvasId: manualItem?.uiId ?? "",
                                                                            },
                                                                        ];
                                                                    return prev.filter((desc) => desc.id !== id);
                                                                });
                                                            }}
                                                            checked={!!selectedDescriptions?.find(desc => desc.id === id)}
                                                        />
                                                        {manualItem?.label} {manualItem?.description}
                                                    </span>

                                                    {!readOnly && (
                                                        <EditOutlined
                                                            className="invisible group-hover:visible !cursor-pointer text-[16px]"
                                                            onClick={() => {
                                                                setSelectedInput({ ...item, uiName: selectedUI?.label });
                                                                openUICanvasActionsTemplateDescriptionUpdateDrawer();
                                                            }}
                                                        />
                                                    )}
                                                </Space>

                                                {isShowIssueStats && templateDescriptionCount && (
                                                    <div className="pl-5">
                                                        {templateDescriptionCount.closedCount > 0 && (
                                                            <Tag
                                                                color="#0000ff"
                                                                className="!cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "closed",
                                                                    })
                                                                }
                                                            >
                                                                closed - {templateDescriptionCount.closedCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.draftCount > 0 && (
                                                            <Tag
                                                                color="#c8c8c8"
                                                                className="!text-black cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "draft",
                                                                    })
                                                                }
                                                            >
                                                                draft - {templateDescriptionCount.draftCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.waitingCount > 0 && (
                                                            <Tag
                                                                color="geekblue"
                                                                className="!cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "waiting",
                                                                    })
                                                                }
                                                            >
                                                                waiting - {templateDescriptionCount.waitingCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.newCount > 0 && (
                                                            <Tag
                                                                color="#ffa500"
                                                                className="!text-black !cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "new",
                                                                    })
                                                                }
                                                            >
                                                                new - {templateDescriptionCount.newCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.ongoingCount > 0 && (
                                                            <Tag
                                                                color="#008000"
                                                                className="!cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "ongoing",
                                                                    })
                                                                }
                                                            >
                                                                ongoing - {templateDescriptionCount.ongoingCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.canceledCount > 0 && (
                                                            <Tag
                                                                color="#EF4444"
                                                                className="!cursor-pointer"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        status: "canceled",
                                                                    })
                                                                }
                                                            >
                                                                canceled - {templateDescriptionCount.canceledCount}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.totalEH > 0 && (
                                                            <Tag
                                                                className="!cursor-pointer"
                                                                color="#ef4444"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                    })
                                                                }
                                                            >
                                                                EH - {templateDescriptionCount.totalEH}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.totalSH > 0 && (
                                                            <Tag
                                                                className="!cursor-pointer"
                                                                color="#22c55e"
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                    })
                                                                }
                                                            >
                                                                SH - {templateDescriptionCount.totalSH}
                                                            </Tag>
                                                        )}

                                                        {templateDescriptionCount.bugCount > 0 && (
                                                            <Tag
                                                                className="!cursor-pointer"
                                                                color="error"
                                                                icon={<BugOutlined />}
                                                                onClick={() =>
                                                                    handleOpenIssueDrawer({
                                                                        ids: templateDescriptionCount?.issueIds,
                                                                        type: "bug",
                                                                    })
                                                                }
                                                            >
                                                                Bug - {templateDescriptionCount?.bugCount}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}


                            {item?.apiCall &&
                                Object.values(item?.apiCall)
                                    // .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
                                    .map((apiItem) => {



                                        const apiCallCount = issueData?.data?.find(item => item.id === apiItem.relId);
                                        return (
                                            <div key={apiItem?.relId}>
                                                <Space key={apiItem.relId}
                                                    className="w-full justify-between group !cursor-default">
                                                    <span className="">
                                                        <Checkbox
                                                            onChange={(e) => {
                                                                setSelectedDescriptions?.((prev = []) => {
                                                                    if (e.target.checked)
                                                                        return [
                                                                            ...prev,
                                                                            {
                                                                                id: apiItem.relId,
                                                                                inputId: item.id,
                                                                                key: "apiCall",
                                                                                inputName: apiItem?.inputName ?? "",
                                                                                event: apiItem?.event ?? "",
                                                                                description: apiItem?.description ?? "",
                                                                                uiCanvasName: apiItem?.uiName ?? "",
                                                                                uiCanvasId: apiItem?.uiId ?? "",
                                                                                apiName: apiItem?.apiName ?? "",
                                                                                apiId: apiItem?.api ?? "",
                                                                            },
                                                                        ]
                                                                    return prev.filter((desc) => desc.id !== apiItem.relId)
                                                                })
                                                            }}
                                                            checked={!!selectedDescriptions?.find(desc => desc.id === apiItem.relId)}
                                                        />
                                                        {apiItem.event && (
                                                            <Tag color={"#3b82f6"} className="ml-1 inline-block min-h-[22px]">
                                                                {apiItem?.event}
                                                            </Tag>
                                                        )}
                                                        <span>
                                                            Call API{" "}
                                                            <strong
                                                                onClick={() => {
                                                                    setApiCanvasDrawerData({
                                                                        open: true,
                                                                        data: { id: apiItem?.api },
                                                                    })
                                                                }}
                                                                className={`!cursor-pointer hover:text-[#0000FF] hover:underline`}
                                                            >
                                                                {apiItem?.apiName}
                                                            </strong>
                                                            , <i>{apiItem?.description}</i>
                                                        </span>
                                                    </span>

                                                    {!readOnly && (
                                                        <EditOutlined
                                                            className="invisible group-hover:visible !cursor-pointer text-[16px]"
                                                            onClick={() => {
                                                                setSelectedInput({
                                                                    ...apiItem,
                                                                    inputId: item.id,
                                                                    uiName: item?.apiCall?.uiName
                                                                })
                                                                openUICanvasUpdateAPIRelationDrawer()
                                                            }}
                                                        />
                                                    )}
                                                </Space>
                                                {
                                                    isShowIssueStats && apiCallCount && (
                                                        <div className="pl-5 pt-1">
                                                            {apiCallCount.closedCount > 0 && (
                                                                <Tag color="#0000ff"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "closed"
                                                                    })}>closed
                                                                    - {apiCallCount.closedCount}</Tag>
                                                            )}

                                                            {apiCallCount.draftCount > 0 && (
                                                                <Tag color="#c8c8c8" className="!text-black !cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "draft"
                                                                    })}>draft
                                                                    - {apiCallCount.draftCount}</Tag>
                                                            )}

                                                            {apiCallCount.waitingCount > 0 && (
                                                                <Tag color="geekblue"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "waiting"
                                                                    })}>waiting - {apiCallCount.waitingCount}</Tag>
                                                            )}

                                                            {apiCallCount.newCount > 0 && (
                                                                <Tag color="#ffa500" className="!text-black !cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "new"
                                                                    })}>new
                                                                    - {apiCallCount.newCount}</Tag>
                                                            )}

                                                            {apiCallCount.ongoingCount > 0 && (
                                                                <Tag color="#008000"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "ongoing"
                                                                    })}>ongoing
                                                                    - {apiCallCount.ongoingCount}</Tag>
                                                            )}

                                                            {apiCallCount.canceledCount > 0 && (
                                                                <Tag color="#EF4444"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        status: "canceled"
                                                                    })}>canceled
                                                                    - {apiCallCount.canceledCount}</Tag>
                                                            )}
                                                            {apiCallCount.totalEH > 0 &&
                                                                <Tag color="#ef4444"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds
                                                                    })}>EH- {apiCallCount.totalEH}</Tag>}

                                                            {apiCallCount.totalSH > 0 &&
                                                                <Tag color="#22c55e"
                                                                    className="!cursor-pointer"
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds
                                                                    })}>SH- {apiCallCount.totalSH}</Tag>}

                                                            {apiCallCount.bugCount > 0 && (
                                                                <Tag color="error" className="!cursor-pointer" icon={<BugOutlined />}
                                                                    onClick={() => handleOpenIssueDrawer({
                                                                        ids: apiCallCount?.issueIds,
                                                                        type: "bug"
                                                                    })}>
                                                                    Bug-{apiCallCount?.bugCount}
                                                                </Tag>
                                                            )}
                                                        </div>

                                                    )
                                                }
                                            </div>
                                        )
                                    })}

                            {Object.keys(formAction ?? {})?.length > 0 && (


                                <div>

                                    <Space key={`form-action-${item?.id}`}
                                        className="justify-between group !cursor-default w-full">
                                        <span className="flex items-center gap-x-1 flex-wrap">
                                            <Checkbox
                                                onChange={(e) => {


                                                    setSelectedDescriptions?.((prev = []) => {
                                                        if (e.target.checked)
                                                            return [
                                                                ...prev,
                                                                {
                                                                    id: item.id,
                                                                    inputId: item.id,
                                                                    descId: formAction?.action,
                                                                    key: "formAction",
                                                                    inputName: formAction?.inputName ?? "",
                                                                    action: formAction?.action ?? "",
                                                                    description: formAction?.condition ?? "",
                                                                    uiCanvasName: formAction?.uiName ?? "",
                                                                    uiCanvasId: formAction?.uiId ?? "",
                                                                },
                                                            ]

                                                        return prev.filter((desc) => desc.id !== item.id)
                                                    })
                                                }}
                                                checked={!!selectedDescriptions?.find(desc => desc.id === item.id)}
                                            />
                                            On Click
                                            {formAction?.action && (
                                                <Tag color={"#80cc28"} className="!text-white text-nowrap min-h-[22px]">
                                                    {FormActionEventLabel[formAction?.action] ?? ""}
                                                </Tag>
                                            )}
                                            {formAction?.uiId && (
                                                (() => {
                                                    const canOpenLinkedCanvas = Boolean(formAction?.uiId && setUICanvasPreviewDrawerData);

                                                    return (
                                                <strong
                                                    className={canOpenLinkedCanvas ? "!cursor-pointer hover:underline" : "!cursor-default"}
                                                    onClick={() => {
                                                        if (canOpenLinkedCanvas)
                                                            setUICanvasPreviewDrawerData({
                                                                open: true,
                                                                data: {
                                                                    id: formAction?.uiId,
                                                                    list: uiList
                                                                },
                                                            })
                                                    }}
                                                >
                                                    {uiList?.find((item) => item.id == formAction?.uiId)?.label}
                                                </strong>
                                                    );
                                                })()
                                            )}
                                            <span>{formAction?.condition && `,${formAction.condition}`}</span>
                                        </span>

                                        {!readOnly && (
                                            <EditOutlined
                                                className="invisible group-hover:visible !cursor-pointer text-[16px]"
                                                onClick={() => {
                                                    openUICanvasUpdateFormActionDrawer(true)
                                                    setSelectedInput({
                                                        ...formAction,
                                                        inputId: item.id,
                                                        uiName: formAction?.uiName
                                                    })
                                                }}
                                            />
                                        )}
                                    </Space>
                                    {
                                        isShowIssueStats && formActionRelationCount && (
                                            <div className="pl-5 pt-1">
                                                {formActionRelationCount.closedCount > 0 && (
                                                    <Tag className="!cursor-pointer" color="#0000ff"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "closed"
                                                        })}>closed
                                                        - {formActionRelationCount.closedCount}</Tag>
                                                )}

                                                {formActionRelationCount.draftCount > 0 && (
                                                    <Tag color="#c8c8c8" className="!text-black !cursor-pointer"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "draft"
                                                        })}>draft
                                                        - {formActionRelationCount.draftCount}</Tag>
                                                )}

                                                {formActionRelationCount.waitingCount > 0 && (
                                                    <Tag color="geekblue" className="!cursor-pointer"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "waiting"
                                                        })}>waiting
                                                        - {formActionRelationCount.waitingCount}</Tag>
                                                )}

                                                {formActionRelationCount.newCount > 0 && (
                                                    <Tag color="#ffa500" className="!text-black !cursor-pointer"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "new"
                                                        })}>new
                                                        - {formActionRelationCount.newCount}</Tag>
                                                )}

                                                {formActionRelationCount.ongoingCount > 0 && (
                                                    <Tag color="#008000" className="!cursor-pointer"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "ongoing"
                                                        })}>ongoing
                                                        - {formActionRelationCount.ongoingCount}</Tag>
                                                )}

                                                {formActionRelationCount.canceledCount > 0 && (
                                                    <Tag color="#EF4444" className="!cursor-pointer"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            status: "canceled"
                                                        })}>canceled
                                                        - {formActionRelationCount.canceledCount}</Tag>
                                                )}
                                                {
                                                    formActionRelationCount.totalEH > 0 && <Tag className="!cursor-pointer"
                                                        color="#ef4444"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds
                                                        })}>EH- {formActionRelationCount.totalEH}</Tag>
                                                }
                                                {
                                                    formActionRelationCount.totalSH > 0 && <Tag className="!cursor-pointer"
                                                        color="#22c55e"
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds
                                                        })}>SH- {formActionRelationCount.totalSH}</Tag>
                                                }

                                                {formActionRelationCount.bugCount > 0 && (
                                                    <Tag color="error" className="!cursor-pointer" icon={<BugOutlined />}
                                                        onClick={() => handleOpenIssueDrawer({
                                                            ids: formActionRelationCount?.issueIds,
                                                            type: "bug"
                                                        })}>
                                                        Bug-{formActionRelationCount?.bugCount}
                                                    </Tag>
                                                )}
                                            </div>

                                        )
                                    }
                                </div>
                            )}
                        </Space>
                    )
                },
            },
            !readOnly
                ? {
                    title: "",
                    key: "action",
                    width: 200,
                    className: `align-text-top ${readOnly ? "hidden" : ""}`,
                    render: (record) => {
                        const menuItems = [
                            ...baseActions,
                            ...(shouldShowExtraActions ? getAddRemoveActions(record) : [])
                        ].filter(Boolean);
                        return (
                            <Dropdown
                                menu={{
                                    items: menuItems,
                                    onClick: (e) => {
                                        handleAction(e.key, record)
                                    },
                                }}
                                trigger={["click"]}
                                className="w-full"
                            >
                                <Button
                                    className="w-full text-left flex justify-between items-center rounded-md  border-[#d9d9d9] h-[38px] bg-white">
                                    <span>Actions</span>
                                    <DownOutlined className="text-[#999]" />

                                </Button>
                            </Dropdown>
                        )
                    },
                }
                : null,
        ].filter(Boolean).flatMap(item => item)
        setInputColumns(columns)
    }

    const moveRow = async (dragRowId: string, hoverRowId: string) => {
        const previousInputTableData = [...inputTableData];

        try {
            const dragIndex = inputTableData.findIndex((item) => item.id === dragRowId);
            const hoverIndex = inputTableData.findIndex((item) => item.id === hoverRowId);

            if (dragIndex < 0 || hoverIndex < 0) return;
            if (dragIndex === hoverIndex) return;

            const newData = [...inputTableData];
            const dragRow = { ...newData[dragIndex] };
            const hoverRow = newData[hoverIndex];

            // === Parent logic ===
            if (["tbl", "table"].includes(hoverRow.componentType)) {
                dragRow.fkTableId = hoverRow.id;
                dragRow.hasLabel = false
                dragRow.fkGroupId = null;
            } else if (["grp", "group"].includes(hoverRow.componentType)) {
                dragRow.fkGroupId = hoverRow.id;
                if (!dragRow.hasLabel && !["btn", "hlink"].includes(dragRow.componentType)) dragRow.hasLabel = true
                dragRow.fkTableId = null;
            } else {
                if (!dragRow.hasLabel && !["btn", "hlink"].includes(dragRow.componentType)) dragRow.hasLabel = true
                dragRow.fkTableId = hoverRow.fkTableId || null;
                dragRow.fkGroupId = hoverRow.fkGroupId || null;
            }

            // Remove old position and insert new
            newData.splice(dragIndex, 1);
            newData.splice(hoverIndex, 0, dragRow);

            // === Order update ===
            let orderCounter = 0;
            newData.forEach(item => {
                if (!item.fkTableId && !item.fkGroupId) {
                    item.order = orderCounter++;
                    const children = newData.filter(c =>
                        c.fkTableId === item.id || c.fkGroupId === item.id
                    );
                    children.forEach(child => {
                        child.order = orderCounter++;
                    });
                }
            });

            // === Firebase update (dot-notation ile sadece değişen alanlar) ===
            const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
            const docSnap = await getDoc(uiCanvasDocRef);
            if (!docSnap.exists()) return;

            const canvasInputs = docSnap.data()?.input || {};
            const updatePayload: Record<string, any> = {};

            newData.forEach(item => {
                if (!canvasInputs[selectedUICanvasId][item.id]) return;
                updatePayload[`input.${selectedUICanvasId}.${item.id}.order`] = item.order ?? 0;
                updatePayload[`input.${selectedUICanvasId}.${item.id}.fkTableId`] = item.fkTableId ?? null;
                updatePayload[`input.${selectedUICanvasId}.${item.id}.fkGroupId`] = item.fkGroupId ?? null;
            });

            setInputTableData(utilBuildDisplayOrderData(newData));
            await updateDoc(uiCanvasDocRef, updatePayload);

            // Add to ui_canvas_history for drag and drop
            if (selectedUICanvasId) {
                await addDragDropHistoryRecord({
                    uiCanvasId: selectedUICanvasId,
                    draggedItem: {
                        id: dragRow.id,
                        inputName: dragRow.inputName,
                        oldIndex: dragIndex,
                        newIndex: hoverIndex,
                    },
                    actionType: 'DRAG_DROP_REORDER',
                });
            }

            message.success("Order updated successfully!");

        } catch (e) {
            console.error(e);
            setInputTableData(previousInputTableData);
            message.error("Error updating order");
        }
    };

    // Add to ui_canvas_history for drag and drop
    const addDragDropHistoryRecord = async (historyData: {
        uiCanvasId: string;
        draggedItem: any;
        actionType: string;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);

            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: historyData.actionType,
                fieldName: 'drag_drop_reorder',
                draggedItem: historyData.draggedItem,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);

            if (!historyDocSnap.exists()) {
                // Create new document
                await updateDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    drag_drop_reorder: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    drag_drop_reorder: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding drag drop history record:', error);
        }
    }

    useEffect(() => {
        if (selectedUICanvasId && !readOnly || (isShowIssueStats && issueData)) {
            buildColumns()
        }
    }, [selectedUICanvasId, selectedUI?.input, selectedUI?.label, selectedDescriptions, isShowIssueStats, issueData, selectedUICanvasInputRows])

    useEffect(() => {
        if (selectedUICanvasId && readOnly) {
            buildColumns()
        }
    }, [selectedUICanvasId])

    useEffect(() => {
        setInputTableData(utilBuildDisplayOrderData(Object.values(selectedUI?.input || {})));
    }, [selectedUI?.input]);

    return { inputTableData, selectedInput, setSelectedInput, moveRow }
}
