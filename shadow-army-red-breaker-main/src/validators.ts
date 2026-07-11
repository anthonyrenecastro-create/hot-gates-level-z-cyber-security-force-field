import { Request, Response } from 'express';
import { ThreatSignal, buildThreatSignal, validateThreatSignal } from './types/ThreatSignal';

export type EvaluateRequestBody = {
  service: string;
  action: string;
  payload?: Record<string, any>;
  threatSignals?: unknown[];
  capabilities?: string[];
};

const VALID_SERVICES = new Set(['eden', 'elevenlabs', 'ollama']);
const VALID_TIERS = new Set(['free', 'pro']);
const VALID_CAPABILITIES = new Set(['chat', 'voice', 'local_llm']);
const MAX_THREAT_SIGNALS = Number(process.env.MAX_THREAT_SIGNALS || 100);

export function parseUserTier(req: Request): 'free' | 'pro' {
  const candidate = String(req.headers['x-user-tier'] || 'free').toLowerCase();
  return VALID_TIERS.has(candidate) ? (candidate as 'free' | 'pro') : 'free';
}

export function validateThreatSignals(signals: unknown[]): { valid: boolean; errors?: string[]; parsed?: ThreatSignal[] } {
  if (!Array.isArray(signals)) {
    return { valid: false, errors: ['threatSignals must be an array'] };
  }

  if (signals.length > MAX_THREAT_SIGNALS) {
    return { valid: false, errors: [`Maximum threatSignals is ${MAX_THREAT_SIGNALS}`] };
  }

  const parsedSignals: ThreatSignal[] = [];
  const errors: string[] = [];

  signals.forEach((signal, index) => {
    if (!validateThreatSignal(signal)) {
      errors.push(`signal[${index}] invalid or missing required fields`);
      return;
    }

    parsedSignals.push(buildThreatSignal(signal));
  });

  return { valid: errors.length === 0, errors: errors.length ? errors : undefined, parsed: errors.length ? undefined : parsedSignals };
}

export function validateEvaluateRequest(body: any): { valid: boolean; errors?: string[]; payload?: EvaluateRequestBody } {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  if (!body.service || typeof body.service !== 'string' || !VALID_SERVICES.has(body.service)) {
    errors.push(`service must be one of: ${Array.from(VALID_SERVICES).join(', ')}`);
  }

  if (!body.action || typeof body.action !== 'string') {
    errors.push('action must be a non-empty string');
  }

  if (body.capabilities !== undefined) {
    if (!Array.isArray(body.capabilities) || body.capabilities.some((c: unknown) => typeof c !== 'string' || !VALID_CAPABILITIES.has(c))) {
      errors.push(`capabilities must be an array of ${Array.from(VALID_CAPABILITIES).join(', ')}`);
    }
  }

  if (body.threatSignals !== undefined && !Array.isArray(body.threatSignals)) {
    errors.push('threatSignals must be an array');
  }

  return { valid: errors.length === 0, errors: errors.length ? errors : undefined, payload: errors.length ? undefined : body };
}

export function requireApiKey(req: Request, res: Response): boolean {
  const configuredKey = process.env.API_KEY?.trim();
  if (!configuredKey) {
    return true;
  }

  const providedKey = String(req.headers['x-api-key'] || '');
  if (providedKey !== configuredKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return false;
  }

  return true;
}

export function getClientId(req: Request): string {
  return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
}
