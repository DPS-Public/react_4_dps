import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCorners } from '@dnd-kit/core';
import { message } from 'antd';
import {
    CloseCircleOutlined,
    PlayCircleOutlined,
    ClockCircleOutlined,
    LockOutlined,
    EditOutlined,
    RocketOutlined,
    BugOutlined
} from '@ant-design/icons';
import KanbanColumn from './KanbanColumn';
import services from '../../services/backlogService';
import KanbanCard from './KanbanCard';
import { useAppSelector } from '@/store';

interface KanbanBoardProps {
    issues: any[];
    users: any[];
    currentProject: any;
    onIssueClick: (issue: any) => void;
    onDescriptionClick?: (issue: any) => void;
    onUICanvasClick?: (canvasId: string) => void;
    onApiClick?: (apiId: string, apiName: string) => void;
    onSourceCodeClick?: (nodeInfo: any, issue: any) => void;
    onCrdTreeClick?: (nodeInfo: any, issue: any) => void;
    onCodeLineClick?: (issue: any) => void;
    onCreateIssue: () => void;
    getValueSync: (issue: any) => any;
    apiNames: { [key: string]: string };
    canvas: any;
    onIssuesUpdate: (issues: any[]) => void;
}

const STATUS_CONFIG = [
    { id: 'new', title: 'New', icon: <RocketOutlined />, color: '#FFA500' },
    { id: 'ongoing', title: 'Ongoing', icon: <PlayCircleOutlined />, color: '#008000' },
    { id: 'closed', title: 'Closed', icon: <LockOutlined />, color: '#3b82f6' },
    { id: 'waiting', title: 'Waiting', icon: <ClockCircleOutlined />, color: '#9ACD32' },
    { id: 'draft', title: 'Draft', icon: <EditOutlined />, color: '#C8C8C8' },
    { id: 'canceled', title: 'Canceled', icon: <CloseCircleOutlined />, color: '#ef4444' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
    issues,
    users,
    currentProject,
    onIssueClick,
    onDescriptionClick,
    onUICanvasClick,
    onApiClick,
    onSourceCodeClick,
    onCrdTreeClick,
    onCodeLineClick,
    onCreateIssue,
    getValueSync,
    apiNames,
    canvas,
    onIssuesUpdate
}) => {
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Group issues by status
    const issuesByStatus = useMemo(() => {
        const grouped: { [key: string]: any[] } = {
            canceled: [],
            ongoing: [],
            waiting: [],
            closed: [],
            draft: [],
            new: [],
        };

        issues.forEach(issue => {
            const status = issue.status?.toLowerCase() || 'new';
            if (grouped[status] !== undefined) {
                grouped[status].push(issue);
            } else {
                grouped.new.push(issue);
            }
        });

        return grouped;
    }, [issues]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || !currentProject?.id) return;

        const issueId = active.id as string;
        let newStatus = over.id as string;

        // Find the issue
        const issue = issues.find(i => i.id === issueId);
        if (!issue) return;

        // If over.id is an issue ID (not a column ID), find the column that issue belongs to
        const validStatusIds = ['new', 'ongoing', 'closed', 'waiting', 'draft', 'canceled'];
        if (!validStatusIds.includes(newStatus)) {
            // over.id is an issue ID, find which column it belongs to
            const targetIssue = issues.find(i => i.id === newStatus);
            if (targetIssue) {
                newStatus = targetIssue.status?.toLowerCase() || 'new';
            } else {
                return;
            }
        }

        // Don't update if status hasn't changed
        if (issue.status?.toLowerCase() === newStatus) return;

        const updateData: any = {};
        const statusToUpdate = newStatus;

        try {
            const oldStatus = issue.status;
            const oldType = issue.type;
            
            // Update status if it changed
            if (statusToUpdate !== issue.status?.toLowerCase()) {
                await services.changeStatus(
                    currentProject.id, 
                    issueId, 
                    statusToUpdate,
                    currentUser?.uid,
                    currentUser?.displayName || currentUser?.email,
                    oldStatus
                );
            }
            
            // Update closed date if status is being changed to "closed"
            if (statusToUpdate === "closed") {
                const now = new Date();
                const formatted = now.toISOString().replace("T", " ").slice(0, 19);
                await services.updateClosedDate(currentProject.id, issueId, formatted);
            }

            // Update type if needed
            if (updateData.type) {
                await services.changeType(
                    currentProject.id, 
                    issueId, 
                    updateData.type,
                    currentUser?.uid,
                    currentUser?.displayName || currentUser?.email,
                    oldType
                );
            }

            message.success(`Issue moved to ${STATUS_CONFIG.find(s => s.id === newStatus)?.title || newStatus}`);

            // Refresh issues
            const updatedIssues = await services.getTasks(currentProject.id);
            onIssuesUpdate(updatedIssues || []);
        } catch (error) {
            console.error('Error updating issue status:', error);
            message.error('Failed to update issue status');
        }
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const activeIssue = activeId ? issues.find(i => i.id === activeId) : null;

    return (
        <DndContext
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
        >
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
                {STATUS_CONFIG.map((status) => (
                    <KanbanColumn
                        key={status.id}
                        id={status.id}
                        title={status.title}
                        icon={status.icon}
                        color={status.color}
                        issues={issuesByStatus[status.id] || []}
                        users={users}
                        onIssueClick={onIssueClick}
                        onDescriptionClick={onDescriptionClick}
                        onUICanvasClick={onUICanvasClick}
                        onApiClick={onApiClick}
                        onSourceCodeClick={onSourceCodeClick}
                        onCrdTreeClick={onCrdTreeClick}
                        onCodeLineClick={onCodeLineClick}
                        onCreateIssue={status.id === 'new' ? onCreateIssue : undefined}
                        getValueSync={getValueSync}
                        apiNames={apiNames}
                        canvas={canvas}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeIssue ? (
                    <div style={{ opacity: 0.5, transform: 'rotate(5deg)' }}>
                        <KanbanCard
                            issue={activeIssue}
                            users={users}
                            onClick={() => {}}
                            getValueSync={getValueSync}
                            apiNames={apiNames}
                            canvas={canvas}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default KanbanBoard;
 
