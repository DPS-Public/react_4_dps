import React from "react";
import { FileCells } from "../../components/componentElemets/FileCells";

export const columnAttachedFiles = () => ({
    title: "Attached Files",
    dataIndex: "files",
    width: 200,
    onCell: () => ({ className: "attached-files-cell", style: { maxWidth: 200, width: 200, verticalAlign: "middle" } }),
    onHeaderCell: () => ({ style: { maxWidth: 200, width: 200, whiteSpace: "nowrap" } }),
    render: (_: any, r: any) => (
        <div className="attached-files-cell-inner">
            <FileCells files={r.imageUrl} />
        </div>
    ),
});
