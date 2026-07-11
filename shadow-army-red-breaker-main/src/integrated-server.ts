/**
 * @deprecated
 * 
 * This file is DEPRECATED. Use backend-api.ts instead.
 * 
 * backend-api.ts is the canonical entrypoint with:
 * - Threat intelligence integration
 * - Hot gates security layer
 * - Proper schema conformance
 * - Robust path resolution
 * - No GUI (pure backend)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { evaluateHotGate } from '../services/hotGates';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// System info API
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    system: 'Shadow Army Red Breaker - Integrated Intelligence & Security',
    version: '1.0.0',
    status: 'operational',
    components: {
      hotGates: 'active',
      threatIntelligence: 'active',
      gui: 'active'
    }
  });
});

// Threat intelligence endpoint - analyze signals
app.post('/api/threat/analyze', async (req: Request, res: Response) => {
  try {
    const { signals } = req.body;
    
    // Call Python threat intelligence system
    const pythonScript = `
import sys
import json
sys.path.insert(0, '/workspaces/shadow-army-red-breaker')

from sources.cyber import ingest_cyber_telemetry
from sources.infops import ingest_infops
from sources.economics import ingest_economic_indicator
from core.normalizer import normalize_all
from core.scorer import score_breakdown
from core.gates import ThreatGate

signals = []
for sig in ${JSON.stringify(signals)}:
    if sig['type'] == 'cyber':
        signals.append(ingest_cyber_telemetry(sig['value'], sig['region']))
    elif sig['type'] == 'infops':
        signals.append(ingest_infops(sig['value'], sig.get('narrative', 'unknown'), sig['region']))
    elif sig['type'] == 'economic':
        signals.append(ingest_economic_indicator(sig.get('indicator', 'unknown'), sig['value'], sig['region']))

normalized = normalize_all(signals)
breakdown = score_breakdown(normalized)
gate = ThreatGate(threshold=6.0, min_confidence=0.5)
result = gate.evaluate(normalized)

output = {
    'scoring': breakdown,
    'gate': result
}
print(json.dumps(output))
`;
    
    const { stdout } = await execAsync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`);
    const result = JSON.parse(stdout);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Threat analysis failed', message: error.message });
  }
});

// Integrated proxy endpoint - combines threat intel + hot gates
app.post('/api/proxy', async (req: Request, res: Response) => {
  const { service, action, payload, threatSignals } = req.body;

  console.log('\n🔥 Integrated Request:');
  console.log('  Service:', service);
  console.log('  Action:', action);
  console.log('  Threat Signals:', threatSignals?.length || 0);

  let riskLevel = payload?.riskLevel || 'low';
  let threatScore = 0;

  // If threat signals provided, analyze them first
  if (threatSignals && threatSignals.length > 0) {
    try {
      const pythonScript = `
import sys
import json
sys.path.insert(0, '/workspaces/shadow-army-red-breaker')

from sources.cyber import ingest_cyber_telemetry
from sources.infops import ingest_infops
from core.normalizer import normalize_all
from core.scorer import calculate_threat_score

signals = []
for sig in ${JSON.stringify(threatSignals)}:
    if sig['type'] == 'cyber':
        signals.append(ingest_cyber_telemetry(sig['value'], sig['region']))
    elif sig['type'] == 'infops':
        signals.append(ingest_infops(sig['value'], sig.get('narrative', 'unknown'), sig['region']))

normalized = normalize_all(signals)
score = calculate_threat_score(normalized)
print(score)
`;
      
      const { stdout } = await execAsync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`);
      threatScore = parseFloat(stdout.trim());
      
      // Map threat score to risk level
      if (threatScore >= 8) riskLevel = 'high';
      else if (threatScore >= 5) riskLevel = 'medium';
      else riskLevel = 'low';
      
      console.log('  🎯 Threat Score:', threatScore);
      console.log('  🎯 Mapped Risk Level:', riskLevel);
    } catch (error) {
      console.error('  ⚠️  Threat analysis failed:', error);
    }
  }

  // Evaluate Hot Gate with threat-informed risk level
  const gateDecision = evaluateHotGate({
    intent: action,
    riskLevel: riskLevel as 'low' | 'medium' | 'high',
    requiredCapabilities: payload?.capabilities || [],
    userTier: req.headers['x-user-tier'] as string
  });

  console.log('\n✅ Gate Decision:');
  console.log('  Allowed:', gateDecision.allowed);
  console.log('  Confidence:', gateDecision.confidence);
  console.log('  Route:', gateDecision.route);

  if (!gateDecision.allowed) {
    return res.status(403).json({
      error: 'Access denied',
      reason: gateDecision.reason,
      confidence: gateDecision.confidence,
      threatScore,
      riskLevel
    });
  }

  const gatedService = gateDecision.route || service;

  // Simulate service response
  res.json({
    success: true,
    service: gatedService,
    threatScore,
    riskLevel,
    gateDecision,
    message: `Request processed successfully via ${gatedService}`
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      hotGates: 'operational',
      threatIntel: 'operational',
      integration: 'active'
    }
  });
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('  🔥 SHADOW ARMY RED BREAKER - INTEGRATED SYSTEM');
  console.log('='.repeat(70));
  console.log(`\n  🚀 Server running on http://localhost:${PORT}`);
  console.log('\n  📊 Components:');
  console.log('     ✓ Hot Gates Security Layer');
  console.log('     ✓ Threat Intelligence Engine');
  console.log('     ✓ Integrated GUI');
  console.log('\n  🌐 Access:');
  console.log(`     http://localhost:${PORT}`);
  console.log('\n' + '='.repeat(70) + '\n');
});
