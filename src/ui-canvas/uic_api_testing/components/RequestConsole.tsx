import React, { useState } from 'react';
import { Drawer, Table, Tabs, Space, Button, Tag, Collapse, Input, Empty, Spin, Descriptions } from 'antd';
import { CopyOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { message } from 'antd';

interface RequestLog {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  resolvedUrl: string;
  environmentVars?: Record<string, string>;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  status?: number;
  responseTime?: number;
  responseSize?: number;
  responseData?: any;
  error?: string;
}

interface RequestConsoleProps {
  open: boolean;
  onClose: () => void;
  requestLogs: RequestLog[];
  onClearLogs: () => void;
}

export default function RequestConsole({ open, onClose, requestLogs, onClearLogs }: RequestConsoleProps) {
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [searchText, setSearchText] = useState('');

  const filteredLogs = requestLogs.filter(log =>
    log.url.toLowerCase().includes(searchText.toLowerCase()) ||
    log.resolvedUrl?.toLowerCase().includes(searchText.toLowerCase()) ||
    log.method.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: 'blue',
          POST: 'cyan',
          PUT: 'orange',
          PATCH: 'geekblue',
          DELETE: 'red',
        };
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
      },
    },
    {
      title: 'URL',
      dataIndex: 'resolvedUrl',
      key: 'url',
      ellipsis: true,
      render: (text: string, record: RequestLog) => (
        <span title={text} style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {text || record.url}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number | undefined) => {
        if (!status) return <Tag>Pending</Tag>;
        if (status >= 200 && status < 300) return <Tag color="green">{status}</Tag>;
        if (status >= 400 && status < 500) return <Tag color="orange">{status}</Tag>;
        if (status >= 500) return <Tag color="red">{status}</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: 'Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 80,
      render: (time: number | undefined) => time ? `${time}ms` : '-',
    },
    {
      title: 'Size',
      dataIndex: 'responseSize',
      key: 'responseSize',
      width: 80,
      render: (size: number | undefined) => size ? `${size} bytes` : '-',
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: number) =>
        new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
        }),
    },
  ];

  return (
    <Drawer
      title="Request Console Inspector"
      placement="right"
      onClose={onClose}
      open={open}
      width={1200}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Search & Clear */}
        <Space style={{ width: '100%' }}>
          <Input
            placeholder="Search by URL or method..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            danger
            icon={<ClearOutlined />}
            onClick={() => {
              onClearLogs();
              setSelectedLog(null);
              message.success('Request logs cleared');
            }}
          >
            Clear All
          </Button>
        </Space>

        {/* Requests Table */}
        {filteredLogs.length === 0 ? (
          <Empty description="No requests logged yet" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredLogs.map((log, i) => ({ ...log, key: log.id || i }))}
            pagination={{ pageSize: 10 }}
            size="small"
            onRow={(record) => ({
              onClick: () => setSelectedLog(record),
              style: { cursor: 'pointer', backgroundColor: selectedLog?.id === record.id ? '#f0f0f0' : '' },
            })}
          />
        )}

        {/* Request Details */}
        {selectedLog && (
          <Collapse
            defaultActiveKey={['overview', 'request']}
            items={[
              {
                key: 'overview',
                label: '📋 Overview',
                children: (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Method">
                      <Tag>{selectedLog.method}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {selectedLog.status ? <Tag color="green">{selectedLog.status}</Tag> : <Tag>Pending</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Original URL" span={2}>
                      <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{selectedLog.url}</code>
                    </Descriptions.Item>
                    <Descriptions.Item label="Resolved URL" span={2}>
                      <code style={{ wordBreak: 'break-all', fontSize: 11, color: '#1890ff' }}>
                        {selectedLog.resolvedUrl || selectedLog.url}
                      </code>
                    </Descriptions.Item>
                    <Descriptions.Item label="Response Time">
                      {selectedLog.responseTime ? `${selectedLog.responseTime}ms` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Response Size">
                      {selectedLog.responseSize ? `${selectedLog.responseSize} bytes` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Timestamp" span={2}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'environments',
                label: '🔧 Environment Variables Used',
                children: selectedLog.environmentVars && Object.keys(selectedLog.environmentVars).length > 0 ? (
                  <Descriptions column={1} size="small" bordered>
                    {Object.entries(selectedLog.environmentVars).map(([key, value]) => (
                      <Descriptions.Item key={key} label={key}>
                        <code style={{ fontSize: 11 }}>{value}</code>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                ) : (
                  <Empty description="No environment variables used" />
                ),
              },
              {
                key: 'request',
                label: '📤 Request',
                children: (
                  <Tabs
                    items={[
                      {
                        key: 'headers',
                        label: 'Headers',
                        children: selectedLog.headers ? (
                          <pre style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                            {JSON.stringify(selectedLog.headers, null, 2)}
                          </pre>
                        ) : (
                          <Empty description="No headers" />
                        ),
                      },
                      {
                        key: 'params',
                        label: 'Params',
                        children: selectedLog.params ? (
                          <pre style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                            {JSON.stringify(selectedLog.params, null, 2)}
                          </pre>
                        ) : (
                          <Empty description="No params" />
                        ),
                      },
                      {
                        key: 'body',
                        label: 'Body',
                        children: selectedLog.body ? (
                          <pre style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                            {selectedLog.body}
                          </pre>
                        ) : (
                          <Empty description="No body" />
                        ),
                      },
                    ]}
                  />
                ),
              },
              {
                key: 'response',
                label: '📥 Response',
                children: (
                  <Tabs
                    items={[
                      {
                        key: 'data',
                        label: 'Body',
                        children: selectedLog.responseData ? (
                          <pre style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                            {typeof selectedLog.responseData === 'string'
                              ? selectedLog.responseData
                              : JSON.stringify(selectedLog.responseData, null, 2)}
                          </pre>
                        ) : (
                          <Empty description="No response data" />
                        ),
                      },
                      {
                        key: 'error',
                        label: 'Error',
                        children: selectedLog.error ? (
                          <pre style={{ fontSize: 11, backgroundColor: '#fff1f0', padding: 8, borderRadius: 4, color: '#ff4d4f', maxHeight: 300, overflow: 'auto' }}>
                            {selectedLog.error}
                          </pre>
                        ) : (
                          <Empty description="No errors" />
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Space>
    </Drawer>
  );
}
