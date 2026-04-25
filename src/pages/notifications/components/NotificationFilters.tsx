import React from 'react';
import { Card, Select, DatePicker, Row, Col, Typography, Button, Space, Avatar } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { useProjectManagement } from '@/components/Layout/hooks/useProjectManagement';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface CreatedByOption {
  uid: string;
  label: string;
  email?: string;
  photoURL?: string | null;
}

interface NotificationFiltersProps {
  selectedProject?: string;
  selectedCreatedBy?: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  createdByOptions: CreatedByOption[];
  loadingCreatedBy?: boolean;
  onProjectChange: (value: string | undefined) => void;
  onCreatedByChange: (value: string | undefined) => void;
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onClearFilters: () => void;
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  selectedProject,
  selectedCreatedBy,
  dateRange,
  createdByOptions,
  loadingCreatedBy = false,
  onProjectChange,
  onCreatedByChange,
  onDateRangeChange,
  onClearFilters,
}) => {
  const { projects } = useProjectManagement();

  const hasActiveFilters = selectedProject || selectedCreatedBy || dateRange;

  return (
    <Card 
      size="small" 
      style={{ marginBottom: '24px', backgroundColor: '#fafafa' }}
      title={
        <Space>
          <FilterOutlined />
          <Text strong>Filters</Text>
        </Space>
      }
      extra={
        <Button 
          type="link" 
          icon={<ClearOutlined />} 
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
        >
          Clear Filters
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              PROJECT
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Project"
              allowClear
              value={selectedProject}
              onChange={onProjectChange}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label as string;
                return label?.toLowerCase().includes(input.toLowerCase()) ?? false;
              }}
              options={projects.map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              CREATED BY
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select User"
              allowClear
              value={selectedCreatedBy}
              onChange={onCreatedByChange}
              loading={loadingCreatedBy}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label as string;
                return label?.toLowerCase().includes(input.toLowerCase()) ?? false;
              }}
            >
              {createdByOptions.map((user) => (
                <Option key={user.uid} value={user.uid} label={user.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar
                      size={30}
                      src={user.photoURL || undefined}
                      style={{ backgroundColor: '#2563eb', flexShrink: 0 }}
                    >
                      {!user.photoURL ? user.label?.charAt(0)?.toUpperCase() : null}
                    </Avatar>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', color: '#111827', lineHeight: 1.2 }}>
                        {user.label}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user.email || 'No email'}
                      </span>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              DATE PICKER (FROM-TO)
            </Text>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={onDateRangeChange}
              format="YYYY-MM-DD"
              allowClear
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
};

