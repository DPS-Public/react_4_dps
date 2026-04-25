import React, { useMemo } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { UICanvasBacklogStatistics } from '../services/uiCanvasBacklogStatisticsService';

const { Title } = Typography;
const dashboardFontStyle: React.CSSProperties = {
    fontFamily: '"TT Fors", sans-serif',
};

const overviewBadgeBaseStyle: React.CSSProperties = {
    borderRadius: 18,
    padding: '18px 20px',
    border: '1px solid #eef2f7',
    background: '#ffffff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    height: '100%',
    fontFamily: '"TT Fors", sans-serif',
};

interface UICanvasProgressOverviewProps {
    statistics: Record<string, UICanvasBacklogStatistics>;
    canvasses: any[];
    allBacklogIssues?: any[];
}

const UICanvasProgressOverview: React.FC<UICanvasProgressOverviewProps> = ({ 
    statistics, 
    canvasses,
    allBacklogIssues = []
}) => {
    const overviewData = useMemo(() => {
        // Calculate status for each canvas based on backlog issues
        // Rules:
        // 1. Not Started: none of issues are closed (exclude: status=canceled AND requestType=Backlog)
        // 2. In Progress: at least one issue is closed (exclude: status=canceled AND requestType=Backlog)
        // 3. Closed: all issues are closed (exclude: status=canceled AND requestType=Backlog)

        let notStarted = 0;
        let inProgress = 0;
        let closed = 0;

        // Process each canvas from the project
        canvasses.forEach(canvas => {
            const canvasId = canvas.id;
            
            // Get issues for this canvas (excluding canceled with requestType=Backlog)
            const canvasIssues = allBacklogIssues.filter((issue: any) => {
                // Check if issue belongs to this canvas
                if (issue.uiCanvasId !== canvasId) return false;
                
                // Exclude canceled issues with request type Backlog
                if (issue.status === "canceled" && issue.requestType === "Backlog") {
                    return false;
                }
                
                return true;
            });

            // If no issues, consider as not started
            if (canvasIssues.length === 0) {
                notStarted++;
                return;
            }

            // Count closed issues
            const closedIssues = canvasIssues.filter((issue: any) => 
                issue.status === "closed" || issue.status === "Closed"
            );

            // Determine canvas status based on rules
            if (closedIssues.length === 0) {
                // Not Started: none of issues are closed
                notStarted++;
            } else if (closedIssues.length === canvasIssues.length) {
                // Closed: all issues are closed
                closed++;
            } else {
                // In Progress: at least one issue is closed but not all
                inProgress++;
            }
        });

        const total = canvasses.length; // Total canvases in project
        const overallProgress = total > 0 ? Math.round((closed / total) * 100) : 0;

        return {
            notStarted,
            inProgress,
            closed,
            total,
            overallProgress
        };
    }, [statistics, canvasses, allBacklogIssues]);

    const chartData = [
        { name: 'Not Started', value: overviewData.notStarted, color: '#d9d9d9' },
        { name: 'In Progress', value: overviewData.inProgress, color: '#1890ff' },
        { name: 'Closed', value: overviewData.closed, color: '#52c41a' }
    ].filter(item => item.value > 0);

    return (
        <Card style={dashboardFontStyle} styles={{ body: { fontFamily: '"TT Fors", sans-serif' } }}>
            <Title level={4} style={{ marginBottom: '24px', ...dashboardFontStyle }}>
                UI Canvas Progress Overview
            </Title>

            <Row gutter={[24, 24]}>
                {/* Donut Chart */}
                <Col xs={24} lg={12}>
                    <div
                        style={{
                            textAlign: 'center',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            ...dashboardFontStyle,
                        }}
                    >
                        <div style={{ width: '100%', minHeight: 340 }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: '"TT Fors", sans-serif' }}
                                >
                                    {overviewData.overallProgress}%
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                        <Legend 
                            payload={chartData.map(item => ({
                                value: item.name,
                                type: 'circle',
                                color: item.color
                            }))}
                        />
                    </div>
                </Col>

                {/* Statistics */}
                <Col xs={24} lg={12}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <div style={{ ...overviewBadgeBaseStyle }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: '14px', color: '#8c8c8c', ...dashboardFontStyle }}>Canvased</span>
                                        <span style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1, color: '#111827', ...dashboardFontStyle }}>
                                            {overviewData.total}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            minWidth: 96,
                                            height: 56,
                                            borderRadius: 14,
                                            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#2563eb',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            ...dashboardFontStyle,
                                        }}
                                    >
                                        Total
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col span={24}>
                            <div style={{ ...overviewBadgeBaseStyle, border: '1px solid #bfdbfe', background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: '14px', color: '#3b82f6', ...dashboardFontStyle }}>In Progress</span>
                                        <span style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1, color: '#2563eb', ...dashboardFontStyle }}>
                                            {overviewData.inProgress}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            minWidth: 96,
                                            height: 56,
                                            borderRadius: 14,
                                            background: '#dbeafe',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#2563eb',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            ...dashboardFontStyle,
                                        }}
                                    >
                                        Active
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col span={24}>
                            <div style={{ ...overviewBadgeBaseStyle, border: '1px solid #bbf7d0', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: '14px', color: '#22c55e', ...dashboardFontStyle }}>Done</span>
                                        <span style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1, color: '#16a34a', ...dashboardFontStyle }}>
                                            {overviewData.closed}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            minWidth: 96,
                                            height: 56,
                                            borderRadius: 14,
                                            background: '#dcfce7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#16a34a',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            ...dashboardFontStyle,
                                        }}
                                    >
                                        Closed
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Card>
    );
};

export default UICanvasProgressOverview;
