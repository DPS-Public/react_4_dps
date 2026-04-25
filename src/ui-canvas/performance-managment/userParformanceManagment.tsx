import React from 'react';
import TaskCountHistogram from './components/TaskCountHistogram';

const UserParformanceManagment: React.FC = () => {
    return (
        <TaskCountHistogram analyticsView="ui-canvas" />
    );
};

export const AssigneeAnalyticsPerformanceManagment: React.FC = () => {
    return <TaskCountHistogram analyticsView="assignee" />;
};

export default UserParformanceManagment;
