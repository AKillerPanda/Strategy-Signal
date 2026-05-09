import streamlit as st
from evaluator import evaluate_strategy

st.title("Startup Strategy Evaluator")
st.write("Evaluate marketing, product timeline, and competitive strategy using ML, game theory, and spectral graph theory.")

features = st.text_area("Product features", "AI dashboard, onboarding flow, analytics").split(",")
channels = st.text_area("Marketing channels", "TikTok, SEO, PR, founder-led sales").split(",")
competitors = st.text_area("Competitors", "Competitor A, Competitor B").split(",")
milestones = st.text_area("Product timeline milestones", "MVP, beta launch, public launch").split(",")

marketing_strength = st.slider("Marketing strength", 0, 100, 60)
product_readiness = st.slider("Product readiness", 0, 100, 55)
competition_intensity = st.slider("Competition intensity", 0, 100, 70)

if st.button("Evaluate Strategy"):
    result = evaluate_strategy(
        features,
        channels,
        competitors,
        milestones,
        marketing_strength,
        product_readiness,
        competition_intensity
    )

    st.subheader("Strategy Score")
    st.metric("Score", result["score"])

    st.subheader("Best Game-Theory Strategy")
    st.write(result["game_theory"]["best_strategy"])

    st.subheader("Payoffs")
    st.json(result["game_theory"]["payoffs"])

    st.subheader("Spectral Graph Analysis")
    st.write("Fiedler value:", result["spectral"]["fiedler_value"])
    st.write("Bottleneck score:", result["spectral"]["bottleneck_score"])

    st.subheader("Recommendations")
    for rec in result["recommendations"]:
        st.write("-", rec)