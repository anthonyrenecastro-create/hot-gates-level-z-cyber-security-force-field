from typing import List
from core.signal import ThreatSignal

def normalize_confidence(signals: List[ThreatSignal]) -> List[ThreatSignal]:
    """
    Normalize confidence scores across all signals to a 0-1 scale.
    Adjusts for source reliability and time decay.
    
    Args:
        signals: List of ThreatSignal objects
        
    Returns:
        List of ThreatSignal objects with normalized confidence
    """
    if not signals:
        return signals
    
    # Source reliability weights
    source_weights = {
        "cyber_telemetry": 0.95,
        "diplomatic_log": 0.90,
        "osint_aggregator": 0.70,
        "economic_data": 0.85,
        "supply_chain_monitor": 0.75,
        "infops_monitor": 0.65,
        "satellite_metadata": 0.80
    }
    
    normalized = []
    for signal in signals:
        weight = source_weights.get(signal.category, 0.5)
        adjusted_confidence = min(1.0, signal.confidence * weight)
        
        # Create new signal with normalized confidence
        normalized_signal = ThreatSignal(
            category=signal.category,
            summary=signal.summary,
            region=signal.region,
            value=signal.value,
            confidence=round(adjusted_confidence, 3),
            severity=signal.severity,
            timestamp=signal.timestamp,
            metadata=signal.metadata
        )
        normalized.append(normalized_signal)
    
    return normalized

def normalize_severity(signals: List[ThreatSignal]) -> List[ThreatSignal]:
    """
    Normalize severity scores across all signals using min-max scaling.
    
    Args:
        signals: List of ThreatSignal objects
        
    Returns:
        List of ThreatSignal objects with normalized severity
    """
    if not signals:
        return signals
    
    severities = [s.severity for s in signals]
    min_sev = min(severities)
    max_sev = max(severities)
    
    # Avoid division by zero
    if max_sev == min_sev:
        return signals
    
    normalized = []
    for signal in signals:
        normalized_severity = (signal.severity - min_sev) / (max_sev - min_sev)
        
        normalized_signal = ThreatSignal(
            category=signal.category,
            summary=signal.summary,
            region=signal.region,
            value=signal.value,
            confidence=signal.confidence,
            severity=round(normalized_severity, 3),
            timestamp=signal.timestamp,
            metadata=signal.metadata
        )
        normalized.append(normalized_signal)
    
    return normalized

def normalize_all(signals: List[ThreatSignal]) -> List[ThreatSignal]:
    """
    Apply all normalization steps to signals.
    
    Args:
        signals: List of ThreatSignal objects
        
    Returns:
        Fully normalized list of ThreatSignal objects
    """
    signals = normalize_confidence(signals)
    signals = normalize_severity(signals)
    return signals

def normalize_signal(signal: ThreatSignal) -> ThreatSignal:
    """
    Normalize a single signal (convenience wrapper).
    
    Args:
        signal: Single ThreatSignal object
        
    Returns:
        Normalized ThreatSignal
    """
    return normalize_all([signal])[0]
