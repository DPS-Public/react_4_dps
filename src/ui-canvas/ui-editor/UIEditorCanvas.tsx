import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Button, Card, Empty, Input, message, Modal, Select, Space, Spin, Tag, Tooltip} from "antd";
import {
    ApiOutlined,
    AlignLeftOutlined,
    AppstoreOutlined,
    BgColorsOutlined,
    BorderOutlined,
    BulbOutlined,
    CalendarOutlined,
    CheckSquareOutlined,
    ClockCircleOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownOutlined,
    EditOutlined,
    ExpandOutlined,
    FullscreenOutlined,
    FileTextOutlined,
    FontSizeOutlined,
    FormOutlined,
    NodeIndexOutlined,
    InboxOutlined,
    LinkOutlined,
    PlusOutlined,
    PlusCircleOutlined,
    PictureOutlined,
    SnippetsOutlined,
    TableOutlined,
    TagsOutlined,
    DownloadOutlined,
    UploadOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    YoutubeOutlined,
} from "@ant-design/icons";
import {motion} from "framer-motion";
import UIEditorHeading from "@/components/ui-editor/UIEditorHeading.tsx";
import FirstCanvasSetupCard from "@/components/empty-states/FirstCanvasSetupCard";
import {useUICanvasStates} from "@/hooks/ui-canvas/useUICanvasStates.tsx";
import {ComponentJson, ComponentType, componentTypesObj} from "@/components/ui-canvas/common/types.ts";
import UICanvasCardCreateModal from "@/components/ui-canvas/common/UICanvasCardCreateModal.tsx";
import UICanvasCardUpdateModal from "@/components/ui-canvas/common/UICanvasCardUpdateModal.tsx";
import UIPrototype from "@/hooks/ui-canvas/ui-prototype/UIPrototype.tsx";
import UICanvasActionsComponentInformationUpdateDrawer
    from "@/ui-canvas/uic_ui_canvas_actions_component_information_update_drawer/uicUICanvasActionsComponentInformationUpdateDrawer";
import { Actions } from "@/ui-canvas/uic_ui_canvas/types/Actions.ts";
import { ActionsType } from "@/ui-canvas/uic_ui_canvas/types/ActionsType.enum.ts";
import UICanvasTemplateDescriptionCreateDrawer from "@/components/ui-canvas/template-description/UICanvasTemplateDescriptionCreateDrawer.tsx";
import UICanvasActionsAPICallDrawer from "@/ui-canvas/uic_ui_canvas_actions_api_call_drawer/uicUICanvasActionsAPICallDrawer";
import UICanvasUpdateInputDrawer from "@/components/ui-canvas/input/UICanvasUpdateInputDrawer.tsx";
import UICanvasCreateFormActionDrawer from "@/components/ui-canvas/form-action/UICanvasCreateFormActionDrawer.tsx";
import UICanvasCreateInputDrawer from "@/components/ui-canvas/input/UICanvasCreateInputDrawer.tsx";
import UICanvasActionsManualDescriptionCreateDrawer from "@/ui-canvas/uic_ui_canvas_actions_manual_description_create_drawer/uicUICanvasActionsManualDescriptionCreateDrawer.tsx";
import UIPrototypeCSSInspector, {
    UIPrototypeCSSInspectorBindings
} from "@/hooks/ui-canvas/ui-prototype/UIPrototypeCSSInspector.tsx";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {toPng} from "html-to-image";
import { useSelector } from "react-redux";
import { RootState } from "@/store";


interface MotionProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
}

interface UIEditorCanvasProps extends MotionProps {
    initialViewMode?: ViewMode;
    flowOnly?: boolean;
    forcedCanvasId?: string;
    embedded?: boolean;
}

type ViewMode = "prototype" | "flow";

interface FlowMapNode {
    id: string;
    canvasId: string;
    label: string;
    depth: number;
    x: number;
    y: number;
    outgoingRedirectCount: number;
    outgoingPopupCount: number;
    incomingCount: number;
    isLoop?: boolean;
}

interface FlowMapEdge {
    key: string;
    source: string;
    target: string;
    action: "redirect" | "show_form";
    inputName: string;
}

interface FlowMapViewProps {
    loading: boolean;
    nodes: FlowMapNode[];
    edges: FlowMapEdge[];
    selectedUICanvasId: string;
    zoomLevel: number;
    onSelectCanvas: (id: string) => void;
    onPreviewCanvas: (id: string) => void;
    hasMoreOutgoing: boolean;
    onContinue: () => void;
    onSetZoom: (zoom: number) => void;
    onOpenRelationWizard: (node: FlowMapNode, direction: "incoming" | "outgoing") => void;
}

interface FlowRelationWizardState {
    open: boolean;
    anchorNode: FlowMapNode | null;
    direction: "incoming" | "outgoing";
    relatedCanvasId: string;
    sourceInputId: string;
    action: "redirect" | "show_form";
    condition: string;
}

interface FlowRelationInputOption {
    value: string;
    label: string;
}

const FLOW_ACTION_OPTIONS = [
    { value: "redirect", label: "Redirect" },
    { value: "show_form", label: "Popup" },
] as const;

const getSortedCanvasInputs = (
    canvasData: {
        input?: Record<string, Record<string, unknown>>;
    } | undefined,
    canvasId: string,
): FlowRelationInputOption[] => {
    const inputs = canvasData?.input?.[canvasId] ?? {};

    return Object.values(inputs)
        .filter((item): item is ComponentJson & { id: string; inputName?: string; order?: number; rowNo?: number } => Boolean(item && typeof item === "object" && "id" in item))
        .sort((left, right) => {
            const leftOrder = Number(left?.order ?? left?.rowNo ?? 0);
            const rightOrder = Number(right?.order ?? right?.rowNo ?? 0);

            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }

            return String(left?.inputName || left?.id || "").localeCompare(String(right?.inputName || right?.id || ""));
        })
        .map((item) => ({
            value: item.id,
            label: item.inputName || item.id,
        }));
};

const FLOW_CARD_WIDTH = 220;
const FLOW_CARD_HEIGHT = 96;
const FLOW_COLUMN_GAP = 140;
const FLOW_ROW_GAP = 36;
const FLOW_PADDING = 48;

function UIEditorFlowMap({
    loading,
    nodes,
    edges,
    selectedUICanvasId,
    zoomLevel,
    onSelectCanvas,
    onPreviewCanvas,
    hasMoreOutgoing,
    onContinue,
    onSetZoom,
    onOpenRelationWizard,
}: FlowMapViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const exportContentRef = useRef<HTMLDivElement | null>(null);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const dragStateRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
    });
    const nodeMap = useMemo(() => {
        return nodes.reduce((accumulator, node) => {
            accumulator[node.id] = node;
            return accumulator;
        }, {} as Record<string, FlowMapNode>);
    }, [nodes]);

    const contentSize = useMemo(() => {
        const minDepth = nodes.reduce((min, node) => Math.min(min, node.depth), 0);
        const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
        const depthCount = maxDepth - minDepth + 1;
        const columnWidths = depthCount > 0 ? depthCount * FLOW_CARD_WIDTH + Math.max(0, depthCount - 1) * FLOW_COLUMN_GAP : FLOW_CARD_WIDTH;
        const rowsPerColumn = nodes.reduce((accumulator, node) => {
            accumulator[node.depth] = (accumulator[node.depth] ?? 0) + 1;
            return accumulator;
        }, {} as Record<number, number>);
        const maxRows = Math.max(1, ...Object.values(rowsPerColumn));
        const rowHeights = maxRows * FLOW_CARD_HEIGHT + Math.max(0, maxRows - 1) * FLOW_ROW_GAP;

        return {
            width: columnWidths + FLOW_PADDING * 2,
            height: rowHeights + FLOW_PADDING * 2,
        };
    }, [nodes]);

    const graphBounds = useMemo(() => {
        if (nodes.length === 0) {
            return {
                width: FLOW_CARD_WIDTH,
                height: FLOW_CARD_HEIGHT,
            };
        }

        const minX = Math.min(...nodes.map((node) => node.x));
        const minY = Math.min(...nodes.map((node) => node.y));
        const maxX = Math.max(...nodes.map((node) => node.x + FLOW_CARD_WIDTH));
        const maxY = Math.max(...nodes.map((node) => node.y + FLOW_CARD_HEIGHT));

        return {
            width: Math.max(FLOW_CARD_WIDTH, maxX - minX + FLOW_PADDING * 2),
            height: Math.max(FLOW_CARD_HEIGHT, maxY - minY + FLOW_PADDING * 2),
        };
    }, [nodes]);

    const handleFitToScreen = useCallback(() => {
        if (!scrollContainerRef.current || !graphBounds.width || !graphBounds.height) {
            return;
        }

        const availableWidth = Math.max(scrollContainerRef.current.clientWidth - 48, 320);
        const availableHeight = Math.max(scrollContainerRef.current.clientHeight - 48, 240);
        const fittedZoom = Math.min(
            1,
            availableWidth / graphBounds.width,
            availableHeight / graphBounds.height,
        );

        onSetZoom(Number(Math.max(0.1, fittedZoom).toFixed(2)));
    }, [graphBounds.height, graphBounds.width, onSetZoom]);

    const handleDownloadPng = useCallback(async () => {
        if (!exportContentRef.current) {
            return;
        }

        try {
            const dataUrl = await toPng(exportContentRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
            });

            const downloadLink = document.createElement("a");
            downloadLink.download = `flow-map-${selectedUICanvasId || "ui-canvas"}.png`;
            downloadLink.href = dataUrl;
            downloadLink.click();
        } catch (error) {
            console.error(error);
            message.error("Flow map image export failed");
        }
    }, [selectedUICanvasId]);

    const handleFullscreen = useCallback(async () => {
        if (!scrollContainerRef.current) {
            return;
        }

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }

            await scrollContainerRef.current.requestFullscreen();
        } catch (error) {
            console.error(error);
            message.error("Fullscreen could not be opened");
        }
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    minHeight: 520,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    borderRadius: 10,
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div
                style={{
                    minHeight: 520,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    borderRadius: 10,
                    padding: 32,
                }}
            >
                <Empty description="No UI canvas relations found" />
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "100%", minHeight: "calc(100vh - 170px)", height: "100%" }}>
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 4,
                    display: "flex",
                    justifyContent: "flex-start",
                    pointerEvents: "none",
                }}
            >
                <Space size={8} style={{ pointerEvents: "auto" }}>
                    <Button icon={<ExpandOutlined />} onClick={handleFitToScreen}>
                        Fit
                    </Button>
                    <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
                        Fullscreen
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadPng}>
                        Download PNG
                    </Button>
                </Space>
            </div>
            <div
                ref={scrollContainerRef}
                style={{
                    width: "100%",
                    minHeight: "calc(100vh - 170px)",
                    height: "100%",
                    overflow: "auto",
                    background: "#f7f8fb",
                    border: "1px dashed rgba(148, 163, 184, 0.35)",
                    borderRadius: 18,
                    cursor: isDraggingCanvas ? "grabbing" : "grab",
                    userSelect: isDraggingCanvas ? "none" : "auto",
                }}
                onMouseDown={(event) => {
                    if (event.button !== 0 || !scrollContainerRef.current) {
                        return;
                    }

                    dragStateRef.current = {
                        isDragging: true,
                        startX: event.clientX,
                        startY: event.clientY,
                        scrollLeft: scrollContainerRef.current.scrollLeft,
                        scrollTop: scrollContainerRef.current.scrollTop,
                    };
                    setIsDraggingCanvas(true);
                }}
                onMouseMove={(event) => {
                    if (!dragStateRef.current.isDragging || !scrollContainerRef.current) {
                        return;
                    }

                    const deltaX = event.clientX - dragStateRef.current.startX;
                    const deltaY = event.clientY - dragStateRef.current.startY;

                    scrollContainerRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
                    scrollContainerRef.current.scrollTop = dragStateRef.current.scrollTop - deltaY;
                }}
                onMouseUp={() => {
                    dragStateRef.current.isDragging = false;
                    setIsDraggingCanvas(false);
                }}
                onMouseLeave={() => {
                    dragStateRef.current.isDragging = false;
                    setIsDraggingCanvas(false);
                }}
            >
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    minWidth: "fit-content",
                    minHeight: "100%",
                    padding: "30px 0",
                }}
            >
                <div
                    ref={exportContentRef}
                    style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top center",
                        transition: "transform 180ms ease",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: contentSize.width,
                            height: contentSize.height,
                            borderRadius: 18,
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                            border: "1px solid rgba(15, 23, 42, 0.05)",
                            boxShadow: "0 28px 80px rgba(15, 23, 42, 0.10), 0 10px 28px rgba(15, 23, 42, 0.06)",
                            overflow: "hidden",
                        }}
                    >
                        <svg
                            width={contentSize.width}
                            height={contentSize.height}
                            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                        >
                            <defs>
                                <marker id="flow-map-arrow-redirect" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#1677ff" />
                                </marker>
                                <marker id="flow-map-arrow-popup" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#52c41a" />
                                </marker>
                            </defs>
                            {edges.map((edge) => {
                                const sourceNode = nodeMap[edge.source];
                                const targetNode = nodeMap[edge.target];

                                if (!sourceNode || !targetNode) {
                                    return null;
                                }

                                const startX = sourceNode.x + FLOW_CARD_WIDTH;
                                const startY = sourceNode.y + FLOW_CARD_HEIGHT / 2;
                                const endX = targetNode.x;
                                const endY = targetNode.y + FLOW_CARD_HEIGHT / 2;
                                const midX = startX + (endX - startX) / 2;
                                const color = edge.action === "show_form" ? "#52c41a" : "#1677ff";

                                return (
                                    <g key={edge.key}>
                                        <path
                                            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={2}
                                            strokeDasharray={edge.action === "show_form" ? "8 6" : undefined}
                                            markerEnd={`url(#flow-map-arrow-${edge.action === "show_form" ? "popup" : "redirect"})`}
                                            opacity={edge.source === selectedUICanvasId || edge.target === selectedUICanvasId ? 1 : 0.7}
                                        />
                                        <rect
                                            x={midX - 42}
                                            y={(startY + endY) / 2 - 10}
                                            width={84}
                                            height={20}
                                            rx={10}
                                            fill="#ffffff"
                                            opacity={0.94}
                                        />
                                        <text
                                            x={midX}
                                            y={(startY + endY) / 2 + 4}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fontWeight={700}
                                            fill={color}
                                        >
                                            {edge.action === "show_form" ? "popup" : "redirect"}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>

                        {nodes.map((node) => {
                            const isSelected = node.canvasId === selectedUICanvasId && node.depth === 0;

                            if (node.isLoop) {
                                return (
                                    <div
                                        key={node.id}
                                        style={{
                                            position: "absolute",
                                            left: node.x,
                                            top: node.y,
                                            width: FLOW_CARD_WIDTH,
                                            minHeight: FLOW_CARD_HEIGHT,
                                            borderRadius: 16,
                                            padding: 14,
                                            border: "1px solid rgba(255, 77, 79, 0.35)",
                                            background: "linear-gradient(180deg, #fff1f0 0%, #ffffff 100%)",
                                            boxShadow: "0 10px 24px rgba(255, 77, 79, 0.10)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: 8,
                                                marginBottom: 10,
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: "#ff4d4f",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Loop to
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: 700,
                                                        color: "#0f172a",
                                                        lineHeight: 1.35,
                                                        cursor: "pointer",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onPreviewCanvas(node.canvasId);
                                                    }}
                                                >
                                                    {node.label}
                                                </div>
                                            </div>
                                            <Tag
                                                color="red"
                                                style={{ marginInlineEnd: 0, fontSize: 10, cursor: "pointer" }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onSelectCanvas(node.canvasId);
                                                }}
                                            >
                                                {node.canvasId.slice(0, 6)}
                                            </Tag>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 6,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {node.outgoingRedirectCount > 0 && (
                                                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                                                    redirect {node.outgoingRedirectCount}
                                                </Tag>
                                            )}
                                            {node.outgoingPopupCount > 0 && (
                                                <Tag color="green" style={{ marginInlineEnd: 0 }}>
                                                    popup {node.outgoingPopupCount}
                                                </Tag>
                                            )}
                                            {node.incomingCount > 0 && (
                                                <Tag color="default" style={{ marginInlineEnd: 0 }}>
                                                    in {node.incomingCount}
                                                </Tag>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={node.id}
                                    style={{
                                        position: "absolute",
                                        left: node.x,
                                        top: node.y,
                                        width: FLOW_CARD_WIDTH,
                                        height: FLOW_CARD_HEIGHT,
                                        borderRadius: 16,
                                        padding: 14,
                                        textAlign: "left",
                                        overflow: "visible",
                                        border: isSelected ? "2px solid #1677ff" : "1px solid rgba(15, 23, 42, 0.08)",
                                        background: isSelected ? "linear-gradient(180deg, #eef6ff 0%, #ffffff 100%)" : "#ffffff",
                                        boxShadow: isSelected
                                            ? "0 14px 34px rgba(22, 119, 255, 0.18)"
                                            : "0 10px 24px rgba(15, 23, 42, 0.08)",
                                    }}
                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                    onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                                >
                                    <Tooltip title="Add incoming relation">
                                        <Button
                                            type="primary"
                                            shape="circle"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onMouseDown={(event) => {
                                                event.stopPropagation();
                                            }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onOpenRelationWizard(node, "incoming");
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                opacity: hoveredNodeId === node.id ? 1 : 0,
                                                pointerEvents: hoveredNodeId === node.id ? "auto" : "none",
                                                boxShadow: "0 10px 22px rgba(22, 119, 255, 0.28)",
                                            }}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Add outgoing relation">
                                        <Button
                                            type="primary"
                                            shape="circle"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onMouseDown={(event) => {
                                                event.stopPropagation();
                                            }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onOpenRelationWizard(node, "outgoing");
                                            }}
                                            style={{
                                                position: "absolute",
                                                right: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                opacity: hoveredNodeId === node.id ? 1 : 0,
                                                pointerEvents: hoveredNodeId === node.id ? "auto" : "none",
                                                boxShadow: "0 10px 22px rgba(22, 119, 255, 0.28)",
                                            }}
                                        />
                                    </Tooltip>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: 8,
                                            marginBottom: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#0f172a",
                                                lineHeight: 1.35,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                cursor: "pointer",
                                            }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onPreviewCanvas(node.canvasId);
                                            }}
                                        >
                                            {node.label}
                                        </div>
                                        <Tag
                                            color={isSelected ? "blue" : "default"}
                                            style={{ marginInlineEnd: 0, fontSize: 10, cursor: "pointer" }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectCanvas(node.canvasId);
                                            }}
                                        >
                                            {node.canvasId.slice(0, 6)}
                                        </Tag>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {node.outgoingRedirectCount > 0 && (
                                            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                                                redirect {node.outgoingRedirectCount}
                                            </Tag>
                                        )}
                                        {node.outgoingPopupCount > 0 && (
                                            <Tag color="green" style={{ marginInlineEnd: 0 }}>
                                                popup {node.outgoingPopupCount}
                                            </Tag>
                                        )}
                                        {node.incomingCount > 0 && (
                                            <Tag color="default" style={{ marginInlineEnd: 0 }}>
                                                in {node.incomingCount}
                                            </Tag>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {hasMoreOutgoing && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "0 0 24px",
                    }}
                >
                    <Button type="default" onClick={onContinue}>
                        Continue
                    </Button>
                </div>
            )}
            </div>
        </div>
    );
}

export const componentIcons: Record<ComponentType, React.ReactNode> = {
    [ComponentType.Btn]: <BorderOutlined/>,
    [ComponentType.Txt]: <FontSizeOutlined/>,
    [ComponentType.Lbl]: <TagsOutlined/>,
    [ComponentType.Cmb]: <DownOutlined/>,
    [ComponentType.Txa]: <AlignLeftOutlined/>,
    [ComponentType.Cbox]: <CheckSquareOutlined/>,
    [ComponentType.Rbtn]: <BulbOutlined/>,
    [ComponentType.Date]: <CalendarOutlined/>,
    [ComponentType.Time]: <ClockCircleOutlined/>,
    [ComponentType.File]: <UploadOutlined/>,
    [ComponentType.Hlink]: <LinkOutlined/>,
    [ComponentType.Img]: <PictureOutlined/>,
    [ComponentType.Tbl]: <TableOutlined/>,
    [ComponentType.Ytube]: <YoutubeOutlined/>,
    [ComponentType.Grp]: <AppstoreOutlined/>,
    [ComponentType.Icbox]: <CheckSquareOutlined/>,
};

const UIEditorCanvas: React.FC<UIEditorCanvasProps> = ({
    initialViewMode = "prototype",
    flowOnly = false,
    forcedCanvasId,
    embedded = false,
    ...motionProps
}) => {
    const uiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.uiCanvases);
    const DEFAULT_ZOOM = 0.8;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 2.5;
    const ZOOM_STEP = 0.1;
    const openUICanvasActionsManualDescriptionUpdateDrawer = useCallback(() => {
        // UI Editor ekraninda manual description update drawer istifadəsi yoxdur.
    }, []);

    const {
        selectedUICanvasId,
        uiList,
        selectedUI,
        onChangeUI,
        openUIUpdateModal,
        openUICreateModal,
        selectedComponent,
        setSelectedComponent,
        addUIEditorAddComponent,
        uiEditorDeleteComponent,
        uiEditorDuplicateComponent,
        isOpenUICreateModal,
        closeUICreateModal,
        createUICanvas,
        isOpenUIUpdateModal,
        closeUIUpdateModal,
        updateUICanvasName,
        editingUICanvas,
        deleteUICanvas,
        selectedInput,
        isOpenUICanvasActionsManualDescriptionDrawer,
        closeUICanvasActionsManualDescriptionCreateDrawer,
        selectedManualDescriptionCreateInput,
        createManualDescription,
        isOpenUICanvasActionsAPIRelationDrawer,
        closeUICanvasActionsAPIRelationDrawer,
        createAPICallRelation,
        closeUICanvasActionsComponentInformationUpdateDrawer,
        isOpenUICanvasActionsComponentInformationUpdateDrawer,
        updateComponentInformation,
        isOpenUICanvasActionsTemplateDescriptionDrawer,
        closeUICanvasActionsTemplateDescriptionDrawer,
        templateDescriptionCreate,
        isOpenUICanvasUpdateInputModal,
        closeUICanvasUpdateInputModal,
        updateInput,
        isOpenUICanvasCreateFormActionDrawer,
        closeUICanvasFormActionDrawer,
        createFormAction,
        isShowUIViewCSSColumn,
        setIsShowUIViewCSSColumn,
        selectedComponentInformationInput,
        setSelectedComponentInformationInput,
        openComponentInformationFromPrototype,
        handleUIEditorComponentContextAction,
    } = useUICanvasStates({
        openUICanvasActionsManualDescriptionUpdateDrawer,
        forcedCanvasId,
    });

    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
    const [cssInspectorBindings, setCssInspectorBindings] = useState<UIPrototypeCSSInspectorBindings | null>(null);
    const editorViewportRef = useRef<HTMLDivElement | null>(null);
    const [isEditorViewportActive, setIsEditorViewportActive] = useState(false);
    const fallbackCssRef = useRef<Record<string, string>>({});
    const [fallbackCssTarget, setFallbackCssTarget] = useState<"container" | "component" | "canvas">("component");
    const [defaultCellNo, setDefaultCellNo] = useState("6");
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
    const [flowMapLoading, setFlowMapLoading] = useState(false);
    const [flowMapDocuments, setFlowMapDocuments] = useState<Record<string, any>>({});
    const [flowOutgoingDepthLimit, setFlowOutgoingDepthLimit] = useState(10);
    const [flowPreviewCanvasId, setFlowPreviewCanvasId] = useState<string | null>(null);
    const [flowRelationWizard, setFlowRelationWizard] = useState<FlowRelationWizardState>({
        open: false,
        anchorNode: null,
        direction: "outgoing",
        relatedCanvasId: "",
        sourceInputId: "",
        action: "redirect",
        condition: "",
    });
    const [isCreatingCanvasFromRelationWizard, setIsCreatingCanvasFromRelationWizard] = useState(false);
    const [isCreateFlowInputModalOpen, setIsCreateFlowInputModalOpen] = useState(false);
    const editorMinHeight = embedded ? "calc(100vh - 260px)" : "calc(100vh - 170px)";

    const handleCloseComponentInformationDrawer = useCallback(() => {
        setSelectedComponentInformationInput(null);
        closeUICanvasActionsComponentInformationUpdateDrawer();
    }, [closeUICanvasActionsComponentInformationUpdateDrawer, setSelectedComponentInformationInput]);

    const handleOpenCreateCanvasFromRelationWizard = useCallback(() => {
        setIsCreatingCanvasFromRelationWizard(true);
        openUICreateModal();
    }, [openUICreateModal]);

    const handleCloseCreateCanvasModal = useCallback((createdCanvas?: { id: string; label?: string }) => {
        closeUICreateModal();

        if (isCreatingCanvasFromRelationWizard) {
            setIsCreatingCanvasFromRelationWizard(false);

            if (createdCanvas?.id) {
                setFlowRelationWizard((current) => ({
                    ...current,
                    relatedCanvasId: createdCanvas.id,
                    sourceInputId: "",
                }));
            }
        }
    }, [closeUICreateModal, isCreatingCanvasFromRelationWizard]);

    const handleCreateCanvas = useCallback((name: string) => {
        return createUICanvas(name, {
            selectAfterCreate: !isCreatingCanvasFromRelationWizard,
        });
    }, [createUICanvas, isCreatingCanvasFromRelationWizard]);

    const handleAddComponent = useCallback((componentType: ComponentType) => {
        addUIEditorAddComponent({
            fkTableId: "",
            inputType: "IN",
            componentType,
            cellNo: defaultCellNo,
            hasLabel: true,
            content: "",
        });
    }, [addUIEditorAddComponent, defaultCellNo]);

    useEffect(() => {
        let isCancelled = false;

        if (!uiList?.length) {
            setFlowMapDocuments({});
            return;
        }

        const loadFlowMapDocuments = async () => {
            try {
                setFlowMapLoading(true);

                const entries = await Promise.all(
                    uiList.map(async (item) => {
                        const snapshot = await getDoc(doc(db, "ui_canvas", item.id));
                        return [item.id, snapshot.data() ?? {}] as const;
                    }),
                );

                if (isCancelled) {
                    return;
                }

                setFlowMapDocuments(
                    entries.reduce((accumulator, [id, data]) => {
                        accumulator[id] = data;
                        return accumulator;
                    }, {} as Record<string, any>),
                );
            } finally {
                if (!isCancelled) {
                    setFlowMapLoading(false);
                }
            }
        };

        loadFlowMapDocuments();

        return () => {
            isCancelled = true;
        };
    }, [uiList]);

    useEffect(() => {
        if (!selectedUICanvasId) {
            return;
        }

        setFlowMapDocuments((currentDocuments) => ({
            ...currentDocuments,
            [selectedUICanvasId]: {
                ...currentDocuments[selectedUICanvasId],
                id: selectedUICanvasId,
                name:
                    selectedUI?.name ||
                    selectedUI?.label ||
                    uiList?.find((item) => item.id === selectedUICanvasId)?.label ||
                    currentDocuments[selectedUICanvasId]?.name ||
                    selectedUICanvasId,
                input: {
                    ...(currentDocuments[selectedUICanvasId]?.input ?? {}),
                    [selectedUICanvasId]: selectedUI?.input ?? {},
                },
            },
        }));
    }, [selectedUICanvasId, selectedUI?.input, selectedUI?.label, selectedUI?.name, uiList]);

    useEffect(() => {
        setFlowOutgoingDepthLimit(10);
    }, [selectedUICanvasId]);

    const sourceCanvasIdForWizard = flowRelationWizard.anchorNode
        ? (flowRelationWizard.direction === "outgoing"
            ? flowRelationWizard.anchorNode.canvasId
            : flowRelationWizard.relatedCanvasId)
        : "";

    const handleCreateFlowRelationInput = useCallback(async (name: string) => {
        const canvasId = sourceCanvasIdForWizard;
        const trimmedName = name.trim();

        if (!canvasId || !trimmedName) {
            return null;
        }

        const uiCanvasDocRef = doc(db, "ui_canvas", canvasId);
        const nextInputId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        try {
            const snapshot = await getDoc(uiCanvasDocRef);

            if (!snapshot.exists()) {
                message.error("Source UI canvas not found");
                return null;
            }

            const canvasData = snapshot.data() ?? {};
            const existingCanvasInputs = canvasData?.input?.[canvasId] ?? {};
            const nextInput = {
                fkTableId: "",
                inputType: "IN",
                componentType: "txt",
                hasLabel: true,
                cellNo: "6",
                content: "",
                id: nextInputId,
                fkUserStoryId: canvasId,
                inputName: trimmedName,
                order: Object.keys(existingCanvasInputs).length,
            };

            await updateDoc(uiCanvasDocRef, {
                input: {
                    ...(canvasData?.input ?? {}),
                    [canvasId]: {
                        ...existingCanvasInputs,
                        [nextInputId]: nextInput,
                    },
                },
            });

            setFlowMapDocuments((current) => ({
                ...current,
                [canvasId]: {
                    ...current[canvasId],
                    ...canvasData,
                    input: {
                        ...(current[canvasId]?.input ?? canvasData?.input ?? {}),
                        [canvasId]: {
                            ...(current[canvasId]?.input?.[canvasId] ?? existingCanvasInputs),
                            [nextInputId]: nextInput,
                        },
                    },
                },
            }));

            setFlowRelationWizard((current) => ({
                ...current,
                sourceInputId: nextInputId,
            }));
            setIsCreateFlowInputModalOpen(false);
            message.success("Input added successfully");
            return nextInput;
        } catch (error) {
            console.error(error);
            message.error("Failed to create input");
            return null;
        }
    }, [sourceCanvasIdForWizard]);

    const wizardSourceInputOptions = useMemo(() => {
        if (!sourceCanvasIdForWizard) {
            return [];
        }

        return getSortedCanvasInputs(flowMapDocuments[sourceCanvasIdForWizard], sourceCanvasIdForWizard);
    }, [flowMapDocuments, sourceCanvasIdForWizard]);

    const wizardCanvasOptions = useMemo(
        () =>
            [...(uiList ?? [])]
                .sort((left, right) => String(left?.label || left?.id || "").localeCompare(String(right?.label || right?.id || "")))
                .map((item) => ({
                    value: item.id,
                    label: item.label || item.id,
                })),
        [uiList],
    );

    useEffect(() => {
        if (!flowRelationWizard.open) {
            return;
        }

        setFlowRelationWizard((current) => {
            const currentInputExists = wizardSourceInputOptions.some((item) => item.value === current.sourceInputId);

            if (currentInputExists) {
                return current;
            }

            return {
                ...current,
                sourceInputId: "",
            };
        });
    }, [flowRelationWizard.open, wizardSourceInputOptions]);

    const handleOpenRelationWizard = useCallback((node: FlowMapNode, direction: "incoming" | "outgoing") => {
        setFlowRelationWizard({
            open: true,
            anchorNode: node,
            direction,
            relatedCanvasId: "",
            sourceInputId: "",
            action: "redirect",
            condition: "",
        });
    }, []);

    const handleCloseRelationWizard = useCallback(() => {
        setFlowRelationWizard({
            open: false,
            anchorNode: null,
            direction: "outgoing",
            relatedCanvasId: "",
            sourceInputId: "",
            action: "redirect",
            condition: "",
        });
    }, []);

    const handleSaveFlowRelation = useCallback(async () => {
        const anchorNode = flowRelationWizard.anchorNode;

        if (!anchorNode) {
            return;
        }

        const sourceCanvasId = flowRelationWizard.direction === "outgoing"
            ? anchorNode.canvasId
            : flowRelationWizard.relatedCanvasId;
        const targetCanvasId = flowRelationWizard.direction === "outgoing"
            ? flowRelationWizard.relatedCanvasId
            : anchorNode.canvasId;
        const inputId = flowRelationWizard.sourceInputId;

        if (!sourceCanvasId || !targetCanvasId) {
            message.warning("Please select a related UI canvas");
            return;
        }

        if (!inputId) {
            message.warning("Please select an input");
            return;
        }

        const sourceCanvasDocRef = doc(db, "ui_canvas", sourceCanvasId);

        try {
            const sourceCanvasSnapshot = await getDoc(sourceCanvasDocRef);

            if (!sourceCanvasSnapshot.exists()) {
                message.error("Source UI canvas not found");
                return;
            }

            const sourceCanvasData = sourceCanvasSnapshot.data() ?? {};
            const sourceInput = sourceCanvasData?.input?.[sourceCanvasId]?.[inputId];

            if (!sourceInput) {
                message.error("Selected input was not found");
                return;
            }

            const targetCanvasName =
                uiList?.find((item) => item.id === targetCanvasId)?.label ||
                flowMapDocuments[targetCanvasId]?.name ||
                targetCanvasId;

            const mergedFormAction = {
                ...(sourceInput?.formAction ?? {}),
                action: flowRelationWizard.action,
                uiId: targetCanvasId,
                uiName: targetCanvasName,
                inputId,
                inputName: sourceInput?.inputName || inputId,
                condition: flowRelationWizard.condition.trim(),
            };

            await updateDoc(sourceCanvasDocRef, {
                [`input.${sourceCanvasId}.${inputId}.formAction`]: mergedFormAction,
            });

            setFlowMapDocuments((current) => ({
                ...current,
                [sourceCanvasId]: {
                    ...current[sourceCanvasId],
                    input: {
                        ...(current[sourceCanvasId]?.input ?? {}),
                        [sourceCanvasId]: {
                            ...(current[sourceCanvasId]?.input?.[sourceCanvasId] ?? {}),
                            [inputId]: {
                                ...(current[sourceCanvasId]?.input?.[sourceCanvasId]?.[inputId] ?? {}),
                                ...sourceInput,
                                formAction: mergedFormAction,
                            },
                        },
                    },
                },
            }));

            message.success("Relation added successfully");
            handleCloseRelationWizard();
        } catch (error) {
            console.error(error);
            message.error("Failed to save relation");
        }
    }, [flowMapDocuments, flowRelationWizard, handleCloseRelationWizard, uiList]);

    const changeZoom = useCallback((delta: number) => {
        setZoomLevel((prev) => {
            const next = Number((prev + delta).toFixed(2));
            return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
        });
    }, [MAX_ZOOM, MIN_ZOOM]);

    const resetZoom = useCallback(() => {
        setZoomLevel(DEFAULT_ZOOM);
    }, [DEFAULT_ZOOM]);

    useEffect(() => {
        const handleNativeWheel = (event: WheelEvent) => {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            const editorViewport = editorViewportRef.current;
            const targetNode = event.target as Node | null;

            if (!editorViewport || !targetNode || !editorViewport.contains(targetNode)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setIsEditorViewportActive(true);
            changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        };

        document.addEventListener("wheel", handleNativeWheel, {
            passive: false,
            capture: true,
        });

        return () => {
            document.removeEventListener("wheel", handleNativeWheel, true);
        };
    }, [changeZoom]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isEditorViewportActive || !(event.ctrlKey || event.metaKey)) {
                return;
            }

            if (event.key === "+" || event.key === "=") {
                event.preventDefault();
                event.stopPropagation();
                changeZoom(ZOOM_STEP);
                return;
            }

            if (event.key === "-" || event.key === "_") {
                event.preventDefault();
                event.stopPropagation();
                changeZoom(-ZOOM_STEP);
                return;
            }

            if (event.key === "0") {
                event.preventDefault();
                event.stopPropagation();
                resetZoom();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [changeZoom, isEditorViewportActive, resetZoom]);

    const contextActionIcons: Record<string, React.ReactNode> = {
        [ActionsType.COMPONENT_INFORMATION]: <AppstoreOutlined />,
        [ActionsType.MANUAL_DESCRIPTION]: <FileTextOutlined />,
        [ActionsType.TEMPLATE_DESCRIPTION]: <SnippetsOutlined />,
        [ActionsType.API_RELATION]: <ApiOutlined />,
        [ActionsType.FORM_ACTION]: <FormOutlined />,
        [ActionsType.RENAME]: <EditOutlined />,
        [ActionsType.DELETE]: <DeleteOutlined />,
    };

    const getComponentContextMenuItems = useCallback((_: ComponentJson) => {
        return Actions.map((action) => ({
            key: action.key,
            label: action.label,
            icon: contextActionIcons[action.key],
        }));
    }, []);

    const componentButtons = useMemo(() => {
        return Object.keys(componentTypesObj)
            .filter((key) => key !== ComponentType.IRbtn)
            .map((key) => {
            const type = key as ComponentType;
            const { label } = componentTypesObj[type];
            const icon = componentIcons[type];

            return (
                <Tooltip key={type} title={label} placement="right">
                    <Button
                        onClick={() => handleAddComponent(type)}
                        title={label}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            padding: 3,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            textAlign: "center",
                            border: "1px solid #d9d9d9",
                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                            background: "#ffffff",
                            overflow: "hidden",
                        }}
                    >
                        <span
                            style={{
                                fontSize: 14,
                                lineHeight: 1,
                                color: "#1677ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {icon}
                        </span>
                        <span
                            style={{
                                fontSize: 6,
                                lineHeight: 1,
                                whiteSpace: "normal",
                                overflowWrap: "anywhere",
                                maxWidth: "100%",
                                color: "#262626",
                                fontWeight: 500,
                            }}
                        >
                            {label}
                        </span>
                    </Button>
                </Tooltip>
            );
        });
    }, [handleAddComponent]);

    const hasRenderableComponents = useMemo(() => {
        return Object.values(selectedUI?.input ?? {}).some(
            (item) => Boolean(item && typeof item === "object" && "id" in item),
        );
    }, [selectedUI?.input]);

    const fallbackCssInspectorBindings = useMemo<UIPrototypeCSSInspectorBindings>(() => ({
        allCssString: "",
        componentAttributeSummary: "",
        components: {
            ...(selectedUI?.input ?? {}),
            css: "",
        },
        containerCss: "width: 900px; height: auto;",
        cssRef: fallbackCssRef,
        cssTarget: fallbackCssTarget,
        persistPrototypes: async () => undefined,
        selectedComponent: null,
        selectedUICanvasId,
        setComponents: () => undefined,
        setContainerCss: () => undefined,
        setSelectedComponent,
        setCssTarget: setFallbackCssTarget,
        updateAllCss: () => undefined,
        updateCss: () => undefined,
    }), [fallbackCssTarget, selectedUICanvasId, selectedUI?.input, setSelectedComponent]);

    const activeCssInspectorBindings = cssInspectorBindings ?? fallbackCssInspectorBindings;
    const floatingPanelStyle: React.CSSProperties = {
        background: "#ffffff",
        borderRadius: 10,
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "none",
    };
    const flowMapData = useMemo(() => {
        const nameMap = (uiList ?? []).reduce((accumulator, item) => {
            accumulator[item.id] = item.label || item.id;
            return accumulator;
        }, {} as Record<string, string>);

        const edgesMap = new Map<string, FlowMapEdge>();
        const incomingCount = {} as Record<string, number>;
        const outgoingRedirectCount = {} as Record<string, number>;
        const outgoingPopupCount = {} as Record<string, number>;

        Object.keys(nameMap).forEach((nodeId) => {
            incomingCount[nodeId] = 0;
            outgoingRedirectCount[nodeId] = 0;
            outgoingPopupCount[nodeId] = 0;
        });

        Object.entries(flowMapDocuments).forEach(([canvasId, canvasData]) => {
            const inputs = canvasData?.input?.[canvasId] ?? {};

            Object.values(inputs).forEach((value) => {
                const component = value as ComponentJson & { formAction?: { action?: string; uiId?: string } };
                const formAction = component?.formAction;
                const action = formAction?.action;
                const targetId = formAction?.uiId;

                if (!targetId || !["redirect", "show_form"].includes(action || "") || !nameMap[targetId]) {
                    return;
                }

                const edgeKey = `${canvasId}:${targetId}:${action}:${component?.id || component?.inputName || ""}`;
                edgesMap.set(edgeKey, {
                    key: edgeKey,
                    source: canvasId,
                    target: targetId,
                    action: action as "redirect" | "show_form",
                    inputName: component?.inputName || "",
                });

                incomingCount[targetId] = (incomingCount[targetId] ?? 0) + 1;

                if (action === "redirect") {
                    outgoingRedirectCount[canvasId] = (outgoingRedirectCount[canvasId] ?? 0) + 1;
                }

                if (action === "show_form") {
                    outgoingPopupCount[canvasId] = (outgoingPopupCount[canvasId] ?? 0) + 1;
                }
            });
        });

        const edges = Array.from(edgesMap.values());
        const outgoingMap = edges.reduce((accumulator, edge) => {
            if (!accumulator[edge.source]) {
                accumulator[edge.source] = [];
            }

            accumulator[edge.source].push(edge);
            return accumulator;
        }, {} as Record<string, FlowMapEdge[]>);
        const incomingMap = edges.reduce((accumulator, edge) => {
            if (!accumulator[edge.target]) {
                accumulator[edge.target] = [];
            }

            accumulator[edge.target].push(edge);
            return accumulator;
        }, {} as Record<string, FlowMapEdge[]>);

        const nodeIds = Object.keys(nameMap);
        const selectedRootId = selectedUICanvasId && nameMap[selectedUICanvasId]
            ? selectedUICanvasId
            : nodeIds[0];
        const directIncomingNodeIds = new Set<string>(
            selectedRootId
                ? (incomingMap[selectedRootId] ?? []).map((edge) => edge.source)
                : [],
        );
        const renderedNodes: FlowMapNode[] = [];
        const renderedEdges: FlowMapEdge[] = [];
        const rowsByDepth = {} as Record<number, number>;
        let instanceCounter = 0;
        let hasMoreOutgoing = false;

        const createNode = (canvasId: string, depth: number) => {
            const rowIndex = rowsByDepth[depth] ?? 0;
            rowsByDepth[depth] = rowIndex + 1;
            instanceCounter += 1;

            const node: FlowMapNode = {
                id: `${canvasId}__${depth}__${instanceCounter}`,
                canvasId,
                label: nameMap[canvasId] || canvasId,
                depth,
                x: 0,
                y: 0,
                outgoingRedirectCount: outgoingRedirectCount[canvasId] ?? 0,
                outgoingPopupCount: outgoingPopupCount[canvasId] ?? 0,
                incomingCount: incomingCount[canvasId] ?? 0,
            };

            renderedNodes.push(node);
            return { node, rowIndex };
        };
        const createLoopNode = (canvasId: string, depth: number) => {
            const rowIndex = rowsByDepth[depth] ?? 0;
            rowsByDepth[depth] = rowIndex + 1;
            instanceCounter += 1;

            const node: FlowMapNode = {
                id: `${canvasId}__loop__${depth}__${instanceCounter}`,
                canvasId,
                label: nameMap[canvasId] || canvasId,
                depth,
                x: 0,
                y: 0,
                outgoingRedirectCount: outgoingRedirectCount[canvasId] ?? 0,
                outgoingPopupCount: outgoingPopupCount[canvasId] ?? 0,
                incomingCount: incomingCount[canvasId] ?? 0,
                isLoop: true,
            };

            renderedNodes.push(node);
            return { node, rowIndex };
        };

        if (!selectedRootId) {
            return { nodes: [], edges: [], hasMoreOutgoing: false };
        }

        const rootInstance = createNode(selectedRootId, 0);

        Array.from(directIncomingNodeIds)
            .sort((left, right) => (nameMap[left] || "").localeCompare(nameMap[right] || ""))
            .forEach((canvasId) => {
                const incomingInstance = createNode(canvasId, -1);
                (incomingMap[selectedRootId] ?? [])
                    .filter((edge) => edge.source === canvasId)
                    .forEach((edge) => {
                        renderedEdges.push({
                            key: `${incomingInstance.node.id}->${rootInstance.node.id}:${edge.key}`,
                            source: incomingInstance.node.id,
                            target: rootInstance.node.id,
                            action: edge.action,
                            inputName: edge.inputName,
                        });
                    });
            });

        const queue: Array<{ node: FlowMapNode; depth: number; path: Set<string> }> = [
            { node: rootInstance.node, depth: 0, path: new Set([selectedRootId]) }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            if (!current) {
                continue;
            }

            const currentOutgoingEdges = outgoingMap[current.node.canvasId] ?? [];

            if (current.depth >= flowOutgoingDepthLimit) {
                if (currentOutgoingEdges.length > 0) {
                    hasMoreOutgoing = true;
                }
                continue;
            }

            currentOutgoingEdges.forEach((edge) => {
                if (current.path.has(edge.target)) {
                    const loopInstance = createLoopNode(edge.target, current.depth + 1);
                    renderedEdges.push({
                        key: `${current.node.id}->${loopInstance.node.id}:${edge.key}:loop`,
                        source: current.node.id,
                        target: loopInstance.node.id,
                        action: edge.action,
                        inputName: edge.inputName,
                    });
                    return;
                }

                const nextInstance = createNode(edge.target, current.depth + 1);
                renderedEdges.push({
                    key: `${current.node.id}->${nextInstance.node.id}:${edge.key}:${nextInstance.node.id}`,
                    source: current.node.id,
                    target: nextInstance.node.id,
                    action: edge.action,
                    inputName: edge.inputName,
                });
                queue.push({
                    node: nextInstance.node,
                    depth: current.depth + 1,
                    path: new Set([...current.path, edge.target]),
                });
            });
        }

        const minDepth = renderedNodes.reduce((min, node) => Math.min(min, node.depth), 0);
        const countersByDepth = {} as Record<number, number>;

        renderedNodes.forEach((node) => {
            const shiftedDepth = node.depth - minDepth;
            const rowIndex = countersByDepth[node.depth] ?? 0;
            countersByDepth[node.depth] = rowIndex + 1;
            node.x = FLOW_PADDING + shiftedDepth * (FLOW_CARD_WIDTH + FLOW_COLUMN_GAP);
            node.y = FLOW_PADDING + rowIndex * (FLOW_CARD_HEIGHT + FLOW_ROW_GAP);
        });

        return {
            nodes: renderedNodes,
            edges: renderedEdges,
            hasMoreOutgoing,
        };
    }, [flowMapDocuments, flowOutgoingDepthLimit, selectedUICanvasId, uiList]);

    const showFirstCanvasSetupCard = uiCanvasCatalog.length === 0;

    return (
        <motion.div
            {...motionProps}
            style={{
                padding: embedded ? "0" : "16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: embedded ? "transparent" : "#f3f5f8",
            }}
            >
                <div
                    style={{
                        flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    overflow: "hidden",
                    }}
                >
                <UIEditorHeading
                    selectedUICanvasId={selectedUICanvasId}
                    uiList={uiList}
                    onChangeUI={onChangeUI}
                    openUIUpdateModal={openUIUpdateModal}
                    openUICreateModal={openUICreateModal}
                    minimal={flowOnly}
                />

                {showFirstCanvasSetupCard ? (
                    <FirstCanvasSetupCard
                        title={flowOnly ? "Create your first UI canvas to build data flow" : "Create your first UI canvas"}
                        description={
                            flowOnly
                                ? "Data Flow becomes available after your first UI canvas is created. Start with one canvas and we will auto-select it in the dropdown."
                                : "UI Editor needs at least one UI canvas. Create your first one and we will auto-select it in the dropdown for you."
                        }
                        buttonLabel="Create First UI Canvas"
                        onCreate={openUICreateModal}
                        icon={flowOnly ? <NodeIndexOutlined /> : <AppstoreOutlined />}
                        minHeight={flowOnly ? 520 : 600}
                    />
                ) : (

                <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
                    {!flowOnly && (
                        <Card
                            style={{
                                ...floatingPanelStyle,
                                width: "fit-content",
                                minWidth: "fit-content",
                                flexShrink: 0,
                                alignSelf: "flex-start",
                                height: "fit-content",
                            }}
                            styles={{
                                body: {
                                    padding: 6,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    height: "fit-content",
                                    overflowY: "visible",
                                    background: "#ffffff",
                                    borderRadius: 10,
                                },
                            }}
                        >
                            <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 38px)",
                                justifyContent: "center",
                                gap: 4,
                            }}
                            >
                                {componentButtons}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                    width: "100%",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#262626",
                                    }}
                                >
                                    Default Cell No
                                </span>
                                <Select
                                    size="small"
                                    value={defaultCellNo}
                                    onChange={setDefaultCellNo}
                                    options={Array.from({ length: 12 }, (_, index) => {
                                        const value = String(index + 1);
                                        return { value, label: value };
                                    })}
                                    style={{ width: "100%", fontSize: 12 }}
                                />
                            </div>

                            <Button
                                type={isShowUIViewCSSColumn ? "primary" : "default"}
                                icon={<BgColorsOutlined />}
                                onClick={() => setIsShowUIViewCSSColumn((prev) => !prev)}
                                style={{
                                    width: "fit-content",
                                    minWidth: 0,
                                    alignSelf: "center",
                                    paddingInline: 10,
                                    height: 34,
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            >
                                CSS Panel
                            </Button>

                            {selectedComponent && (
                                <Space direction="vertical" size={6} style={{ width: "fit-content", alignSelf: "center" }}>
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => uiEditorDuplicateComponent(selectedComponent)}
                                        style={{
                                            width: "fit-content",
                                            minWidth: 108,
                                            paddingInline: 12,
                                            height: 34,
                                            borderRadius: 10,
                                            fontSize: 12,
                                        }}
                                    >
                                        Duplicate
                                    </Button>
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => uiEditorDeleteComponent([selectedComponent.id])}
                                        style={{
                                            width: "fit-content",
                                            minWidth: 108,
                                            paddingInline: 12,
                                            height: 34,
                                            borderRadius: 10,
                                            fontSize: 12,
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </Space>
                            )}
                        </Card>
                    )}

                    <Card
                        styles={{ body: { padding: 0, height: "100%" } }}
                        style={{ ...floatingPanelStyle, flex: "1 1 0", minWidth: 0, minHeight: 0, overflow: "hidden" }}
                    >
                        <div style={{ position: "relative", height: "100%" }}>
                            <div
                                ref={editorViewportRef}
                                tabIndex={0}
                                onWheelCapture={(event) => {
                                    if (!(event.ctrlKey || event.metaKey)) {
                                        return;
                                    }

                                    event.preventDefault();
                                    event.stopPropagation();
                                    setIsEditorViewportActive(true);
                                    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
                                }}
                                onMouseEnter={() => setIsEditorViewportActive(true)}
                                onMouseLeave={() => setIsEditorViewportActive(false)}
                                onFocus={() => setIsEditorViewportActive(true)}
                                onBlur={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                        setIsEditorViewportActive(false);
                                    }
                                }}
                                onMouseDown={() => {
                                    setIsEditorViewportActive(true);
                                }}
                                style={{
                                    width: "100%",
                                    minHeight: editorMinHeight,
                                    height: "100%",
                                    outline: "none",
                                }}
                            >
                                {viewMode === "prototype" ? (
                                    <div
                                        style={{
                                            width: "100%",
                                            backgroundColor: "#f7f8fb",
                                            border: "1px dashed rgba(148, 163, 184, 0.35)",
                                            borderRadius: 18,
                                            overflow: "auto",
                                            minHeight: editorMinHeight,
                                            height: "100%",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "flex-start",
                                                minWidth: "fit-content",
                                                minHeight: "100%",
                                                padding: "30px 0",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    transform: `scale(${zoomLevel})`,
                                                    transformOrigin: "top center",
                                                    transition: "transform 180ms ease",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "inline-block",
                                                        background: "#ffffff",
                                                        borderRadius: 10,
                                                        border: "1px solid rgba(15, 23, 42, 0.04)",
                                                        boxShadow: "0 28px 80px rgba(15, 23, 42, 0.18), 0 10px 28px rgba(15, 23, 42, 0.10)",
                                                        padding: 5,
                                                    }}
                                                >
                                                    {hasRenderableComponents ? (
                                                            <UIPrototype
                                                                preview={false}
                                                                selectedUICanvasId={selectedUICanvasId}
                                                                componentsJson={selectedUI?.input ?? {}}
                                                                containerSurfaceStyle={{
                                                                    background: "#ffffff",
                                                                    borderRadius: 10,
                                                                    border: "none",
                                                                    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                                                                }}
                                                                selectedComponent={selectedComponent}
                                                                setSelectedComponent={setSelectedComponent}
                                                                isShowUIViewCSSColumn={isShowUIViewCSSColumn}
                                                                onToggleCSSPanel={() => setIsShowUIViewCSSColumn((prev) => !prev)}
                                                                renderInternalCSSInspector={false}
                                                                onCssInspectorStateChange={setCssInspectorBindings}
                                                                onOpenComponentInformation={openComponentInformationFromPrototype}
                                                                getComponentContextMenuItems={getComponentContextMenuItems}
                                                                onComponentContextMenuAction={handleUIEditorComponentContextAction}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 900,
                                                                    minHeight: 520,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    padding: 32,
                                                                    background: "#ffffff",
                                                                    borderRadius: 10,
                                                                    border: "1px dashed #d0d7e2",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        maxWidth: 360,
                                                                        textAlign: "center",
                                                                        color: "#475569",
                                                                        lineHeight: 1.6,
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            width: 56,
                                                                            height: 56,
                                                                            margin: "0 auto 16px",
                                                                            borderRadius: 16,
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            background: "#eff6ff",
                                                                            color: "#1677ff",
                                                                            fontSize: 28,
                                                                        }}
                                                                    >
                                                                        <InboxOutlined />
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 20,
                                                                            fontWeight: 700,
                                                                            color: "#0f172a",
                                                                            marginBottom: 8,
                                                                        }}
                                                                    >
                                                                        This canvas is empty
                                                                    </div>
                                                                    <div style={{ fontSize: 15 }}>
                                                                        Add your first input from the component panel on the left.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <UIEditorFlowMap
                                        loading={flowMapLoading}
                                        nodes={flowMapData.nodes}
                                        edges={flowMapData.edges}
                                        selectedUICanvasId={selectedUICanvasId}
                                        zoomLevel={zoomLevel}
                                        onSelectCanvas={onChangeUI}
                                        onPreviewCanvas={setFlowPreviewCanvasId}
                                        hasMoreOutgoing={flowMapData.hasMoreOutgoing}
                                        onContinue={() => setFlowOutgoingDepthLimit((prev) => prev + 5)}
                                        onSetZoom={setZoomLevel}
                                        onOpenRelationWizard={handleOpenRelationWizard}
                                    />
                                )}
                            </div>

                            <div
                                style={{
                                    position: "absolute",
                                    left: 18,
                                    bottom: 18,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: 8,
                                    borderRadius: 14,
                                    background: "rgba(255, 255, 255, 0.92)",
                                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                                    backdropFilter: "blur(8px)",
                                }}
                            >
                                <Tooltip title="Zoom out">
                                    <Button
                                        icon={<ZoomOutOutlined />}
                                        onClick={() => changeZoom(-ZOOM_STEP)}
                                        disabled={zoomLevel <= MIN_ZOOM}
                                    />
                                </Tooltip>
                                <Button icon={<ExpandOutlined />} onClick={resetZoom}>
                                    {Math.round(zoomLevel * 100)}%
                                </Button>
                                <Tooltip title="Zoom in">
                                    <Button
                                        icon={<ZoomInOutlined />}
                                        onClick={() => changeZoom(ZOOM_STEP)}
                                        disabled={zoomLevel >= MAX_ZOOM}
                                    />
                                </Tooltip>
                            </div>
                        </div>
                    </Card>

                    {viewMode === "prototype" && !flowOnly && isShowUIViewCSSColumn && (
                        <Card
                            style={{ ...floatingPanelStyle, width: 360, minWidth: 360, maxWidth: 360, flex: "0 0 360px", height: "100%" }}
                            styles={{ body: { padding: 0, height: "100%", background: "#ffffff", borderRadius: 10, overflow: "hidden" } }}
                        >
                            <UIPrototypeCSSInspector
                                {...activeCssInspectorBindings}
                                variant="docked"
                                onClose={() => setIsShowUIViewCSSColumn(false)}
                            />
                        </Card>
                    )}
                </div>
                )}
            </div>

            <Modal
                title={flowRelationWizard.direction === "incoming" ? "Add Incoming Relation" : "Add Outgoing Relation"}
                open={flowRelationWizard.open}
                onCancel={handleCloseRelationWizard}
                onOk={handleSaveFlowRelation}
                okText="Save Relation"
                destroyOnClose
            >
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Current UI Canvas</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                            {flowRelationWizard.anchorNode?.label || "-"}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                            {flowRelationWizard.direction === "incoming" ? "Caller UI Canvas" : "Target UI Canvas"}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Select
                                style={{ width: "100%", flex: 1 }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={flowRelationWizard.direction === "incoming" ? "Select caller UI canvas" : "Select target UI canvas"}
                                value={flowRelationWizard.relatedCanvasId || undefined}
                                onChange={(value) => {
                                    setFlowRelationWizard((current) => ({
                                        ...current,
                                        relatedCanvasId: value,
                                        sourceInputId: "",
                                    }));
                                }}
                                options={wizardCanvasOptions}
                            />
                            <Tooltip title="Add UI Canvas">
                                <Button
                                    icon={<PlusCircleOutlined />}
                                    onClick={handleOpenCreateCanvasFromRelationWizard}
                                />
                            </Tooltip>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                            {flowRelationWizard.direction === "incoming" ? "Caller Input" : "Source Input"}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Select
                                style={{ width: "100%", flex: 1 }}
                                placeholder="Select input"
                                value={flowRelationWizard.sourceInputId || undefined}
                                onChange={(value) => {
                                    setFlowRelationWizard((current) => ({
                                        ...current,
                                        sourceInputId: value,
                                    }));
                                }}
                                options={wizardSourceInputOptions}
                                disabled={!sourceCanvasIdForWizard}
                            />
                            <Tooltip title="Add Input">
                                <Button
                                    icon={<PlusCircleOutlined />}
                                    onClick={() => setIsCreateFlowInputModalOpen(true)}
                                    disabled={!sourceCanvasIdForWizard}
                                />
                            </Tooltip>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Form Action Type</div>
                        <Select
                            style={{ width: "100%" }}
                            value={flowRelationWizard.action}
                            onChange={(value) => {
                                setFlowRelationWizard((current) => ({
                                    ...current,
                                    action: value,
                                }));
                            }}
                            options={FLOW_ACTION_OPTIONS.map((item) => ({
                                value: item.value,
                                label: item.label,
                            }))}
                        />
                    </div>

                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Condition</div>
                        <Input.TextArea
                            rows={3}
                            maxLength={1000}
                            showCount
                            placeholder="Optional condition for this relation..."
                            value={flowRelationWizard.condition}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setFlowRelationWizard((current) => ({
                                    ...current,
                                    condition: nextValue,
                                }));
                            }}
                        />
                    </div>
                </Space>
            </Modal>

            <UICanvasActionsComponentInformationUpdateDrawer
                open={isOpenUICanvasActionsComponentInformationUpdateDrawer}
                selectedUICanvasId={selectedUICanvasId}
                onClose={handleCloseComponentInformationDrawer}
                selectedInput={selectedComponentInformationInput ?? selectedInput}
                updateComponentInformation={updateComponentInformation}
            />
            <UICanvasActionsManualDescriptionCreateDrawer
                open={isOpenUICanvasActionsManualDescriptionDrawer}
                selectedInput={selectedManualDescriptionCreateInput}
                createManualDescription={createManualDescription}
                onClose={closeUICanvasActionsManualDescriptionCreateDrawer}
            />
            <UICanvasTemplateDescriptionCreateDrawer
                open={isOpenUICanvasActionsTemplateDescriptionDrawer}
                onClose={closeUICanvasActionsTemplateDescriptionDrawer}
                templateDescriptionCreate={templateDescriptionCreate}
                selectedInput={selectedInput}
            />
            <UICanvasActionsAPICallDrawer
                mode="create"
                open={isOpenUICanvasActionsAPIRelationDrawer}
                onClose={closeUICanvasActionsAPIRelationDrawer}
                createAPICallRelation={createAPICallRelation}
                selectedInput={selectedInput}
            />
            <UICanvasUpdateInputDrawer
                selectedInput={selectedInput}
                open={isOpenUICanvasUpdateInputModal}
                onClose={closeUICanvasUpdateInputModal}
                updateInput={updateInput}
            />
            <UICanvasCreateFormActionDrawer
                open={isOpenUICanvasCreateFormActionDrawer}
                onClose={closeUICanvasFormActionDrawer}
                createFormAction={createFormAction}
                uiList={uiList}
                selectedInput={selectedInput}
            />
            <UICanvasCreateInputDrawer
                open={isCreateFlowInputModalOpen}
                onClose={() => setIsCreateFlowInputModalOpen(false)}
                createInput={handleCreateFlowRelationInput}
            />
            <UICanvasCardCreateModal
                open={isOpenUICreateModal}
                onClose={handleCloseCreateCanvasModal}
                createUICanvas={handleCreateCanvas}
                zIndex={isCreatingCanvasFromRelationWizard ? 2300 : 1000}
            />
            <UICanvasCardUpdateModal
                open={isOpenUIUpdateModal}
                onClose={closeUIUpdateModal}
                updateUICanvas={updateUICanvasName}
                selectedUI={selectedUI}
                editingUICanvas={editingUICanvas}
                deleteUICanvas={deleteUICanvas}
            />
            <Modal
                open={Boolean(flowPreviewCanvasId)}
                title={uiList?.find((item) => item.id === flowPreviewCanvasId)?.label || "UI Canvas"}
                onCancel={() => setFlowPreviewCanvasId(null)}
                footer={null}
                width="95vw"
                destroyOnClose
                centered
                styles={{
                    content: {
                        padding: 0,
                        overflow: "hidden",
                    },
                    body: {
                        padding: 12,
                        background: "#f7f8fb",
                        height: "88vh",
                    },
                }}
            >
                {flowPreviewCanvasId && (
                    <div
                        style={{
                            height: "100%",
                            overflow: "hidden",
                            borderRadius: 12,
                        }}
                    >
                        <UIEditorCanvas
                            forcedCanvasId={flowPreviewCanvasId}
                            initialViewMode="prototype"
                            embedded={true}
                        />
                    </div>
                )}
            </Modal>
        </motion.div>
    );
};

export default UIEditorCanvas;
