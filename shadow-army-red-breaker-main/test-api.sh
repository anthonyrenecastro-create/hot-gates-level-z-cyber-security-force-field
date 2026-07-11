#!/bin/bash

echo "======================================"
echo "Shadow Army Red Breaker - API Tests"
echo "======================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "GET /health"
curl -s http://localhost:4000/health | python3 -m json.tool
echo ""
echo "--------------------------------------"
echo ""

# Test 2: Basic evaluation (no threats)
echo "Test 2: Basic Gate Evaluation (No Threats)"
echo "POST /api/evaluate"
curl -s -X POST http://localhost:4000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-tier: pro" \
  -d '{
    "service": "eden",
    "action": "chat",
    "capabilities": ["chat"]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------"
echo ""

# Test 3: Low threat scenario
echo "Test 3: Low Threat Scenario"
echo "POST /api/evaluate (with low threat)"
curl -s -X POST http://localhost:4000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-tier: pro" \
  -d '{
    "service": "eden",
    "action": "chat",
    "capabilities": ["chat"],
    "threatSignals": [
      {"type": "cyber", "value": 0.3, "region": "US", "narrative": "Low threat baseline"}
    ]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------"
echo ""

# Test 4: High threat scenario
echo "Test 4: High Threat Scenario (Should Deny)"
echo "POST /api/evaluate (with high threats)"
curl -s -X POST http://localhost:4000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-tier: free" \
  -d '{
    "service": "eden",
    "action": "chat",
    "capabilities": ["chat"],
    "threatSignals": [
      {"type": "cyber", "value": 0.9, "region": "GLOBAL", "narrative": "Critical threat"},
      {"type": "infops", "value": 0.85, "region": "GLOBAL", "narrative": "Disinformation"}
    ]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------"
echo ""

# Test 5: Standalone threat analysis
echo "Test 5: Standalone Threat Analysis"
echo "POST /api/threat/analyze"
curl -s -X POST http://localhost:4000/api/threat/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "signals": [
      {"type": "economic", "value": 0.7, "region": "ASIA", "narrative": "Market volatility"},
      {"type": "cyber", "value": 0.6, "region": "GLOBAL", "narrative": "Ransomware uptick"}
    ]
  }' | python3 -m json.tool
echo ""
echo "--------------------------------------"
echo ""

# Test 6: Batch evaluation
echo "Test 6: Batch Evaluation"
echo "POST /api/evaluate/batch"
curl -s -X POST http://localhost:4000/api/evaluate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "id": "req-1",
        "service": "eden",
        "action": "chat",
        "userTier": "pro",
        "capabilities": ["chat"]
      },
      {
        "id": "req-2",
        "service": "elevenlabs",
        "action": "voice",
        "userTier": "free",
        "capabilities": ["voice"],
        "threatSignals": [{"type": "cyber", "value": 0.9, "region": "GLOBAL", "narrative": "High threat"}]
      }
    ]
  }' | python3 -m json.tool
echo ""
echo "======================================"
echo "Tests Complete"
echo "======================================"
