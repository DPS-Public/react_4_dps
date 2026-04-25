import React from 'react';
import { Card, Col, Row, Skeleton, Space } from 'antd';
import { useAppSelector } from '@/store';
import { useUICanvasBacklogStatistics } from './hooks/useUICanvasBacklogStatistics';
import ProductManagementMetrics from './components/ProductManagementMetrics';
import UICanvasProgressOverview from './components/UICanvasProgressOverview';

const renderDashboardSkeleton = () => (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh', fontFamily: '"TT Fors", sans-serif' }}>
        <Row gutter={[24, 24]}>
            {[0, 1, 2, 3].map((item) => (
                <Col xs={24} sm={12} xl={6} key={`summary-skeleton-${item}`}>
                    <Card
                        style={{
                            borderRadius: 18,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
                        }}
                        styles={{ body: { padding: 18 } }}
                    >
                        <Space align="start" size={14}>
                            <Skeleton.Avatar active shape="square" size={48} />
                            <div style={{ width: '100%' }}>
                                <Skeleton.Input active size="small" style={{ width: '70%', marginBottom: 12 }} />
                                <Skeleton.Input active size="large" style={{ width: '35%' }} />
                            </div>
                        </Space>
                    </Card>
                </Col>
            ))}

            {[0, 1, 2, 3].map((item) => (
                <Col xs={24} xl={12} key={`grid-skeleton-${item}`}>
                    <Card
                        style={{
                            borderRadius: 18,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
                        }}
                        styles={{ body: { padding: 22 } }}
                    >
                        <Space direction="vertical" size={18} style={{ width: '100%' }}>
                            <Space size={12}>
                                <Skeleton.Avatar active shape="square" size={48} />
                                <div style={{ width: 260 }}>
                                    <Skeleton.Input active size="default" style={{ width: '72%', marginBottom: 10 }} />
                                    <Skeleton.Input active size="small" style={{ width: '100%' }} />
                                </div>
                            </Space>
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <Card style={{ borderRadius: 16, border: '1px solid #edf2f7' }}>
                                        <Skeleton active paragraph={{ rows: 3, width: ['70%', '50%', '65%'] }} title={false} />
                                    </Card>
                                </Col>
                                <Col span={12}>
                                    <Card style={{ borderRadius: 16, border: '1px solid #edf2f7' }}>
                                        <Skeleton active paragraph={{ rows: 3, width: ['75%', '45%', '60%'] }} title={false} />
                                    </Card>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </Col>
            ))}

            {[0, 1].map((item) => (
                <Col xs={24} xl={12} key={`bottom-skeleton-${item}`}>
                    <Card
                        style={{
                            borderRadius: 18,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
                        }}
                        styles={{ body: { padding: 22 } }}
                    >
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <Skeleton.Input active size="default" style={{ width: '45%' }} />
                            {[0, 1, 2].map((row) => (
                                <Card key={`inner-row-${item}-${row}`} style={{ borderRadius: 16, border: '1px solid #edf2f7' }}>
                                    <Skeleton active paragraph={{ rows: 2, width: ['65%', '40%'] }} title={false} />
                                </Card>
                            ))}
                        </Space>
                    </Card>
                </Col>
            ))}
        </Row>
    </div>
);

const ProjectDashboard: React.FC = () => {
    const { currentProject } = useAppSelector((state) => state.project);
    const { canvasses } = useAppSelector((state) => state.auth);
    const { 
        statistics, 
        loading, 
        allBacklogIssues
    } = useUICanvasBacklogStatistics(currentProject?.id);

    if (loading) {
        return renderDashboardSkeleton();
    }

    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh', fontFamily: '"TT Fors", sans-serif' }}>
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <ProductManagementMetrics 
                        currentProject={currentProject}
                        statistics={statistics}
                        allBacklogIssues={allBacklogIssues}
                        canvasses={canvasses}
                        snapshotExtra={
                            <UICanvasProgressOverview 
                                statistics={statistics}
                                canvasses={canvasses}
                                allBacklogIssues={allBacklogIssues}
                            />
                        }
                    />
                </Col>
            </Row>
        </div>
    );
};

export default ProjectDashboard;
