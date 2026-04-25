import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiRequest, ApiResponse } from '../types/api';

const isGoogleAppsScriptUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'script.google.com' ||
      parsedUrl.hostname === 'script.googleusercontent.com'
    );
  } catch {
    return false;
  }
};

const SIMPLE_HEADERS = new Set([
  'accept',
  'accept-language',
  'content-language',
  'content-type',
]);

const CORS_PROXY_PREFIXES = [
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

const removeUrlHash = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    return url.split('#')[0];
  }
};

const isCrossOriginUrl = (url: string): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return new URL(url, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
};

const sanitizeHeadersForPublicProxy = (headers: Record<string, string>): Record<string, string> => {
  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (!value) return acc;

    const normalizedKey = key.toLowerCase();

    // Never forward auth secrets to a public proxy.
    if (['authorization', 'cookie', 'x-api-key'].includes(normalizedKey)) {
      return acc;
    }

    if (SIMPLE_HEADERS.has(normalizedKey) || normalizedKey.startsWith('x-')) {
      acc[key] = value;
    }

    return acc;
  }, {});
};

const executeViaCorsProxy = async (
  request: ApiRequest,
  processedUrl: string,
  processedHeaders: Record<string, string>,
  timeout: number
): Promise<AxiosResponse> => {
  let lastError: unknown;

  for (const prefix of CORS_PROXY_PREFIXES) {
    try {
      const proxyResponse = await fetch(prefix + encodeURIComponent(processedUrl), {
        method: request.method,
        headers: sanitizeHeadersForPublicProxy(processedHeaders),
        signal: AbortSignal.timeout(timeout),
      });

      const contentType = proxyResponse.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await proxyResponse.json()
        : await proxyResponse.text();

      return {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText || 'OK',
        headers: Object.fromEntries(proxyResponse.headers.entries()),
        data,
        config: {} as AxiosRequestConfig,
        request: null,
      } as AxiosResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('CORS proxy request failed');
};

export const executeRequest = async (
  request: ApiRequest,
  environment?: Record<string, string>
): Promise<ApiResponse> => {
  const startTime = Date.now();
  
  try {
    // Helper function to replace environment variables in a string
    const replaceVariables = (text: string, env: Record<string, string>): string => {
      let result = text;
      Object.entries(env).forEach(([key, value]) => {
        // Support both {key} and {{key}} formats
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // This regex matches both {key} and {{key}}
        const pattern = new RegExp(`{{?${escapedKey}}}?`, 'g');
        result = result.replace(pattern, value);
      });
      return result;
    };

    // Replace environment variables in URL, headers, params, and body
    let processedUrl = request.url;
    const processedHeaders = { ...request.headers };
    const processedParams = { ...request.params };
    let processedBody = request.body;
    
    if (environment) {
      // Replace in URL
      processedUrl = replaceVariables(processedUrl, environment);
      
      // Replace in headers
      Object.keys(processedHeaders).forEach(headerKey => {
        processedHeaders[headerKey] = replaceVariables(processedHeaders[headerKey], environment);
      });
      
      // Replace in params
      Object.keys(processedParams).forEach(paramKey => {
        processedParams[paramKey] = replaceVariables(processedParams[paramKey], environment);
      });
      
      // Replace in body
      if (processedBody) {
        processedBody = replaceVariables(processedBody, environment);
      }
    }

    processedUrl = removeUrlHash(processedUrl);
    
    // Prepare axios config
    const config: AxiosRequestConfig = {
      method: request.method.toLowerCase() as any,
      url: processedUrl,
      headers: processedHeaders,
      params: processedParams,
      timeout: 30000, // 30 second timeout
      validateStatus: () => true // Don't throw error for non-2xx status codes
    };
    
    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && processedBody) {
      try {
        config.data = JSON.parse(processedBody);
      } catch {
        config.data = processedBody;
      }
    }

    if (isGoogleAppsScriptUrl(processedUrl)) {
      const sanitizedHeaders = Object.entries(processedHeaders).reduce<Record<string, string>>((acc, [key, value]) => {
        if (!value) return acc;

        const normalizedKey = key.toLowerCase();
        if (!SIMPLE_HEADERS.has(normalizedKey)) {
          return acc;
        }

        if (
          normalizedKey === 'content-type' &&
          ![
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain',
          ].some((allowedType) => value.toLowerCase().includes(allowedType))
        ) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {});

      config.headers = sanitizedHeaders;

      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        if (typeof config.data === 'object' && config.data !== null && !(config.data instanceof FormData)) {
          config.data = JSON.stringify(config.data);
        }

        if (typeof config.data === 'string') {
          config.headers = {
            ...sanitizedHeaders,
            'Content-Type': 'text/plain;charset=UTF-8',
          };
        }
      }
    }
    
    let response: AxiosResponse;

    try {
      response = await axios(config);
    } catch (error: any) {
      const canTryCorsProxy =
        request.method === 'GET' &&
        isCrossOriginUrl(processedUrl) &&
        !isGoogleAppsScriptUrl(processedUrl);

      if (!error?.request || !canTryCorsProxy) {
        throw error;
      }

      response = await executeViaCorsProxy(request, processedUrl, processedHeaders, config.timeout || 30000);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      data: response.data,
      executionTime,
      timestamp: new Date()
    };
    
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    if (error.response) {
      // Server responded with error status
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers as Record<string, string>,
        data: error.response.data,
        executionTime,
        timestamp: new Date()
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: 'No response received', message: error.message },
        executionTime,
        timestamp: new Date()
      };
    } else {
      // Something else happened
      return {
        status: 0,
        statusText: 'Request Error',
        headers: {},
        data: { error: 'Request setup failed', message: error.message },
        executionTime,
        timestamp: new Date()
      };
    }
  }
};
