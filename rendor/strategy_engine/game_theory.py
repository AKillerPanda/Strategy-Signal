def evaluate_payoff(marketing_strength, product_readiness, competition_intensity):
    aggressive_launch = (
        0.45 * marketing_strength
        + 0.35 * product_readiness
        - 0.20 * competition_intensity
    )

    delayed_launch = (
        0.25 * marketing_strength
        + 0.55 * product_readiness
        - 0.10 * competition_intensity
    )

    niche_positioning = (
        0.35 * marketing_strength
        + 0.30 * product_readiness
        - 0.05 * competition_intensity
    )

    strategies = {
        "Aggressive launch": aggressive_launch,
        "Delayed launch": delayed_launch,
        "Niche positioning": niche_positioning,
    }

    best_strategy = max(strategies, key=strategies.get)

    return {
        "payoffs": strategies,
        "best_strategy": best_strategy,
    }