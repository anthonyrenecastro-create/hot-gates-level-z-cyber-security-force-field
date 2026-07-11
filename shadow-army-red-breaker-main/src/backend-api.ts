import express, { Request, Response } from 'express';
import cors from 'cors';
import { evaluateHotGate } from '../services/hotGates';
import { pythonThreatService } from './pythonBridge';
import { parseUserTier, validateEvaluateRequest, validateThreatSignals, requireApiKey, getClientId } from './validators';
import { mapScoreToRiskLevel, mapThreatLevelToRiskLevel, auditLog, enforceObservationOnly, buildBatchId } from './utils';
import { consumeRateLimit } from './rateLimiter';

const app = express();
const PORT = process.env.PORT || 4000;
const RUN_MODE = process.env.RUN_MODE || 'observation';

app.use(cors());
app.use(express.json());

// API Documentation Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Shadow Army Red Breaker',
    version: '2.0.0',
    description: 'Threat Intelligence-Governed Security Gateway',
    architecture: 'Backend API for existing security systems',
    components: {
      threatIntelligence: {
        sources: ['OSINT', 'Cyber', 'Economics', 'Supply Chain', 'InfoOps', 'Satellite', 'Diplomacy'],
        capabilities: ['Multi-domain threat fusion', 'Real-time risk scoring', 'Confidence normalization']
      },
      hotGates: {
        features: ['Risk-based access control', 'Service routing', 'Tier-based throttling'],
        integration: 'Governed by threat intelligence scores'
      }
    },
    endpoints: {
      '/': { method: 'GET', description: 'API documentation (this page)' },
      '/health': { method: 'GET', description: 'System health check' },
      '/api/evaluate': { 
        method: 'POST', 
        description: 'Evaluate request with threat-informed gate decision',
        body: {
          service: 'string (eden|elevenlabs|ollama)',
          action: 'string',
          payload: 'object',
          threatSignals: 'array<ThreatSignal> (optional)',
          userTier: 'string (free|pro) - via x-user-tier header',
          capabilities: 'array<string> (chat, voice, local_llm)'
        },
        response: {
          allowed: 'boolean',
          service: 'string',
          riskLevel: 'string',
          threatScore: 'number',
          gateDecision: 'object',
          reason: 'string (if denied)'
        }
      },
      '/api/threat/analyze': { 
        method: 'POST', 
        description: 'Standalone threat intelligence analysis',
        body: { signals: 'array<ThreatSignal>' }
      },
      '/api/evaluate/batch': { 
        method: 'POST', 
        description: 'Batch evaluation for multiple requests',
        body: { requests: 'array<EvaluateRequest>' }
      }
    },
    integration: {
      usage: 'POST to /api/evaluate with threat signals for intelligence-governed decisions',
      authentication: 'x-api-key header (optional, configure via API_KEY env var)',
      riskMapping: {
        low: 'Threat score 0-5 → minimal restrictions',
        medium: 'Threat score 5-8 → moderate controls',
        high: 'Threat score 8+ → strict controls or denial'
      },
      embedding: 'Use as middleware in existing Express apps or standalone microservice'
    },
    examples: {
      basic: {
        endpoint: '/api/evaluate',
        method: 'POST',
        headers: { 'x-user-tier': 'pro' },
        body: {
          service: 'eden',
          action: 'chat',
          payload: { capabilities: ['chat'] }
        }
      },
      withThreatIntel: {
        endpoint: '/api/evaluate',
        method: 'POST',
        headers: { 'x-user-tier': 'pro' },
        body: {
          service: 'eden',
          action: 'chat',
          payload: { capabilities: ['chat'] },
          threatSignals: [
            { type: 'cyber', value: 0.8, region: 'GLOBAL', narrative: 'Elevated DDoS activity' }
          ]
        }
      }
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    components: {
      threatIntelligence: 'ready',
      hotGates: 'ready',
      api: 'ready'
    }
  });
});

// Core evaluation endpoint - Threat Intelligence + Hot Gates
app.post('/api/evaluate', async (req: Request, res: Response) => {
  try {
    if (!requireApiKey(req, res)) {
      return;
    }

    const validation = validateEvaluateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid request', details: validation.errors });
    }

    const { service, action, payload, threatSignals, capabilities } = req.body;
    const userTier = parseUserTier(req);
    const clientId = getClientId(req);

    const rate = consumeRateLimit(clientId);
    if (!rate.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rate.reset, remaining: rate.remaining });
    }

    let threatScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let threatAnalysis: any = null;

    if (threatSignals && Array.isArray(threatSignals) && threatSignals.length > 0) {
      const signalValidation = validateThreatSignals(threatSignals);
      if (!signalValidation.valid) {
        return res.status(400).json({ error: 'Invalid threat signals', details: signalValidation.errors });
      }

      const parsedSignals = signalValidation.parsed || [];
      let analysisFailed = false;
      try {
        threatAnalysis = await pythonThreatService.analyze(parsedSignals, {
          threshold: Number(process.env.THREAT_THRESHOLD || 7.0),
          min_confidence: Number(process.env.MIN_CONFIDENCE || 0.5)
        });

        threatScore = threatAnalysis.scoring.overall_score;
        riskLevel = mapThreatLevelToRiskLevel(threatAnalysis.scoring?.threat_level || String(threatScore));
      } catch (analysisError: any) {
        auditLog('threat_analysis_failure', { clientId, error: analysisError.message, mode: RUN_MODE });
        analysisFailed = true;
        threatAnalysis = { error: analysisError.message, failed: true };
        if (enforceObservationOnly(RUN_MODE)) {
          threatScore = 0;
          riskLevel = 'low';
        } else {
          threatScore = 10;
          riskLevel = 'high';
        }
      }
    }

    const requestedCapabilities = capabilities || payload?.capabilities || [];
    const gateDecision = evaluateHotGate({
      intent: action || 'request',
      riskLevel,
      requiredCapabilities: requestedCapabilities,
      userTier
    });

    const analysisFailed = threatAnalysis?.failed === true;
    const failClosed = analysisFailed && !enforceObservationOnly(RUN_MODE);
    const allowed = gateDecision.allowed && !failClosed;

    auditLog('api.evaluate', {
      clientId,
      service,
      action,
      riskLevel,
      threatScore,
      gateDecision: gateDecision.allowed ? 'allowed' : 'denied',
      analysisFailed,
      failClosed,
      runMode: RUN_MODE
    });

    if (allowed) {
      return res.status(200).json({
        allowed: true,
        service: gateDecision.route || service,
        riskLevel,
        threatScore,
        gateDecision: {
          confidence: gateDecision.confidence,
          routedService: gateDecision.route
        },
        threatAnalysis,
        mode: RUN_MODE,
        message: 'Request approved by threat-informed gate'
      });
    }

    if (analysisFailed) {
      return res.status(403).json({
        allowed: false,
        service,
        riskLevel,
        threatScore,
        gateDecision,
        threatAnalysis,
        reason: 'Threat analysis failed - fail closed',
        mode: RUN_MODE
      });
    }

    return res.status(403).json({
      allowed: false,
      service,
      riskLevel,
      threatScore,
      gateDecision,
      threatAnalysis,
      reason: `Access denied by security gate${gateDecision.reason ? `: ${gateDecision.reason}` : ''}`
    });
  } catch (error: any) {
    auditLog('api.evaluate.exception', { error: error.message });
    res.status(500).json({
      error: 'Evaluation failed',
      message: error.message
    });
  }
});

// Standalone threat analysis
app.post('/api/threat/analyze', async (req: Request, res: Response) => {
  try {
    if (!requireApiKey(req, res)) {
      return;
    }

    const { signals } = req.body;
    if (!Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({ error: 'No signals provided' });
    }

    const validation = validateThreatSignals(signals);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid threat signals', details: validation.errors });
    }

    const parsedSignals = validation.parsed || [];
    const clientId = getClientId(req);

    try {
      const analysis = await pythonThreatService.analyze(parsedSignals, {
        threshold: Number(process.env.THREAT_THRESHOLD || 7.0),
        min_confidence: Number(process.env.MIN_CONFIDENCE || 0.5)
      });

      auditLog('api.threat_analyze', { clientId, signalCount: parsedSignals.length });
      return res.json({ status: 'ok', result: analysis });
    } catch (analysisError: any) {
      auditLog('api.threat_analyze_fail', { clientId, error: analysisError.message });
      return res.status(503).json({ error: 'Threat analysis unavailable', details: analysisError.message });
    }
  } catch (error: any) {
    auditLog('api.threat_analyze.exception', { error: error.message });
    res.status(500).json({
      error: 'Threat analysis failed',
      message: error.message
    });
  }
});

// Batch evaluation endpoint
app.post('/api/evaluate/batch', async (req: Request, res: Response) => {
  try {
    if (!requireApiKey(req, res)) {
      return;
    }

    const { requests } = req.body;
    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'Requests must be an array' });
    }

    const clientId = getClientId(req);
    const results: any[] = [];

    for (let index = 0; index < requests.length; index++) {
      const request = requests[index];
      const batchId = buildBatchId(request, index);

      try {
        const validation = validateEvaluateRequest(request);
        if (!validation.valid) {
          results.push({ id: batchId, error: 'Invalid request', details: validation.errors });
          continue;
        }

        const threatSignalValidation = request.threatSignals ? validateThreatSignals(request.threatSignals) : { valid: true, parsed: [] };
        if (!threatSignalValidation.valid) {
          results.push({ id: batchId, error: 'Invalid threat signals', details: threatSignalValidation.errors });
          continue;
        }

        const parsedSignals = threatSignalValidation.parsed || [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        let threatScore = 0;

        if (parsedSignals.length > 0) {
          try {
            const analysis = await pythonThreatService.analyze(parsedSignals, {
              threshold: Number(process.env.THREAT_THRESHOLD || 7.0),
              min_confidence: Number(process.env.MIN_CONFIDENCE || 0.5)
            });
            threatScore = analysis.scoring.overall_score;
            riskLevel = mapThreatLevelToRiskLevel(analysis.scoring?.threat_level || String(threatScore));
          } catch {
            threatScore = 5;
            riskLevel = 'medium';
          }
        }

        const gateDecision = evaluateHotGate({
          intent: request.action || 'request',
          riskLevel,
          requiredCapabilities: request.capabilities || [],
          userTier: request.userTier || 'free'
        });

        results.push({
          id: batchId,
          allowed: gateDecision.allowed,
          service: gateDecision.route || request.service,
          riskLevel,
          threatScore,
          confidence: gateDecision.confidence,
          reason: gateDecision.reason
        });
      } catch (error: any) {
        results.push({ id: batchId, error: error.message });
      }
    }

    auditLog('api.batch_evaluate', { clientId, count: results.length });
    res.json({ results, total: results.length });
  } catch (error: any) {
    auditLog('api.batch_evaluate.exception', { error: error.message });
    res.status(500).json({
      error: 'Batch evaluation failed',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n======================================================================');
  console.log('  🔥 SHADOW ARMY RED BREAKER - BACKEND API');
  console.log('======================================================================\n');
  console.log(`  🚀 Server running on http://localhost:${PORT}`);
  console.log('\n  📊 Components:');
  console.log('     ✓ Threat Intelligence Engine (Python)');
  console.log('     ✓ Hot Gates Security Layer (TypeScript)');
  console.log('     ✓ RESTful API (Express)');
  console.log('\n  🔌 Integration:');
  console.log(`     API Docs: http://localhost:${PORT}/`);
  console.log(`     Evaluate: POST http://localhost:${PORT}/api/evaluate`);
  console.log(`     Health:   GET  http://localhost:${PORT}/health`);
  console.log('\n  🎯 Use Case:');
  console.log('     Embed as middleware in existing security systems');
  console.log('     Threat intelligence governs all gate decisions');
  console.log('     No GUI - pure backend for system integration');
  console.log('\n======================================================================\n');
});
