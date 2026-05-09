import altair as alt
import pandas as pd
import streamlit as st

from dataset_loader import default_archive_dir, load_archive_scenario, missing_dataset_files
from evaluator import evaluate_strategy


SOURCE_OPTIONS = ["Manual strategy", "Archive dataset scenario"]
HEURISTIC_KEYS = [
    "marketing_strength",
    "product_readiness",
    "competition_intensity",
]


def _query_value(key, default_value):
    value = st.query_params.get(key, default_value)
    if isinstance(value, list):
        return value[0]
    return value


def _source_to_param(input_mode):
    return "archive" if input_mode == "Archive dataset scenario" else "manual"


def _clean_items(raw_value):
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _average_episode_score(heuristic_model):
    if "average_episode_score" in heuristic_model:
        return heuristic_model["average_episode_score"]

    episode_history = heuristic_model.get("episode_history", [])
    if episode_history:
        return round(pd.DataFrame(episode_history)["score"].mean(), 2)

    return heuristic_model.get("score", 60)


def _episode_history_frame(heuristic_model):
    episode_history = heuristic_model.get("episode_history", [])
    if episode_history:
        history = pd.DataFrame(episode_history)
        history["month"] = pd.to_datetime(history["month"])
        return history

    return pd.DataFrame(
        [
            {
                "month": pd.Timestamp.today().normalize(),
                "score": heuristic_model.get("score", 0),
                "reward_proxy": round(heuristic_model.get("reward_proxy", 0) * 100, 2),
            }
        ]
    )


def _build_payoff_chart(payoffs):
    chart_data = (
        pd.DataFrame(
            {
                "Strategy": list(payoffs.keys()),
                "Payoff": list(payoffs.values()),
            }
        )
        .sort_values("Payoff", ascending=False)
        .reset_index(drop=True)
    )

    return (
        alt.Chart(chart_data)
        .mark_bar(cornerRadiusTopLeft=10, cornerRadiusTopRight=10)
        .encode(
            x=alt.X("Strategy:N", sort="-y", title=None),
            y=alt.Y("Payoff:Q", title="Estimated payoff"),
            color=alt.Color(
                "Payoff:Q",
                scale=alt.Scale(scheme="tealblues"),
                legend=None,
            ),
            tooltip=["Strategy", alt.Tooltip("Payoff:Q", format=".2f")],
        )
        .properties(height=320)
    )


def _build_heuristic_score_chart(payload, scenario):
    labels = {
        "marketing_strength": "Marketing strength",
        "product_readiness": "Product readiness",
        "competition_intensity": "Competition intensity",
    }

    rows = []
    for heuristic_key in HEURISTIC_KEYS:
        rows.append(
            {
                "Heuristic": labels[heuristic_key],
                "Series": "Current scenario",
                "Score": payload[heuristic_key],
            }
        )

        if scenario and scenario.get("heuristic_models"):
            benchmark_score = _average_episode_score(
                scenario["heuristic_models"][heuristic_key]
            )
            benchmark_label = "Average episode"
        else:
            benchmark_score = 60
            benchmark_label = "Target benchmark"

        rows.append(
            {
                "Heuristic": labels[heuristic_key],
                "Series": benchmark_label,
                "Score": benchmark_score,
            }
        )

    chart_data = pd.DataFrame(rows)

    return (
        alt.Chart(chart_data)
        .mark_bar(cornerRadiusTopLeft=8, cornerRadiusTopRight=8)
        .encode(
            x=alt.X("Heuristic:N", title=None),
            y=alt.Y("Score:Q", scale=alt.Scale(domain=[0, 100])),
            xOffset="Series:N",
            color=alt.Color(
                "Series:N",
                scale=alt.Scale(
                    domain=["Current scenario", "Average episode", "Target benchmark"],
                    range=["#38bdf8", "#f59e0b", "#94a3b8"],
                ),
                legend=alt.Legend(orient="bottom"),
            ),
            tooltip=["Heuristic", "Series", alt.Tooltip("Score:Q", format=".2f")],
        )
        .properties(height=320)
    )


def _build_episode_history_chart(heuristic_model):
    history = _episode_history_frame(heuristic_model)
    plot_data = history.melt(
        id_vars=["month"],
        value_vars=["score", "reward_proxy"],
        var_name="Series",
        value_name="Value",
    )

    return (
        alt.Chart(plot_data)
        .mark_line(point=True)
        .encode(
            x=alt.X("month:T", title=None),
            y=alt.Y("Value:Q", title="Score"),
            color=alt.Color(
                "Series:N",
                scale=alt.Scale(
                    domain=["score", "reward_proxy"],
                    range=["#38bdf8", "#f59e0b"],
                ),
                legend=alt.Legend(title=None, orient="bottom"),
            ),
            tooltip=[
                alt.Tooltip("month:T", title="Month"),
                "Series",
                alt.Tooltip("Value:Q", format=".2f"),
            ],
        )
        .properties(height=320)
    )


def _build_feature_contribution_chart(heuristic_model):
    contribution_data = pd.DataFrame(heuristic_model["feature_breakdown"]).head(8)

    return (
        alt.Chart(contribution_data)
        .mark_bar(cornerRadiusTopRight=8, cornerRadiusBottomRight=8)
        .encode(
            x=alt.X("contribution_share:Q", title="Contribution share"),
            y=alt.Y("feature:N", sort="-x", title=None),
            color=alt.Color(
                "normalized_value:Q",
                scale=alt.Scale(scheme="viridis"),
                legend=alt.Legend(title="Normalized value"),
            ),
            tooltip=[
                alt.Tooltip("feature:N", title="Feature"),
                alt.Tooltip("weight:Q", format=".4f"),
                alt.Tooltip("normalized_value:Q", format=".4f"),
                alt.Tooltip("contribution_share:Q", format=".4f"),
            ],
        )
        .properties(height=320)
    )


def _render_strategy_snapshot(payload, scenario):
    st.markdown("## Strategy workspace")
    st.write(
        "Use the left panel to shape a strategy, then compare structural health, payoffs, and reinforcement-optimized heuristics in one dashboard."
    )

    preview_cols = st.columns(4)
    preview_cols[0].metric("Features", len(payload["features"]))
    preview_cols[1].metric("Channels", len(payload["channels"]))
    preview_cols[2].metric("Competitors", len(payload["competitors"]))
    preview_cols[3].metric("Milestones", len(payload["milestones"]))

    score_cols = st.columns(3)
    score_cols[0].metric("Marketing", payload["marketing_strength"])
    score_cols[1].metric("Product", payload["product_readiness"])
    score_cols[2].metric("Competition", payload["competition_intensity"])

    st.caption("Current strategy components")
    st.write("Product pillars:", ", ".join(payload["features"]))
    st.write("Channels:", ", ".join(payload["channels"]))
    st.write("Competitors:", ", ".join(payload["competitors"]))
    st.write("Milestones:", ", ".join(payload["milestones"]))

    if scenario:
        st.caption(" ".join(scenario["notes"]))


def _render_control_panel(input_mode):
    scenario = None

    if input_mode == "Manual strategy":
        features = _clean_items(
            st.text_area("Product features", "AI dashboard, onboarding flow, analytics")
        )
        channels = _clean_items(
            st.text_area("Marketing channels", "TikTok, SEO, PR, founder-led sales")
        )
        competitors = _clean_items(
            st.text_area("Competitors", "Competitor A, Competitor B")
        )
        milestones = _clean_items(
            st.text_area("Product timeline milestones", "MVP, beta launch, public launch")
        )

        payload = {
            "features": features,
            "channels": channels,
            "competitors": competitors,
            "milestones": milestones,
            "marketing_strength": st.slider("Marketing strength", 0, 100, 60),
            "product_readiness": st.slider("Product readiness", 0, 100, 55),
            "competition_intensity": st.slider("Competition intensity", 0, 100, 70),
        }
        return payload, scenario

    archive_path = st.text_input(
        "Archive folder path",
        _query_value("archive", str(default_archive_dir())),
    )
    st.query_params["archive"] = archive_path

    missing_files = missing_dataset_files(archive_path)
    if missing_files:
        st.warning(
            "Missing dataset files: "
            + ", ".join(missing_files)
            + ". Point this field at the folder containing the Kaggle CSV files."
        )
        return None, None

    with st.spinner("Loading archive-derived scenario..."):
        scenario = load_archive_scenario(archive_path)

    sample_model = scenario.get("heuristic_models", {}).get("marketing_strength", {})
    if "average_episode_score" not in sample_model:
        load_archive_scenario.cache_clear()
        with st.spinner("Refreshing archive model cache..."):
            scenario = load_archive_scenario(archive_path)

    payload = {
        "features": scenario["features"],
        "channels": scenario["channels"],
        "competitors": scenario["competitors"],
        "milestones": scenario["milestones"],
        "marketing_strength": scenario["marketing_strength"],
        "product_readiness": scenario["product_readiness"],
        "competition_intensity": scenario["competition_intensity"],
    }
    return payload, scenario


def _evaluate_payload(payload):
    return evaluate_strategy(
        payload["features"],
        payload["channels"],
        payload["competitors"],
        payload["milestones"],
        payload["marketing_strength"],
        payload["product_readiness"],
        payload["competition_intensity"],
    )


def _render_result_metrics(result):
    metric_defs = [
        ("Strategy score", f"{result['score']}", f"{result['score'] - 50:+.2f} vs neutral"),
        (
            "Best posture",
            result["game_theory"]["best_strategy"],
            f"{max(result['game_theory']['payoffs'].values()):.2f} payoff",
        ),
        (
            "Bottleneck",
            f"{result['spectral']['bottleneck_score']:.2f}",
            "Lower is healthier",
        ),
        (
            "Fiedler value",
            f"{result['spectral']['fiedler_value']:.2f}",
            "Connectivity signal",
        ),
    ]

    metric_cols = st.columns(4)
    for column, (label, value, delta) in zip(metric_cols, metric_defs):
        cell = column.container(border=True)
        cell.metric(label, value, delta)


def _render_overview_tab(result, payload, scenario):
    overview_cols = st.columns(2)
    with overview_cols[0].container(border=True):
        st.markdown("### Strategic payoff landscape")
        st.altair_chart(
            _build_payoff_chart(result["game_theory"]["payoffs"]),
            use_container_width=True,
        )

    with overview_cols[1].container(border=True):
        st.markdown("### Heuristic scorecard")
        st.altair_chart(
            _build_heuristic_score_chart(payload, scenario),
            use_container_width=True,
        )

    recommendations_cell = st.container(border=True)
    recommendations_cell.markdown("### Recommendations")
    for recommendation in result["recommendations"]:
        recommendations_cell.markdown(f"- {recommendation}")


def _render_optimizer_tab(scenario):
    if not scenario or not scenario.get("heuristic_models"):
        st.info("Optimizer insights are available when the archive dataset scenario is loaded.")
        return

    heuristic_labels = {
        scenario["heuristic_models"][key]["label"]: key for key in HEURISTIC_KEYS
    }
    selected_label = st.selectbox(
        "Optimized heuristic",
        options=list(heuristic_labels.keys()),
    )
    heuristic_model = scenario["heuristic_models"][heuristic_labels[selected_label]]

    optimizer_cols = st.columns(2)
    with optimizer_cols[0].container(border=True):
        st.markdown("### Monthly episode score vs reward proxy")
        st.altair_chart(
            _build_episode_history_chart(heuristic_model),
            use_container_width=True,
        )

    with optimizer_cols[1].container(border=True):
        st.markdown("### Top feature contributions")
        st.altair_chart(
            _build_feature_contribution_chart(heuristic_model),
            use_container_width=True,
        )

    weights_cell = st.container(border=True)
    weights_cell.markdown("### Learned feature weights")
    weights_cell.dataframe(
        pd.DataFrame(heuristic_model["feature_breakdown"]),
        use_container_width=True,
        hide_index=True,
    )


def _render_model_outputs_tab(result, payload, scenario):
    output_cols = st.columns(2)

    with output_cols[0].container(border=True):
        st.markdown("### Model outputs")
        st.json(
            {
                "spectral": result["spectral"],
                "game_theory": result["game_theory"],
            }
        )

    with output_cols[1].container(border=True):
        st.markdown("### Scenario inputs")
        st.json(payload)

    if scenario:
        dataset_cell = st.container(border=True)
        dataset_cell.markdown("### Archive dataset summary")
        dataset_cell.json(
            {
                "path": scenario["dataset_path"],
                "table_counts": scenario["table_counts"],
                "derived_metrics": scenario["dataset_metrics"],
            }
        )


def main():
    st.set_page_config(
        page_title="Startup strategy dashboard",
        page_icon=":chart_with_upwards_trend:",
        layout="wide",
    )

    st.markdown("# :material/query_stats: Startup Strategy Evaluator")
    st.write(
        "Evaluate startup positioning, launch timing, and market structure with spectral graph signals, payoff modeling, and reinforcement-optimized heuristics."
    )
    st.caption("Dashboard base inspired by the layout patterns in streamlit/demo-stockpeers.")

    default_mode = "Archive dataset scenario" if _query_value("source", "manual") == "archive" else "Manual strategy"
    control_col, summary_col = st.columns([1.05, 1.95])

    with control_col.container(border=True):
        st.markdown("### Controls")
        input_mode = st.radio(
            "Strategy source",
            SOURCE_OPTIONS,
            index=SOURCE_OPTIONS.index(default_mode),
            horizontal=True,
        )
        st.query_params["source"] = _source_to_param(input_mode)
        payload, scenario = _render_control_panel(input_mode)
        evaluate_clicked = st.button(
            "Evaluate strategy",
            type="primary",
            use_container_width=True,
            disabled=payload is None,
        )

    with summary_col.container(border=True):
        if payload is None:
            st.markdown("## Strategy workspace")
            st.info("Load the archive dataset or switch to manual strategy mode to begin.")
        else:
            _render_strategy_snapshot(payload, scenario)

    if payload is None:
        st.stop()

    current_signature = payload.copy()
    if evaluate_clicked:
        st.session_state["evaluation_result"] = _evaluate_payload(payload)
        st.session_state["evaluation_payload"] = current_signature
        st.session_state["evaluation_scenario"] = scenario

    evaluation_result = st.session_state.get("evaluation_result")
    if evaluation_result is None:
        st.info("Configure a strategy and run the evaluation to populate the dashboard.")
        return

    if st.session_state.get("evaluation_payload") != current_signature:
        st.info("Inputs changed. Run the evaluation again to refresh the dashboard.")

    evaluation_scenario = st.session_state.get("evaluation_scenario")

    _render_result_metrics(evaluation_result)

    overview_tab, optimizer_tab, outputs_tab = st.tabs(
        ["Overview", "Optimizer", "Model outputs"]
    )
    with overview_tab:
        _render_overview_tab(evaluation_result, payload, evaluation_scenario)
    with optimizer_tab:
        _render_optimizer_tab(evaluation_scenario)
    with outputs_tab:
        _render_model_outputs_tab(evaluation_result, payload, evaluation_scenario)


if __name__ == "__main__":
    main()