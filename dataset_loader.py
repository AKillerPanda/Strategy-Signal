from collections import Counter
from functools import lru_cache
from pathlib import Path

import pandas as pd

from reinforcement_model import POLICY_CONFIGS, learn_heuristic_scores, save_heuristic_checkpoint


REQUIRED_FILES = {
    "customers": "customers.csv",
    "products": "products.csv",
    "campaigns": "campaigns.csv",
    "events": "events.csv",
    "transactions": "transactions.csv",
}

LOYALTY_SCORES = {
    "Bronze": 0.25,
    "Silver": 0.50,
    "Gold": 0.75,
    "Platinum": 1.00,
}

PAID_SOURCES = {"Paid Search", "Social", "Display", "Affiliate"}


def default_archive_dir():
    return Path.home() / "Downloads" / "archive"


def missing_dataset_files(base_dir):
    dataset_dir = Path(base_dir).expanduser()
    missing = []

    for file_name in REQUIRED_FILES.values():
        if not (dataset_dir / file_name).exists():
            missing.append(file_name)

    return missing


def _clamp(value, lower=0.0, upper=1.0):
    return max(lower, min(upper, value))


def _scale(value, lower_bound, upper_bound):
    if upper_bound <= lower_bound:
        return 0.0

    scaled = (value - lower_bound) / (upper_bound - lower_bound)
    return _clamp(scaled)


def _top_values(series, limit):
    values = []
    for item in series.dropna().astype(str):
        item = item.strip()
        if item and item not in values:
            values.append(item)
        if len(values) >= limit:
            break
    return values


def _safe_divide(numerator, denominator):
    denominator = denominator.replace(0, pd.NA)
    result = numerator / denominator
    return result.fillna(0.0)


def _series_or_zero(frame, column_name, index):
    if frame is None or frame.empty or column_name not in frame.columns:
        return pd.Series(0.0, index=index, dtype=float)

    return frame[column_name].reindex(index, fill_value=0).astype(float)


def _accumulate_frame(total_frame, chunk_frame):
    if total_frame is None:
        return chunk_frame.astype(float)

    return total_frame.add(chunk_frame, fill_value=0)


def _launch_milestones(products):
    launch_dates = pd.to_datetime(products["launch_date"], errors="coerce").dropna()
    if launch_dates.empty:
        return ["Initial product launch", "Growth launch window", "Expansion launch window"]

    launch_quarters = launch_dates.dt.to_period("Q")
    first_launch = str(launch_quarters.min())
    peak_launch = str(launch_quarters.value_counts().idxmax())
    latest_launch = str(launch_quarters.max())

    milestones = []
    for label in [
        f"First launch wave {first_launch}",
        f"Peak launch wave {peak_launch}",
        f"Latest launch wave {latest_launch}",
    ]:
        if label not in milestones:
            milestones.append(label)

    return milestones


def _aggregate_monthly_events(events_path):
    event_counts_total = None
    source_counts_total = None
    session_totals = None

    for chunk in pd.read_csv(
        events_path,
        usecols=["timestamp", "event_type", "traffic_source", "session_duration_sec"],
        parse_dates=["timestamp"],
        chunksize=200_000,
    ):
        chunk["month"] = chunk["timestamp"].dt.to_period("M").astype(str)

        event_counts_chunk = (
            chunk.groupby(["month", "event_type"]).size().unstack(fill_value=0)
        )
        source_counts_chunk = (
            chunk.groupby(["month", "traffic_source"]).size().unstack(fill_value=0)
        )
        session_totals_chunk = chunk.groupby("month")["session_duration_sec"].agg(
            duration_sum="sum",
            duration_count="count",
        )

        event_counts_total = _accumulate_frame(event_counts_total, event_counts_chunk)
        source_counts_total = _accumulate_frame(source_counts_total, source_counts_chunk)
        session_totals = _accumulate_frame(session_totals, session_totals_chunk)

    if event_counts_total is None:
        return pd.DataFrame(), Counter(), Counter()

    event_counts_total = event_counts_total.fillna(0.0).sort_index()
    source_counts_total = source_counts_total.fillna(0.0).sort_index()
    session_totals = session_totals.fillna(0.0).sort_index()

    index = event_counts_total.index
    total_events = event_counts_total.sum(axis=1)
    total_traffic = source_counts_total.sum(axis=1)

    views = _series_or_zero(event_counts_total, "view", index)
    clicks = _series_or_zero(event_counts_total, "click", index)
    add_to_cart = _series_or_zero(event_counts_total, "add_to_cart", index)
    purchases = _series_or_zero(event_counts_total, "purchase", index)
    bounces = _series_or_zero(event_counts_total, "bounce", index)

    paid_counts = pd.Series(0.0, index=index, dtype=float)
    for source_name in PAID_SOURCES:
        paid_counts = paid_counts.add(_series_or_zero(source_counts_total, source_name, index), fill_value=0)

    monthly_events = pd.DataFrame(index=index)
    monthly_events["purchase_rate"] = _safe_divide(
        purchases,
        views + clicks + add_to_cart + purchases,
    )
    monthly_events["click_through_rate"] = _safe_divide(clicks, views)
    monthly_events["add_to_cart_rate"] = _safe_divide(add_to_cart, clicks)
    monthly_events["bounce_rate"] = _safe_divide(bounces, total_events)
    monthly_events["bounce_resilience"] = 1.0 - monthly_events["bounce_rate"]
    monthly_events["average_session_duration"] = _safe_divide(
        session_totals["duration_sum"],
        session_totals["duration_count"],
    )
    monthly_events["traffic_diversity"] = (source_counts_total > 0).sum(axis=1).astype(float)
    monthly_events["organic_share"] = _safe_divide(
        _series_or_zero(source_counts_total, "Organic", index),
        total_traffic,
    )
    monthly_events["direct_share"] = _safe_divide(
        _series_or_zero(source_counts_total, "Direct", index),
        total_traffic,
    )
    monthly_events["paid_share"] = _safe_divide(paid_counts, total_traffic)
    monthly_events["email_share"] = _safe_divide(
        _series_or_zero(source_counts_total, "Email", index),
        total_traffic,
    )
    monthly_events["social_share"] = _safe_divide(
        _series_or_zero(source_counts_total, "Social", index),
        total_traffic,
    )
    monthly_events["traffic_concentration"] = _safe_divide(
        source_counts_total.max(axis=1),
        total_traffic,
    )

    event_type_totals = Counter(
        {
            event_type: int(total_count)
            for event_type, total_count in event_counts_total.sum(axis=0).items()
        }
    )
    traffic_source_totals = Counter(
        {
            source_name: int(total_count)
            for source_name, total_count in source_counts_total.sum(axis=0).items()
        }
    )

    return monthly_events.fillna(0.0), event_type_totals, traffic_source_totals


def _aggregate_monthly_transactions(transactions_path):
    transactions = pd.read_csv(
        transactions_path,
        usecols=[
            "timestamp",
            "quantity",
            "discount_applied",
            "gross_revenue",
            "refund_flag",
        ],
        parse_dates=["timestamp"],
    )
    transactions["month"] = transactions["timestamp"].dt.to_period("M").astype(str)
    transactions["quantity"] = pd.to_numeric(transactions["quantity"], errors="coerce")
    transactions["discount_applied"] = pd.to_numeric(transactions["discount_applied"], errors="coerce")
    transactions["gross_revenue"] = pd.to_numeric(transactions["gross_revenue"], errors="coerce")
    transactions["refund_flag"] = pd.to_numeric(transactions["refund_flag"], errors="coerce")

    monthly_transactions = transactions.groupby("month").agg(
        transaction_count=("timestamp", "size"),
        average_order_revenue=("gross_revenue", "mean"),
        average_quantity=("quantity", "mean"),
        discount_rate=("discount_applied", "mean"),
        refund_rate=("refund_flag", "mean"),
    )
    monthly_transactions["discount_efficiency"] = 1.0 - monthly_transactions["discount_rate"].clip(0.0, 1.0)
    monthly_transactions["refund_resilience"] = 1.0 - monthly_transactions["refund_rate"].clip(0.0, 1.0)
    return monthly_transactions.fillna(0.0)


def _aggregate_monthly_campaigns(campaigns):
    campaigns = campaigns.copy()
    campaigns["start_date"] = pd.to_datetime(campaigns["start_date"], errors="coerce")
    campaigns["end_date"] = pd.to_datetime(campaigns["end_date"], errors="coerce")
    campaigns["expected_uplift"] = pd.to_numeric(campaigns["expected_uplift"], errors="coerce")
    campaigns["campaign_duration_days"] = (
        campaigns["end_date"] - campaigns["start_date"]
    ).dt.days.clip(lower=0)
    campaigns["month"] = campaigns["start_date"].dt.to_period("M").astype(str)

    monthly_campaigns = campaigns.groupby("month").agg(
        campaign_count=("campaign_id", "count"),
        average_campaign_uplift=("expected_uplift", "mean"),
        channel_diversity=("channel", "nunique"),
        target_segment_diversity=("target_segment", "nunique"),
        campaign_duration_days=("campaign_duration_days", "mean"),
    )
    return monthly_campaigns.fillna(0.0)


def _aggregate_monthly_products(products):
    products = products.copy()
    products["launch_date"] = pd.to_datetime(products["launch_date"], errors="coerce")
    products["base_price"] = pd.to_numeric(products["base_price"], errors="coerce")
    products["is_premium"] = pd.to_numeric(products["is_premium"], errors="coerce")
    products["month"] = products["launch_date"].dt.to_period("M").astype(str)

    monthly_products = products.groupby("month").agg(
        launch_count=("product_id", "count"),
        premium_share=("is_premium", "mean"),
        average_base_price=("base_price", "mean"),
        category_diversity=("category", "nunique"),
        brand_diversity=("brand", "nunique"),
    )
    return monthly_products.fillna(0.0)


def _aggregate_monthly_customers(customers):
    customers = customers.copy()
    customers["signup_date"] = pd.to_datetime(customers["signup_date"], errors="coerce")
    customers["month"] = customers["signup_date"].dt.to_period("M").astype(str)
    customers["loyalty_value"] = customers["loyalty_tier"].map(LOYALTY_SCORES).fillna(0.0)
    customers["gold_plus_flag"] = customers["loyalty_tier"].isin(["Gold", "Platinum"]).astype(float)

    monthly_customers = customers.groupby("month").agg(
        signup_count=("customer_id", "count"),
        acquisition_diversity=("acquisition_channel", "nunique"),
        country_diversity=("country", "nunique"),
        loyalty_strength=("loyalty_value", "mean"),
        gold_plus_share=("gold_plus_flag", "mean"),
    )
    monthly_customers["loyalty_fragility"] = 1.0 - monthly_customers["loyalty_strength"].clip(0.0, 1.0)
    return monthly_customers.fillna(0.0)


def _build_monthly_feature_frame(dataset_dir, customers, products, campaigns):
    monthly_events, event_type_totals, traffic_source_totals = _aggregate_monthly_events(
        dataset_dir / REQUIRED_FILES["events"]
    )
    monthly_transactions = _aggregate_monthly_transactions(
        dataset_dir / REQUIRED_FILES["transactions"]
    )
    monthly_campaigns = _aggregate_monthly_campaigns(campaigns)
    monthly_products = _aggregate_monthly_products(products)
    monthly_customers = _aggregate_monthly_customers(customers)

    monthly_features = pd.concat(
        [
            monthly_events,
            monthly_transactions,
            monthly_campaigns,
            monthly_products,
            monthly_customers,
        ],
        axis=1,
    ).sort_index().fillna(0.0)

    return monthly_features.astype(float), event_type_totals, traffic_source_totals


@lru_cache(maxsize=4)
def load_archive_scenario(base_dir):
    dataset_dir = Path(base_dir).expanduser()
    missing = missing_dataset_files(dataset_dir)
    if missing:
        missing_list = ", ".join(missing)
        raise FileNotFoundError(f"Missing required dataset files: {missing_list}")

    customers = pd.read_csv(dataset_dir / REQUIRED_FILES["customers"])
    products = pd.read_csv(dataset_dir / REQUIRED_FILES["products"])
    campaigns = pd.read_csv(dataset_dir / REQUIRED_FILES["campaigns"])
    transactions = pd.read_csv(
        dataset_dir / REQUIRED_FILES["transactions"],
        usecols=["gross_revenue", "discount_applied", "refund_flag", "quantity"],
    )
    monthly_features, event_type_counts, traffic_source_counts = _build_monthly_feature_frame(
        dataset_dir,
        customers,
        products,
        campaigns,
    )
    feature_snapshot = monthly_features.mean().to_dict()
    heuristic_models = learn_heuristic_scores(monthly_features, feature_snapshot)

    top_categories = products["category"].value_counts().head(4).index.to_series()
    features = _top_values(top_categories, 4)

    premium_share = pd.to_numeric(products["is_premium"], errors="coerce").fillna(0).mean()
    if premium_share >= 0.4:
        features.append("Premium catalog focus")

    traffic_sources = pd.Series(traffic_source_counts).sort_values(ascending=False).index.to_series()
    campaign_channels = campaigns["channel"].value_counts().index.to_series()
    channels = _top_values(pd.concat([traffic_sources, campaign_channels], ignore_index=True), 5)

    top_brands = products["brand"].value_counts().head(3).index.to_series()
    competitors = [f"Brand proxy: {brand}" for brand in _top_values(top_brands, 3)]

    milestones = _launch_milestones(products)

    funnel_events = sum(
        event_type_counts.get(event_name, 0)
        for event_name in ["view", "click", "add_to_cart", "purchase"]
    )
    purchase_rate = event_type_counts.get("purchase", 0) / funnel_events if funnel_events else 0.0
    avg_uplift = pd.to_numeric(campaigns["expected_uplift"], errors="coerce").fillna(0).mean()
    traffic_diversity = len(traffic_source_counts)

    gross_revenue = pd.to_numeric(transactions["gross_revenue"], errors="coerce")
    avg_revenue = gross_revenue.dropna().mean() if not gross_revenue.dropna().empty else 0.0
    refund_rate = pd.to_numeric(transactions["refund_flag"], errors="coerce").fillna(0).mean()
    category_diversity = products["category"].nunique()
    brand_diversity = products["brand"].nunique()
    channel_diversity = campaigns["channel"].nunique()

    total_traffic = sum(traffic_source_counts.values())
    paid_pressure = (
        sum(count for source, count in traffic_source_counts.items() if source in PAID_SOURCES)
        / total_traffic
        if total_traffic
        else 0.0
    )
    average_quantity = pd.to_numeric(transactions["quantity"], errors="coerce").mean()

    marketing_strength = heuristic_models["marketing_strength"]["score"]
    product_readiness = heuristic_models["product_readiness"]["score"]
    competition_intensity = heuristic_models["competition_intensity"]["score"]

    checkpoint_path = save_heuristic_checkpoint(
        heuristic_models,
        {
            "dataset_path": str(dataset_dir),
            "month_range": {
                "start": str(monthly_features.index.min()),
                "end": str(monthly_features.index.max()),
            },
            "monthly_feature_columns": monthly_features.columns.tolist(),
            "feature_snapshot": {
                key: round(float(value), 6)
                for key, value in feature_snapshot.items()
            },
            "table_counts": {
                "customers": int(len(customers)),
                "products": int(len(products)),
                "campaigns": int(len(campaigns)),
                "events": int(sum(traffic_source_counts.values())),
                "transactions": int(len(transactions)),
            },
            "policy_configs": {
                heuristic_name: {
                    "label": config["label"],
                    "inputs": config["inputs"],
                    "reward_features": config["reward_features"],
                    "seed": config["seed"],
                }
                for heuristic_name, config in POLICY_CONFIGS.items()
            },
        },
    )

    return {
        "dataset_path": str(dataset_dir),
        "checkpoint_path": checkpoint_path,
        "features": features,
        "channels": channels,
        "competitors": competitors,
        "milestones": milestones,
        "marketing_strength": marketing_strength,
        "product_readiness": product_readiness,
        "competition_intensity": competition_intensity,
        "heuristic_models": heuristic_models,
        "dataset_metrics": {
            "purchase_rate_pct": round(purchase_rate * 100, 2),
            "average_campaign_uplift_pct": round(avg_uplift * 100, 2),
            "premium_share_pct": round(premium_share * 100, 2),
            "refund_rate_pct": round(refund_rate * 100, 2),
            "average_order_revenue": round(avg_revenue, 2),
            "average_quantity": round(average_quantity, 2),
            "traffic_sources": traffic_diversity,
            "campaign_channels": channel_diversity,
            "brands": brand_diversity,
            "monthly_learning_episodes": int(len(monthly_features)),
            "paid_pressure_pct": round(paid_pressure * 100, 2),
        },
        "table_counts": {
            "customers": int(len(customers)),
            "products": int(len(products)),
            "campaigns": int(len(campaigns)),
            "events": int(total_traffic),
            "transactions": int(len(transactions)),
        },
        "notes": [
            "Competitor nodes are derived from top product brands because the dataset has no explicit competitor table.",
            "Archive scores are now learned by an offline reinforcement-style policy search over monthly dataset episodes instead of fixed hand-tuned constants.",
            "Each archive heuristic uses a wider feature set spanning events, campaigns, transactions, products, and customers.",
        ],
    }