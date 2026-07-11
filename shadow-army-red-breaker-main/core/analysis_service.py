#!/usr/bin/env python3
import sys
import os
import json
import traceback
from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, List

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT)

from core.signal import ThreatSignal
from core.normalizer import normalize_all
from core.scorer import calculate_threat_score, score_breakdown, get_threat_level
from core.fusion import fuse_signals
from core.gates import ThreatGate, MultiGateEvaluator


def to_canonical_signal(raw: Dict[str, Any]) -> ThreatSignal:
    category = raw.get('category') or raw.get('type') or 'UNKNOWN'
    summary = raw.get('summary') or raw.get('narrative') or 'Threat indicator'
    region = raw.get('region') or 'GLOBAL'
    value = float(raw.get('value', raw.get('severity', 0.0) or 0.0))
    confidence = float(raw.get('confidence', 0.8))
    severity = float(raw.get('severity', raw.get('value', 0.5)))
    source = raw.get('source') or category or 'unknown'
    metadata = raw.get('metadata') if isinstance(raw.get('metadata'), dict) else {}

    # Clamp values into expected range.
    value = max(0.0, min(1.0, value))
    confidence = max(0.0, min(1.0, confidence))
    severity = max(0.0, min(1.0, severity))

    return ThreatSignal(
        source=source,
        category=str(category).upper(),
        summary=str(summary),
        region=str(region).upper(),
        value=value,
        confidence=confidence,
        severity=severity,
        metadata=metadata
    )


def read_requests() -> None:
    message = None
    for raw_line in sys.stdin:
        try:
            if not raw_line.strip():
                continue
            message = json.loads(raw_line)
            response = process_message(message)
            sys.stdout.write(json.dumps(response) + '\n')
            sys.stdout.flush()
        except Exception as exc:
            error_response = {
                'id': message.get('id') if isinstance(message, dict) else None,
                'status': 'error',
                'error': str(exc),
                'traceback': traceback.format_exc() if os.getenv('DEBUG') else None
            }
            sys.stdout.write(json.dumps(error_response) + '\n')
            sys.stdout.flush()


def process_message(message: Dict[str, Any]) -> Dict[str, Any]:
    request_id = message.get('id')
    command = message.get('command')
    payload = message.get('payload', {})

    if command == 'analyze':
        return analyze_request(request_id, payload)
    if command == 'evaluate':
        return evaluate_request(request_id, payload)
    if command == 'ping':
        return {'id': request_id, 'status': 'ok', 'result': {'uptime': True}}

    return {
        'id': request_id,
        'status': 'error',
        'error': f'Unsupported command: {command}'
    }


def serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize_value(v) for v in value]
    return value


def analyze_request(request_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    raw_signals = payload.get('signals', [])
    signals = [to_canonical_signal(sig) for sig in raw_signals if isinstance(sig, dict)]
    normalized = normalize_all(signals)
    fused_signals = fuse_signals(normalized)
    score_data = score_breakdown(fused_signals)
    gate = ThreatGate(threshold=payload.get('threshold', 7.0), min_confidence=payload.get('min_confidence', 0.5))
    gate_result = gate.evaluate(fused_signals)
    return {
        'id': request_id,
        'status': 'ok',
        'result': {
            'signals': [serialize_value(asdict(signal)) for signal in normalized],
            'fused': [serialize_value(asdict(signal)) for signal in fused_signals],
            'scoring': serialize_value(score_data),
            'gate': serialize_value(gate_result),
            'summary': {
                'signal_count': len(signals),
                'normalized_count': len(normalized),
                'fused_count': len(fused_signals)
            }
        }
    }


def evaluate_request(request_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    response = analyze_request(request_id, {'signals': payload.get('signals', []), 'threshold': payload.get('threshold', 7.0), 'min_confidence': payload.get('min_confidence', 0.5)})
    if response['status'] != 'ok':
        return response

    result = response['result']
    overall_score = result['scoring'].get('overall_score', 0.0)
    recommended_action = result['gate'].get('action', 'MONITOR')
    return {
        'id': request_id,
        'status': 'ok',
        'result': {
            'overall_score': overall_score,
            'threat_level': get_threat_level(overall_score),
            'recommended_action': recommended_action,
            'gate': result['gate'],
            'scoring': result['scoring'],
            'fused': result['fused'],
            'signals': result['signals']
        }
    }


if __name__ == '__main__':
    read_requests()
