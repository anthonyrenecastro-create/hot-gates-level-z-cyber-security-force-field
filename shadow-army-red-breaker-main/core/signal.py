"""
Canonical ThreatSignal Schema

This dataclass defines the standard format for threat signals
used across the entire system (TypeScript → Python integration).
"""
from dataclasses import dataclass, field
from typing import Dict, Any
from datetime import datetime

@dataclass
class ThreatSignal:
    """Standard threat signal format"""
    source: str = 'unknown'
    category: str = 'UNKNOWN'
    summary: str = 'Threat indicator'
    region: str = 'GLOBAL'
    value: float = 0.0
    confidence: float = 0.8
    severity: float = 0.5
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
