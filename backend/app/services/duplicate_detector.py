from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.config import settings

def find_duplicate_incidents(
    title: str,
    description: str,
    db: Session,
    threshold: float = settings.DUPLICATE_SIMILARITY_THRESHOLD,
    exclude_id: int = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Finds potentially duplicate or related incidents using TF-IDF vectorization and cosine similarity.
    Compares query against recent incidents (last 100 active/recent incidents).
    """
    query_text = f"{title} {description}".strip()
    if not query_text or len(query_text) < 5:
        return []

    # Fetch recent incidents for comparison
    query = db.query(Incident)
    if exclude_id:
        query = query.filter(Incident.id != exclude_id)
    
    recent_incidents = query.order_by(Incident.created_at.desc()).limit(100).all()
    if not recent_incidents:
        return []

    corpus = [query_text]
    incident_map = []
    for inc in recent_incidents:
        corpus.append(f"{inc.title} {inc.description}")
        incident_map.append(inc)

    try:
        vectorizer = TfidfVectorizer(stop_words="english", max_features=1000, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Calculate cosine similarity of the query (index 0) against all others
        similarity_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        duplicates = []
        for idx, score in enumerate(similarity_scores):
            similarity_pct = round(float(score) * 100, 1)
            if score >= threshold:
                inc = incident_map[idx]
                duplicates.append({
                    "id": inc.id,
                    "incident_number": inc.incident_number,
                    "title": inc.title,
                    "category": inc.category,
                    "status": inc.status,
                    "priority": inc.priority,
                    "similarity_score": similarity_pct,
                    "created_at": inc.created_at.isoformat()
                })
        
        # Sort by highest similarity
        duplicates.sort(key=lambda x: x["similarity_score"], reverse=True)
        return duplicates[:limit]
    except Exception as e:
        # Graceful fallback in case of vocabulary / parsing issues
        return []
