from typing import List, Dict
from core.signal import ThreatSignal

def calculate_threat_score(signals: List[ThreatSignal]) -> float:
    """
    Calculate an overall threat score from multiple signals.
    
    Args:
        signals: List of ThreatSignal objects
        
    Returns:
        Threat score between 0.0 and 10.0
    """
    if not signals:
        return 0.0
    
    # Weight by confidence and severity
    weighted_scores = []
    for signal in signals:
        score = signal.severity * signal.confidence
        weighted_scores.append(score)
    
    # Average and scale to 0-10
    avg_score = sum(weighted_scores) / len(weighted_scores)
    threat_score = avg_score * 10.0
    
    # Apply multiplier for high signal count (correlation boost)
    if len(signals) > 5:
        correlation_boost = min(1.5, 1.0 + (len(signals) - 5) * 0.05)
        threat_score *= correlation_boost
    
    return min(10.0, round(threat_score, 2))

def calculate_regional_score(signals: List[ThreatSignal], region: str) -> float:
    """
    Calculate threat score for a specific region.
    
    Args:
        signals: List of ThreatSignal objects
        region: Target region
        
    Returns:
        Regional threat score between 0.0 and 10.0
    """
    regional_signals = [s for s in signals if s.region == region]
    return calculate_threat_score(regional_signals)

def calculate_category_score(signals: List[ThreatSignal], category: str) -> float:
    """
    Calculate threat score for a specific category.
    
    Args:
        signals: List of ThreatSignal objects
        category: Target category
        
    Returns:
        Category threat score between 0.0 and 10.0
    """
    category_signals = [s for s in signals if s.category == category]
    return calculate_threat_score(category_signals)

def get_threat_level(score: float) -> str:
    """
    Convert numerical threat score to categorical threat level.
    
    Args:
        score: Threat score (0.0 to 10.0)
        
    Returns:
        Threat level: LOW, MODERATE, ELEVATED, HIGH, SEVERE, CRITICAL
    """
    if score < 2.0:
        return "LOW"
    elif score < 4.0:
        return "MODERATE"
    elif score < 6.0:
        return "ELEVATED"
    elif score < 8.0:
        return "HIGH"
    elif score < 9.5:
        return "SEVERE"
    else:
        return "CRITICAL"

def score_breakdown(signals: List[ThreatSignal]) -> Dict:
    """
    Provide detailed scoring breakdown across multiple dimensions.
    
    Args:
        signals: List of ThreatSignal objects
        
    Returns:
        Dictionary with comprehensive scoring information
    """
    overall_score = calculate_threat_score(signals)
    
    # Score by region
    regions = list({s.region for s in signals})
    regional_scores = {
        region: calculate_regional_score(signals, region)
        for region in regions
    }
    
    # Score by category
    categories = list({s.category for s in signals})
    category_scores = {
        category: calculate_category_score(signals, category)
        for category in categories
    }
    
    return {
        "overall_score": overall_score,
        "threat_level": get_threat_level(overall_score),
        "regional_scores": regional_scores,
        "category_scores": category_scores,
        "signal_count": len(signals),
        "avg_confidence": round(sum(s.confidence for s in signals) / len(signals), 2) if signals else 0.0,
        "avg_severity": round(sum(s.severity for s in signals) / len(signals), 2) if signals else 0.0
    }
