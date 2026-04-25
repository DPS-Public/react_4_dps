import React, { useState } from 'react';
import {
  Modal,
  Button,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Spin,
  Divider,
  Tabs,
  Empty,
  Statistic,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import ReactJson from 'react18-json-view';
import 'react18-json-view/src/style.css';
import { ApiRequest, ApiResponse, Environment } from '../types/api';
import { executeRequest } from '../services/apiService';

const { Option } = Select;
const { TabPane } = Tabs;

interface ComparisonEndpoint {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
}

interface ComparisonResult {
  response: ApiResponse | null;
  loading: boolean;
  error?: string;
}

interface DiffLine {
  key: string;
  leftValue: any;
  rightValue: any;
  status: 'equal' | 'changed' | 'left-only' | 'right-only';
}

interface RequestComparisonProps {
  open: boolean;
  onClose: () => void;
  endpoints: ComparisonEndpoint[];
  currentRequest: ApiRequest;
  currentResponse: ApiResponse | null;
  activeEnvironment: Environment | null;
}

function getStatusColor(status: number | undefined) {
  if (!status) return '#aaa';
  if (status >= 200 && status < 300) return '#52c41a';
  if (status >= 400 && status < 500) return '#faad14';
  return '#ff4d4f';
}

function getStatusTagColor(status: number | undefined) {
  if (!status) return 'default';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'warning';
  return 'error';
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { [prefix || 'value']: obj };
  }
  return Object.keys(obj).reduce<Record<string, any>>((acc, key) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, newKey));
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {});
}

function buildDiff(left: any, right: any): DiffLine[] {
  const flatLeft = flattenObject(left);
  const flatRight = flattenObject(right);
  const allKeys = new Set([...Object.keys(flatLeft), ...Object.keys(flatRight)]);
  return Array.from(allKeys).map((key) => {
    const lv = flatLeft[key];
    const rv = flatRight[key];
    const lStr = JSON.stringify(lv);
    const rStr = JSON.stringify(rv);
    let status: DiffLine['status'] = 'equal';
    if (!(key in flatLeft)) status = 'right-only';
    else if (!(key in flatRight)) status = 'left-only';
    else if (lStr !== rStr) status = 'changed';
    return { key, leftValue: lv, rightValue: rv, status };
  });
}

function renderValue(val: any) {
  if (val === undefined) return <span style={{ color: '#bbb' }}>—</span>;
  if (val === null) return <span style={{ color: '#999', fontStyle: 'italic' }}>null</span>;
  if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'red'}>{String(val)}</Tag>;
  if (typeof val === 'object') return (
    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
      {JSON.stringify(val)}
    </span>
  );
  return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(val)}</span>;
}

function DiffTable({ left, right }: { left: any; right: any }) {
  const diffs = buildDiff(left, right);

  const statusStyle: Record<DiffLine['status'], React.CSSProperties> = {
    equal: {},
    changed: { background: '#fffbe6' },
    'left-only': { background: '#fff1f0' },
    'right-only': { background: '#f6ffed' },
  };

  const changedCount = diffs.filter((d) => d.status !== 'equal').length;
  const equalCount = diffs.filter((d) => d.status === 'equal').length;

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Tag color="default">{equalCount} equal</Tag>
        <Tag color="orange">{diffs.filter((d) => d.status === 'changed').length} changed</Tag>
        <Tag color="red">{diffs.filter((d) => d.status === 'left-only').length} left-only</Tag>
        <Tag color="green">{diffs.filter((d) => d.status === 'right-only').length} right-only</Tag>
      </Space>
      {changedCount === 0 && (
        <div style={{ textAlign: 'center', padding: 16, color: '#52c41a', fontWeight: 500 }}>
          <CheckCircleOutlined /> Responses are identical
        </div>
      )}
      <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', width: '30%', fontWeight: 600 }}>Field</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', width: '35%', fontWeight: 600 }}>Left</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', width: '35%', fontWeight: 600 }}>Right</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((diff) => (
              <tr key={diff.key} style={{ borderBottom: '1px solid #f0f0f0', ...statusStyle[diff.status] }}>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontWeight: 500 }}>{diff.key}</td>
                <td style={{ padding: '5px 10px' }}>{renderValue(diff.leftValue)}</td>
                <td style={{ padding: '5px 10px' }}>{renderValue(diff.rightValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResponsePanel({
  label,
  result,
  labelColor,
}: {
  label: string;
  result: ComparisonResult;
  labelColor: string;
}) {
  const [tab, setTab] = useState('body');
  const resp = result.response;

  return (
    <div style={{ height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color={labelColor} style={{ fontSize: 13, padding: '2px 10px' }}>
          {label}
        </Tag>
        {result.loading && <Spin size="small" />}
        {resp && (
          <Space>
            <Tag color={getStatusTagColor(resp.status)}>{resp.status} {resp.statusText}</Tag>
            <Tag>{resp.executionTime}ms</Tag>
            <Tag>{resp.data ? `${JSON.stringify(resp.data).length} bytes` : '0 bytes'}</Tag>
          </Space>
        )}
        {result.error && <Tag color="error">Error: {result.error}</Tag>}
      </div>

      {!resp && !result.loading && !result.error && (
        <Empty description="Not run yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {resp && (
        <Tabs activeKey={tab} onChange={setTab} size="small">
          <TabPane tab="Body" key="body">
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {typeof resp.data === 'object' ? (
                <ReactJson src={resp.data} theme="default" collapsed={2} />
              ) : (
                <pre style={{ fontSize: 11, margin: 0 }}>{String(resp.data)}</pre>
              )}
            </div>
          </TabPane>
          <TabPane tab="Headers" key="headers">
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(resp.headers || {}).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#888', width: '40%' }}>{k}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabPane>
        </Tabs>
      )}
    </div>
  );
}

export default function RequestComparison({
  open,
  onClose,
  endpoints,
  currentRequest,
  currentResponse,
  activeEnvironment,
}: RequestComparisonProps) {
  const [leftEndpointId, setLeftEndpointId] = useState<string>('__current__');
  const [rightEndpointId, setRightEndpointId] = useState<string | null>(null);
  const [leftResult, setLeftResult] = useState<ComparisonResult>({ response: currentResponse, loading: false });
  const [rightResult, setRightResult] = useState<ComparisonResult>({ response: null, loading: false });
  const [diffTab, setDiffTab] = useState('diff');

  const allOptions = [
    { id: '__current__', name: '(Current Request)', method: currentRequest.method, url: currentRequest.url, headers: currentRequest.headers, params: currentRequest.params, body: currentRequest.body },
    ...endpoints,
  ];

  const buildRequest = (id: string): ApiRequest => {
    if (id === '__current__') {
      return { ...currentRequest };
    }
    const ep = endpoints.find((e) => e.id === id);
    if (!ep) return { ...currentRequest };
    return {
      id: ep.id,
      name: ep.name,
      method: ep.method as ApiRequest['method'],
      url: ep.url,
      headers: ep.headers || {},
      params: ep.params || {},
      body: ep.body || '',
      userId: currentRequest.userId,
    };
  };

  const runSide = async (side: 'left' | 'right') => {
    const id = side === 'left' ? leftEndpointId : rightEndpointId;
    if (!id) return;
    const req = buildRequest(id);
    const setter = side === 'left' ? setLeftResult : setRightResult;
    setter({ response: null, loading: true });
    try {
      const result = await executeRequest(req, activeEnvironment?.variables);
      setter({ response: result, loading: false });
    } catch (e: any) {
      setter({ response: null, loading: false, error: e.message || 'Failed' });
    }
  };

  const runBoth = async () => {
    await Promise.all([runSide('left'), runSide('right')]);
  };

  const handleClose = () => {
    setLeftResult({ response: currentResponse, loading: false });
    setRightResult({ response: null, loading: false });
    setRightEndpointId(null);
    setLeftEndpointId('__current__');
    onClose();
  };

  const getMethodColor = (method: string) => ({
    GET: 'blue', POST: 'green', PUT: 'orange', PATCH: 'geekblue', DELETE: 'red',
  }[method] || 'default');

  const endpointOptionRender = (ep: typeof allOptions[0]) => (
    <Space>
      <Tag color={getMethodColor(ep.method)} style={{ margin: 0 }}>{ep.method}</Tag>
      <span>{ep.name || ep.id}</span>
    </Space>
  );

  const bothRan = !!leftResult.response && !!rightResult.response;

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>Request Comparison</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1300}
      style={{ top: 20 }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {/* Endpoint Selectors */}
      <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
        <Col flex={1}>
          <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 12, color: '#888' }}>LEFT ENDPOINT</div>
          <Select
            style={{ width: '100%' }}
            value={leftEndpointId}
            onChange={(val) => {
              setLeftEndpointId(val);
              setLeftResult({ response: null, loading: false });
            }}
            optionLabelProp="label"
          >
            {allOptions.map((ep) => (
              <Option key={ep.id} value={ep.id} label={ep.name || ep.id}>
                {endpointOptionRender(ep)}
              </Option>
            ))}
          </Select>
        </Col>

        <Col style={{ textAlign: 'center', paddingTop: 24 }}>
          <ArrowRightOutlined style={{ fontSize: 20, color: '#aaa' }} />
        </Col>

        <Col flex={1}>
          <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 12, color: '#888' }}>RIGHT ENDPOINT</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Select an endpoint to compare..."
            value={rightEndpointId}
            onChange={(val) => {
              setRightEndpointId(val);
              setRightResult({ response: null, loading: false });
            }}
            optionLabelProp="label"
          >
            {allOptions.map((ep) => (
              <Option key={ep.id} value={ep.id} label={ep.name || ep.id}>
                {endpointOptionRender(ep)}
              </Option>
            ))}
          </Select>
        </Col>

        <Col style={{ paddingTop: 22 }}>
          <Space>
            <Button
              onClick={() => runSide('left')}
              loading={leftResult.loading}
              disabled={!leftEndpointId}
              icon={<PlayCircleOutlined />}
            >
              Run Left
            </Button>
            <Button
              onClick={() => runSide('right')}
              loading={rightResult.loading}
              disabled={!rightEndpointId}
              icon={<PlayCircleOutlined />}
            >
              Run Right
            </Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={runBoth}
              loading={leftResult.loading || rightResult.loading}
              disabled={!leftEndpointId || !rightEndpointId}
            >
              Run Both
            </Button>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: '8px 0 16px 0' }} />

      {/* Summary Stats Bar */}
      {bothRan && (
        <Row gutter={32} style={{ marginBottom: 16, padding: '10px 0', background: '#fafafa', borderRadius: 6 }}>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title="Left Status"
              value={leftResult.response!.status}
              valueStyle={{ color: getStatusColor(leftResult.response!.status), fontSize: 20 }}
            />
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title="Right Status"
              value={rightResult.response!.status}
              valueStyle={{ color: getStatusColor(rightResult.response!.status), fontSize: 20 }}
            />
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title="Left Time"
              value={leftResult.response!.executionTime}
              suffix="ms"
              valueStyle={{ fontSize: 20 }}
            />
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title="Right Time"
              value={rightResult.response!.executionTime}
              suffix="ms"
              valueStyle={{ fontSize: 20 }}
            />
          </Col>
        </Row>
      )}

      {/* Side-by-side Responses */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <ResponsePanel label="LEFT" result={leftResult} labelColor="blue" />
        </Col>
        <Col span={12}>
          <ResponsePanel label="RIGHT" result={rightResult} labelColor="purple" />
        </Col>
      </Row>

      <Divider style={{ margin: '8px 0 12px 0' }} />

      {/* Diff Section */}
      {bothRan ? (
        <Tabs activeKey={diffTab} onChange={setDiffTab} size="small">
          <TabPane
            tab={
              <span>
                JSON Diff{' '}
                <Badge
                  count={buildDiff(leftResult.response!.data, rightResult.response!.data).filter((d) => d.status !== 'equal').length}
                  style={{ background: '#faad14' }}
                />
              </span>
            }
            key="diff"
          >
            {leftResult.response!.data === null && rightResult.response!.data === null ? (
              <Empty description="No body data to compare" />
            ) : (
              <DiffTable left={leftResult.response!.data} right={rightResult.response!.data} />
            )}
          </TabPane>

          <TabPane tab="Header Diff" key="headers">
            <DiffTable left={leftResult.response!.headers} right={rightResult.response!.headers} />
          </TabPane>

          <TabPane tab="Performance" key="perf">
            <Row gutter={24} style={{ padding: '16px 0' }}>
              <Col span={8}>
                <Statistic
                  title="Response Time Difference"
                  value={Math.abs(leftResult.response!.executionTime - rightResult.response!.executionTime)}
                  suffix="ms"
                />
                <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
                  {leftResult.response!.executionTime < rightResult.response!.executionTime
                    ? '← Left is faster'
                    : leftResult.response!.executionTime > rightResult.response!.executionTime
                    ? '→ Right is faster'
                    : 'Equal speed'}
                </div>
              </Col>
              <Col span={8}>
                <Statistic
                  title="Left Response Size"
                  value={leftResult.response!.data ? JSON.stringify(leftResult.response!.data).length : 0}
                  suffix="bytes"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Right Response Size"
                  value={rightResult.response!.data ? JSON.stringify(rightResult.response!.data).length : 0}
                  suffix="bytes"
                />
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
          Run both sides to see the diff
        </div>
      )}
    </Modal>
  );
}
