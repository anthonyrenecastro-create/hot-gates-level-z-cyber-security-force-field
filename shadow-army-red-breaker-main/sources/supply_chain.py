from datetime import datetime
from core.signal import ThreatSignal

def ingest_supply_chain(event: str, criticality: float, region: str):
    value = max(0.0, min(1.0, criticality))
    return ThreatSignal(
        source="supply_chain_monitor",
        category="SUPPLY_CHAIN",
        region=region,
        timestamp=datetime.utcnow(),
        value=value,
        confidence=0.65,
        severity=value,
        summary=event,
        metadata={
            "sector": "logistics",
            "criticality": criticality
        }
    )
