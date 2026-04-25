import React from "react";
import { Button, Drawer, Select, Space, Tag } from "antd";
import {
    CaretDownOutlined,
    CaretRightOutlined,
    FolderOutlined,
    GithubOutlined,
} from "@ant-design/icons";

import { utilFlattenVisibleTree } from "../utils/utilTreeHelpers";

interface AddCrdComponentDrawerProps {
    open: boolean;
    allRepositories: any[];
    loadingRepos: boolean;
    addCrdSelectedRepoId: string | null;
    setAddCrdSelectedRepoId: (id: string) => void;
    selectedCrdComponent: any | null;
    setSelectedCrdComponent: (n: any) => void;
    addCrdComponentTreeData: any[];
    loadingAddCrdComponentTree: boolean;
    addCrdExpandedNodes: Set<string>;
    toggleAddCrdFolder: (nodeId: string) => void;
    checkedRow: React.Key[];
    onAdd: () => void;
    onClose: () => void;
}

export const AddCrdComponentDrawer: React.FC<AddCrdComponentDrawerProps> = ({
    open,
    allRepositories,
    loadingRepos,
    addCrdSelectedRepoId,
    setAddCrdSelectedRepoId,
    selectedCrdComponent,
    setSelectedCrdComponent,
    addCrdComponentTreeData,
    loadingAddCrdComponentTree,
    addCrdExpandedNodes,
    toggleAddCrdFolder,
    checkedRow,
    onAdd,
    onClose,
}) => {
    const isUpdateMode = !!(window as any).__updatingCrdComponent;
    const INITIAL_RENDER_COUNT = 200;
    const RENDER_BATCH_SIZE = 150;
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
    const visibleRows = React.useMemo(
        () => utilFlattenVisibleTree(addCrdComponentTreeData, addCrdExpandedNodes),
        [addCrdComponentTreeData, addCrdExpandedNodes]
    );
    const [visibleCount, setVisibleCount] = React.useState(INITIAL_RENDER_COUNT);

    React.useEffect(() => {
        setVisibleCount(INITIAL_RENDER_COUNT);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [INITIAL_RENDER_COUNT, open, addCrdSelectedRepoId, visibleRows.length]);

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
        const isSelected = selectedCrdComponent?.id === n.id;
        const isExpanded = addCrdExpandedNodes.has(n.id);
        const hasChildren = n.children && n.children.length > 0;
        const isFolder = n.type === "folder";

        return (
            <div
                key={n.id}
                className={`${level > 0 ? "ml-6 border-l-2 border-gray-200 pl-2" : ""}`}
            >
                <div
                    className={`p-2 hover:bg-gray-50 rounded flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                            ? "bg-blue-50 border-2 border-blue-400 shadow-md"
                            : "border border-transparent"
                    }`}
                    onClick={() => setSelectedCrdComponent(n)}
                >
                    {isFolder && hasChildren && (
                        <span
                            className="cursor-pointer text-gray-500 hover:text-gray-700 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleAddCrdFolder(n.id);
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
                            }`}
                        >
                            {n.name}
                            {isSelected && (
                                <Tag color="blue" className="ml-2">
                                    Selected
                                </Tag>
                            )}
                        </div>
                        {n.pathName && (
                            <div className="text-xs text-gray-600 mt-1">{n.pathName}</div>
                        )}
                        {n.canvasType && (
                            <div className="text-xs mt-1">
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                                        n.canvasType === "ui"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-green-100 text-green-700"
                                    }`}
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
            title="Select CRD Component"
            width="80%"
            open={open}
            onClose={onClose}
            mask={false}
            keyboard
            footer={
                <Space>
                    <Button
                        type="primary"
                        onClick={onAdd}
                        disabled={
                            !selectedCrdComponent || (!isUpdateMode && checkedRow.length === 0)
                        }
                        style={{
                            opacity:
                                !selectedCrdComponent || (!isUpdateMode && checkedRow.length === 0)
                                    ? 0.5
                                    : 1,
                        }}
                    >
                        {isUpdateMode
                            ? "Update Component"
                            : `Add to Selected Issues (${checkedRow.length})`}
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                </Space>
            }
        >
            <div className="p-4">
                {checkedRow.length === 0 && !isUpdateMode && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">
                            <strong>Note:</strong> Please select issue(s) from the table below before
                            adding a component.
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <Select
                        placeholder="Select Repository"
                        value={addCrdSelectedRepoId}
                        onChange={(value) => {
                            setAddCrdSelectedRepoId(value);
                        }}
                        options={allRepositories.map((repo) => ({
                            label: (
                                <div className="flex items-center gap-2">
                                    <GithubOutlined />
                                    <span>{repo.name}</span>
                                    <Tag color={repo.private ? "orange" : "blue"}>
                                        {repo.private ? "Private" : "Public"}
                                    </Tag>
                                </div>
                            ),
                            value: String(repo.id),
                        }))}
                        className="w-full"
                        loading={loadingRepos}
                        showSearch
                        filterOption={(input, option) => {
                            const repo = allRepositories.find(
                                (r) => String(r.id) === option?.value
                            );
                            return (
                                repo?.name?.toLowerCase().includes(input.toLowerCase()) || false
                            );
                        }}
                    />
                </div>

                {selectedCrdComponent && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-semibold text-blue-700 mb-2">Selected Component:</div>
                        <div className="text-sm">
                            {selectedCrdComponent.pathName && (
                                <div>
                                    <strong>Path:</strong> {selectedCrdComponent.pathName}
                                </div>
                            )}
                            {selectedCrdComponent.canvasType && (
                                <div>
                                    <strong>Canvas:</strong>{" "}
                                    {selectedCrdComponent.canvasType.toUpperCase()} -{" "}
                                    {selectedCrdComponent.canvasName || selectedCrdComponent.canvasId}
                                </div>
                            )}
                            {!selectedCrdComponent.pathName && !selectedCrdComponent.canvasType && (
                                <div className="text-gray-500">No additional information available</div>
                            )}
                        </div>
                    </div>
                )}

                {loadingAddCrdComponentTree ? (
                    <div className="text-center text-gray-500 py-8">Loading CRD tree...</div>
                ) : !addCrdSelectedRepoId ? (
                    <div className="text-center text-gray-500 py-8">
                        Please select a repository to view CRD tree
                    </div>
                ) : addCrdComponentTreeData.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No CRD tree data found for this repository
                    </div>
                ) : (
                    <div
                        ref={scrollContainerRef}
                        className="bg-white rounded-lg border border-gray-200 p-4 max-h-[70vh] overflow-auto"
                        onScroll={handleScroll}
                    >
                        {visibleRows.slice(0, visibleCount).map(({ node, level }) => renderNode(node, level))}
                        {visibleCount < visibleRows.length && (
                            <div className="py-3 text-center text-xs text-gray-500">
                                Scroll down to load more items ({visibleCount}/{visibleRows.length})
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Drawer>
    );
};
