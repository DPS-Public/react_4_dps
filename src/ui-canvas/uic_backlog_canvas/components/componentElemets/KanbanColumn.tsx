import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    issues: any[];
    users: any[];
    onIssueClick: (issue: any) => void;
    onDescriptionClick?: (issue: any) => void;
    onUICanvasClick?: (canvasId: string) => void;
    onApiClick?: (apiId: string, apiName: string) => void;
    onSourceCodeClick?: (nodeInfo: any, issue: any) => void;
    onCrdTreeClick?: (nodeInfo: any, issue: any) => void;
    onCodeLineClick?: (issue: any) => void;
    onCreateIssue?: () => void;
    getValueSync: (issue: any) => any;
    apiNames: { [key: string]: string };
    canvas: any;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    id,
    title,
    icon,
    color,
    issues,
    users,
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
    canvas
}) => {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    const issueIds = issues.map(issue => issue.id);

    return (
        <div 
            ref={setNodeRef}
            className="flex flex-col h-full min-w-[280px]"
        >
            <Card
                size="small"
                className="mb-2"
                style={{ backgroundColor: color, borderColor: color }}
                bodyStyle={{ padding: '8px 12px' }}
            >
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-semibold">{title}</span>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                        {issues.length}
                    </span>
                </div>
            </Card>

            <div
                className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 overflow-y-auto"
                style={{ minHeight: '400px' }}
            >
            
                <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
                    {issues.map((issue) => (
                        <KanbanCard
                            key={issue.id}
                            issue={issue}
                            users={users}
                            onClick={() => onIssueClick(issue)}
                            onDescriptionClick={onDescriptionClick ? () => onDescriptionClick(issue) : undefined}
                            onUICanvasClick={onUICanvasClick}
                            onApiClick={onApiClick}
                            onSourceCodeClick={onSourceCodeClick ? (nodeInfo) => onSourceCodeClick(nodeInfo, issue) : undefined}
                            onCrdTreeClick={onCrdTreeClick ? (nodeInfo) => onCrdTreeClick(nodeInfo, issue) : undefined}
                            onCodeLineClick={onCodeLineClick ? () => onCodeLineClick(issue) : undefined}
                            getValueSync={getValueSync}
                            apiNames={apiNames}
                            canvas={canvas}
                        />
                    ))}
                </SortableContext>

                {id === 'new' && onCreateIssue && (
                    <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={onCreateIssue}
                        className="mt-2"
                    >
                        Create Issue
                    </Button>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;

