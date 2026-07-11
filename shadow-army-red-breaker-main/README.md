# Shadow Army Red Breaker

**Threat Intelligence-Governed Security Gateway**

A pluggable backend API system that combines multi-domain threat intelligence with intelligent hot gates access control. Pure backend designed for seamless integration into existing security infrastructure.

## Features

- **7 Intelligence Sources**: OSINT, Cyber, Economics, Supply Chain, InfoOps, Satellite, Diplomacy
- **5 Core Modules**: Signal processing, normalization, scoring, fusion, gate evaluation
- **Hot Gates Security**: Risk-based access control with service routing
- **Canonical Schema**: Unified ThreatSignal format across TypeScript ↔ Python
- **Zero Dependencies**: Python standard library only
- **Stateless**: No session management, horizontally scalable
- **RESTful API**: Easy integration as middleware

## Quick Start

```bash
# Install dependencies
npm install

# Start server (recommended: backend-api.ts)
PORT=4000 npx tsx src/backend-api.ts

# Test
curl http://localhost:4000/health
```

## Canonical ThreatSignal Schema

All threat signals conform to this standard format:

```typescript
{
  category: string,      // Threat type (cyber, infops, economic, etc.)
  summary: string,       // Brief description
  region: string,        // Geographic region (GLOBAL, US, ASIA, etc.)
  value: number,         // Threat intensity (0.0 - 1.0)
  confidence?: number,   // Confidence level (default: 0.8)
  severity?: number,     // Severity (default: 0.5)
  metadata?: object      // Additional context
}
```

## API Endpoints

### `POST /api/evaluate`

Primary endpoint - evaluate requests with threat-informed gate decisions.

**Request:**
```json
{
  "service": "eden|elevenlabs|ollama",
  "action": "chat",
  "capabilities": ["chat"],
  "threatSignals": [
    {
      "category": "cyber",
      "summary": "Elevated DDoS activity detected",
      "region": "GLOBAL",
      "value": 0.8
    }
  ]
}
```

**Headers:**
- `x-user-tier: free|pro`

**Response:**
```json
{
  "allowed": true,
  "service": "eden",
  "riskLevel": "medium",
  "threatScore": 6.2,
  "gateDecision": {
    "confidence": 0.85,
    "routedService": "eden"
  }
}
```

### `POST /api/threat/analyze`

Standalone threat intelligence analysis without gate evaluation.

### `POST /api/evaluate/batch`

Batch evaluation for multiple requests.

### `GET /health`

System health check.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐       ┌────────────────────────┐ │
│  │ Threat Intelligence   │       │   Hot Gates Layer      │ │
│  │ Engine (Python)       │──────▶│   (TypeScript)         │ │
│  │                       │       │                        │ │
│  │ • 7 Source Modules    │       │ • Risk-based control   │ │
│  │ • Multi-domain fusion │       │ • Service routing      │ │
│  │ • Real-time scoring   │       │ • Tier management      │ │
│  └───────────────────────┘       └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Risk Mapping

| Threat Score | Risk Level | Gate Behavior |
|-------------|------------|---------------|
| 0 - 5       | Low        | Minimal restrictions |
| 5 - 8       | Medium     | Moderate controls |
| 8 - 10      | High       | Strict controls or denial |

## Integration Example

### Express Middleware

```typescript
import axios from 'axios';

async function threatGateMiddleware(req, res, next) {
  const result = await axios.post('http://localhost:4000/api/evaluate', {
    service: req.body.service,
    action: req.body.action,
    capabilities: req.body.capabilities,
    threatSignals: req.body.threats || []
  }, {
    headers: { 'x-user-tier': req.user.tier }
  });
  
  if (result.data.allowed) {
    next();
  } else {
    res.status(403).json({ error: result.data.reason });
  }
}

app.post('/protected', threatGateMiddleware, handler);
```

### Python Integration

```python
import requests

def evaluate_threat_gate(service, threats=None):
    response = requests.post('http://localhost:4000/api/evaluate',
        json={
            'service': service,
            'action': 'request',
            'capabilities': ['chat'],
            'threatSignals': threats or []
        },
        headers={'x-user-tier': 'pro'}
    )
    return response.json()
```

## Project Structure

```
shadow-army-red-breaker/
├── src/
│   ├── backend-api.ts          # ✅ CANONICAL ENTRYPOINT
│   ├── server.ts               # ⚠️ DEPRECATED
│   ├── integrated-server.ts    # ⚠️ DEPRECATED
│   └── types/
│       └── ThreatSignal.ts     # Canonical TS schema
├── services/
│   └── hotGates.ts             # Hot gates evaluation logic
├── core/                        # Python core modules
│   ├── signal.py               # Canonical Python schema
│   ├── normalizer.py           # Signal normalization
│   ├── scorer.py               # Threat scoring (0-10)
│   ├── fusion.py               # Multi-signal fusion
│   └── gates.py                # Gate evaluation
├── sources/                     # Threat intelligence sources
│   ├── osint.py
│   ├── cyber.py
│   ├── economics.py
│   ├── supply_chain.py
│   ├── infops.py
│   ├── satellite.py
│   └── diplomacy.py
├── test-api.sh                 # API test suite
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies (none!)
├── tsconfig.json               # TypeScript config
└── .env.example                # Environment template
```

## Environment Variables

```bash
PORT=4000                        # Server port
THREAT_THRESHOLD=7.0            # Threat score threshold
API_KEY=your_key_here           # Optional API authentication
NODE_ENV=production             # Environment
```

## Testing

```bash
# Run test suite
./test-api.sh

# Manual tests
curl http://localhost:4000/health

curl -X POST http://localhost:4000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-tier: pro" \
  -d '{
    "service": "eden",
    "action": "chat",
    "capabilities": ["chat"],
    "threatSignals": [{
      "category": "cyber",
      "summary": "DDoS detected",
      "region": "GLOBAL",
      "value": 0.8
    }]
  }'
```

## Design Principles

- **No GUI**: Pure backend for system integration
- **Canonical Schema**: One ThreatSignal format everywhere
- **Robust Paths**: No hardcoded `/workspaces/` paths
- **Zero Dependencies**: Python standard library only
- **Stateless**: No sessions, easy scaling
- **Pluggable**: RESTful API for any stack

## Use Cases

1. **API Gateway Integration** - Add threat-aware security to API gateways
2. **Microservices Protection** - Secure service-to-service communication
3. **CI/CD Security Gates** - Block deployments based on threat levels
4. **IAM Enhancement** - Add threat context to identity decisions
5. **Zero Trust Architecture** - Continuous verification with threat intelligence

## Development

```bash
# Install
npm install

# Run in development
npx tsx src/backend-api.ts

# Type check
npx tsc --noEmit

# Python type check (optional)
mypy core/ sources/
```

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- Canonical ThreatSignal schema compliance
- No hardcoded paths
- Tests pass (`./test-api.sh`)
- TypeScript type safety
