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
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { evaluateHotGate } from '../services/hotGates';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    system: 'Shadow Army Red Breaker - Hot Gates',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      '/': 'System info',
      '/health': 'Health check',
      '/test': 'Test scenarios',
      '/proxy': 'POST - Gate-controlled request routing'
    }
  });
});

// Proxy endpoint with Hot Gates
app.post('/proxy', async (req: Request, res: Response) => {
  const { service, action, payload } = req.body;

  console.log('\n🔥 Hot Gate Request:');
  console.log('  Service:', service);
  console.log('  Action:', action);
  console.log('  Payload:', payload);
  console.log('  User Tier:', req.headers['x-user-tier']);

  // Evaluate Hot Gate
  const gateDecision = evaluateHotGate({
    intent: action,
    riskLevel: payload?.riskLevel || 'low',
    requiredCapabilities: payload?.capabilities || [],
    userTier: req.headers['x-user-tier'] as string
  });

  console.log('\n✅ Gate Decision:');
  console.log('  Allowed:', gateDecision.allowed);
  console.log('  Confidence:', gateDecision.confidence);
  console.log('  Route:', gateDecision.route);
  if (gateDecision.reason) {
    console.log('  Reason:', gateDecision.reason);
  }

  if (!gateDecision.allowed) {
    return res.status(403).json({
      error: 'Hot Gate denied execution',
      reason: gateDecision.reason,
      confidence: gateDecision.confidence
    });
  }

  // Override service routing if gate dictates it
  const gatedService = gateDecision.route || service;

  // Simulate service routing
  console.log(`\n🚀 Routing to service: ${gatedService}`);

  if (gatedService === 'eden') {
    return res.json({
      success: true,
      service: 'eden',
      message: 'Eden service processing complete',
      data: payload,
      gateDecision
    });
  }

  if (gatedService === 'elevenlabs') {
    return res.json({
      success: true,
      service: 'elevenlabs',
      message: 'ElevenLabs voice service processing complete',
      data: payload,
      gateDecision
    });
  }

  if (gatedService === 'ollama') {
    return res.json({
      success: true,
      service: 'ollama',
      message: 'Ollama local LLM processing complete',
      data: payload,
      gateDecision
    });
  }

  return res.json({
    success: true,
    service: gatedService,
    message: 'Request processed',
    data: payload,
    gateDecision
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'shadow-army-red-breaker'
  });
});

// Test endpoint to try different gate scenarios
app.get('/test', (req: Request, res: Response) => {
  const scenarios = [
    {
      name: 'Low risk chat (allowed)',
      config: {
        service: 'eden',
        action: 'chat',
        payload: {
          riskLevel: 'low',
          capabilities: ['chat'],
          messages: ['Hello']
        }
      },
      headers: { 'x-user-tier': 'free' }
    },
    {
      name: 'High risk without pro (denied)',
      config: {
        service: 'eden',
        action: 'admin',
        payload: {
          riskLevel: 'high',
          capabilities: ['chat'],
          messages: ['Admin action']
        }
      },
      headers: { 'x-user-tier': 'free' }
    },
    {
      name: 'High risk with pro (allowed)',
      config: {
        service: 'eden',
        action: 'admin',
        payload: {
          riskLevel: 'high',
          capabilities: ['chat'],
          messages: ['Admin action']
        }
      },
      headers: { 'x-user-tier': 'pro' }
    },
    {
      name: 'Voice capability routing',
      config: {
        service: 'eden',
        action: 'speak',
        payload: {
          riskLevel: 'low',
          capabilities: ['voice'],
          text: 'Hello world'
        }
      },
      headers: { 'x-user-tier': 'pro' }
    }
  ];

  res.json({
    message: 'Test scenarios available',
    scenarios,
    usage: 'POST to /proxy with any scenario config and headers'
  });
});

app.listen(PORT, () => {
  console.log('\n🔥 Shadow Army Red Breaker - Hot Gates System');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   POST http://localhost:${PORT}/proxy`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/test`);
  console.log('\n💡 Try the test scenarios:');
  console.log(`   curl http://localhost:${PORT}/test\n`);
});
