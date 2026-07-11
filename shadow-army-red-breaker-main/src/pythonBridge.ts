import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import readline from 'readline';
import { safeJsonStringify, auditLog } from './utils';

type AnalysisResponse = {
  id: string;
  status: 'ok' | 'error';
  result?: any;
  error?: string;
};

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
};

const PYTHON_SCRIPT = path.resolve(__dirname, '..', 'core', 'analysis_service.py');
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python3';
const DEFAULT_TIMEOUT = Number(process.env.THREAT_ANALYSIS_TIMEOUT || 5000);

class PythonThreatService {
  private process: ChildProcessWithoutNullStreams;
  private pending = new Map<string, PendingRequest>();
  private idCounter = 0;

  constructor() {
    this.process = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdout = readline.createInterface({ input: this.process.stdout });
    stdout.on('line', this.handleResponse.bind(this));

    this.process.stderr.on('data', chunk => {
      const message = chunk.toString();
      auditLog('python.stderr', { message });
    });

    this.process.on('exit', (code, signal) => {
      auditLog('python.process_exit', { code, signal });
      for (const pending of this.pending.values()) {
        pending.reject(new Error('Python service terminated unexpectedly')); 
      }
      this.pending.clear();
    });
  }

  private handleResponse(raw: string) {
    try {
      const response: AnalysisResponse = JSON.parse(raw);
      const pending = this.pending.get(response.id);
      if (!pending) {
        auditLog('python.unmatched_response', { response: raw });
        return;
      }
      clearTimeout(pending.timeout);
      this.pending.delete(response.id);

      if (response.status === 'ok') {
        pending.resolve(response.result);
      } else {
        pending.reject(new Error(response.error || 'Python analysis error'));
      }
    } catch (error) {
      auditLog('python.invalid_response', { raw, error: String(error) });
    }
  }

  private buildRequestId(): string {
    this.idCounter += 1;
    return `req-${Date.now()}-${this.idCounter}`;
  }

  public async analyze(signals: any[], options: { threshold?: number; min_confidence?: number } = {}): Promise<any> {
    return this.sendCommand('analyze', { signals, ...options });
  }

  public async evaluate(signals: any[], options: { threshold?: number; min_confidence?: number } = {}): Promise<any> {
    return this.sendCommand('evaluate', { signals, ...options });
  }

  public shutdown(): void {
    if (!this.process.killed) {
      this.process.kill();
    }
  }

  private sendCommand(command: string, payload: any): Promise<any> {
    const id = this.buildRequestId();

    const request = { id, command, payload };
    auditLog('python.request', { request });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Python analysis timeout after ${DEFAULT_TIMEOUT}ms`));
      }, DEFAULT_TIMEOUT);

      this.pending.set(id, { resolve, reject, timeout });
      this.process.stdin.write(`${safeJsonStringify(request)}\n`);
    });
  }
}

export const pythonThreatService = new PythonThreatService();
