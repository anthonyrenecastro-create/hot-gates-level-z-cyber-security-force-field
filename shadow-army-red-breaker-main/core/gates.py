from typing import List, Dict, Any, Optional
from core.signal import ThreatSignal
from core.scorer import calculate_threat_score, get_threat_level

class ThreatGate:
    """
    Decision gate for threat signals - determines if signals warrant action.
    """
    
    def __init__(self, threshold: float = 6.0, min_confidence: float = 0.5, threat_threshold: Optional[float] = None):
        """
        Initialize threat gate with thresholds.
        
        Args:
            threshold: Minimum threat score to trigger gate (0-10 scale)
            min_confidence: Minimum confidence level required
            threat_threshold: Alternate parameter name used by some callers
        """
        self.threshold = threat_threshold if threat_threshold is not None else threshold
        self.min_confidence = min_confidence
    
    def evaluate(self, signals: List[ThreatSignal]) -> Dict[str, Any]:
        """
        Evaluate signals against gate criteria.
        
        Args:
            signals: List of ThreatSignal objects
            
        Returns:
            Gate decision with metadata
        """
        if not signals:
            return {
                "passed": False,
                "reason": "No signals provided",
                "score": 0.0,
                "confidence": 0.0,
                "action": "MONITOR"
            }
        
        threat_score = calculate_threat_score(signals)
        avg_confidence = sum(s.confidence for s in signals) / len(signals)
        threat_level = get_threat_level(threat_score)
        
        # Filter low-confidence signals
        high_confidence_signals = [s for s in signals if s.confidence >= self.min_confidence]
        confidence_ratio = len(high_confidence_signals) / len(signals)
        
        # Gate logic
        passed = (
            threat_score >= self.threshold and
            avg_confidence >= self.min_confidence and
            confidence_ratio >= 0.6  # At least 60% of signals meet confidence threshold
        )
        
        # Determine action
        if threat_score >= 9.0:
            action = "IMMEDIATE_RESPONSE"
        elif threat_score >= 7.0:
            action = "ALERT"
        elif threat_score >= 5.0:
            action = "INVESTIGATE"
        else:
            action = "MONITOR"
        
        return {
            "passed": passed,
            "score": threat_score,
            "threat_level": threat_level,
            "confidence": round(avg_confidence, 2),
            "confidence_ratio": round(confidence_ratio, 2),
            "signal_count": len(signals),
            "high_confidence_count": len(high_confidence_signals),
            "action": action,
            "reason": self._get_reason(passed, threat_score, avg_confidence, confidence_ratio)
        }
    
    def _get_reason(self, passed: bool, score: float, confidence: float, conf_ratio: float) -> str:
        """Generate human-readable reason for gate decision."""
        if not passed:
            reasons = []
            if score < self.threshold:
                reasons.append(f"Score {score} below threshold {self.threshold}")
            if confidence < self.min_confidence:
                reasons.append(f"Confidence {confidence} below minimum {self.min_confidence}")
            if conf_ratio < 0.6:
                reasons.append(f"Only {conf_ratio*100:.0f}% of signals meet confidence threshold")
            return "; ".join(reasons)
        return f"Threat level {get_threat_level(score)} detected with {confidence} confidence"

class MultiGateEvaluator:
    """
    Evaluate signals through multiple specialized gates.
    """
    
    def __init__(self):
        self.gates = {
            "cyber": ThreatGate(threshold=5.5, min_confidence=0.7),
            "kinetic": ThreatGate(threshold=7.0, min_confidence=0.8),
            "economic": ThreatGate(threshold=6.0, min_confidence=0.6),
            "information": ThreatGate(threshold=5.0, min_confidence=0.5),
            "general": ThreatGate(threshold=6.0, min_confidence=0.5)
        }
    
    def evaluate_by_category(self, signals: List[ThreatSignal]) -> Dict[str, Any]:
        """
        Route signals to appropriate gates based on category.
        
        Args:
            signals: List of ThreatSignal objects
            
        Returns:
            Multi-gate evaluation results
        """
        results = {}
        
        # Group signals by category
        cyber_signals = [s for s in signals if s.category == "CYBER"]
        economic_signals = [s for s in signals if s.category == "ECONOMIC"]
        infops_signals = [s for s in signals if s.category == "INFO_OPS"]
        
        # Evaluate each category
        if cyber_signals:
            results["cyber"] = self.gates["cyber"].evaluate(cyber_signals)
        
        if economic_signals:
            results["economic"] = self.gates["economic"].evaluate(economic_signals)
        
        if infops_signals:
            results["information"] = self.gates["information"].evaluate(infops_signals)
        
        # General gate for all signals
        results["general"] = self.gates["general"].evaluate(signals)
        
        # Overall assessment
        any_passed = any(r.get("passed", False) for r in results.values())
        max_action = self._get_max_action([r.get("action", "MONITOR") for r in results.values()])
        
        return {
            "gates": results,
            "any_passed": any_passed,
            "recommended_action": max_action,
            "total_signals": len(signals)
        }
    
    def _get_max_action(self, actions: List[str]) -> str:
        """Get the highest priority action from a list."""
        priority = {
            "IMMEDIATE_RESPONSE": 4,
            "ALERT": 3,
            "INVESTIGATE": 2,
            "MONITOR": 1
        }
        return max(actions, key=lambda a: priority.get(a, 0))
