/**
 * Canonical ThreatSignal Schema
 *
 * This interface defines the standard format for threat signals
 * used across the entire system (TypeScript → Python integration).
 */
export interface ThreatSignal {
  /** Source subsystem that generated the signal */
  source?: string;
  /** Source/type of threat (cyber, infops, economic, etc.) */
  category: string;
  /** Brief description of the threat */
  summary: string;
  /** Geographic region (GLOBAL, US, ASIA, etc.) */
  region: string;
  /** Threat value/intensity (0.0 - 1.0) */
  value: number;
  /** Confidence in signal (0.0 - 1.0, default: 0.8) */
  confidence?: number;
  /** Severity level (0.0 - 1.0, default: 0.5) */
  severity?: number;
  /** Additional contextual data */
  metadata?: Record<string, any>;
}

/**
 * Validates a threat signal object
 */
export function validateThreatSignal(signal: any): signal is ThreatSignal {
  const category = typeof signal?.category === 'string' || typeof signal?.type === 'string';
  const summary = typeof signal?.summary === 'string' || typeof signal?.narrative === 'string';
  const region = typeof signal?.region === 'string';
  const value = typeof signal?.value === 'number' && signal.value >= 0 && signal.value <= 1;

  return (
    typeof signal === 'object' &&
    signal !== null &&
    category &&
    summary &&
    region &&
    value
  );
}

export function buildThreatSignal(signal: any): ThreatSignal {
  const category = typeof signal?.category === 'string' ? signal.category : typeof signal?.type === 'string' ? signal.type : 'UNKNOWN';
  const summary = typeof signal?.summary === 'string' ? signal.summary : typeof signal?.narrative === 'string' ? signal.narrative : 'Threat indicator';
  const value = typeof signal?.value === 'number' ? Math.max(0, Math.min(1, signal.value)) : 0.0;
  const confidence = typeof signal?.confidence === 'number' ? Math.max(0, Math.min(1, signal.confidence)) : 0.8;
  const severity = typeof signal?.severity === 'number' ? Math.max(0, Math.min(1, signal.severity)) : value;

  return {
    source: typeof signal?.source === 'string' ? signal.source : String(category).toLowerCase(),
    category: String(category).toUpperCase(),
    summary,
    region: typeof signal?.region === 'string' ? signal.region : 'GLOBAL',
    value,
    confidence,
    severity,
    metadata: typeof signal?.metadata === 'object' && signal.metadata !== null ? signal.metadata : {}
  };
}
