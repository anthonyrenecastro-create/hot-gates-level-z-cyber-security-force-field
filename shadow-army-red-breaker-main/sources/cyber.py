from datetime import datetime
from core.signal import ThreatSignal

def ingest_cyber_telemetry(anomaly_rate: float, region: str):
    return ThreatSignal(
        source="cyber_telemetry",
        category="CYBER",
        region=region,
        timestamp=datetime.utcnow(),
        value=max(0.0, min(1.0, anomaly_rate)),
        confidence=min(0.9, anomaly_rate),
        severity=max(0.0, min(1.0, anomaly_rate)),
        summary="Elevated anomaly rate detected in network telemetry",
        metadata={
            "metric": "anomaly_rate",
            "scope": "aggregate",
            "exploit_details": None
        }
    )
