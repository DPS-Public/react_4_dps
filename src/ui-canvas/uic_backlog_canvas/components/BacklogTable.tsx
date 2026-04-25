
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, Form, Pagination } from "antd";
import { useSelector } from "react-redux";
import { RootState, useAppSelector } from "@/store";
import { IssueContext } from "../context/issueContext";
import useCreateIssue from "../hooks/useCreateIssue";

import services from "../services/backlogService";

import { TableProps } from "../types/backlogTypes.interface";
import { useBacklogTasks } from "../hooks/useBacklogTasks";
import { useCrdDrawer } from "../hooks/useCrdDrawer";
import { useAddCrdComponentDrawer } from "../hooks/useAddCrdComponentDrawer";
import { useCommitHistory } from "../hooks/useCommitHistory";
import { useIssueDetailDrawer } from "../hooks/useIssueDetailDrawer";
import { useBacklogCanvas, getValueSync, checkColor } from "../hooks/useBacklogCanvas";
import { useBacklogEffects } from "../hooks/useBacklogEffects";
import { useBacklogActions } from "../hooks/useBacklogActions";
import { configBacklogColumns, DEFAULT_BACKLOG_COLUMN_KEYS } from "../configs/columns/configBacklogColumns";
import { handleLoadExternalSourceCode } from "../handlers/handleLoadExternalSourceCode";
import { BacklogDrawers } from "./BacklogDrawers";
import KanbanBoard from "./componentElemets/KanbanBoard";
import DragM from "react-drag-listview";

// Define any type locally since it's not exported from antd
interface CustomTreeNode {
    key: string | number;
    title?: string;
    children?: any[];
    [key: string]: any;
}

const areStringArraysEqual = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

type BacklogRecord = Record<string, unknown> & { id: React.Key };

type BacklogHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
    style?: React.CSSProperties;
    className?: string;
};

type BacklogBodyCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
    style?: React.CSSProperties;
    className?: string;
};

type BacklogColumn = {
    key: string;
    title: React.ReactNode;
    dataIndex?: string;
    width?: number | string;
    align?: React.CSSProperties["textAlign"];
    render?: (value: unknown, record: BacklogRecord, rowIndex: number) => React.ReactNode;
    onCell?: (record: BacklogRecord, rowIndex: number) => BacklogBodyCellProps;
    onHeaderCell?: (column: BacklogColumn) => BacklogHeaderCellProps;
};

const COLUMN_FALLBACK_WIDTHS: Record<string, number> = {
    index: 68,
    status: 150,
    description: 420,
    assignee: 136,
    createdBy: 156,
    files: 280,
    commitCode: 240,
    uiCanvas: 260,
    type: 150,
    createdAt: 170,
    closedDate: 170,
    eh: 120,
    sh: 120,
};

const mergeClassNames = (...classNames: Array<string | undefined>) =>
    classNames.filter(Boolean).join(" ").trim();

const getColumnWidthStyle = (column: BacklogColumn) => {
    const width = column.width ?? COLUMN_FALLBACK_WIDTHS[column.key];

    if (width === undefined || width === null) {
        return {};
    }

    const resolvedWidth = typeof width === "number" ? `${width}px` : width;

    return {
        width: resolvedWidth,
        minWidth: resolvedWidth,
    } as React.CSSProperties;
};

const getColumnAlignmentStyle = (column: BacklogColumn) => {
    if (!column.align) {
        return {};
    }

    return {
        textAlign: column.align,
    } as React.CSSProperties;
};

const BacklogTable: React.FC<TableProps> = ({ data, disableDrawers = false }) => {
    const currentProject = useSelector((state: RootState) => state.project.currentProject);
    const currentRepo = useSelector((state: RootState) => state.project.currentRepo);
    const { users, currentUser } = useAppSelector((state) => state.auth);

    const {
        open, setOpen, edit, setEdit, toggle, apiFlag, setApiFlag,
        userId, activeCanvas, setActiveCanvas, uiFlag, setUiFlag,
        commentVisible, setCommentVisible, type, setType, setDisabled,
        status, setStatus, parentNo, setParentNo, parentNoFlag, setParentNoFlag,
        csflag, setCsflag, forward, setForward, api, setApi,
        filterValues, addCrdComponentDrawer, setAddCrdComponentDrawer,
        sprint, setSprint, relatedUICanvas, setRelatedUICanvas,
        calculateCodeLine, setCalculateCodeLine,
        calculateCodeLineEnabled, setCalculateCodeLineEnabled,
        viewMode, setCurrentTaskId, setCurrentTaskIds,
        backlogVisibleColumnKeys, setBacklogVisibleColumnKeys,
        backlogColumnResetVersion,
    } = useContext(IssueContext);

    // ─── Core data ─────────────────────────────────────────────────────────
    const { allTasks, setAllTasks, tasks, setTasks, filteredTask, refreshTasks } =
        useBacklogTasks(data, filterValues, userId);

    // ─── Drawer hooks ──────────────────────────────────────────────────────
    const crdDrawer = useCrdDrawer();
    const addCrdDrawer = useAddCrdComponentDrawer(addCrdComponentDrawer);
    const issueDetailDrawer = useIssueDetailDrawer(currentProject);
    const drawerState: any = null; const openViewDrawer: any = null; const closeDrawer: any = null; const setDrawerState: any = null;

    // ─── Canvas / API names (defaults) ─────────────────────────────────────
    // Default values to avoid TDZ errors - will be updated by useBacklogCanvas hook
    let canvas = {};
    let apiNames: Record<string, string> = {};

    // ─── Local state ───────────────────────────────────────────────────────
    const [externalSourceCodeDrawerOpen, setExternalSourceCodeDrawerOpen] = useState(false);
    const [externalSourceCode, setExternalSourceCode] = useState<string | null>(null);
    const [externalSourceCodeNode, setExternalSourceCodeNode] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState("source");
    const [codeLineCommitHistoryOpen, setCodeLineCommitHistoryOpen] = useState(false);
    const [codeLineCommitHistoryIssue, setCodeLineCommitHistoryIssue] = useState<any>(null);
    const [currentTaskCommits, setCurrentTaskCommits] = useState<any[]>([]);
    const [viewCollectionDrawerOpen, setViewCollectionDrawerOpen] = useState(false);
    const [viewCollectionNode, setViewCollectionNode] = useState<any | null>(null);
    const [hover, setHover] = useState("");
    const [canvasName, setCanvasName] = useState("");
    const [checkedRow, setCheckedRow] = useState<React.Key[]>([]);
    const [activeTask, setActiveTask] = useState<any>(null);
    const [activeClickedRowId, setActiveClickedRowId] = useState<React.Key | null>(null);
    const [commentValue, setCommentValue] = useState("");
    const [commentFlags, setCommentFlags] = useState<{ [key: string]: boolean }>({});
    const [apiCanvas, setApiCanvas] = useState<any>({});
    const [apiName, setApiName] = useState<any>(null);
    const [priorityFlag, setPriorityFlag] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [issueDetailInitialTab, setIssueDetailInitialTab] = useState<"details" | "comment">("details");
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [isColumnDragging, setIsColumnDragging] = useState(false);
    const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
    const [dropIndicatorColumnKey, setDropIndicatorColumnKey] = useState<string | null>(null);
    const [hydratedVisibilityStorageKey, setHydratedVisibilityStorageKey] = useState<string | null>(null);
    const [scrollAreaTop, setScrollAreaTop] = useState<number | null>(null);
    const [formDesc] = Form.useForm();
    const { createIssue } = useCreateIssue();
    const columnOrderStorageKey = useMemo(
        () => `uic-backlog-column-order:${currentProject?.id || "global"}`,
        [currentProject?.id]
    );
    const columnVisibilityStorageKey = useMemo(
        () => `uic-backlog-column-visibility:${currentProject?.id || "global"}`,
        [currentProject?.id]
    );
    const prevStorageKeyRef = useRef<string | null>(null);
    const tableWrapperRef = useRef<HTMLDivElement | null>(null);
    const tableScrollAreaRef = useRef<HTMLDivElement | null>(null);

    const commitHistory = useCommitHistory(externalSourceCodeDrawerOpen, externalSourceCodeNode, activeTab);

    useEffect(() => {
        setCurrentTaskIds(checkedRow as string[]);
        setCurrentTaskId(checkedRow.length === 1 ? String(checkedRow[0]) : "");
    }, [checkedRow, setCurrentTaskId, setCurrentTaskIds]);

    // ─── Side effects ──────────────────────────────────────────────────────
    useBacklogEffects({
        checkedRow, tasks, allTasks, currentProject, commentVisible, data, activeTask, formDesc,
        setDisabled, setCalculateCodeLineEnabled, setCommentFlags, setCommentValue,
        setExternalSourceCode, setExternalSourceCodeNode, setExternalSourceCodeDrawerOpen,
    });

    // ─── Actions ───────────────────────────────────────────────────────────
    const actions = useBacklogActions({
        currentProject, currentUser, currentRepo, allTasks, filteredTask, tasks,
        checkedRow, activeTask, commentValue, formDesc,
        selectedCrdComponent: addCrdDrawer.selectedCrdComponent,
        setOpen, setEdit, setCommentVisible, setStatus, setDisabled,
        setCheckedRow, setParentNo, setParentNoFlag, setTasks, setAllTasks, refreshTasks,
        closeAddCrdDrawer: addCrdDrawer.closeAddCrdDrawer,
        setAddCrdComponentDrawer,
        setSelectedIssue: issueDetailDrawer.setSelectedIssue,
        refreshSelectedIssue: issueDetailDrawer.refreshSelectedIssue,
        selectedIssue: issueDetailDrawer.selectedIssue,
    });

    // ─── Columns ───────────────────────────────────────────────────────────
    const baseColumns = useMemo(() => configBacklogColumns({
        toggle, hover, checkedRow, commentFlags, users, filteredTask,
        currentProject, currentUser, tasks, allTasks, canvas, apiNames,
        getValueSync: (arg) => getValueSync(arg, canvas),
        checkColor,
        onDescriptionClick: async (r) => {
            setIssueDetailInitialTab("details");
            const fullIssue = await services.getTaskById(currentProject.id, r.id);
            issueDetailDrawer.setSelectedIssue({ ...r, ...fullIssue });
            setCheckedRow([r.id]);
            issueDetailDrawer.setIssueDetailDrawerOpen(true);
        },
        onDescriptionCommentClick: async (r) => {
            setIssueDetailInitialTab("comment");
            const fullIssue = await services.getTaskById(currentProject.id, r.id);
            issueDetailDrawer.setSelectedIssue({ ...r, ...fullIssue });
            setCheckedRow([r.id]);
            issueDetailDrawer.setIssueDetailDrawerOpen(true);
        },
        onEditClick: (r) => {
            services.getTaskById(currentProject.id, r.id).then((d) => setActiveTask({ id: r.id, ...d }));
            setEdit(true);
        },
        onCommentClick: (r) => {
            setCommentVisible(true);
            services.getTaskById(currentProject.id, r.id).then((d) => setActiveTask({ id: r.id, ...d }));
        },
        onApiCanvasClick: (apiId, name) => { setApiCanvas({ id: apiId }); setApiFlag(true); setApiName(name); },
        onUiCanvasClick: (canvasId, name) => { setUiFlag(true); setActiveCanvas(canvasId); setCanvasName(name); },
        onParentClick: (r, no) => actions.getParent(r, no),
        onStatusChange: async (recordId, newStatus, oldStatus) => {
            await services.changeStatus(currentProject.id, recordId, newStatus, currentUser?.uid, currentUser?.displayName || currentUser?.email, oldStatus);
            if (newStatus === "closed") {
                const formatted = new Date().toISOString().replace("T", " ").slice(0, 19);
                await services.updateClosedDate(currentProject.id, recordId, formatted);
            }
        },
        onShEhChange: (id, sh, eh) => services.updateShEh(currentProject?.id, id, sh, eh),
        onCodeLineClick: (r) => { setCodeLineCommitHistoryIssue(r); setCodeLineCommitHistoryOpen(true); setCurrentTaskCommits(r.githubData); },
    }), [
        toggle, hover, checkedRow, commentFlags, users, filteredTask,
        currentProject, currentUser, tasks, allTasks, canvas, apiNames,
        setCodeLineCommitHistoryIssue, setCodeLineCommitHistoryOpen, setCurrentTaskCommits,
    ]);

    const incomingColumnKeys = useMemo(
        () =>
            baseColumns.map((column: any, index: number) =>
                String(column.key ?? column.dataIndex ?? `col-${index}`)
            ),
        [baseColumns]
    );
    const incomingColumnKeySignature = useMemo(
        () => incomingColumnKeys.join("|"),
        [incomingColumnKeys]
    );

    const columnsWithKeys = useMemo(
        () =>
            baseColumns.map((column: any, index: number) => {
                const resolvedKey = String(column.key ?? column.dataIndex ?? `col-${index}`);
                const prevOnHeaderCell = column.onHeaderCell;
                const isDropTargetColumn = dropIndicatorColumnKey === resolvedKey;
                const titleNode =
                    typeof column.title === "function" ? column.title : <span>{column.title}</span>;
                return {
                    ...column,
                    key: resolvedKey,
                    title: (
                        <div className="backlog-column-header-content">
                            <span className="backlog-column-header-title">{titleNode}</span>
                            <span
                                className="backlog-column-drag-handle"
                                role="button"
                                aria-label="Drag column"
                                onMouseDown={() => {
                                    setIsColumnDragging(true);
                                    setDraggedColumnKey(resolvedKey);
                                }}
                                onTouchStart={() => {
                                    setIsColumnDragging(true);
                                    setDraggedColumnKey(resolvedKey);
                                }}
                            >
                                {Array.from({ length: 6 }).map((_, dotIndex) => (
                                    <span key={`${resolvedKey}-dot-${dotIndex}`} className="backlog-column-drag-dot" />
                                ))}
                            </span>
                        </div>
                    ),
                    onHeaderCell: (col: any) => {
                        const prev = prevOnHeaderCell ? prevOnHeaderCell(col) : {};
                        return {
                            ...prev,
                            className: `${prev?.className ? `${prev.className} ` : ""}drag-column backlog-draggable-column ${isDropTargetColumn ? "backlog-drop-target-column" : ""}`.trim(),
                            "data-backlog-column-key": resolvedKey,
                        };
                    },
                    onCell: (record: any, rowIndex: number | undefined) => {
                        const prevCell = column.onCell ? column.onCell(record, rowIndex) : {};
                        return {
                            ...prevCell,
                            className: `${prevCell?.className ? `${prevCell.className} ` : ""}${isDropTargetColumn ? "backlog-drop-target-cell" : ""}`.trim(),
                        };
                    },
                };
            }),
        [baseColumns, dropIndicatorColumnKey]
    );

    useEffect(() => {
        let persistedOrder: string[] = [];

        try {
            const raw = localStorage.getItem(columnOrderStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    persistedOrder = parsed.map((item) => String(item));
                }
            }
        } catch {
            persistedOrder = [];
        }

        setColumnOrder((prev) => {
            const isStorageKeyChanged = prevStorageKeyRef.current !== columnOrderStorageKey;
            const baseOrder = isStorageKeyChanged
                ? persistedOrder
                : (persistedOrder.length ? persistedOrder : prev);
            const filteredBase = baseOrder.filter((key) => incomingColumnKeys.includes(key));
            const missing = incomingColumnKeys.filter((key) => !filteredBase.includes(key));
            const nextOrder = [...filteredBase, ...missing];
            return areStringArraysEqual(prev, nextOrder) ? prev : nextOrder;
        });
        prevStorageKeyRef.current = columnOrderStorageKey;
    }, [columnOrderStorageKey, incomingColumnKeySignature]);

    useEffect(() => {
        setHydratedVisibilityStorageKey(null);
        let persistedVisibility: string[] = [];

        try {
            const raw = localStorage.getItem(columnVisibilityStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    persistedVisibility = parsed.map((item) => String(item));
                }
            }
        } catch {
            persistedVisibility = [];
        }

        setBacklogVisibleColumnKeys((prev: string[]) => {
            const hasPersistedVisibility = persistedVisibility.length > 0;
            const baseVisibility = hasPersistedVisibility
                ? persistedVisibility
                : (prev?.length ? prev : DEFAULT_BACKLOG_COLUMN_KEYS);
            const filteredVisibility = baseVisibility.filter((key) => incomingColumnKeys.includes(key));
            const nextVisibility = filteredVisibility.length
                ? filteredVisibility
                : incomingColumnKeys;
            return areStringArraysEqual(prev || [], nextVisibility) ? prev : nextVisibility;
        });
        setHydratedVisibilityStorageKey(columnVisibilityStorageKey);
    }, [columnVisibilityStorageKey, incomingColumnKeySignature, setBacklogVisibleColumnKeys]);

    useEffect(() => {
        if (!columnOrder.length) {
            return;
        }
        localStorage.setItem(columnOrderStorageKey, JSON.stringify(columnOrder));
    }, [columnOrder, columnOrderStorageKey]);

    useEffect(() => {
        if (
            hydratedVisibilityStorageKey !== columnVisibilityStorageKey ||
            !backlogVisibleColumnKeys?.length
        ) {
            return;
        }
        localStorage.setItem(columnVisibilityStorageKey, JSON.stringify(backlogVisibleColumnKeys));
    }, [backlogVisibleColumnKeys, columnVisibilityStorageKey, hydratedVisibilityStorageKey]);

    const orderedColumns = useMemo(() => {
        const byKey = new Map(columnsWithKeys.map((column: any) => [String(column.key), column]));
        const ordered = columnOrder.map((key) => byKey.get(key)).filter(Boolean);
        return ordered.length === columnsWithKeys.length ? ordered : columnsWithKeys;
    }, [columnsWithKeys, columnOrder]);
    const visibleColumnKeySet = useMemo(
        () => new Set((backlogVisibleColumnKeys?.length ? backlogVisibleColumnKeys : incomingColumnKeys).filter((key) => incomingColumnKeys.includes(key))),
        [backlogVisibleColumnKeys, incomingColumnKeys]
    );
    const visibleOrderedColumns = useMemo(
        () => orderedColumns.filter((column: any) => visibleColumnKeySet.has(String(column.key))),
        [orderedColumns, visibleColumnKeySet]
    );
    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredTask.slice(startIndex, startIndex + pageSize);
    }, [filteredTask, currentPage, pageSize]);
    const visibleBacklogTasks = useMemo(
        () => (viewMode === "kanban" ? filteredTask : paginatedTasks),
        [filteredTask, paginatedTasks, viewMode]
    );

    // Update canvas and apiNames from hook
    const backlogCanvasResult = useBacklogCanvas(visibleBacklogTasks, currentProject?.id);
    canvas = backlogCanvasResult.canvas;
    apiNames = backlogCanvasResult.apiNames;

    const paginatedTaskKeys = useMemo(
        () => paginatedTasks.map((task: any) => task.id),
        [paginatedTasks]
    );
    const isCurrentPageFullySelected = useMemo(
        () =>
            paginatedTaskKeys.length > 0 &&
            paginatedTaskKeys.every((taskKey) => checkedRow.includes(taskKey)),
        [paginatedTaskKeys, checkedRow]
    );
    const isCurrentPagePartiallySelected = useMemo(
        () =>
            paginatedTaskKeys.some((taskKey) => checkedRow.includes(taskKey)) &&
            !isCurrentPageFullySelected,
        [paginatedTaskKeys, checkedRow, isCurrentPageFullySelected]
    );

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredTask.length / pageSize));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [filteredTask.length, currentPage, pageSize]);

    useEffect(() => {
        const scrollArea = tableScrollAreaRef.current;
        if (!scrollArea) {
            return;
        }

        scrollArea.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto",
        });
    }, [currentPage, pageSize, filteredTask.length, viewMode]);

    useEffect(() => {
        if (viewMode === "kanban") {
            return;
        }

        const updateScrollContentHeight = () => {
            const scrollArea = tableScrollAreaRef.current;
            if (!scrollArea) {
                return;
            }

            const topCoordinate = Math.max(0, Math.floor(scrollArea.getBoundingClientRect().top));
            setScrollAreaTop((prev) => (prev === topCoordinate ? prev : topCoordinate));
        };

        updateScrollContentHeight();
        const frameId = window.requestAnimationFrame(updateScrollContentHeight);
        window.addEventListener("resize", updateScrollContentHeight);

        const resizeObserver = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(updateScrollContentHeight)
            : null;

        if (resizeObserver && tableWrapperRef.current) {
            resizeObserver.observe(tableWrapperRef.current);
        }

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("resize", updateScrollContentHeight);
            resizeObserver?.disconnect();
        };
    }, [viewMode, filteredTask.length, currentPage, pageSize]);

    const onDragEndColumns = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
            setIsColumnDragging(false);
            setDraggedColumnKey(null);
            setDropIndicatorColumnKey(null);
            return;
        }
        setColumnOrder((prev) => {
            const fullOrder = prev.length === incomingColumnKeys.length ? [...prev] : [...incomingColumnKeys];
            const visibleOrder = fullOrder.filter((key) => visibleColumnKeySet.has(key));

            if (fromIndex >= visibleOrder.length || toIndex >= visibleOrder.length) {
                return prev;
            }

            const nextVisibleOrder = [...visibleOrder];
            const moved = nextVisibleOrder.splice(fromIndex, 1)[0];
            if (moved === undefined) return prev;
            nextVisibleOrder.splice(toIndex, 0, moved);

            let visibleIndex = 0;
            const nextFullOrder = fullOrder.map((key) =>
                visibleColumnKeySet.has(key) ? nextVisibleOrder[visibleIndex++] : key
            );

            return areStringArraysEqual(prev, nextFullOrder) ? prev : nextFullOrder;
        });
        setIsColumnDragging(false);
        setDraggedColumnKey(null);
        setDropIndicatorColumnKey(null);
    };

    useEffect(() => {
        if (!backlogColumnResetVersion) {
            return;
        }

        localStorage.removeItem(columnOrderStorageKey);
        setColumnOrder(incomingColumnKeys);
        setIsColumnDragging(false);
        setDraggedColumnKey(null);
        setDropIndicatorColumnKey(null);
    }, [backlogColumnResetVersion, columnOrderStorageKey, incomingColumnKeySignature]);

    useEffect(() => {
        const stopDrag = () => {
            setIsColumnDragging(false);
            setDraggedColumnKey(null);
            setDropIndicatorColumnKey(null);
        };
        window.addEventListener("mouseup", stopDrag);
        window.addEventListener("touchend", stopDrag);
        return () => {
            window.removeEventListener("mouseup", stopDrag);
            window.removeEventListener("touchend", stopDrag);
        };
    }, []);

    useEffect(() => {
        const handleExternalColumnOrder = (event: Event) => {
            const customEvent = event as CustomEvent<{ order?: string[] }>;
            const incomingOrder = Array.isArray(customEvent.detail?.order)
                ? customEvent.detail.order.map((item) => String(item))
                : [];

            if (!incomingOrder.length) {
                return;
            }

            setColumnOrder((prev) => {
                const filtered = incomingOrder.filter((key) => incomingColumnKeys.includes(key));
                const missing = incomingColumnKeys.filter((key) => !filtered.includes(key));
                const next = [...filtered, ...missing];
                return areStringArraysEqual(prev, next) ? prev : next;
            });

            setIsColumnDragging(false);
            setDraggedColumnKey(null);
            setDropIndicatorColumnKey(null);
        };

        window.addEventListener("backlog-column-order-change", handleExternalColumnOrder as EventListener);

        return () => {
            window.removeEventListener("backlog-column-order-change", handleExternalColumnOrder as EventListener);
        };
    }, [incomingColumnKeySignature]);

    const handleColumnDragTarget = (event: React.DragEvent<HTMLDivElement>) => {
        if (!isColumnDragging) {
            return;
        }
        const target = event.target as HTMLElement | null;
        const hoveredHeader = target?.closest("th.drag-column[data-backlog-column-key]") as HTMLTableCellElement | null;
        if (!hoveredHeader) {
            return;
        }

        const headers = Array.from(
            tableWrapperRef.current?.querySelectorAll<HTMLTableCellElement>("th.drag-column[data-backlog-column-key]") || []
        );
        const hoveredIndex = headers.findIndex((header) => header === hoveredHeader);
        const draggedIndex = headers.findIndex(
            (header) => header.dataset.backlogColumnKey === draggedColumnKey
        );

        if (hoveredIndex < 0) {
            return;
        }

        const indicatorHeader =
            draggedIndex >= 0 && hoveredIndex > draggedIndex && hoveredIndex < headers.length - 1
                ? headers[hoveredIndex + 1]
                : hoveredHeader;
        const nextColumnKey = indicatorHeader?.dataset.backlogColumnKey ?? null;

        if (nextColumnKey) {
            setDropIndicatorColumnKey(nextColumnKey);
        }
    };

    const handleSelectAllRowsOnPage = (event: { target?: { checked?: boolean } }) => {
        const isChecked = Boolean(event?.target?.checked);
        const paginatedTaskKeySet = new Set(paginatedTaskKeys.map((key) => String(key)));

        setCheckedRow((prev) => {
            if (isChecked) {
                const nextKeys = Array.from(new Set([...prev, ...paginatedTaskKeys]));
                return nextKeys;
            }

            return prev.filter((key) => !paginatedTaskKeySet.has(String(key)));
        });
    };

    const handleSelectSingleRow = (rowKey: React.Key, isChecked: boolean) => {
        setCheckedRow((prev) => {
            if (isChecked) {
                return prev.includes(rowKey) ? prev : [...prev, rowKey];
            }

            return prev.filter((key) => key !== rowKey);
        });
    };

    const renderColumnCell = (column: BacklogColumn, record: BacklogRecord, rowIndex: number) => {
        const value = column.dataIndex ? record?.[column.dataIndex] : undefined;

        if (typeof column.render === "function") {
            return column.render(value, record, rowIndex);
        }

        if (React.isValidElement(value)) {
            return value;
        }

        if (value === undefined || value === null || value === "") {
            return "-";
        }

        return String(value);
    };

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div className="bg-white border border-[#e5e7eb] w-full rounded-[10px] flex-1   pb-[15px] min-h-0 flex flex-col overflow-hidden h-[calc(100vh-100px)]">

            <BacklogDrawers
                // create
                open={open} createIssue={createIssue} onClose={actions.close}
                // issue detail
                issueDetailDrawerOpen={issueDetailDrawer.issueDetailDrawerOpen}
                closeIssueDetailDrawer={issueDetailDrawer.closeIssueDetailDrawer}
                selectedIssue={issueDetailDrawer.selectedIssue}
                issueDetailInitialTab={issueDetailInitialTab}
                currentProject={currentProject}
                onIssueDetailUpdate={actions.onIssueDetailUpdate}
                refreshSelectedIssue={issueDetailDrawer.refreshSelectedIssue}
                setSelectedIssue={issueDetailDrawer.setSelectedIssue}
                setTasks={setTasks} setAllTasks={setAllTasks}
                // canvas
                uiFlag={uiFlag} setUiFlag={setUiFlag} activeCanvas={activeCanvas} setActiveCanvas={setActiveCanvas}
                canvasName={canvasName}
                apiFlag={apiFlag} setApiFlag={setApiFlag} apiCanvas={apiCanvas} setApiCanvas={setApiCanvas}
                currentRepo={currentRepo}
                // crd
                crdDrawer={crdDrawer}
                handleDeleteCrdComponent={actions.onDeleteCrdComponent}
                openViewDrawer={openViewDrawer}
                drawerState={drawerState} closeDrawer={closeDrawer} setDrawerState={setDrawerState}
                handleLoadExternalSourceCode={handleLoadExternalSourceCode}
                setExternalSourceCode={setExternalSourceCode}
                setExternalSourceCodeNode={setExternalSourceCodeNode}
                setExternalSourceCodeDrawerOpen={setExternalSourceCodeDrawerOpen}
                // external source code
                externalSourceCodeDrawerOpen={externalSourceCodeDrawerOpen}
                externalSourceCodeNode={externalSourceCodeNode}
                externalSourceCode={externalSourceCode}
                activeTab={activeTab} setActiveTab={setActiveTab}
                commitHistory={commitHistory}
                // add crd
                addCrdDrawer={addCrdDrawer} checkedRow={checkedRow}
                onAddCrdComponent={() => actions.onAddCrdComponent()}
                setAddCrdComponentDrawer={setAddCrdComponentDrawer}
                // bulk action drawers
                edit={edit} setEdit={setEdit}
                commentVisible={commentVisible} setCommentVisible={setCommentVisible}
                status={status} setStatus={setStatus}
                formDesc={formDesc} commentValue={commentValue} setCommentValue={setCommentValue}
                updateComment={actions.updateComment}
                updateDescription={actions.updateDescription}
                changeStatus={actions.changeStatus}
                allTasks={allTasks}
                // type/sprint
                type={type} setType={setType} sprint={sprint} setSprint={setSprint}
                csflag={csflag} setCsflag={setCsflag} forward={forward} setForward={setForward}
                api={api} setApi={setApi}
                relatedUICanvas={relatedUICanvas} setRelatedUICanvas={setRelatedUICanvas}
                calculateCodeLine={calculateCodeLine} setCalculateCodeLine={setCalculateCodeLine}
                setPriorityFlag={setPriorityFlag}
                // parent task
                disableDrawers={disableDrawers}
                parentNo={parentNo} setParentNo={setParentNo}
                parentNoFlag={parentNoFlag} setParentNoFlag={setParentNoFlag}
                refreshTasks={refreshTasks}
                // collection
                viewCollectionDrawerOpen={viewCollectionDrawerOpen}
                setViewCollectionDrawerOpen={setViewCollectionDrawerOpen}
                viewCollectionNode={viewCollectionNode} setViewCollectionNode={setViewCollectionNode}
                // code line
                codeLineCommitHistoryOpen={codeLineCommitHistoryOpen}
                setCodeLineCommitHistoryOpen={setCodeLineCommitHistoryOpen}
                codeLineCommitHistoryIssue={codeLineCommitHistoryIssue}
                setCodeLineCommitHistoryIssue={setCodeLineCommitHistoryIssue}
                currentTaskCommits={currentTaskCommits}
            />

            {viewMode === "kanban" ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <KanbanBoard
                        issues={filteredTask} users={users} currentProject={currentProject}
                        onIssueClick={async (issue) => {
                            const fullIssue = await services.getTaskById(currentProject.id, issue.id);
                            issueDetailDrawer.setSelectedIssue({ ...issue, ...fullIssue });
                            setCheckedRow([issue.id]);
                            issueDetailDrawer.setIssueDetailDrawerOpen(true);
                        }}
                        onDescriptionClick={async (issue) => {
                            const fullIssue = await services.getTaskById(currentProject.id, issue.id);
                            issueDetailDrawer.setSelectedIssue({ ...issue, ...fullIssue });
                            setCheckedRow([issue.id]);
                            issueDetailDrawer.setIssueDetailDrawerOpen(true);
                        }}
                        onCodeLineClick={(issue) => { setCodeLineCommitHistoryIssue(issue); setCodeLineCommitHistoryOpen(true); }}
                        onUICanvasClick={(canvasId) => { setActiveCanvas(canvasId); setUiFlag(true); }}
                        onApiClick={async (apiId, name) => { setApiCanvas({ id: apiId }); setApiFlag(true); setApiName(name); }}
                        onCrdTreeClick={(nodeInfo, issue) => {
                            crdDrawer.setCrdDrawerNodeId(nodeInfo.nodeId);
                            crdDrawer.setCrdDrawerRepoId((nodeInfo.githubRepoId?.trim() || null) ?? issue?.collection?.repoId ?? currentRepo ?? null);
                            crdDrawer.setCrdDrawerOpen(true);
                        }}
                        onSourceCodeClick={async (nodeInfo, issue) => {
                            if (nodeInfo.githubPath || nodeInfo.path) {
                                const repoId = (nodeInfo.githubRepoId?.trim() || null) ?? issue?.collection?.repoId ?? currentRepo ?? null;
                                openViewDrawer({ id: nodeInfo.nodeId || "", name: (nodeInfo.path || nodeInfo.githubPath || "").split("/").pop() || "", type: "file", pathName: nodeInfo.path || nodeInfo.githubPath || "", githubPath: nodeInfo.path || nodeInfo.githubPath || "", githubRepoFullName: nodeInfo.githubRepoFullName || "", githubBranch: nodeInfo.githubBranch || "main", githubRepoId: repoId });
                            } else if (nodeInfo.externalPath && nodeInfo.externalRepoFullName) {
                                await handleLoadExternalSourceCode({ repoFullName: nodeInfo.externalRepoFullName, filePath: nodeInfo.externalPath, branch: nodeInfo.externalBranch || "main", nodeId: nodeInfo.nodeId, onSuccess: (content, node) => { setExternalSourceCode(content); setExternalSourceCodeNode(node); setExternalSourceCodeDrawerOpen(true); } });
                            }
                        }}
                        onCreateIssue={() => setOpen(true)}
                        getValueSync={(arg) => getValueSync(arg, canvas)}
                        apiNames={apiNames} canvas={canvas}
                        onIssuesUpdate={(updated) => { setTasks(updated); setAllTasks(updated); }}
                    />
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col backlog-table-container">
                    <DragM.DragColumn
                        onDragEnd={onDragEndColumns}
                        nodeSelector="th.drag-column"
                        handleSelector=".backlog-column-drag-handle"
                        ignoreSelector="th:not(.drag-column)"
                        lineClassName="backlog-column-drop-line"
                    >
                        <div
                            ref={tableWrapperRef}
                            className="backlog-table-layout flex-1 min-h-0 min-w-0 h-full overflow-hidden"
                            onDragEnterCapture={handleColumnDragTarget}
                            onDragOverCapture={handleColumnDragTarget}
                        >
                            <div
                                ref={tableScrollAreaRef}
                                className="backlog-table-scroll-area flex-1 min-h-0 min-w-0 overflow-auto"
                            >
                                <div
                                    className="backlog-table-scroll-content"
                                    style={scrollAreaTop !== null ? { height: `calc(100vh - ${scrollAreaTop}px - 90px)` } : undefined}
                                >
                                    <table className="backlog-native-table backlog-minimal-table custom-table select-none">
                                        <colgroup>
                                            <col style={{ width: "44px", minWidth: "44px" }} />
                                            {visibleOrderedColumns.map((column: BacklogColumn) => (
                                                <col
                                                    key={`col-${String(column.key)}`}
                                                    style={getColumnWidthStyle(column)}
                                                />
                                            ))}
                                        </colgroup>
                                        <thead >
                                            <tr className="backlog-sticky-header">
                                                <th className="backlog-selection-column backlog-sticky-selection-col">
                                                    <Checkbox
                                                        checked={isCurrentPageFullySelected}
                                                        indeterminate={isCurrentPagePartiallySelected}
                                                        onChange={handleSelectAllRowsOnPage}
                                                        disabled={!paginatedTaskKeys.length}
                                                    />
                                                </th>
                                                {visibleOrderedColumns.map((column: BacklogColumn) => {
                                                    const headerProps = column.onHeaderCell?.(column) ?? {};
                                                    const headerStyle = {
                                                        ...getColumnWidthStyle(column),
                                                        ...getColumnAlignmentStyle(column),
                                                        ...(headerProps.style || {}),
                                                    };

                                                    return (
                                                        <th
                                                            key={String(column.key)}
                                                            {...headerProps}
                                                            className={mergeClassNames(
                                                                "backlog-native-header-cell backlog-sticky-header-cell",
                                                                headerProps.className
                                                            )}
                                                            style={headerStyle}
                                                        >
                                                            {column.title}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedTasks.map((record: BacklogRecord, rowIndex: number) => {
                                                const isChecked = checkedRow.includes(record.id);
                                                const rowClassName = mergeClassNames(
                                                    rowIndex % 2 === 0
                                                        ? "backlog-minimal-row-even"
                                                        : "backlog-minimal-row-odd",
                                                    isChecked ? "backlog-row-checked" : undefined,
                                                    activeClickedRowId === record.id ? "backlog-row-active" : undefined
                                                );

                                                return (
                                                    <tr
                                                        key={record.id}
                                                        className={rowClassName}
                                                        onClick={() => setActiveClickedRowId(record.id)}
                                                        onMouseEnter={() => setHover(String(record.id))}
                                                        onMouseLeave={() => setHover("")}
                                                    >
                                                        <td className="backlog-selection-column backlog-sticky-selection-col">
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onChange={(event) =>
                                                                    handleSelectSingleRow(
                                                                        record.id,
                                                                        Boolean(event?.target?.checked)
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        {visibleOrderedColumns.map((column: BacklogColumn) => {
                                                            const cellProps =
                                                                column.onCell?.(record, rowIndex) ?? {};
                                                            const cellStyle = {
                                                                ...getColumnWidthStyle(column),
                                                                ...(cellProps.style || {}),
                                                                textAlign: "left" as const,
                                                            };

                                                            return (
                                                                <td
                                                                    key={`${record.id}-${String(column.key)}`}
                                                                    {...cellProps}
                                                                    className={mergeClassNames(
                                                                        "backlog-native-body-cell",
                                                                        column.key === "createdAt" || column.key === "closedDate"
                                                                            ? "whitespace-nowrap"
                                                                            : undefined,
                                                                        cellProps.className
                                                                    )}
                                                                    style={cellStyle}
                                                                >
                                                                    {renderColumnCell(column, record, rowIndex)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                            {!paginatedTasks.length && (
                                                <tr className="backlog-native-empty-row">
                                                    <td
                                                        className="backlog-native-empty-cell"
                                                        colSpan={visibleOrderedColumns.length + 1}
                                                    >
                                                        No issues found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="backlog-table-bottom-panel shrink-0 backlog-sticky-footer">
                                <div className="backlog-table-footer text-left">
                                   
                                </div>

                                <div className="backlog-table-pagination-row">
                                    <Pagination
                                        current={currentPage}
                                        pageSize={pageSize}
                                        total={filteredTask.length}
                                        showSizeChanger
                                        showQuickJumper
                                        pageSizeOptions={[50, 100]}
                                        size="small"
                                        showTotal={(total, range) => (
                                            <span className="text-gray-500 text-xs">
                                                {total === 0 ? 0 : range[1] - range[0] + 1} / {total} issues
                                            </span>
                                        )}
                                        onChange={(page, size) => {
                                            if (size !== pageSize) {
                                                setPageSize(size);
                                                setCurrentPage(1);
                                                return;
                                            }

                                            setCurrentPage(page);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </DragM.DragColumn>
                </div>
            )}
        </div>
    );
};

export default BacklogTable;
 
