import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
    AppstoreOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    CodeOutlined,
    ReloadOutlined,
    TeamOutlined,
    BugOutlined,
    CheckCircleOutlined,
    FilterOutlined,
    BarChartOutlined,
    LineChartOutlined,
    InfoCircleOutlined,
    FileDoneOutlined,
    FundOutlined,
    DotChartOutlined,
} from '@ant-design/icons';
import {
    Card,
    Col,
    DatePicker,
    Empty,
    Modal,
    Radio,
    Row,
    Select,
    Space,
    Spin,
    Typography,
    message,
    Button,
} from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useAppSelector } from '@/store';
import { db } from '@/config/firebase';
import type { GroupByOption } from '../types';
import { COLOR_PALETTE } from './WeeklyHoursHistogram.constants';
import { parseDate, toWeekLabel, toHours } from './WeeklyHoursHistogram.helpers';
import type { DateRange, TaskDoc } from './WeeklyHoursHistogram.types';
import BacklogTableDrawer from '@/ui-canvas/uic_backlog_canvas/components/componentElemets/uicBacklogTableDrawer';
import { IssueProvider } from '@/ui-canvas/uic_backlog_canvas/context/issueContext';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const { RangePicker } = DatePicker;

interface NormalizedTask {
    id?: string;
    assigneeId: string;
    assigneeName: string;
    created: dayjs.Dayjs;
    closed: dayjs.Dayjs | null;
    status?: string | null;
    type?: string | null;
    hours: number; // Estimated Hours (EH)
    spentHours: number; // Spent Hours (SH)
    linkedCanvas?: string | null;
    canvasType?: 'UI' | 'DB' | 'API' | null;
    canvasName?: string | null;
    codeLine?: number | null;
}

interface AggregatedCounts {
    label: string;
    order: number;
    spentHours: number;
    fixedBugs: number;
    closedIssues: number; // This now includes ALL closed items (both bugs and non-bugs)
    remainedIssues: number;
    remainedBugs: number;
    codeLine: number;
    // Track contributing task ids per metric for accurate drill-down
    taskIds: Set<string>;
    fixedBugIds: Set<string>;
    closedIssueIds: Set<string>; // This now includes ALL closed item ids
    remainedIssueIds: Set<string>;
    remainedBugIds: Set<string>;
    codeLineTaskIds: Set<string>;
}

const OPERATION_OPTIONS = [
    { key: 'closedIssues' as const, label: 'Number of Closed Issues', color: COLOR_PALETTE[0] },
    { key: 'fixedBugs' as const, label: 'Number of Closed Bugs', color: COLOR_PALETTE[1] },
    { key: 'spentHours' as const, label: 'Spent Hours', color: COLOR_PALETTE[2] },
    { key: 'codeLine' as const, label: 'Code Lines', color: COLOR_PALETTE[3] },
];

const VIEW_META = {
    'ui-canvas': {
        title: 'UI Canvas Analytics',
        description: 'Track delivery performance across UI canvases with timeline-based issue, bug, effort, and code metrics.',
        accent: '#1677ff',
        accentSoft: '#e6f4ff',
        icon: <AppstoreOutlined />,
    },
    assignee: {
        title: 'Assignee Analytics',
        description: 'Review how each assignee performs over time with focused effort and completion trends.',
        accent: '#13a37f',
        accentSoft: '#e8fff7',
        icon: <TeamOutlined />,
    },
} as const;

const SUMMARY_ICON_MAP = {
    closedIssues: <CheckCircleOutlined />,
    fixedBugs: <BugOutlined />,
    spentHours: <ClockCircleOutlined />,
    codeLine: <CodeOutlined />,
} as const;

const CHART_ICON_MAP = {
    closedIssues: <FileDoneOutlined />,
    fixedBugs: <BugOutlined />,
    spentHours: <FundOutlined />,
    codeLine: <DotChartOutlined />,
} as const;

// Special option value for inline bulk actions
const BULK_ACTION_OPTION = '__bulk_action__';

const stopSelectDropdownClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
};

const getBucketInfo = (
    date: dayjs.Dayjs, 
    groupBy: GroupByOption,
    task?: NormalizedTask
): { label: string; order: number } => {
    switch (groupBy) {
        case 'Yearly': {
            const yearStart = date.startOf('year');
            return { label: yearStart.format('YYYY'), order: yearStart.valueOf() };
        }
        case 'Month': {
            const monthStart = date.startOf('month');
            return { label: monthStart.format('MMM YYYY'), order: monthStart.valueOf() };
        }
        case 'Daily': {
            const day = date.startOf('day');
            return { label: day.format('DD MMM'), order: day.valueOf() };
        }
        case 'Assignee': {
            const assignee = task?.assigneeName || 'Unassigned';
            return { label: assignee, order: 0 };
        }
        case 'API Canvas': {
            const canvas = task?.linkedCanvas || 'No API Canvas';
            return { 
                label: canvas, 
                order: 0
            };
        }
        case 'UI Canvas': {
            const canvas = task?.linkedCanvas || 'No UI Canvas';
            return { 
                label: canvas, 
                order: 0
            };
        }
        default:
            return toWeekLabel(date);
    }
};

interface TaskCountHistogramProps {
    analyticsView?: 'ui-canvas' | 'assignee';
}

const TaskCountHistogram: React.FC<TaskCountHistogramProps> = ({ analyticsView = 'assignee' }) => {
    const [tasks, setTasks] = useState<Array<TaskDoc & { id?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedApiCanvases, setSelectedApiCanvases] = useState<string[]>([]);
    const [selectedUiCanvases, setSelectedUiCanvases] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);
    const [groupByCategory, setGroupByCategory] = useState<'Assignee' | 'UI Canvas'>(
        analyticsView === 'ui-canvas' ? 'UI Canvas' : 'Assignee'
    );
    const [timeInterval, setTimeInterval] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
    const [histogramType, setHistogramType] = useState<'Histogram' | 'Series'>('Histogram');
    // Drawer state for showing tasks
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerData, setDrawerData] = useState<{ ids: string[] }>({ ids: [] });
    const [isFilterApplied, setIsFilterApplied] = useState(false);
    const [expandedChartKey, setExpandedChartKey] = useState<string | null>(null);
    
    // Combined groupBy for aggregation
    const groupBy: GroupByOption = timeInterval === 'Daily' ? 'Daily' : 
                                   timeInterval === 'Weekly' ? 'Week' : 
                                   timeInterval === 'Monthly' ? 'Month' : 'Yearly';
    
    // Canvas lists and map
    const [apiCanvases, setApiCanvases] = useState<Array<{ id: string; name: string }>>([]);
    const [uiCanvases, setUiCanvases] = useState<Array<{ id: string; name: string }>>([]);
    const [allApiCanvases, setAllApiCanvases] = useState<Array<{ id: string; name: string }>>([]);
    const [allUiCanvases, setAllUiCanvases] = useState<Array<{ id: string; name: string }>>([]);
    const [canvasMap, setCanvasMap] = useState<Map<string, { type: 'UI' | 'DB' | 'API'; name: string }>>(new Map());
    
    // Users map for assigneeName lookup
    const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

    const initialUserApplied = useRef(false);
    const uiCanvasesRef = useRef<Array<{ id: string; name: string }>>([]);
    const apiCanvasesRef = useRef<Array<{ id: string; name: string }>>([]);
    const { currentProject } = useAppSelector((state) => state.project);
    const authUsers = useAppSelector((state) => state.auth.users);
    const viewMeta = VIEW_META[analyticsView];

    const quickRanges = useMemo(
        () => [
            { key: 'this-week', label: 'This Week', range: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] as [dayjs.Dayjs, dayjs.Dayjs] },
            { key: 'this-month', label: 'This Month', range: [dayjs().startOf('month'), dayjs().endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
            { key: 'last-30', label: 'Last 30 Days', range: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] as [dayjs.Dayjs, dayjs.Dayjs] },
            { key: 'this-year', label: 'This Year', range: [dayjs().startOf('year'), dayjs().endOf('year')] as [dayjs.Dayjs, dayjs.Dayjs] },
        ],
        []
    );

    useEffect(() => {
        setGroupByCategory(analyticsView === 'ui-canvas' ? 'UI Canvas' : 'Assignee');
    }, [analyticsView]);

    // Get tasks filtered by date range - FIXED: Safe date comparison
    const tasksInDateRange = useMemo(() => {
        const [startDate, endDate] = dateRange;
        if (!startDate || !endDate) return tasks;
        
        const start = startDate.startOf('day');
        const end = endDate.endOf('day');
        
        return tasks.filter((task) => {
            const created = parseDate(task.createdAt);
            const closed = parseDate(task.closedDate);
            
            // Check if task was created or closed within the date range
            const createdInRange = created && dayjs.isDayjs(created) ? created.isBetween(start, end, 'day', '[]') : false;
            const closedInRange = closed && dayjs.isDayjs(closed) ? closed.isBetween(start, end, 'day', '[]') : false;
            
            return createdInRange || closedInRange;
        });
    }, [tasks, dateRange]);

    useEffect(() => {
        const userMap = new Map<string, string>();
        authUsers.forEach((user: any) => {
            const uid = user?.uid;
            const displayName = user?.displayName || user?.providerData?.[0]?.displayName || 'Unassigned';
            if (uid) {
                userMap.set(uid, displayName);
            }
        });
        setUsersMap(userMap);
    }, [authUsers]);

    // Fetch UI canvases from digital_service_json in project document
    useEffect(() => {
        let mounted = true;

        const fetchUICanvasesFromProject = async () => {
            if (!currentProject?.id) {
                return;
            }

            try {
                const projectDoc = doc(db, "projects", currentProject.id);
                const project = await getDoc(projectDoc);
                
                if (!project.exists()) {
                    return;
                }

                const digitalServiceJson = project.get("digital_service_json");
                if (!digitalServiceJson) {
                    return;
                }

                let uiCanvasList: Array<{ id: string; name: string }> = [];
                
                try {
                    // Parse digital_service_json - can be string, array, or object
                    let parsedData: unknown;
                    if (typeof digitalServiceJson === "string") {
                        parsedData = JSON.parse(digitalServiceJson);
                    } else {
                        parsedData = digitalServiceJson;
                    }

                    // Handle array format: [{id: "...", label: "..."}, ...]
                    if (Array.isArray(parsedData)) {
                        uiCanvasList = parsedData.map((item: { id?: string; key?: string; label?: string; name?: string }) => ({
                            id: item.id || item.key || '',
                            name: item.label || item.name || item.id || 'Unnamed Canvas'
                        })).filter((item: { id: string }) => item.id);
                    } 
                    // Handle object format: {canvasId: "canvasName", ...}
                    else if (typeof parsedData === "object" && parsedData !== null) {
                        uiCanvasList = Object.keys(parsedData).map((canvasId) => ({
                            id: canvasId,
                            name: (parsedData as Record<string, string>)[canvasId] || canvasId
                        }));
                    }

                    if (mounted) {
                        uiCanvasesRef.current = uiCanvasList;
                        setUiCanvases(uiCanvasList);
                        setAllUiCanvases(uiCanvasList);
                        
                        // Update canvasMap with UI canvases
                        setCanvasMap((prevMap) => {
                            const newMap = new Map(prevMap);
                            uiCanvasList.forEach((canvas) => {
                                newMap.set(canvas.id, { type: 'UI', name: canvas.name });
                            });
                            return newMap;
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing digital_service_json:', parseError);
                }
            } catch (error) {
                console.error('Failed to fetch UI canvases from project:', error);
            }
        };

        fetchUICanvasesFromProject();

        return () => {
            mounted = false;
        };
    }, [currentProject?.id]);

    // Fetch API Canvases from api_json in project document
    useEffect(() => {
        let mounted = true;

        const fetchAPICanvasesFromProject = async () => {
            if (!currentProject?.id) {
                return;
            }

            try {
                // Fetch project document to get api_json
                const projectDoc = doc(db, "projects", currentProject.id);
                const project = await getDoc(projectDoc);
                
                if (!project.exists()) {
                    return;
                }

                const apiJsonString = project.get("api_json");
                if (!apiJsonString) {
                    return;
                }

                // Parse api_json - can be string or object
                let apiJson: Record<string, string>;
                if (typeof apiJsonString === "string") {
                    apiJson = JSON.parse(apiJsonString);
                } else {
                    apiJson = apiJsonString as Record<string, string>;
                }

                // Get all API Canvas IDs from api_json
                const apiCanvasIds = Object.keys(apiJson);
                if (apiCanvasIds.length === 0) {
                    return;
                }

                const apiCanvasList: Array<{ id: string; name: string }> = [];
                const canvasMapData = new Map<string, { type: 'UI' | 'DB' | 'API'; name: string }>();

                // Fetch each API Canvas from api_canvas collection
                for (const canvasId of apiCanvasIds) {
                    try {
                        const apiCanvasDoc = doc(db, "api_canvas", canvasId);
                        const apiCanvasSnap = await getDoc(apiCanvasDoc);
                        
                        if (apiCanvasSnap.exists()) {
                            const data = apiCanvasSnap.data();
                            // Use name from api_canvas document, fallback to api_json value, then canvasId
                            const name = data?.name ?? apiJson[canvasId] ?? canvasId;
                            apiCanvasList.push({ id: canvasId, name });
                            canvasMapData.set(canvasId, { type: 'API', name });
                        } else {
                            // Try fetching from ui_canvas as fallback
                            const uiCanvasDoc = doc(db, "ui_canvas", canvasId);
                            const uiCanvasSnap = await getDoc(uiCanvasDoc);
                            if (uiCanvasSnap.exists()) {
                                const data = uiCanvasSnap.data();
                                const name = data?.name ?? apiJson[canvasId] ?? canvasId;
                                apiCanvasList.push({ id: canvasId, name });
                                canvasMapData.set(canvasId, { type: 'API', name });
                            } else {
                                // If not found anywhere, use api_json value as name
                                const name = apiJson[canvasId] || canvasId;
                                apiCanvasList.push({ id: canvasId, name });
                                canvasMapData.set(canvasId, { type: 'API', name });
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch API canvas ${canvasId}:`, error);
                        // Still add it with name from api_json
                        const name = apiJson[canvasId] || canvasId;
                        apiCanvasList.push({ id: canvasId, name });
                        canvasMapData.set(canvasId, { type: 'API', name });
                    }
                }

                if (mounted) {
                    // Update canvasMap with API canvases
                    setCanvasMap((prevMap) => {
                        const merged = new Map(prevMap);
                        canvasMapData.forEach((value, key) => {
                            merged.set(key, value);
                        });
                        return merged;
                    });
                    setAllApiCanvases(apiCanvasList);
                    apiCanvasesRef.current = apiCanvasList;
                    setApiCanvases(apiCanvasList);
                }
            } catch (error) {
                console.error('Failed to fetch API canvases from project:', error);
            }
        };

        fetchAPICanvasesFromProject();

        return () => {
            mounted = false;
        };
    }, [currentProject?.id]);

    // Fetch additional UI Canvases from backlog tasks
    useEffect(() => {
        let mounted = true;

        const fetchUICanvasesFromBacklog = async () => {
            if (!currentProject?.id || tasks.length === 0) {
                return;
            }

            try {
                // Collect unique UI canvas IDs from backlog tasks
                const canvasIds = new Set<string>();
                tasks.forEach((task) => {
                    if (task.uiCanvasId) {
                        canvasIds.add(task.uiCanvasId);
                    } else if (task.linkedCanvas) {
                        // Check if it's a UI canvas (not already in API canvases)
                        const canvasInfo = canvasMap.get(task.linkedCanvas);
                        if (canvasInfo?.type === 'UI' || (!canvasInfo && !apiCanvasesRef.current.some(c => c.id === task.linkedCanvas))) {
                            canvasIds.add(task.linkedCanvas);
                        }
                    }
                });

                if (canvasIds.size === 0) {
                    return;
                }

                const existingUICanvases = new Set(uiCanvasesRef.current.map(c => c.id));
                const uiCanvasList: Array<{ id: string; name: string }> = [];
                const canvasMapData = new Map<string, { type: 'UI' | 'DB' | 'API'; name: string }>();

                // Try to fetch each canvas from ui_canvas collection
                for (const canvasId of canvasIds) {
                    // Skip if already in UI canvases list (from digital_service_json)
                    if (existingUICanvases.has(canvasId)) {
                        continue;
                    }

                    try {
                        const uiCanvasDoc = doc(db, "ui_canvas", canvasId);
                        const uiCanvasSnap = await getDoc(uiCanvasDoc);
                        if (uiCanvasSnap.exists()) {
                            const data = uiCanvasSnap.data();
                            const name = data?.name ?? canvasId;
                            canvasMapData.set(canvasId, { type: 'UI', name });
                            uiCanvasList.push({ id: canvasId, name });
                        }
                    } catch (error) {
                        console.error(`Failed to fetch UI canvas ${canvasId}:`, error);
                    }
                }

                if (mounted) {
                    // Update canvasMap with UI canvases
                    setCanvasMap((prevMap) => {
                        const merged = new Map(prevMap);
                        canvasMapData.forEach((value, key) => {
                            merged.set(key, value);
                        });
                        return merged;
                    });
                    // Update UI canvases list
                    setAllUiCanvases(prev => {
                        const merged = [...prev];
                        uiCanvasList.forEach((newCanvas) => {
                            if (!merged.find(c => c.id === newCanvas.id)) {
                                merged.push(newCanvas);
                            }
                        });
                        return merged;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch UI canvases from backlog:', error);
            }
        };

        fetchUICanvasesFromBacklog();

        return () => {
            mounted = false;
        };
    }, [currentProject?.id, tasks, canvasMap]);

    // Fetch additional API Canvases from backlog tasks
    useEffect(() => {
        let mounted = true;

        const fetchAPICanvasesFromBacklog = async () => {
            if (!currentProject?.id || tasks.length === 0) {
                return;
            }

            try {
                const canvasIds = new Set<string>();
                tasks.forEach((task) => {
                    if (task.apiCanvasId) {
                        canvasIds.add(task.apiCanvasId);
                    } else if (task.linkedCanvas) {
                        const canvasInfo = canvasMap.get(task.linkedCanvas);
                        // Accept as API if map says API or it's not clearly UI
                        if (canvasInfo?.type === 'API' || (!canvasInfo && !uiCanvasesRef.current.some(c => c.id === task.linkedCanvas))) {
                            canvasIds.add(task.linkedCanvas);
                        }
                    }
                });

                if (canvasIds.size === 0) {
                    return;
                }

                const existingApiCanvases = new Set(apiCanvasesRef.current.map(c => c.id));
                const apiCanvasList: Array<{ id: string; name: string }> = [];
                const canvasMapData = new Map<string, { type: 'UI' | 'DB' | 'API'; name: string }>();

                for (const canvasId of canvasIds) {
                    if (existingApiCanvases.has(canvasId)) {
                        continue;
                    }

                    try {
                        const apiCanvasDoc = doc(db, "api_canvas", canvasId);
                        const apiCanvasSnap = await getDoc(apiCanvasDoc);
                        if (apiCanvasSnap.exists()) {
                            const data = apiCanvasSnap.data();
                            const name = data?.name ?? canvasId;
                            apiCanvasList.push({ id: canvasId, name });
                            canvasMapData.set(canvasId, { type: 'API', name });
                        } else {
                            // Fallback to ui_canvas
                            const uiCanvasDoc = doc(db, "ui_canvas", canvasId);
                            const uiCanvasSnap = await getDoc(uiCanvasDoc);
                            if (uiCanvasSnap.exists()) {
                                const data = uiCanvasSnap.data();
                                const name = data?.name ?? canvasId;
                                apiCanvasList.push({ id: canvasId, name });
                                canvasMapData.set(canvasId, { type: 'API', name });
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch API canvas ${canvasId}:`, error);
                    }
                }

                if (mounted) {
                    setCanvasMap((prevMap) => {
                        const merged = new Map(prevMap);
                        canvasMapData.forEach((value, key) => merged.set(key, value));
                        return merged;
                    });
                    setAllApiCanvases((prev) => {
                        const merged = [...prev];
                        apiCanvasList.forEach((canvas) => {
                            if (!merged.find((c) => c.id === canvas.id)) {
                                merged.push(canvas);
                            }
                        });
                        return merged;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch API canvases from backlog:', error);
            }
        };

        fetchAPICanvasesFromBacklog();

        return () => {
            mounted = false;
        };
    }, [currentProject?.id, tasks, canvasMap]);

    // Fetch tasks from backlog
    useEffect(() => {
        let mounted = true;

        const fetchTasks = async () => {
            if (!currentProject?.id) {
                setTasks([]);
                return;
            }

            try {
                setLoading(true);
                const collectionName = `backlog_${currentProject.id}`;

                const colRef = collection(db, collectionName);
                const snapshot = await getDocs(colRef);

                if (mounted) {
                    initialUserApplied.current = false;
                    const tasksData = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as TaskDoc & { id: string }));                    setTasks(tasksData);
                }
            } catch (error) {
                console.error('Failed to fetch backlog docs:', error);
                message.error('Unable to load tasks for histogram. Check console for details.');
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchTasks();

        return () => {
            mounted = false;
        };
    }, [currentProject?.id]);

    // Filter canvases based on date range
    useEffect(() => {
        const [startDate, endDate] = dateRange;
        if (tasksInDateRange.length === 0 || !startDate || !endDate) {
            setUiCanvases([]);
            setApiCanvases([]);
            return;
        }

        // Filter UI Canvases based on tasks in date range
        const uiCanvasIds = new Set<string>();
        tasksInDateRange.forEach((task) => {
            if (task.uiCanvasId) {
                uiCanvasIds.add(task.uiCanvasId);
            } else if (task.linkedCanvas) {
                const canvasInfo = canvasMap.get(task.linkedCanvas);
                if (canvasInfo?.type === 'UI') {
                    uiCanvasIds.add(task.linkedCanvas);
                }
            }
        });
        const filteredUiCanvases = allUiCanvases.filter(c => uiCanvasIds.has(c.id));
        setUiCanvases(filteredUiCanvases);

        // Filter API Canvases based on tasks in date range
        const apiCanvasIds = new Set<string>();
        tasksInDateRange.forEach((task) => {
            if (task.apiCanvasId) {
                apiCanvasIds.add(task.apiCanvasId);
            } else if (task.linkedCanvas) {
                const canvasInfo = canvasMap.get(task.linkedCanvas);
                if (canvasInfo?.type === 'API') {
                    apiCanvasIds.add(task.linkedCanvas);
                }
            }
        });
        const filteredApiCanvases = allApiCanvases.filter(c => apiCanvasIds.has(c.id));
        setApiCanvases(filteredApiCanvases);
    }, [tasksInDateRange, dateRange, allUiCanvases, allApiCanvases, canvasMap]);

    // Get assignees filtered by date range
    const assigneesInDateRange = useMemo(() => {
        const assigneeSet = new Set<string>();
        tasksInDateRange.forEach((task) => {
            if (task.assignee && String(task.assignee).trim().length > 0) {
                assigneeSet.add(String(task.assignee).trim());
            }
        });
        return Array.from(assigneeSet);
    }, [tasksInDateRange]);

    const normalizedTasks: NormalizedTask[] = useMemo(() => {
        if (tasks.length === 0) {
            return [];
        }

        const result = tasks
            .map((task) => {
                const created = parseDate(task.createdAt);
                if (!created) {
                    console.warn('Task has no valid created date:', task.id);
                    return null;
                }

                const closed = parseDate(task.closedDate);
                const assigneeId = task.assignee && String(task.assignee).trim().length > 0
                    ? String(task.assignee).trim()
                    : 'unassigned';
                // Get assigneeName from usersMap (fetched from API) or fallback to task.assigneeName
                const assigneeNameFromMap = usersMap.get(assigneeId);
                const assigneeName = assigneeNameFromMap 
                    ? assigneeNameFromMap
                    : (task.assigneeName && String(task.assigneeName).trim().length > 0
                    ? String(task.assigneeName).trim()
                        : 'Unassigned');

                const hours = toHours(task.eh); // Estimated Hours (EH)
                const spentHours = toHours((task as TaskDoc & { sh?: number | string | null }).sh); // Spent Hours (SH)
                
                // Determine canvas ID and type - check multiple fields
                let canvasId: string | null = null;
                let canvasType: 'UI' | 'DB' | 'API' | null = null;
                
                // Priority: uiCanvasId > apiCanvasId > dbCanvasId > linkedCanvas
                if (task.uiCanvasId) {
                    canvasId = task.uiCanvasId;
                    canvasType = 'UI';
                } else if (task.apiCanvasId) {
                    canvasId = task.apiCanvasId;
                    canvasType = 'API';
                } else if (task.dbCanvasId) {
                    canvasId = task.dbCanvasId;
                    canvasType = 'DB';
                } else if (task.linkedCanvas) {
                    canvasId = task.linkedCanvas;
                    // Try to determine type from canvasMap
                    const canvasInfo = canvasMap.get(task.linkedCanvas);
                    canvasType = canvasInfo?.type ?? null;
                }
                
                // If canvasType is still null but we have a canvasId, try to determine from canvas lists
                if (canvasId && !canvasType) {
                    // Use Set for O(1) lookup instead of O(n) array.some()
                    const uiCanvasIds = new Set(allUiCanvases.map(c => c.id));
                    const apiCanvasIds = new Set(allApiCanvases.map(c => c.id));
                    if (uiCanvasIds.has(canvasId)) {
                        canvasType = 'UI';
                    } else if (apiCanvasIds.has(canvasId)) {
                        canvasType = 'API';
                    }
                }
                
                const canvasInfo = canvasId ? canvasMap.get(canvasId) : null;

                return {
                    id: task.id,
                    assigneeId,
                    assigneeName,
                    created,
                    closed,
                    status: task.status ?? null,
                    type: task.type ?? null,
                    hours, // Estimated Hours (EH)
                    spentHours, // Spent Hours (SH)
                    linkedCanvas: canvasId,
                    canvasType,
                    canvasName: canvasInfo?.name ?? null,
                    codeLine: (task as any).codeLine ?? null,
                };
            })
            .filter(Boolean) as NormalizedTask[];        return result;
    }, [tasks, canvasMap, usersMap, allUiCanvases, allApiCanvases]);

    const allUsers = useMemo(
        () => {
            const userMap = new Map<string, string>();
            normalizedTasks.forEach((task) => {
                if (assigneesInDateRange.includes(task.assigneeId)) {
                    userMap.set(task.assigneeId, task.assigneeName);
                }
            });
            const users = Array.from(userMap.entries())
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name));            return users;
        },
        [normalizedTasks, assigneesInDateRange],
    );

    // Default select all for multi-selects
    useEffect(() => {
        if (groupByCategory === 'Assignee' && allUsers.length > 0 && selectedUserIds.length === 0) {
            setSelectedUserIds(allUsers.map(user => user.id));
        }
    }, [groupByCategory, allUsers]);

    useEffect(() => {
        if (groupByCategory === 'UI Canvas' && uiCanvases.length > 0 && selectedUiCanvases.length === 0) {
            setSelectedUiCanvases(uiCanvases.filter((c) => c.id).map((canvas) => String(canvas.id)));
        }
    }, [groupByCategory, uiCanvases]);

    useEffect(() => {
        if (groupByCategory === 'API Canvas' && apiCanvases.length > 0 && selectedApiCanvases.length === 0) {
            setSelectedApiCanvases(apiCanvases.filter((c) => c.id).map((canvas) => String(canvas.id)));
        }
    }, [groupByCategory, apiCanvases]);

    // Fix: Update refs when lists change
    useEffect(() => {
        uiCanvasesRef.current = uiCanvases;
    }, [uiCanvases]);

    useEffect(() => {
        apiCanvasesRef.current = apiCanvases;
    }, [apiCanvases]);

    useEffect(() => {
        if (selectedUserIds.length === 0) return;
        const validIds = selectedUserIds.filter(id => allUsers.some((user) => user.id === id));
        if (validIds.length !== selectedUserIds.length) {
            setSelectedUserIds(validIds);
        }
    }, [allUsers, selectedUserIds]);

    const filteredTasks = useMemo(() => {
        if (!isFilterApplied) {
            return [];
        }
        if (groupByCategory === 'API Canvas' && apiCanvases.length === 0) {
            return [];
        }
        if (groupByCategory === 'UI Canvas' && uiCanvases.length === 0) {
            return [];
        }
        const [startDate, endDate] = dateRange;
        const startDay = startDate ? startDate.startOf('day') : null;
        const endDay = endDate ? endDate.endOf('day') : null;

        const result = normalizedTasks.filter((task) => {
            // Filter by users if selected
            if (selectedUserIds.length > 0 && !selectedUserIds.includes(task.assigneeId)) {
                return false;
            }

            // Filter by API Canvases if selected
            // Only filter tasks that are API Canvas type - don't exclude other types
            if (selectedApiCanvases.length > 0 && groupByCategory === 'API Canvas') {
                if (!task.linkedCanvas || !selectedApiCanvases.includes(task.linkedCanvas)) {
                    return false;
                }
            }

            // Filter by UI Canvases if selected
            // Only filter tasks that are UI Canvas type - don't exclude other types
            if (selectedUiCanvases.length > 0 && groupByCategory === 'UI Canvas') {
                if (!task.linkedCanvas || !selectedUiCanvases.includes(task.linkedCanvas)) {
                    return false;
                }
            }

            // FIXED: Safe date range check
            if (startDay && endDay) {
                const createdWithinRange = task.created && dayjs.isDayjs(task.created) 
                    ? task.created.isBetween(startDay, endDay, 'day', '[]')
                    : false;
                
                const closedWithinRange = task.closed && dayjs.isDayjs(task.closed)
                    ? task.closed.isBetween(startDay, endDay, 'day', '[]')
                    : false;
                
                return createdWithinRange || closedWithinRange;
            }

            return true;
        });        return result;
    }, [isFilterApplied, normalizedTasks, selectedUserIds, selectedApiCanvases, selectedUiCanvases, dateRange, groupByCategory, apiCanvases.length, uiCanvases.length]);

    // FIXED: New grouping function that works for all time intervals
    const aggregatedCounts = useMemo(() => {        
        const map = new Map<string, AggregatedCounts>();
        
        filteredTasks.forEach((task) => {
            const statusNormalized = (task.status || '').toLowerCase().trim();
            const isClosed = Boolean(task.closed) || statusNormalized === 'closed';
            const isBug = task.type === 'Bug';
            const isRemained = statusNormalized === 'new' || statusNormalized === 'ongoing';
            
            // Get time interval label
            const bucketDate = isClosed ? task.closed : task.created;
            const bucket = bucketDate ?? task.created;
            const timeBucketInfo = getBucketInfo(bucket, groupBy);
            const timeLabel = timeBucketInfo.label;
            
            // Get category key based on selected groupByCategory
            let categoryKey = '';
            let categoryDisplayLabel = '';
            
            if (groupByCategory === 'Assignee') {
                categoryKey = task.assigneeId || 'unassigned';
                categoryDisplayLabel = task.assigneeName || 'Unassigned';
            } else if (groupByCategory === 'UI Canvas') {
                if (!task.linkedCanvas) return;
                categoryKey = task.linkedCanvas;
                const canvas = uiCanvases.find(c => c.id === task.linkedCanvas);
                categoryDisplayLabel = canvas ? canvas.name : task.linkedCanvas;
            } else if (groupByCategory === 'API Canvas') {
                if (!task.linkedCanvas) return;
                categoryKey = task.linkedCanvas;
                const canvas = apiCanvases.find(c => c.id === task.linkedCanvas);
                categoryDisplayLabel = canvas ? canvas.name : task.linkedCanvas;
            }
            
            // Create composite label
            const compositeLabel = `${categoryDisplayLabel} - ${timeLabel}`;
            
            const entry: AggregatedCounts = map.get(compositeLabel) ?? {
                label: compositeLabel,
                order: timeBucketInfo.order,
                spentHours: 0,
                fixedBugs: 0,
                closedIssues: 0,
                remainedIssues: 0,
                remainedBugs: 0,
                codeLine: 0,
                taskIds: new Set<string>(),
                fixedBugIds: new Set<string>(),
                closedIssueIds: new Set<string>(),
                remainedIssueIds: new Set<string>(),
                remainedBugIds: new Set<string>(),
                codeLineTaskIds: new Set<string>(),
            };
            
            // Spent Hours (SH)
            entry.spentHours += task.spentHours || 0;
            if (task.id) entry.taskIds.add(task.id);
            
            // Fixed Bugs - count only bugs
            if (isBug && isClosed) {
                entry.fixedBugs += 1;
                if (task.id) entry.fixedBugIds.add(task.id);
            }
            
            // Closed Issues - now includes ALL closed items (both bugs and non-bugs)
            if (isClosed) {
                entry.closedIssues += 1;
                if (task.id) entry.closedIssueIds.add(task.id);
            }
            
            // Remained Issues (non-bugs only)
            if (isRemained && !isBug) {
                entry.remainedIssues += 1;
                if (task.id) entry.remainedIssueIds.add(task.id);
            }
            
            // Remained Bugs
            if (isRemained && isBug) {
                entry.remainedBugs += 1;
                if (task.id) entry.remainedBugIds.add(task.id);
            }
            
            // Code Line
            if (isClosed && task.codeLine) {
                entry.codeLine += task.codeLine || 0;
                if (task.id) entry.codeLineTaskIds.add(task.id);
            }
            
            map.set(compositeLabel, entry);
        });
        
        const counts = Array.from(map.values()).sort((a, b) => {
            // First sort by category, then by time order
            const aParts = a.label.split(' - ');
            const bParts = b.label.split(' - ');
            
            if (aParts[0] !== bParts[0]) {
                return aParts[0].localeCompare(bParts[0]);
            }
            return a.order - b.order;
        });        return counts;
    }, [filteredTasks, groupByCategory, groupBy, timeInterval, uiCanvases, apiCanvases]);

    // Fast lookup map for buckets
    const aggregatedCountsMap = useMemo(() => {
        const m = new Map<string, AggregatedCounts>();
        aggregatedCounts.forEach((entry) => m.set(entry.label, entry));
        return m;
    }, [aggregatedCounts]);

    // FIXED: Create chart data for each operation
    const chartDataForOperations = useMemo(() => {
        // Get unique categories (assignees/canvases)
        const categories = new Set<string>();
        aggregatedCounts.forEach(record => {
            const parts = record.label.split(' - ');
            if (parts.length > 0) {
                categories.add(parts[0]);
            }
        });
        
        const sortedCategories = Array.from(categories).sort();
        
        // Get unique time intervals
        const timeIntervals = new Set<string>();
        aggregatedCounts.forEach(record => {
            const parts = record.label.split(' - ');
            if (parts.length > 1) {
                timeIntervals.add(parts[1]);
            }
        });
        
        // Sort time intervals by their order
        const sortedTimeIntervals = Array.from(timeIntervals).sort((a, b) => {
            const aEntry = aggregatedCounts.find(e => e.label.endsWith(` - ${a}`));
            const bEntry = aggregatedCounts.find(e => e.label.endsWith(` - ${b}`));
            return (aEntry?.order || 0) - (bEntry?.order || 0);
        });
        
        const result: Record<string, {
            labels: string[]; datasets: Array<{
                label: string;
                data: number[];
                backgroundColor?: string;
                borderColor?: string;
                fill?: boolean;
                tension?: number;
                category: string;
            }>
        }> = {};
        
        OPERATION_OPTIONS.forEach((operation, opIndex) => {
            const datasets = sortedCategories.map((category, catIndex) => {
                const data = sortedTimeIntervals.map(timeLabel => {
                    const label = `${category} - ${timeLabel}`;
                    const entry = aggregatedCountsMap.get(label);
                    return entry ? entry[operation.key] : 0;
                });
                
                const color = COLOR_PALETTE[catIndex % COLOR_PALETTE.length];
                
                if (histogramType === 'Histogram') {
                    return {
                        label: category,
                        data,
                        backgroundColor: color,
                        borderRadius: 6,
                        maxBarThickness: 40,
                        category,
                    };
                } else {
                    return {
                        label: category,
                        data,
                        borderColor: color,
                        backgroundColor: color + '40',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        category,
                    };
                }
            });
            
            result[operation.key] = {
                labels: sortedTimeIntervals,
                datasets,
            };
        });        return result;
    }, [aggregatedCounts, histogramType, aggregatedCountsMap]);

    // Handle bar/line click to open drawer with filtered tasks
    const handleChartClick = useCallback((
        operationKey: 'spentHours' | 'closedIssues' | 'fixedBugs' | 'codeLine',
        category: string, 
        timeLabel: string
    ) => {
        const label = `${category} - ${timeLabel}`;
        const entry = aggregatedCountsMap.get(label);
        let ids: string[] = [];
        if (entry) {
            if (operationKey === 'spentHours') {
                ids = Array.from(entry.taskIds);
            } else if (operationKey === 'closedIssues') {
                ids = Array.from(entry.closedIssueIds); // Now includes all closed items
            } else if (operationKey === 'fixedBugs') {
                ids = Array.from(entry.fixedBugIds);
            } else if (operationKey === 'codeLine') {
                ids = Array.from(entry.codeLineTaskIds);
            }
        }
        setDrawerData({ ids });
        setDrawerOpen(true);
    }, [aggregatedCountsMap]);

    // Create chart options for each operation
    const chartOptionsForOperations = useMemo(() => {
        const result: Record<string, any> = {};
        
        OPERATION_OPTIONS.forEach((operation) => {
            result[operation.key] = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0,
                },
                interaction: {
                    intersect: true,
                    mode: 'point' as const,
                },
                onClick: (event: MouseEvent, elements: Array<{ datasetIndex: number; index: number }>) => {
                    if (elements && elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const index = element.index;
                        
                        const chartData = chartDataForOperations[operation.key];
                        if (chartData && chartData.datasets[datasetIndex] && chartData.labels[index]) {
                            const category = chartData.datasets[datasetIndex].category;
                            const timeLabel = chartData.labels[index];
                            
                            handleChartClick(operation.key, category, timeLabel);
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top' as const,
                    },
                    title: {
                        display: true,
                        text: `${operation.label} by ${groupByCategory} and ${timeInterval}`,
                    },
                    tooltip: {
                        enabled: true,
                        intersect: false,
                        callbacks: {
                            label: function(context: any) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y;
                                return label;
                            }
                        }
                    },
                },
                scales: {
                    x: {
                        stacked: false,
                        title: {
                            display: true,
                            text: timeInterval,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: operation.label,
                        },
                        ticks: {
                            precision: 0,
                        },
                    },
                },
            };
        });
        
        return result;
    }, [timeInterval, groupByCategory, chartDataForOperations, handleChartClick]);

    const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
        setIsFilterApplied(true);
        if (dates) {
            setDateRange(dates);
        } else {
            setDateRange([null, null]);
        }
    };

    const handleGroupByChange = (value: 'Assignee' | 'UI Canvas') => {
        setIsFilterApplied(true);
        setGroupByCategory(value);
        // Reset selections
        setSelectedUserIds([]);
        setSelectedApiCanvases([]);
        setSelectedUiCanvases([]);
    };

    const selectAllUiCanvases = useCallback(() => {
        setSelectedUiCanvases(uiCanvases.filter((c) => c.id).map((c) => String(c.id)));
    }, [uiCanvases]);

    const deselectAllUiCanvases = useCallback(() => {
        setSelectedUiCanvases([]);
    }, []);

    const handleUiSelectChange = useCallback((values: string[]) => {
        const cleaned = values.filter((v) => v !== BULK_ACTION_OPTION);
        setIsFilterApplied(true);
        setSelectedUiCanvases(cleaned);
    }, []);

    const selectAllApiCanvases = useCallback(() => {
        setSelectedApiCanvases(apiCanvases.filter((c) => c.id).map((c) => String(c.id)));
    }, [apiCanvases]);

    const deselectAllApiCanvases = useCallback(() => {
        setSelectedApiCanvases([]);
    }, []);

    const handleApiSelectChange = useCallback((values: string[]) => {
        const cleaned = values.filter((v) => v !== BULK_ACTION_OPTION);
        setIsFilterApplied(true);
        setSelectedApiCanvases(cleaned);
    }, []);

    const selectAllUsers = useCallback(() => {
        setSelectedUserIds(allUsers.map((u) => u.id));
    }, [allUsers]);

    const deselectAllUsers = useCallback(() => {
        setSelectedUserIds([]);
    }, []);

    const handleUserSelectChange = useCallback((values: string[]) => {
        const cleaned = values.filter((v) => v !== BULK_ACTION_OPTION);
        setIsFilterApplied(true);
        setSelectedUserIds(cleaned);
    }, []);

    // Check if any chart has data
    const hasData = useMemo(() => {
        return Object.values(chartDataForOperations).some((chartData) => 
            chartData.labels.length > 0 &&
            chartData.datasets.some((dataset) => dataset.data.some((value) => value > 0))
        );
    }, [chartDataForOperations]);

    const expandedOperation = useMemo(
        () => OPERATION_OPTIONS.find((operation) => operation.key === expandedChartKey) ?? null,
        [expandedChartKey]
    );

    const summaryMetrics = useMemo(
        () => [
            {
                key: 'closedIssues',
                label: 'Closed Issues',
                value: filteredTasks.filter((task) => Boolean(task.closed) || (task.status || '').toLowerCase().trim() === 'closed').length,
                helper: `${chartDataForOperations.closedIssues?.labels.length || 0} active buckets`,
            },
            {
                key: 'fixedBugs',
                label: 'Closed Bugs',
                value: filteredTasks.filter((task) => task.type === 'Bug' && (Boolean(task.closed) || (task.status || '').toLowerCase().trim() === 'closed')).length,
                helper: `${filteredTasks.filter((task) => task.type === 'Bug').length} bug tasks in range`,
            },
            {
                key: 'spentHours',
                label: 'Spent Hours',
                value: filteredTasks.reduce((sum, task) => sum + (task.spentHours || 0), 0),
                helper: `${filteredTasks.length} filtered tasks`,
            },
            {
                key: 'codeLine',
                label: 'Code Lines',
                value: filteredTasks.reduce((sum, task) => sum + (task.codeLine || 0), 0),
                helper: 'Closed tasks with code lines',
            },
        ],
        [filteredTasks, chartDataForOperations]
    );

    const resetFilters = useCallback(() => {
        setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
        setTimeInterval('Weekly');
        setHistogramType('Histogram');
        setSelectedUserIds([]);
        setSelectedUiCanvases([]);
        setSelectedApiCanvases([]);
        setGroupByCategory(analyticsView === 'ui-canvas' ? 'UI Canvas' : 'Assignee');
        setIsFilterApplied(false);
    }, [analyticsView]);

    return (
        <Card bordered={false} bodyStyle={{ padding: 0, backgroundColor: 'transparent' }} style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
            <Space direction="vertical" size="large" style={{ width: '100%', backgroundColor: 'transparent' }}>
                <Card bordered={false} style={{ width: '100%', backgroundColor: '#fff', border: 'none', boxShadow: 'none' }} bodyStyle={{ backgroundColor: '#fff' }}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Row gutter={[16, 12]} justify="space-between" align="middle">
                            <Col xs={24} md={14}>
                                <Space direction="vertical" size={4}>
                                    <Space size={8}>
                                        <FilterOutlined style={{ color: viewMeta.accent }} />
                                        <Typography.Title level={4} style={{ margin: 0 }}>
                                            Filters
                                        </Typography.Title>
                                    </Space>
                                    <Typography.Text type="secondary">
                                        Narrow results with date presets, diagram mode, and {analyticsView === 'ui-canvas' ? 'canvas' : 'assignee'} selection.
                                    </Typography.Text>
                                </Space>
                            </Col>
                        <Col xs={24} md={10}>
                            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
                                    {quickRanges.map((preset) => (
                                        <Button
                                            key={preset.key}
                                            icon={<CalendarOutlined />}
                                            onClick={() => {
                                                setIsFilterApplied(true);
                                                setDateRange(preset.range);
                                            }}
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                    <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                                        Reset
                                    </Button>
                                </Space>
                            </Col>
                        </Row>

                        {!isFilterApplied && (
                            <div
                                style={{
                                    borderRadius: 16,
                                    border: `1px dashed ${viewMeta.accent}55`,
                                    background: viewMeta.accentSoft,
                                    padding: '12px 16px',
                                }}
                            >
                                <Space size={10}>
                                    <InfoCircleOutlined style={{ color: viewMeta.accent, fontSize: 16 }} />
                                    <Typography.Text style={{ color: '#334155' }}>
                                        Reports stay empty on first open. Change any filter or press <strong>Filter</strong> to load data.
                                    </Typography.Text>
                                </Space>
                            </div>
                        )}

                    <Row gutter={[16, 16]} align="middle">
                        {/* 1. UI Canvas List */}
                        {groupByCategory === 'UI Canvas' && (
                            <Col xs={24} md={8}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Typography.Text type="secondary">UI Canvas List</Typography.Text>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select UI Canvas"
                                        value={selectedUiCanvases}
                                        onChange={handleUiSelectChange}
                                        options={[
                                            {
                                                label: (
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={selectAllUiCanvases}>Select All</Button>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={deselectAllUiCanvases}>Deselect All</Button>
                                                    </div>
                                                ),
                                                value: BULK_ACTION_OPTION,
                                                disabled: true,
                                            },
                                            ...uiCanvases
                                                .filter((canvas) => canvas.id)
                                                .map((canvas) => ({
                                                    label: canvas.name || canvas.id || 'Unnamed Canvas',
                                                    value: String(canvas.id),
                                                })),
                                        ]}
                                        style={{ width: '100%' }}
                                        disabled={uiCanvases.length === 0}
                                        maxTagCount={1}
                                        maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                                    />
                                </Space>
                            </Col>
                        )}

                        {/* 2. API Canvas List */}
                        {groupByCategory === 'API Canvas' && (
                            <Col xs={24} md={8}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Typography.Text type="secondary">API Canvas List</Typography.Text>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select API Canvas"
                                        value={selectedApiCanvases}
                                        onChange={handleApiSelectChange}
                                        options={[
                                            {
                                                label: (
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={selectAllApiCanvases}>Select All</Button>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={deselectAllApiCanvases}>Deselect All</Button>
                                                    </div>
                                                ),
                                                value: BULK_ACTION_OPTION,
                                                disabled: true,
                                            },
                                            ...apiCanvases
                                                .filter((canvas) => canvas.id)
                                                .map((canvas) => ({
                                                    label: canvas.name || canvas.id || 'Unnamed Canvas',
                                                    value: String(canvas.id),
                                                })),
                                        ]}
                                        style={{ width: '100%' }}
                                        disabled={apiCanvases.length === 0}
                                        maxTagCount={1}
                                        maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                                    />
                                </Space>
                            </Col>
                        )}

                        {/* 3. Assignee List */}
                        {groupByCategory === 'Assignee' && (
                            <Col xs={24} md={8}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Typography.Text type="secondary">Assignee List</Typography.Text>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select Assignee"
                                        value={selectedUserIds}
                                        onChange={handleUserSelectChange}
                                        options={[
                                            {
                                                label: (
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={selectAllUsers}>Select All</Button>
                                                        <Button size="small" type="link" onMouseDown={stopSelectDropdownClick} onClick={deselectAllUsers}>Deselect All</Button>
                                                    </div>
                                                ),
                                                value: BULK_ACTION_OPTION,
                                                disabled: true,
                                            },
                                            ...allUsers.map((user) => ({ label: user.name || user.id || 'User', value: user.id })),
                                        ]}
                                        style={{ width: '100%' }}
                                        disabled={allUsers.length === 0}
                                        maxTagCount={1}
                                        maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                                    />
                                </Space>
                            </Col>
                        )}

                        {/* 4. Date Range */}
                        <Col xs={24} md={8}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Typography.Text type="secondary">Date Range</Typography.Text>
                                <RangePicker
                                    style={{ width: '100%' }}
                                    value={dateRange}
                                    onChange={handleDateRangeChange}
                                    format="DD MMM YYYY"
                                    disabledDate={(current) => Boolean(current && current.isAfter(dayjs(), 'day'))}
                                    ranges={{
                                        'This Week': [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')],
                                        'Last Week': [
                                                dayjs().subtract(1, 'week').startOf('isoWeek'),
                                                dayjs().subtract(1, 'week').endOf('isoWeek'),
                                            ],
                                        'This Month': [dayjs().startOf('month'), dayjs().endOf('month')],
                                        'Last Month': [
                                                dayjs().subtract(1, 'month').startOf('month'),
                                                dayjs().subtract(1, 'month').endOf('month'),
                                            ],
                                        'This Year': [dayjs().startOf('year'), dayjs().endOf('year')],
                                        'Last Year': [
                                            dayjs().subtract(1, 'year').startOf('year'),
                                            dayjs().subtract(1, 'year').endOf('year'),
                                        ],
                                    }}
                                />
                            </Space>
                        </Col>

                        {/* 5. Time Interval */}
                        <Col xs={24} md={8}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Typography.Text type="secondary">Time Interval</Typography.Text>
                                <Radio.Group
                                    value={timeInterval}
                                    onChange={(event) => {
                                        setIsFilterApplied(true);
                                        setTimeInterval(event.target.value as 'Daily' | 'Weekly' | 'Monthly' | 'Yearly');
                                    }}
                                    optionType="button"
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="Daily">Daily</Radio.Button>
                                    <Radio.Button value="Weekly">Weekly</Radio.Button>
                                    <Radio.Button value="Monthly">Monthly</Radio.Button>
                                    <Radio.Button value="Yearly">Yearly</Radio.Button>
                                </Radio.Group>
                            </Space>
                        </Col>

                        {/* 6. Diagram Type */}
                        <Col xs={24} md={8}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Typography.Text type="secondary">Diagram Type</Typography.Text>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Select
                                        value={histogramType}
                                        onChange={(value) => {
                                            setIsFilterApplied(true);
                                            setHistogramType(value);
                                        }}
                                        style={{ width: '100%' }}
                                        options={[
                                            { label: 'Histogram', value: 'Histogram' },
                                            { label: 'Series', value: 'Series' },
                                        ]}
                                    />
                                    <Button type="primary" icon={<FilterOutlined />} onClick={() => setIsFilterApplied(true)}>
                                        Filter
                                    </Button>
                                </Space.Compact>
                            </Space>
                        </Col>
                    </Row>
                    </Space>
                </Card>

                {/* 4 Diagrams */}
                <Row gutter={[16, 16]}>
                    {OPERATION_OPTIONS.map((operation) => {
                        const chartData = chartDataForOperations[operation.key];
                        const chartOptions = chartOptionsForOperations[operation.key];
                        const operationHasData = chartData && chartData.labels.length > 0 &&
                            chartData.datasets.some((dataset) => dataset.data.some((value) => value > 0));
                        
                        // Determine header level based on operation
                        const headerLevel = operation.key === 'spentHours' || operation.key === 'codeLine' ? 2 : 3;

                        return (
                            <Col xs={24} xl={12} key={operation.key}>
                                <Card
                                    bordered={false}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#fff',
                                        border: '1px solid #edf2f7',
                                        borderRadius: 22,
                                        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
                                    }}
                                    bodyStyle={{ backgroundColor: '#fff' }}
                                    extra={
                                        <Button
                                            type="text"
                                            icon={<BarChartOutlined />}
                                            onClick={() => setExpandedChartKey(operation.key)}
                                        >
                                            Full Size
                                        </Button>
                                    }
                                >
                                    <Spin spinning={loading}>
                                        <div style={{ height: 420, position: 'relative' }}>
                                            <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
                                                <Space size={10}>
                                                    <span style={{ color: operation.color, fontSize: 18 }}>
                                                        {CHART_ICON_MAP[operation.key]}
                                                    </span>
                                                    <Typography.Title
                                                        level={headerLevel as 2 | 3}
                                                        style={{
                                                            margin: 0,
                                                            color: '#262626',
                                                            fontSize: headerLevel === 2 ? '24px' : '20px',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {operation.label}
                                                    </Typography.Title>
                                                </Space>
                                                <Typography.Text type="secondary">
                                                    {histogramType === 'Histogram' ? 'Compare buckets at a glance with grouped bars.' : 'Follow movement over time with a trend line.'}
                                                </Typography.Text>
                                            </Space>
                                            <div style={{ height: 'calc(100% - 60px)', position: 'relative' }}>
                                                {operationHasData ? (
                                                    histogramType === 'Histogram' ? (
                                                        <Bar options={chartOptions} data={chartData} redraw={false} />
                                                    ) : (
                                                        <Line options={chartOptions} data={chartData} redraw={false} />
                                                    )
                                                ) : (
                                                    <Empty
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                        description={
                                                            <Space direction="vertical" size={4}>
                                                                <Space size={8} style={{ justifyContent: 'center' }}>
                                                                    <InfoCircleOutlined style={{ color: viewMeta.accent }} />
                                                                    <Typography.Text strong>{isFilterApplied ? 'No analytics data' : 'Run filters to load data'}</Typography.Text>
                                                                </Space>
                                                                <Typography.Text type="secondary">
                                                                    {isFilterApplied
                                                                        ? `No data found for ${operation.label.toLowerCase()} with the selected filters.`
                                                                        : `Press Filter to load ${operation.label.toLowerCase()} results.`}
                                                                </Typography.Text>
                                                                <Typography.Text type="secondary">
                                                                    {isFilterApplied
                                                                        ? 'Try another date range, interval, or selection.'
                                                                        : 'You can adjust the filters first if needed.'}
                                                                </Typography.Text>
                                                            </Space>
                                                        }
                                                        style={{ marginTop: 64 }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Spin>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </Space>

            <Modal
                open={Boolean(expandedOperation)}
                onCancel={() => setExpandedChartKey(null)}
                footer={null}
                width="92vw"
                style={{ top: 24 }}
                title={
                    expandedOperation ? (
                        <Space size={10}>
                            <span style={{ color: expandedOperation.color, fontSize: 18 }}>
                                {CHART_ICON_MAP[expandedOperation.key]}
                            </span>
                            <span>{expandedOperation.label}</span>
                        </Space>
                    ) : null
                }
            >
                {expandedOperation && (
                    <div style={{ height: '75vh', position: 'relative' }}>
                        {(() => {
                            const chartData = chartDataForOperations[expandedOperation.key];
                            const chartOptions = {
                                ...chartOptionsForOperations[expandedOperation.key],
                                maintainAspectRatio: false,
                            };
                            const operationHasData = chartData && chartData.labels.length > 0 &&
                                chartData.datasets.some((dataset) => dataset.data.some((value) => value > 0));

                            if (!operationHasData) {
                                return (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={`No data for ${expandedOperation.label}`}
                                        style={{ marginTop: 120 }}
                                    />
                                );
                            }

                            return histogramType === 'Histogram' ? (
                                <Bar options={chartOptions} data={chartData} redraw={false} />
                            ) : (
                                <Line options={chartOptions} data={chartData} redraw={false} />
                            );
                        })()}
                    </div>
                )}
            </Modal>
            
            {/* Backlog Drawer */}
            <IssueProvider>
                <BacklogTableDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    data={drawerData}
                />
            </IssueProvider>
        </Card>
    );
};

export default TaskCountHistogram;

