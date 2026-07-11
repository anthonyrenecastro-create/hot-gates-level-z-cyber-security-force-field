from datetime import datetime
from core.signal import ThreatSignal

def ingest_satellite_metadata(activity_index: float, region: str):
    value = max(0.0, min(1.0, activity_index))
    return ThreatSignal(
        source="satellite_metadata",
        category="SPACE",
        region=region,
        timestamp=datetime.utcnow(),
        value=value,
        confidence=0.6,
        severity=value,
        summary="Unusual increase in satellite activity metadata",
        metadata={
            "activity_index": activity_index,
            "imagery": False,
            "resolution": "metadata_only"
        }
    )
