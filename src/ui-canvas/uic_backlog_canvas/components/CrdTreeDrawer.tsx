import React from "react";
import { Drawer, Input } from "antd";
import {
    CaretDownOutlined,
    CaretRightOutlined,
    FolderOutlined,
    GithubOutlined,
    LinkOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import { utilFlattenVisibleTree } from "../utils/utilTreeHelpers";

interface CrdTreeDrawerProps {
    open: boolean;
    crdTreeData: any[];
    filteredCrdTreeData: any[];
    loadingCrdTree: boolean;
    crdDrawerNodeId: string | null;
    expandedNodes: Set<string>;
    crdTreeSearchTerm: string;
    setCrdTreeSearchTerm: (v: string) => void;
    toggleFolder: (nodeId: string) => void;
    onClose: () => void;
    onExternalPathClick: (n: any) => void;
    onPathClick: (n: any) => void;
    onCanvasClick: (canvasType: string, canvasId: string) => void;
    crdDrawerRepoId: string | null;
    currentRepo: string | null;
    openViewDrawer: (node: any) => void;
}

export const CrdTreeDrawer: React.FC<CrdTreeDrawerProps> = ({
    open,
    filteredCrdTreeData,
    loadingCrdTree,
    crdDrawerNodeId,
    expandedNodes,
    crdTreeSearchTerm,
    setCrdTreeSearchTerm,
    toggleFolder,
    onClose,
    onExternalPathClick,
    onPathClick,
    onCanvasClick,
}) => {
    const INITIAL_RENDER_COUNT = 200;
    const RENDER_BATCH_SIZE = 150;
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
    const isSearching = crdTreeSearchTerm.trim().length > 0;
    const visibleRows = React.useMemo(
        () => utilFlattenVisibleTree(filteredCrdTreeData, expandedNodes, isSearching),
        [expandedNodes, filteredCrdTreeData, isSearching]
    );
    const [visibleCount, setVisibleCount] = React.useState(INITIAL_RENDER_COUNT);

    React.useEffect(() => {
        setVisibleCount(INITIAL_RENDER_COUNT);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [INITIAL_RENDER_COUNT, open, visibleRows.length, crdTreeSearchTerm]);

    const loadMoreRows = React.useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + RENDER_BATCH_SIZE, visibleRows.length));
    }, [visibleRows.length]);

    const handleScroll = React.useCallback(
        (event: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
            if (scrollTop + clientHeight >= scrollHeight - 160) {
                loadMoreRows();
            }
        },
        [loadMoreRows]
    );

    const renderNode = (n: any, level: number = 0): React.ReactNode => {
        const isSelected = n.id === crdDrawerNodeId;
        const isExpanded = isSearching || expandedNodes.has(n.id);
        const hasChildren = n.children && n.children.length > 0;
        const isFolder = n.type === "folder";

        const searchLower = crdTreeSearchTerm.toLowerCase();
        const nameMatches = n.name?.toLowerCase().includes(searchLower);
        const pathMatches =
            n.pathName?.toLowerCase().includes(searchLower) ||
            n.githubPath?.toLowerCase().includes(searchLower);
        const externalPathMatches = n.externalPath?.toLowerCase().includes(searchLower);
        const isHighlighted = crdTreeSearchTerm && (nameMatches || pathMatches || externalPathMatches);

        return (
            <div
                key={n.id}
                className={`${level > 0 ? "ml-6 border-l-2 border-gray-200 pl-2" : ""}`}
            >
                <div
                    className={`p-2 hover:bg-gray-50 rounded flex items-center gap-2 ${
                        isSelected ? "bg-blue-50 border-2 border-blue-400" : ""
                    } ${isHighlighted ? "bg-yellow-50" : ""}`}
                >
                    {isFolder && hasChildren && (
                        <span
                            className="cursor-pointer text-gray-500 hover:text-gray-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFolder(n.id);
                            }}
                        >
                            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                        </span>
                    )}
                    {(!isFolder || !hasChildren) && <span className="w-4" />}
                    {isFolder && <FolderOutlined className="text-yellow-500" />}

                    <div className="flex-1">
                        <div
                            className={`font-medium flex items-center gap-2 ${
                                isSelected ? "text-blue-700 font-bold" : ""
                            } ${isHighlighted ? "text-yellow-700" : ""}`}
                        >
                            {n.name}
                            {isSelected && (
                                <span className="text-xs text-blue-600">(Selected)</span>
                            )}
                        </div>

                        {n.pathName && (
                            <div
                                className="text-xs text-gray-600 mt-1 cursor-pointer hover:text-blue-600 hover:underline flex items-center gap-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (n.githubPath) onPathClick(n);
                                }}
                            >
                                <GithubOutlined className="text-blue-500" />
                                {n.pathName}
                            </div>
                        )}

                        {n.externalPath && (
                            <div
                                className="text-xs text-red-500 mt-1 cursor-pointer hover:text-red-600 hover:underline flex items-center gap-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExternalPathClick(n);
                                }}
                            >
                                <LinkOutlined className="text-red-600" />
                                {n.externalPath.length > 50
                                    ? `${n.externalPath.substring(0, 50)}...`
                                    : n.externalPath}
                            </div>
                        )}

                        {n.canvasType && (
                            <div className="text-xs mt-1">
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                        n.canvasType === "ui"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-green-100 text-green-700"
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (n.canvasId) onCanvasClick(n.canvasType, n.canvasId);
                                    }}
                                >
                                    {n.canvasType.toUpperCase()} Canvas: {n.canvasName || ""}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Drawer
            title="CRD Tree"
            width="80%"
            open={open}
            onClose={onClose}
            mask={false}
            keyboard
        >
            <div className="p-4">
                {loadingCrdTree ? (
                    <div className="text-center text-gray-500 py-8">Loading CRD tree...</div>
                ) : filteredCrdTreeData.length === 0 && !crdTreeSearchTerm ? (
                    <div className="text-center text-gray-500 py-8">No CRD tree data found</div>
                ) : (
                    <>
                        <div className="mb-4">
                            <Input
                                placeholder="Search in CRD tree..."
                                prefix={<SearchOutlined />}
                                value={crdTreeSearchTerm}
                                onChange={(e) => setCrdTreeSearchTerm(e.target.value)}
                                allowClear
                                className="w-full"
                            />
                        </div>
                        <div
                            ref={scrollContainerRef}
                            className="bg-white rounded-lg border border-gray-200 p-4 max-h-[70vh] overflow-auto"
                            onScroll={handleScroll}
                        >
                            {visibleRows.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    No results found
                                </div>
                            ) : (
                                <>
                                    {visibleRows
                                        .slice(0, visibleCount)
                                        .map(({ node, level }) => renderNode(node, level))}
                                    {visibleCount < visibleRows.length && (
                                        <div className="py-3 text-center text-xs text-gray-500">
                                            Scroll down to load more items ({visibleCount}/{visibleRows.length})
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    );
};
