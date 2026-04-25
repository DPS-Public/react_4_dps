import React from 'react';
import { Card, Avatar, Tag, Tooltip } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined, AppstoreOutlined, HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UserProfileTooltip from './uicBacklogCanvasUserProfileTooltip';

interface KanbanCardProps {
    issue: any;
    users: any[];
    onClick: () => void;
    onDescriptionClick?: () => void;
    onUICanvasClick?: (canvasId: string) => void;
    onApiClick?: (apiId: string, apiName: string) => void;
    onSourceCodeClick?: (nodeInfo: any) => void;
    onCrdTreeClick?: (nodeInfo: any, issue: any) => void;
    onCodeLineClick?: (issue: any) => void;
    getValueSync: (issue: any) => any;
    apiNames: { [key: string]: string };
    canvas: any;
}

const priorityIcon = (priority: string) => {
    if (priority === 'Urgent') {
        return (
            <Tooltip title="Urgent">
                <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 13 }} />
            </Tooltip>
        );
    }
    if (priority === 'High') {
        return (
            <Tooltip title="High Priority">
                <WarningOutlined style={{ color: '#d97706', fontSize: 13 }} />
            </Tooltip>
        );
    }
    if (priority === 'Medium') {
        return (
            <Tooltip title="Medium Priority">
                <span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>M</span>
            </Tooltip>
        );
    }
    if (priority === 'Low') {
        return (
            <Tooltip title="Low Priority">
                <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>L</span>
            </Tooltip>
        );
    }
    return null;
};

const KanbanCard: React.FC<KanbanCardProps> = ({
    issue,
    users,
    onClick,
    onDescriptionClick,
    onUICanvasClick,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: issue.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const assigneeUser = users?.find(
        (u: any) => u.uid?.toLowerCase().trim() === issue.assignee?.toLowerCase().trim()
    );
    const createdByUser = users?.find(
        (u: any) => u.displayName?.toLowerCase().trim() === issue.createdBy?.toLowerCase().trim()
    );

    const descText = (issue?.description?.split('--- UI Canvas Input Description ---')[0] || '').trim();

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card
                size="small"
                className="mb-2 hover:shadow-md transition-shadow relative cursor-pointer"
                bodyStyle={{ padding: '10px 12px' }}
                onClick={onClick}
            >
                {/* Drag Handle */}
                <div
                    {...listeners}
                    className="absolute top-2 right-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <HolderOutlined />
                </div>

                <div className="space-y-2 pr-5">
                    {/* Issue No + Priority */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">#{issue.no}</span>
                        {priorityIcon(issue.priority)}
                        {issue.priority && !['Urgent', 'High', 'Medium', 'Low'].includes(issue.priority) && (
                            <Tag className="text-[10px] m-0">{issue.priority}</Tag>
                        )}
                    </div>

                    {/* Description */}
                    <div
                        className="text-sm font-medium text-gray-800 line-clamp-2 cursor-pointer hover:text-blue-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDescriptionClick) onDescriptionClick();
                            else onClick();
                        }}
                    >
                        {descText || 'No description'}
                    </div>

                    {/* UI Canvas name */}
                    {issue.uiCanvas && (
                        <div
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onUICanvasClick && issue.uiCanvasId) onUICanvasClick(issue.uiCanvasId);
                            }}
                        >
                            <AppstoreOutlined className="text-[11px]" />
                            <span className="truncate">{issue.uiCanvas}</span>
                        </div>
                    )}

                    {/* Created date */}
                    {issue.createdAt && (
                        <div className="text-[11px] text-gray-400">
                            {formatDate(issue.createdAt)}
                        </div>
                    )}

                    {/* Assignee + Created By avatars */}
                    {(assigneeUser || createdByUser) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                            {assigneeUser && (
                                <UserProfileTooltip user={assigneeUser} navigateOnClick={false}>
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <Avatar size={24} src={assigneeUser.photoURL}>
                                            {!assigneeUser.photoURL
                                                ? (assigneeUser.displayName || assigneeUser.email || 'U').slice(0, 1).toUpperCase()
                                                : null}
                                        </Avatar>
                                    </span>
                                </UserProfileTooltip>
                            )}
                            {createdByUser && (
                                <UserProfileTooltip user={createdByUser} navigateOnClick={false}>
                                    <span
                                        className="relative"
                                        onClick={(e) => e.stopPropagation()}
                                        title=""
                                    >
                                        <Avatar size={24} src={createdByUser.photoURL} style={{ opacity: 0.7 }}>
                                            {!createdByUser.photoURL
                                                ? (createdByUser.displayName || createdByUser.email || 'U').slice(0, 1).toUpperCase()
                                                : null}
                                        </Avatar>
                                    </span>
                                </UserProfileTooltip>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default KanbanCard;
