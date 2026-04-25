export interface ApiRequest {
  id?: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  executionTime: number;
  timestamp: Date;
}

export interface Environment {
  id?: string;
  name: string;
  variables: Record<string, string>;
  isActive: boolean;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RequestHistory {
  id?: string;
  requestId: string;
  request: ApiRequest;
  response: ApiResponse;
  timestamp: Date;
  userId: string;
}

export interface StressTestConfig {
  totalRequests: number;
  concurrency: number;
  duration?: number; // in seconds, for DDoS mode
  delayBetweenRequests?: number; // in milliseconds
}

export interface StressTestResult {
  requestIndex: number;
  response: ApiResponse;
  timestamp: Date;
}

export interface StressTestStats {
  totalRequests: number;
  completedRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  statusCodeDistribution: Record<number, number>;
  errorRate: number;
  startTime: Date;
  endTime?: Date;
  duration: number; // in milliseconds
}
