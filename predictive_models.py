from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import MiniBatchKMeans
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, roc_auc_score, silhouette_score


DEFAULT_PREDICTIVE_CHECKPOINT_PATH = (
    Path(__file__).resolve().parent / "models" / "strategysignal_predictive.joblib"
)

LOYALTY_SCORES = {
    "Bronze": 0.25,
    "Silver": 0.50,
    "Gold": 0.75,
    "Platinum": 1.00,
}


def _chronological_split(feature_frame, target_series, minimum_train_rows=18):
    split_index = max(minimum_train_rows, int(len(feature_frame) * 0.67))
    split_index = min(split_index, len(feature_frame) - 1)

    x_train = feature_frame.iloc[:split_index]
    x_test = feature_frame.iloc[split_index:]
    y_train = target_series.iloc[:split_index]
    y_test = target_series.iloc[split_index:]
    return x_train, x_test, y_train, y_test


def _safe_probability(model, frame):
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(frame)
        if probabilities.ndim == 2 and probabilities.shape[1] > 1:
            return probabilities[:, 1]
        return probabilities[:, 0]

    predictions = model.predict(frame)
    return np.asarray(predictions, dtype=float)


def _safe_auc(y_true, probabilities):
    if len(np.unique(y_true)) < 2:
        return None
    try:
        return float(roc_auc_score(y_true, probabilities))
    except ValueError:
        return None


def _fit_conversion_model(monthly_features, scenario_feature_snapshot):
    feature_frame = monthly_features.sort_index().copy()
    target_series = feature_frame["purchase_rate"].shift(-1)
    feature_frame = feature_frame.iloc[:-1]
    target_series = target_series.iloc[:-1]

    threshold = float(target_series.median())
    labels = (target_series >= threshold).astype(int)
    x_train, x_test, y_train, y_test = _chronological_split(feature_frame, labels)

    if len(np.unique(y_train)) < 2:
        model = DummyClassifier(strategy="most_frequent")
    else:
        model = RandomForestClassifier(
            n_estimators=300,
            max_depth=6,
            min_samples_leaf=2,
            random_state=42,
        )

    model.fit(x_train, y_train)
    train_probabilities = _safe_probability(model, feature_frame)
    test_probabilities = _safe_probability(model, x_test)

    history = []
    for month, probability, actual_rate in zip(
        feature_frame.index,
        train_probabilities,
        target_series,
    ):
        history.append(
            {
                "month": str(month),
                "conversion_probability": round(float(probability) * 100, 2),
                "actual_conversion_rate": round(float(actual_rate) * 100, 2),
            }
        )

    scenario_frame = pd.DataFrame([scenario_feature_snapshot]).reindex(columns=feature_frame.columns, fill_value=0.0)
    current_probability = float(_safe_probability(model, scenario_frame)[0])
    accuracy = float(accuracy_score(y_test, (test_probabilities >= 0.5).astype(int))) if len(y_test) else 0.0
    auc = _safe_auc(y_test, test_probabilities)

    return {
        "estimator": model,
        "summary": {
            "label": "Conversion success model",
            "validation_accuracy": round(accuracy, 4),
            "validation_auc": None if auc is None else round(auc, 4),
            "current_conversion_probability": round(current_probability * 100, 2),
            "target_threshold_pct": round(threshold * 100, 2),
            "history": history,
        },
    }


def _fit_revenue_model(monthly_features, scenario_feature_snapshot):
    feature_frame = monthly_features.sort_index().copy()
    target_series = feature_frame["average_order_revenue"].shift(-1)
    feature_frame = feature_frame.iloc[:-1]
    target_series = target_series.iloc[:-1]
    x_train, x_test, y_train, y_test = _chronological_split(feature_frame, target_series)

    if y_train.nunique() <= 1:
        model = DummyRegressor(strategy="mean")
    else:
        model = RandomForestRegressor(
            n_estimators=300,
            max_depth=6,
            min_samples_leaf=2,
            random_state=42,
        )

    model.fit(x_train, y_train)
    history_predictions = model.predict(feature_frame)
    test_predictions = model.predict(x_test)

    history = []
    for month, predicted_revenue, actual_revenue in zip(
        feature_frame.index,
        history_predictions,
        target_series,
    ):
        history.append(
            {
                "month": str(month),
                "predicted_revenue": round(float(predicted_revenue), 2),
                "actual_revenue": round(float(actual_revenue), 2),
            }
        )

    scenario_frame = pd.DataFrame([scenario_feature_snapshot]).reindex(columns=feature_frame.columns, fill_value=0.0)
    current_prediction = float(model.predict(scenario_frame)[0])
    mae = float(mean_absolute_error(y_test, test_predictions)) if len(y_test) else 0.0

    return {
        "estimator": model,
        "summary": {
            "label": "Revenue outlook model",
            "validation_mae": round(mae, 4),
            "predicted_next_revenue": round(current_prediction, 2),
            "history": history,
        },
    }


def _fit_channel_model(channel_features):
    channel_frame = channel_features.sort_values(["month", "traffic_source"]).copy()
    feature_columns = [
        "views",
        "clicks",
        "add_to_cart",
        "purchases",
        "bounces",
        "click_through_rate",
        "add_to_cart_rate",
        "bounce_rate",
        "average_session_duration",
        "events_count",
        "traffic_source_code",
    ]

    channel_codes = {name: index for index, name in enumerate(sorted(channel_frame["traffic_source"].unique()))}
    channel_frame["traffic_source_code"] = channel_frame["traffic_source"].map(channel_codes).astype(float)

    threshold = float(channel_frame["purchase_rate"].median())
    labels = (channel_frame["purchase_rate"] < threshold).astype(int)

    feature_matrix = channel_frame[feature_columns]
    x_train, x_test, y_train, y_test = _chronological_split(feature_matrix, labels, minimum_train_rows=36)

    if len(np.unique(y_train)) < 2:
        model = DummyClassifier(strategy="most_frequent")
    else:
        model = RandomForestClassifier(
            n_estimators=250,
            max_depth=6,
            min_samples_leaf=2,
            random_state=7,
        )

    model.fit(x_train, y_train)
    test_probabilities = _safe_probability(model, x_test)
    accuracy = float(accuracy_score(y_test, (test_probabilities >= 0.5).astype(int))) if len(y_test) else 0.0
    auc = _safe_auc(y_test, test_probabilities)

    latest_channels = channel_frame.sort_values("month").groupby("traffic_source").tail(1).copy()
    weak_probabilities = _safe_probability(model, latest_channels[feature_columns])

    channel_watch = []
    for row, weak_probability in zip(latest_channels.itertuples(index=False), weak_probabilities):
        channel_watch.append(
            {
                "channel": row.traffic_source,
                "predicted_weakness_probability": round(float(weak_probability) * 100, 2),
                "purchase_rate_pct": round(float(row.purchase_rate) * 100, 2),
                "click_through_rate_pct": round(float(row.click_through_rate) * 100, 2),
                "average_session_duration": round(float(row.average_session_duration), 2),
            }
        )

    channel_watch.sort(key=lambda item: item["predicted_weakness_probability"], reverse=True)

    return {
        "estimator": model,
        "summary": {
            "label": "Channel weakness model",
            "validation_accuracy": round(accuracy, 4),
            "validation_auc": None if auc is None else round(auc, 4),
            "weak_channels": channel_watch,
            "target_threshold_pct": round(threshold * 100, 2),
        },
    }


def _fit_customer_segmenter(customers):
    customer_frame = customers[["age", "gender", "country", "loyalty_tier", "acquisition_channel"]].copy()
    customer_frame["loyalty_score"] = customer_frame["loyalty_tier"].map(LOYALTY_SCORES).fillna(0.0)
    sample_size = min(len(customer_frame), 20_000)
    sampled = customer_frame.sample(n=sample_size, random_state=42) if len(customer_frame) > sample_size else customer_frame

    encoded = pd.get_dummies(
        sampled[["age", "gender", "country", "loyalty_tier", "acquisition_channel", "loyalty_score"]],
        columns=["gender", "country", "loyalty_tier", "acquisition_channel"],
        dummy_na=False,
    )

    model = MiniBatchKMeans(n_clusters=4, random_state=42, batch_size=1024, n_init=10)
    labels = model.fit_predict(encoded)
    sampled = sampled.copy()
    sampled["segment"] = labels

    silhouette = None
    if len(np.unique(labels)) > 1:
        try:
            silhouette = float(silhouette_score(encoded, labels, sample_size=min(5000, len(encoded)), random_state=42))
        except ValueError:
            silhouette = None

    profiles = []
    for segment, group in sampled.groupby("segment"):
        profiles.append(
            {
                "segment": f"Segment {int(segment) + 1}",
                "customers": int(len(group)),
                "average_age": round(float(group["age"].mean()), 2),
                "top_country": group["country"].mode().iat[0],
                "top_acquisition": group["acquisition_channel"].mode().iat[0],
                "top_loyalty": group["loyalty_tier"].mode().iat[0],
            }
        )

    profiles.sort(key=lambda item: item["customers"], reverse=True)

    return {
        "estimator": model,
        "summary": {
            "label": "Customer segmentation",
            "sample_size": int(sample_size),
            "silhouette_score": None if silhouette is None else round(silhouette, 4),
            "profiles": profiles,
        },
    }


def save_predictive_checkpoint(model_payload, metadata, checkpoint_path=None):
    target_path = Path(checkpoint_path or DEFAULT_PREDICTIVE_CHECKPOINT_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
        "models": model_payload,
    }
    joblib.dump(payload, target_path)
    return str(target_path)


def train_predictive_models(monthly_features, channel_features, customers, scenario_feature_snapshot, checkpoint_path=None):
    conversion_model = _fit_conversion_model(monthly_features, scenario_feature_snapshot)
    revenue_model = _fit_revenue_model(monthly_features, scenario_feature_snapshot)
    channel_model = _fit_channel_model(channel_features)
    segmentation_model = _fit_customer_segmenter(customers)

    checkpoint_path = save_predictive_checkpoint(
        {
            "conversion_model": conversion_model,
            "revenue_model": revenue_model,
            "channel_model": channel_model,
            "segmentation_model": segmentation_model,
        },
        {
            "monthly_rows": int(len(monthly_features)),
            "channel_rows": int(len(channel_features)),
            "customer_rows": int(len(customers)),
            "scenario_features": list(monthly_features.columns),
        },
        checkpoint_path=checkpoint_path,
    )

    return {
        "checkpoint_path": checkpoint_path,
        "conversion_model": conversion_model["summary"],
        "revenue_model": revenue_model["summary"],
        "channel_model": channel_model["summary"],
        "customer_segmentation": segmentation_model["summary"],
    }