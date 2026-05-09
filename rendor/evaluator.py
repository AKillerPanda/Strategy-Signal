from graph_model import build_strategy_graph, spectral_analysis
from game_theory import evaluate_payoff
from rlagent import recommend_actions

def evaluate_strategy(features, channels, competitors, milestones,
                      marketing_strength, product_readiness, competition_intensity):

    G = build_strategy_graph(features, channels, competitors, milestones)
    spectral = spectral_analysis(G)

    game_result = evaluate_payoff(
        marketing_strength,
        product_readiness,
        competition_intensity
    )

    base_score = (
        0.4 * marketing_strength +
        0.4 * product_readiness +
        0.2 * (100 - competition_intensity)
    )

    spectral_penalty = spectral["bottleneck_score"] * 10
    final_score = max(0, min(100, base_score - spectral_penalty))

    recommendations = recommend_actions(
        final_score,
        spectral["bottleneck_score"],
        game_result["best_strategy"]
    )

    return {
        "score": round(final_score, 2),
        "spectral": spectral,
        "game_theory": game_result,
        "recommendations": recommendations
    }