import { db } from '@/config/firebase';
import { ApiOutlined, AppstoreAddOutlined, AppstoreOutlined, CodeOutlined, CopyOutlined, FilterOutlined, FlagOutlined, FolderAddOutlined, GithubOutlined, HourglassOutlined, PlusOutlined, PoweroffOutlined, SettingOutlined, ShareAltOutlined, TableOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Badge, Button, Checkbox, message, Popover, Progress, Select, Tabs, Tooltip } from "antd";
import Search from 'antd/es/input/Search';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import html2canvas from "html2canvas";
import { useContext, useEffect, useRef, useState } from "react";
import * as XLSX from 'xlsx-js-style';
import { IssueContext } from "../context/issueContext";
import services from "../services/backlogService";
import GithubCommitsDrawer from '../../uic_backlog_canvas_add_github_commits_as_issue/canvasGithubCommitsDrawer';
import { useAppSelector } from '@/store';
import GetGithubCommitsForIssueDrawer from '../../issue-github-commit-drawer/GetGithubCommitsForIssueDrawer';
import { BACKLOG_COLUMN_META, DEFAULT_BACKLOG_COLUMN_KEYS } from '../configs/columns/configBacklogColumns';

export const Toolbox = ({ current }) => {
    const getFilterStorageKey = (projectId?: string) => `backlog_filter_values_${projectId || "default"}`;
    const getColumnOrderStorageKey = (projectId?: string) => `uic-backlog-column-order:${projectId || "global"}`;

    const countActiveFilters = (values: Record<string, any>) =>
        Object.entries(values || {}).filter(([_, value]) => {
            if (value === undefined || value === null || value === "") return false;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        }).length;
 
    
    const [tasks, setTasks] = useState<any[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [exportData, setExportData] = useState<any[]>([]); // State for export data
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [githubCommitsDrawerOpen, setGithubCommitsDrawerOpen] = useState(false);
    const [columnSettingsOrder, setColumnSettingsOrder] = useState<string[]>(DEFAULT_BACKLOG_COLUMN_KEYS);
    const [draggingColumnKey, setDraggingColumnKey] = useState<string | null>(null);
    const [dragOverColumnKey, setDragOverColumnKey] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const justLoadedRef = useRef(false);

    const { currentProject, filterValues, setFilterValues, toggle, setToggle, type, setType, setOpen, disabled, sprint, setSprint, setStatus, setCsflag, csflag, status, setForward, forward, setFilter, api, setApi, relatedUICanvas, setRelatedUICanvas, addCrdComponentDrawer, setAddCrdComponentDrawer, calculateCodeLine, setCalculateCodeLine, calculateCodeLineEnabled, viewMode, setViewMode, countFilter, setCountFilter, setUserId, userId,
         getCommitsFromGithub, setGetCommitsFromGithub,currentTaskId,setCurrentTaskId, currentTaskIds,setCurrentTaskIds,
         backlogVisibleColumnKeys, setBacklogVisibleColumnKeys, setBacklogColumnResetVersion,
     } = useContext(IssueContext);
    const { currentUser } = useAppSelector(state => state.auth);
    const hasSelectedIssues = Array.isArray(currentTaskIds) && currentTaskIds.length > 0;

    const menuItems = [
        { title: "Issue Filter", icon: <FilterOutlined />, function: () => setFilter(true) },
        { title: "Toggle Estimated/Spend Hours", icon: <HourglassOutlined />, function: () => setToggle(!toggle), active: toggle },
        { title: "Change Issue Status", icon: <UnorderedListOutlined />, function: () => setStatus(!status), active: status, disabled },
        { title: "Update Issue Type", icon: <FlagOutlined />, function: () => setType(!type), active: type, disabled },
        { title: "Forward Issue(s)", icon: <ShareAltOutlined />, function: () => setForward(!forward), active: forward, disabled },
        { title: "Close and Send Issue(s)", icon: <CopyOutlined />, function: () => setCsflag(!csflag), active: csflag, disabled },
        { title: "Add API Relation", icon: <ApiOutlined />, function: () => setApi(!api), active: api, disabled },
        { title: "Add to Sprint", icon: <PoweroffOutlined />, function: () => setSprint(!sprint), active: sprint, disabled },
        { title: "Related UI Canvas", icon: <AppstoreOutlined />, function: () => setRelatedUICanvas(!relatedUICanvas), active: relatedUICanvas, disabled },
        { title: "Add CRD Component", icon: <FolderAddOutlined />, function: () => setAddCrdComponentDrawer(!addCrdComponentDrawer), active: addCrdComponentDrawer, disabled },
        { title: "Calculate Code Line", icon: <CodeOutlined />, function: () => setCalculateCodeLine(!calculateCodeLine), active: calculateCodeLine, disabled: disabled || !calculateCodeLineEnabled },
        { title: "Get Commits", icon: <GithubOutlined />,function: () => setGetCommitsFromGithub(!getCommitsFromGithub), active: getCommitsFromGithub, disabled },
    ];
    const hiddenMenuItemTitles = new Set([
        "Toggle Estimated/Spend Hours",
        "Add API Relation",
        "Add to Sprint",
        "Related UI Canvas",
        "Add CRD Component",
        "Calculate Code Line",
        "Get Commits",
    ]);
    const visibleMenuItems = menuItems.filter((item) => !hiddenMenuItemTitles.has(item.title));
    const alwaysVisibleMenuItemTitles = new Set(["Issue Filter"]);
    const persistentMenuItems = visibleMenuItems.filter((item) => alwaysVisibleMenuItemTitles.has(item.title));
    const selectionMenuItems = visibleMenuItems.filter((item) => !alwaysVisibleMenuItemTitles.has(item.title));

    useEffect(() => {
        if (!currentProject?.id) return;
        services.getTasks(currentProject.id).then(tasks => setTasks(tasks || []));
        fetchExportData();
    }, [currentProject]);

    useEffect(() => {
        if (!currentProject?.id) return;

        const storageKey = getFilterStorageKey(currentProject.id);
        let parsedFilters: Record<string, any> = {};

        try {
            parsedFilters = JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
        } catch {
            parsedFilters = {};
        }

        justLoadedRef.current = true;
        setFilterValues(parsedFilters);
        setCountFilter(countActiveFilters(parsedFilters));
        setSearchText(parsedFilters.searchKeyword || "");

        const uid = currentUser?.uid;
        const hasMyIssueStatuses =
            Array.isArray(parsedFilters?.status) &&
            parsedFilters.status.includes("new") &&
            parsedFilters.status.includes("ongoing");

        if (uid && parsedFilters?.assignee === uid && hasMyIssueStatuses) {
            setUserId({ status: true, id: uid });
        } else {
            setUserId({ status: false, id: uid || "" });
        }
    }, [currentProject?.id]);

    useEffect(() => {
        if (justLoadedRef.current) {
            justLoadedRef.current = false;
            return;
        }
        if (!currentProject?.id) return;
        const storageKey = getFilterStorageKey(currentProject.id);
        localStorage.setItem(storageKey, JSON.stringify(filterValues || {}));
        setCountFilter(countActiveFilters(filterValues || {}));
    }, [filterValues]);

    useEffect(() => {
        const allKeys: string[] = BACKLOG_COLUMN_META.map((column) => column.key);
        let persistedOrder: string[] = [];

        try {
            const raw = localStorage.getItem(getColumnOrderStorageKey(currentProject?.id));
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    persistedOrder = parsed.map((item) => String(item));
                }
            }
        } catch {
            persistedOrder = [];
        }

        const filtered = persistedOrder.filter((key) => allKeys.includes(key));
        const missing = allKeys.filter((key) => !filtered.includes(key));
        setColumnSettingsOrder([...filtered, ...missing]);
    }, [currentProject?.id]);

    useEffect(() => {
        const handleExternalReset = () => {
            const defaultOrder = BACKLOG_COLUMN_META.map((column) => column.key);
            setColumnSettingsOrder(defaultOrder);
            setDraggingColumnKey(null);
            setDragOverColumnKey(null);
        };

        window.addEventListener("backlog-column-order-reset", handleExternalReset);

        return () => {
            window.removeEventListener("backlog-column-order-reset", handleExternalReset);
        };
    }, []);

    const handleColumnOrderDrop = (targetKey: string) => {
        if (!draggingColumnKey || draggingColumnKey === targetKey) {
            setDragOverColumnKey(null);
            return;
        }

        setColumnSettingsOrder((prev) => {
            const sourceIndex = prev.indexOf(draggingColumnKey);
            const targetIndex = prev.indexOf(targetKey);

            if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
                return prev;
            }

            const next = [...prev];
            const [moved] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, moved);

            window.dispatchEvent(
                new CustomEvent("backlog-column-order-change", {
                    detail: { order: next },
                })
            );

            return next;
        });

        setDragOverColumnKey(null);
    };
    const fetchExportData = async () => {
        if (!currentProject?.id) return;

        try {
            const collectionName = `backlog_${currentProject.id}`;
            const querySnapshot = await getDocs(collection(db, collectionName));

            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setExportData(data);
        } catch (error) {
            message.error("Failed to load export data");
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    const getMyIssues = (isMyIssueActive: boolean) => {
        const uidFromAuth = currentUser?.uid;
        let uidFromStorage: string | undefined;

        try {
            const stored = JSON.parse(localStorage.getItem("userData") || "{}");
            uidFromStorage = stored?.uid;
        } catch {
            uidFromStorage = undefined;
        }

        const uid = uidFromAuth || uidFromStorage;
        if (!uid) {
            message.warning("User not found. Please login again.");
            return;
        }

        if (isMyIssueActive) {
            setFilterValues({});
            setSearchText("");
            setUserId({ status: false, id: uid });
            return;
        }

        setFilterValues({
            assignee: uid,
            status: ["new", "ongoing"],
        });
        setUserId({ status: true, id: uid });
    }
    const handleImportJson = async (file: File) => {
        if (!currentProject?.id) {
            message.error("Please select a project first!");
            return false;
        }

        setIsImporting(true);
        setImportProgress(0);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result as string;
                    const jsonData = JSON.parse(data);

                    if (!Array.isArray(jsonData)) {
                        message.error("Invalid JSON format. Expected an array.");
                        setIsImporting(false);
                        return;
                    }

                    if (jsonData.length === 0) {
                        message.warning("JSON file is empty!");
                        setIsImporting(false);
                        return;
                    }

                    const collectionName = `backlog_${currentProject.id}`;
                    let successCount = 0;
                    let errorCount = 0;

                    // Import each item to Firestore with progress updates
                    for (let i = 0; i < jsonData.length; i++) {
                        try {
                            const item = jsonData[i];
                            const { id, ...itemData } = item;
                            const cleanItem = Object.fromEntries(
                                Object.entries(itemData).filter(([_, value]) => value !== undefined && value !== null)
                            );

                            await addDoc(collection(db, collectionName), cleanItem);
                            successCount++;
                            const progress = Math.round(((i + 1) / jsonData.length) * 100);
                            setImportProgress(progress);

                        } catch (error) {
                            console.error("Error importing item:", error);
                            errorCount++;
                        }
                    }

                    message.success(`Successfully imported ${successCount} issues${errorCount > 0 ? `, ${errorCount} failed` : ''}`);

                    // Reset progress
                    setTimeout(() => {
                        setImportProgress(0);
                        setIsImporting(false);
                    }, 1000);

                    // Refresh data after import
                    fetchExportData();
                    services.getTasks(currentProject.id).then(tasks => setTasks(tasks || []));

                } catch (error) {
                    console.error("Error processing JSON file:", error);
                    message.error("Failed to process JSON file. Please check the format.");
                    setIsImporting(false);
                }
            };

            reader.readAsText(file);
        } catch (error) {
            message.error("Failed to import JSON file");
            setIsImporting(false);
        }
    };

    // Handle file input change
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is JSON
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            message.error('Please select a JSON file');
            return;
        }

        handleImportJson(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const exportValue = async (value: string) => {
        if (value === "img") {
            const canvas = await html2canvas(current.current);
            canvas.toBlob(blob => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => message.success("Image copied to clipboard")).catch(() => message.error("Something went wrong!"));
                    const link = document.createElement('a');
                    link.download = "canvas.jpeg";
                    link.href = canvas.toDataURL("image/jpeg", 0.95);
                    link.click();
                }
                else message.error("Something went wrong!");
            });
        }
        else if (value === "excel") {
            if (tasks?.length === 0) {
                message.warning("No data to export!");
                return;
            }

            const formattedData = tasks?.map(item => ({
                "No": item?.no || "",
                "Status": item?.status || "",
                "Type": item?.type || "",
                "Description": item?.description || "",
                "UICanvas": item?.uiCanvas || "",
                "UICanvas ID": item?.uiCanvasId || "",
                "Assignee": item?.assignee || "",
                "Assignee Name": item?.assigneeName || "",
                "Assignee Photo": item?.assigneePhotoUrl || "",
                "Created By": item?.createdBy || "",
                "Created Date": item?.createdAt || "",
                "Closed Date": item?.closedDate || "",
                "EH": item?.eh || 0,
                "SH": item?.sh || 0,
                "API": item?.api || "",
                "API Description": item?.apiDescription || "",
                "Comment": item?.comment || "",
                "Image URL": item?.imageUrl ? JSON.stringify(item.imageUrl) : ""
            }));

            if (formattedData.length === 0) {
                message.warning("No data to export!");
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!worksheet[cell_address]) continue;
                worksheet[cell_address].s = {
                    fill: { fgColor: { rgb: "4F81BD" } },
                    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            const colWidths = Object.keys(formattedData[0]).map(key => ({ wch: Math.max(key.length, 20) }));
            worksheet['!cols'] = colWidths;
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'BacklogIssues');
            XLSX.writeFile(workbook, `backlog_${currentProject?.id || 'export'}.xlsx`);
        }
        else if (value === "json") {
            if (exportData.length === 0) {
                message.warning("No data to export!");
                return;
            }

            try {
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });

                const link = document.createElement('a');
                link.download = `backlog_${currentProject?.id || 'data'}.json`;
                link.href = URL.createObjectURL(dataBlob);
                link.click();

                URL.revokeObjectURL(link.href);

                message.success(`Exported ${exportData.length} records as JSON`);
            } catch (error) {
                console.error("Error exporting JSON:", error);
                message.error("Failed to export JSON");
            }
        }
        else if (value === "import") {
            triggerFileInput();
        }
    };

    const onSearch = (arg) => {
        const normalized = String(arg || "").trim();
        setSearchText(arg || "");
        setFilterValues((prev: Record<string, any>) => {
            const next = { ...(prev || {}) };

            if (normalized) next.searchKeyword = normalized;
            else delete next.searchKeyword;

            return next;
        });
    };

    const handleColumnVisibilityChange = (columnKey: string, checked: boolean) => {
        setBacklogVisibleColumnKeys((prev: string[]) => {
            if (!checked && prev.includes(columnKey) && prev.length === 1) {
                message.warning("At least one column must remain visible.");
                return prev;
            }

            const nextVisibleKeys = new Set(prev);
            if (checked) nextVisibleKeys.add(columnKey);
            else nextVisibleKeys.delete(columnKey);

            return DEFAULT_BACKLOG_COLUMN_KEYS.filter((key) => nextVisibleKeys.has(key));
        });
    };

    const handleCheckAllColumns = () => {
        setBacklogVisibleColumnKeys([...DEFAULT_BACKLOG_COLUMN_KEYS]);
    };

    const handleUncheckAllColumns = () => {
        const [firstColumnKey] = DEFAULT_BACKLOG_COLUMN_KEYS;
        setBacklogVisibleColumnKeys(firstColumnKey ? [firstColumnKey] : []);
    };

    const columnSettingsContent = (
        <div className="flex w-[260px] flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-700">Columns</div>
                <div className="flex items-center gap-2 text-xs">
                    <Button type="link" size="small" className="px-0" onClick={handleCheckAllColumns}>
                        Check All
                    </Button>
                    <span className="text-gray-300">/</span>
                    <Button type="link" size="small" className="px-0" onClick={handleUncheckAllColumns}>
                        Uncheck All
                    </Button>
                </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto pr-1">
                <div className="flex flex-col gap-1">
                    {columnSettingsOrder.map((columnKey) => {
                        const column = BACKLOG_COLUMN_META.find((item) => item.key === columnKey);
                        if (!column) return null;

                        return (
                            <div
                                key={column.key}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (draggingColumnKey && draggingColumnKey !== column.key) {
                                        setDragOverColumnKey(column.key);
                                    }
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    handleColumnOrderDrop(column.key);
                                }}
                                className={`flex items-center gap-2 rounded px-1 py-1 transition ${dragOverColumnKey === column.key ? "bg-blue-50" : ""}`}
                            >
                                <span
                                    className="backlog-column-order-handle inline-grid grid-cols-2 grid-rows-3 gap-[2px] p-[2px] cursor-grab"
                                    role="button"
                                    aria-label={`Reorder ${column.title} column`}
                                    draggable
                                    onDragStart={(event) => {
                                        setDraggingColumnKey(column.key);
                                        event.dataTransfer.effectAllowed = "move";
                                        event.dataTransfer.setData("text/plain", column.key);
                                    }}
                                    onDragEnd={() => {
                                        setDraggingColumnKey(null);
                                        setDragOverColumnKey(null);
                                    }}
                                >
                                    {Array.from({ length: 6 }).map((_, dotIndex) => (
                                        <span
                                            key={`${column.key}-popover-dot-${dotIndex}`}
                                            className="h-[3px] w-[3px] rounded-full bg-gray-400"
                                        />
                                    ))}
                                </span>
                                <Checkbox
                                    checked={backlogVisibleColumnKeys.includes(column.key)}
                                    onChange={(event) => handleColumnVisibilityChange(column.key, event.target.checked)}
                                >
                                    {column.title}
                                </Checkbox>
                            </div>
                        );
                    })}
                </div>
            </div>
            <Button
                onClick={() => {
                    setBacklogColumnResetVersion((prev: number) => prev + 1);
                    window.dispatchEvent(new CustomEvent("backlog-column-order-reset"));
                    message.success("Column order reset.");
                }}
            >
                Reset Order
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col gap-2 py-3 px-5 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white">
            {/* Hidden file input for import */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json,application/json"
                onChange={handleFileChange}
            />

            {/* Import progress bar */}
            {isImporting && (
                <div className="mb-2">
                    <Progress percent={importProgress} status="active" />
                    <div className="text-xs text-gray-500 text-center mt-1">
                        Importing... {importProgress}%
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <Tabs
                    activeKey={viewMode}
                    onChange={(key) => setViewMode(key as 'table' | 'kanban')}
                    items={[
                        {
                            key: 'table',
                            label: (
                                <span>
                                    <TableOutlined /> List
                                </span>
                            ),
                        },
                        {
                            key: 'kanban',
                            label: (
                                <span>
                                    <AppstoreAddOutlined /> Kanban
                                </span>
                            ),
                        },
                    ]}
                />
                <div />
            </div>
            {viewMode === 'table' && (
                <div className="flex items-center flex-col lg:flex-row gap-1 justify-between">
                    <div className="flex items-center flex-col md:flex-row gap-1">
                        <Search
                            placeholder="Search issue(s)"
                            className='w-50'
                            value={searchText}
                            onChange={value => onSearch(value.target.value)}
                            allowClear
                            enterButton
                        />
                        <Button
                            type="primary"
                            onClick={() => setOpen(true)}
                            className="w-full md:w-max"
                        >
                            <PlusOutlined />Create Issue
                        </Button>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            {persistentMenuItems.map((item) => (
                                <Tooltip
                                    key={item.title}
                                    placement="bottomLeft"
                                    title={item.title}
                                >
                                    <Badge count={item.title == "Issue Filter" ? countFilter : 0}>
                                        <Button
                                            disabled={item.disabled || false}
                                            type={item.active ? "primary" : "default"}
                                            onClick={item.function}
                                        >
                                            {item.icon}
                                            {item.title === "Issue Filter" ? "Filter" : null}
                                        </Button>
                                    </Badge>
                                </Tooltip>
                            ))}
                            {hasSelectedIssues && selectionMenuItems.map((item) => (
                                <Tooltip
                                    key={item.title}
                                    placement="bottomLeft"
                                    title={item.title}
                                >
                                    <Badge count={0}>
                                        <Button
                                            disabled={item.disabled || false}
                                            type={item.active ? "primary" : "default"}
                                            onClick={item.function}
                                        >
                                            {item.icon}
                                        </Button>
                                    </Badge>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button onClick={() => getMyIssues(!!userId?.status)} type='link'>{userId?.status ? "View All Issue" : "My Issue"}</Button>
                        <Popover trigger="click" placement="bottomRight" content={columnSettingsContent}>
                            <Button
                                type="text"
                                aria-label="Column settings"
                                icon={<SettingOutlined />}
                            />
                        </Popover>
                        <Tooltip title="GitHub Commits - Add to Backlog">
                            <Button
                                type="text"
                                aria-label="Open GitHub commits"
                                icon={<GithubOutlined />}
                                onClick={() => setGithubCommitsDrawerOpen(true)}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
            {viewMode === 'kanban' && (
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Search
                            placeholder="Search issue(s)"
                            className='w-50'
                            value={searchText}
                            onChange={value => onSearch(value.target.value)}
                            allowClear
                            enterButton
                        />
                        <Button
                            type="primary"
                            onClick={() => setOpen(true)}
                            className="w-full md:w-max"
                        >
                            <PlusOutlined />Create Issue
                        </Button>
                        {persistentMenuItems.map((item) => (
                            <Tooltip
                                key={item.title}
                                placement="bottomLeft"
                                title={item.title}
                            >
                                <Badge count={item.title === "Issue Filter" ? countFilter : 0}>
                                    <Button
                                        disabled={item.disabled || false}
                                        type={item.active ? "primary" : "default"}
                                        onClick={item.function}
                                    >
                                        {item.icon}
                                        {item.title === "Issue Filter" ? "Filter" : null}
                                    </Button>
                                </Badge>
                            </Tooltip>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button onClick={() => getMyIssues(!!userId?.status)} type='link'>{userId?.status ? "View All Issue" : "My Issue"}</Button>
                        <Tooltip title="GitHub Commits - Add to Backlog">
                            <Button
                                type="text"
                                aria-label="Open GitHub commits"
                                icon={<GithubOutlined />}
                                onClick={() => setGithubCommitsDrawerOpen(true)}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
            <GithubCommitsDrawer
                open={githubCommitsDrawerOpen}
                onClose={() => setGithubCommitsDrawerOpen(false)}
                currentProject={currentProject}
                onIssuesUpdate={() => {
                    services.getTasks(currentProject?.id).then(tasks => setTasks(tasks || []));
                }}
            />
            <GetGithubCommitsForIssueDrawer
                open={getCommitsFromGithub}
                onClose={() => setGetCommitsFromGithub(false)}
                currentProject={currentProject}
                onIssuesUpdate={() => {
                    services.getTasks(currentProject?.id).then(tasks => setTasks(tasks || []));
                }}
                currentTaskId={currentTaskId}
                currentTaskIds={currentTaskIds}
            />
        </div>
    );
};
