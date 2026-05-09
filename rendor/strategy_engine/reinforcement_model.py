import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from . import MODELS_DIR


POLICY_CONFIGS = {
    "marketing_strength": {
        "label": "Marketing strength",
        "inputs": [
            "purchase_rate",
            "click_through_rate",
            "add_to_cart_rate",
            "bounce_resilience",
            "average_session_duration",
            "traffic_diversity",
            "organic_share",
            "direct_share",
            "paid_share",
            "average_campaign_uplift",
            "campaign_count",
            "channel_diversity",
            "target_segment_diversity",
            "acquisition_diversity",
            "signup_count",
        ],
        "reward_features": [
            "purchase_rate",
            "click_through_rate",
            "add_to_cart_rate",
            "bounce_resilience",
            "average_session_duration",
            "average_campaign_uplift",
            "signup_count",
        ],
        "seed": 11,
    },
    "product_readiness": {
        "label": "Product readiness",
        "inputs": [
            "purchase_rate",
            "average_order_revenue",
            "average_quantity",
            "discount_efficiency",
            "refund_resilience",
            "premium_share",
            "average_base_price",
            "category_diversity",
            "brand_diversity",
            "launch_count",
            "loyalty_strength",
            "gold_plus_share",
            "signup_count",
        ],
        "reward_features": [
            "purchase_rate",
            "average_order_revenue",
            "average_quantity",
            "discount_efficiency",
            "refund_resilience",
            "premium_share",
            "loyalty_strength",
            "launch_count",
        ],
        "seed": 23,
    },
    "competition_intensity": {
        "label": "Competition intensity",
        "inputs": [
            "brand_diversity",
            "category_diversity",
            "channel_diversity",
            "traffic_diversity",
            "paid_share",
            "traffic_concentration",
            "campaign_count",
            "target_segment_diversity",
            "acquisition_diversity",
            "country_diversity",
            "loyalty_fragility",
            "refund_rate",
            "discount_rate",
        ],
        "reward_features": [
            "brand_diversity",
            "channel_diversity",
            "paid_share",
            "traffic_concentration",
            "target_segment_diversity",
            "loyalty_fragility",
            "refund_rate",
        ],
        "seed": 37,
    },
}

DEFAULT_CHECKPOINT_PATH = MODELS_DIR / "heuristic_checkpoint.json"


def _softmax(values):
    adjusted = values - np.max(values)
    exp_values = np.exp(adjusted)
    return exp_values / np.sum(exp_values)


def _normalized_entropy(weights):
    if len(weights) <= 1:
        return 0.0

    clipped = np.clip(weights, 1e-9, 1.0)
    entropy = -(clipped * np.log(clipped)).sum()
    return float(entropy / np.log(len(weights)))


def _geometric_mean(values):
    clipped = np.clip(values, 1e-6, 1.0)
    return np.exp(np.mean(np.log(clipped), axis=1))


def _normalize_frame(feature_frame):
    numeric_frame = feature_frame.copy().astype(float).fillna(0.0)
    minimums = numeric_frame.min()
    maximums = numeric_frame.max()
    ranges = maximums - minimums

    normalized = pd.DataFrame(index=numeric_frame.index)
    for column in numeric_frame.columns:
        if ranges[column] == 0:
            normalized[column] = 0.0
        else:
            normalized[column] = (numeric_frame[column] - minimums[column]) / ranges[column]

    return normalized.fillna(0.0), minimums, maximums


def _normalize_snapshot(feature_snapshot, minimums, maximums):
    normalized = {}
    for column in minimums.index:
        value = float(feature_snapshot.get(column, 0.0))
        lower_bound = minimums[column]
        upper_bound = maximums[column]

        if upper_bound == lower_bound:
            normalized[column] = 0.0
        else:
            scaled = (value - lower_bound) / (upper_bound - lower_bound)
            normalized[column] = float(np.clip(scaled, 0.0, 1.0))

    return normalized


def _policy_objective(weights, feature_matrix, rewards):
    predictions = feature_matrix @ weights
    mean_squared_error = np.mean((predictions - rewards) ** 2)

    if np.std(predictions) < 1e-9 or np.std(rewards) < 1e-9:
        alignment = 0.0
    else:
        alignment = float(np.corrcoef(predictions, rewards)[0, 1])
        if np.isnan(alignment):
            alignment = 0.0

    entropy_bonus = _normalized_entropy(weights)
    return (1.0 - mean_squared_error) + (0.25 * alignment) + (0.10 * entropy_bonus)


def _optimize_policy_weights(feature_matrix, rewards, seed, iterations=220, population=60, sigma=0.30, learning_rate=0.20):
    rng = np.random.default_rng(seed)
    theta = np.zeros(feature_matrix.shape[1], dtype=float)
    best_weights = _softmax(theta)
    best_score = _policy_objective(best_weights, feature_matrix, rewards)

    for _ in range(iterations):
        perturbations = rng.normal(size=(population, feature_matrix.shape[1]))
        candidate_scores = np.zeros(population, dtype=float)

        for index, perturbation in enumerate(perturbations):
            candidate_weights = _softmax(theta + (sigma * perturbation))
            candidate_score = _policy_objective(candidate_weights, feature_matrix, rewards)
            candidate_scores[index] = candidate_score

            if candidate_score > best_score:
                best_score = candidate_score
                best_weights = candidate_weights

        standardized_scores = (candidate_scores - candidate_scores.mean()) / (candidate_scores.std() + 1e-8)
        theta += (learning_rate / (population * sigma)) * (perturbations.T @ standardized_scores)

    return best_weights, float(best_score)


def _feature_rows(feature_names, weights, scenario_values):
    scenario_vector = np.array([scenario_values[name] for name in feature_names], dtype=float)
    weighted_values = weights * scenario_vector
    total_weighted_value = weighted_values.sum()

    if total_weighted_value > 0:
        contribution_shares = weighted_values / total_weighted_value
    else:
        contribution_shares = weights

    rows = []
    for feature_name, weight, scenario_value, contribution_share in zip(
        feature_names,
        weights,
        scenario_vector,
        contribution_shares,
    ):
        rows.append(
            {
                "feature": feature_name.replace("_", " ").title(),
                "weight": round(float(weight), 4),
                "normalized_value": round(float(scenario_value), 4),
                "contribution_share": round(float(contribution_share), 4),
            }
        )

    rows.sort(key=lambda row: row["contribution_share"], reverse=True)
    return rows


def save_heuristic_checkpoint(heuristic_models, metadata, checkpoint_path=None):
    target_path = Path(checkpoint_path or DEFAULT_CHECKPOINT_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    checkpoint_payload = {
        "version": 1,
        "created_from": metadata.get("created_from", "archive_dataset"),
        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
        "heuristic_models": heuristic_models,
    }

    target_path.write_text(
        json.dumps(checkpoint_payload, indent=2),
        encoding="utf-8",
    )

    return str(target_path)


def learn_heuristic_scores(monthly_features, scenario_feature_snapshot):
    normalized_frame, minimums, maximums = _normalize_frame(monthly_features)
    normalized_snapshot = _normalize_snapshot(scenario_feature_snapshot, minimums, maximums)
    learned_heuristics = {}

    for heuristic_name, config in POLICY_CONFIGS.items():
        feature_matrix = normalized_frame[config["inputs"]].to_numpy(dtype=float)
        reward_values = _geometric_mean(
            normalized_frame[config["reward_features"]].to_numpy(dtype=float)
        )
        weights, training_score = _optimize_policy_weights(
            feature_matrix,
            reward_values,
            seed=config["seed"],
        )

        scenario_values = {
            feature_name: normalized_snapshot.get(feature_name, 0.0)
            for feature_name in config["inputs"]
        }
        scenario_vector = np.array([scenario_values[name] for name in config["inputs"]], dtype=float)
        raw_score = float(np.dot(scenario_vector, weights))
        episode_scores = feature_matrix @ weights
        feature_rows = _feature_rows(config["inputs"], weights, scenario_values)
        episode_history = []
        for month, episode_score, reward_value in zip(
            normalized_frame.index,
            episode_scores,
            reward_values,
        ):
            episode_history.append(
                {
                    "month": str(month),
                    "score": round(float(np.clip(episode_score, 0.0, 1.0) * 100), 2),
                    "reward_proxy": round(float(np.clip(reward_value, 0.0, 1.0) * 100), 2),
                }
            )

        learned_heuristics[heuristic_name] = {
            "label": config["label"],
            "score": int(round(float(np.clip(raw_score, 0.0, 1.0) * 100))),
            "training_score": round(training_score, 4),
            "episode_count": int(len(normalized_frame)),
            "reward_proxy": round(float(np.mean(reward_values)), 4),
            "average_episode_score": round(float(np.mean(np.clip(episode_scores, 0.0, 1.0)) * 100), 2),
            "feature_weights": {
                feature_name: round(float(weight), 4)
                for feature_name, weight in zip(config["inputs"], weights)
            },
            "feature_breakdown": feature_rows,
            "top_features": feature_rows[:5],
            "episode_history": episode_history,
        }

    return learned_heuristics