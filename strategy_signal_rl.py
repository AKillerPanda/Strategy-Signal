import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd


ACTIONS = [
    "increase ad spend",
    "change channel mix",
    "delay launch",
    "launch beta",
    "improve onboarding",
    "reduce feature scope",
    "target niche segment",
]

ACTION_EFFECTS = {
    "increase ad spend": {
        "customer_conversion_probability": 4,
        "marketing_roi": -6,
        "cac_index": 12,
        "competition_risk": 4,
    },
    "change channel mix": {
        "marketing_strength": 5,
        "marketing_roi": 8,
        "customer_conversion_probability": 3,
        "cac_index": -7,
        "competition_risk": -2,
    },
    "delay launch": {
        "product_readiness": 8,
        "launch_timing_risk": -12,
        "predicted_revenue_index": -3,
        "delay_cost": 10,
    },
    "launch beta": {
        "product_readiness": 5,
        "customer_conversion_probability": 2,
        "launch_timing_risk": -6,
        "marketing_strength": 2,
    },
    "improve onboarding": {
        "customer_conversion_probability": 10,
        "marketing_roi": 6,
        "churn_index": -8,
        "product_readiness": 4,
    },
    "reduce feature scope": {
        "product_readiness": 6,
        "launch_timing_risk": -9,
        "competition_risk": -2,
        "predicted_revenue_index": -2,
    },
    "target niche segment": {
        "competition_risk": -10,
        "customer_conversion_probability": 5,
        "marketing_strength": 4,
        "marketing_roi": 5,
    },
}

DEFAULT_RL_CHECKPOINT_PATH = (
    Path(__file__).resolve().parent / "models" / "strategysignal_rl_policy.json"
)


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

    return normalized.fillna(0.0)


def _history_lookup(history_rows, key_name):
    history_frame = pd.DataFrame(history_rows)
    if history_frame.empty:
        return {}

    return {
        str(row["month"]): float(row[key_name])
        for _, row in history_frame.iterrows()
    }


def _apply_heuristic_weights(normalized_frame, heuristic_model):
    weighted_sum = pd.Series(0.0, index=normalized_frame.index)
    for feature_name, weight in heuristic_model["feature_weights"].items():
        if feature_name in normalized_frame.columns:
            weighted_sum = weighted_sum.add(normalized_frame[feature_name] * float(weight), fill_value=0.0)

    return weighted_sum.clip(0.0, 1.0) * 100


def build_strategy_timeseries(monthly_features, heuristic_models, predictive_models):
    ordered_features = monthly_features.sort_index().copy()
    normalized_frame = _normalize_frame(ordered_features)
    strategy_frame = pd.DataFrame(index=ordered_features.index)

    strategy_frame["marketing_strength"] = _apply_heuristic_weights(
        normalized_frame,
        heuristic_models["marketing_strength"],
    )
    strategy_frame["product_readiness"] = _apply_heuristic_weights(
        normalized_frame,
        heuristic_models["product_readiness"],
    )
    strategy_frame["competition_risk"] = _apply_heuristic_weights(
        normalized_frame,
        heuristic_models["competition_intensity"],
    )

    conversion_lookup = _history_lookup(
        predictive_models["conversion_model"]["history"],
        "conversion_probability",
    )
    revenue_lookup = _history_lookup(
        predictive_models["revenue_model"]["history"],
        "predicted_revenue",
    )

    revenue_max = max(revenue_lookup.values()) if revenue_lookup else 1.0
    revenue_max = revenue_max if revenue_max > 0 else 1.0

    strategy_frame["customer_conversion_probability"] = [
        conversion_lookup.get(str(month), predictive_models["conversion_model"]["current_conversion_probability"])
        for month in strategy_frame.index
    ]
    strategy_frame["predicted_revenue"] = [
        revenue_lookup.get(str(month), predictive_models["revenue_model"]["predicted_next_revenue"])
        for month in strategy_frame.index
    ]
    strategy_frame["predicted_revenue_index"] = (strategy_frame["predicted_revenue"] / revenue_max).clip(0.0, 1.0) * 100
    strategy_frame["marketing_roi"] = (
        ordered_features["average_order_revenue"]
        * ordered_features["purchase_rate"]
        * ordered_features["discount_efficiency"]
        * ordered_features["refund_resilience"]
        / ordered_features["paid_share"].clip(lower=0.05)
    ).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    strategy_frame["marketing_roi"] = (
        strategy_frame["marketing_roi"] / max(strategy_frame["marketing_roi"].max(), 1.0)
    ).clip(0.0, 1.0) * 100
    strategy_frame["retention_index"] = ordered_features["loyalty_strength"].clip(0.0, 1.0) * 100
    strategy_frame["cac_index"] = ordered_features["paid_share"].clip(0.0, 1.0) * 100
    strategy_frame["churn_index"] = (
        0.6 * ordered_features["refund_rate"].clip(0.0, 1.0)
        + 0.4 * ordered_features["bounce_rate"].clip(0.0, 1.0)
    ) * 100
    launch_pressure = normalized_frame["launch_count"] * 100 if "launch_count" in normalized_frame.columns else 0.0
    strategy_frame["launch_timing_risk"] = (
        0.45 * strategy_frame["competition_risk"]
        + 0.35 * (100 - strategy_frame["product_readiness"])
        + 0.20 * launch_pressure
    ).clip(0.0, 100.0)
    strategy_frame["strategy_score"] = (
        0.30 * strategy_frame["marketing_strength"]
        + 0.20 * strategy_frame["product_readiness"]
        + 0.20 * strategy_frame["customer_conversion_probability"]
        + 0.15 * strategy_frame["marketing_roi"]
        + 0.15 * (100 - strategy_frame["competition_risk"])
        - 0.10 * strategy_frame["launch_timing_risk"]
    ).clip(0.0, 100.0)

    strategy_frame = strategy_frame.reset_index().rename(columns={"index": "month"})
    strategy_frame["month"] = pd.to_datetime(strategy_frame["month"].astype(str))
    return strategy_frame


class StrategySignalEnv:
    def __init__(self, strategy_timeseries):
        self.strategy_timeseries = strategy_timeseries.reset_index(drop=True).copy()
        self.index = 0

    def reset(self):
        self.index = 0
        return self._state_from_row(self.strategy_timeseries.iloc[self.index])

    def step(self, action_index):
        action_name = ACTIONS[action_index]
        current_row = self.strategy_timeseries.iloc[self.index].copy()
        adjusted_row = self._apply_action(current_row, action_name)
        reward = self._reward(adjusted_row, action_name)

        self.index += 1
        done = self.index >= len(self.strategy_timeseries)
        if done:
            next_state = None
        else:
            next_row = self.strategy_timeseries.iloc[self.index].copy()
            blended = next_row.copy()
            for column in adjusted_row.index:
                if column in blended.index and column != "month":
                    blended[column] = (0.7 * next_row[column]) + (0.3 * adjusted_row[column])
            self.strategy_timeseries.iloc[self.index] = blended
            next_state = self._state_from_row(blended)

        return next_state, reward, done, {"action": action_name}

    def _apply_action(self, row, action_name):
        adjusted = row.copy()
        for metric_name, delta in ACTION_EFFECTS[action_name].items():
            if metric_name in adjusted.index:
                adjusted[metric_name] = float(np.clip(adjusted[metric_name] + delta, 0.0, 100.0))
        return adjusted

    def _reward(self, row, action_name):
        delay_cost = ACTION_EFFECTS[action_name].get("delay_cost", 0)
        reward = (
            0.25 * row["predicted_revenue_index"]
            + 0.25 * row["customer_conversion_probability"]
            + 0.20 * row["retention_index"]
            - 0.15 * row["cac_index"]
            - 0.15 * row["churn_index"]
            - delay_cost
        )
        return float(reward)

    def _state_from_row(self, row):
        return (
            int(row["customer_conversion_probability"] // 20),
            int(row["product_readiness"] // 20),
            int(row["competition_risk"] // 20),
            int(row["launch_timing_risk"] // 20),
            int(row["marketing_roi"] // 20),
        )


def _state_key(state):
    return "|".join(str(part) for part in state)


def _save_rl_checkpoint(payload, checkpoint_path=None):
    target_path = Path(checkpoint_path or DEFAULT_RL_CHECKPOINT_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return str(target_path)


def train_rl_policy(strategy_timeseries, checkpoint_path=None, episodes=320, alpha=0.20, gamma=0.92):
    reward_history = []
    q_table = {}

    for episode in range(episodes):
        env = StrategySignalEnv(strategy_timeseries)
        state = env.reset()
        done = False
        epsilon = max(0.05, 0.35 * (0.992 ** episode))
        total_reward = 0.0

        while not done:
            state_key = _state_key(state)
            q_table.setdefault(state_key, np.zeros(len(ACTIONS), dtype=float))

            if np.random.random() < epsilon:
                action_index = int(np.random.randint(len(ACTIONS)))
            else:
                action_index = int(np.argmax(q_table[state_key]))

            next_state, reward, done, _ = env.step(action_index)
            total_reward += reward
            next_state_key = None if next_state is None else _state_key(next_state)
            if next_state_key is not None:
                q_table.setdefault(next_state_key, np.zeros(len(ACTIONS), dtype=float))
                best_future = float(np.max(q_table[next_state_key]))
            else:
                best_future = 0.0

            q_table[state_key][action_index] += alpha * (
                reward + gamma * best_future - q_table[state_key][action_index]
            )
            state = next_state

        reward_history.append(
            {
                "episode": episode + 1,
                "reward": round(float(total_reward), 2),
            }
        )

    live_env = StrategySignalEnv(strategy_timeseries)
    current_state = live_env.reset()
    current_state_key = _state_key(current_state)
    q_values = q_table.get(current_state_key, np.zeros(len(ACTIONS), dtype=float))
    ranked_actions = [
        {
            "action": action_name,
            "q_value": round(float(q_value), 4),
        }
        for action_name, q_value in sorted(
            zip(ACTIONS, q_values),
            key=lambda pair: pair[1],
            reverse=True,
        )
    ]

    checkpoint_payload = {
        "version": 1,
        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
        "state_definition": [
            "conversion_probability_bucket",
            "product_readiness_bucket",
            "competition_risk_bucket",
            "launch_timing_risk_bucket",
            "marketing_roi_bucket",
        ],
        "actions": ACTIONS,
        "q_table": {
            state_name: [round(float(value), 6) for value in values]
            for state_name, values in q_table.items()
        },
        "reward_history": reward_history,
        "current_state": current_state_key,
        "ranked_actions": ranked_actions,
    }
    checkpoint_path = _save_rl_checkpoint(checkpoint_payload, checkpoint_path=checkpoint_path)

    return {
        "checkpoint_path": checkpoint_path,
        "recommended_action": ranked_actions[0]["action"] if ranked_actions else None,
        "ranked_actions": ranked_actions,
        "reward_history": reward_history,
        "current_state": current_state_key,
        "action_count": len(ACTIONS),
    }