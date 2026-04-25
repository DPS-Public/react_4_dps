import { ApiRequest, ApiResponse, StressTestConfig, StressTestResult, StressTestStats } from '../types/api';
import { executeRequest } from './apiService';

export class StressTestController {
  private isRunning: boolean = false;
  private isCancelled: boolean = false;
  private startTime: Date = new Date();
  private results: StressTestResult[] = [];
  private onProgress?: (stats: StressTestStats) => void;
  private onComplete?: (stats: StressTestStats) => void;
  private onError?: (error: Error) => void;

  constructor(
    private request: ApiRequest,
    private config: StressTestConfig,
    private environment?: Record<string, string>
  ) {}

  setCallbacks(
    onProgress?: (stats: StressTestStats) => void,
    onComplete?: (stats: StressTestStats) => void,
    onError?: (error: Error) => void
  ) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  cancel() {
    this.isCancelled = true;
    this.isRunning = false;
  }

  private calculateStats(): StressTestStats {
    const completed = this.results.length;
    const successful = this.results.filter(r => r.response.status >= 200 && r.response.status < 300).length;
    const failed = completed - successful;
    
    const responseTimes = this.results.map(r => r.response.executionTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    const now = new Date();
    const duration = now.getTime() - this.startTime.getTime();
    const requestsPerSecond = duration > 0 ? (completed / duration) * 1000 : 0;

    const statusCodeDistribution: Record<number, number> = {};
    this.results.forEach(result => {
      const status = result.response.status;
      statusCodeDistribution[status] = (statusCodeDistribution[status] || 0) + 1;
    });

    const errorRate = completed > 0 ? (failed / completed) * 100 : 0;

    return {
      totalRequests: this.config.totalRequests,
      completedRequests: completed,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: Math.round(avgResponseTime),
      minResponseTime,
      maxResponseTime,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      statusCodeDistribution,
      errorRate: Math.round(errorRate * 100) / 100,
      startTime: this.startTime,
      duration,
      endTime: this.isCancelled ? undefined : now
    };
  }

  private async executeSingleRequest(index: number): Promise<void> {
    if (this.isCancelled) return;

    try {
      const response = await executeRequest(this.request, this.environment);
      this.results.push({
        requestIndex: index,
        response,
        timestamp: new Date()
      });

      if (this.onProgress) {
        this.onProgress(this.calculateStats());
      }
    } catch (error) {
      const errorResponse: ApiResponse = {
        status: 0,
        statusText: 'Error',
        headers: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        executionTime: 0,
        timestamp: new Date()
      };

      this.results.push({
        requestIndex: index,
        response: errorResponse,
        timestamp: new Date()
      });

      if (this.onProgress) {
        this.onProgress(this.calculateStats());
      }
    }
  }

  private async runBatch(requests: number[]): Promise<void> {
    await Promise.all(requests.map(index => this.executeSingleRequest(index)));
  }

  async run(): Promise<StressTestStats> {
    if (this.isRunning) {
      throw new Error('Stress test is already running');
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.startTime = new Date();
    this.results = [];

    try {
      // Time-based DDoS mode
      if (this.config.duration) {
        const endTime = this.startTime.getTime() + (this.config.duration * 1000);
        let requestIndex = 0;
        const delay = this.config.delayBetweenRequests || 0;

        while (Date.now() < endTime && !this.isCancelled) {
          const batch: number[] = [];
          for (let i = 0; i < this.config.concurrency && !this.isCancelled; i++) {
            batch.push(requestIndex++);
          }

          if (batch.length > 0) {
            await this.runBatch(batch);
          }

          if (delay > 0 && !this.isCancelled) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } else {
        // Request count-based stress test
        const batches: number[][] = [];
        for (let i = 0; i < this.config.totalRequests; i += this.config.concurrency) {
          const batch: number[] = [];
          for (let j = 0; j < this.config.concurrency && i + j < this.config.totalRequests; j++) {
            batch.push(i + j);
          }
          batches.push(batch);
        }

        for (const batch of batches) {
          if (this.isCancelled) break;
          await this.runBatch(batch);
          
          if (this.config.delayBetweenRequests && this.config.delayBetweenRequests > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
          }
        }
      }

      const finalStats = this.calculateStats();
      this.isRunning = false;

      if (this.onComplete) {
        this.onComplete(finalStats);
      }

      return finalStats;
    } catch (error) {
      this.isRunning = false;
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (this.onError) {
        this.onError(err);
      }
      throw err;
    }
  }
}

export const createStressTest = (
  request: ApiRequest,
  config: StressTestConfig,
  environment?: Record<string, string>
): StressTestController => {
  return new StressTestController(request, config, environment);
};
