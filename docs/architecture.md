# StrategySignal Architecture

StrategySignal uses a mobile-first architecture. The Newly / Expo app handles user interaction, while the Python FastAPI backend in `rendor/` handles strategy evaluation and checkpoint-backed demo flows.

## Component Map

```mermaid
flowchart TD
    U[Founder / User] --> M[StrategySignal Mobile App<br/>Newly / Expo / React Native]

    M --> S1[Input Screens<br/>Product, Channels, Competitors, Milestones]
    M --> S2[Dashboard Screens<br/>Scorecards, Charts, Watchlists, Recommendations]

    S1 --> Client[utils/api.ts<br/>Mobile API Client]

    Client -->|POST /evaluate| API[rendor/api.py<br/>FastAPI Backend]
    Client -->|GET /saved-scenario| API
    Client -->|GET /health| API

    API --> Eval[rendor/strategy_engine/evaluator.py<br/>Strategy Evaluation Pipeline]
    Eval --> Graph[rendor/strategy_engine/graph_model.py<br/>Graph Analysis]
    Eval --> Game[rendor/strategy_engine/game_theory.py<br/>Launch Payoff Model]
    Eval --> Recs[rendor/strategy_engine/rlagent.py<br/>Recommendation Layer]

    API --> Loader[rendor/strategy_engine/dataset_loader.py<br/>Saved Scenario Loader]
    Loader --> Models[rendor/models<br/>Saved Checkpoints]
    API --> Market[rendor/strategy_engine/market_data.py<br/>Competitor / Brand Proxy Lookup]
    Market --> Data[rendor/data<br/>competitors_by_category.json]

    Graph --> Response[JSON Strategy Response]
    Game --> Response
    Recs --> Response
    Models --> Response

    Response --> Client
    Client --> S2
```

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Mobile app | `app/`, `components/`, `utils/`, `assets/` | Collect inputs and render the dashboard |
| API client | `utils/api.ts` | Calls the backend and normalizes responses for the UI |
| Backend API | `rendor/api.py` | Exposes `/evaluate`, `/saved-scenario`, and `/health` |
| Strategy engine | `rendor/strategy_engine/` | Runs graph analysis, payoff scoring, recommendations, and data loading |
| Saved artifacts | `rendor/models/` | Stores checkpoint files for fast demo playback |
| Data helpers | `rendor/data/` | Stores competitor and category lookup data |

## Request Flow

```mermaid
sequenceDiagram
    participant User as Founder
    participant App as StrategySignal Mobile App
    participant API as FastAPI Backend
    participant Engine as Strategy Engine
    participant Checkpoints as Saved Checkpoints

    User->>App: Enters startup strategy inputs
    App->>API: POST /evaluate
    API->>Engine: Run evaluator.py
    Engine->>Engine: Build strategy graph
    Engine->>Engine: Compute fragmentation score
    Engine->>Engine: Score launch strategies
    Engine->>Engine: Generate recommendations
    Engine-->>API: Strategy score + insights
    API-->>App: JSON response
    App-->>User: Shows dashboard, charts, alerts, and next actions

    User->>App: Opens demo scenario
    App->>API: GET /saved-scenario
    API->>Checkpoints: Load saved artifacts
    Checkpoints-->>API: Scenario + model outputs
    API-->>App: Checkpoint-backed response
    App-->>User: Shows fast demo dashboard
```
