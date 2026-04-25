import React from "react";

interface ColumnCommitCodeParams {
    onCodeLineClick: (r: any) => void;
}

export const columnCommitCode = ({ onCodeLineClick }: ColumnCommitCodeParams) => ({
    title: <span className="whitespace-nowrap">Commit SHA / Code Line</span>,
    dataIndex: "commitCode",
    width: "fit-content",
    align: "left" as const,
    onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
    render: (_: any, r: any) => {
        const commitValue = r?.commitId;
        const codeLineValue = Number(r?.codeLine);

        const hasCommit = commitValue !== undefined && commitValue !== null && String(commitValue) !== "";
        const hasCodeLine = Number.isFinite(codeLineValue) && codeLineValue > 0;

        if (!hasCommit && !hasCodeLine) {
            return <div className="flex justify-start"><span className="text-gray-400">-</span></div>;
        }

        return (
            <div
                className="flex justify-start items-center gap-1 cursor-pointer"
                onClick={() => onCodeLineClick(r)}
            >
                {hasCommit && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-[8px] text-xs font-medium font-mono">
                        {String(commitValue).substring(0, 6)}
                        {String(commitValue).length > 6 ? "..." : ""}
                    </span>
                )}
                {hasCodeLine && (
                    <span className="text-green-600 text-xs font-medium hover:underline">
                        +{codeLineValue}
                    </span>
                )}
            </div>
        );
    },
});
