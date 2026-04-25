import { CommentOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Space, Tooltip } from "antd";
import React from "react";
import { utilRenderDescriptionWithTags } from "../../utils/utilFilterTasks";

interface ColumnDescriptionParams {
    onDescriptionClick: (r: any) => void;
    onDescriptionCommentClick: (r: any) => void;
    onParentClick: (r: any, no: number) => void;
    tasks: any[];
    allTasks: any[];
}

const stripBracketMarkersForView = (value: string) => value.replace(/\[([^\]]+)\]/g, "$1");

const renderTagParts = (formDescription: string) => {
    const parts = utilRenderDescriptionWithTags(formDescription);
    if (!Array.isArray(parts)) return formDescription;
    return parts.map((p: any) =>
        typeof p === "string" ? (
            p
        ) : (
            <span
                key={p.key}
                style={{
                    color: "#111111",
                    margin: "0 2px",
                    fontWeight: 700,
                }}
            >
                {String(p.text || "").replace(/^\[/, "").replace(/\]$/, "")}
            </span>
        )
    );
};

const priorityTagNode = (priority: string) => {
    if (priority === "Urgent") {
        return (
            <Tooltip title="Urgent">
                <ExclamationCircleOutlined style={{ color: "#ef4444", fontSize: 13 }} />
            </Tooltip>
        );
    }
    if (priority === "High") {
        return (
            <Tooltip title="High Priority">
                <WarningOutlined style={{ color: "#d97706", fontSize: 13 }} />
            </Tooltip>
        );
    }
    return null;
};

export const columnDescription = ({ onDescriptionClick, onDescriptionCommentClick, onParentClick, tasks, allTasks }: ColumnDescriptionParams) => ({
    title: "Description",
    dataIndex: "description",
    onCell: () => ({ style: { maxWidth: 400 } }),
    render: (_: any, r: any) => {
        const descTextRaw = r?.description?.split("--- UI Canvas Input Description ---")[0] || "";
        let formDescription = r?.description || "";
        if (r?.description?.includes("--- UI Canvas Input Description ---")) {
            formDescription = r.description.split("--- UI Canvas Input Description ---")[0]?.trim() || "";
        }
        const descText = stripBracketMarkersForView(descTextRaw);
        const formDescriptionForView = stripBracketMarkersForView(formDescription);

        const priorityTag = priorityTagNode(r.priority);
        const rendered = renderTagParts(formDescriptionForView);
        const parentIssue = r?.parentNo
            ? (tasks || allTasks || []).find((task: any) => task?.no === r.parentNo)
            : null;
        const parentDescription =
            parentIssue?.description?.split("--- UI Canvas Input Description ---")[0]?.trim() ||
            "";
        const commentsCount = Array.isArray(r?.comment)
            ? r.comment.length
            : (typeof r?.comment === "string" && r.comment.trim() !== "" ? 1 : 0);

        return (
            <Space style={{ maxWidth: 400 }} className="break-words">
                {formDescription && (
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", maxWidth: 400, gap: 6 }}>
                        {priorityTag && <span>{priorityTag}</span>}
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>#{r?.no}</span>
                        <Tooltip title={descText}>
                            <span
                                style={{ display: "inline-block", maxWidth: "450px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                                className="hover:underline hover:text-blue-500 transition-all"
                                onClick={() => onDescriptionClick(r)}
                            >
                                {rendered}
                            </span>
                        </Tooltip>
                        {commentsCount > 0 && (
                            <Tooltip title="Open comments">
                                <span
                                    className="ml-2 text-[12px] text-gray-700 hover:text-blue-600 cursor-pointer inline-flex items-center gap-1"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onDescriptionCommentClick(r);
                                    }}
                                >
                                    <CommentOutlined />
                                    <span>{commentsCount}</span>
                                </span>
                            </Tooltip>
                        )}
                        {!!r?.parentNo && (
                            <Tooltip title={parentDescription || ""}>
                                <span
                                    className="ml-2 text-[12px] text-blue-600 hover:underline cursor-pointer"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onParentClick(r, r.parentNo);
                                    }}
                                >
                                    (Parent No: {r.parentNo})
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )}
            </Space>
        );
    },
});
