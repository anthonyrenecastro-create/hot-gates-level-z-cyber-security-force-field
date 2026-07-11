from datetime import datetime
from core.signal import ThreatSignal

def ingest_diplomatic_event(event: str, sensitivity: float, region: str):
    value = max(0.0, min(1.0, sensitivity))
    return ThreatSignal(
        source="diplomatic_log",
        category="DIPLOMATIC",
        region=region,
        timestamp=datetime.utcnow(),
        value=value,
        confidence=0.8,
        severity=value,
        summary=event,
        metadata={
            "event_type": "meeting_or_statement",
            "public": True
        }
    )
