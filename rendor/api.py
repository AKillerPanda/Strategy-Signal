import os
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from strategy_engine.dataset_loader import has_scenario_snapshot, load_scenario_from_checkpoints
from strategy_engine.evaluator import evaluate_strategy


def _load_cors_origins() -> List[str]:
    configured_origins = os.getenv("STRATEGYSIGNAL_CORS_ORIGINS", "*").strip()
    if not configured_origins or configured_origins == "*":
        return ["*"]
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


API_KEY = os.getenv("STRATEGYSIGNAL_API_KEY", "").strip()
CORS_ORIGINS = _load_cors_origins()
ALLOW_ALL_ORIGINS = CORS_ORIGINS == ["*"]


app = FastAPI(
    title="StrategySignal API",
    version="0.1.0",
    description="Mobile backend for the StrategySignal hackathon demo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=not ALLOW_ALL_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StrategyRequest(BaseModel):
    features: List[str] = Field(default_factory=list)
    channels: List[str] = Field(default_factory=list)
    competitors: List[str] = Field(default_factory=list)
    milestones: List[str] = Field(default_factory=list)
    marketing_strength: float
    product_readiness: float
    competition_intensity: float


def _require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def _clean_items(items: List[str]) -> List[str]:
    return [item.strip() for item in items if str(item).strip()]


def _serialize_recommendations(recommendations: List[str]) -> List[dict]:
    serialized = []
    for index, description in enumerate(recommendations):
        if not description:
            continue
        serialized.append(
            {
                "title": "Top Recommendation" if index == 0 else f"Recommendation {index + 1}",
                "description": description,
                "priority": "high" if index == 0 else "medium",
                "category": "Strategy",
            }
        )
    return serialized


def _evaluate_payload(payload: dict) -> dict:
    evaluation = evaluate_strategy(
        features=payload["features"],
        channels=payload["channels"],
        competitors=payload["competitors"],
        milestones=payload["milestones"],
        marketing_strength=payload["marketing_strength"],
        product_readiness=payload["product_readiness"],
        competition_intensity=payload["competition_intensity"],
    )

    recommendation_cards = _serialize_recommendations(evaluation["recommendations"])

    summary = {
        "strategy_score": evaluation["score"],
        "fragmentation_score": evaluation["spectral"]["bottleneck_score"],
        "best_launch_strategy": evaluation["game_theory"]["best_strategy"],
        "top_recommendation": evaluation["recommendations"][0] if evaluation["recommendations"] else None,
        "marketing_strength": payload["marketing_strength"],
        "product_readiness": payload["product_readiness"],
        "competition_intensity": payload["competition_intensity"],
    }

    return {
        **summary,
        "fragmentation_risk": summary["fragmentation_score"],
        "recommendations": recommendation_cards,
        "payload": payload,
        "evaluation": evaluation,
        "summary": summary,
    }


@app.get("/")
def root():
    return {
        "name": "StrategySignal API",
        "docs": "/docs",
        "endpoints": ["/health", "/evaluate", "/saved-scenario"],
        "auth_enabled": bool(API_KEY),
    }


@app.get("/health")
def health():
    return {"status": "ok", "auth_enabled": bool(API_KEY)}


@app.post("/evaluate")
def evaluate(request: StrategyRequest, _: None = Depends(_require_api_key)):
    payload = {
        "features": _clean_items(request.features),
        "channels": _clean_items(request.channels),
        "competitors": _clean_items(request.competitors),
        "milestones": _clean_items(request.milestones),
        "marketing_strength": float(request.marketing_strength),
        "product_readiness": float(request.product_readiness),
        "competition_intensity": float(request.competition_intensity),
    }
    return _evaluate_payload(payload)


@app.get("/saved-scenario")
def saved_scenario(_: None = Depends(_require_api_key)):
    if not has_scenario_snapshot():
        raise HTTPException(
            status_code=404,
            detail="No saved scenario snapshot found. Generate one in archive mode first.",
        )

    scenario = load_scenario_from_checkpoints()
    payload = {
        "features": scenario["features"],
        "channels": scenario["channels"],
        "competitors": scenario["competitors"],
        "milestones": scenario["milestones"],
        "marketing_strength": float(scenario["marketing_strength"]),
        "product_readiness": float(scenario["product_readiness"]),
        "competition_intensity": float(scenario["competition_intensity"]),
    }
    response = _evaluate_payload(payload)
    response["scenario"] = scenario
    response["source"] = "saved_checkpoint"
    return response