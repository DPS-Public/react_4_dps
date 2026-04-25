import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Tabs,
  Input,
  Select,
  Button,
  Space,
  Card,
  Table,
  Tag,
  Modal,
  Form,
  message,
  Tooltip,
  Spin,
  Checkbox,
  InputNumber,
  Row,
  Col,
  Progress,
  Statistic,
  Alert
} from 'antd';
import {
  ApiOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  HistoryOutlined,
  DeleteOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
  PlusCircleOutlined,
  EditOutlined,
  LockOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SnippetsOutlined,
  SwapOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import ReactJson from "react18-json-view";
import 'react18-json-view/src/style.css';

import RequestConsole from './components/RequestConsole';
import RequestComparison from './components/RequestComparison';
import { ApiRequest, ApiResponse, Environment, StressTestConfig, StressTestStats } from './types/api';
import { executeRequest } from './services/apiService';
import { createStressTest, StressTestController } from './services/stressTestService';
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironments,
  saveRequestHistory
} from './services/firebaseService';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserData } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { APIEndpoint } from '@/hooks/api-canvas/types';
import { v4 as uuidv4 } from 'uuid';
import FirstCanvasSetupCard from '@/components/empty-states/FirstCanvasSetupCard';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

interface ApiEditorProps {
  currentUser: { uid?: string; [key: string]: unknown };
}

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface EndpointDraftSnapshot {
  method: ApiRequest['method'];
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
}

const buildCatalogEndpoint = (id: string, name: string): APIEndpoint => ({
  id,
  name,
  description: '',
  config: {
    method: 'GET',
    localUrl: '',
    localHeader: '',
    filePath: '',
  },
  requestBody: '',
  responseBody: '',
  input: [],
  output: [],
  operation: [],
});

const ApiEditor= () => {
      const [currentUser, setCurrentUser] = useState<{ uid?: string }>({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams(location.search);
      let uid = params.get('uid');

      // If uid is not in URL params, try to get it from localStorage
      if (!uid) {
        uid = localStorage.getItem('uid');
        // Also try to get from userData in localStorage
        if (!uid) {
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            try {
              const parsed = JSON.parse(storedUserData);
              uid = parsed?.uid;
            } catch (e) {
              console.error('Error parsing userData from localStorage:', e);
            }
          }
        }
      }

      if (uid) {
        // Store uid if it came from URL params
        if (params.get('uid')) {
          localStorage.setItem('uid', uid);
        }

        try {
          const userData = await getUserData(uid);          // Ensure uid is included in userData
          const userWithUid = { ...userData, uid: uid || userData?.uid };
          setCurrentUser(userWithUid);
          localStorage.setItem('userData', JSON.stringify(userWithUid));
        } catch (err) {
          console.error("Error fetching user data:", err);
          // Fallback: use uid from localStorage if getUserData fails
          const fallbackUser = { uid };
          setCurrentUser(fallbackUser);
        }

        // Remove query params from URL if they existed
        if (params.get('uid')) {
          navigate(window.location.pathname, { replace: true });
        }
      } else {
        // If no uid found anywhere, try to get from userData
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            if (parsed?.uid) {
              setCurrentUser(parsed);
            }
          } catch (e) {
            console.error('Error parsing userData from localStorage:', e);
          }
        }
      }
    };

    fetchData();
  }, [location, navigate]);
  const [currentRequest, setCurrentRequest] = useState<ApiRequest>({
    id: '',
    name: 'New Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: {},
    params: {},
    body: '',
    userId: currentUser?.uid || ''
  });
  
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [envModalVisible, setEnvModalVisible] = useState(false);
  const [envFormModalVisible, setEnvFormModalVisible] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [activeTab, setActiveTab] = useState('params');
  const [envForm] = Form.useForm();
  const [envVarRows, setEnvVarRows] = useState<KeyValuePair[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [headerRows, setHeaderRows] = useState<KeyValuePair[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [paramRows, setParamRows] = useState<KeyValuePair[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [stressTestController, setStressTestController] = useState<StressTestController | null>(null);
  const [stressTestStats, setStressTestStats] = useState<StressTestStats | null>(null);
  const [stressTestRunning, setStressTestRunning] = useState(false);
  const [stressTestConfig, setStressTestConfig] = useState<StressTestConfig>({
    totalRequests: 100,
    concurrency: 10,
    delayBetweenRequests: 0
  });
  const [stressTestMode, setStressTestMode] = useState<'count' | 'duration'>('count');
  const [stressTestForm] = Form.useForm();
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [newApiModalVisible, setNewApiModalVisible] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [requestLogs, setRequestLogs] = useState<any[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [stressTestModalOpen, setStressTestModalOpen] = useState(false);
  const [expandedEnvironmentRowKeys, setExpandedEnvironmentRowKeys] = useState<React.Key[]>([]);
  const [responseBodyView, setResponseBodyView] = useState<'raw' | 'html'>('raw');
  const [newApiForm] = Form.useForm();
  const [editCanvasModalVisible, setEditCanvasModalVisible] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<APIEndpoint | null>(null);
  const [editCanvasName, setEditCanvasName] = useState('');
  const [editCanvasForm] = Form.useForm();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [savedEndpointSnapshot, setSavedEndpointSnapshot] = useState<string | null>(null);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const apiCanvasCatalog = useSelector((state: RootState) => state.projectCanvasCatalog.apiCanvases);
  const [hasAppliedInitialEndpointSelection, setHasAppliedInitialEndpointSelection] = useState(false);
  const hasApiCanvasCatalog = apiCanvasCatalog.length > 0;

  useEffect(() => {
    const sortedCatalogEndpoints = [...apiCanvasCatalog]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ id, name }) => buildCatalogEndpoint(id, name));

    setApiEndpoints((previousEndpoints) =>
      sortedCatalogEndpoints.map((catalogEndpoint) => {
        const existingEndpoint = previousEndpoints.find((item) => item.id === catalogEndpoint.id);
        return existingEndpoint ? { ...catalogEndpoint, ...existingEndpoint, name: catalogEndpoint.name } : catalogEndpoint;
      }),
    );
  }, [apiCanvasCatalog]);

  useEffect(() => {
    const uid = currentUser?.uid || localStorage.getItem('uid');
    if (uid) {
      loadEnvironments();
    }
     
  }, [currentUser]);

  const loadApiEndpoints = useCallback(async () => {
    if (!currentProject?.id) return;
    
    const endpointIdToHydrate =
      selectedEndpointId ||
      localStorage.getItem('selectedEndpointId') ||
      apiCanvasCatalog[0]?.id;

    if (!endpointIdToHydrate) {
      setLoadingEndpoints(false);
      return;
    }

    setLoadingEndpoints(true);
    try {
      const endpointDocRef = doc(db, 'api_canvas', endpointIdToHydrate);
      const endpointDoc = await getDoc(endpointDocRef);
      if (!endpointDoc.exists()) {
        return;
      }

      const data = endpointDoc.data();
      const catalogName = apiCanvasCatalog.find((item) => item.id === endpointIdToHydrate)?.name || endpointIdToHydrate;
      const hydratedEndpoint = {
        ...buildCatalogEndpoint(endpointIdToHydrate, catalogName),
        ...data,
        id: endpointIdToHydrate,
        name: data?.name ?? catalogName,
        url_link: data?.apiUrl || data?.url_link || '',
      } as APIEndpoint & { url_link?: string };

      setApiEndpoints((previousEndpoints) =>
        previousEndpoints.map((item) => (item.id === endpointIdToHydrate ? hydratedEndpoint : item)),
      );
    } catch (error) {
      console.error('Error loading API endpoints:', error);
      message.error('Failed to load API endpoints');
    } finally {
      setLoadingEndpoints(false);
    }
  }, [apiCanvasCatalog, currentProject?.id, selectedEndpointId]);

  useEffect(() => {
    loadApiEndpoints();
  }, [loadApiEndpoints]);

  const handleEndpointSelect = async (endpointId: string) => {
    const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
    if (!endpoint) return;

    setSelectedEndpointId(endpointId);
    localStorage.setItem('selectedEndpointId', endpointId);
    localStorage.setItem('selectedEndpoint', JSON.stringify(endpoint));

    const params = new URLSearchParams(location.search);
    if (params.get('endpointId') !== endpointId) {
      params.set('endpointId', endpointId);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }

    // Get all data from endpoint document in Firestore
    let urlLink = '';
    let requestParams = {};
    try {
      const endpointDocRef = doc(db, 'api_canvas', endpointId);
      const endpointDoc = await getDoc(endpointDocRef);
      if (endpointDoc.exists()) {
        const data = endpointDoc.data();
        urlLink = data?.apiUrl || data?.url_link || '';
        requestParams = data?.params || {};
      }
    } catch (error) {
      console.warn('Could not fetch endpoint data from Firestore:', error);
    }

    // Parse headers if they exist
    let headers: Record<string, string> = {};
    if (endpoint.config?.localHeader) {
      try {
        const parsedHeaders = JSON.parse(endpoint.config.localHeader);
        if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
          headers = parsedHeaders;
        }
      } catch (e) {
        console.warn('Could not parse headers as JSON:', e);
      }
    }

    // Set request body - parse if it's a string
    let body = '';
    if (endpoint.requestBody) {
      if (typeof endpoint.requestBody === 'string') {
        try {
          const parsed = JSON.parse(endpoint.requestBody);
          body = JSON.stringify(parsed, null, 2);
        } catch (e) {
          body = endpoint.requestBody;
        }
      } else {
        body = JSON.stringify(endpoint.requestBody, null, 2);
      }
    }

    // Update request with URL from url_link, headers, body, params, and method
    const loadedRequest: ApiRequest = {
      ...currentRequest,
      url: urlLink,
      method: endpoint.config?.method || 'GET',
      headers: headers,
      body: body,
      params: requestParams
    };

    setCurrentRequest(loadedRequest);
    setSavedEndpointSnapshot(serializeEndpointDraftSnapshot(buildEndpointDraftSnapshot(loadedRequest)));

    // Switch to Body tab to show the filled body
    setActiveTab('body');

    message.success(`Endpoint loaded: ${endpoint.name || endpointId}`);
  };

  useEffect(() => {
    if (hasAppliedInitialEndpointSelection || apiEndpoints.length === 0) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const endpointIdFromUrl = searchParams.get('endpointId');
    const endpointIdFromStorage = localStorage.getItem('selectedEndpointId');
    const nextEndpointId = endpointIdFromUrl || endpointIdFromStorage || apiEndpoints[0]?.id;

    if (nextEndpointId && apiEndpoints.some((endpoint) => endpoint.id === nextEndpointId)) {
      setHasAppliedInitialEndpointSelection(true);
      handleEndpointSelect(nextEndpointId);
      return;
    }

    if (endpointIdFromUrl || endpointIdFromStorage) {
      localStorage.removeItem('selectedEndpointId');
      localStorage.removeItem('selectedEndpoint');
    }

    setSavedEndpointSnapshot(null);
    setHasAppliedInitialEndpointSelection(true);
  }, [apiCanvasCatalog, apiEndpoints, hasAppliedInitialEndpointSelection, location.search]);

  useEffect(() => {
    // Cleanup: cancel stress test on unmount
    return () => {
      if (stressTestController) {
        stressTestController.cancel();
      }
    };
  }, [stressTestController]);

  useEffect(() => {
    const headerPairs = Object.entries(currentRequest.headers).map(([key, value]) => ({
      key,
      value,
      enabled: true
    }));
    if (headerPairs.length === 0) headerPairs.push({ key: '', value: '', enabled: true });
    setHeaderRows(headerPairs);
    
    const paramPairs = Object.entries(currentRequest.params).map(([key, value]) => ({
      key,
      value,
      enabled: true
    }));
    if (paramPairs.length === 0) paramPairs.push({ key: '', value: '', enabled: true });
    setParamRows(paramPairs);
  }, [currentRequest.headers, currentRequest.params]);

  const loadEnvironments = async () => {
    try {
      const uid = currentUser?.uid || localStorage.getItem('uid');
      if (!uid) return;
      
      const envs = await getEnvironments(uid);
      setEnvironments(envs);
      const active = envs.find(env => env.isActive);
      if (active) setActiveEnvironment(active);
    } catch (error) {
      message.error('Failed to load environments');
    }
  };

  const handleCreateEnvironment = () => {
    setEditingEnvironment(null);
    setEnvVarRows([{ key: '', value: '', enabled: true }]);
    envForm.resetFields();
    setEnvFormModalVisible(true);
  };

  const handleEditEnvironment = (env: Environment) => {
    setEditingEnvironment(env);
    const varPairs = Object.entries(env.variables || {}).map(([key, value]) => ({
      key,
      value,
      enabled: true
    }));
    if (varPairs.length === 0) varPairs.push({ key: '', value: '', enabled: true });
    setEnvVarRows(varPairs);
    envForm.setFieldsValue({ name: env.name, isActive: env.isActive });
    setEnvFormModalVisible(true);
  };

  const handleSaveEnvironment = async (values: { name: string; isActive: boolean }) => {
    try {
      // Get uid from currentUser or fallback to localStorage
      const uid = currentUser?.uid || localStorage.getItem('uid');
      
      if (!uid) {
        message.error('User not authenticated');
        return;
      }

      const variables = convertPairsToObject(envVarRows);
      const environmentData: Omit<Environment, 'id'> = {
        name: values.name,
        variables,
        isActive: values.isActive,
        userId: uid
      };

      if (editingEnvironment?.id) {
        await updateEnvironment(editingEnvironment.id, environmentData);
        message.success('Environment updated');
      } else {
        await createEnvironment(environmentData);
        message.success('Environment created');
      }

      await loadEnvironments();
      setEnvFormModalVisible(false);
      envForm.resetFields();
      setEditingEnvironment(null);
    } catch (error) {
      message.error('Failed to save environment');
      console.error('Save environment error:', error);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    try {
      await deleteEnvironment(id);
      if (activeEnvironment?.id === id) {
        setActiveEnvironment(null);
      }
      await loadEnvironments();
      message.success('Environment deleted');
    } catch (error) {
      message.error('Failed to delete environment');
      console.error('Delete environment error:', error);
    }
  };

  const handleSetActiveEnvironment = async (env: Environment) => {
    try {
      const uid = currentUser?.uid || localStorage.getItem('uid');
      if (!uid || !env.id) return;

      // Set all environments to inactive first
      const updatePromises = environments
        .filter(e => e.id && e.isActive)
        .map(e => updateEnvironment(e.id!, { isActive: false }));
      
      await Promise.all(updatePromises);
      
      // Set selected environment as active
      await updateEnvironment(env.id, { isActive: true });
      await loadEnvironments();
      message.success(`${env.name} is now active`);
    } catch (error) {
      message.error('Failed to set active environment');
      console.error('Set active environment error:', error);
    }
  };

  const handleRunRequest = async () => {
    if (!currentRequest.url) {
      message.error('Please enter a URL');
      return;
    }

    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Resolve URL with environment variables
      let resolvedUrl = currentRequest.url;
      const varsUsed: Record<string, string> = {};
      
      if (activeEnvironment?.variables) {
        Object.entries(activeEnvironment.variables).forEach(([key, value]) => {
          // Support both {key} and {{key}} formats
          const placeholder1 = `{${key}}`; // {url}
          const placeholder2 = `{{${key}}}`; // {{url}}
          
          if (resolvedUrl.includes(placeholder1) || resolvedUrl.includes(placeholder2)) {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            resolvedUrl = resolvedUrl.replace(new RegExp(`{{?${escapedKey}}}?`, 'g'), value as string);
            varsUsed[key] = value as string;
          }
        });
      }

      const result = await executeRequest(currentRequest, activeEnvironment?.variables);
      setResponse(result);
      setActiveTab('response');
      
      // Log the request
      const requestLog = {
        id: uuidv4(),
        timestamp: startTime,
        method: currentRequest.method,
        url: currentRequest.url, // Original URL with variables
        resolvedUrl: resolvedUrl, // Resolved URL
        environmentVars: varsUsed, // Which environment variables were used
        headers: currentRequest.headers,
        params: currentRequest.params,
        body: currentRequest.body,
        status: result.status,
        responseTime: result.executionTime,
        responseSize: result.data ? JSON.stringify(result.data).length : 0,
        responseData: result.data,
        error: result.error
      };
      
      setRequestLogs(prev => [requestLog, ...prev]);
      
      const uid = currentUser?.uid || localStorage.getItem('uid');
      if (selectedRequestId && uid) {
        await saveRequestHistory({
          requestId: selectedRequestId,
          request: currentRequest,
          response: result,
          timestamp: new Date(),
          userId: uid
        });
      }
      
      message.success(`Request completed in ${result.executionTime}ms`);
    } catch (error) {
      message.error('Failed to execute request');
      console.error('Request error:', error);
      
      // Log failed request
      const requestLog = {
        id: uuidv4(),
        timestamp: startTime,
        method: currentRequest.method,
        url: currentRequest.url,
        resolvedUrl: currentRequest.url,
        headers: currentRequest.headers,
        params: currentRequest.params,
        body: currentRequest.body,
        error: error instanceof Error ? error.message : String(error)
      };
      
      setRequestLogs(prev => [requestLog, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const updateKeyValuePairs = (
    pairs: KeyValuePair[],
    index: number,
    field: 'key' | 'value' | 'enabled',
    value: string | boolean
  ) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    
    // Add new empty row if last row is filled
    if (index === pairs.length - 1 && newPairs[index].key && newPairs[index].value) {
      newPairs.push({ key: '', value: '', enabled: true });
    }
    
    return newPairs;
  };

  const convertPairsToObject = (pairs: KeyValuePair[]): Record<string, string> => {
    return pairs
      .filter(pair => pair.key && pair.value && pair.enabled)
      .reduce((obj, pair) => ({ ...obj, [pair.key]: pair.value }), {});
  };

  const sanitizeFirestorePayload = <T extends Record<string, any>>(value: T): T => {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);

    return entries.reduce((acc, [key, entryValue]) => {
      if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
        acc[key] = sanitizeFirestorePayload(entryValue);
      } else {
        acc[key] = entryValue;
      }
      return acc;
    }, {} as T);
  };

  const buildEndpointDraftSnapshot = (request: ApiRequest): EndpointDraftSnapshot => ({
    method: request.method,
    url: (request.url || '').trim(),
    headers: request.headers || {},
    params: request.params || {},
    body: request.body || '',
  });

  const serializeEndpointDraftSnapshot = (snapshot: EndpointDraftSnapshot): string => {
    return JSON.stringify({
      ...snapshot,
      headers: Object.fromEntries(Object.entries(snapshot.headers).sort(([a], [b]) => a.localeCompare(b))),
      params: Object.fromEntries(Object.entries(snapshot.params).sort(([a], [b]) => a.localeCompare(b))),
    });
  };

  const hasUnsavedEndpointChanges = Boolean(
    selectedEndpointId &&
    savedEndpointSnapshot &&
    serializeEndpointDraftSnapshot(buildEndpointDraftSnapshot(currentRequest)) !== savedEndpointSnapshot
  );

  const parseEnvTextToPairs = (text: string): KeyValuePair[] => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
        const separatorIndex = normalizedLine.indexOf('=');

        if (separatorIndex === -1) {
          return null;
        }

        const key = normalizedLine.slice(0, separatorIndex).trim();
        const rawValue = normalizedLine.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, '');

        if (!key) {
          return null;
        }

        return {
          key,
          value,
          enabled: true,
        };
      })
      .filter((pair): pair is KeyValuePair => Boolean(pair));
  };

  const appendEnvironmentPairsFromPaste = (pastedText: string) => {
    const parsedPairs = parseEnvTextToPairs(pastedText);

    if (parsedPairs.length === 0) {
      return false;
    }

    setEnvVarRows((prev) => {
      const existingPairs = prev.filter((pair) => pair.key || pair.value);
      return [...existingPairs, ...parsedPairs, { key: '', value: '', enabled: true }];
    });

    return true;
  };

  const keyValueColumns = (
    pairs: KeyValuePair[],
    setPairs: (pairs: KeyValuePair[]) => void,
    updateRequest: (obj: Record<string, string>) => void,
    options?: {
      onBulkPaste?: (pastedText: string) => boolean;
    }
  ) => [
    {
      title: 'Key',
      dataIndex: 'key',
      width: '40%',
      render: (text: string, record: KeyValuePair, index: number) => (
        <Input
          value={text}
          placeholder="Key"
          onChange={(e) => {
            const newPairs = updateKeyValuePairs(pairs, index, 'key', e.target.value);
            setPairs(newPairs);
            updateRequest(convertPairsToObject(newPairs));
          }}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData('text');
            if (options?.onBulkPaste?.(pastedText)) {
              e.preventDefault();
            }
          }}
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      width: '50%',
      render: (text: string, record: KeyValuePair, index: number) => (
        <Input
          value={text}
          placeholder="Value"
          onChange={(e) => {
            const newPairs = updateKeyValuePairs(pairs, index, 'value', e.target.value);
            setPairs(newPairs);
            updateRequest(convertPairsToObject(newPairs));
          }}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData('text');
            if (options?.onBulkPaste?.(pastedText)) {
              e.preventDefault();
            }
          }}
        />
      ),
    },
    {
      title: '',
      width: '10%',
      render: (text: string, record: KeyValuePair, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            if (pairs.length > 1) {
              const newPairs = pairs.filter((_, i) => i !== index);
              setPairs(newPairs);
              updateRequest(convertPairsToObject(newPairs));
            }
          }}
        />
      ),
    },
  ];

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400) return 'error';
    return 'default';
  };

  const isCorsLikeErrorResponse = Boolean(
    response &&
    response.status === 0 &&
    ['Network Error', 'Request Error'].includes(response.statusText)
  );
  const isHttpErrorResponse = Boolean(response && response.status >= 400);
  const responseContentType = String(response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '');
  const isHtmlResponse =
    responseContentType.toLowerCase().includes('text/html') ||
    (typeof response?.data === 'string' && /<\/?[a-z][\s\S]*>/i.test(response.data));
  const responseHeaderEntries = response ? Object.entries(response.headers || {}) : [];
  const responseCookieEntries = responseHeaderEntries
    .filter(([key]) => key.toLowerCase() === 'set-cookie')
    .flatMap(([, value]) => {
      if (Array.isArray(value)) {
        return value.map((cookieValue, index) => ({ key: `${index}`, value: String(cookieValue) }));
      }

      return String(value)
        .split(/,(?=[^;]+=[^;]+)/)
        .map((cookieValue, index) => ({ key: `${index}`, value: cookieValue.trim() }))
        .filter((entry) => entry.value);
    });
  const nonCookieHeaderEntries = responseHeaderEntries.filter(([key]) => key.toLowerCase() !== 'set-cookie');

  useEffect(() => {
    if (!response) {
      setResponseBodyView('raw');
      return;
    }

    setResponseBodyView(isHtmlResponse ? 'html' : 'raw');
  }, [response, isHtmlResponse]);

  const getHttpErrorDescription = (status: number) => {
    switch (status) {
      case 400:
        return 'Bad Request. The server could not understand the request due to invalid syntax.';
      case 401:
        return 'Unauthorized. Authentication is required or the provided credentials are invalid.';
      case 403:
        return 'Forbidden. The server understood the request but refused to authorize it.';
      case 404:
        return 'Not Found. The requested URL or resource does not exist on the server.';
      case 405:
        return 'Method Not Allowed. The endpoint exists, but this HTTP method is not supported.';
      case 408:
        return 'Request Timeout. The server waited too long for the request to complete.';
      case 409:
        return 'Conflict. The request conflicts with the current state of the resource.';
      case 415:
        return 'Unsupported Media Type. The server does not accept this request body format.';
      case 422:
        return 'Unprocessable Entity. The request format is valid, but the data failed validation.';
      case 429:
        return 'Too Many Requests. The API rate limit has likely been exceeded.';
      case 500:
        return 'Internal Server Error. The server failed while processing the request.';
      case 502:
        return 'Bad Gateway. The upstream server returned an invalid response.';
      case 503:
        return 'Service Unavailable. The server is temporarily unavailable or overloaded.';
      case 504:
        return 'Gateway Timeout. The upstream server took too long to respond.';
      default:
        return 'The server returned an error response for this request.';
    }
  };

  const handleStartStressTest = async () => {
    if (!currentRequest.url) {
      message.error('Please enter a URL first');
      return;
    }

    try {
      const values = await stressTestForm.validateFields();
      const config: StressTestConfig = {
        totalRequests: stressTestMode === 'count' ? (values.totalRequests || 100) : 1000,
        concurrency: values.concurrency || 10,
        duration: stressTestMode === 'duration' ? (values.duration || 60) : undefined,
        delayBetweenRequests: values.delayBetweenRequests || 0
      };

      const controller = createStressTest(currentRequest, config, activeEnvironment?.variables);
      
      controller.setCallbacks(
        (stats) => {
          setStressTestStats(stats);
        },
        (stats) => {
          setStressTestStats(stats);
          setStressTestRunning(false);
          message.success('Stress test completed');
        },
        (error) => {
          setStressTestRunning(false);
          message.error(`Stress test error: ${error.message}`);
        }
      );

      setStressTestController(controller);
      setStressTestRunning(true);
      setStressTestStats(null);

      // Run stress test asynchronously
      controller.run().catch((error) => {
        console.error('Stress test error:', error);
        setStressTestRunning(false);
      });
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleStopStressTest = () => {
    if (stressTestController) {
      stressTestController.cancel();
      setStressTestRunning(false);
      message.info('Stress test stopped');
    }
  };

  const handleCreateNewAPI = async () => {
    if (!newApiName.trim()) {
      message.warning('Please enter API endpoint name');
      return;
    }

    if (!currentProject?.id) {
      message.error('No project selected');
      return;
    }

    // Get URL from current request input
    const urlFromInput = currentRequest.url.trim() || newApiName.trim().toLowerCase().replace(/\s+/g, '-');
    const methodFromInput = currentRequest.method || 'POST';

    try {
      const endpointId = uuidv4();
      const endpoint: APIEndpoint = {
        id: endpointId,
        name: newApiName.trim(),
        config: {
          method: methodFromInput as 'GET' | 'POST' | 'PUT' | 'DELETE',
          localUrl: urlFromInput,
          localHeader: JSON.stringify(currentRequest.headers || {}),
          filePath: '',
        },
        requestBody: currentRequest.body || '{}',
        responseBody: '{}',
        input: [],
        output: [],
        operation: [],
      };

      // Update project's api_json
      const projectDocRef = doc(db, 'projects', currentProject.id);
      const projectDoc = await getDoc(projectDocRef);
      const apiJsonString = projectDoc.get('api_json');
      const apiJson = apiJsonString ? JSON.parse(apiJsonString) : {};
      apiJson[endpointId] = endpoint.name;

      await updateDoc(projectDocRef, {
        api_json: JSON.stringify(apiJson)
      });

      // Create API endpoint in api_canvas collection
      const apiCanvasDocRef = doc(db, 'api_canvas', endpointId);
      await setDoc(apiCanvasDocRef, {
        ...endpoint,
        id: endpointId,
        name: endpoint.name,
        type: 'api',
      });

      // Reload endpoints
      await loadApiEndpoints();
      
      // Close modal and reset form
      setNewApiModalVisible(false);
      setNewApiName('');
      newApiForm.resetFields();
      
      message.success('API endpoint created successfully');
      
      // Select the newly created endpoint automatically
      handleEndpointSelect(endpointId);
    } catch (error) {
      console.error('Error creating API endpoint:', error);
      message.error('Failed to create API endpoint');
    }
  };

  const handleEditCanvas = (endpoint: APIEndpoint, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEndpoint(endpoint);
    setEditCanvasName(endpoint.name || '');
    editCanvasForm.setFieldsValue({ name: endpoint.name || '' });
    setEditCanvasModalVisible(true);
  };

  const handleSaveCanvasName = async () => {
    if (!editingEndpoint?.id || !editCanvasName.trim()) {
      message.warning('Please enter a canvas name');
      return;
    }

    if (!currentProject?.id) {
      message.error('No project selected');
      return;
    }

    try {
      // Update the endpoint name in api_canvas collection
      const endpointDocRef = doc(db, 'api_canvas', editingEndpoint.id);
      await updateDoc(endpointDocRef, {
        name: editCanvasName.trim()
      });

      // Update project's api_json
      const projectDocRef = doc(db, 'projects', currentProject.id);
      const projectDoc = await getDoc(projectDocRef);
      const apiJsonString = projectDoc.get('api_json');
      const apiJson = apiJsonString ? JSON.parse(apiJsonString) : {};
      apiJson[editingEndpoint.id] = editCanvasName.trim();

      await updateDoc(projectDocRef, {
        api_json: JSON.stringify(apiJson)
      });

      // Reload endpoints
      await loadApiEndpoints();
      
      // Close modal and reset form
      setEditCanvasModalVisible(false);
      setEditingEndpoint(null);
      setEditCanvasName('');
      editCanvasForm.resetFields();
      
      message.success('Canvas name updated successfully');
    } catch (error) {
      console.error('Error updating canvas name:', error);
      message.error('Failed to update canvas name');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout>
        {/* Main Content */}
        <Content style={{ padding: '16px' }}>
          {/* API Endpoint Selector - En yuxarida */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <Select
                  showSearch
                  placeholder="Select an API endpoint"
                  style={{ width: '100%' }}
                  loading={loadingEndpoints}
                  value={selectedEndpointId ?? undefined}
                  onChange={(value) => {
                    handleEndpointSelect(value);
                  }}
                  filterOption={(input, option) => {
                    const label = String(option?.label || '');
                    const value = String(option?.value || '');
                    const searchText = input.toLowerCase();
                    return label.toLowerCase().includes(searchText) || 
                           value.toLowerCase().includes(searchText);
                  }}
                  notFoundContent={loadingEndpoints ? <Spin size="small" /> : 'No API endpoints found'}
                >
                  {[...apiEndpoints].sort((a, b) => {
                    const nameA = (a.name || a.id || '').toLowerCase();
                    const nameB = (b.name || b.id || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                  }).map(endpoint => {
                    const method = endpoint.config?.method || 'GET';
                    const methodColor = 
                      method === 'GET' ? 'blue' :
                      method === 'POST' ? 'green' :
                      method === 'PUT' ? 'orange' :
                      method === 'DELETE' ? 'red' : 'default';
                    
                    return (
                      <Option 
                        key={endpoint.id} 
                        value={endpoint.id}
                        label={endpoint.name || endpoint.id}
                      >
                        <div 
                          className="endpoint-option-wrapper"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            width: '100%',
                            position: 'relative'
                          }}
                        >
                          {/* Method Tag - First */}
                          <Tag color={methodColor} style={{ margin: 0, flexShrink: 0 }}>
                            {method}
                          </Tag>
                          
                          {/* Collection Name - Second */}
                          <span style={{ 
                            fontWeight: 500, 
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {endpoint.name || endpoint.id}
                          </span>
                          
                          {/* Edit Button - Visible on hover */}
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            className="endpoint-edit-button"
                            style={{ 
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              flexShrink: 0,
                              padding: '4px 8px'
                            }}
                            onClick={(e) => handleEditCanvas(endpoint, e)}
                            title="Edit canvas name"
                          />
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </div>
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                style={{ 
                  borderRadius: '8px',
                  // height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px'
                }}
                onClick={() => {
                  setNewApiModalVisible(true);
                }}
              />
              {hasApiCanvasCatalog && (
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {apiCanvasCatalog.length} endpoint(s) available
                </span>
              )}
            </div>
          </Card>
          {!hasApiCanvasCatalog ? (
            <FirstCanvasSetupCard
              title="Create your first API canvas"
              description="API Testing works after at least one API canvas endpoint exists. Create your first API canvas and it will be available in the dropdown automatically."
              buttonLabel="Create First API Canvas"
              onCreate={() => setNewApiModalVisible(true)}
              icon={<ApiOutlined />}
              minHeight={520}
            />
          ) : (
          <>

          {/* Header - Aşağı salındı */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <h2 style={{ margin: 0 }}>API Editor</h2>
              <Space>
                <Select
                  style={{ width: 200 }}
                  placeholder="Select Environment"
                  value={activeEnvironment?.id}
                  onChange={async (value) => {
                    const env = environments.find(e => e.id === value);
                    if (env) {
                      await handleSetActiveEnvironment(env);
                    } else {
                      setActiveEnvironment(null);
                    }
                  }}
                >
                  {environments.map(env => (
                    <Option key={env.id} value={env.id}>
                      {env.name} {env.isActive ? '(Active)' : ''}
                    </Option>
                  ))}
                </Select>
                <Button icon={<SettingOutlined />} onClick={() => setEnvModalVisible(true)}>
                  Environments
                </Button>
                <Button
                  onClick={() => setConsoleOpen(true)}
                  style={{ gap: 8 }}
                  icon={<SnippetsOutlined />}
                >
                  Console ({requestLogs.length})
                </Button>
                <Button
                  onClick={() => setStressTestModalOpen(true)}
                  style={{ gap: 8 }}
                  icon={<ThunderboltOutlined />}
                >
                  Stress Test
                </Button>
                <Button
                  onClick={() => setComparisonOpen(true)}
                  style={{ gap: 8 }}
                  icon={<SwapOutlined />}
                >
                  Compare
                </Button>
              </Space>
            </div>
          </Card>

          {/* Request URL and Method */}
          <Card style={{ marginBottom: 16 }}>
            {activeEnvironment && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 4, border: '1px solid #bae6fd' }}>
                <Space>
                  <Tag color="blue">Active Environment: {activeEnvironment.name}</Tag>
                  {Object.keys(activeEnvironment.variables || {}).length > 0 && (
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {Object.keys(activeEnvironment.variables).length} variable(s) available. Use {'{{variableName}}'} in URL, headers, params, or body.
                    </span>
                  )}
                </Space>
              </div>
            )}
            <Space.Compact style={{ width: '100%' }}>
              <Select
                value={currentRequest.method}
                style={{ width: 120 }}
                onChange={(value) => setCurrentRequest({ ...currentRequest, method: value })}
              >
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="PATCH">PATCH</Option>
                <Option value="DELETE">DELETE</Option>
              </Select>
              <Input
                placeholder="Enter request URL (use {{variableName}} for env vars)"
                value={currentRequest.url}
                onChange={(e) => setCurrentRequest({ ...currentRequest, url: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={handleRunRequest}
                disabled={!currentRequest.url}
              >
                Run
              </Button>
              <Button
                type={hasUnsavedEndpointChanges ? 'primary' : 'default'}
                danger={hasUnsavedEndpointChanges}
                icon={<SaveOutlined />}
                onClick={async () => {
                  if (!selectedEndpointId) {
                    message.error('Please select an API endpoint first');
                    return;
                  }

                  if (!currentRequest.url || currentRequest.url.trim() === '') {
                    message.error('Please enter a URL to save');
                    return;
                  }

                  try {
                    const endpointDocRef = doc(db, 'api_canvas', selectedEndpointId);
                    const endpointSnapshot = await getDoc(endpointDocRef);
                    const existingData = endpointSnapshot.exists() ? endpointSnapshot.data() : {};
                    const existingConfig =
                      existingData?.config && typeof existingData.config === 'object' ? existingData.config : {};

                    const payload = sanitizeFirestorePayload({
                      apiUrl: currentRequest.url.trim(),
                      url_link: currentRequest.url.trim(), // Keep both for compatibility
                      config: {
                        ...existingConfig,
                        method: currentRequest.method,
                        localHeader: JSON.stringify(currentRequest.headers || {}),
                      },
                      requestBody: currentRequest.body || '{}',
                      params: currentRequest.params || {},
                    });

                    if (endpointSnapshot.exists()) {
                      await updateDoc(endpointDocRef, payload);
                    } else {
                      await setDoc(endpointDocRef, payload, { merge: true });
                    }

                    setSavedEndpointSnapshot(
                      serializeEndpointDraftSnapshot(buildEndpointDraftSnapshot(currentRequest))
                    );
                    await loadApiEndpoints();

                    message.success('All request data saved successfully (URL, method, headers, body, params)');
                  } catch (error) {
                    console.error('Save error:', error);
                    message.error(`Failed to save request data: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                disabled={!currentUser?.uid || !selectedEndpointId || !currentRequest.url?.trim()}
              >
                {hasUnsavedEndpointChanges ? 'Save Changes' : 'Save'}
              </Button>
            </Space.Compact>
            {selectedEndpointId && (
              <div style={{ marginTop: 8, fontSize: 12, color: hasUnsavedEndpointChanges ? '#cf1322' : '#8c8c8c' }}>
                {hasUnsavedEndpointChanges ? 'There are unsaved changes for this endpoint.' : 'No unsaved changes.'}
              </div>
            )}
          </Card>

          {/* Request Configuration Tabs */}
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
            
          

              {/* Headers Tab */}
              <TabPane tab={<span><LockOutlined /> Authorization</span>} key="headers">
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Input
                      placeholder="Authorization Token"
                      style={{ width: 300 }}
                      value={currentRequest.headers['Authorization']?.replace('Bearer ', '') || ''}
                      onChange={(e) => {
                        const newHeaders = { ...currentRequest.headers };
                        if (e.target.value) {
                          newHeaders['Authorization'] = `Bearer ${e.target.value}`;
                        } else {
                          delete newHeaders['Authorization'];
                        }
                        setCurrentRequest({ ...currentRequest, headers: newHeaders });
                      }}
                    />
                    <span style={{ color: '#999' }}>Quick Authorization Token</span>
                  </Space>
                </div>
                <Table
                  dataSource={headerRows}
                  columns={keyValueColumns(
                    headerRows,
                    setHeaderRows,
                    (headers) => setCurrentRequest({ ...currentRequest, headers })
                  )}
                  pagination={false}
                  rowKey={(record, index) => index.toString()}
                  size="small"
                />
              </TabPane>

              {/* Body Tab */}
              <TabPane tab={<span><FileTextOutlined /> Body</span>} key="body">
                <div style={{ height: 300, border: '1px solid #d9d9d9' }}>
                  <Editor
                    defaultLanguage="json"
                    value={currentRequest.body}
                    onChange={(value) => setCurrentRequest({ ...currentRequest, body: value || '' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </TabPane>

              {/* Response Tab */}
              <TabPane tab={<span><CheckCircleOutlined /> Response</span>} key="response">
                {response ? (
                  <div>
                    {isCorsLikeErrorResponse && (
                      <Alert
                        type="error"
                        showIcon
                        message={<span style={{ color: '#cf1322', fontWeight: 700, fontSize: 18 }}>CORS Error</span>}
                        description={
                          <div style={{ color: '#a8071a', fontSize: 14, lineHeight: 1.6 }}>
                            <div>This endpoint blocked the browser request or did not return a browser-accessible response.</div>
                            <div style={{ marginTop: 6 }}>
                              This is usually not a DPS issue. The same request may still work in Postman because Postman is not restricted by browser CORS policy.
                            </div>
                            <div style={{ marginTop: 6 }}>
                              If this API must be tested in-browser, the target server needs to allow cross-origin requests.
                            </div>
                          </div>
                        }
                        style={{
                          marginBottom: 16,
                          border: '1px solid #ffccc7',
                          background: '#fff2f0',
                        }}
                      />
                    )}

                    {!isCorsLikeErrorResponse && isHttpErrorResponse && (
                      <Alert
                        type="error"
                        showIcon
                        message={<span style={{ color: '#cf1322', fontWeight: 700, fontSize: 18 }}>HTTP {response.status} Error</span>}
                        description={
                          <span style={{ color: '#a8071a', fontSize: 14 }}>
                            {getHttpErrorDescription(response.status)}
                          </span>
                        }
                        style={{
                          marginBottom: 16,
                          border: '1px solid #ffccc7',
                          background: '#fff2f0',
                        }}
                      />
                    )}

                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Tag color={getStatusColor(response.status)}>
                          {response.status} {response.statusText}
                        </Tag>
                        <span>Time: {response.executionTime}ms</span>
                        <span>Size: {JSON.stringify(response.data).length} bytes</span>
                      </Space>
                    </div>
                    
                    <Tabs defaultActiveKey="body">
                      <TabPane tab="Body" key="body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontWeight: 500 }}>Response Body</span>
                          <Space>
                            <Button
                              size="small"
                              type={responseBodyView === 'raw' ? 'primary' : 'default'}
                              onClick={() => setResponseBodyView('raw')}
                            >
                              Raw View
                            </Button>
                            <Button
                              size="small"
                              type={responseBodyView === 'html' ? 'primary' : 'default'}
                              onClick={() => setResponseBodyView('html')}
                              disabled={!isHtmlResponse}
                            >
                              HTML View
                            </Button>
                          </Space>
                        </div>

                        {responseBodyView === 'html' && isHtmlResponse ? (
                          <div
                            style={{
                              height: 500,
                              border: '1px solid #f0f0f0',
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: '#fff',
                            }}
                          >
                            <iframe
                              title="HTML Response Preview"
                              srcDoc={typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                              sandbox="allow-same-origin"
                            />
                          </div>
                        ) : (
                          <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            {typeof response.data === 'string' ? (
                              <pre
                                style={{
                                  margin: 0,
                                  padding: 12,
                                  background: '#fafafa',
                                  border: '1px solid #f0f0f0',
                                  borderRadius: 8,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontSize: 13,
                                }}
                              >
                                {response.data}
                              </pre>
                            ) : (
                              <ReactJson
                                src={response.data}
                                theme="vscode"
                                enableClipboard={true}
                                collapsed={2}
                              />
                            )}
                          </div>
                        )}
                      </TabPane>
                      <TabPane tab={`Headers (${nonCookieHeaderEntries.length})`} key="headers">
                        <Table
                          dataSource={nonCookieHeaderEntries.map(([key, value]) => ({ key, value }))}
                          columns={[
                            { title: 'Header', dataIndex: 'key', width: '30%' },
                            { title: 'Value', dataIndex: 'value', width: '70%' },
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </TabPane>
                      <TabPane tab={`Cookies (${responseCookieEntries.length})`} key="cookies">
                        {responseCookieEntries.length > 0 ? (
                          <Table
                            dataSource={responseCookieEntries}
                            columns={[
                              { title: 'Cookie', dataIndex: 'value' },
                            ]}
                            pagination={false}
                            size="small"
                            rowKey="key"
                          />
                        ) : (
                          <div style={{ color: '#999', padding: '16px 0' }}>
                            No cookies returned in this response.
                          </div>
                        )}
                      </TabPane>
                    </Tabs>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                    <PlayCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>Run a request to see the response</div>
                  </div>
                )}
              </TabPane>
            </Tabs>
          </Card>
          </>
          )}
        </Content>
      </Layout>
      {/* Environment Management Modal */}
      <Modal
        title="Environment Management"
        open={envModalVisible}
        onCancel={() => setEnvModalVisible(false)}
        footer={null}
        width={900}
      >
        <div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginBottom: 16 }}
            onClick={handleCreateEnvironment}
          >
            New Environment
          </Button>
          
          <Table
            dataSource={environments}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (name, record) => (
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => {
                      if (!record.id) return;
                      setExpandedEnvironmentRowKeys((prev) =>
                        prev.includes(record.id as React.Key) ? [] : [record.id as React.Key]
                      );
                    }}
                  >
                    {name}
                  </Button>
                )
              },
              { 
                title: 'Variables', 
                key: 'variables',
                render: (_, record) => {
                  const varCount = Object.keys(record.variables || {}).length;
                  return <span>{varCount} variable{varCount !== 1 ? 's' : ''}</span>;
                }
              },
              { 
                title: 'Active', 
                dataIndex: 'isActive', 
                key: 'isActive', 
                render: (active, record) => (
                  active ? (
                    <Tag color="green">Active</Tag>
                  ) : (
                    <Button 
                      size="small" 
                      type="link"
                      onClick={() => record.id && handleSetActiveEnvironment(record)}
                    >
                      Set Active
                    </Button>
                  )
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Space>
                    <Button 
                      size="small"
                      onClick={() => handleEditEnvironment(record)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      danger
                      onClick={() => {
                        if (record.id) handleDeleteEnvironment(record.id);
                      }}
                    >
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
            pagination={false}
            size="small"
            rowKey="id"
            expandable={{
              expandedRowKeys: expandedEnvironmentRowKeys,
              expandIcon: () => null,
              onExpandedRowsChange: (expandedKeys) => setExpandedEnvironmentRowKeys(expandedKeys),
              expandedRowRender: (record) => {
                const variableEntries = Object.entries(record.variables || {});

                if (variableEntries.length === 0) {
                  return <span style={{ color: '#999' }}>No variables defined</span>;
                }

                return (
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>
                      Variables for {record.name}
                    </div>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      {variableEntries.map(([key, value]) => (
                        <div
                          key={key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '180px 1fr',
                            gap: 12,
                            padding: '8px 12px',
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 6,
                          }}
                        >
                          <code style={{ fontSize: 12 }}>{key}</code>
                          <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{value}</code>
                        </div>
                      ))}
                    </Space>
                  </div>
                );
              }
            }}
          />
        </div>
      </Modal>

      {/* Environment Form Modal */}
      <Modal
        title={editingEnvironment ? 'Edit Environment' : 'New Environment'}
        open={envFormModalVisible}
        onCancel={() => {
          setEnvFormModalVisible(false);
          setEditingEnvironment(null);
          envForm.resetFields();
        }}
        onOk={() => envForm.submit()}
        width={700}
        okText="Save"
      >
        <Form 
          form={envForm} 
          onFinish={handleSaveEnvironment}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Environment Name"
            rules={[{ required: true, message: 'Please enter environment name' }]}
          >
            <Input placeholder="e.g., Development, Production" />
          </Form.Item>

          <Form.Item
            name="isActive"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>Set as active environment</Checkbox>
          </Form.Item>

          <Form.Item 
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Variables</span>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEnvVarRows([...envVarRows, { key: '', value: '', enabled: true }]);
                  }}
                >
                  Add Variable
                </Button>
              </div>
            }
          >
            <Table
              dataSource={envVarRows}
              columns={keyValueColumns(
                envVarRows,
                setEnvVarRows,
                () => {}, // No need to update request here
                {
                  onBulkPaste: appendEnvironmentPairsFromPaste,
                }
              )}
              pagination={false}
              rowKey={(record, index) => index.toString()}
              size="small"
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              Tip: Variables are automatically added when you fill in the last row. You can also paste `.env` content here and it will be split into separate rows automatically.
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* New API Endpoint Modal */}
      <Modal
        title="New API Endpoint"
        open={newApiModalVisible}
        onCancel={() => {
          setNewApiModalVisible(false);
          setNewApiName('');
          newApiForm.resetFields();
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setNewApiModalVisible(false);
              setNewApiName('');
              newApiForm.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={handleCreateNewAPI}
            disabled={!newApiName.trim()}
          >
            Save
          </Button>
        ]}
      >
        <Form form={newApiForm} layout="vertical">
          <Form.Item
            label="API Endpoint Name"
            required
            rules={[{ required: true, message: 'Please enter API endpoint name' }]}
          >
            <Input
              placeholder="Enter API endpoint name"
              value={newApiName}
              onChange={(e) => setNewApiName(e.target.value)}
              onPressEnter={() => {
                if (newApiName.trim()) {
                  handleCreateNewAPI();
                }
              }}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Canvas Name Modal */}
      <Modal
        title="Edit Canvas Name"
        open={editCanvasModalVisible}
        onCancel={() => {
          setEditCanvasModalVisible(false);
          setEditingEndpoint(null);
          setEditCanvasName('');
          editCanvasForm.resetFields();
        }}
        onOk={handleSaveCanvasName}
        okText="Save"
        cancelText="Cancel"
      >
        <Form 
          form={editCanvasForm} 
          layout="vertical"
          onFinish={handleSaveCanvasName}
        >
          <Form.Item
            name="name"
            label="Canvas Name"
            rules={[{ required: true, message: 'Please enter canvas name' }]}
          >
            <Input
              placeholder="Enter canvas name"
              value={editCanvasName}
              onChange={(e) => setEditCanvasName(e.target.value)}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .selected-request {
          border: 2px solid #1890ff !important;
        }
        .ant-select-item-option:hover .endpoint-option-wrapper .endpoint-edit-button,
        .ant-select-item-option-content:hover .endpoint-option-wrapper .endpoint-edit-button,
        .endpoint-option-wrapper:hover .endpoint-edit-button {
          opacity: 1 !important;
        }
        .ant-select-item-option-selected .endpoint-option-wrapper .endpoint-edit-button {
          opacity: 1 !important;
        }
      `}</style>

      {/* Request Console */}
      <RequestConsole
        open={consoleOpen}
        onClose={() => setConsoleOpen(false)}
        requestLogs={requestLogs}
        onClearLogs={() => setRequestLogs([])}
      />

      {/* Request Comparison */}
      <RequestComparison
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        endpoints={apiEndpoints.map((ep) => {
          const epData = ep as APIEndpoint & { url_link?: string; apiUrl?: string };
          return {
            id: ep.id || '',
            name: ep.name || ep.id || '',
            method: ep.config?.method || 'GET',
            url: epData.url_link || epData.apiUrl || ep.config?.localUrl || '',
            headers: ep.config?.localHeader ? (() => { try { return JSON.parse(ep.config.localHeader); } catch { return {}; } })() : {},
            params: {},
            body: ep.requestBody || '',
          };
        })}
        currentRequest={currentRequest}
        currentResponse={response}
        activeEnvironment={activeEnvironment}
      />

      <Modal
        title="Stress Test"
        open={stressTestModalOpen}
        onCancel={() => setStressTestModalOpen(false)}
        footer={null}
        width={900}
      >
        <div>
          <Alert
            message="Advanced Load Testing"
            description="Use this when you want to simulate repeated requests against an API you own or are authorized to test."
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />

          <Card
            size="small"
            title="Load Test Configuration"
            extra={<Tag color="gold">Advanced</Tag>}
            style={{ marginBottom: 16 }}
          >
            <Form
              form={stressTestForm}
              layout="vertical"
              initialValues={{
                mode: 'count',
                totalRequests: 100,
                concurrency: 10,
                duration: 60,
                delayBetweenRequests: 0
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="mode"
                    label="Test Mode"
                    initialValue="count"
                  >
                    <Select
                      value={stressTestMode}
                      onChange={(value) => {
                        setStressTestMode(value);
                        stressTestForm.setFieldsValue({ mode: value });
                      }}
                    >
                      <Option value="count">Request Count</Option>
                      <Option value="duration">Time Duration</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  {stressTestMode === 'count' ? (
                    <Form.Item
                      name="totalRequests"
                      label="Total Requests"
                      rules={[{ required: true, message: 'Please enter total requests' }]}
                    >
                      <InputNumber
                        min={1}
                        max={10000}
                        style={{ width: '100%' }}
                        placeholder="Number of requests to send"
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="duration"
                      label="Duration (seconds)"
                      rules={[{ required: true, message: 'Please enter duration' }]}
                    >
                      <InputNumber
                        min={1}
                        max={3600}
                        style={{ width: '100%' }}
                        placeholder="Test duration in seconds"
                      />
                    </Form.Item>
                  )}
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="concurrency"
                    label="Concurrency"
                    rules={[{ required: true, message: 'Please enter concurrency' }]}
                    extra="How many requests run in parallel."
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: '100%' }}
                      placeholder="Number of concurrent requests"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="delayBetweenRequests"
                    label="Batch Delay (ms)"
                    tooltip="Delay in milliseconds between batches of concurrent requests"
                    extra="Use 0 for continuous execution."
                  >
                    <InputNumber
                      min={0}
                      max={10000}
                      style={{ width: '100%' }}
                      placeholder="0 = no delay"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartStressTest}
                    disabled={stressTestRunning || !currentRequest.url}
                    loading={stressTestRunning}
                  >
                    Start Test
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStopStressTest}
                    disabled={!stressTestRunning}
                  >
                    Stop Test
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {stressTestStats && (
            <Card title="Test Statistics" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Completed"
                    value={stressTestStats.completedRequests}
                    suffix={`/ ${stressTestStats.totalRequests}`}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Success Rate"
                    value={stressTestStats.completedRequests > 0
                      ? ((stressTestStats.successfulRequests / stressTestStats.completedRequests) * 100).toFixed(1)
                      : 0}
                    suffix="%"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Error Rate"
                    value={stressTestStats.errorRate}
                    suffix="%"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Requests/Second"
                    value={stressTestStats.requestsPerSecond}
                    precision={2}
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={stressTestStats.totalRequests > 0
                    ? (stressTestStats.completedRequests / stressTestStats.totalRequests) * 100
                    : 0}
                  status={stressTestRunning ? 'active' : 'success'}
                />
              </div>

              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={8}>
                  <Statistic
                    title="Avg Response Time"
                    value={stressTestStats.averageResponseTime}
                    suffix="ms"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Min Response Time"
                    value={stressTestStats.minResponseTime}
                    suffix="ms"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Max Response Time"
                    value={stressTestStats.maxResponseTime}
                    suffix="ms"
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 24 }}>
                <h4>Status Code Distribution</h4>
                <Space wrap>
                  {Object.entries(stressTestStats.statusCodeDistribution).map(([status, count]) => (
                    <Tag key={status} color={getStatusColor(Number(status))}>
                      {status}: {count}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div style={{ marginTop: 16 }}>
                <Statistic
                  title="Test Duration"
                  value={Math.round(stressTestStats.duration / 1000)}
                  suffix="seconds"
                />
              </div>
            </Card>
          )}

          {stressTestRunning && (
            <Card>
              <Spin tip="Running stress test..." size="large">
                <div style={{ minHeight: 100 }} />
              </Spin>
            </Card>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default ApiEditor;

