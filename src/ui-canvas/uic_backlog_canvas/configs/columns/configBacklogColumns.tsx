import React from "react";
import { columnStatus } from "./columnStatus";
import { columnDescription } from "./columnDescription";
import { columnAssignee } from "./columnAssignee";
import { columnCommitCode } from "./columnCommitCode";
import { columnAttachedFiles } from "./columnAttachedFiles";
import { columnCreatedBy } from "./columnCreatedBy";
import { columnUiCanvas } from "./columnUiCanvas";
import { columnType } from "./columnType";
import { columnCreatedDate, columnClosedDate } from "./columnDates";
import { columnEh, columnSh } from "./columnEhSh";

interface ConfigBacklogColumnsParams {
    toggle: boolean;
    hover: string;
    checkedRow: React.Key[];
    commentFlags: { [key: string]: boolean };
    users: any[];
    filteredTask: any[];
    currentProject: any;
    currentUser: any;
    tasks: any[];
    allTasks: any[];
    canvas: any;
    apiNames: { [key: string]: string };
    getValueSync: (arg: any) => any;
    checkColor: (arg: string) => string;
    onDescriptionClick: (r: any) => void;
    onDescriptionCommentClick: (r: any) => void;
    onEditClick: (r: any) => void;
    onCommentClick: (r: any) => void;
    onApiCanvasClick: (apiId: string, apiName: string) => void;
    onUiCanvasClick: (canvasId: string, canvasName: string) => void;
    onParentClick: (r: any, no: number) => void;
    onStatusChange: (recordId: string, newStatus: string, oldStatus: string) => void;
    onShEhChange: (id: string, sh: number, eh: number) => void;
    onCodeLineClick: (r: any) => void;
}

export const BACKLOG_COLUMN_META = [
    { title: "#", key: "index" },
    { title: "Status", key: "status" },
    { title: "Description", key: "description" },
    { title: "Assignee", key: "assignee" },
    { title: "Created By", key: "createdBy" },
    { title: "Attached Files", key: "files" },
    { title: "Commit SHA / Code Line", key: "commitCode" },
    { title: "UI Canvas", key: "uiCanvas" },
    { title: "Type", key: "type" },
    { title: "Created Date", key: "createdAt" },
    { title: "Closed Date", key: "closedDate" },
    { title: "EH", key: "eh" },
    { title: "SH", key: "sh" },
] as const;

export const DEFAULT_BACKLOG_COLUMN_KEYS = BACKLOG_COLUMN_META.map((column) => column.key);

export const configBacklogColumns = (p: ConfigBacklogColumnsParams) => [
    {
        title: "#",
        key: "index",
        width: "fit-content",
        onCell: () => ({ style: { whiteSpace: "nowrap" } }),
        onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        render: (_: any, __: any, i: number) => i + 1,
    },
    columnStatus({ checkColor: p.checkColor, onStatusChange: p.onStatusChange }),
    columnDescription({
        onDescriptionClick: p.onDescriptionClick,
        onDescriptionCommentClick: p.onDescriptionCommentClick,
        onParentClick: p.onParentClick,
        tasks: p.tasks,
        allTasks: p.allTasks,
    }),
    columnAssignee({ users: p.users }),
    columnCreatedBy({ users: p.users }),
    columnAttachedFiles(),
    columnCommitCode({ onCodeLineClick: p.onCodeLineClick }),
    columnUiCanvas({ onUiCanvasClick: p.onUiCanvasClick }),
    columnType(),
    columnCreatedDate(),
    columnClosedDate(),
    columnEh({ toggle: p.toggle, filteredTask: p.filteredTask, onShEhChange: p.onShEhChange }),
    columnSh({ toggle: p.toggle, filteredTask: p.filteredTask, onShEhChange: p.onShEhChange }),
];
