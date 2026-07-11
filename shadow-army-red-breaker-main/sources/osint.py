from datetime import datetime
from core.signal import ThreatSignal

def ingest_osint_report(source_type: str, credibility: float, content: str, region: str):
    """
    Ingest open-source intelligence reports from various sources.
    
    Args:
        source_type: Type of OSINT source (social_media, news, forum, blog, etc.)
        credibility: Credibility score of the source (0.0 to 1.0)
        content: Summary of the intelligence
        region: Geographic region
    """
    score = max(0.0, min(1.0, credibility))
    return ThreatSignal(
        source="osint_aggregator",
        category="OSINT",
        region=region,
        timestamp=datetime.utcnow(),
        value=score,
        confidence=score,
        severity=score * 0.8,
        summary=content,
        metadata={
            "source_type": source_type,
            "verified": score > 0.7,
            "collection_method": "automated"
        }
    )

def ingest_social_media_trend(keyword: str, velocity: float, sentiment: float, region: str):
    """
    Ingest trending social media data with velocity and sentiment analysis.
    
    Args:
        keyword: Trending keyword or hashtag
        velocity: Rate of spread (0.0 to 1.0)
        sentiment: Sentiment score (-1.0 to 1.0)
        region: Geographic region
    """
    velocity_score = max(0.0, min(1.0, velocity))
    severity = velocity_score * (1.0 - sentiment) / 2.0
    value = min(1.0, velocity_score)
    
    return ThreatSignal(
        source="osint_aggregator",
        category="OSINT",
        region=region,
        timestamp=datetime.utcnow(),
        value=value,
        confidence=min(0.75, velocity_score),
        severity=max(0.0, min(1.0, severity)),
        summary=f"Social media trend detected: {keyword}",
        metadata={
            "source_type": "social_media",
            "keyword": keyword,
            "velocity": velocity_score,
            "sentiment": sentiment,
            "viral_potential": velocity_score > 0.8
        }
    )
