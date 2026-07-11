from datetime import datetime
from core.signal import ThreatSignal

def ingest_economic_indicator(indicator: str, delta: float, region: str):
    value = min(abs(delta), 1.0)

    return ThreatSignal(
        source="economic_data",
        category="ECONOMIC",
        region=region,
        timestamp=datetime.utcnow(),
        value=value,
        confidence=0.7,
        severity=value,
        summary=f"Unusual movement in {indicator}",
        metadata={
            "indicator": indicator,
            "change_percent": delta
        }
    )
