import React from "react";
import { Avatar } from "antd";
import UserProfileTooltip from "../../components/componentElemets/uicBacklogCanvasUserProfileTooltip";

interface ColumnCreatedByParams {
    users: any[];
}

export const columnCreatedBy = ({ users }: ColumnCreatedByParams) => ({
    title: <span className="whitespace-nowrap">Created By</span>,
    dataIndex: "createdBy",
    width: 64,
    align: "left" as const,
    render: (_: any, r: any) => {
        const createdByRaw = String(r.createdBy || "").toLowerCase().trim();
        const user: any = users?.find(
            (u: any) =>
                u?.uid?.toLowerCase().trim() === createdByRaw ||
                u?.displayName?.toLowerCase().trim() === createdByRaw ||
                u?.email?.toLowerCase().trim() === createdByRaw
        );

        if (!user) {
            return <div className="w-full flex justify-start"><span className="text-gray-300">-</span></div>;
        }

        return (
            <UserProfileTooltip user={user} navigateOnClick={false}>
                <div className="w-full flex justify-start">
                    <Avatar className="backlog-user-avatar" size={30} src={user?.photoURL}>
                        {!user?.photoURL ? (user?.displayName || user?.email || "U").slice(0, 1).toUpperCase() : null}
                    </Avatar>
                </div>
            </UserProfileTooltip>
        );
    },
});
