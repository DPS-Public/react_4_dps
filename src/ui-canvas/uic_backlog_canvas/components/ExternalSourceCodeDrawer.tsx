import React from "react";
import { Avatar, Drawer, Spin, Tabs } from "antd";


interface ExternalSourceCodeDrawerProps {
    open: boolean;
    node: any | null;
    sourceCode: string | null;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    commits: any[];
    loadingCommits: boolean;
    selectedCommit: any | null;
    setSelectedCommit: (c: any) => void;
    onClose: () => void;
}

export const ExternalSourceCodeDrawer: React.FC<ExternalSourceCodeDrawerProps> = ({
    open,
    node,
    sourceCode,
    activeTab,
    setActiveTab,
    commits,
    loadingCommits,
    selectedCommit,
    setSelectedCommit,
    onClose,
}) => {
    return (
        <Drawer title="External Source Code" width="80%" open={open} onClose={onClose}>
            {node && (
                <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">
                        <strong>External Repo:</strong> {node.externalRepoFullName}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                        <strong>Path:</strong> {node.externalPath}
                    </div>
                </div>
            )}

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: "source",
                        label: "Source Code",
                        children: sourceCode ? (
                            <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-[70vh]">
                                <code>{sourceCode}</code>
                            </pre>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No source code available
                            </div>
                        ),
                    },
                    {
                        key: "commits",
                        label: "Commit History",
                        children: (
                            <div className="max-h-[70vh] overflow-auto">
                                {loadingCommits ? (
                                    <div className="text-center py-8">
                                        <Spin size="large" />
                                    </div>
                                ) : commits.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No commit history available
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {commits.map((commit) => (
                                            <div
                                                key={commit.sha}
                                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                                    selectedCommit?.sha === commit.sha
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                                onClick={() =>
                                                    setSelectedCommit(
                                                        selectedCommit?.sha === commit.sha
                                                            ? null
                                                            : commit
                                                    )
                                                }
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {commit.author?.avatar_url && (
                                                                <Avatar
                                                                    size="small"
                                                                    src={commit.author.avatar_url}
                                                                />
                                                            )}
                                                            <span className="font-semibold text-sm">
                                                                {commit.author?.name ||
                                                                    commit.author?.login ||
                                                                    "Unknown"}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(
                                                                    commit.author?.date ||
                                                                        commit.committer?.date
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 mb-2">
                                                            {commit.message}
                                                        </div>
                                                        {commit.stats && (
                                                            <div className="flex items-center gap-4 text-xs">
                                                                <span className="text-green-600">
                                                                    +{commit.stats.additions} additions
                                                                </span>
                                                                <span className="text-red-600">
                                                                    -{commit.stats.deletions} deletions
                                                                </span>
                                                                <span className="text-gray-500">
                                                                    {commit.stats.changes} changes
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            SHA: {commit.sha.substring(0, 7)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {selectedCommit?.sha === commit.sha &&
                                                    commit.patch && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                            <div className="text-xs font-semibold mb-2">
                                                                Changes:
                                                            </div>
                                                            <div className="bg-gray-900 rounded text-xs overflow-auto max-h-96">
                                                                {commit.patch
                                                                    .split("\n")
                                                                    .map((line: string, lineIndex: number) => {
                                                                        const isAdded =
                                                                            line.startsWith("+") &&
                                                                            !line.startsWith("+++");
                                                                        const isRemoved =
                                                                            line.startsWith("-") &&
                                                                            !line.startsWith("---");
                                                                        const isContext =
                                                                            line.startsWith(" ") ||
                                                                            line.startsWith("@@");

                                                                        return (
                                                                            <div
                                                                                key={lineIndex}
                                                                                className={`px-3 py-0.5 font-mono ${
                                                                                    isAdded
                                                                                        ? "bg-green-900/30 text-green-300"
                                                                                        : isRemoved
                                                                                        ? "bg-red-900/30 text-red-300"
                                                                                        : isContext
                                                                                        ? "text-gray-400"
                                                                                        : "text-gray-500"
                                                                                }`}
                                                                            >
                                                                                {line || "\u00A0"}
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        </div>
                                                    )}

                                                {selectedCommit?.sha === commit.sha &&
                                                    !commit.patch && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                                                            No diff available for this commit
                                                        </div>
                                                    )} 
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
        </Drawer>
    );
};
