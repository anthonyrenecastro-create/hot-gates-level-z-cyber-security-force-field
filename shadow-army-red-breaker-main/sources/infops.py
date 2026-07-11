from datetime import datetime
from core.signal import ThreatSignal

def ingest_infops(coordination_score: float, narrative: str, region: str):
    score = max(0.0, min(1.0, coordination_score))
    return ThreatSignal(
        source="infops_monitor",
        category="INFO_OPS",
        region=region,
        timestamp=datetime.utcnow(),
        value=score,
        confidence=score,
        severity=score,
        summary=f"Coordinated narrative activity detected: {narrative}",
        metadata={
            "pattern": "narrative_sync",
            "automation_suspected": score > 0.7
        }
    )
