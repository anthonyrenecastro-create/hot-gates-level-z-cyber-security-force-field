from typing import List, Dict, Any
from core.signal import ThreatSignal

def fuse_signals(signals: List[ThreatSignal]) -> List[ThreatSignal]:
    """
    Normalize fusion semantics so the output is compatible with scoring and gating.
    
    Args:
        signals: List of ThreatSignal objects

    Returns:
        List of ThreatSignal objects suitable for scoring and gate evaluation
    """
    if not signals:
        return []

    # Fusion currently preserves the canonical signal list, while downstream
    # scoring and gating operate on the same canonical ThreatSignal type.
    return signals

def fuse_summary(signals: List[ThreatSignal]) -> Dict[str, Any]:
    """
    Summarize fusion metadata for a set of signals.
    """
    if not signals:
        return {
            "regions": [],
            "categories": [],
            "confidence": 0.0,
            "severity": 0.0,
            "signal_count": 0,
            "summary": "No signals to fuse"
        }

    combined_severity = sum(s.severity for s in signals) / len(signals)
    combined_confidence = sum(s.confidence for s in signals) / len(signals)
    return {
        "regions": list({s.region for s in signals}),
        "categories": list({s.category for s in signals}),
        "confidence": round(combined_confidence, 2),
        "severity": round(combined_severity, 2),
        "signal_count": len(signals),
        "summary": "Multi-domain correlated threat indicators detected"
    }

def fuse_by_region(signals: List[ThreatSignal], target_region: str) -> Dict[str, Any]:
    regional_signals = [s for s in signals if s.region == target_region]
    return {
        "target_region": target_region,
        "signals": fuse_signals(regional_signals),
        "summary": fuse_summary(regional_signals)
    }

def fuse_by_category(signals: List[ThreatSignal], target_category: str) -> Dict[str, Any]:
    category_signals = [s for s in signals if s.category == target_category]
    return {
        "target_category": target_category,
        "signals": fuse_signals(category_signals),
        "summary": fuse_summary(category_signals)
    }
