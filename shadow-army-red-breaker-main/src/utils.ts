import { ThreatSignal } from './types/ThreatSignal';

export function mapScoreToRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 8.0) return 'high';
  if (score >= 2.0) return 'medium';
  return 'low';
}

export function mapThreatLevelToRiskLevel(threatLevel: string): 'low' | 'medium' | 'high' {
  const normalized = String(threatLevel).trim().toUpperCase();
  if (normalized === 'LOW') return 'low';
  if (['MODERATE', 'ELEVATED'].includes(normalized)) return 'medium';
  return 'high';
}

export function auditLog(event: string, payload: Record<string, any>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    payload
  };

  // In production this should write to a structured log store.
  console.log(JSON.stringify(entry));
}

export function normalizeServiceRoute(capabilities: string[]): string | undefined {
  const routeMap: Record<string, string> = {
    chat: 'eden',
    voice: 'elevenlabs',
    local_llm: 'ollama'
  };

  return capabilities.map(cap => routeMap[cap]).find(Boolean);
}

export function safeJsonStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: 'unserializable payload' });
  }
}

export function buildBatchId(request: any, index: number): string {
  return request.id || `batch-${index + 1}`;
}

export function enforceObservationOnly(mode: string): boolean {
  return mode === 'observation';
}
