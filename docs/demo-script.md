# StrategySignal Demo Script

## 1. Problem

Founders make launch decisions with incomplete information. StrategySignal turns a startup plan into a structured evaluation with a mobile-first experience and a Python strategy engine behind it.

## 2. Show The App

1. Open the mobile app home screen.
2. Explain that the root project is a Newly / Expo app.
3. Point out the input flow, dashboard cards, charts, and recommendations.

## 3. Manual Evaluation Flow

1. Enter a sample strategy with product features, channels, competitors, and milestones.
2. Submit the form.
3. Explain that `utils/api.ts` sends the request to `rendor/api.py`.
4. Show the returned score, launch recommendation, charts, and watchlist.

## 4. Backend Logic

1. Explain that the FastAPI backend keeps the mobile app thin.
2. Show that the strategy logic lives in `rendor/strategy_engine/`.
3. Mention the graph analysis, launch payoff model, and recommendation layer.

## 5. Demo Scenario Flow

1. Open the saved scenario path in the app.
2. Explain that `GET /saved-scenario` loads checkpoint-backed artifacts from `rendor/models/`.
3. Emphasize that this gives a reliable fast demo without retraining live.

## 6. Repo Story

1. Root folders are the mobile app.
2. `rendor/` is the Python backend bundle.
3. `docs/` contains architecture and demo notes for the hackathon submission.

## 7. Close

StrategySignal is a mobile startup-strategy dashboard built with Newly, backed by a FastAPI service that evaluates startup strategies with graph analysis, game-theory scoring, saved checkpoints, and experimental RL-ranked actions.
