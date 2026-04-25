import React from "react";

const backlogDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

const formatBacklogDate = (value: unknown) => {
    if (!value) {
        return "-";
    }

    const asString = String(value).trim();
    if (!asString) {
        return "-";
    }

    const normalizedValue = asString.includes("T") ? asString : asString.replace(" ", "T");
    const parsedDate = new Date(normalizedValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return asString;
    }

    return backlogDateFormatter.format(parsedDate);
};

export const columnCreatedDate = () => ({
    title: "Created Date",
    dataIndex: "createdAt",
    render: (_: any, record: any) => formatBacklogDate(record?.createdAt),
});

export const columnClosedDate = () => ({
    title: "Closed Date",
    dataIndex: "closedDate",
    render: (_: any, record: any) => formatBacklogDate(record?.closedDate),
});
