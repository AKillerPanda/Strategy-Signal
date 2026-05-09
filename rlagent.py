def recommend_actions(score, bottleneck_score, best_strategy):
    recommendations = []

    if score < 50:
        recommendations.append("Your strategy is weak. Improve positioning, timeline clarity, and acquisition channels.")

    if bottleneck_score > 0.8:
        recommendations.append("Your strategy graph has fragmentation risk. Align marketing, product, and launch milestones better.")

    if best_strategy == "Aggressive launch":
        recommendations.append("Prioritize fast GTM execution, PR, launch campaigns, and early community building.")

    elif best_strategy == "Delayed launch":
        recommendations.append("Improve product readiness before scaling marketing spend.")

    elif best_strategy == "Niche positioning":
        recommendations.append("Focus on a narrower customer segment before expanding.")

    return recommendations